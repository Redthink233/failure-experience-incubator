/**
 * `Attempt` physical representation: `<attempt_id>.json` sidecar + `<attempt_id>.md` body.
 *
 * Contract / plan references:
 *   - contract §0.4 E.7/E.8 - `Markdown + JSON / sidecar metadata` (TECHNICAL DEFAULT);
 *   - contract D-059 (TQ02) - Local Workspace Files + no required cloud database;
 *   - Gate C Plan §J.1 row 2 and §J.1 row 7/8/9/10 -
 *     the sidecar carries `state`, `archive_state`, per-item `source_type`,
 *     `decision_state`, `data_source_nature` and (where relevant) `generation_batch`;
 *   - §11.1 `updated_at` is retained so "was this Formal Attempt modified?" is answerable.
 *
 * 🔴 The `attempt_id` is stored INSIDE the content of BOTH files. File names are a
 *    convenience only and are never used as identity (§3.2 / AC-137).
 * 🔴 Provenance is never flattened: each content item keeps its own `source_type`
 *    (and `confirmation_class` / `decision_state` where applicable) (§4.2 rule 1).
 * 🔴 No version / revision / edit-count / similarity field is written (AC-122).
 */

import type { ArchiveState } from '../../domain/types/archive.js';
import { ARCHIVE_STATES } from '../../domain/types/archive.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import { toObjectId } from '../../domain/ids/object-id.js';
import type { Attempt, AttemptState, DataSourceNature } from '../../domain/types/attempt.js';
import {
  ATTEMPT_STATES,
  DATA_SOURCE_NATURES,
} from '../../domain/types/attempt.js';
import type { FieldPresenceState, MaybeProvided } from '../../domain/types/presence.js';
import type {
  ContentItem,
  DecisionInferenceContentItem,
  FactContentItem,
  InferenceContentItem,
} from '../../domain/types/source-type.js';
import {
  CONFIRMATION_CLASSES,
  CONTENT_ITEM_DECISION_STATES,
  SOURCE_TYPES,
} from '../../domain/types/source-type.js';
import type { PersistedContentItem } from '../../domain/types/content-item-record.js';
import {
  FOLLOW_UP_QUESTION_FIELD_KEY,
  isContentItemFieldKey,
  persistContentItem,
} from '../../domain/types/content-item-record.js';
import type {
  AttemptDraftState,
  AttemptParseState,
  GapPriority,
  GapPriorityHint,
  GapPriorityHintEntry,
  FollowUpGapKey,
} from '../../domain/types/follow-up.js';
import {
  GAP_PRIORITY_ORDER,
  MAX_KEY_FOLLOW_UP_QUESTIONS,
  createInitialDraftState,
  draftStateIsConsistent,
  isAttemptParseState,
  isFollowUpGapKey,
} from '../../domain/types/follow-up.js';
import { findForbiddenPersistedKeys } from './forbidden-keys.js';
import { WorkspaceSchemaError } from './schema-error.js';
import { WORKSPACE_SCHEMA_VERSION } from './workspace-metadata.js';

export const ATTEMPT_OBJECT_TYPE = 'Attempt';
const MARKDOWN_UNKNOWN_LABEL = '（未知 / 未提供）';
const FRONT_MATTER_DELIMITER = '---';
const MISSING_PROJECT_SENTINEL = 'null';

/* ------------------------------------------------------------------ *
 * Sidecar JSON
 * ------------------------------------------------------------------ */

/**
 * 1:1 附属记录（`Attempt Draft State`，docs/02 §C.5）。
 * 🔴 它与 `Attempt` 的 Fact / Experience 内容**逻辑独立**，只随同一 sidecar 落盘。
 */
export interface AttemptSidecarAttachments {
  /**
   * docs/02 §C.4 的内容条目集合：承载**非主字段路径**的条目
   * （第 ② 步解析抽取结果 + 追问答案双层落库）。
   * 🔴 它不是第二套 provenance 体系，就是既有 `ContentItem` 加上 §C.4.1 的
   *    `field_key` / `origin_hint` 两个逻辑字段。
   */
  readonly content_items?: readonly PersistedContentItem[];
  readonly draft_state?: AttemptDraftState;
}

export interface AttemptSidecarDocument extends Attempt {
  readonly object_type: typeof ATTEMPT_OBJECT_TYPE;
  /** Technical compatibility marker only - never a product version (AC-122). */
  readonly schema_version: string;
  readonly content_items: readonly PersistedContentItem[];
  readonly draft_state: AttemptDraftState;
}

/** Parsed form of one sidecar file: the product object plus its two attached records. */
export interface AttemptSidecarRecord {
  readonly attempt: Attempt;
  readonly content_items: readonly PersistedContentItem[];
  readonly draft_state: AttemptDraftState;
}

export function serializeAttemptSidecar(
  attempt: Attempt,
  attachments: AttemptSidecarAttachments = {},
): string {
  const payload: AttemptSidecarDocument = {
    object_type: ATTEMPT_OBJECT_TYPE,
    schema_version: WORKSPACE_SCHEMA_VERSION,
    ...attempt,
    content_items: attachments.content_items ?? [],
    draft_state: attachments.draft_state ?? createInitialDraftState(attempt.attempt_id),
  };
  const forbidden = findForbiddenPersistedKeys(payload);
  if (forbidden.length > 0) {
    throw new WorkspaceSchemaError(
      'FORBIDDEN_KEY',
      attempt.attempt_id,
      `Attempt sidecar would persist forbidden keys: ${forbidden.join(', ')}.`,
    );
  }
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/* ------------------------------------------------------------------ *
 * Parsing helpers
 * ------------------------------------------------------------------ */

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path);
  }
  return value as Record<string, unknown>;
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new WorkspaceSchemaError('MISSING_REQUIRED_FIELD', path, key);
  }
  return value;
}

/**
 * Reads an `ATT_` prefixed object id from a persisted document.
 *
 * 🔴 An illegal id is an EXPLICIT schema error - never silently accepted and never
 *    coerced. The `ATT_` form is the same one `newObjectId('attempt')` produces
 *    (§3.2 rule 1: ids are globally unique and are carried INSIDE the content).
 */
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

export function parseContentItem(value: unknown, path: string): ContentItem {
  const record = asRecord(value, path);
  const contentItemId = requireString(record, 'content_item_id', path);
  const sourceType = requireEnumValue(record, 'source_type', SOURCE_TYPES, path);
  const itemValue = requireString(record, 'value', path);

  if (sourceType === 'Inference') {
    const confirmationClass = requireEnumValue(
      record,
      'confirmation_class',
      CONFIRMATION_CLASSES,
      path,
    );
    if (confirmationClass === 'decision') {
      return {
        content_item_id: contentItemId,
        source_type: 'Inference',
        confirmation_class: 'decision',
        decision_state: requireEnumValue(
          record,
          'decision_state',
          CONTENT_ITEM_DECISION_STATES,
          path,
        ),
        value: itemValue,
      };
    }
    return {
      content_item_id: contentItemId,
      source_type: 'Inference',
      confirmation_class: 'display',
      value: itemValue,
    };
  }

  if (sourceType === 'Fact') {
    const item: FactContentItem = {
      content_item_id: contentItemId,
      source_type: 'Fact',
      value: itemValue,
    };
    return item;
  }

  return {
    content_item_id: contentItemId,
    source_type: 'Extraction',
    value: itemValue,
  };
}

/** Narrows a parsed content item to an `Inference` item, or throws. */
export function parseInferenceContentItem(
  value: unknown,
  path: string,
): InferenceContentItem {
  const item = parseContentItem(value, path);
  if (item.source_type !== 'Inference') {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'Expected an Inference content item.',
    );
  }
  return item;
}

/** Narrows a parsed content item to a user `Fact` item, or throws. */
export function parseFactContentItem(value: unknown, path: string): FactContentItem {
  const item = parseContentItem(value, path);
  if (item.source_type !== 'Fact') {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'Expected a user Fact content item.',
    );
  }
  return item;
}

/**
 * Reads a `MaybeProvided` carrier.
 * A missing key is read as an EXPLICIT `unknown` - i.e. 「未知 / 未提供」 - and is
 * never turned into an empty string or a default value (§4.2 rule 7 / AC-04).
 */
export function parseMaybeProvided<T>(
  value: unknown,
  path: string,
  parseItem: (raw: unknown, path: string) => T,
): MaybeProvided<T> {
  if (value === undefined || value === null) {
    return { presence_state: 'unknown' };
  }
  const record = asRecord(value, path);
  const presence = record['presence_state'];
  if (presence === undefined || presence === 'unknown') {
    return { presence_state: 'unknown' };
  }
  if (presence !== 'present') {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `presence_state must be "present" | "unknown" (received ${JSON.stringify(presence)}).`,
    );
  }
  return { presence_state: 'present', item: parseItem(record['item'], `${path}.item`) };
}

/**
 * Reads an `Attempt Draft State`（docs/02 §C.5）.
 *
 * 🔴 不修不猜：`attempt_id` 必须与所属 `Attempt` 一致、`asked_key_question_count` 必须
 *    等于 `asked_gap_set.length` 且不超过 canonical 上限；任何不一致都显式失败，
 *    绝不静默修补（否则「问题计数」就会变成不可信的展示值）。
 */
export function parseAttemptDraftState(
  value: unknown,
  attempt_id: string,
  path: string,
): AttemptDraftState {
  const record = asRecord(value, path);
  const declaredId = requireString(record, 'attempt_id', path);
  if (declaredId !== attempt_id) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `draft_state.attempt_id must match the Attempt it is attached to (received ${JSON.stringify(declaredId)}).`,
    );
  }
  const rawParseState = requireString(record, 'parse_state', path);
  if (!isAttemptParseState(rawParseState)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `parse_state must be one of the canonical non-graded states (received ${JSON.stringify(rawParseState)}).`,
    );
  }
  const count = record['asked_key_question_count'];
  if (
    typeof count !== 'number' ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > MAX_KEY_FOLLOW_UP_QUESTIONS
  ) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `asked_key_question_count must be an integer within 0..${MAX_KEY_FOLLOW_UP_QUESTIONS} (received ${JSON.stringify(count)}).`,
    );
  }

  const state: AttemptDraftState = {
    attempt_id: declaredId,
    parse_state: rawParseState as AttemptParseState,
    asked_key_question_count: count,
    abandoned_gap_set: requireGapSet(record, 'abandoned_gap_set', path),
    asked_gap_set: requireGapSet(record, 'asked_gap_set', path),
    gap_priority_hint: parseGapPriorityHint(record['gap_priority_hint'], `${path}.gap_priority_hint`),
  };

  if (!draftStateIsConsistent(state, attempt_id)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'asked_key_question_count must equal the number of gaps in asked_gap_set.',
    );
  }
  return state;
}

function requireGapSet(
  record: Record<string, unknown>,
  key: string,
  path: string,
): readonly FollowUpGapKey[] {
  const raw = record[key];
  if (raw === undefined || raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, `${key} must be an array.`);
  }
  return raw.map((entry, index) => {
    if (typeof entry !== 'string' || !isFollowUpGapKey(entry)) {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        path,
        `${key}[${index}] must be a canonical P1/P2/P3 gap key (received ${JSON.stringify(entry)}).`,
      );
    }
    return entry;
  });
}

function parseGapPriorityHint(value: unknown, path: string): GapPriorityHint | null {
  if (value === undefined || value === null) {
    return null;
  }
  const record = asRecord(value, path);
  const raw = record['remaining_gaps'];
  if (!Array.isArray(raw)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, 'remaining_gaps must be an array.');
  }
  const entries: GapPriorityHintEntry[] = raw.map((entry, index) => {
    const entryPath = `${path}.remaining_gaps[${index}]`;
    const item = asRecord(entry, entryPath);
    const gap = item['gap'];
    if (typeof gap !== 'string' || !isFollowUpGapKey(gap)) {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        entryPath,
        `gap must be a canonical P1/P2/P3 gap key (received ${JSON.stringify(gap)}).`,
      );
    }
    const priority = item['priority'];
    if (
      typeof priority !== 'string' ||
      !GAP_PRIORITY_ORDER.includes(priority as GapPriority)
    ) {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        entryPath,
        `priority must be one of ${GAP_PRIORITY_ORDER.join(' | ')} (received ${JSON.stringify(priority)}).`,
      );
    }
    return { gap, priority: priority as GapPriority };
  });
  return entries.length === 0 ? null : { remaining_gaps: entries };
}

/**
 * Reads the persisted `content_items` collection (docs/02 §C.4).
 *
 * 🔴 `field_key` must come from the frozen set; a document that names an unknown key is
 *    EXPLICITLY refused rather than silently accepted with a widened vocabulary.
 * 🔴 `presence_state = unknown` never materialises as an item: a content item by definition
 *    carries a value, and 「未知 / 未提供」 is expressed by the field-level `MaybeProvided` carrier
 *    (contract §4.2 rule 7 / AC-04).
 */
export function parsePersistedContentItems(
  value: unknown,
  path: string,
): readonly PersistedContentItem[] {
  if (value === undefined || value === null) {
    throw new WorkspaceSchemaError('MISSING_REQUIRED_FIELD', path, 'content_items');
  }
  if (!Array.isArray(value)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, 'content_items must be an array.');
  }
  return value.map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const base = parseContentItem(entry, itemPath);
    const record = asRecord(entry, itemPath);
    const rawFieldKey = requireString(record, 'field_key', itemPath);
    if (!isContentItemFieldKey(rawFieldKey)) {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        itemPath,
        `field_key must be a frozen content-item field key (received ${JSON.stringify(rawFieldKey)}).`,
      );
    }
    const rawOrigin = record['origin_hint'];
    if (rawOrigin !== undefined && rawOrigin !== null && typeof rawOrigin !== 'string') {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        itemPath,
        'origin_hint must be a string or null.',
      );
    }
    return persistContentItem(base, rawFieldKey, typeof rawOrigin === 'string' ? rawOrigin : null);
  });
}

export function parseAttemptSidecar(json: string, sourcePath = ''): Attempt {
  return parseAttemptSidecarRecord(json, sourcePath).attempt;
}

export function parseAttemptSidecarRecord(json: string, sourcePath = ''): AttemptSidecarRecord {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new WorkspaceSchemaError('INVALID_JSON', sourcePath);
  }
  const record = asRecord(raw, sourcePath);

  const forbidden = findForbiddenPersistedKeys(record);
  if (forbidden.length > 0) {
    throw new WorkspaceSchemaError(
      'FORBIDDEN_KEY',
      sourcePath,
      `Forbidden keys present: ${forbidden.join(', ')}.`,
    );
  }

  const attemptId = requireAttemptObjectId(
    requireString(record, 'attempt_id', sourcePath),
    sourcePath,
    'attempt_id',
  );
  const state = requireEnumValue(record, 'state', ATTEMPT_STATES, sourcePath);
  const archiveState = requireEnumValue(record, 'archive_state', ARCHIVE_STATES, sourcePath);
  const dataSourceNature = requireEnumValue(
    record,
    'data_source_nature',
    DATA_SOURCE_NATURES,
    sourcePath,
  );
  const createdAt = requireString(record, 'created_at', sourcePath);
  const updatedAt = requireString(record, 'updated_at', sourcePath);
  const rawText = parseContentItem(record['raw_text'], `${sourcePath}.raw_text`);
  if (rawText.source_type !== 'Fact') {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'raw_text must be a user Fact.',
    );
  }

  const projectIdRaw = record['project_id'];
  const projectId =
    projectIdRaw === null || projectIdRaw === undefined
      ? null
      : requireString(record, 'project_id', sourcePath);

  const keyParametersRaw = record['key_parameters'];
  const keyParameters = Array.isArray(keyParametersRaw)
    ? keyParametersRaw.map((entry, index) =>
        parseContentItem(entry, `${sourcePath}.key_parameters[${index}]`),
      )
    : [];

  const candidateCausesRaw = record['candidate_causes'];
  const candidateCauses: DecisionInferenceContentItem[] = Array.isArray(candidateCausesRaw)
    ? candidateCausesRaw.map((entry, index) => {
        const item = parseContentItem(entry, `${sourcePath}.candidate_causes[${index}]`);
        if (item.source_type !== 'Inference' || item.confirmation_class !== 'decision') {
          throw new WorkspaceSchemaError(
            'INVALID_FIELD_VALUE',
            sourcePath,
            'candidate_causes entries must be Inference|decision items (D-048).',
          );
        }
        return item;
      })
    : [];

  const failureTagsRaw = record['failure_tags'];
  const failureTags = Array.isArray(failureTagsRaw)
    ? failureTagsRaw.filter((tag): tag is string => typeof tag === 'string')
    : [];

  const attempt: Attempt = {
    attempt_id: attemptId,
    project_id: projectId,
    state: state as AttemptState,
    archive_state: archiveState as ArchiveState,
    raw_text: rawText,
    goal: parseMaybeProvided(record['goal'], `${sourcePath}.goal`, parseContentItem),
    actual_attempt: parseMaybeProvided(
      record['actual_attempt'],
      `${sourcePath}.actual_attempt`,
      parseContentItem,
    ),
    condition: parseMaybeProvided(record['condition'], `${sourcePath}.condition`, parseContentItem),
    actual_result: parseMaybeProvided(
      record['actual_result'],
      `${sourcePath}.actual_result`,
      parseContentItem,
    ),
    result_status: parseMaybeProvided(
      record['result_status'],
      `${sourcePath}.result_status`,
      parseInferenceContentItem,
    ),
    expected_result: parseMaybeProvided(
      record['expected_result'],
      `${sourcePath}.expected_result`,
      parseContentItem,
    ),
    judgment_basis: parseMaybeProvided(
      record['judgment_basis'],
      `${sourcePath}.judgment_basis`,
      parseContentItem,
    ),
    key_parameters: keyParameters,
    candidate_causes: candidateCauses,
    occurred_at: parseMaybeProvided(
      record['occurred_at'],
      `${sourcePath}.occurred_at`,
      parseFactContentItem,
    ),
    environment: parseMaybeProvided(
      record['environment'],
      `${sourcePath}.environment`,
      parseContentItem,
    ),
    cost: parseMaybeProvided(record['cost'], `${sourcePath}.cost`, parseFactContentItem),
    user_note: parseMaybeProvided(record['user_note'], `${sourcePath}.user_note`, parseContentItem),
    failure_tags: failureTags,
    created_at: createdAt,
    updated_at: updatedAt,
    data_source_nature: dataSourceNature as DataSourceNature,
  };

  const content_items = parsePersistedContentItems(
    record['content_items'],
    `${sourcePath}.content_items`,
  );
  const draft_state = parseAttemptDraftState(
    record['draft_state'],
    attemptId,
    `${sourcePath}.draft_state`,
  );

  /*
   * 🔴 The persisted question items and the persisted asked-gap set describe the SAME fact
   *    (how many key follow-up questions were asked, and about what). A disagreement means the
   *    counter can no longer be trusted, so the document is refused instead of silently
   *    repaired (TC-29 / AC-Q06-1).
   */
  const persistedQuestionCount = content_items.filter(
    (item) => item.field_key === FOLLOW_UP_QUESTION_FIELD_KEY,
  ).length;
  if (persistedQuestionCount !== draft_state.asked_gap_set.length) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      `${sourcePath}.content_items`,
      `Expected ${draft_state.asked_gap_set.length} persisted followup_question item(s) to match asked_gap_set (found ${persistedQuestionCount}).`,
    );
  }

  return { attempt, content_items, draft_state };
}

/* ------------------------------------------------------------------ *
 * Markdown body
 * ------------------------------------------------------------------ */

export interface AttemptMarkdownFrontMatter {
  readonly object_type: string;
  readonly schema_version: string;
  /** Branded `ATT_` object id - validated on read, never a free-form string. */
  readonly attempt_id: ObjectId<'ATT'>;
  readonly project_id: string | null;
  readonly state: AttemptState;
  readonly archive_state: ArchiveState;
  readonly data_source_nature: DataSourceNature;
  readonly created_at: string;
  readonly updated_at: string;
}

function describeItem(item: ContentItem): string {
  if (item.source_type === 'Inference') {
    return item.confirmation_class === 'decision'
      ? `Inference｜decision（decision_state = ${item.decision_state}）`
      : 'Inference｜display';
  }
  return item.source_type;
}

function renderMaybeProvided(
  title: string,
  maybe: { readonly presence_state: FieldPresenceState; readonly item?: ContentItem },
): string {
  if (maybe.presence_state === 'unknown' || maybe.item === undefined) {
    return `### ${title}\n\n${MARKDOWN_UNKNOWN_LABEL}\n`;
  }
  return `### ${title}\n\n- 来源：${describeItem(maybe.item)}\n- 内容：${maybe.item.value}\n`;
}

export function serializeAttemptMarkdown(attempt: Attempt): string {
  const frontMatter: AttemptMarkdownFrontMatter = {
    object_type: ATTEMPT_OBJECT_TYPE,
    schema_version: WORKSPACE_SCHEMA_VERSION,
    attempt_id: attempt.attempt_id,
    project_id: attempt.project_id,
    state: attempt.state,
    archive_state: attempt.archive_state,
    data_source_nature: attempt.data_source_nature,
    created_at: attempt.created_at,
    updated_at: attempt.updated_at,
  };

  const frontMatterLines = [
    FRONT_MATTER_DELIMITER,
    `object_type: ${frontMatter.object_type}`,
    `schema_version: "${frontMatter.schema_version}"`,
    `attempt_id: ${frontMatter.attempt_id}`,
    `project_id: ${frontMatter.project_id ?? MISSING_PROJECT_SENTINEL}`,
    `state: ${frontMatter.state}`,
    `archive_state: ${frontMatter.archive_state}`,
    `data_source_nature: ${frontMatter.data_source_nature}`,
    `created_at: ${frontMatter.created_at}`,
    `updated_at: ${frontMatter.updated_at}`,
    FRONT_MATTER_DELIMITER,
  ];

  const sections: string[] = [];
  sections.push(`## 原始描述（用户 Fact）\n\n${attempt.raw_text.value}\n`);
  sections.push('## Level A 维度（主字段路径由契约 §9.4.1 冻结）\n');
  sections.push(
    renderMaybeProvided('目标 / goal → `goal`', attempt.goal),
    renderMaybeProvided('方案 / 技术对象 / approach → `actual_attempt`', attempt.actual_attempt),
    renderMaybeProvided('条件 / condition → `condition`', attempt.condition),
    renderMaybeProvided('结果 / 现象 / 结论方向 / result → `actual_result`', attempt.actual_result),
  );
  sections.push(
    renderMaybeProvided(
      '结果状态（决策型 Inference，须用户显式确认后方可作为 Formal 条件）',
      attempt.result_status,
    ),
    renderMaybeProvided('期望结果 / expected_result（非 Level A 主字段）', attempt.expected_result),
    renderMaybeProvided('判断依据 / judgment_basis（非 Level A 主字段）', attempt.judgment_basis),
  );

  const parameters =
    attempt.key_parameters.length === 0
      ? MARKDOWN_UNKNOWN_LABEL
      : attempt.key_parameters.map((item) => `- ${describeItem(item)}：${item.value}`).join('\n');
  sections.push(`### 关键参数\n\n${parameters}\n`);

  const causes =
    attempt.candidate_causes.length === 0
      ? '当前依据不足，暂不推断原因（允许 0 条，D-048）'
      : attempt.candidate_causes
          .map((item) => `- ${describeItem(item)}：${item.value}`)
          .join('\n');
  sections.push(`### 候选失败原因（④ 决策型 Inference）\n\n${causes}\n`);

  sections.push(
    renderMaybeProvided('发生时间（用户 Fact，不计入 L4）', attempt.occurred_at),
    renderMaybeProvided('版本 / 环境（可缺省）', attempt.environment),
    renderMaybeProvided('成本（用户提供；无数据时为未知）', attempt.cost),
    renderMaybeProvided('用户备注', attempt.user_note),
  );

  const tags =
    attempt.failure_tags.length === 0
      ? MARKDOWN_UNKNOWN_LABEL
      : attempt.failure_tags.map((tag) => `- ${tag}`).join('\n');
  sections.push(`### 失败类型标签（可选 tag，不作必填、不产生价值分级）\n\n${tags}\n`);

  sections.push(
    `## 系统记录（L4，恰 4 项）\n\n- created_at：${attempt.created_at}\n- updated_at：${attempt.updated_at}\n- data_source_nature：${attempt.data_source_nature}\n- ai_source_marks：见上文逐条内容条目的来源标注\n`,
  );

  return `${frontMatterLines.join('\n')}\n\n# ${attempt.attempt_id}\n\n${sections.join('\n')}`;
}

export function extractAttemptMarkdownBody(markdown: string): string {
  const lines = markdown.split('\n');
  if (lines[0]?.trim() !== FRONT_MATTER_DELIMITER) {
    return markdown;
  }
  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === FRONT_MATTER_DELIMITER,
  );
  if (closingIndex < 0) {
    return markdown;
  }
  return lines.slice(closingIndex + 1).join('\n');
}

/**
 * Reads the front-matter of an Attempt markdown file.
 * Used for CONTENT-based ID resolution, so a renamed file is still found (§3.2 / AC-137).
 * Returns `null` when the file is not an Attempt markdown document.
 *
 * 🔴 Once the document DOES declare `object_type: Attempt`, its `attempt_id` must be a
 *    legal `ATT_` object id: a malformed id is an explicit schema error rather than a
 *    record that is silently ignored or silently accepted.
 */
export function parseAttemptMarkdownFrontMatter(
  markdown: string,
): AttemptMarkdownFrontMatter | null {
  const lines = markdown.split('\n');
  if (lines[0]?.trim() !== FRONT_MATTER_DELIMITER) {
    return null;
  }
  const values = new Map<string, string>();
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.trim() === FRONT_MATTER_DELIMITER) {
      break;
    }
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }

  const attemptIdRaw = values.get('attempt_id');
  const objectType = values.get('object_type');
  if (attemptIdRaw === undefined || objectType !== ATTEMPT_OBJECT_TYPE) {
    return null;
  }
  const attemptId = requireAttemptObjectId(
    attemptIdRaw,
    `${ATTEMPT_OBJECT_TYPE} markdown front-matter`,
    'attempt_id',
  );
  const state = values.get('state');
  const archiveState = values.get('archive_state');
  const dataSourceNature = values.get('data_source_nature');
  if (
    state === undefined ||
    archiveState === undefined ||
    dataSourceNature === undefined ||
    !ATTEMPT_STATES.includes(state as AttemptState) ||
    !ARCHIVE_STATES.includes(archiveState as ArchiveState) ||
    !DATA_SOURCE_NATURES.includes(dataSourceNature as DataSourceNature)
  ) {
    return null;
  }
  const projectIdRaw = values.get('project_id');
  const created = values.get('created_at');
  const updated = values.get('updated_at');

  return {
    object_type: objectType,
    schema_version: values.get('schema_version') ?? WORKSPACE_SCHEMA_VERSION,
    attempt_id: attemptId,
    project_id:
      projectIdRaw === undefined || projectIdRaw === MISSING_PROJECT_SENTINEL
        ? null
        : projectIdRaw,
    state: state as AttemptState,
    archive_state: archiveState as ArchiveState,
    data_source_nature: dataSourceNature as DataSourceNature,
    created_at: created ?? '',
    updated_at: updated ?? '',
  };
}
