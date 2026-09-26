/**
 * S01 ｜ `M8` evidence wiring: the ONLY path from a proposal's selections to persisted
 *            `EvidenceRef`s, and the fresh resolution the structural gates depend on.
 *
 * Contract: §3.3 (the ⑩ trace list and `N_引用` come from the SAME reference set), §5 (`EvidenceRef`
 * minimum field set, the four roles, `source_field_path` landing layers), §7.4 (no archive snapshot).
 *
 * 🔴 `M7` IS THE ONLY EVIDENCE VALIDATOR AND THE ONLY `EvidenceRef` CONSTRUCTOR. This module never
 *    mints a reference, never re-implements a role rule, never re-implements `N_引用` and never
 *    builds a second reference list (`§7` / `§38 V1`). It hands selections to
 *    `buildGroundingContext` and persists what comes back.
 * 🔴 A REFUSED SELECTION IS NEVER SILENTLY DROPPED: because `M7` is all-or-nothing per owner, a
 *    refusal turns into an explicit refusal of the whole generation (`§38 V3`), so a partial
 *    reference set can never be persisted as if it were the model's answer.
 * 🔴 `N_引用` IS READ, NEVER RECOMPUTED: the citation view is obtained from `M7`'s single
 *    `deriveCitationView`, and the traceability list from `M7`'s single `deriveTraceabilityView`,
 *    over the same stored set.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no LLM.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { EvidenceRef } from '../../domain/types/evidence-ref.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import type { RetrievalDerivationRecord } from '../../retrieval/compare/types.js';
import { matchedDimensionsOf } from '../../retrieval/compare/derivation.js';
import { resolveSourceFieldPath } from '../../retrieval/grounding/addressable.js';
import { buildGroundingSourceCatalog } from '../../retrieval/grounding/catalog.js';
import type { GroundingHistoricalAttempt } from '../../retrieval/grounding/catalog.js';
import { deriveCitationView, deriveTraceabilityView } from '../../retrieval/grounding/citation.js';
import { buildGroundingContext } from '../../retrieval/grounding/grounding-context.js';
import type {
  CitationView,
  GroundingRejection,
  GroundingSourceCatalog,
  TraceableEvidenceView,
} from '../../retrieval/grounding/types.js';
import type { ResolvedEvidenceTarget } from './gates.js';
import type { InsightEvidenceSelection } from './types.js';

/* ------------------------------------------------------------------ *
 * 1. Selection → validated references (M7 owns the construction)
 * ------------------------------------------------------------------ */

export interface InsightEvidenceInput {
  /** The `Insight` identity that will own the references (`§38 V2`). */
  readonly insight_id: ObjectId<'INS'>;
  readonly selections: readonly InsightEvidenceSelection[];
  /** The CURRENT `M6` Retrieval Derivation - the ONLY admission source for a reference. */
  readonly derivation: RetrievalDerivationRecord;
  readonly historical_attempts: readonly GroundingHistoricalAttempt[];
  /** Injectable clock (ISO-8601) - keeps fixtures deterministic. */
  readonly created_at?: string;
}

export type InsightEvidenceOutcome =
  | {
      readonly kind: 'built';
      readonly evidence_refs: readonly EvidenceRef[];
      /** Comparison material actually used: the derivation the references were drawn from. */
      readonly comparison_ref: string | null;
    }
  | { readonly kind: 'refused'; readonly rejections: readonly GroundingRejection[]; readonly detail: string };

/**
 * Runs `M7`'s validator / constructor for ONE proposed insight.
 *
 * 🔴 The `owner_id` handed to `M7` is the `Insight` id, so `EvidenceRef.owner_id` can never be the
 *    source `ATT_` id and two insights can never share references (`§38 V2`).
 * 🔴 A zero-selection proposal is legal and produces an empty reference set - which is then judged
 *    by `E4`, not by this function.
 */
export function buildInsightEvidence(input: InsightEvidenceInput): InsightEvidenceOutcome {
  const outcome = buildGroundingContext({
    owner_id: input.insight_id,
    source_attempt_id: input.derivation.source_attempt_id,
    derivation: input.derivation,
    historical_attempts: input.historical_attempts,
    selections: input.selections,
    ...(input.created_at === undefined ? {} : { created_at: input.created_at }),
  });
  if (outcome.kind === 'invalid') {
    return { kind: 'refused', rejections: outcome.rejections, detail: outcome.detail };
  }
  return {
    kind: 'built',
    evidence_refs: outcome.pack.evidence_refs,
    /*
     * 🔴 `D-021 E4` ③: a comparison reference is recorded ONLY when a cross-record comparison was
     *    actually used. A proposal that references nothing used none, so it carries `null` - and
     *    then fails `E4`, which is exactly the intended behaviour.
     */
    comparison_ref: outcome.pack.evidence_refs.length === 0 ? null : input.derivation.derivation_id,
  };
}

/** The traceable content candidates of the current derivation - the model's selection surface. */
export function buildInsightSourceCatalog(input: {
  readonly derivation: RetrievalDerivationRecord;
  readonly historical_attempts: readonly GroundingHistoricalAttempt[];
}): GroundingSourceCatalog {
  return buildGroundingSourceCatalog({
    source_attempt_id: input.derivation.source_attempt_id,
    derivation: input.derivation,
    historical_attempts: input.historical_attempts,
  });
}

/* ------------------------------------------------------------------ *
 * 2. Fresh resolution (what the structural gates read)
 * ------------------------------------------------------------------ */

/**
 * Re-resolves every stored reference against the CURRENT workspace state.
 *
 * 🔴 Read fresh on every check: an `E1` / `E4` verdict may never be inherited from the moment of
 *    generation (`§16` / `§24`).
 * 🔴 An ARCHIVED target still resolves (`D-043` / §7.2): archiving is not a content edit and never
 *    invalidates an existing reference's traceability.
 */
export function resolveEvidenceTargets(
  refs: readonly EvidenceRef[],
  historical_attempts: readonly GroundingHistoricalAttempt[],
): readonly ResolvedEvidenceTarget[] {
  const by_id = new Map(historical_attempts.map((entry) => [entry.attempt.attempt_id, entry]));
  return refs.map((ref) => {
    const entry = by_id.get(ref.target_id);
    if (entry === undefined) {
      return {
        ref,
        target_attempt: null,
        landing_resolves: false,
        unresolved_reason: '被引用的记录已无法解析',
      };
    }
    const landing = resolveSourceFieldPath(
      entry.attempt,
      entry.content_items ?? [],
      ref.source_field_path,
    );
    if (landing === null) {
      return {
        ref,
        target_attempt: entry.attempt,
        landing_resolves: false,
        unresolved_reason: '被引用的内容条目在目标记录中已不存在',
      };
    }
    if (landing.source_type === 'Inference') {
      return {
        ref,
        target_attempt: entry.attempt,
        landing_resolves: false,
        unresolved_reason: '落点是一条 Inference，不能作为引用落点',
      };
    }
    return {
      ref,
      target_attempt: entry.attempt,
      landing_resolves: true,
      unresolved_reason: null,
    };
  });
}

/* ------------------------------------------------------------------ *
 * 3. Derived read views (M7's single derivations, never re-implemented)
 * ------------------------------------------------------------------ */

export interface InsightEvidenceViews {
  readonly citation: CitationView;
  readonly traceability: readonly TraceableEvidenceView[];
}

/**
 * Derives the `N_引用` view and the ⑩ traceability list from the SAME stored reference set.
 *
 * 🔴 Both come from `M7`'s single derivation pair, so the count and the list can never disagree
 *    (contract §3.3 / §12 item 11) and no second counting helper exists in `M8` (`§38 V5`).
 * 🔴 A pure `context` reference is displayable and counted by NOBODY (`§38 V6`): the exclusion is
 *    `M7`'s, consumed here without restatement.
 */
export function deriveInsightEvidenceViews(
  insight_id: ObjectId<'INS'>,
  refs: readonly EvidenceRef[],
  historical_attempts: readonly GroundingHistoricalAttempt[],
  derivation?: RetrievalDerivationRecord,
): InsightEvidenceViews {
  const by_id = new Map(historical_attempts.map((entry) => [entry.attempt.attempt_id, entry]));
  const matched_by_target: Record<string, readonly LevelADimension[]> = {};
  for (const entry of derivation?.candidate_entries ?? []) {
    matched_by_target[entry.candidate_attempt_id] = matchedDimensionsOf(entry);
  }
  return {
    citation: deriveCitationView(insight_id, refs),
    traceability: deriveTraceabilityView(refs, {
      resolveTarget: (target_id: ObjectId<'ATT'>) => by_id.get(target_id)?.attempt ?? null,
      resolveAttachedContentItems: (target_id: ObjectId<'ATT'>) =>
        by_id.get(target_id)?.content_items ?? [],
      matched_level_a_dimensions_by_target: matched_by_target,
    }),
  };
}

/** One evidence line for the `E2` / `E3` re-check prompt: role + landing point + content value. */
export interface InsightEvidenceLine {
  readonly role: string;
  readonly target_id: string;
  readonly source_field_path: string;
  readonly value: string | null;
}

export function evidenceLinesOf(
  refs: readonly EvidenceRef[],
  historical_attempts: readonly GroundingHistoricalAttempt[],
): readonly InsightEvidenceLine[] {
  const by_id = new Map(historical_attempts.map((entry) => [entry.attempt.attempt_id, entry]));
  return refs.map((ref) => {
    const entry = by_id.get(ref.target_id);
    const landing =
      entry === undefined
        ? null
        : resolveSourceFieldPath(entry.attempt, entry.content_items ?? [], ref.source_field_path);
    return {
      role: ref.role,
      target_id: ref.target_id,
      source_field_path: ref.source_field_path,
      value: landing === null ? null : landing.value,
    };
  });
}
