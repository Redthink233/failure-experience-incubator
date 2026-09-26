/**
 * S01 ｜ `M9` grounding evaluation: `G1`-`G4` confirmation and the fail-closed `N1`-`N6` boundary.
 *
 * Contract: §8.2 (§8.2 rule 1 binary outcome; the G1-G4 bases; the N1-N6 conditions; rule 2 the two
 * source partitions with no third 「混合」 label; rule 3 the whole-partition annotation of a
 * `Model Suggestion`), §5.2 rule 4 (a `Draft` is never referenceable), §7.4, `D-030`, `D-035`,
 * `TQ34` ("二值、无中间等级、不得设『部分锚定』"), `D-007` / `D-021 E4` (`N = 1` boundary).
 *
 * 🔴 GROUNDING IS BINARY. `grounded` / `not_grounded` and nothing else: no `partial`, no `weak`, no
 *    `medium`, no `strong`, no score, no confidence. The final decision is delegated to the FROZEN
 *    domain predicate `isGroundingBinaryOutcome`, so there is exactly ONE definition of the rule.
 * 🔴 THE MODEL'S DECLARATION IS NOT EVIDENCE. A `grounding_bases` entry is a CLAIM. This module
 *    verifies it STRUCTURALLY: each declared basis must be backed by a surviving landing point whose
 *    carrier field actually is the carrier of that basis (see `GROUNDING_BASIS_CARRIER_PATHS`).
 *    "The payload says grounded" therefore proves nothing on its own.
 * 🔴 `N1` / `N2` / `N5` / `N6` ARE STRUCTURAL AND FAIL-CLOSED: each is decided here, without asking a
 *    model, and any single hit removes the `grounded` possibility for that proposal.
 * 🔴 `N3` / `N4` ARE SEMANTIC: the structural pass can already refuse the clear cases (a declared
 *    basis nobody backs is `N3`; no declared basis at all is `N4`), and everything that survives is
 *    handed to a SEPARATE discrete `M10` check - never to the same payload that produced the claim.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no LLM.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { GroundingBasis, NonGroundingCondition } from '../../domain/types/hypothesis.js';
import { isGroundingBinaryOutcome } from '../../domain/types/hypothesis.js';
import type { RefRole } from '../../domain/types/evidence-ref.js';
import { GROUNDING_ROLE, REF_ROLES, parseSourceFieldPath } from '../../domain/types/evidence-ref.js';
import { isGroundingAttemptFieldPath } from '../../retrieval/grounding/addressable.js';
import type { GroundingHistoricalAttempt } from '../../retrieval/grounding/catalog.js';
import { isAttemptTargetId } from '../../retrieval/grounding/identity.js';
import { resultStatusIsUnknown, resultStatusValueOf } from '../../retrieval/grounding/reference-rules.js';
import type { GroundingSelection, GroundingSourceCatalog } from '../../retrieval/grounding/types.js';
import type { GroundedHypothesisProposal, GroundingVerdict } from './types.js';

/* ------------------------------------------------------------------ *
 * 1. Which carrier field can anchor which basis
 * ------------------------------------------------------------------ */

/**
 * The `Attempt` carrier paths that can legitimately anchor each `G` basis (§8.2 `G1`-`G4`).
 *
 * 🔴 THIS TABLE IS WHAT MAKES G1-G4 STRUCTURAL RATHER THAN RHETORICAL. 「问题对象 / 变量来自历史」
 *    is only true if the referenced landing point IS the problem object / a key parameter; 「条件
 *    来自历史」 likewise. A claim that names `G2` while pointing at the record's result is therefore
 *    refused without asking anybody - it is the structural form of `N3` (「只有措辞相似」).
 * 🔴 The carrier names are the SAME `attempt_field_path` values `M7` publishes
 *    (`GROUNDING_ATTEMPT_FIELD_PATHS`) plus the canonical `field_key` of an attached content item, so
 *    no second field vocabulary is opened here.
 */
export const GROUNDING_BASIS_CARRIER_PATHS: Readonly<Record<GroundingBasis, readonly string[]>> = {
  G1: ['goal', 'key_parameters'],
  G2: ['condition', 'environment'],
  G3: ['expected_result', 'judgment_basis'],
  G4: ['actual_attempt', 'actual_result'],
};

/** The `content_items/<field_key>` suffix of an attached content item carrier, or `null`. */
function attachedFieldKeyOf(attempt_field_path: string): string | null {
  const prefix = 'content_items/';
  return attempt_field_path.startsWith(prefix)
    ? attempt_field_path.slice(prefix.length)
    : null;
}

/** `true` when the landing point's carrier really is a carrier of `basis`. */
export function carrierBacksBasis(basis: GroundingBasis, attempt_field_path: string): boolean {
  const carriers = GROUNDING_BASIS_CARRIER_PATHS[basis];
  if (carriers.includes(attempt_field_path)) {
    return true;
  }
  const attached = attachedFieldKeyOf(attempt_field_path);
  return attached !== null && carriers.includes(attached);
}

/* ------------------------------------------------------------------ *
 * 2. The structural pass
 * ------------------------------------------------------------------ */

/** The current workspace facts the structural pass reads (all derived, never stored on a proposal). */
export interface GroundingWorldView {
  readonly catalog: GroundingSourceCatalog;
  readonly historical_attempts: readonly GroundingHistoricalAttempt[];
  /** `N_检索` - the FIRST gate, read from the `M6` derivation and never recomputed (§6). */
  readonly n_retrieval: number;
}

interface TargetFacts {
  readonly attempt: GroundingHistoricalAttempt | null;
  readonly is_related: boolean;
  readonly is_formal: boolean;
  readonly result_unknown: boolean;
  readonly result_value: string | null;
  /** Each admitted landing point of that target, as `M7` published it. */
  readonly admitted_paths: ReadonlyMap<
    string,
    { readonly attempt_field_path: string; readonly source_type: string }
  >;
  /** Attached content items of the target, so an `unknown` carrier can be recognised as `N6`. */
  readonly attached_paths: ReadonlySet<string>;
}

function buildWorldIndex(world: GroundingWorldView): ReadonlyMap<string, TargetFacts> {
  const index = new Map<string, TargetFacts>();
  for (const attempt of world.historical_attempts) {
    index.set(attempt.attempt.attempt_id, {
      attempt,
      is_related: false,
      is_formal: attempt.attempt.state === 'Formal',
      result_unknown: resultStatusIsUnknown(attempt.attempt),
      result_value: resultStatusValueOf(attempt.attempt),
      admitted_paths: new Map(),
      attached_paths: new Set(
        (attempt.content_items ?? []).map((item) => `content_items/${item.field_key}`),
      ),
    });
  }
  for (const target_id of world.catalog.target_ids) {
    const entry = index.get(target_id);
    if (entry !== undefined) {
      index.set(target_id, { ...entry, is_related: true });
    }
  }
  for (const candidate of world.catalog.candidates) {
    const entry = index.get(candidate.target_id);
    if (entry === undefined) {
      continue;
    }
    const paths = new Map(entry.admitted_paths);
    paths.set(candidate.source_field_path, {
      attempt_field_path: candidate.attempt_field_path,
      source_type: candidate.source_type,
    });
    index.set(candidate.target_id, { ...entry, admitted_paths: paths });
  }
  return index;
}

/** One selection that survived the structural pass, with the basis claim it carried. */
export interface VerifiedSelection {
  readonly selection: GroundingSelection;
  readonly declared_basis: GroundingBasis | null;
  readonly attempt_field_path: string;
}

export interface GroundingStructuralEvaluation {
  /** The conditions the structural pass already settled - any hit is fail-closed. */
  readonly conditions_hit: readonly NonGroundingCondition[];
  /** Every selection that may be handed to `M7`, in the proposal's order. */
  readonly verified: readonly VerifiedSelection[];
  /** Declared bases that are really backed by a surviving landing point. */
  readonly bases_hit: readonly GroundingBasis[];
  /** `true` when a discrete `M10` check is still needed to settle `N3` / `N4`. */
  readonly requires_semantic_check: boolean;
  readonly detail: string;
}

function isRefRoleValue(value: string): value is RefRole {
  return (REF_ROLES as readonly string[]).includes(value);
}

/**
 * `true` when the requested carrier field exists on the target but is explicitly 「未知 / 未提供」.
 *
 * 🔴 This is the STRUCTURAL form of `N6` (§4.2 rule 7 / §8.2): an `unknown` field carries no content
 *    item at all, so a path aimed at it can never resolve - and the reason must be told apart from
 *    「没有可指的字段」 (`N1`), otherwise a report would blame the wrong condition.
 */
function carrierIsExplicitlyUnknown(
  facts: TargetFacts,
  attempt_field_path: string,
): boolean {
  const attempt = facts.attempt?.attempt ?? null;
  if (attempt === null) {
    return false;
  }
  if (!isGroundingAttemptFieldPath(attempt_field_path)) {
    return false;
  }
  if (attempt_field_path === 'key_parameters') {
    /* An array carrier is never 「未知」 - it is empty or it holds items. */
    return false;
  }
  return attempt[attempt_field_path].presence_state === 'unknown';
}

/**
 * Runs the structural half of the grounding judgement.
 *
 * 🔴 `N_检索 = 0` short-circuits everything: with no related record there is nothing to ground on, so
 *    the outcome is `N1`-class (`evidence-insufficient`) and NO selection is admitted - the caller
 *    keeps the zero-grounded rule and must not fill the position with a `Model Suggestion`.
 */
export function evaluateGroundingStructurally(
  proposal: GroundedHypothesisProposal,
  world: GroundingWorldView,
): GroundingStructuralEvaluation {
  const conditions = new Set<NonGroundingCondition>();

  if (world.n_retrieval <= 0) {
    return {
      conditions_hit: ['N1'],
      verified: [],
      bases_hit: [],
      requires_semantic_check: false,
      detail:
        'N_检索 = 0: there is no related historical record, so nothing can anchor this direction and no History-grounded hypothesis may be formed from it.',
    };
  }

  const index = buildWorldIndex(world);
  const verified: VerifiedSelection[] = [];
  const seen_landings = new Set<string>();

  for (const selection of proposal.evidence_selections) {
    if (!isRefRoleValue(selection.role)) {
      conditions.add('N1');
      continue;
    }
    if (!isAttemptTargetId(selection.target_id)) {
      /* A `HYP_` / `INS_` / free value can never be an evidence target (§5.2 rule 4). */
      conditions.add('N1');
      continue;
    }
    const facts = index.get(selection.target_id);
    if (facts === undefined || facts.attempt === null) {
      conditions.add('N2');
      continue;
    }
    if (!facts.is_formal) {
      conditions.add('N5');
      continue;
    }
    if (!facts.is_related) {
      conditions.add('N2');
      continue;
    }
    const parsed = parseSourceFieldPath(selection.source_field_path);
    if (parsed === null) {
      conditions.add('N1');
      continue;
    }
    const admitted = facts.admitted_paths.get(selection.source_field_path);
    if (admitted === undefined) {
      /*
       * The path is not one `M7` admits. The reason matters for the report: an addressable field
       * that is explicitly `unknown` contributes nothing at all (`N6`), while any other unaddressable
       * path simply has no field to point at (`N1`).
       */
      conditions.add(carrierIsExplicitlyUnknown(facts, parsed.attempt_field_path) ? 'N6' : 'N1');
      continue;
    }
    if (admitted.source_type === 'Inference') {
      /* An `Inference` landing point is never referenceable (§5.2 / `M7` task §14). */
      conditions.add('N1');
      continue;
    }
    if (selection.role === GROUNDING_ROLE && admitted.source_type !== 'Fact') {
      /* §5.2 rule 9: `grounding` may only land on a `Fact`. */
      conditions.add('N1');
      continue;
    }
    const identity = `${selection.target_id}|${selection.source_field_path}`;
    if (seen_landings.has(identity)) {
      continue;
    }
    seen_landings.add(identity);
    verified.push({
      selection: {
        target_id: selection.target_id,
        source_field_path: selection.source_field_path,
        role: selection.role,
      },
      declared_basis: selection.grounding_basis,
      attempt_field_path: admitted.attempt_field_path,
    });
  }

  if (verified.length === 0) {
    conditions.add('N1');
  }

  const bases = new Set<GroundingBasis>();
  for (const basis of proposal.grounding_bases) {
    const backing = verified.filter((entry) => carrierBacksBasis(basis, entry.attempt_field_path));
    if (backing.length === 0) {
      continue;
    }
    if (basis === 'G4') {
      /*
       * 🔴 `G4` = 「排除项来自历史（已尝试且未达预期）」. The exclusion claim is only structurally true
       *    when the referenced record really did NOT reach its expected result; an `Unknown` result
       *    can never establish that (§5.2 rule 6 / `D-035` / AC-40).
       */
      const established = backing.some((entry) => {
        const facts = index.get(entry.selection.target_id);
        return facts !== undefined && !facts.result_unknown;
      });
      if (!established) {
        continue;
      }
    }
    bases.add(basis);
  }

  if (bases.size === 0) {
    /* The declared basis set is empty, or nothing in it is really backed by a landing point. */
    conditions.add(proposal.grounding_bases.length === 0 ? 'N4' : 'N3');
  }

  const blocking = [...conditions];
  return {
    conditions_hit: blocking,
    verified,
    bases_hit: [...bases],
    requires_semantic_check: blocking.length === 0 && verified.length > 0 && bases.size > 0,
    detail:
      blocking.length === 0
        ? `${String(bases.size)} grounding basis(es) confirmed structurally; the semantic half is still pending.`
        : `Structurally refused: ${blocking.join(', ')}.`,
  };
}

/* ------------------------------------------------------------------ *
 * 3. The binary verdict
 * ------------------------------------------------------------------ */

/**
 * Builds the BINARY verdict.
 *
 * 🔴 The final decision is taken by the FROZEN `isGroundingBinaryOutcome` predicate, so "≥1 basis
 *    satisfied AND at least one traceable reference AND no `N` condition" has exactly one definition
 *    in the repository (§8.2 rule 1).
 * 🔴 A `not_grounded` verdict is never converted into a `Model Suggestion` automatically: that would
 *    let a failed historical claim reappear as if it had never claimed history (§8.1 / §20).
 */
export function groundingVerdictOf(input: {
  readonly bases_hit: readonly GroundingBasis[];
  readonly conditions_hit: readonly NonGroundingCondition[];
  readonly has_traceable_reference: boolean;
  readonly semantic_source: GroundingVerdict['semantic_source'];
  readonly reason: string;
}): GroundingVerdict {
  const grounded = isGroundingBinaryOutcome(
    input.bases_hit,
    input.conditions_hit,
    input.has_traceable_reference,
  );
  return {
    verdict: grounded ? 'grounded' : 'not_grounded',
    bases_hit: input.bases_hit,
    conditions_hit: input.conditions_hit,
    semantic_source: input.semantic_source,
    reason: input.reason,
  };
}

/**
 * The landing-layer note the ⑩ view reports for one reference.
 *
 * 🔴 The layer is read from the CONTENT ITEM's own `source_type`, never from the path (§5.2 rule 10).
 */
export function landingLayerOf(source_type: string): 'Fact' | 'Extraction' | 'Inference' | null {
  return source_type === 'Fact' || source_type === 'Extraction' || source_type === 'Inference'
    ? source_type
    : null;
}

/** `true` when the owner id of a reference is the hypothesis itself`(§5.1 / §9). */
export function ownerMatches(owner_id: ObjectId<'HYP'>, ref_owner_id: string): boolean {
  return owner_id === ref_owner_id;
}
