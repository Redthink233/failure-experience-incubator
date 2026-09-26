/**
 * S01 ｜ `M7` Grounding Context Builder - the public vocabulary.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md (**v0.3 FROZEN / IMPLEMENTATION BASIS**)
 *   - §5    `EvidenceRef` minimum field set + the four roles + `source_field_path` landing layers;
 *   - §6    `N_检索` / `N_引用` two-tier vocabulary (read here, never recomputed);
 *   - §7.4  「来源已归档」 is derived from the target's CURRENT `archive_state` - never a snapshot;
 *   - §9    ⑩ traceability: the trace list and `N_引用` come from the SAME `EvidenceRef` set;
 *   - §12   items 10–11: no second reference system, one derivation set.
 * Gate C Plan §J.3 (`M7` shared types: `EvidenceRef` / `RefRole` / `NCitationSnapshot` /
 * `GroundingContextPack`) and §I.1 (`M6` → `M7` one-way edge).
 *
 * 🔴 WHAT THIS MODULE IS: the deterministic context / evidence builder between step ⑦ and step ⑧.
 *    It turns the CURRENT `M6` Retrieval Derivation into traceable historical content candidates,
 *    `EvidenceRef` records, the ⑩ traceability view and `N_引用`.
 * 🔴 WHAT IT IS NOT: it generates no `Insight` (`M8`), no `Hypothesis` (`M9`), no orchestration
 *    (`M15`) and no UI. It calls NO model (`M10`) - `M7` needs no `ProviderAdapter` at all.
 * 🔴 It does NOT re-do retrieval (task §4): `related` / `matched` / `compared_not_matched` /
 *    `uncompared` / `N_检索` / the ordering are all CONSUMED from `M6`'s derivation.
 * 🔴 No numeric judgement quantity of any kind: no similarity, no score, no confidence, no rank
 *    (`D-020` / `D-037` / AC-23). The only numbers carried are set sizes (`D-037` class ②).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no LLM.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { EvidenceOwnerId, EvidenceRef, RefRole } from '../../domain/types/evidence-ref.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import type { SourceType } from '../../domain/types/source-type.js';
import type { RetrievalStatus } from '../compare/types.js';

/* ------------------------------------------------------------------ *
 * 1. Selections (what the caller asks to reference)
 * ------------------------------------------------------------------ */

/**
 * One requested reference.
 *
 * 🔴 `target_id` is typed as a plain `string` ON PURPOSE: it is a RUNTIME BOUNDARY. The
 *    constructor must refuse a `Draft` id, an `INS_` / `HYP_` id or any other string, and it can
 *    only do that if such a value can be expressed at all. The resulting `EvidenceRef.target_id`
 *    is the narrow `ObjectId<'ATT'>` of the frozen type.
 * 🔴 M8 / M9 choose the role; `M7` only validates it. Nothing here recommends a role.
 */
export interface GroundingSelection {
  readonly target_id: string;
  readonly source_field_path: string;
  readonly role: RefRole;
}

/* ------------------------------------------------------------------ *
 * 2. Traceable historical content
 * ------------------------------------------------------------------ */

/** One addressable content item of a related historical record, as far as `M7` will admit it. */
export interface GroundingSourceCandidate {
  readonly target_id: ObjectId<'ATT'>;
  readonly attempt_field_path: string;
  readonly content_item_id: string;
  /** The frozen `<attempt_field_path>#<content_item_id>` encoding, index-free by construction. */
  readonly source_field_path: string;
  /** `Fact` or `Extraction` only - an `Inference` never reaches this structure. */
  readonly source_type: Extract<SourceType, 'Fact' | 'Extraction'>;
  readonly value: string;
  /** The roles this landing point MAY legally take; never a recommended role. */
  readonly allowed_roles: readonly RefRole[];
  /** Dynamic at read time (§7.4): the target's CURRENT archive state, never a snapshot. */
  readonly source_archived: boolean;
}

/** A content item that was deliberately NOT admitted, with the reason - never a silent drop. */
export interface GroundingExcludedSource {
  readonly target_id: ObjectId<'ATT'>;
  readonly attempt_field_path: string;
  readonly content_item_id: string;
  readonly source_type: SourceType;
  readonly reason: string;
}

/**
 * The traceable content candidates of the CURRENT Retrieval Derivation.
 *
 * 🔴 The ONLY source is `M6`'s related candidate set: an archived record, a same-Project record or
 *    a keyword-similar record that `M6` did not admit can never be re-introduced here (task §15 /
 *    §21 / `G4`).
 * 🔴 This is a SELECTION SURFACE, not a model context: `buildGroundingContext` is what narrows it
 *    down to the referenced items (task §24).
 */
export interface GroundingSourceCatalog {
  readonly source_attempt_id: ObjectId<'ATT'>;
  /** The identity of the `M6` derivation this catalog was derived from. */
  readonly derivation_id: string;
  /** Related candidate ids, in `M6`'s stored display order. */
  readonly target_ids: readonly ObjectId<'ATT'>[];
  readonly candidates: readonly GroundingSourceCandidate[];
  readonly excluded: readonly GroundingExcludedSource[];
}

/* ------------------------------------------------------------------ *
 * 3. `N_引用` / ⑩ traceability (SAME `EvidenceRef` set, two views)
 * ------------------------------------------------------------------ */

/**
 * The derived citation view of ONE owner.
 *
 * 🔴 Derived in real time from the owner's `EvidenceRef` set; there is deliberately NO writable
 *    second copy of this number anywhere in `M7` (task §18 / §19).
 * 🔴 Counting depends ONLY on `role` (§6.3 rule 7) - never on the `Fact` / `Extraction` landing
 *    layer, never on the target's archive state.
 * 🔴 `n_citation` counts DISTINCT `target_id`s (task §18 / §S03-B §F.2 / `S03-D` §G.3): the
 *    definition of `N_引用` is the number of RECORDS, not the number of reference rows
 *    (AC-38 / AC-84).
 * 🔴 `counted_ref_ids` / `context_only_ref_ids` keep the frozen `NCitationSnapshot` field names so
 *    this view is not a rival vocabulary - only the distinct-target detail is added.
 */
export interface CitationView {
  readonly owner_id: EvidenceOwnerId;
  /** Distinct `target_id`s among the references whose role counts (§6.2). */
  readonly n_citation: number;
  readonly counted_target_ids: readonly ObjectId<'ATT'>[];
  /** Every reference whose role counts, in set order (the ⑩ list's counted rows). */
  readonly counted_ref_ids: readonly string[];
  /** Pure `context` references: displayable, labelled 「上下文」, never counted (§5.2 rule 5). */
  readonly context_only_ref_ids: readonly string[];
}

interface TraceableEvidenceBase {
  readonly evidence_ref_id: string;
  readonly owner_id: EvidenceOwnerId;
  readonly role: RefRole;
  readonly target_id: ObjectId<'ATT'>;
  readonly source_field_path: string;
  readonly counted_toward_n_citation: boolean;
}

/** A reference whose target and landing point both still resolve right now. */
export interface TraceableEvidenceResolved extends TraceableEvidenceBase {
  readonly resolvable: true;
  readonly attempt_field_path: string;
  readonly content_item_id: string;
  readonly content_source_type: SourceType;
  readonly content_value: string;
  /** 🔴 DYNAMIC, from the target's CURRENT `archive_state` (§7.4) - never stored on the ref. */
  readonly source_archived: boolean;
  /** The `M6` matched Level A dimensions of that target - context only, recomputed never. */
  readonly matched_level_a_dimensions: readonly LevelADimension[];
}

/**
 * A reference that no longer resolves.
 *
 * 🔴 It is STILL LISTED rather than dropped: 「旧引用不得静默消失」 is a hard rule (契约 §3.3 /
 *    the ⑩ row of §9). `M7` surfaces the fact; it never rewrites history.
 */
export interface TraceableEvidenceUnresolved extends TraceableEvidenceBase {
  readonly resolvable: false;
  readonly reason: string;
}

export type TraceableEvidenceView = TraceableEvidenceResolved | TraceableEvidenceUnresolved;

/* ------------------------------------------------------------------ *
 * 4. The pack
 * ------------------------------------------------------------------ */

/**
 * The minimal context handed to the later stages.
 *
 * 🔴 Scope discipline (task §5 / §24): NO whole workspace, NO unrelated `Attempt`, NO API
 *    credential, NO numeric similarity, NO confidence, NO rank score, NO second `N_引用`.
 * 🔴 `n_retrieval` is COPIED from the `M6` derivation, never recomputed (task §27): `N_检索` and
 *    `N_引用` are two different numbers and a pack may legitimately carry `6` and `2`.
 */
export interface GroundingContextPack {
  readonly owner_id: EvidenceOwnerId;
  readonly source_attempt_id: ObjectId<'ATT'>;
  /** The identity of the `M6` current Retrieval Derivation this pack consumed. */
  readonly derivation_id: string;
  readonly derivation_status: RetrievalStatus;
  /** Set size of the related historical records - read from `M6`, never recomputed. */
  readonly n_retrieval: number;
  /** The related (`M6`-admitted) historical records available as grounding sources. */
  readonly eligible_historical_target_ids: readonly ObjectId<'ATT'>[];
  readonly evidence_refs: readonly EvidenceRef[];
  readonly citation: CitationView;
  readonly traceability: readonly TraceableEvidenceView[];
  /** Targets carrying at least one `role = grounding` reference. */
  readonly grounding_target_ids: readonly ObjectId<'ATT'>[];
  /**
   * Structural answer to "is there at least one legal grounding reference?".
   *
   * 🔴 `M7` reports the STRUCTURE only; whether the result is a `History-grounded Hypothesis`
   *    stays an `M9` judgement (task §22).
   */
  readonly has_grounding_reference: boolean;
  readonly created_at: string;
}

/* ------------------------------------------------------------------ *
 * 5. Rejections (explicit, never a silent drop)
 * ------------------------------------------------------------------ */

export type GroundingRejectionCode =
  /** `owner_id` is not an `INS_` / `HYP_` id - a source `ATT_` id may never impersonate it. */
  | 'OWNER_ID_INVALID'
  /** The derivation handed in belongs to another source `Attempt`. */
  | 'DERIVATION_SOURCE_MISMATCH'
  /** The selection carries no role, or a value that is not one of the four frozen roles. */
  | 'ROLE_INVALID'
  /** `target_id` is not an `ATT_` id (an `INS_` / `HYP_` / free string can never be a target). */
  | 'TARGET_NOT_AN_ATTEMPT_ID'
  /** The target `Attempt` does not exist in the workspace. */
  | 'TARGET_NOT_FOUND'
  /** The target exists but is a `Draft`; a `Draft` is never referenceable. */
  | 'TARGET_NOT_FORMAL'
  /** The target is not a related candidate of the consumed `M6` derivation. */
  | 'TARGET_NOT_IN_RETRIEVAL_DERIVATION'
  /** `source_field_path` is malformed (no separator, empty side, …). */
  | 'SOURCE_FIELD_PATH_MALFORMED'
  /** `source_field_path` does not resolve inside the target (missing / unknown / wrong carrier). */
  | 'SOURCE_FIELD_PATH_UNRESOLVABLE'
  /** The landing point is an `Inference`; an `Inference` may never be referenced. */
  | 'SOURCE_CONTENT_IS_INFERENCE'
  /** `role = grounding` on a non-`Fact` landing point. */
  | 'GROUNDING_REQUIRES_FACT'
  /** The same `(target, landing point)` was selected twice. */
  | 'DUPLICATE_SELECTION'
  /** Every member of a `support` / `contradict` role set has `result_status = Unknown`. */
  | 'UNKNOWN_RESULT_CANNOT_CARRY_DIRECTION_ALONE';

export interface GroundingRejection {
  readonly code: GroundingRejectionCode;
  readonly detail: string;
  /** `null` when the rejection is about the whole request rather than one selection. */
  readonly selection_index: number | null;
  readonly owner_id: string | null;
  readonly target_id: string | null;
  readonly source_field_path: string | null;
}

export interface GroundingContextBuilt {
  readonly kind: 'built';
  readonly pack: GroundingContextPack;
}

export interface GroundingContextInvalid {
  readonly kind: 'invalid';
  /** Every rejection, in the order they were found. Never a partially built pack. */
  readonly rejections: readonly GroundingRejection[];
  readonly detail: string;
}

export type BuildGroundingContextOutcome = GroundingContextBuilt | GroundingContextInvalid;

/* ------------------------------------------------------------------ *
 * 6. Errors
 * ------------------------------------------------------------------ */

export type GroundingContextErrorCode =
  | 'DERIVATION_SOURCE_MISMATCH'
  | 'CATALOG_INPUT_INCOMPLETE'
  /** A reference was offered for an owner it does not belong to. */
  | 'REF_OWNER_MISMATCH';

/** Thrown for a programming error (a precondition), never for a user-facing selection problem. */
export class GroundingContextError extends Error {
  readonly code: GroundingContextErrorCode;

  constructor(code: GroundingContextErrorCode, message: string) {
    super(message);
    this.name = 'GroundingContextError';
    this.code = code;
  }
}
