/**
 * S01-03 ｜ `M6` application-facing service: step ⑥ retrieval + step ⑦ view material.
 *
 * Contract: §9 steps ⑥/⑦, §9.1 (trigger and idempotency), §10.1 layers 1/2, `D-045`, `D-046`,
 * `D-061`, plus §27/§28 of the S01-03 task.
 *
 * 🔴 TRIGGER BOUNDARY: this service EXPOSES the command; it never triggers itself. There is no
 *    filesystem watcher, no polling loop, no scheduled job and no hidden side effect inside the
 *    repository. The future `M15` composition root calls `runRetrievalForFormalAttempt` after a
 *    `Formal` save succeeds (`D-045` / AC-79) and again only when the user explicitly asks for a
 *    rerun (AC-81). Nothing here introduces a "already retrieved" or "stale" product field.
 * 🔴 REPLACEMENT: a successful run replaces the current derivation as a whole. A runtime failure
 *    writes NOTHING, so the previous successful derivation survives (task §26).
 * 🔴 THREE 0-LIKE STATES STAY APART: `HISTORY_EMPTY`, `NO_RELATED_HISTORY` and
 *    `RETRIEVAL_RUNTIME_INCOMPLETE` are three different outcomes with three different result kinds.
 *    Only the first two are successes, and a runtime failure is never reported as an empty history.
 * 🔴 The concrete provider adapter is never built here - `M15` injects the `M10` interface and an
 *    opaque `CredentialRef`; this layer cannot even represent a secret.
 * 🔴 FINAL-RAPID-A 就地补注（不改写上文；本服务的触发边界、替换语义与三种 0-like 状态一字未改）：
 *    step ⑥ now decides the whole retrieval with AT MOST ONE model call - every candidate is first
 *    planned without any model contact, and only the genuinely `undecided` `candidate × dimension`
 *    pairs are sent together. The former per-pair loop is what made a large retrieval issue up to
 *    32 sequential requests. See `comparator.ts` (two-phase pipeline) and `batch-judge.ts`.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ProviderAdapter } from '../../ai/provider/adapter.js';
import type { CredentialRef } from '../../ai/provider/credential.js';
import type { Attempt, AttemptState } from '../../domain/types/attempt.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import { retrievalSnapshotOf, retrievalTierOf } from '../../domain/types/counts.js';
import type { NRetrievalSnapshot, RetrievalTier } from '../../domain/types/counts.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import type { AttemptRepository } from '../../workspace/repository/attempt-repository.js';
import { comparisonOrderOf } from './ordering.js';
import { eligibleHistoricalAttempts, historyIsEmpty } from './corpus.js';
import { compareAttemptsInOneBatch } from './comparator.js';
import type { ComparedCandidate } from './derivation.js';
import {
  buildRetrievalDerivation,
  matchedDimensionsOf,
  relatedAttemptIdsOf,
  uncomparedDimensionsOf,
} from './derivation.js';
import { newRetrievalDerivationId } from './derivation-id.js';
import { providerBatchDimensionJudge } from './batch-judge.js';
import { uncomparedDimensionNote } from './comparison-points.js';
import type { RetrievalDerivationRepository } from './retrieval-derivation-repository.js';
import type {
  CandidateEntry,
  ComparisonPoint,
  LevelBContext,
  RelevanceReason,
  RetrievalDerivationRecord,
  RetrievalRuntimeFailure,
  RetrievalStatus,
} from './types.js';

/* ------------------------------------------------------------------ *
 * Provider context (M10 contract only)
 * ------------------------------------------------------------------ */

/**
 * The AI context this layer may hold: the `M10` `ProviderAdapter` INTERFACE and an opaque
 * `CredentialRef`. Never a concrete adapter, never a transport client module, never a secret.
 */
export interface RetrievalProviderContext {
  readonly adapter: ProviderAdapter;
  readonly credential_ref: CredentialRef | null;
}

/* ------------------------------------------------------------------ *
 * Commands / outcomes
 * ------------------------------------------------------------------ */

export interface RunRetrievalCommand {
  readonly source_attempt_id: ObjectId<'ATT'>;
  /** Injectable clock (ISO-8601) - keeps fixtures deterministic. */
  readonly created_at?: string;
}

export interface RetrievalCompleted {
  readonly kind: 'completed';
  readonly status: RetrievalStatus;
  readonly derivation: RetrievalDerivationRecord;
  /** `N_检索` in its frozen shape; the ONLY set-size number of step ⑥. */
  readonly snapshot: NRetrievalSnapshot;
}

export interface RetrievalRuntimeIncomplete {
  readonly kind: 'runtime_incomplete';
  readonly failure: RetrievalRuntimeFailure;
  /** `true` when an earlier successful derivation is still stored and untouched. */
  readonly previous_derivation_preserved: boolean;
}

export interface RetrievalSourceNotFormal {
  readonly kind: 'source_not_formal';
  readonly source_attempt_id: string;
  /** The state the record really has; `Draft` is never treated as `Formal` for a moment. */
  readonly state: AttemptState;
  readonly detail: string;
}

export interface RetrievalSourceNotFound {
  readonly kind: 'source_not_found';
  readonly source_attempt_id: string;
}

export type RunRetrievalOutcome =
  | RetrievalCompleted
  | RetrievalRuntimeIncomplete
  | RetrievalSourceNotFormal
  | RetrievalSourceNotFound;

/* ------------------------------------------------------------------ *
 * Step ⑦ view model
 * ------------------------------------------------------------------ */

export interface RetrievalCandidateView {
  readonly candidate_attempt_id: ObjectId<'ATT'>;
  readonly matched_level_a_dimensions: readonly LevelADimension[];
  readonly similar_points: readonly ComparisonPoint[];
  readonly difference_points: readonly ComparisonPoint[];
  readonly uncompared_dimensions: readonly LevelADimension[];
  /** Neutral notes: `<维度>：该维度未比对`. Never a verdict (AC-114). */
  readonly uncompared_notes: readonly string[];
  /** Only `matched` Level A dimensions appear here (§9 step ⑦ / AC-125). */
  readonly relevance_reasons: readonly RelevanceReason[];
  /** Explanation only - it never admits, pre-filters or counts a candidate (AC-20 / AC-86). */
  readonly auxiliary_context: LevelBContext;
}

export interface RetrievalView {
  readonly source_attempt_id: ObjectId<'ATT'>;
  readonly status: RetrievalStatus;
  /** The FULL related count - never reduced to what the first screen shows (`D-046` / AC-85). */
  readonly n_retrieval: number;
  /** The frozen structural tier `0` / `1` / `>=2`; never a strength. */
  readonly retrieval_tier: RetrievalTier;
  readonly hit_level_a_dimensions: readonly LevelADimension[];
  readonly uncompared_dimensions: readonly LevelADimension[];
  readonly uncompared_notes: readonly string[];
  /** Ordered candidates: the first screen, or the whole set when `expanded` (same Derivation). */
  readonly candidates: readonly RetrievalCandidateView[];
  readonly first_screen_size: number;
  readonly total_candidate_count: number;
  readonly remaining_beyond_first_screen: number;
  readonly expandable: boolean;
  readonly expanded: boolean;
}

function candidateViewOf(entry: CandidateEntry): RetrievalCandidateView {
  const uncompared = uncomparedDimensionsOf(entry);
  return {
    candidate_attempt_id: entry.candidate_attempt_id,
    matched_level_a_dimensions: matchedDimensionsOf(entry),
    similar_points: entry.similar_points,
    difference_points: entry.difference_points,
    uncompared_dimensions: uncompared,
    uncompared_notes: uncompared.map(uncomparedDimensionNote),
    relevance_reasons: entry.relevance_reasons,
    auxiliary_context: entry.level_b_context,
  };
}

/**
 * Builds the step ⑦ view from a STORED derivation.
 *
 * 🔴 Expanding re-reads the same Derivation: it never re-runs the comparison and never calls the
 *    provider. The full candidate set was already persisted (`D-046` / task §23).
 * 🔴 `n_retrieval` is reported from the record, not from the sliced list, so the first screen can
 *    never be mistaken for the size of the related set (AC-85).
 */
export function retrievalViewOf(
  record: RetrievalDerivationRecord,
  options: { readonly expanded?: boolean } = {},
): RetrievalView {
  const expanded = options.expanded ?? false;
  const visible = expanded
    ? record.candidate_entries
    : record.candidate_entries.slice(0, record.fold_hint.first_screen_size);
  return {
    source_attempt_id: record.source_attempt_id,
    status: record.status,
    n_retrieval: record.n_retrieval,
    retrieval_tier: retrievalTierOf(record.n_retrieval),
    hit_level_a_dimensions: record.hit_level_a_dimensions,
    uncompared_dimensions: record.uncompared_dimensions,
    uncompared_notes: record.uncompared_dimensions.map(uncomparedDimensionNote),
    candidates: visible.map(candidateViewOf),
    first_screen_size: record.fold_hint.first_screen_size,
    total_candidate_count: record.fold_hint.total_candidate_count,
    remaining_beyond_first_screen: record.fold_hint.remaining_beyond_first_screen,
    expandable: record.fold_hint.expandable,
    expanded,
  };
}

/* ------------------------------------------------------------------ *
 * Service
 * ------------------------------------------------------------------ */

export interface ExperienceRetrievalService {
  /**
   * Step ⑥. Runs the retrieval for one source `Formal Attempt` and stores the result as the CURRENT
   * derivation. 🔴 Called by `M15` - the repository never calls it on its own.
   */
  runRetrievalForFormalAttempt(command: RunRetrievalCommand): Promise<RunRetrievalOutcome>;
  /** The stored current derivation, read back without re-running anything (§30). */
  readCurrentDerivation(
    source_attempt_id: ObjectId<'ATT'>,
  ): Promise<RetrievalDerivationRecord | null>;
}

export interface ExperienceRetrievalServiceDeps {
  readonly repository: AttemptRepository;
  readonly derivations: RetrievalDerivationRepository;
  readonly provider: RetrievalProviderContext;
  readonly now?: () => string;
  readonly newDerivationId?: (source_attempt_id: string) => string;
}

/** `matched_level_a_dimensions_by_attempt` for the frozen `N_检索` snapshot. */
function matchedByAttemptOf(
  entries: readonly CandidateEntry[],
): Readonly<Record<string, readonly LevelADimension[]>> {
  const result: Record<string, readonly LevelADimension[]> = {};
  for (const entry of entries) {
    result[entry.candidate_attempt_id] = matchedDimensionsOf(entry);
  }
  return result;
}

export function createExperienceRetrievalService(
  deps: ExperienceRetrievalServiceDeps,
): ExperienceRetrievalService {
  const { repository, derivations, provider } = deps;
  const now = deps.now ?? ((): string => new Date().toISOString());
  const mintId = deps.newDerivationId ?? newRetrievalDerivationId;

  async function persist(
    source: Attempt,
    eligible_history_count: number,
    compared: readonly ComparedCandidate[],
    created_at: string,
  ): Promise<RetrievalCompleted> {
    const derivation = buildRetrievalDerivation({
      derivation_id: mintId(source.attempt_id),
      source,
      eligible_history_count,
      compared_candidates: compared,
      created_at,
    });
    await derivations.replaceCurrent(source.attempt_id, derivation);
    const snapshot = retrievalSnapshotOf(
      source.attempt_id,
      relatedAttemptIdsOf(derivation),
      matchedByAttemptOf(derivation.candidate_entries),
    );
    return { kind: 'completed', status: derivation.status, derivation, snapshot };
  }

  return {
    async runRetrievalForFormalAttempt(
      command: RunRetrievalCommand,
    ): Promise<RunRetrievalOutcome> {
      const source = await repository.readAttempt(command.source_attempt_id);
      if (source === null) {
        return { kind: 'source_not_found', source_attempt_id: command.source_attempt_id };
      }
      /*
       * 🔴 SOURCE GATE: only a `Formal Attempt` may be retrieved FOR. A `Draft` is never promoted
       *    for the duration of this call, and no derivation is produced or replaced - returning a
       *    technical Gate result is the whole contract here (§5 of the task).
       */
      if (source.state !== 'Formal') {
        return {
          kind: 'source_not_formal',
          source_attempt_id: source.attempt_id,
          state: source.state,
          detail:
            'Step ⑥ may only run for a Formal Attempt; a Draft is never treated as Formal (contract §2.1 / D-045).',
        };
      }

      const eligible = eligibleHistoricalAttempts(
        source.attempt_id,
        await repository.listAttempts(),
      );
      const created_at = command.created_at ?? now();

      /* B | HISTORY_EMPTY: a NORMAL success with no usable history - not a failure, not `N = 0`. */
      if (historyIsEmpty(eligible)) {
        return persist(source, 0, [], created_at);
      }

      const judge = providerBatchDimensionJudge(provider.adapter, provider.credential_ref);

      /*
       * 🔴 FINAL-RAPID-A: the WHOLE retrieval is decided in at most ONE model call.
       *
       *    Every candidate is first planned against the structural `unknown` gate and the
       *    deterministic rules; only the genuinely `undecided` pairs are collected, and all of them
       *    travel in a single structured request. Before this change the same retrieval issued one
       *    request per `candidate × dimension` pair (up to 8 × 4 = 32 sequential calls, which is the
       *    measured reason the PSA run never finished ⑥).
       *
       *    The three-state semantics, the corpus filter and the persistence rules are untouched:
       *    this changes HOW MANY requests carry the judgements, never which pair is judged or what
       *    a verdict means. `0` undecided pairs ⇒ `0` requests.
       */
      const outcome = await compareAttemptsInOneBatch(
        judge,
        source,
        comparisonOrderOf(eligible),
      );
      if (outcome.kind === 'runtime_incomplete') {
        /*
         * A | RETRIEVAL_RUNTIME_INCOMPLETE. Nothing is stored: no partial candidate list, no
         * default verdict, no overwrite of the previous successful derivation.
         */
        const previous = await derivations.readCurrent(source.attempt_id);
        return {
          kind: 'runtime_incomplete',
          failure: outcome,
          previous_derivation_preserved: previous !== null,
        };
      }

      /* C | NO_RELATED_HISTORY vs RELATED_HISTORY - decided by the matched sets alone (`D-061`). */
      return persist(source, eligible.length, outcome.candidates, created_at);
    },

    async readCurrentDerivation(
      source_attempt_id: ObjectId<'ATT'>,
    ): Promise<RetrievalDerivationRecord | null> {
      return derivations.readCurrent(source_attempt_id);
    },
  };
}
