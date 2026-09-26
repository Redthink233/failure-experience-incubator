/**
 * S01 ｜ `M8` the persisted form of an `Insight`, its generation batch and its state events.
 *
 * Contract / plan references:
 *   - §0.4 E.7/E.8 (`Markdown + JSON / sidecar metadata` = TECHNICAL DEFAULT; the physical schema is
 *     an IMPLEMENTATION PARAMETER);
 *   - `D-059` (Local Workspace Files, no required database);
 *   - §7 (V1 has no physical delete - AC-76), §12 item 20 / AC-122 (no version system);
 *   - §5.1 / §5.2 (`EvidenceRef` is stored INLINE with its owner; `archived_at_ref` was REMOVED and
 *     「来源已归档」 is always derived from the target's CURRENT `archive_state`);
 *   - Gate C Plan §J.1 row 3 (`insights/<insight_id>.md` + `.json`) and row 5 (`EvidenceRef` inline).
 *
 * 🔴 PHYSICAL LAYOUT (IMPLEMENTATION PARAMETER, the `M6` `retrievals/` precedent):
 *
 * ```
 * Workspace Root/
 *   insights/
 *     <insight_id>.json                 <- the machine source of truth (incl. evidence_refs[])
 *     <insight_id>.md                   <- human-readable body + stable front-matter
 *     batches/
 *       <encoded batch_id>.json          <- the record of ONE explicit step ⑧ generation
 *   events/
 *     insight-state-events.jsonl        <- product-layer behaviour trace (§11.3)
 * ```
 *
 *    The `insights/` directory is at the workspace root rather than under `projects/<id>/`: an
 *    `Insight` belongs to the WORKSPACE, not to a logical `Project` (a `Project` is optional and is
 *    never a retrieval filter - §1.3 / D-019 / D-045), and its source `Attempt` may legitimately sit
 *    in the internal unassigned bucket. Placing it under a project would therefore have to invent a
 *    project the user never created. This mirrors `M6`'s `retrievals/`.
 * 🔴 IDENTITY TRAVELS INSIDE THE CONTENT (`insight_id` in both files), so renaming or moving a file
 *    never breaks ID-based resolution (§3.2 / AC-137).
 * 🔴 `PSA-A-CORRECTION-M8-PATH-01` - THE PHYSICAL BATCH NAME IS ENCODED; THE LOGICAL ID IS NOT.
 *    A batch id is minted as `ATT_…:insight-batch:<ULID body>`, and `:` is a legal LOGICAL character
 *    but an ILLEGAL Windows file-name character (`/ \ : * ? " < > |`). Embedding the id verbatim made
 *    the step ⑧ batch write impossible on Windows: the interrupted PSA-A run left `insights/batches/`
 *    EMPTY while the operation anchor stayed `in_progress`, so step ⑧ could never become `done`. The
 *    file name is now the module's existing REVERSIBLE `~HH` codec (`encodePathSafeToken`) applied to
 *    the id - one codec, no second sanitising rule set, and `decode(encode(x)) = x`.
 *    🔴 WHAT DID NOT CHANGE: the `batch_id` VALUE anywhere (domain object, this document's own
 *    `batch_id` field, the operation anchor, `planned_batch`, references), the directory layout, the
 *    document schema, and the anchor path - `insightOperationAnchorPath` receives an ALREADY encoded
 *    `operation_key`, so encoding it again would move every existing anchor and break a pending
 *    recovery. Nothing is ever inferred FROM a file name: discovery reads the `batch_id` inside the
 *    document, so a renamed or moved batch still resolves (§3.2 rule 3 / AC-137).
 * 🔴 NO DATABASE, NO VERSION FIELD, NO ARCHIVE SNAPSHOT AND NO CREDENTIAL may be written. The
 *    documents are passed through the shared forbidden-key guard before they are written and after
 *    they are read.
 * 🔴 `PSA-A-CORRECTION-M8-RECOVERY-02` - A REPLAY COMPARES IMMUTABLE GENESIS ONLY. `state` and
 *    `updated_at` are the ONE pair of fields a legitimate USER decision moves between an interrupted
 *    step ⑧ write and its retry, so they are excluded from {@link sameInsightGenesis}. Everything
 *    else - identity, source provenance, the generation/batch association, the generation-time
 *    content, the `E1`-`E4` presentation and the evidence references - stays genesis and still fails
 *    closed when it differs.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import { toObjectId } from '../../domain/ids/object-id.js';
import type { EvidenceRef, RefRole } from '../../domain/types/evidence-ref.js';
import { REF_ROLES } from '../../domain/types/evidence-ref.js';
import { toEvidenceOwnerId } from '../../retrieval/grounding/identity.js';
import type { GateCheckResult, GateId, GateMissingItem } from '../../domain/types/gates.js';
import { INSIGHT_ELIGIBILITY_GATES } from '../../domain/types/gates.js';
import type {
  Insight,
  InsightState,
  InsightStateEvent,
  InsightStateEventTrigger,
} from '../../domain/types/insight.js';
import {
  INSIGHT_STATES,
  INSIGHT_STATE_EVENT_TRIGGERS,
} from '../../domain/types/insight.js';
import type { DisplayInferenceContentItem } from '../../domain/types/source-type.js';
import { parseContentItem } from '../../workspace/schema/attempt-record.js';
import { findForbiddenPersistedKeys } from '../../workspace/schema/forbidden-keys.js';
import { WorkspaceSchemaError } from '../../workspace/schema/schema-error.js';
import { WORKSPACE_SCHEMA_VERSION } from '../../workspace/schema/workspace-metadata.js';
/*
 * 🔴 The ONE reversible path codec of this module. Imported, never re-implemented: a second,
 *    differently-behaving encoder would either be lossy or collide two logical ids onto one file.
 */
import { encodePathSafeToken } from './identity.js';
import type { InsightGenerationBatch, InsightMeta, InsightOperationAnchor, InsightOperationAnchorStatus, InsightRecord } from './types.js';
import { INSIGHT_EXIT_ROUTES } from './types.js';

export const INSIGHT_OBJECT_TYPE = 'Insight';
export const INSIGHT_GENERATION_BATCH_OBJECT_TYPE = 'InsightGenerationBatch';
export const INSIGHT_OPERATION_ANCHOR_OBJECT_TYPE = 'InsightOperationAnchor';
export const INSIGHT_STATE_EVENT_OBJECT_TYPE = 'InsightStateEvent';

/* ------------------------------------------------------------------ *
 * 1. Paths
 * ------------------------------------------------------------------ */

export const INSIGHTS_DIRECTORY = 'insights';
export const INSIGHT_BATCHES_DIRECTORY = 'insights/batches';
/** M8-HARDENING-01: the durable recovery anchors of step ⑧ generations. */
export const INSIGHT_OPERATIONS_DIRECTORY = 'insights/operations';
export const INSIGHT_STATE_EVENTS_DIRECTORY = 'events';
export const INSIGHT_STATE_EVENTS_FILE = 'events/insight-state-events.jsonl';

const JSON_EXTENSION = '.json';
const MARKDOWN_EXTENSION = '.md';

/** Conventional path of an Insight sidecar; convenience only, never identity. */
export function insightSidecarPath(insight_id: string): string {
  return `${INSIGHTS_DIRECTORY}/${insight_id}${JSON_EXTENSION}`;
}

/** Conventional path of an Insight markdown body; convenience only, never identity. */
export function insightMarkdownPath(insight_id: string): string {
  return `${INSIGHTS_DIRECTORY}/${insight_id}${MARKDOWN_EXTENSION}`;
}

/**
 * Conventional path of a generation batch record.
 *
 * 🔴 THE PHYSICAL NAME IS ENCODED, THE LOGICAL ID IS NOT (`PSA-A-CORRECTION-M8-PATH-01`).
 *
 * `newInsightBatchId` mints `ATT_…:insight-batch:<ULID body>`. The `:` is part of the LOGICAL id and
 * must stay part of it - it is what makes "this batch belongs to that record" structurally checkable.
 * A `:` is, however, an ILLEGAL Windows file-name character, so the id is passed through the module's
 * existing REVERSIBLE `~HH` codec to become a legal name:
 *
 * ```
 * ATT_…0A:insight-batch:…0B   ->   ATT_…0A~3Ainsight-batch~3A…0B.json
 *        (logical batch_id)              (physical file name)
 * ```
 *
 * 🔴 THIS IS A NAME-ONLY MAPPING. The `batch_id` written INSIDE the document is still the original
 *    logical value, and `discoverBatches` resolves by that value - the file name is never identity
 *    (§3.2 rule 3 / AC-137), so a renamed batch still resolves.
 * 🔴 The codec is INJECTIVE, so two different logical ids can never share one physical file.
 * 🔴 WHY NOT A UUID OR A HASHED NAME: either would change the logical id's shape or make the mapping
 *    lossy, and the id would stop being the thing the user's data is keyed by (§3.2 rule 1).
 */
export function insightBatchPath(batch_id: string): string {
  return `${INSIGHT_BATCHES_DIRECTORY}/${encodePathSafeToken(batch_id)}${JSON_EXTENSION}`;
}

/**
 * Conventional path of the durable operation anchor (`M8-HARDENING-01`).
 *
 * 🔴 `operation_key` arrives ALREADY encoded - `insightOperationKey` applies the codec when it builds
 *    `<source_attempt_id>__<encoded operation_id>`. It is therefore NOT encoded again here: doing so
 *    would move every already-persisted anchor to a new path and orphan a pending recovery
 *    (`PSA-A-CORRECTION-M8-PATH-01`).
 */
export function insightOperationAnchorPath(operation_key: string): string {
  return `${INSIGHT_OPERATIONS_DIRECTORY}/${operation_key}${JSON_EXTENSION}`;
}

/* ------------------------------------------------------------------ *
 * 2. The forbidden-key allowance for the ONE colliding name
 * ------------------------------------------------------------------ */

/**
 * 🔴 THE ONE COLLISION, RESOLVED BY PATH.
 *
 * `FORBIDDEN_PERSISTED_KEYS` bans `role` as a cloud / account / team field, while the FROZEN
 * `EvidenceRef` carries a MANDATORY `role` (§5.2 rule 1: every reference must be labelled, and the
 * four-value set is closed). Renaming the field on disk would create a second field vocabulary for
 * one frozen type - exactly what §12 item 10 forbids - so the collision is resolved by PATH:
 * only `evidence_refs[i].role` is admitted, whether it sits on the document itself or inside a
 * planned record of the durable operation anchor. Every other occurrence of `role` (anywhere, at
 * any depth, including a stray `roles` list) is still refused by the shared guard.
 */
const FROZEN_EVIDENCE_ROLE_PATH = /(^|\.)evidence_refs\[\d+\]\.role$/;

/** The shared guard, minus the single path the frozen `EvidenceRef` shape legitimately occupies. */
export function findForbiddenInsightDocumentKeys(value: unknown): readonly string[] {
  return findForbiddenPersistedKeys(value).filter(
    (path) => !FROZEN_EVIDENCE_ROLE_PATH.test(path),
  );
}

function assertNoForbiddenKeys(payload: unknown, path: string): void {
  const forbidden = findForbiddenInsightDocumentKeys(payload);
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

function requireInsightObjectId(value: string, path: string, key: string): ObjectId<'INS'> {
  const insightId = toObjectId(value, 'insight');
  if (insightId === null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `${key} must be an INS_ prefixed object id (received ${JSON.stringify(value)}).`,
    );
  }
  return insightId;
}

function requireAttemptObjectId(value: string, path: string, key: string): ObjectId<'ATT'> {
  const attemptId = toObjectId(value, 'attempt');
  if (attemptId === null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `${key} must be an ATT_ prefixed object id (received ${JSON.stringify(value)}).`,
    );
  }
  return attemptId;
}

/* ------------------------------------------------------------------ *
 * 4. `EvidenceRef` (inline with its owner)
 * ------------------------------------------------------------------ */

function parseEvidenceRef(value: unknown, owner_id: ObjectId<'INS'>, path: string): EvidenceRef {
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
      'owner_id must be an INS_ / HYP_ id - a reference is owned by an Insight or a Hypothesis (contract §5.1).',
    );
  }
  /*
   * 🔴 `§38 V2`: an `Insight`'s references belong to THAT `Insight`. A document whose reference
   *    names another owner would silently corrupt two owners' `N_引用`, so it is refused.
   */
  if (parsed_owner !== owner_id) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `EvidenceRef.owner_id must be the owning Insight "${owner_id}" (received ${JSON.stringify(declared_owner)}).`,
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
 * 5. `GateCheckResult` (`E1`-`E4` presentation)
 * ------------------------------------------------------------------ */

function parseMissingItem(value: unknown, path: string): GateMissingItem {
  const record = asRecord(value, path);
  const raw = record['how_to_supplement'];
  let how_to_supplement: DisplayInferenceContentItem | null = null;
  if (raw !== undefined && raw !== null) {
    const item = parseContentItem(raw, `${path}.how_to_supplement`);
    if (item.source_type !== 'Inference' || item.confirmation_class !== 'display') {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        path,
        'how_to_supplement must be a display-type Inference (D-038): it changes no persisted business state.',
      );
    }
    how_to_supplement = item;
  }
  return {
    description: requireString(record, 'description', path),
    why_important: requireString(record, 'why_important', path),
    how_to_supplement,
  };
}

function parseGateCheck(value: unknown, path: string): GateCheckResult {
  const record = asRecord(value, path);
  /*
   * 🔴 Only `E1`-`E4` are check results. `E5` is the user's accept action, not a check, and the
   *    frozen `Insight.gate_checks` field describes the `E1`-`E4` presentation.
   */
  const gate_id = requireEnumValue(record, 'gate_id', INSIGHT_ELIGIBILITY_GATES, path) as GateId;
  const satisfied = record['satisfied'];
  if (typeof satisfied !== 'boolean') {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, 'satisfied must be a boolean.');
  }
  const raw_items = record['missing_items'];
  const missing_items = Array.isArray(raw_items)
    ? raw_items.map((entry, index) => parseMissingItem(entry, `${path}.missing_items[${index}]`))
    : [];
  if (!satisfied && missing_items.length === 0) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'An unsatisfied gate must keep its three-part presentation; a silent failure is refused (D-038).',
    );
  }
  return { gate_id, satisfied, missing_items };
}

/* ------------------------------------------------------------------ *
 * 6. The `Insight` document
 * ------------------------------------------------------------------ */

export interface InsightDocument extends Insight {
  readonly object_type: typeof INSIGHT_OBJECT_TYPE;
  /** Technical compatibility marker only - never a product version (AC-122). */
  readonly schema_version: string;
  /** D-021 `E4` ③; `null` when the `Insight` used no cross-record comparison. */
  readonly comparison_ref: string | null;
  /** Display-only meta (`INSIGHT_META_FIELDS`); never a rubric and never an ordering score. */
  readonly title: string | null;
  readonly display_order: number | null;
}

/**
 * The serialisable form of one stored record.
 *
 * 🔴 Extracted so the DURABLE OPERATION ANCHOR can hold the identical document shape: a replay must
 *    re-write exactly what the plan promised, byte for byte (`M8-HARDENING-01`).
 */
export function insightDocumentOf(record: InsightRecord): InsightDocument {
  const { insight } = record;
  return {
    object_type: INSIGHT_OBJECT_TYPE,
    schema_version: WORKSPACE_SCHEMA_VERSION,
    ...insight,
    comparison_ref: record.comparison_ref,
    title: record.meta.title,
    display_order: record.meta.display_order,
  };
}

export function serializeInsight(record: InsightRecord): string {
  const payload = insightDocumentOf(record);
  assertNoForbiddenKeys(payload, record.insight.insight_id);
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/* ------------------------------------------------------------------ *
 * 6b. The IMMUTABLE GENESIS of an `Insight` (PSA-A-CORRECTION-M8-RECOVERY-02)
 * ------------------------------------------------------------------ */

/**
 * 🔴 THE TWO FIELDS A REPLAY MAY LEGITIMATELY SEE CHANGED - AND NOTHING ELSE.
 *
 * 「Replay compatibility 只比较 IMMUTABLE GENESIS」. An interrupted step ⑧ operation is finished by
 * re-applying the plan its durable anchor carries (`M8-HARDENING-01`). Between the interruption and
 * the retry the user may LAWFULLY decide on the records that already landed - `E5` acceptance, or
 * `candidate -> rejected` - and either decision MOVES `state`, rewrites `updated_at` and appends its
 * own `InsightStateEvent`.
 *
 * Those two fields are therefore NOT part of what a replay has to reproduce. Treating them as part of
 * it made a legitimate human decision indistinguishable from workspace corruption: the retry aborted
 * with `PLAN_MISMATCH` and the operation became PERMANENTLY unrecoverable.
 *
 * 🔴 WHY THIS IS NOT LOOSENED ANY FURTHER. Everything else stays genesis: identity, source
 *    provenance, the generation / batch association, the generation-time content (① proposition,
 *    ② applicable scope, ④ judgment basis), the `E1`-`E4` presentation, the evidence references, the
 *    cross-record comparison provenance and the display-only meta block. A replay that accepted a
 *    DIFFERENT document under the same id would silently swallow real corruption, so this is
 *    explicitly NOT 「只要 `insight_id` 一样就算 compatible」.
 * 🔴 THE EXCLUSION LIST IS A DECLARATION, NOT A SCATTERED EXCEPTION: the projection below is a
 *    closed, explicit enumeration, so a NEW field added to `InsightDocument` fails to compile here
 *    until it has been consciously classified as genesis or as replay-mutable.
 */
export const INSIGHT_REPLAY_MUTABLE_FIELDS = ['state', 'updated_at'] as const;

export type InsightReplayMutableField = (typeof INSIGHT_REPLAY_MUTABLE_FIELDS)[number];

/** One `Insight` document WITHOUT the replay-mutable fields - i.e. what a replay must reproduce. */
export type InsightGenesis = Omit<InsightDocument, InsightReplayMutableField>;

/**
 * Projects one record onto its IMMUTABLE GENESIS.
 *
 * 🔴 ONE SINGLE POINT. BOTH sides of a replay comparison go through THIS projection, so the field set
 *    can never drift between the write path and the recovery path, and no call site has to hand-exclude
 *    `state` / `updated_at`.
 */
export function insightGenesisOf(record: InsightRecord): InsightGenesis {
  /*
   * 🔴 NEVER NAME THIS LOCAL `document`: this module is inside the FRAMEWORK-NEUTRAL scope, and the
   *    static audit refuses the literal `document.` anywhere in it (no DOM may leak into the core).
   */
  const payload = insightDocumentOf(record);
  return {
    object_type: payload.object_type,
    schema_version: payload.schema_version,
    insight_id: payload.insight_id,
    /* Source provenance: which record this `Insight` was generated from, and when. */
    attempt_id: payload.attempt_id,
    created_at: payload.created_at,
    /* Generation / batch association (§2.4): which explicit generation produced it. */
    generation_batch: payload.generation_batch,
    /* ① / ② / ④ - the generation-time content. */
    proposition: payload.proposition,
    applicable_scope: payload.applicable_scope,
    judgment_basis: payload.judgment_basis,
    /* ③ + ⑩ - the SAME historical reference set the count is derived from (§3.3). */
    evidence_refs: payload.evidence_refs,
    /* The `E1`-`E4` presentation produced by the generation (D-038). */
    gate_checks: payload.gate_checks,
    /* `D-021` `E4` ③ - the cross-record comparison provenance. */
    comparison_ref: payload.comparison_ref,
    /* Display-only meta: NOT a rubric, NOT a score, NOT an ordering signal (AC-64). */
    title: payload.title,
    display_order: payload.display_order,
  };
}

/**
 * The content signature of one record's genesis.
 *
 * 🔴 A STABLE STRING COMPARISON IS EXACT HERE, not an approximation: both operands are built by
 *    {@link insightGenesisOf} from the same literal, so the key order is fixed by that projection and
 *    every value is a JSON-representable primitive, an object id string or an array of records.
 */
function genesisSignatureOf(record: InsightRecord): string {
  return JSON.stringify(insightGenesisOf(record));
}

/**
 * 🔴 THE ONE REPLAY COMPATIBILITY TEST OF THIS MODULE.
 *
 * `true`  - 「the same generation produced this record」. The stored record is the SAME record, a
 *           replay must NOT re-create it, and the recovery simply proceeds to the missing pieces.
 * `false` - real divergence (a different generation, different content, different references, a
 *           different source, a different id). The caller must FAIL CLOSED, never overwrite.
 *
 * Nothing about the user's `state` verdict is decided here: a differing `state` / `updated_at` is
 * compatible, and the STORED record is what wins - so a recovery can never write a human decision
 * back to `candidate`.
 */
export function sameInsightGenesis(existing: InsightRecord, planned: InsightRecord): boolean {
  return genesisSignatureOf(existing) === genesisSignatureOf(planned);
}

/**
 * Reads one `Insight` document.
 *
 * 🔴 Never repairs and never guesses: a missing field, a non-canonical state, a reference owned by
 *    another object or an identity that names a different `Insight` is an explicit schema error.
 */
export function parseInsight(json: string, sourcePath = ''): InsightRecord {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new WorkspaceSchemaError('INVALID_JSON', sourcePath);
  }
  const record = asRecord(raw, sourcePath);
  assertNoForbiddenKeys(record, sourcePath);

  const object_type = record['object_type'];
  if (object_type !== INSIGHT_OBJECT_TYPE) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      `object_type must be "${INSIGHT_OBJECT_TYPE}".`,
    );
  }

  const insight_id = requireInsightObjectId(
    requireString(record, 'insight_id', sourcePath),
    sourcePath,
    'insight_id',
  );
  const attempt_id = requireAttemptObjectId(
    requireString(record, 'attempt_id', sourcePath),
    sourcePath,
    'attempt_id',
  );
  const state = requireEnumValue(record, 'state', INSIGHT_STATES, sourcePath) as InsightState;
  const generation_batch = requireString(record, 'generation_batch', sourcePath);
  const created_at = requireString(record, 'created_at', sourcePath);
  const updated_at = requireString(record, 'updated_at', sourcePath);

  const raw_refs = record['evidence_refs'];
  if (!Array.isArray(raw_refs)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'evidence_refs must be an array (an empty array is legal).',
    );
  }
  const evidence_refs = raw_refs.map((entry, index) =>
    parseEvidenceRef(entry, insight_id, `${sourcePath}.evidence_refs[${index}]`),
  );
  const ref_ids = new Set(evidence_refs.map((ref) => ref.evidence_ref_id));
  if (ref_ids.size !== evidence_refs.length) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'Two references share an evidence_ref_id; reference identity is globally unique (contract §3.2).',
    );
  }

  const raw_checks = record['gate_checks'];
  if (!Array.isArray(raw_checks)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', sourcePath, 'gate_checks must be an array.');
  }
  const parsed_checks = raw_checks.map((entry, index) =>
    parseGateCheck(entry, `${sourcePath}.gate_checks[${index}]`),
  );
  const covered = new Set(parsed_checks.map((check) => check.gate_id));
  if (covered.size !== parsed_checks.length) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'gate_checks repeats a gate id; the presentation must name each gate at most once.',
    );
  }

  const display_order = record['display_order'];
  if (
    display_order !== undefined &&
    display_order !== null &&
    (typeof display_order !== 'number' || !Number.isInteger(display_order))
  ) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'display_order must be an integer or null.',
    );
  }
  const comparison_ref = requireOptionalString(record, 'comparison_ref', sourcePath);

  const insight: Insight = {
    insight_id,
    attempt_id,
    state,
    proposition: requireString(record, 'proposition', sourcePath),
    applicable_scope: requireString(record, 'applicable_scope', sourcePath),
    evidence_refs,
    judgment_basis: requireString(record, 'judgment_basis', sourcePath),
    gate_checks: parsed_checks,
    generation_batch,
    created_at,
    updated_at,
  };

  const meta: InsightMeta = {
    title: requireOptionalString(record, 'title', sourcePath),
    display_order: display_order === undefined || display_order === null ? null : display_order,
  };

  return { insight, comparison_ref, meta };
}

/* ------------------------------------------------------------------ *
 * 7. Markdown body
 * ------------------------------------------------------------------ */

const FRONT_MATTER_DELIMITER = '---';

export interface InsightMarkdownFrontMatter {
  readonly object_type: string;
  readonly schema_version: string;
  readonly insight_id: ObjectId<'INS'>;
  readonly attempt_id: ObjectId<'ATT'>;
  readonly state: InsightState;
  readonly generation_batch: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export function serializeInsightMarkdown(record: InsightRecord): string {
  const { insight } = record;
  const frontMatter: InsightMarkdownFrontMatter = {
    object_type: INSIGHT_OBJECT_TYPE,
    schema_version: WORKSPACE_SCHEMA_VERSION,
    insight_id: insight.insight_id,
    attempt_id: insight.attempt_id,
    state: insight.state,
    generation_batch: insight.generation_batch,
    created_at: insight.created_at,
    updated_at: insight.updated_at,
  };
  const frontMatterLines = [
    FRONT_MATTER_DELIMITER,
    `object_type: ${frontMatter.object_type}`,
    `schema_version: "${frontMatter.schema_version}"`,
    `insight_id: ${frontMatter.insight_id}`,
    `attempt_id: ${frontMatter.attempt_id}`,
    `state: ${frontMatter.state}`,
    `generation_batch: ${frontMatter.generation_batch}`,
    `created_at: ${frontMatter.created_at}`,
    `updated_at: ${frontMatter.updated_at}`,
    FRONT_MATTER_DELIMITER,
  ];

  const STATE_LABELS: Readonly<Record<InsightState, string>> = {
    candidate: '候选经验（candidate）',
    accepted: '已接受（accepted｜Experience Asset 视图）',
    rejected: '已拒绝（rejected）',
  };

  const refs =
    insight.evidence_refs.length === 0
      ? '（当前没有引用任何历史内容）'
      : insight.evidence_refs
          .map(
            (ref) =>
              `- [${ref.role}] ${ref.target_id} :: ${ref.source_field_path}（evidence_ref_id = ${ref.evidence_ref_id}）`,
          )
          .join('\n');

  const gates =
    insight.gate_checks.length === 0
      ? '（尚未呈现检查结果）'
      : insight.gate_checks
          .map((check) => {
            if (check.satisfied) {
              return `- ${check.gate_id}：满足`;
            }
            const items = check.missing_items
              .map(
                (item) =>
                  `    · 缺什么：${item.description}\n      为什么重要：${item.why_important}\n      如何补充（AI 建议）：${
                    item.how_to_supplement === null ? '（未提供）' : item.how_to_supplement.value
                  }`,
              )
              .join('\n');
            return `- ${check.gate_id}：不满足\n${items}`;
          })
          .join('\n');

  const sections = [
    `## 经验命题（① Inference）\n\n${insight.proposition}\n`,
    `## 适用范围 / 条件集合（②）\n\n${insight.applicable_scope}\n`,
    `## 引用清单（③，与第 ⑩ 步及 N_引用 共用同一集合）\n\n${refs}\n`,
    `## 判断依据 / 可验证判据（④）\n\n${insight.judgment_basis}\n`,
    `## E1–E4 检查结果\n\n${gates}\n`,
    `## 状态\n\n- state：${STATE_LABELS[insight.state]}\n- 生成批次：${insight.generation_batch}\n`,
    `## 展示型元信息（非语义，改动不触发状态迁移）\n\n- title：${record.meta.title ?? '（未设置）'}\n- display_order：${
      record.meta.display_order === null ? '（未设置）' : String(record.meta.display_order)
    }\n- comparison_ref：${record.comparison_ref ?? '（未使用跨记录比较）'}\n`,
  ];

  return `${frontMatterLines.join('\n')}\n\n# ${insight.insight_id}\n\n${sections.join('\n')}`;
}

/**
 * Reads the front-matter of an Insight markdown file, for CONTENT-based ID resolution.
 * Returns `null` when the file is not an Insight markdown document.
 */
export function parseInsightMarkdownFrontMatter(
  markdown: string,
): { readonly insight_id: ObjectId<'INS'>; readonly attempt_id: ObjectId<'ATT'> } | null {
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
  if (fields.get('object_type') !== INSIGHT_OBJECT_TYPE) {
    return null;
  }
  const insightId = toObjectId(fields.get('insight_id') ?? '', 'insight');
  const attemptId = toObjectId(fields.get('attempt_id') ?? '', 'attempt');
  if (insightId === null || attemptId === null) {
    return null;
  }
  return { insight_id: insightId, attempt_id: attemptId };
}

/* ------------------------------------------------------------------ *
 * 8. Generation batch record
 * ------------------------------------------------------------------ */

export interface InsightGenerationBatchDocument extends InsightGenerationBatch {
  readonly object_type: typeof INSIGHT_GENERATION_BATCH_OBJECT_TYPE;
  readonly schema_version: string;
}

/** The serialisable form of one generation batch: shared by the batch file and the anchor. */
export function insightBatchDocumentOf(
  batch: InsightGenerationBatch,
): InsightGenerationBatchDocument {
  return {
    object_type: INSIGHT_GENERATION_BATCH_OBJECT_TYPE,
    schema_version: WORKSPACE_SCHEMA_VERSION,
    batch_id: batch.batch_id,
    source_attempt_id: batch.source_attempt_id,
    operation_id: batch.operation_id,
    insight_ids: batch.insight_ids,
    exit_route: batch.exit_route,
    absence_statement: batch.absence_statement,
    created_at: batch.created_at,
  };
}

export function serializeInsightBatch(batch: InsightGenerationBatch): string {
  const payload = insightBatchDocumentOf(batch);
  assertNoForbiddenKeys(payload, batch.batch_id);
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseInsightBatch(json: string, sourcePath = ''): InsightGenerationBatch {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new WorkspaceSchemaError('INVALID_JSON', sourcePath);
  }
  const record = asRecord(raw, sourcePath);
  assertNoForbiddenKeys(record, sourcePath);
  if (record['object_type'] !== INSIGHT_GENERATION_BATCH_OBJECT_TYPE) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      `object_type must be "${INSIGHT_GENERATION_BATCH_OBJECT_TYPE}".`,
    );
  }
  const raw_ids = record['insight_ids'];
  if (!Array.isArray(raw_ids)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', sourcePath, 'insight_ids must be an array.');
  }
  const insight_ids = raw_ids.map((entry, index) => {
    if (typeof entry !== 'string') {
      throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', `${sourcePath}.insight_ids[${index}]`);
    }
    return requireInsightObjectId(entry, `${sourcePath}.insight_ids[${index}]`, 'insight_ids');
  });
  const raw_exit = record['exit_route'];
  const exit_route =
    raw_exit === undefined || raw_exit === null
      ? null
      : requireEnumValue(record, 'exit_route', INSIGHT_EXIT_ROUTES, sourcePath);
  const absence_statement = requireOptionalString(record, 'absence_statement', sourcePath);

  /*
   * 🔴 A batch either produced insights or explains why it produced none - never neither and never
   *    both. A document that breaks this makes "0 insights" indistinguishable from "the record is
   *    incomplete", so it is refused instead of being silently repaired (§9.2 / D-047).
   */
  if (insight_ids.length > 0) {
    if (exit_route !== null) {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        sourcePath,
        'A batch that produced insights must not carry an exit route (D-038 / contract §9.2).',
      );
    }
  } else if (exit_route === null || absence_statement === null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'A zero-output batch must carry an explicit exit route and a non-blank absence statement (D-047).',
    );
  }

  return {
    batch_id: requireString(record, 'batch_id', sourcePath),
    source_attempt_id: requireAttemptObjectId(
      requireString(record, 'source_attempt_id', sourcePath),
      sourcePath,
      'source_attempt_id',
    ),
    operation_id: requireString(record, 'operation_id', sourcePath),
    insight_ids,
    exit_route,
    absence_statement:
      insight_ids.length > 0 || absence_statement === null
        ? null
        : requireString(record, 'absence_statement', sourcePath),
    created_at: requireString(record, 'created_at', sourcePath),
  };
}

/* ------------------------------------------------------------------ *
 * 9. State events (JSONL)
 * ------------------------------------------------------------------ */

export interface InsightStateEventLine extends InsightStateEvent {
  readonly object_type: typeof INSIGHT_STATE_EVENT_OBJECT_TYPE;
}

export function serializeInsightStateEvent(event: InsightStateEvent): string {
  const line: InsightStateEventLine = {
    object_type: INSIGHT_STATE_EVENT_OBJECT_TYPE,
    event_id: event.event_id,
    insight_id: event.insight_id,
    from_state: event.from_state,
    to_state: event.to_state,
    occurred_at: event.occurred_at,
    trigger: event.trigger,
  };
  /* A JSONL record stays on ONE line: an embedded newline would split it into two records. */
  return JSON.stringify(line);
}

export function parseInsightStateEvent(line: string, sourcePath = ''): InsightStateEvent {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    throw new WorkspaceSchemaError('INVALID_JSON', sourcePath);
  }
  const record = asRecord(raw, sourcePath);
  assertNoForbiddenKeys(record, sourcePath);
  if (record['object_type'] !== INSIGHT_STATE_EVENT_OBJECT_TYPE) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      `object_type must be "${INSIGHT_STATE_EVENT_OBJECT_TYPE}".`,
    );
  }
  return {
    event_id: requireString(record, 'event_id', sourcePath),
    insight_id: requireInsightObjectId(
      requireString(record, 'insight_id', sourcePath),
      sourcePath,
      'insight_id',
    ),
    from_state: requireEnumValue(record, 'from_state', INSIGHT_STATES, sourcePath) as InsightState,
    to_state: requireEnumValue(record, 'to_state', INSIGHT_STATES, sourcePath) as InsightState,
    occurred_at: requireString(record, 'occurred_at', sourcePath),
    trigger: requireEnumValue(
      record,
      'trigger',
      INSIGHT_STATE_EVENT_TRIGGERS,
      sourcePath,
    ) as InsightStateEventTrigger,
  };
}

/** Splits a JSONL document into non-empty lines. */
export function stateEventLinesOf(jsonl: string): readonly string[] {
  return jsonl
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/* ------------------------------------------------------------------ *
 * 10. The durable operation anchor (M8-HARDENING-01)
 * ------------------------------------------------------------------ */

const OPERATION_ANCHOR_STATUSES: readonly InsightOperationAnchorStatus[] = ['in_progress', 'complete'];

export interface InsightOperationAnchorDocument
  extends Omit<InsightOperationAnchor, 'planned_records' | 'planned_batch'> {
  readonly object_type: typeof INSIGHT_OPERATION_ANCHOR_OBJECT_TYPE;
  readonly schema_version: string;
  /** The plan, in the SAME document shape the `insights/<id>.json` files use. */
  readonly planned_records: readonly InsightDocument[];
  readonly planned_batch: InsightGenerationBatchDocument;
}

/**
 * Serialises one anchor.
 *
 * 🔴 The WHOLE materialised plan travels in ONE document and is written in ONE storage write. That is
 *    the recovery boundary: a retry with the same `operation_id` re-writes exactly the planned
 *    identities instead of generating new ones (`M8-HARDENING-01`).
 */
export function serializeInsightOperationAnchor(anchor: InsightOperationAnchor): string {
  const payload: InsightOperationAnchorDocument = {
    object_type: INSIGHT_OPERATION_ANCHOR_OBJECT_TYPE,
    schema_version: WORKSPACE_SCHEMA_VERSION,
    operation_key: anchor.operation_key,
    operation_id: anchor.operation_id,
    source_attempt_id: anchor.source_attempt_id,
    batch_id: anchor.batch_id,
    status: anchor.status,
    planned_records: anchor.planned_records.map(insightDocumentOf),
    planned_batch: insightBatchDocumentOf(anchor.planned_batch),
    created_at: anchor.created_at,
  };
  assertNoForbiddenKeys(payload, anchor.operation_key);
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Reads one anchor.
 *
 * 🔴 Strict, never repairing. The anchor additionally has to be INTERNALLY CONSISTENT, because a
 *    recovery that replays a plan whose parts disagree would write a set of records that no batch
 *    explains - i.e. exactly the corruption this mechanism exists to prevent.
 */
export function parseInsightOperationAnchor(
  json: string,
  sourcePath = '',
): InsightOperationAnchor {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new WorkspaceSchemaError('INVALID_JSON', sourcePath);
  }
  const record = asRecord(raw, sourcePath);
  assertNoForbiddenKeys(record, sourcePath);
  if (record['object_type'] !== INSIGHT_OPERATION_ANCHOR_OBJECT_TYPE) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      `object_type must be "${INSIGHT_OPERATION_ANCHOR_OBJECT_TYPE}".`,
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
    parseInsight(JSON.stringify(entry), `${sourcePath}.planned_records[${index}]`),
  );
  const planned_batch = parseInsightBatch(
    JSON.stringify(record['planned_batch']),
    `${sourcePath}.planned_batch`,
  );
  const source_attempt_id = requireAttemptObjectId(
    requireString(record, 'source_attempt_id', sourcePath),
    sourcePath,
    'source_attempt_id',
  );
  if (planned_batch.source_attempt_id !== source_attempt_id) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'The anchor source attempt and the planned batch disagree; a recovery would replay an inconsistent plan.',
    );
  }
  const batch_id = requireString(record, 'batch_id', sourcePath);
  if (batch_id !== planned_batch.batch_id) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'The anchor batch_id and the planned batch disagree; a recovery would replay an inconsistent plan.',
    );
  }
  /*
   * 🔴 EVERY planned record must be named by the planned batch. A record the batch does not list
   *    would be an orphan: written by the recovery, explained by nothing, and invisible to the
   *    idempotency lookup.
   */
  for (const planned of planned_records) {
    const id = planned.insight.insight_id;
    if (!planned_batch.insight_ids.includes(id)) {
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
    status,
    planned_records,
    planned_batch,
    created_at: requireString(record, 'created_at', sourcePath),
  };
}
