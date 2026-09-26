/**
 * S01 ｜ `M7` addressable content: which content items of a referenced `Formal Attempt` may be
 *            pointed at, and how a `source_field_path` resolves back to exactly one of them.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
 *   - §5.1  `source_field_path` = a pointer to a TRACEABLE content item inside the referenced
 *           `Formal Attempt`; its landing layer is decided by the content item's own
 *           `source_type`, never by the path (§5.2 rule 10);
 *   - §5.2  rules 5/9: `role = grounding` MUST land on a `Fact`; `Extraction` may carry
 *           `support` / `contradict` / `context`;
 *   - §3.2  references resolve BY ID, never by file name, never by list position.
 *
 * 🔴 The SERIALIZATION FORM is a shared implementation parameter (contract §13.2 `TQ17`): M7
 *    reuses the frozen `<attempt_field_path>#<content_item_id>` encoding from
 *    `src/domain/types/evidence-ref.ts` - it does NOT invent a second encoding, a second
 *    separator or a second reference object.
 * 🔴 RESOLUTION IS BY CONTENT-ITEM IDENTITY, never by an array index, a display order or a file
 *    name. A `key_parameters[]` entry is found by scanning for its own `content_item_id` (task §8).
 * 🔴 `presence_state = unknown` carries no item at all, so an explicitly unknown dimension can
 *    never be addressed - which is exactly why `N1` of the task ("没有字段可指") is structurally
 *    impossible to fake.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { Attempt } from '../../domain/types/attempt.js';
import type {
  ParsedSourceFieldPath,
  SourceFieldPath,
} from '../../domain/types/evidence-ref.js';
import {
  formatSourceFieldPath,
  parseSourceFieldPath,
} from '../../domain/types/evidence-ref.js';
import type { ContentItemFieldKey } from '../../domain/types/content-item-record.js';
import {
  canonicalFieldKeyForAttemptField,
} from '../../domain/types/content-item-record.js';
import type { PersistedContentItem } from '../../domain/types/content-item-record.js';
import type { ContentItem, SourceType } from '../../domain/types/source-type.js';
import type { ObjectId } from '../../domain/ids/object-id.js';

/* ------------------------------------------------------------------ *
 * 1. Addressable `Attempt` field paths
 * ------------------------------------------------------------------ */

/**
 * The `Attempt` fields M7 is willing to address.
 *
 * 🔴 `raw_text` is deliberately ABSENT: it is the record's narrative input rather than a
 *    dimension-level landing point, and offering it would let a later stage "ground" a judgement
 *    on the whole narrative instead of on the specific historical substance.
 * 🔴 `result_status` and `candidate_causes` are ABSENT as well - both are `Inference` content, and
 *    no `Inference` may ever be an `EvidenceRef` landing point (§8 / §14 of the task). The result
 *    status is still READ (to decide whether the target carries a result direction) but it is
 *    never addressable.
 */
export const GROUNDING_ATTEMPT_FIELD_PATHS = [
  'goal',
  'actual_attempt',
  'condition',
  'actual_result',
  'expected_result',
  'judgment_basis',
  'key_parameters',
  'occurred_at',
  'environment',
  'cost',
  'user_note',
] as const;

export type GroundingAttemptFieldPath = (typeof GROUNDING_ATTEMPT_FIELD_PATHS)[number];

export function isGroundingAttemptFieldPath(value: string): value is GroundingAttemptFieldPath {
  return (GROUNDING_ATTEMPT_FIELD_PATHS as readonly string[]).includes(value);
}

/**
 * Carrier namespace for the persisted content-item collection attached to an `Attempt`
 * (docs/02 §C.4 - step ② parse results and the two-layer follow-up answers).
 *
 * 🔴 These items ARE part of the referenced record, so they are traceable and addressable. The
 *    path segment is the canonical `field_key`, kept as an implementation parameter (task §8).
 */
export const ATTACHED_CONTENT_ITEMS_PATH_PREFIX = 'content_items/';

export function attachedContentItemsPath(field_key: ContentItemFieldKey): string {
  return `${ATTACHED_CONTENT_ITEMS_PATH_PREFIX}${field_key}`;
}

/* ------------------------------------------------------------------ *
 * 2. Carrier lookup (by item identity, never by position)
 * ------------------------------------------------------------------ */

function itemInArrayByIdentity(
  items: readonly ContentItem[],
  content_item_id: string,
): ContentItem | null {
  return items.find((item) => item.content_item_id === content_item_id) ?? null;
}

/**
 * The single content item carried by one `Attempt` field, matched by its OWN id.
 *
 * 🔴 `MaybeProvided` is unwrapped explicitly: an `unknown` field has no item and therefore cannot
 *    be resolved, instead of silently yielding an empty value (§4.2 rule 7).
 */
function itemInSingleField(
  attempt: Attempt,
  field_path: GroundingAttemptFieldPath,
  content_item_id: string,
): ContentItem | null {
  switch (field_path) {
    case 'key_parameters':
      return itemInArrayByIdentity(attempt.key_parameters, content_item_id);
    case 'goal':
    case 'actual_attempt':
    case 'condition':
    case 'actual_result':
    case 'expected_result':
    case 'judgment_basis':
    case 'occurred_at':
    case 'environment':
    case 'cost':
    case 'user_note': {
      const carrier = attempt[field_path];
      if (carrier.presence_state !== 'present') {
        return null;
      }
      return carrier.item.content_item_id === content_item_id ? carrier.item : null;
    }
  }
}

/* ------------------------------------------------------------------ *
 * 3. The resolved target
 * ------------------------------------------------------------------ */

/** One resolved landing point: a content item inside a referenced `Formal Attempt`. */
export interface ResolvedContentTarget {
  readonly target_id: ObjectId<'ATT'>;
  /** The carrier address inside the record (`goal` / `key_parameters` / `content_items/note` …). */
  readonly attempt_field_path: string;
  readonly content_item_id: string;
  /**
   * The content item ITSELF.
   * 🔴 Kept so the role rules can reuse the frozen domain predicates
   *    (`isGroundingAllowedForContentItem` / `isFact` / `isExtraction`) instead of restating
   *    "`grounding` requires a `Fact`" a second time.
   */
  readonly item: ContentItem;
  /** The landing layer, taken from the CONTENT ITEM itself (§5.2 rule 10). */
  readonly source_type: SourceType;
  readonly value: string;
  /** Canonical `field_key` when one exists; `null` for the bare field carriers. */
  readonly field_key: ContentItemFieldKey | null;
}

function resolvedOf(
  target_id: ObjectId<'ATT'>,
  attempt_field_path: string,
  item: ContentItem,
  field_key: ContentItemFieldKey | null,
): ResolvedContentTarget {
  return {
    target_id,
    attempt_field_path,
    content_item_id: item.content_item_id,
    item,
    source_type: item.source_type,
    value: item.value,
    field_key,
  };
}

/**
 * Resolves one `source_field_path` against a referenced `Formal Attempt`.
 *
 * Returns `null` - never a substitute - when the path is malformed, when the carrier address is
 * not addressable, when the content item does not exist inside that carrier, or when the item is
 * not part of the record at all. A resolver that guessed would make `E5` / `N6` of the task
 * unenforceable.
 *
 * 🔴 Round-trip property (`E4`): for every target `t` produced by `addressableTargetsOf`,
 *    `resolveSourceFieldPath(attempt, items, t.source_field_path)` yields an equal target.
 */
export function resolveSourceFieldPath(
  attempt: Attempt,
  attached_content_items: readonly PersistedContentItem[],
  source_field_path: SourceFieldPath,
): ResolvedContentTarget | null {
  const parsed: ParsedSourceFieldPath | null = parseSourceFieldPath(source_field_path);
  if (parsed === null) {
    return null;
  }
  const { attempt_field_path, content_item_id } = parsed;

  if (attempt_field_path.startsWith(ATTACHED_CONTENT_ITEMS_PATH_PREFIX)) {
    const field_key = attempt_field_path.slice(ATTACHED_CONTENT_ITEMS_PATH_PREFIX.length);
    const item = attached_content_items.find(
      (candidate) => candidate.content_item_id === content_item_id,
    );
    if (item === undefined || item.field_key !== field_key) {
      return null;
    }
    return resolvedOf(attempt.attempt_id, attempt_field_path, item, item.field_key);
  }

  if (!isGroundingAttemptFieldPath(attempt_field_path)) {
    return null;
  }
  const item = itemInSingleField(attempt, attempt_field_path, content_item_id);
  if (item === null) {
    return null;
  }
  return resolvedOf(
    attempt.attempt_id,
    attempt_field_path,
    item,
    canonicalFieldKeyForAttemptField(attempt_field_path),
  );
}

/* ------------------------------------------------------------------ *
 * 4. Enumerating every addressable target (the catalog's raw material)
 * ------------------------------------------------------------------ */

/**
 * Every traceable content target of one record, in the frozen canonical order of the addressable
 * fields followed by the attached content items in their persisted order.
 *
 * 🔴 An addressable field that is explicitly `unknown` contributes NOTHING (`N6`), and the target
 *    identity is always the content item's own id, so reordering or renaming cannot move it.
 */
export function addressableTargetsOf(
  attempt: Attempt,
  attached_content_items: readonly PersistedContentItem[],
): readonly ResolvedContentTarget[] {
  const out: ResolvedContentTarget[] = [];
  for (const field_path of GROUNDING_ATTEMPT_FIELD_PATHS) {
    if (field_path === 'key_parameters') {
      for (const item of attempt.key_parameters) {
        out.push(
          resolvedOf(
            attempt.attempt_id,
            field_path,
            item,
            canonicalFieldKeyForAttemptField(field_path),
          ),
        );
      }
      continue;
    }
    const carrier = attempt[field_path];
    if (carrier.presence_state !== 'present') {
      continue;
    }
    out.push(
      resolvedOf(
        attempt.attempt_id,
        field_path,
        carrier.item,
        canonicalFieldKeyForAttemptField(field_path),
      ),
    );
  }
  for (const item of attached_content_items) {
    const field_path = attachedContentItemsPath(item.field_key);
    out.push(resolvedOf(attempt.attempt_id, field_path, item, item.field_key));
  }
  return out;
}

/** The `source_field_path` of one addressable target - the frozen, index-free encoding. */
export function sourceFieldPathOf(target: ResolvedContentTarget): SourceFieldPath {
  return formatSourceFieldPath(target.attempt_field_path, target.content_item_id);
}
