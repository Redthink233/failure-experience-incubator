/**
 * S01 ｜ `M9` the persisted forms: one `Hypothesis`, one generation batch and the DURABLE OPERATION
 *            ANCHOR.
 *
 * Contract / plan references:
 *   - §0.4 E.7/E.8 (`Markdown + JSON / sidecar metadata` = TECHNICAL DEFAULT; the physical schema is
 *     an IMPLEMENTATION PARAMETER);
 *   - `D-059` (Local Workspace Files, no required database);
 *   - §7 (V1 has no physical delete - AC-76), §12 item 20 / AC-122 (no version system);
 *   - §5.1 / §5.2 (`EvidenceRef` is stored INLINE with its owner; `archived_at_ref` was REMOVED and
 *     「来源已归档」is always derived from the target's CURRENT `archive_state`);
 *   - §8.6 rule 5 (`Hypothesis` = `hypotheses/<hypothesis_id>.md` + `.json`).
 *
 * 🔴 PHYSICAL LAYOUT (IMPLEMENTATION PARAMETER, the `M6` `retrievals/` and `M8` `insights/` precedent):
 *
 * ```
 * Workspace Root/
 *   hypotheses/
 *     <hypothesis_id>.json               <- the machine source of truth (incl. evidence_refs[])
 *     <hypothesis_id>.md                 <- human-readable body + stable front-matter
 *     batches/
 *       <path-safe batch_id>.json        <- the record of ONE explicit step ⑨ generation
 *     operations/
 *       <operation_key>.json             <- the durable RECOVERY ANCHOR of one operation (§36)
 * ```
 *
 *    The `hypotheses/` directory sits at the workspace root rather than under `projects/<id>/`: a
 *    `Hypothesis` belongs to the WORKSPACE, exactly like an `Insight` (§1.3 / `D-019` / `D-045`).
 * 🔴 IDENTITY TRAVELS INSIDE THE CONTENT (`hypothesis_id` in every file), so renaming or moving a file
 *    never breaks ID-based resolution (§3.2 / AC-137).
 * 🔴 `PSA-A-CORRECTION-M9-PATH-01`: the batch FILE NAME is the module's own reversible `~HH` codec
 *    applied to the logical `batch_id`, because a `:` (which `newHypothesisBatchId` really mints) is an
 *    illegal Windows file-name character. The logical `batch_id` itself is unchanged everywhere.
 * 🔴 NO DATABASE, NO VERSION FIELD, NO ARCHIVE SNAPSHOT AND NO CREDENTIAL may be written. Every
 *    document is passed through the shared forbidden-key guard before it is written and after it is
 *    read.
 * 🔴 NO DERIVED NUMBER IS STORED: `N_引用`, the ⑩ list and `evidence_overview` are computed on read
 *    from the stored reference set (§26 / §12 item 11).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import { toObjectId } from '../../domain/ids/object-id.js';
import type { DecisionState, Hypothesis, HypothesisEditableItems, HypothesisEditableSlot, HypothesisKind } from '../../domain/types/hypothesis.js';
import {
  DECISION_STATES,
  HYPOTHESIS_EDITABLE_SLOTS,
  HYPOTHESIS_KINDS,
  HYPOTHESIS_READ_ONLY_ITEMS,
  SOURCE_PARTITIONS,
  checkEditableItemSeparation,
} from '../../domain/types/hypothesis.js';
import type { EvidenceRef, RefRole } from '../../domain/types/evidence-ref.js';
import { REF_ROLES } from '../../domain/types/evidence-ref.js';
import type { InferenceContentItem } from '../../domain/types/source-type.js';
import { toEvidenceOwnerId } from '../../retrieval/grounding/identity.js';
import { parseContentItem } from '../../workspace/schema/attempt-record.js';
import { findForbiddenPersistedKeys } from '../../workspace/schema/forbidden-keys.js';
import { WorkspaceSchemaError } from '../../workspace/schema/schema-error.js';
import { WORKSPACE_SCHEMA_VERSION } from '../../workspace/schema/workspace-metadata.js';
import { findForbiddenNinthFieldKeys } from './structure.js';
import { encodeOperationIdToken, isHypothesisBatchId } from './identity.js';
import type {
  HypothesisGenerationBatch,
  HypothesisOperationAnchor,
  HypothesisRecord,
  ReasoningInputRef,
} from './types.js';
import { HYPOTHESIS_EXIT_ROUTES, REASONING_INPUT_KINDS } from './types.js';

export const HYPOTHESIS_OBJECT_TYPE = 'Hypothesis';
export const HYPOTHESIS_GENERATION_BATCH_OBJECT_TYPE = 'HypothesisGenerationBatch';
export const HYPOTHESIS_OPERATION_ANCHOR_OBJECT_TYPE = 'HypothesisOperationAnchor';

/* ------------------------------------------------------------------ *
 * 1. Paths
 * ------------------------------------------------------------------ */

export const HYPOTHESES_DIRECTORY = 'hypotheses';
export const HYPOTHESIS_BATCHES_DIRECTORY = 'hypotheses/batches';
export const HYPOTHESIS_OPERATIONS_DIRECTORY = 'hypotheses/operations';

const JSON_EXTENSION = '.json';
const MARKDOWN_EXTENSION = '.md';

/** Conventional path of a `Hypothesis` sidecar; convenience only, never identity. */
export function hypothesisSidecarPath(hypothesis_id: string): string {
  return `${HYPOTHESES_DIRECTORY}/${hypothesis_id}${JSON_EXTENSION}`;
}

/** Conventional path of a `Hypothesis` markdown body; convenience only, never identity. */
export function hypothesisMarkdownPath(hypothesis_id: string): string {
  return `${HYPOTHESES_DIRECTORY}/${hypothesis_id}${MARKDOWN_EXTENSION}`;
}

/**
 * Conventional path of a generation batch record.
 *
 * 🔴 `PSA-A-CORRECTION-M9-PATH-01`: `newHypothesisBatchId` mints
 *    `ATT_…:hypothesis-batch:<ULID>` - the `:` is a LEGAL logical-id character but an ILLEGAL Windows
 *    file-name character, so the verbatim interpolation could never be written on Windows (the SAME
 *    SHAPE as the repaired step ⑧ defect). The physical name is therefore the module's own EXISTING,
 *    REVERSIBLE `~HH` codec applied to the logical id: one codec, no second sanitising rule set, and
 *    `decode(encode(x)) = x`.
 * 🔴 WHAT DID NOT CHANGE: the `batch_id` VALUE everywhere (domain object, this document's own
 *    `batch_id` field, the operation anchor, `planned_batch`, every reference), the directory layout,
 *    the document schema, and the anchor path. Nothing is ever inferred FROM a file name: discovery
 *    reads the `batch_id` inside the document, so a renamed or moved batch still resolves
 *    (§3.2 rule 3 / AC-137).
 */
export function hypothesisBatchPath(batch_id: string): string {
  return `${HYPOTHESIS_BATCHES_DIRECTORY}/${encodeOperationIdToken(batch_id)}${JSON_EXTENSION}`;
}

/**
 * Conventional path of the durable operation anchor (§36).
 *
 * 🔴 `operation_key` arrives ALREADY encoded - `hypothesisOperationKey` applies the codec when it
 *    builds `<source_attempt_id>__<encoded operation_id>`. It is therefore NOT encoded again here:
 *    doing so would move every already-persisted anchor to a new path and orphan a pending recovery.
 */
export function hypothesisOperationAnchorPath(operation_key: string): string {
  return `${HYPOTHESIS_OPERATIONS_DIRECTORY}/${operation_key}${JSON_EXTENSION}`;
}

/* ------------------------------------------------------------------ *
 * 2. The forbidden-key allowance for the ONE colliding name
 * ------------------------------------------------------------------ */

/**
 * 🔴 THE ONE COLLISION, RESOLVED BY PATH.
 *
 * `FORBIDDEN_PERSISTED_KEYS` bans `role` as a cloud / account / team field, while the FROZEN
 * `EvidenceRef` carries a MANDATORY `role`. Renaming the field on disk would create a second field
 * vocabulary for one frozen type - exactly what §12 item 10 forbids - so the collision is resolved by
 * PATH: only `evidence_refs[i].role` is admitted, whether it sits on the document itself or inside a
 * planned record of the durable operation anchor. Every other occurrence of `role` (anywhere, at any
 * depth, including a stray `roles` list) is still refused by the shared guard.
 */
const FROZEN_EVIDENCE_ROLE_PATH = /(^|\.)evidence_refs\[\d+\]\.role$/;

/** The shared guard, minus the single path the frozen `EvidenceRef` shape legitimately occupies. */
export function findForbiddenHypothesisDocumentKeys(value: unknown): readonly string[] {
  return findForbiddenPersistedKeys(value).filter(
    (path) => !FROZEN_EVIDENCE_ROLE_PATH.test(path),
  );
}

function assertNoForbiddenKeys(payload: unknown, path: string): void {
  const forbidden = findForbiddenHypothesisDocumentKeys(payload);
  if (forbidden.length > 0) {
    throw new WorkspaceSchemaError(
      'FORBIDDEN_KEY',
      path,
      `Forbidden keys present: ${forbidden.join(', ')}.`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * 3. Reading helpers - strict, never repairing
 * ------------------------------------------------------------------ */

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path);
  }
  return value as Record<string, unknown>;
}

function requireString(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new WorkspaceSchemaError('MISSING_REQUIRED_FIELD', path, key);
  }
  return value;
}

/** A required text that must carry real content: a blank string is never 「显式缺失」 (§13 / H4). */
function requireNonBlankString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string {
  const value = requireString(record, key, path);
  if (value.trim().length === 0) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `${key} must not be blank: 「显式缺失」 is expressed by omission, never by an empty string (§13).`,
    );
  }
  return value;
}

function requireEnumValue<T extends string>(
  record: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  path: string,
): T {
  const value = record[key];
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `${key} must be one of ${allowed.join(' | ')} (received ${JSON.stringify(value)}).`,
    );
  }
  return value as T;
}

function requireOptionalString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string | null {
  const value = record[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, `${key} must be a string or null.`);
  }
  return value;
}

function requireBoolean(record: Record<string, unknown>, key: string, path: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, `${key} must be a boolean.`);
  }
  return value;
}

function requireHypothesisObjectId(value: string, path: string, key: string): ObjectId<'HYP'> {
  const id = toObjectId(value, 'hypothesis');
  if (id === null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `${key} must be a HYP_ prefixed object id (received ${JSON.stringify(value)}).`,
    );
  }
  return id;
}

function requireAttemptObjectId(value: string, path: string, key: string): ObjectId<'ATT'> {
  const id = toObjectId(value, 'attempt');
  if (id === null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `${key} must be an ATT_ prefixed object id (received ${JSON.stringify(value)}).`,
    );
  }
  return id;
}

/* ------------------------------------------------------------------ *
 * 4. `EvidenceRef` (inline with its owner)
 * ------------------------------------------------------------------ */

function parseEvidenceRef(value: unknown, owner_id: ObjectId<'HYP'>, path: string): EvidenceRef {
  const record = asRecord(value, path);
  const role = requireEnumValue(record, 'role', REF_ROLES, path) as RefRole;
  const target_id = requireAttemptObjectId(
    requireString(record, 'target_id', path),
    path,
    'target_id',
  );
  const declared_owner = requireString(record, 'owner_id', path);
  const parsed_owner = toEvidenceOwnerId(declared_owner);
  if (parsed_owner === null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'owner_id must be an INS_ / HYP_ id - a reference is owned by an Insight or a Hypothesis (§5.1).',
    );
  }
  /*
   * 🔴 A `Hypothesis`'s references belong to THAT hypothesis (§9). A document whose reference names
   *    another owner would silently corrupt two owners' `N_引用`, so it is refused.
   */
  if (parsed_owner !== owner_id) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `EvidenceRef.owner_id must be the owning Hypothesis "${owner_id}" (received ${JSON.stringify(declared_owner)}).`,
    );
  }
  return {
    evidence_ref_id: requireString(record, 'evidence_ref_id', path),
    target_id,
    source_field_path: requireString(record, 'source_field_path', path),
    role,
    owner_id: parsed_owner,
  };
}

/* ------------------------------------------------------------------ *
 * 5. ⑥⑦⑧ columns
 * ------------------------------------------------------------------ */

function parseAiInferenceItem(value: unknown, path: string): InferenceContentItem {
  const item = parseContentItem(value, path);
  if (item.source_type !== 'Inference') {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'The AI column of ⑥⑦⑧ may only hold Inference items (§4.2 rule 1): an AI proposal is never relabelled.',
    );
  }
  return item;
}

function parseEditableItems(value: unknown, path: string): HypothesisEditableItems {
  const record = asRecord(value, path);
  const raw_user = record['user_facts'];
  const raw_ai = record['ai_inferences'];
  if (!Array.isArray(raw_user) || !Array.isArray(raw_ai)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'editable_items must carry both a user_facts array and an ai_inferences array.',
    );
  }
  const user_facts = raw_user.map((entry, index) => {
    const entryPath = `${path}.user_facts[${index}]`;
    const entryRecord = asRecord(entry, entryPath);
    const slot = requireEnumValue(
      entryRecord,
      'slot',
      HYPOTHESIS_EDITABLE_SLOTS,
      entryPath,
    ) as HypothesisEditableSlot;
    const item = parseContentItem(entryRecord['item'], `${entryPath}.item`);
    if (item.source_type !== 'Fact') {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        `${entryPath}.item`,
        'A user-provided ⑥⑦⑧ entry is always a Fact item; the user side never carries an Inference (§8.6 rule 2).',
      );
    }
    return { slot, item };
  });
  const ai_inferences = raw_ai.map((entry, index) => {
    const entryPath = `${path}.ai_inferences[${index}]`;
    const entryRecord = asRecord(entry, entryPath);
    const slot = requireEnumValue(
      entryRecord,
      'slot',
      HYPOTHESIS_EDITABLE_SLOTS,
      entryPath,
    ) as HypothesisEditableSlot;
    return { slot, item: parseAiInferenceItem(entryRecord['item'], `${entryPath}.item`) };
  });
  const items: HypothesisEditableItems = { user_facts, ai_inferences };
  if (!checkEditableItemSeparation(items)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'The two columns are not separated: user entries must all be Fact and AI entries all Inference (§8.6 rule 3).',
    );
  }
  const ids = new Set([
    ...user_facts.map((entry) => entry.item.content_item_id),
    ...ai_inferences.map((entry) => entry.item.content_item_id),
  ]);
  if (ids.size !== user_facts.length + ai_inferences.length) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'Two ⑥⑦⑧ entries share a content_item_id; item identity is unique, so a repetition is a corruption.',
    );
  }
  return items;
}

/* ------------------------------------------------------------------ *
 * 6. Reasoning inputs
 * ------------------------------------------------------------------ */

function parseReasoningInputRef(value: unknown, path: string): ReasoningInputRef {
  const record = asRecord(value, path);
  const kind = requireEnumValue(record, 'kind', REASONING_INPUT_KINDS, path) as ReasoningInputRef['kind'];
  const reasoning_only = record['reasoning_only'];
  if (reasoning_only !== true) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'reasoning_only must be true: a reasoning input is structurally separated from history evidence (§24).',
    );
  }
  const declared_attempt = requireOptionalString(record, 'source_attempt_id', path);
  return {
    kind,
    ref_id: requireString(record, 'ref_id', path),
    label: requireString(record, 'label', path),
    source_attempt_id:
      declared_attempt === null
        ? null
        : requireAttemptObjectId(declared_attempt, path, 'source_attempt_id'),
    reasoning_only: true,
  };
}

/* ------------------------------------------------------------------ *
 * 7. The `Hypothesis` document
 * ------------------------------------------------------------------ */

/**
 * The stored document.
 *
 * 🔴 `hypothesis` fields are spread VERBATIM; the wrapper adds only the `M9`-local, non-frozen
 *    material (see `HypothesisRecord`) plus the two technical document markers.
 */
export interface HypothesisDocument extends Hypothesis {
  readonly object_type: typeof HYPOTHESIS_OBJECT_TYPE;
  /** Technical compatibility marker only - never a product version (AC-122). */
  readonly schema_version: string;
  /** ⑤ source B: AI keep recommendations - always `Inference`, never merged into ⑤ (§15). */
  readonly kept_condition_recommendations: readonly InferenceContentItem[];
  readonly reasoning_input_refs: readonly ReasoningInputRef[];
  /** The whole-partition annotation of a `Model Suggestion`; `null` for a grounded hypothesis. */
  readonly model_prior_notice: string | null;
}

/**
 * The serialisable form of one stored record.
 *
 * 🔴 Extracted so the DURABLE OPERATION ANCHOR can hold the identical document shape: a replay must
 *    re-write exactly what the plan promised, byte for byte (§36).
 */
export function hypothesisDocumentOf(record: HypothesisRecord): HypothesisDocument {
  const { hypothesis } = record;
  return {
    object_type: HYPOTHESIS_OBJECT_TYPE,
    schema_version: WORKSPACE_SCHEMA_VERSION,
    ...hypothesis,
    kept_condition_recommendations: record.kept_condition_recommendations,
    reasoning_input_refs: record.reasoning_input_refs,
    model_prior_notice: record.model_prior_notice,
  };
}

export function serializeHypothesis(record: HypothesisRecord): string {
  const { hypothesis } = record;
  const payload = hypothesisDocumentOf(record);
  assertNoForbiddenKeys(payload, hypothesis.hypothesis_id);

  /*
   * 🔴 NO NINTH ITEM. A document carrying a 9th top-level field key (a cost field, an
   *    「已尝试失败列表」, a score …) is refused instead of being read as an acceptable 8-item record
   *    (§12 / H7).
   */
  const ninth = [...HYPOTHESIS_READ_ONLY_ITEMS, ...HYPOTHESIS_EDITABLE_SLOTS].length;
  const forbiddenNinth = findForbiddenNinthFieldKeys(payload);
  if (forbiddenNinth.length > 0) {
    throw new WorkspaceSchemaError(
      'FORBIDDEN_KEY',
      hypothesis.hypothesis_id,
      `Forbidden 9th-item keys present: ${forbiddenNinth.join(', ')} (the structure has exactly ${String(ninth)} items).`,
    );
  }
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Reads one `Hypothesis` document.
 *
 * 🔴 Never repairs and never guesses: a missing field, a `candidate` decision state, a blank required
 *    item, a reference owned by another object or an identity that names a different hypothesis is an
 *    explicit schema error.
 */
export function parseHypothesis(json: string, sourcePath = ''): HypothesisRecord {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new WorkspaceSchemaError('INVALID_JSON', sourcePath);
  }
  const record = asRecord(raw, sourcePath);
  assertNoForbiddenKeys(record, sourcePath);

  const object_type = record['object_type'];
  if (object_type !== HYPOTHESIS_OBJECT_TYPE) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      `object_type must be "${HYPOTHESIS_OBJECT_TYPE}".`,
    );
  }

  const forbiddenNinth = findForbiddenNinthFieldKeys(record);
  if (forbiddenNinth.length > 0) {
    throw new WorkspaceSchemaError(
      'FORBIDDEN_KEY',
      sourcePath,
      `Forbidden 9th-item keys present: ${forbiddenNinth.join(', ')}.`,
    );
  }

  const hypothesis_id = requireHypothesisObjectId(
    requireString(record, 'hypothesis_id', sourcePath),
    sourcePath,
    'hypothesis_id',
  );
  const attempt_id = requireAttemptObjectId(
    requireString(record, 'attempt_id', sourcePath),
    sourcePath,
    'attempt_id',
  );
  const kind = requireEnumValue(record, 'kind', HYPOTHESIS_KINDS, sourcePath) as HypothesisKind;
  /*
   * 🔴 `candidate` is not a member of the decision vocabulary, so a document carrying it is refused
   *    rather than silently mapped onto something else (§2.3 / D-049).
   */
  const decision_state = requireEnumValue(
    record,
    'decision_state',
    DECISION_STATES,
    sourcePath,
  ) as DecisionState;
  const raw_saved = record['saved'];
  const saved: boolean | null =
    raw_saved === undefined || raw_saved === null ? null : requireBoolean(record, 'saved', sourcePath);
  if (kind === 'grounded' && saved !== null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'A History-grounded Hypothesis has no save slot: saved must be null (§2.3 / D-042).',
    );
  }
  if (kind === 'model' && saved === null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'A Model Suggestion always carries a save slot value (true or false) - null is not a legal value for it (§8.4).',
    );
  }

  const generation_batch = requireString(record, 'generation_batch', sourcePath);
  const created_at = requireString(record, 'created_at', sourcePath);
  const updated_at = requireString(record, 'updated_at', sourcePath);

  const raw_core = asRecord(record['core'], `${sourcePath}.core`);
  const raw_refs = raw_core['referenced_attempt_ids'];
  if (!Array.isArray(raw_refs)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      `${sourcePath}.core`,
      'referenced_attempt_ids must be an array (③ is the reference list, §9).',
    );
  }
  const referenced_attempt_ids = raw_refs.map((entry, index) => {
    if (typeof entry !== 'string') {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        `${sourcePath}.core.referenced_attempt_ids[${index}]`,
      );
    }
    return requireAttemptObjectId(
      entry,
      `${sourcePath}.core.referenced_attempt_ids[${index}]`,
      'referenced_attempt_ids',
    );
  });
  const raw_kept = raw_core['kept_conditions'];
  if (!Array.isArray(raw_kept)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      `${sourcePath}.core`,
      'kept_conditions must be an array (an empty array is the explicit 「当前未提供」 form).',
    );
  }
  const kept_conditions = raw_kept.map((entry, index) => {
    const entryPath = `${sourcePath}.core.kept_conditions[${index}]`;
    const entryRecord = asRecord(entry, entryPath);
    return {
      attempt_id: requireAttemptObjectId(
        requireString(entryRecord, 'attempt_id', entryPath),
        entryPath,
        'attempt_id',
      ),
      source_field_path: requireString(entryRecord, 'source_field_path', entryPath),
    };
  });

  const core = {
    hypothesis_statement: requireNonBlankString(raw_core, 'hypothesis_statement', `${sourcePath}.core`),
    rationale: requireNonBlankString(raw_core, 'rationale', `${sourcePath}.core`),
    referenced_attempt_ids,
    next_change: requireNonBlankString(raw_core, 'next_change', `${sourcePath}.core`),
    kept_conditions,
  };

  const editable_items = parseEditableItems(
    record['editable_items'],
    `${sourcePath}.editable_items`,
  );

  const raw_evidence = record['evidence_refs'];
  if (!Array.isArray(raw_evidence)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'evidence_refs must be an array (an empty array is legal for a Model Suggestion only).',
    );
  }
  const evidence_refs = raw_evidence.map((entry, index) =>
    parseEvidenceRef(entry, hypothesis_id, `${sourcePath}.evidence_refs[${index}]`),
  );
  const ref_ids = new Set(evidence_refs.map((ref) => ref.evidence_ref_id));
  if (ref_ids.size !== evidence_refs.length) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'Two references share an evidence_ref_id; reference identity is globally unique (contract §3.2).',
    );
  }

  const raw_partitions = record['source_partitions'];
  if (!Array.isArray(raw_partitions) || raw_partitions.length === 0) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'source_partitions must be a non-empty array of the two known partitions.',
    );
  }
  const source_partitions = raw_partitions.map((entry, index) =>
    requireEnumValue(
      { value: entry },
      'value',
      SOURCE_PARTITIONS,
      `${sourcePath}.source_partitions[${index}]`,
    ),
  );
  if (new Set(source_partitions).size !== source_partitions.length) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'source_partitions repeats a partition; the two partitions are a SET, never a list with duplicates.',
    );
  }

  /*
   * 🔴 The object boundary, enforced at the persistence boundary as well: a History-grounded
   *    Hypothesis always cites at least one historical record, and a Model Suggestion never does.
   */
  if (kind === 'grounded') {
    if (evidence_refs.length === 0 || referenced_attempt_ids.length === 0) {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        sourcePath,
        'A History-grounded Hypothesis must cite at least one historical record (③ is required, §8.1 / §9).',
      );
    }
  }
  if (kind === 'model') {
    if (evidence_refs.length > 0 || referenced_attempt_ids.length > 0) {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        sourcePath,
        'A Model Suggestion never cites historical evidence: its EvidenceRef[] is empty and it never becomes a grounding source (§8.4 / D-042).',
      );
    }
  }

  const raw_recommendations = record['kept_condition_recommendations'];
  if (!Array.isArray(raw_recommendations)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'kept_condition_recommendations must be an array (empty is legal).',
    );
  }
  const kept_condition_recommendations = raw_recommendations.map((entry, index) =>
    parseAiInferenceItem(entry, `${sourcePath}.kept_condition_recommendations[${index}]`),
  );

  const raw_reasoning = record['reasoning_input_refs'];
  if (!Array.isArray(raw_reasoning)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'reasoning_input_refs must be an array (empty is legal).',
    );
  }
  const reasoning_input_refs = raw_reasoning.map((entry, index) =>
    parseReasoningInputRef(entry, `${sourcePath}.reasoning_input_refs[${index}]`),
  );

  const model_prior_notice = requireOptionalString(record, 'model_prior_notice', sourcePath);
  if (kind === 'model' && (model_prior_notice === null || model_prior_notice.trim().length === 0)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'A Model Suggestion always carries its whole-partition annotation: 「非你的历史经验依据」(§8.2 rule 3 / AC-69).',
    );
  }
  if (kind === 'grounded' && model_prior_notice !== null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'model_prior_notice belongs to a Model Suggestion only.',
    );
  }

  return {
    hypothesis: {
      hypothesis_id,
      attempt_id,
      kind,
      decision_state,
      saved,
      core,
      editable_items,
      evidence_refs,
      source_partitions,
      generation_batch,
      created_at,
      updated_at,
    },
    kept_condition_recommendations,
    reasoning_input_refs,
    model_prior_notice,
  };
}

/* ------------------------------------------------------------------ *
 * 8. Markdown body
 * ------------------------------------------------------------------ */

const FRONT_MATTER_DELIMITER = '---';

export interface HypothesisMarkdownFrontMatter {
  readonly object_type: string;
  readonly schema_version: string;
  readonly hypothesis_id: ObjectId<'HYP'>;
  readonly attempt_id: ObjectId<'ATT'>;
  readonly kind: HypothesisKind;
  readonly decision_state: DecisionState;
  readonly generation_batch: string;
  readonly created_at: string;
  readonly updated_at: string;
}

const KIND_LABELS: Readonly<Record<HypothesisKind, string>> = {
  grounded: '有历史依据的待验证假设（grounded）',
  model: '模型通用建议（model）',
};

const DECISION_LABELS: Readonly<Record<DecisionState, string>> = {
  undecided: '未裁决（undecided）',
  accepted: '已认可为下一步验证方向（accepted）',
  rejected: '已拒绝该方向（rejected）',
};

function section(title: string, body: string | null): string {
  return `## ${title}\n\n${body === null || body.trim().length === 0 ? '（当前未提供）' : body}\n`;
}

export function serializeHypothesisMarkdown(record: HypothesisRecord): string {
  const { hypothesis } = record;
  const frontMatter: HypothesisMarkdownFrontMatter = {
    object_type: HYPOTHESIS_OBJECT_TYPE,
    schema_version: WORKSPACE_SCHEMA_VERSION,
    hypothesis_id: hypothesis.hypothesis_id,
    attempt_id: hypothesis.attempt_id,
    kind: hypothesis.kind,
    decision_state: hypothesis.decision_state,
    generation_batch: hypothesis.generation_batch,
    created_at: hypothesis.created_at,
    updated_at: hypothesis.updated_at,
  };
  const frontMatterLines = [
    FRONT_MATTER_DELIMITER,
    `object_type: ${frontMatter.object_type}`,
    `schema_version: "${frontMatter.schema_version}"`,
    `hypothesis_id: ${frontMatter.hypothesis_id}`,
    `attempt_id: ${frontMatter.attempt_id}`,
    `kind: ${frontMatter.kind}`,
    `decision_state: ${frontMatter.decision_state}`,
    `generation_batch: ${frontMatter.generation_batch}`,
    `created_at: ${frontMatter.created_at}`,
    `updated_at: ${frontMatter.updated_at}`,
    FRONT_MATTER_DELIMITER,
  ];

  const refs =
    hypothesis.evidence_refs.length === 0
      ? '（当前没有引用任何历史内容）'
      : hypothesis.evidence_refs
          .map(
            (ref) =>
              `- [${ref.role}] ${ref.target_id} :: ${ref.source_field_path}（evidence_ref_id = ${ref.evidence_ref_id}）`,
          )
          .join('\n');

  const kept =
    hypothesis.core.kept_conditions.length === 0
      ? null
      : hypothesis.core.kept_conditions
          .map((ref) => `- ${ref.attempt_id} :: ${ref.source_field_path}`)
          .join('\n');

  const recommendations =
    record.kept_condition_recommendations.length === 0
      ? null
      : record.kept_condition_recommendations
          .map((item) => `- （AI 建议，推断，非用户事实）${item.value}`)
          .join('\n');

  const reasoning =
    record.reasoning_input_refs.length === 0
      ? null
      : record.reasoning_input_refs
          .map((ref) => `- [${ref.kind}] ${ref.label}（${ref.ref_id}）`)
          .join('\n');

  const editableLines = HYPOTHESIS_EDITABLE_SLOTS.map((slot) => {
    const user = hypothesis.editable_items.user_facts.filter((entry) => entry.slot === slot);
    const ai = hypothesis.editable_items.ai_inferences.filter((entry) => entry.slot === slot);
    const userText =
      user.length === 0
        ? '（用户未提供）'
        : user.map((entry) => `${entry.item.value}（用户 Fact）`).join('；');
    const aiText =
      ai.length === 0
        ? '（AI 未提出）'
        : ai
            .map((entry) => {
              const item = entry.item;
              const state =
                item.confirmation_class === 'decision' ? item.decision_state : 'display';
              return `${item.value}（AI 推断，decision_state = ${state}）`;
            })
            .join('；');
    return `- ${slot}\n    · 用户：${userText}\n    · AI：${aiText}`;
  }).join('\n');

  const sections = [
    section('① 待验证假设（只读）', hypothesis.core.hypothesis_statement),
    section('② 假设依据（只读）', hypothesis.core.rationale),
    section(
      '③ 引用的历史记录（只读；与第 ⑩ 步及 N_引用 共用同一集合）',
      hypothesis.core.referenced_attempt_ids.length === 0
        ? null
        : hypothesis.core.referenced_attempt_ids.map((id) => `- ${id}`).join('\n'),
    ),
    section('引用清单（EvidenceRef）', refs),
    section('④ 下一轮改变什么（只读）', hypothesis.core.next_change),
    section('⑤ 哪些条件保持不变（只读，引用历史 Fact / Extraction）', kept),
    section('⑤ 来源 B：AI 的「下一轮保持 X」建议（Inference，不写入 ⑤）', recommendations),
    section('⑥⑦⑧（用户 Fact 与 AI Inference 分列）', editableLines),
    section('第 ⑩ 步推理输入（不是历史证据）', reasoning),
    section(
      '状态',
      [
        `- kind：${KIND_LABELS[hypothesis.kind]}`,
        `- 裁决位：${DECISION_LABELS[hypothesis.decision_state]}`,
        `- 保存位：${
          hypothesis.saved === null ? '（不适用）' : hypothesis.saved ? '已保留内容' : '未保留'
        }`,
        `- 生成批次：${hypothesis.generation_batch}`,
        `- 来源分区：${hypothesis.source_partitions.join(' + ')}`,
        ...(record.model_prior_notice === null ? [] : [`- 整体标注：${record.model_prior_notice}`]),
      ].join('\n'),
    ),
  ];

  return `${frontMatterLines.join('\n')}\n\n# ${hypothesis.hypothesis_id}\n\n${sections.join('\n')}`;
}

/**
 * Reads the front-matter of a `Hypothesis` markdown file, for CONTENT-based ID resolution.
 * Returns `null` when the file is not a `Hypothesis` markdown document.
 */
export function parseHypothesisMarkdownFrontMatter(
  markdown: string,
): { readonly hypothesis_id: ObjectId<'HYP'>; readonly attempt_id: ObjectId<'ATT'> } | null {
  const lines = markdown.split('\n');
  if (lines[0]?.trim() !== FRONT_MATTER_DELIMITER) {
    return null;
  }
  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === FRONT_MATTER_DELIMITER,
  );
  if (closingIndex < 0) {
    return null;
  }
  const fields = new Map<string, string>();
  for (const line of lines.slice(1, closingIndex)) {
    const separator = line.indexOf(':');
    if (separator <= 0) {
      continue;
    }
    fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  if (fields.get('object_type') !== HYPOTHESIS_OBJECT_TYPE) {
    return null;
  }
  const hypothesisId = toObjectId(fields.get('hypothesis_id') ?? '', 'hypothesis');
  const attemptId = toObjectId(fields.get('attempt_id') ?? '', 'attempt');
  if (hypothesisId === null || attemptId === null) {
    return null;
  }
  return { hypothesis_id: hypothesisId, attempt_id: attemptId };
}

/* ------------------------------------------------------------------ *
 * 9. Generation batch record
 * ------------------------------------------------------------------ */

export interface HypothesisGenerationBatchDocument extends HypothesisGenerationBatch {
  readonly object_type: typeof HYPOTHESIS_GENERATION_BATCH_OBJECT_TYPE;
  readonly schema_version: string;
}

function parseHypothesisIds(value: unknown, path: string): readonly ObjectId<'HYP'>[] {
  if (!Array.isArray(value)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, 'must be an array.');
  }
  return value.map((entry, index) => {
    if (typeof entry !== 'string') {
      throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', `${path}[${index}]`);
    }
    return requireHypothesisObjectId(entry, `${path}[${index}]`, path);
  });
}

/** The serialisable form of one generation batch: shared by the batch file and the anchor. */
export function hypothesisBatchDocumentOf(
  batch: HypothesisGenerationBatch,
): HypothesisGenerationBatchDocument {
  return {
    object_type: HYPOTHESIS_GENERATION_BATCH_OBJECT_TYPE,
    schema_version: WORKSPACE_SCHEMA_VERSION,
    batch_id: batch.batch_id,
    source_attempt_id: batch.source_attempt_id,
    operation_id: batch.operation_id,
    hypothesis_ids: batch.hypothesis_ids,
    model_suggestion_ids: batch.model_suggestion_ids,
    exit_route: batch.exit_route,
    absence_statement: batch.absence_statement,
    created_at: batch.created_at,
  };
}

export function serializeHypothesisBatch(batch: HypothesisGenerationBatch): string {
  const payload = hypothesisBatchDocumentOf(batch);
  assertNoForbiddenKeys(payload, batch.batch_id);
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseHypothesisBatch(json: string, sourcePath = ''): HypothesisGenerationBatch {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new WorkspaceSchemaError('INVALID_JSON', sourcePath);
  }
  const record = asRecord(raw, sourcePath);
  assertNoForbiddenKeys(record, sourcePath);
  if (record['object_type'] !== HYPOTHESIS_GENERATION_BATCH_OBJECT_TYPE) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      `object_type must be "${HYPOTHESIS_GENERATION_BATCH_OBJECT_TYPE}".`,
    );
  }
  const hypothesis_ids = parseHypothesisIds(record['hypothesis_ids'], 'hypothesis_ids');
  const model_suggestion_ids = parseHypothesisIds(
    record['model_suggestion_ids'],
    'model_suggestion_ids',
  );
  const raw_exit = record['exit_route'];
  const exit_route =
    raw_exit === undefined || raw_exit === null
      ? null
      : requireEnumValue(record, 'exit_route', HYPOTHESIS_EXIT_ROUTES, sourcePath);
  const absence_statement = requireOptionalString(record, 'absence_statement', sourcePath);

  /*
   * 🔴 A batch either produced grounded hypotheses or explains why it produced none - never neither
   *    and never both. A document that breaks this makes "0 grounded" indistinguishable from "the
   *    record is incomplete", so it is refused instead of being silently repaired (§9.2 / D-047).
   */
  const produced_grounded = hypothesis_ids.length > 0;
  if (produced_grounded) {
    if (exit_route !== null) {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        sourcePath,
        'A batch that produced grounded hypotheses must not carry an exit route (§9.2).',
      );
    }
  } else if (exit_route === null || absence_statement === null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'A zero-grounded batch must carry an explicit exit route and a non-blank absence statement (D-047).',
    );
  }

  const batch_id = requireString(record, 'batch_id', sourcePath);
  const source_attempt_id = requireAttemptObjectId(
    requireString(record, 'source_attempt_id', sourcePath),
    sourcePath,
    'source_attempt_id',
  );
  if (!isHypothesisBatchId(batch_id, source_attempt_id)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'batch_id must be the generated "<source_attempt_id>:hypothesis-batch:<ULID>" identity of this record (§35).',
    );
  }

  return {
    batch_id,
    source_attempt_id,
    operation_id: requireString(record, 'operation_id', sourcePath),
    hypothesis_ids,
    model_suggestion_ids,
    exit_route: exit_route as HypothesisGenerationBatch['exit_route'],
    absence_statement: produced_grounded
      ? null
      : requireNonBlankString(record, 'absence_statement', sourcePath),
    created_at: requireString(record, 'created_at', sourcePath),
  };
}

/* ------------------------------------------------------------------ *
 * 10. The durable operation anchor (§36)
 * ------------------------------------------------------------------ */

const OPERATION_ANCHOR_STATUSES: readonly string[] = ['in_progress', 'complete'];

export interface HypothesisOperationAnchorDocument
  extends Omit<HypothesisOperationAnchor, 'planned_records' | 'planned_batch'> {
  readonly object_type: typeof HYPOTHESIS_OPERATION_ANCHOR_OBJECT_TYPE;
  readonly schema_version: string;
  /** The plan, in the SAME document shape the hypothesis files use. */
  readonly planned_records: readonly HypothesisDocument[];
  readonly planned_batch: HypothesisGenerationBatchDocument;
}

/**
 * Serialises one anchor.
 *
 * 🔴 The WHOLE materialised plan travels in ONE document and is written in ONE storage write. That is
 *    the recovery boundary: a retry with the same `operation_id` re-writes exactly the planned
 *    identities instead of generating new ones (§36).
 */
export function serializeHypothesisOperationAnchor(anchor: HypothesisOperationAnchor): string {
  const payload: HypothesisOperationAnchorDocument = {
    object_type: HYPOTHESIS_OPERATION_ANCHOR_OBJECT_TYPE,
    schema_version: WORKSPACE_SCHEMA_VERSION,
    operation_key: anchor.operation_key,
    operation_id: anchor.operation_id,
    source_attempt_id: anchor.source_attempt_id,
    batch_id: anchor.batch_id,
    status: anchor.status,
    planned_records: anchor.planned_records.map(hypothesisDocumentOf),
    planned_batch: hypothesisBatchDocumentOf(anchor.planned_batch),
    created_at: anchor.created_at,
  };
  assertNoForbiddenKeys(payload, anchor.operation_key);
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseHypothesisOperationAnchor(
  json: string,
  sourcePath = '',
): HypothesisOperationAnchor {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new WorkspaceSchemaError('INVALID_JSON', sourcePath);
  }
  const record = asRecord(raw, sourcePath);
  assertNoForbiddenKeys(record, sourcePath);
  if (record['object_type'] !== HYPOTHESIS_OPERATION_ANCHOR_OBJECT_TYPE) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      `object_type must be "${HYPOTHESIS_OPERATION_ANCHOR_OBJECT_TYPE}".`,
    );
  }
  const status = requireEnumValue(record, 'status', OPERATION_ANCHOR_STATUSES, sourcePath);
  const raw_planned = record['planned_records'];
  if (!Array.isArray(raw_planned)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'planned_records must be an array (the complete plan of the operation).',
    );
  }
  const planned_records = raw_planned.map((entry, index) =>
    parseHypothesis(JSON.stringify(entry), `${sourcePath}.planned_records[${index}]`),
  );
  const planned_batch = parseHypothesisBatch(
    JSON.stringify(record['planned_batch']),
    `${sourcePath}.planned_batch`,
  );
  const source_attempt_id = requireAttemptObjectId(
    requireString(record, 'source_attempt_id', sourcePath),
    sourcePath,
    'source_attempt_id',
  );
  const batch_id = requireString(record, 'batch_id', sourcePath);
  if (batch_id !== planned_batch.batch_id) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'The anchor batch_id and the planned batch disagree; a recovery would replay an inconsistent plan.',
    );
  }
  for (const planned of planned_records) {
    const id = planned.hypothesis.hypothesis_id;
    if (
      !planned_batch.model_suggestion_ids.includes(id) &&
      !planned_batch.hypothesis_ids.includes(id)
    ) {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        sourcePath,
        `The plan holds "${id}", which the planned batch does not list.`,
      );
    }
  }
  return {
    operation_key: requireString(record, 'operation_key', sourcePath),
    operation_id: requireString(record, 'operation_id', sourcePath),
    source_attempt_id,
    batch_id,
    status: status as HypothesisOperationAnchor['status'],
    planned_records,
    planned_batch,
    created_at: requireString(record, 'created_at', sourcePath),
  };
}
