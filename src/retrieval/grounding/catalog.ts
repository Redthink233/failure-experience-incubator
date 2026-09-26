/**
 * S01 ｜ `M7` Grounding Source Catalog: the traceable historical content candidates.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
 *   - §9 step ⑦ output → step ⑧ input: only the `M6`-admitted related set may be used;
 *   - §5.1 `source_field_path` must resolve to a real content item inside a `Formal Attempt`;
 *   - §7.4 the archive annotation is dynamic;
 *   - `D-019` / AC-20 / AC-86: same-Project, same-tag and keyword resemblance are NEVER an
 *     admission criterion.
 *
 * 🔴 THE ONLY INPUT IS `M6`'s CURRENT DERIVATION. A record that `M6` did not admit is not in the
 *    catalog, so "该记录的引用不在 M6 related candidates 内" (`N2`) is structurally impossible to
 *    satisfy - not filtered after the fact (task §15 / §21).
 * 🔴 `N_检索` is READ from the derivation and never recomputed; the catalog carries no count of its
 *    own to be confused with it (task §27).
 * 🔴 An `Inference` content item is reported as EXCLUDED with its reason instead of being silently
 *    dropped, so the boundary is auditable (task §14).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no LLM.
 */

import type { Attempt } from '../../domain/types/attempt.js';
import type { SourceType } from '../../domain/types/source-type.js';
import type { PersistedContentItem } from '../../domain/types/content-item-record.js';
import { sourceArchiveAnnotationApplies } from '../../domain/types/evidence-ref.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import type { RetrievalDerivationRecord } from '../compare/types.js';
import { addressableTargetsOf, sourceFieldPathOf } from './addressable.js';
import { allowedRefRolesFor } from './reference-rules.js';
import { GroundingContextError } from './types.js';
import type {
  GroundingExcludedSource,
  GroundingSourceCandidate,
  GroundingSourceCatalog,
} from './types.js';

/** One historical record together with its attached content items (docs/02 §C.4). */
export interface GroundingHistoricalAttempt {
  readonly attempt: Attempt;
  readonly content_items?: readonly PersistedContentItem[];
}

export interface BuildGroundingSourceCatalogInput {
  readonly source_attempt_id: ObjectId<'ATT'>;
  /** The CURRENT `M6` Retrieval Derivation. The ONLY admission source. */
  readonly derivation: RetrievalDerivationRecord;
  /** Every historical record the caller could resolve; only the derived ones are used. */
  readonly historical_attempts: readonly GroundingHistoricalAttempt[];
}

/** Reason attached to an `Inference` landing point that was refused. */
export const EXCLUDED_INFERENCE_REASON =
  'An Inference is never an EvidenceRef landing point (§5.2 / task §14), regardless of its confirmation or decision state.';

/** Reason attached to a second occurrence of the same landing point. */
export const EXCLUDED_DUPLICATE_REASON =
  'The same landing point was already admitted for this target; identity is the content-item id, so a repetition adds nothing.';

function exclusionOf(
  target_id: ObjectId<'ATT'>,
  attempt_field_path: string,
  content_item_id: string,
  source_type: SourceType,
  reason: string,
): GroundingExcludedSource {
  return { target_id, attempt_field_path, content_item_id, source_type, reason };
}

/**
 * Builds the catalog of traceable content candidates for one source `Formal Attempt`.
 *
 * Preconditions (a programming error, not a user-facing outcome): the derivation must belong to
 * `source_attempt_id`, and every related candidate must be resolvable by the caller. Both failures
 * would otherwise silently narrow the candidate pool and quietly change what step ⑧ may see.
 */
export function buildGroundingSourceCatalog(
  input: BuildGroundingSourceCatalogInput,
): GroundingSourceCatalog {
  const { derivation, source_attempt_id } = input;
  if (derivation.source_attempt_id !== source_attempt_id) {
    throw new GroundingContextError(
      'DERIVATION_SOURCE_MISMATCH',
      `The derivation belongs to "${derivation.source_attempt_id}", not to "${source_attempt_id}".`,
    );
  }

  const byTargetId = new Map<string, GroundingHistoricalAttempt>();
  for (const entry of input.historical_attempts) {
    byTargetId.set(entry.attempt.attempt_id, entry);
  }

  const target_ids: ObjectId<'ATT'>[] = [];
  const candidates: GroundingSourceCandidate[] = [];
  const excluded: GroundingExcludedSource[] = [];
  const admitted = new Set<string>();

  for (const entry of derivation.candidate_entries) {
    const target_id = entry.candidate_attempt_id;
    target_ids.push(target_id);
    const historical = byTargetId.get(target_id);
    if (historical === undefined) {
      throw new GroundingContextError(
        'CATALOG_INPUT_INCOMPLETE',
        `The related candidate "${target_id}" was not supplied, so its addressable content cannot be enumerated.`,
      );
    }

    /* 🔴 Dynamic read of the CURRENT state - the catalog never stores an archive snapshot. */
    const source_archived = sourceArchiveAnnotationApplies(historical.attempt.archive_state);

    for (const target of addressableTargetsOf(
      historical.attempt,
      historical.content_items ?? [],
    )) {
      if (target.source_type === 'Inference') {
        excluded.push(
          exclusionOf(
            target_id,
            target.attempt_field_path,
            target.content_item_id,
            target.source_type,
            EXCLUDED_INFERENCE_REASON,
          ),
        );
        continue;
      }

      const source_field_path = sourceFieldPathOf(target);
      const identity = `${target_id}|${source_field_path}`;
      if (admitted.has(identity)) {
        excluded.push(
          exclusionOf(
            target_id,
            target.attempt_field_path,
            target.content_item_id,
            target.source_type,
            EXCLUDED_DUPLICATE_REASON,
          ),
        );
        continue;
      }
      admitted.add(identity);

      candidates.push({
        target_id,
        attempt_field_path: target.attempt_field_path,
        content_item_id: target.content_item_id,
        source_field_path,
        source_type: target.source_type,
        value: target.value,
        allowed_roles: allowedRefRolesFor(target.source_type),
        source_archived,
      });
    }
  }

  return {
    source_attempt_id,
    derivation_id: derivation.derivation_id,
    target_ids,
    candidates,
    excluded,
  };
}
