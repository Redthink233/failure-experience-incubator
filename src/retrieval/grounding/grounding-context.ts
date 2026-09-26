/**
 * S01 ｜ `M7` Grounding Context Builder: selections → validated `EvidenceRef`s → pack.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md (§5 / §6 / §7.4 / §9 / §12 items
 * 10–11), Gate C Plan §I.1 / §J.3, and the M7 task §5–§27.
 *
 * 🔴 WHAT IT DOES: it CONVERTS `M6`'s related historical records into traceable `EvidenceRef`
 *    records for an `Insight` / `Hypothesis` owner that `M8` / `M9` has already created, and it
 *    derives the ⑩ view and `N_引用` from that single set.
 * 🔴 WHAT IT REFUSES: a `Draft` target, a target outside the consumed derivation, an unresolvable
 *    landing point, an `Inference` landing point, `grounding` on a non-`Fact`, an owner that is not
 *    an `Insight` / `Hypothesis` id, and a direction carried only by `Unknown`-result records.
 *    EVERY refusal is returned as a rejection - nothing is silently dropped (task §13 / §16).
 * 🔴 IT DOES NOT RE-DO RETRIEVAL: `related` / `matched` / `uncompared` / `N_检索` / the ordering are
 *    read from the derivation; no `LLM` is called and no `ProviderAdapter` exists in this layer.
 * 🔴 IT PERSISTS NOTHING: the `EvidenceRef` set is returned in the pack. Writing it belongs to
 *    `M8` / `M9`, inline with the owner object (Gate C physical default; task §26).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no LLM.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type {
  EvidenceOwnerId,
  EvidenceRef,
  RefRole,
  SourceFieldPath,
} from '../../domain/types/evidence-ref.js';
import {
  GROUNDING_ROLE,
  REF_ROLES,
  isGroundingAllowedForContentItem,
} from '../../domain/types/evidence-ref.js';
import { parseSourceFieldPath } from '../../domain/types/evidence-ref.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import type { Attempt } from '../../domain/types/attempt.js';
import type { RetrievalDerivationRecord } from '../compare/types.js';
import { matchedDimensionsOf } from '../compare/derivation.js';
import { resolveSourceFieldPath } from './addressable.js';
import { isAttemptTargetId, newEvidenceRefId, toEvidenceOwnerId } from './identity.js';
import { resultStatusIsUnknown, unsatisfiedDirectionRoles } from './reference-rules.js';
import type { RoleAssignment } from './reference-rules.js';
import { deriveCitationView, deriveTraceabilityView } from './citation.js';
import { buildGroundingSourceCatalog } from './catalog.js';
import type { GroundingHistoricalAttempt } from './catalog.js';
import type {
  BuildGroundingContextOutcome,
  GroundingContextPack,
  GroundingRejection,
  GroundingRejectionCode,
  GroundingSelection,
} from './types.js';

export interface BuildGroundingContextInput {
  /**
   * The `Insight` (`INS_`) or `Hypothesis` (`HYP_`) that will own the references.
   * 🔴 `M7` never creates the owner - `M8` / `M9` do, and only then is a reference built for it.
   *    A source `ATT_` id can never be passed off as an owner (task §16).
   */
  readonly owner_id: string;
  readonly source_attempt_id: ObjectId<'ATT'>;
  /** The CURRENT `M6` Retrieval Derivation of `source_attempt_id`. */
  readonly derivation: RetrievalDerivationRecord;
  readonly historical_attempts: readonly GroundingHistoricalAttempt[];
  /** What the caller wants to reference. `M8` / `M9` decide; `M7` only validates. */
  readonly selections: readonly GroundingSelection[];
  /** Injectable clock (ISO-8601) - keeps fixtures deterministic. */
  readonly created_at?: string;
}

function rejectionOf(
  code: GroundingRejectionCode,
  detail: string,
  selection_index: number | null,
  owner_id: string | null,
  target_id: string | null,
  source_field_path: string | null,
): GroundingRejection {
  return { code, detail, selection_index, owner_id, target_id, source_field_path };
}

/** `true` when the value is one of the four frozen roles. */
function isRefRole(value: string): value is RefRole {
  return (REF_ROLES as readonly string[]).includes(value);
}

interface ResolvedSelection {
  readonly index: number;
  readonly selection: GroundingSelection;
  readonly target_id: ObjectId<'ATT'>;
  readonly target_result_unknown: boolean;
}

/**
 * Validates one selection against the derivation, the workspace records and the frozen rules.
 * Returns `null` when the selection is legal, or the rejection that refuses it.
 */
function rejectionForSelection(
  selection: GroundingSelection,
  index: number,
  owner_id: string,
  historicalById: ReadonlyMap<string, GroundingHistoricalAttempt>,
  related_ids: ReadonlySet<string>,
): GroundingRejection | null {
  const at = (code: GroundingRejectionCode, detail: string): GroundingRejection =>
    rejectionOf(code, detail, index, owner_id, selection.target_id, selection.source_field_path);

  if (!isRefRole(selection.role)) {
    return at('ROLE_INVALID', 'Every reference must carry one of the four frozen roles (§5.2 rule 1).');
  }
  if (!isAttemptTargetId(selection.target_id)) {
    return at(
      'TARGET_NOT_AN_ATTEMPT_ID',
      'Only a Formal Attempt id may be an EvidenceRef target; an Insight, a Hypothesis or any other value is never one.',
    );
  }
  const historical = historicalById.get(selection.target_id);
  if (historical === undefined) {
    return at('TARGET_NOT_FOUND', `Attempt "${selection.target_id}" could not be resolved.`);
  }
  if (historical.attempt.state !== 'Formal') {
    return at(
      'TARGET_NOT_FORMAL',
      `Attempt "${selection.target_id}" is a ${historical.attempt.state}; a Draft is never referenceable.`,
    );
  }
  if (!related_ids.has(selection.target_id)) {
    return at(
      'TARGET_NOT_IN_RETRIEVAL_DERIVATION',
      `Attempt "${selection.target_id}" is not a related candidate of the consumed retrieval derivation, so it may not be re-introduced here.`,
    );
  }
  if (parseSourceFieldPath(selection.source_field_path) === null) {
    return at(
      'SOURCE_FIELD_PATH_MALFORMED',
      'A source_field_path must be "<attempt_field_path>#<content_item_id>".',
    );
  }
  const landing = resolveSourceFieldPath(
    historical.attempt,
    historical.content_items ?? [],
    selection.source_field_path,
  );
  if (landing === null) {
    return at(
      'SOURCE_FIELD_PATH_UNRESOLVABLE',
      'The path does not resolve to a content item inside the referenced Attempt.',
    );
  }
  if (landing.source_type === 'Inference') {
    return at(
      'SOURCE_CONTENT_IS_INFERENCE',
      'An Inference may never be referenced, whatever its confirmation or decision state (§5.2 / task §14).',
    );
  }
  if (selection.role === GROUNDING_ROLE && !isGroundingAllowedForContentItem(landing.item)) {
    return at(
      'GROUNDING_REQUIRES_FACT',
      'role = grounding may only land on a Fact; an Extraction never grounds, however reliable it looks.',
    );
  }
  return null;
}

/**
 * Builds one `GroundingContextPack`.
 *
 * 🔴 All-or-nothing: if ANY selection is refused, `kind = 'invalid'` and NO pack is produced. A
 *    partially built pack would let a caller persist references the rules had already refused.
 */
export function buildGroundingContext(
  input: BuildGroundingContextInput,
): BuildGroundingContextOutcome {
  const rejections: GroundingRejection[] = [];

  const owner_id: EvidenceOwnerId | null = toEvidenceOwnerId(input.owner_id);
  if (owner_id === null) {
    rejections.push(
      rejectionOf(
        'OWNER_ID_INVALID',
        `"${input.owner_id}" is not an INS_ / HYP_ id; a reference is owned by an Insight or a Hypothesis, never by a source Attempt.`,
        null,
        null,
        null,
        null,
      ),
    );
    return {
      kind: 'invalid',
      rejections,
      detail: 'The evidence owner is not an Insight or a Hypothesis id.',
    };
  }

  if (input.derivation.source_attempt_id !== input.source_attempt_id) {
    rejections.push(
      rejectionOf(
        'DERIVATION_SOURCE_MISMATCH',
        `The derivation belongs to "${input.derivation.source_attempt_id}", not to "${input.source_attempt_id}".`,
        null,
        owner_id,
        null,
        null,
      ),
    );
    return {
      kind: 'invalid',
      rejections,
      detail: 'The supplied derivation is not the current derivation of the source Attempt.',
    };
  }

  const historicalById = new Map<string, GroundingHistoricalAttempt>();
  for (const entry of input.historical_attempts) {
    historicalById.set(entry.attempt.attempt_id, entry);
  }
  /* 🔴 The ONLY admission source: `M6`'s related candidate set, never a fresh similarity search. */
  const related_ids = new Set<string>(
    input.derivation.candidate_entries.map((entry) => entry.candidate_attempt_id),
  );

  const resolved: ResolvedSelection[] = [];
  const seen_landings = new Set<string>();

  for (const [index, selection] of input.selections.entries()) {
    const rejected = rejectionForSelection(
      selection,
      index,
      owner_id,
      historicalById,
      related_ids,
    );
    if (rejected !== null) {
      rejections.push(rejected);
      continue;
    }
    const target_id = selection.target_id as ObjectId<'ATT'>;
    const identity = `${target_id}|${selection.source_field_path}`;
    if (seen_landings.has(identity)) {
      rejections.push(
        rejectionOf(
          'DUPLICATE_SELECTION',
          'The same landing point was selected twice; one landing point has one reference.',
          index,
          owner_id,
          target_id,
          selection.source_field_path,
        ),
      );
      continue;
    }
    seen_landings.add(identity);
    const historical = historicalById.get(target_id);
    resolved.push({
      index,
      selection,
      target_id,
      target_result_unknown:
        historical === undefined ? false : resultStatusIsUnknown(historical.attempt),
    });
  }

  /*
   * 🔴 SET-LEVEL rule: a direction may not be carried by `Unknown`-result records ALONE
   *    (§5.2 rule 6 / §G.5 of S03-C). Checked over the accepted rows only, so a refusal never
   *    masks a second refusal.
   */
  const assignments: RoleAssignment[] = resolved.map((row) => ({
    role: row.selection.role,
    target_id: row.target_id,
    target_result_unknown: row.target_result_unknown,
  }));
  for (const role of unsatisfiedDirectionRoles(assignments)) {
    const first = resolved.find((row) => row.selection.role === role);
    rejections.push(
      rejectionOf(
        'UNKNOWN_RESULT_CANNOT_CARRY_DIRECTION_ALONE',
        `Every reference carrying role "${role}" points at a record whose result status is Unknown, so nothing carries the direction. The record stays usable as grounding or context instead.`,
        first?.index ?? null,
        owner_id,
        first?.target_id ?? null,
        first?.selection.source_field_path ?? null,
      ),
    );
  }

  if (rejections.length > 0) {
    return {
      kind: 'invalid',
      rejections,
      detail: `${String(rejections.length)} selection(s) were refused; no reference was built.`,
    };
  }

  const evidence_refs: EvidenceRef[] = resolved.map((row) => ({
    evidence_ref_id: newEvidenceRefId(),
    target_id: row.target_id,
    source_field_path: row.selection.source_field_path as SourceFieldPath,
    role: row.selection.role,
    owner_id,
  }));

  /* 🔴 ONE set → both views. The ⑩ list and `N_引用` can therefore never disagree (§3.3). */
  const citation = deriveCitationView(owner_id, evidence_refs);
  const matched_by_target: Record<string, readonly LevelADimension[]> = {};
  for (const entry of input.derivation.candidate_entries) {
    matched_by_target[entry.candidate_attempt_id] = matchedDimensionsOf(entry);
  }
  const traceability = deriveTraceabilityView(evidence_refs, {
    resolveTarget: (target_id: ObjectId<'ATT'>): Attempt | null =>
      historicalById.get(target_id)?.attempt ?? null,
    resolveAttachedContentItems: (target_id: ObjectId<'ATT'>) =>
      historicalById.get(target_id)?.content_items ?? [],
    matched_level_a_dimensions_by_target: matched_by_target,
  });

  const grounding_target_ids: ObjectId<'ATT'>[] = [];
  for (const ref of evidence_refs) {
    if (ref.role !== GROUNDING_ROLE || grounding_target_ids.includes(ref.target_id)) {
      continue;
    }
    grounding_target_ids.push(ref.target_id);
  }

  /* The catalog is built for its eligible-source list; membership was already enforced above. */
  const catalog = buildGroundingSourceCatalog({
    source_attempt_id: input.source_attempt_id,
    derivation: input.derivation,
    historical_attempts: input.historical_attempts,
  });

  const pack: GroundingContextPack = {
    owner_id,
    source_attempt_id: input.source_attempt_id,
    derivation_id: input.derivation.derivation_id,
    derivation_status: input.derivation.status,
    /* 🔴 Copied from `M6`. `N_检索` and `N_引用` are different numbers (§6.3 rule 2). */
    n_retrieval: input.derivation.n_retrieval,
    eligible_historical_target_ids: catalog.target_ids,
    evidence_refs,
    citation,
    traceability,
    grounding_target_ids,
    has_grounding_reference: grounding_target_ids.length > 0,
    created_at: input.created_at ?? new Date().toISOString(),
  };

  return { kind: 'built', pack };
}
