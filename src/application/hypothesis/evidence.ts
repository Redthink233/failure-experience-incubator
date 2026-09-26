/**
 * S01 ｜ `M9` evidence wiring: the ONLY path from a step ⑨ proposal's selections to persisted
 *            `EvidenceRef`s, and the derived ⑩ view.
 *
 * Contract: §3.3 (the ⑩ trace list and `N_引用` come from the SAME reference set), §5 (`EvidenceRef`
 * minimum field set, the four roles, `source_field_path` landing layers), §7.4 (no archive snapshot),
 * §9 step ⑩, §26 (`evidence_overview` is derived), §27 (conflicting evidence is juxtaposed).
 *
 * 🔴 `M7` IS THE ONLY EVIDENCE VALIDATOR AND THE ONLY `EvidenceRef` CONSTRUCTOR. This module never
 *    mints a reference, never re-implements a role rule, never re-implements `N_引用` and never
 *    builds a second reference list. It hands selections to `buildGroundingContext` and persists what
 *    comes back - with `owner_id` = the `HYP_` id, never the source `ATT_` id.
 * 🔴 A REFUSED SELECTION IS NEVER SILENTLY DROPPED: because `M7` is all-or-nothing per owner, a
 *    refusal becomes an explicit refusal of the whole generation, so a partial reference set can
 *    never be persisted as if it were the model's answer.
 * 🔴 `N_引用` IS READ, NEVER RECOMPUTED: the citation view comes from `M7`'s single
 *    `deriveCitationView`, the traceability list from `M7`'s single `deriveTraceabilityView`, over the
 *    same stored set.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no LLM.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { EvidenceRef } from '../../domain/types/evidence-ref.js';
import { CONTEXT_ROLE } from '../../domain/types/evidence-ref.js';
import type { KeptConditionFactRef, NonGroundingCondition } from '../../domain/types/hypothesis.js';
import type { ContentItem, SourceType } from '../../domain/types/source-type.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import { LEVEL_A_DIMENSION_LABELS } from '../../domain/types/level-a.js';
import type { RetrievalDerivationRecord } from '../../retrieval/compare/types.js';
import { matchedDimensionsOf } from '../../retrieval/compare/derivation.js';
import { resolveSourceFieldPath } from '../../retrieval/grounding/addressable.js';
import type { GroundingHistoricalAttempt } from '../../retrieval/grounding/catalog.js';
import { deriveCitationView, deriveTraceabilityView } from '../../retrieval/grounding/citation.js';
import { buildGroundingContext } from '../../retrieval/grounding/grounding-context.js';
import type {
  CitationView,
  GroundingRejection,
  GroundingSelection,
  GroundingSourceCatalog,
  TraceableEvidenceView,
} from '../../retrieval/grounding/types.js';
import type { EvidenceOverview, ResolvedKeptCondition } from './types.js';

/* ------------------------------------------------------------------ *
 * 1. Selection → validated references (M7 owns the construction)
 * ------------------------------------------------------------------ */

export interface HypothesisEvidenceInput {
  /** The `Hypothesis` identity that will own the references (§5.1 / §9). */
  readonly hypothesis_id: ObjectId<'HYP'>;
  readonly selections: readonly GroundingSelection[];
  /** The CURRENT `M6` Retrieval Derivation - the ONLY admission source for a reference. */
  readonly derivation: RetrievalDerivationRecord;
  readonly historical_attempts: readonly GroundingHistoricalAttempt[];
  /** Injectable clock (ISO-8601) - keeps fixtures deterministic. */
  readonly created_at?: string;
}

export type HypothesisEvidenceOutcome =
  | { readonly kind: 'built'; readonly evidence_refs: readonly EvidenceRef[] }
  | {
      readonly kind: 'refused';
      readonly rejections: readonly GroundingRejection[];
      readonly detail: string;
    };

/**
 * Runs `M7`'s validator / constructor for ONE proposed grounded hypothesis.
 *
 * 🔴 The `owner_id` handed to `M7` is the `Hypothesis` id, so `EvidenceRef.owner_id` can never be the
 *    source `ATT_` id and two hypotheses can never share references.
 * 🔴 A zero-selection proposal is legal at this level and produces an empty reference set; the caller
 *    then refuses the hypothesis, because a grounded hypothesis with `N_引用 = 0` is not traceable.
 */
export function buildHypothesisEvidence(input: HypothesisEvidenceInput): HypothesisEvidenceOutcome {
  const outcome = buildGroundingContext({
    owner_id: input.hypothesis_id,
    source_attempt_id: input.derivation.source_attempt_id,
    derivation: input.derivation,
    historical_attempts: input.historical_attempts,
    selections: input.selections,
    ...(input.created_at === undefined ? {} : { created_at: input.created_at }),
  });
  if (outcome.kind === 'invalid') {
    return { kind: 'refused', rejections: outcome.rejections, detail: outcome.detail };
  }
  return { kind: 'built', evidence_refs: outcome.pack.evidence_refs };
}

/* ------------------------------------------------------------------ *
 * 2. Kept-condition resolution (⑤ stays a reference, never prose)
 * ------------------------------------------------------------------ */

export type HistoricalKeepResolution =
  | {
      readonly ok: true;
      readonly ref: {
        readonly attempt_id: ObjectId<'ATT'>;
        readonly source_field_path: string;
      };
    }
  | {
      readonly ok: false;
      readonly condition: NonGroundingCondition;
      readonly detail: string;
    };

/**
 * Validates one ⑤ `historical_ref` against the CURRENT retrieval derivation.
 *
 * 🔴 ⑤ CITES, IT NEVER RESTATES (§8.6 rule 7 / §15 source A): the reference must point at a content
 *    item that really exists in an `M6`-related `Formal Attempt`. A condition history left unknown has
 *    no item at all, which is why 「保持不变」 is structurally unavailable for it (`K5`).
 * 🔴 The failure reason is TOLD APART instead of collapsed: an unrelated record is `N2`, while a path
 *    that cannot be resolved inside a related record is `N6`.
 */
export function resolveHistoricalKeepRef(input: {
  readonly target_id: string;
  readonly source_field_path: string;
  readonly catalog: GroundingSourceCatalog | null;
  readonly historical_attempts: readonly GroundingHistoricalAttempt[];
}): HistoricalKeepResolution {
  if (input.catalog === null) {
    return {
      ok: false,
      condition: 'N1',
      detail: 'There is no current retrieval derivation, so no historical condition can be cited by ⑤.',
    };
  }
  const by_id = new Map(input.historical_attempts.map((entry) => [entry.attempt.attempt_id, entry]));
  const target = by_id.get(input.target_id as ObjectId<'ATT'>);
  if (target === undefined) {
    return {
      ok: false,
      condition: 'N2',
      detail: `⑤ cites "${input.target_id}", which is not a record of this workspace.`,
    };
  }
  if (!input.catalog.target_ids.includes(input.target_id as ObjectId<'ATT'>)) {
    return {
      ok: false,
      condition: 'N2',
      detail: `⑤ cites "${input.target_id}", which is not a related record of the current retrieval derivation.`,
    };
  }
  const candidate = input.catalog.candidates.find(
    (entry) =>
      entry.target_id === input.target_id && entry.source_field_path === input.source_field_path,
  );
  if (candidate === undefined) {
    return {
      ok: false,
      condition: 'N6',
      detail:
        '⑤ cites a condition the referenced record did not record, or recorded as 「未知 / 未提供」; such a condition may never be 「保持不变」 - only 「设为 Y」 or an explicit omission is legal (§8.6 rule 7 / K5).',
    };
  }
  return {
    ok: true,
    ref: { attempt_id: candidate.target_id, source_field_path: candidate.source_field_path },
  };
}

/**
 * Resolves every ⑤ reference against the CURRENT workspace.
 *
 * 🔴 The layer is read from the CONTENT ITEM's own `source_type` (§5.2 rule 10): a historical
 *    `Extraction` may be cited but it never becomes a `Fact`.
 * 🔴 An unresolvable reference is reported as `resolves: false` rather than dropped (§3.3).
 */
export function resolveKeptConditions(
  refs: readonly KeptConditionFactRef[],
  historical_attempts: readonly GroundingHistoricalAttempt[],
): readonly ResolvedKeptCondition[] {
  const by_id = new Map(historical_attempts.map((entry) => [entry.attempt.attempt_id, entry]));
  return refs.map((ref): ResolvedKeptCondition => {
    const entry = by_id.get(ref.attempt_id);
    if (entry === undefined) {
      return { ref, source_type: null, value: null, resolves: false };
    }
    const landing = resolveSourceFieldPath(
      entry.attempt,
      entry.content_items ?? [],
      ref.source_field_path,
    );
    if (landing === null) {
      return { ref, source_type: null, value: null, resolves: false };
    }
    return {
      ref,
      source_type: landing.source_type,
      value: landing.value,
      resolves: true,
    };
  });
}

/* ------------------------------------------------------------------ *
 * 3. Derived read views (M7's single derivations, never re-implemented)
 * ------------------------------------------------------------------ */

export interface HypothesisEvidenceViews {
  readonly citation: CitationView;
  readonly traceability: readonly TraceableEvidenceView[];
}

/**
 * Derives the `N_引用` view and the ⑩ traceability list from the SAME stored reference set.
 *
 * 🔴 Both come from `M7`'s single derivation pair, so the count and the list can never disagree
 *    (§3.3 / §12 item 11) and no second counting helper exists in `M9`.
 * 🔴 A pure `context` reference is displayable and counted by NOBODY (§5.2 rule 5): the exclusion is
 *    `M7`'s, consumed here without restatement.
 */
export function deriveHypothesisEvidenceViews(
  hypothesis_id: ObjectId<'HYP'>,
  refs: readonly EvidenceRef[],
  historical_attempts: readonly GroundingHistoricalAttempt[],
  derivation?: RetrievalDerivationRecord,
): HypothesisEvidenceViews {
  const by_id = new Map(historical_attempts.map((entry) => [entry.attempt.attempt_id, entry]));
  const matched_by_target: Record<string, readonly LevelADimension[]> = {};
  for (const entry of derivation?.candidate_entries ?? []) {
    matched_by_target[entry.candidate_attempt_id] = matchedDimensionsOf(entry);
  }
  return {
    citation: deriveCitationView(hypothesis_id, refs),
    traceability: deriveTraceabilityView(refs, {
      resolveTarget: (target_id: ObjectId<'ATT'>) => by_id.get(target_id)?.attempt ?? null,
      resolveAttachedContentItems: (target_id: ObjectId<'ATT'>) =>
        by_id.get(target_id)?.content_items ?? [],
      matched_level_a_dimensions_by_target: matched_by_target,
    }),
  };
}

/* ------------------------------------------------------------------ *
 * 4. `evidence_overview` (§26 / §27) - derived on every read
 * ------------------------------------------------------------------ */

/**
 * Both a support and a contradict reference: the two sides are juxtaposed, never voted on (§27).
 *
 * 🔴 The wording itself avoids any tally vocabulary: the note states that BOTH sides exist and that
 *    the tool does not pick one, and it makes no claim about which side has more.
 */
export const CONFLICT_JUXTAPOSITION_NOTE =
  '存在冲突的历史证据：既有支持这条方向的历史内容，也有反驳它的历史内容。两侧并列呈现，本工具不替你选一边，也不对两侧做任何数量上的比较或结论。';

/**
 * Builds the derived overview.
 *
 * 🔴 DERIVED, never persisted, so `N_引用` cannot exist as a second drifting number (§26).
 * 🔴 The count is READ from `M7`'s citation view (`counted_target_ids.length`) rather than recomputed
 *    from the reference list: a second derivation is exactly what §12 item 11 forbids.
 * 🔴 NO evidence strength, NO high / medium / low grade, NO score, NO confidence and NO vote count:
 *    the overview reports the SET SHAPE, nothing about how convincing it is (§26 / `D-020`).
 */
export function evidenceOverviewOf(input: {
  readonly citation: CitationView;
  readonly refs: readonly EvidenceRef[];
  readonly uncompared_dimensions?: readonly LevelADimension[];
}): EvidenceOverview {
  const has_support = input.refs.some((ref) => ref.role === 'support');
  const has_contradict = input.refs.some((ref) => ref.role === 'contradict');
  const uncompared = input.uncompared_dimensions ?? [];
  return {
    n_citation: input.citation.n_citation,
    distinct_record_count: input.citation.counted_target_ids.length,
    single_source: input.citation.n_citation === 1,
    has_conflict: has_support && has_contradict,
    conflict_note: has_support && has_contradict ? CONFLICT_JUXTAPOSITION_NOTE : null,
    missing_condition_note:
      uncompared.length === 0
        ? null
        : `本次记录有 ${String(uncompared.length)} 个维度因为「未知 / 未提供」而没有参与比对：${uncompared
            .map((dimension) => LEVEL_A_DIMENSION_LABELS[dimension])
            .join('、')}。这些维度不构成本次判断的依据。`,
  };
}

/** One evidence line for the independent check prompt: role + landing point + content value. */
export function evidenceLinesOf(
  refs: readonly EvidenceRef[],
  historical_attempts: readonly GroundingHistoricalAttempt[],
): readonly string[] {
  const by_id = new Map(historical_attempts.map((entry) => [entry.attempt.attempt_id, entry]));
  return refs.map((ref) => {
    const entry = by_id.get(ref.target_id);
    const landing =
      entry === undefined
        ? null
        : resolveSourceFieldPath(entry.attempt, entry.content_items ?? [], ref.source_field_path);
    return `[${ref.role}] ${ref.target_id} :: ${ref.source_field_path} → ${
      landing === null ? '（无法解析）' : landing.value
    }`;
  });
}

/** The pure-`context` references, which are displayable and counted by nobody (§5.2 rule 5). */
export function contextOnlyReferences(refs: readonly EvidenceRef[]): readonly EvidenceRef[] {
  return refs.filter((ref) => ref.role === CONTEXT_ROLE);
}

/** Re-exported so callers can read a landing layer without importing `M7`'s addressable module. */
export type { ContentItem, SourceType };
