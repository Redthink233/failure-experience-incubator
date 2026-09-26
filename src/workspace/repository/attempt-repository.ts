/**
 * Minimal `Attempt` repository - the S01-01 vertical slice.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
 *   - §3.2   references and resolution are BY ID; archiving never invalidates an ID;
 *   - §7.2/§7.3 archive rules (revocable; archived records are not editable;
 *     archiving never triggers retrieval; no physical delete);
 *   - §9 steps ①②③④⑤ - a `Draft` is created from raw input and only an explicit
 *     user confirmation may promote it to `Formal`;
 *   - §10.1 layer 1 (`GATE`) - a denial only affects upgrade eligibility: existing
 *     data is preserved, nothing is presented as a system error and the user is not
 *     locked out;
 *   - §12 item 9 - the archive filter must be injected in the correct place.
 *
 * 🔴 Resolution scans CONTENT, never file names: both the `.json` sidecar and the
 *    `.md` front-matter carry `attempt_id`, so renaming (or moving) the file pair
 *    does not break ID-based resolution (§3.2 / Gate C Plan §J.1 row 6 / AC-137).
 * 🔴 §3.2 rule 1 (all ids globally unique): when two DIFFERENT physical objects declare
 *    the SAME internal object id the scan fails explicitly (`DUPLICATE_OBJECT_ID`) and
 *    creating an already-existing id never overwrites the stored record.
 * 🔴 §1.3 (`Project` may be omitted): an Attempt without a logical `Project` is stored in
 *    an internal physical bucket that is never registered, never given a `project.json`
 *    and never returned as a logical project - no phantom project is ever invented.
 * 🔴 NO database of any kind is required: only a `WorkspaceStorage` (an in-memory
 *    implementation is sufficient) - D-059 / AC-130 / AC-136 / ITC-02.
 * 🔴 NO physical delete member exists (AC-76).
 */

import type { ArchiveState } from '../../domain/types/archive.js';
import type {
  Attempt,
  AttemptState,
  DataSourceNature,
  FormalGateField,
} from '../../domain/types/attempt.js';
import {
  checkAttemptStateTransition,
  createDraftAttempt,
  isNonBlankAttemptInput,
} from '../../domain/types/attempt.js';
import type { MaybeProvided } from '../../domain/types/presence.js';
import type {
  ContentItem,
  DecisionInferenceContentItem,
  FactContentItem,
  InferenceContentItem,
} from '../../domain/types/source-type.js';
import type { PersistedContentItem } from '../../domain/types/content-item-record.js';
import type { AttemptDraftState, AttemptDraftStatePatch } from '../../domain/types/follow-up.js';
import { applyDraftStatePatch, createInitialDraftState, replaceDraftState } from '../../domain/types/follow-up.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import { newObjectId } from '../../domain/ids/object-id.js';
import type { AttemptSidecarRecord } from '../schema/attempt-record.js';
import {
  parseAttemptMarkdownFrontMatter,
  parseAttemptSidecarRecord,
  serializeAttemptMarkdown,
  serializeAttemptSidecar,
} from '../schema/attempt-record.js';
import {
  attemptMarkdownPath,
  attemptSidecarPath,
  attemptsDirectory,
  UNASSIGNED_PROJECT_BUCKET,
  PROJECTS_DIRECTORY,
  JSON_EXTENSION,
  MARKDOWN_EXTENSION,
} from '../schema/paths.js';
import { ensureProject } from '../schema/project-metadata.js';
import { WorkspaceSchemaError } from '../schema/schema-error.js';
import {
  readWorkspaceMetadata,
  registerProjectInIndex,
  ensureWorkspace,
} from '../schema/workspace-metadata.js';
import { baseNameOfWorkspacePath, extensionOfWorkspacePath } from '../storage.js';
import type { WorkspaceStorage } from '../storage.js';

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

export type AttemptRepositoryErrorCode =
  | 'ATTEMPT_NOT_FOUND'
  | 'STEP_ONE_GATE_DENIED'
  | 'FORMAL_GATE_DENIED'
  | 'NOT_A_CANONICAL_TRANSITION'
  | 'ARCHIVED_NOT_EDITABLE'
  /**
   * `Attempt Draft State` 是**只读留档**（docs/02 §C.5 硬规则 2）：`Formal` 化之后它保留但
   * 不再被修改，也**不再承载任何门槛作用**。技术错误码，不是产品状态、不是新 `Decision`。
   */
  | 'FORMAL_DRAFT_STATE_READONLY'
  /**
   * A generated / supplied `attempt_id` already exists in the workspace.
   * 🔴 §3.2 rule 1: ids are globally unique and never reused, so a create must fail
   *    instead of overwriting the stored record. Technical error code only - NOT a
   *    product state and NOT a new product Decision.
   */
  | 'DUPLICATE_OBJECT_ID';

/**
 * Repository-level failure. `layer = 'GATE'` means a §10.1 layer-1 outcome: it only
 * affects eligibility and MUST be surfaced to the user as guidance (with the missing
 * items), never as a system error or a data loss.
 */
export class AttemptRepositoryError extends Error {
  readonly code: AttemptRepositoryErrorCode;
  readonly layer: 'GATE' | 'RUNTIME';
  readonly attempt_id: string;
  readonly missing_fields: readonly FormalGateField[];

  constructor(
    code: AttemptRepositoryErrorCode,
    attempt_id: string,
    options: {
      readonly layer?: 'GATE' | 'RUNTIME';
      readonly message?: string;
      readonly missing_fields?: readonly FormalGateField[];
    } = {},
  ) {
    super(options.message ?? `Attempt repository error [${code}] for "${attempt_id}".`);
    this.name = 'AttemptRepositoryError';
    this.code = code;
    this.layer = options.layer ?? 'RUNTIME';
    this.attempt_id = attempt_id;
    this.missing_fields = options.missing_fields ?? [];
  }
}

/* ------------------------------------------------------------------ *
 * Requests / results
 * ------------------------------------------------------------------ */

export interface CreateAttemptRequest {
  readonly raw_text: string;
  /**
   * Optional LOGICAL project id. When omitted the record is stored in the internal
   * unassigned physical bucket and `Attempt.project_id` stays `null` - no project
   * metadata is created and no project is registered (§1.3).
   */
  readonly project_id?: string;
  readonly data_source_nature?: DataSourceNature;
  /** Injectable clock (ISO-8601). Defaults to the current time. */
  readonly created_at?: string;
}

/** Fields the repository is allowed to change. */
export interface AttemptPatch {
  readonly goal?: MaybeProvided<ContentItem>;
  readonly actual_attempt?: MaybeProvided<ContentItem>;
  readonly condition?: MaybeProvided<ContentItem>;
  readonly actual_result?: MaybeProvided<ContentItem>;
  readonly result_status?: MaybeProvided<InferenceContentItem>;
  readonly expected_result?: MaybeProvided<ContentItem>;
  readonly judgment_basis?: MaybeProvided<ContentItem>;
  readonly key_parameters?: readonly ContentItem[];
  readonly candidate_causes?: readonly DecisionInferenceContentItem[];
  readonly occurred_at?: MaybeProvided<FactContentItem>;
  readonly environment?: MaybeProvided<ContentItem>;
  readonly cost?: MaybeProvided<FactContentItem>;
  readonly user_note?: MaybeProvided<ContentItem>;
  readonly failure_tags?: readonly string[];
  /**
   * 🔴 `Attempt` sidecar 的 `content_items` 集合（docs/02 §C.4）——**非主字段路径**的内容条目
   *    （第 ② 步解析抽取结果、追问答案双层落库）。
   *    **替换语义**：省略即保持既有集合不变；调用方负责先 `mergeContentItems` 合并。
   * 🔴 它不是 Level A 的一部分，也不进入 `EvidenceRef` / `N_检索` / `N_引用`
   *    （docs/02 §C.5 硬规则 3）。
   */
  readonly content_items?: readonly PersistedContentItem[];
  /**
   * 🔴 `Attempt Draft State`（docs/02 §C.5，1:1 附属状态记录）—— 与内容一起原子写入，使
   *    「登记一个追问问题（内容条目 + 计数）」永远是一次写操作，不会出现计数与条目不一致的中间态。
   * 🔴 它**不是** `Attempt` 的成员：因此它在结构上不可能进入 Level A、`EvidenceRef`、
   *    `N_检索` / `N_引用`，也不可能成为 Experience Asset。
   * 🔴 写入时由 `applyDraftStatePatch` 归一化：计数器恒由 `asked_gap_set` 派生。
   */
  readonly draft_state?: AttemptDraftState;
  readonly state?: AttemptState;
  readonly archive_state?: ArchiveState;
  readonly updated_at?: string;
}

/** The physical location of an object, discovered from its CONTENT id. */
export interface AttemptFilePair {
  readonly attempt_id: ObjectId<'ATT'>;
  /** Physical bucket directory name - NOT necessarily a logical project id. */
  readonly storage_project_id: string;
  readonly sidecar_path: string;
  readonly markdown_path: string | null;
}

export interface AttemptRepository {
  createAttempt(request: CreateAttemptRequest): Promise<Attempt>;
  readAttempt(attempt_id: ObjectId<'ATT'>): Promise<Attempt | null>;
  findAttemptById(attempt_id: ObjectId<'ATT'>): Promise<Attempt | null>;
  updateAttempt(attempt_id: ObjectId<'ATT'>, patch: AttemptPatch): Promise<Attempt>;
  /**
   * 读取附属状态记录（docs/02 §C.5，1:1）。`null` 仅当该 `Attempt` 不存在。
   * 🔴 它是附属状态记录：不可被引用、不进第 ⑩ 步、不计入 `N_*`、不构成事实或经验对象。
   */
  readAttemptDraftState(attempt_id: ObjectId<'ATT'>): Promise<AttemptDraftState | null>;
  /**
   * 写入附属状态记录。计数器**不可**直接写 —— 它恒等于 `asked_gap_set.length`（见
   * `applyDraftStatePatch`）。
   * 🔴 归档记录拒绝写入（`ARCHIVED_NOT_EDITABLE`）；`Formal` 记录只读留档
   *    （`FORMAL_DRAFT_STATE_READONLY`，docs/02 §C.5 硬规则 2）。
   */
  updateAttemptDraftState(
    attempt_id: ObjectId<'ATT'>,
    patch: AttemptDraftStatePatch,
  ): Promise<AttemptDraftState>;
  /** 读取已持久化的内容条目集合（docs/02 §C.4）。 */
  readAttemptContentItems(attempt_id: ObjectId<'ATT'>): Promise<readonly PersistedContentItem[]>;
  listAttempts(): Promise<readonly Attempt[]>;
  /**
   * LOGICAL projects only - read from the `workspace.json` project index.
   * 🔴 Never a listing of the physical `projects/` directory: the internal unassigned
   *    bucket is not a project and MUST NOT appear here (§1.3).
   */
  listProjects(): Promise<readonly string[]>;
  /** Current physical paths, resolved by ID - never by file name. */
  resolveAttemptPaths(attempt_id: ObjectId<'ATT'>): Promise<AttemptFilePair | null>;
}

export interface AttemptRepositoryDeps {
  readonly storage: WorkspaceStorage;
  /** Injectable clock returning an ISO-8601 timestamp. */
  readonly now?: () => string;
  /** Injectable ID generator (deterministic tests). */
  readonly newAttemptId?: () => ObjectId<'ATT'>;
}

function pick<T>(value: T | undefined, fallback: T): T {
  return value === undefined ? fallback : value;
}

interface MutablePair {
  attempt_id: ObjectId<'ATT'>;
  storage_project_id: string;
  sidecar_path: string | null;
  markdown_path: string | null;
}

/**
 * §3.2 rule 1: an object id is globally unique. Two DIFFERENT physical objects
 * declaring the same internal id is workspace corruption and must fail explicitly
 * instead of one of them silently winning a `Map` slot.
 */
function assertNoDuplicateObjectId(
  existingPath: string | null,
  path: string,
  attempt_id: string,
  kind: 'sidecar' | 'markdown',
): void {
  if (existingPath === null || existingPath === path) {
    return;
  }
  throw new WorkspaceSchemaError(
    'DUPLICATE_OBJECT_ID',
    path,
    `Two different Attempt ${kind} objects declare the same internal attempt_id "${attempt_id}": ` +
      `"${existingPath}" and "${path}". Ids are globally unique and never reused (§3.2 rule 1), ` +
      'so this workspace cannot be resolved deterministically. No record was modified.',
  );
}

/**
 * Creates the repository.
 *
 * `storage` IS the authorization boundary: the repository can only ever touch the
 * directory tree the caller handed over. There is no ambient filesystem access and no
 * browser picker call anywhere in this layer (D-053 principle 7 / AC-127 / AC-128).
 */
export function createAttemptRepository(deps: AttemptRepositoryDeps): AttemptRepository {
  const storage = deps.storage;
  const now = deps.now ?? ((): string => new Date().toISOString());
  const newAttemptId = deps.newAttemptId ?? ((): ObjectId<'ATT'> => newObjectId('attempt'));

  async function listChildDirectories(path: string): Promise<readonly string[]> {
    if (!(await storage.exists(path))) {
      return [];
    }
    const entries = await storage.list(path);
    return entries.filter((entry) => entry.kind === 'directory').map((entry) => entry.name);
  }

  /**
   * §3.2 rule 1: an id that is already present must never be overwritten. Besides the
   * content index (which may not have seen a foreign / renamed file yet), the
   * conventional sidecar location is probed so a collision is detected even before
   * the new record's own file exists.
   */
  async function attemptSidecarExists(
    storageProjectId: string,
    attempt_id: ObjectId<'ATT'>,
  ): Promise<boolean> {
    return storage.exists(attemptSidecarPath(storageProjectId, attempt_id));
  }

  /**
   * Builds the content-derived index. Both members of the file pair are located by the
   * `attempt_id` carried in their CONTENT, so renamed / moved files are still found.
   */
  async function indexAttempts(): Promise<Map<ObjectId<'ATT'>, MutablePair>> {
    const index = new Map<ObjectId<'ATT'>, MutablePair>();
    const projectIds = await listChildDirectories(PROJECTS_DIRECTORY);

    for (const storageProjectId of projectIds) {
      const directory = attemptsDirectory(storageProjectId);
      if (!(await storage.exists(directory))) {
        continue;
      }
      const entries = await storage.list(directory);
      for (const entry of entries) {
        if (entry.kind !== 'file') {
          continue;
        }
        const path = `${directory}/${entry.name}`;
        const extension = extensionOfWorkspacePath(entry.name);

        if (extension === JSON_EXTENSION) {
          const text = await storage.readFile(path);
          let declaredType: unknown;
          try {
            declaredType = (JSON.parse(text) as Record<string, unknown>)['object_type'];
          } catch {
            continue; // not JSON at all: ignore foreign files
          }
          if (declaredType !== 'Attempt') {
            continue; // some other .json the user dropped into the workspace
          }
          /*
           * 🔴 The FULL document is parsed here, so a sidecar whose attached `content_items` /
           *    `draft_state` are inconsistent is reported as corruption during indexing instead of
           *    only on an explicit `readAttempt`.
           */
          const parsed = parseAttemptSidecarRecord(text, path).attempt;
          const current = index.get(parsed.attempt_id) ?? {
            attempt_id: parsed.attempt_id,
            storage_project_id: storageProjectId,
            sidecar_path: null,
            markdown_path: null,
          };
          // 🔴 Two sidecars declaring the same id is corruption, never a silent overwrite.
          assertNoDuplicateObjectId(current.sidecar_path, path, parsed.attempt_id, 'sidecar');
          current.sidecar_path = path;
          index.set(parsed.attempt_id, current);
          continue;
        }

        if (extension === MARKDOWN_EXTENSION) {
          const text = await storage.readFile(path);
          const frontMatter = parseAttemptMarkdownFrontMatter(text);
          if (frontMatter === null) {
            continue; // not an Attempt markdown document
          }
          const current = index.get(frontMatter.attempt_id) ?? {
            attempt_id: frontMatter.attempt_id,
            storage_project_id: storageProjectId,
            sidecar_path: null,
            markdown_path: null,
          };
          // 🔴 Two markdown bodies declaring the same id is corruption as well.
          assertNoDuplicateObjectId(
            current.markdown_path,
            path,
            frontMatter.attempt_id,
            'markdown',
          );
          current.markdown_path = path;
          index.set(frontMatter.attempt_id, current);
        }
      }
    }

    return index;
  }

  async function readRecordFromIndex(
    attempt_id: ObjectId<'ATT'>,
    index: ReadonlyMap<ObjectId<'ATT'>, MutablePair>,
  ): Promise<AttemptSidecarRecord | null> {
    const pair = index.get(attempt_id);
    if (pair === undefined || pair.sidecar_path === null) {
      return null;
    }
    const record = parseAttemptSidecarRecord(
      await storage.readFile(pair.sidecar_path),
      pair.sidecar_path,
    );
    // Defence in depth: the identity read from the content must match the query.
    return record.attempt.attempt_id === attempt_id ? record : null;
  }

  async function readAttemptFromIndex(
    attempt_id: ObjectId<'ATT'>,
    index: ReadonlyMap<ObjectId<'ATT'>, MutablePair>,
  ): Promise<Attempt | null> {
    return (await readRecordFromIndex(attempt_id, index))?.attempt ?? null;
  }

  async function persist(record: AttemptSidecarRecord, pair: AttemptFilePair): Promise<void> {
    await storage.writeFile(
      pair.sidecar_path,
      serializeAttemptSidecar(record.attempt, {
        content_items: record.content_items,
        draft_state: record.draft_state,
      }),
    );
    const markdownPath =
      pair.markdown_path ??
      attemptMarkdownPath(pair.storage_project_id, record.attempt.attempt_id);
    await storage.writeFile(markdownPath, serializeAttemptMarkdown(record.attempt));
  }

  return {
    async createAttempt(request: CreateAttemptRequest): Promise<Attempt> {
      if (!isNonBlankAttemptInput(request.raw_text)) {
        throw new AttemptRepositoryError('STEP_ONE_GATE_DENIED', '(new)', {
          layer: 'GATE',
          message:
            'Step ① gate: an Attempt Draft requires non-empty, non-whitespace input (D-047 / AC-87). Show an entry hint instead of an error.',
        });
      }

      /*
       * §1.3: `Project` may be omitted. An omitted project is stored in an internal
       * physical bucket and produces NO project metadata and NO project index entry -
       * the user never created a project and must not see one (§1.3 / D-019 / D-045).
       * Only a real `project_id` creates / registers real project metadata.
       */
      const storageProjectId = request.project_id ?? UNASSIGNED_PROJECT_BUCKET;
      await ensureWorkspace(storage);
      if (request.project_id !== undefined) {
        await ensureProject(storage, storageProjectId, { name: null });
        await registerProjectInIndex(storage, {
          project_id: storageProjectId,
          name: null,
        });
      }

      const attemptId = newAttemptId();
      const createdAt = request.created_at ?? now();

      /*
       * §3.2 rule 1: ids are globally unique and never reused. A colliding generated id
       * (e.g. an injected deterministic generator) must FAIL instead of overwriting a
       * stored record.
       */
      const existing = await indexAttempts();
      if (existing.has(attemptId) || (await attemptSidecarExists(storageProjectId, attemptId))) {
        throw new AttemptRepositoryError('DUPLICATE_OBJECT_ID', attemptId, {
          message:
            'An Attempt with this object id already exists in the workspace; ids are globally ' +
            'unique and are never reused, so the stored record was left untouched (§3.2 rule 1).',
        });
      }

      const attempt = createDraftAttempt({
        attempt_id: attemptId,
        raw_text: request.raw_text,
        created_at: createdAt,
        project_id: request.project_id ?? null,
        data_source_nature: request.data_source_nature ?? 'field_record',
      });

      const pair: AttemptFilePair = {
        attempt_id: attempt.attempt_id,
        storage_project_id: storageProjectId,
        sidecar_path: attemptSidecarPath(storageProjectId, attempt.attempt_id),
        markdown_path: attemptMarkdownPath(storageProjectId, attempt.attempt_id),
      };
      /*
       * 第 ① 步同时建立 1:1 附属状态记录（docs/02 §C.5）：尚未解析、尚未提问、无已放弃缺口。
       * 🔴 它随 sidecar 落盘，因此刷新 / service 重建后追问计数不会归零（TC-29 / AC-Q06-1）。
       */
      await persist(
        {
          attempt,
          content_items: [],
          draft_state: createInitialDraftState(attempt.attempt_id),
        },
        pair,
      );
      return attempt;
    },

    async readAttempt(attempt_id: ObjectId<'ATT'>): Promise<Attempt | null> {
      return readAttemptFromIndex(attempt_id, await indexAttempts());
    },

    async findAttemptById(attempt_id: ObjectId<'ATT'>): Promise<Attempt | null> {
      return readAttemptFromIndex(attempt_id, await indexAttempts());
    },

    async resolveAttemptPaths(attempt_id: ObjectId<'ATT'>): Promise<AttemptFilePair | null> {
      const pair = (await indexAttempts()).get(attempt_id);
      if (pair === undefined || pair.sidecar_path === null) {
        return null;
      }
      return {
        attempt_id: pair.attempt_id,
        storage_project_id: pair.storage_project_id,
        sidecar_path: pair.sidecar_path,
        markdown_path: pair.markdown_path,
      };
    },

    async updateAttempt(attempt_id: ObjectId<'ATT'>, patch: AttemptPatch): Promise<Attempt> {
      const index = await indexAttempts();
      const pair = await resolveFromIndex(attempt_id, index);
      const currentRecord = await readRecordFromIndex(attempt_id, index);
      if (currentRecord === null) {
        throw new AttemptRepositoryError('ATTEMPT_NOT_FOUND', attempt_id);
      }
      const current = currentRecord.attempt;

      /* §7.3 rule 2 / AC-72: an archived record is not editable - un-archive first. */
      const archiveOnlyChange =
        Object.keys(patch).every((key) => key === 'archive_state' || key === 'updated_at');
      if (current.archive_state === 'archived' && !archiveOnlyChange) {
        throw new AttemptRepositoryError('ARCHIVED_NOT_EDITABLE', attempt_id, {
          layer: 'GATE',
          message:
            'An archived Attempt is not editable; un-archive it first (contract §7.3 rule 2 / AC-72).',
        });
      }

      /** The patched content, before the clock is touched (a denial must cost nothing). */
      const merged: Attempt = {
        ...current,
        goal: pick(patch.goal, current.goal),
        actual_attempt: pick(patch.actual_attempt, current.actual_attempt),
        condition: pick(patch.condition, current.condition),
        actual_result: pick(patch.actual_result, current.actual_result),
        result_status: pick(patch.result_status, current.result_status),
        expected_result: pick(patch.expected_result, current.expected_result),
        judgment_basis: pick(patch.judgment_basis, current.judgment_basis),
        key_parameters: pick(patch.key_parameters, current.key_parameters),
        candidate_causes: pick(patch.candidate_causes, current.candidate_causes),
        occurred_at: pick(patch.occurred_at, current.occurred_at),
        environment: pick(patch.environment, current.environment),
        cost: pick(patch.cost, current.cost),
        user_note: pick(patch.user_note, current.user_note),
        failure_tags: pick(patch.failure_tags, current.failure_tags),
        state: pick(patch.state, current.state),
        archive_state: pick(patch.archive_state, current.archive_state),
      };

      /*
       * §2.1 / AC-Q06-5: Draft -> Formal requires an explicit, gate-satisfying action.
       * The gate is evaluated on the FULLY PATCHED record, so supplying the four
       * prerequisites together with the promotion in one call is legal - while a missing
       * prerequisite is still denied and leaves the record as a Draft.
       */
      if (merged.state !== current.state) {
        const check = checkAttemptStateTransition(
          { ...merged, state: current.state },
          merged.state,
        );
        if (!check.allowed) {
          throw new AttemptRepositoryError(
            check.code === 'FORMAL_GATE_UNSATISFIED'
              ? 'FORMAL_GATE_DENIED'
              : 'NOT_A_CANONICAL_TRANSITION',
            attempt_id,
            {
              layer: 'GATE',
              message: check.reason,
              missing_fields: check.missing_fields,
            },
          );
        }
      }

      const next: Attempt = { ...merged, updated_at: patch.updated_at ?? now() };

      /*
       * 🔴 附属记录随内容一起写回：省略 `content_items` 保持既有集合；
       *    `draft_state` **永不**被内容补丁删除（docs/02 §C.5 硬规则 2：`Formal` 后仍保留），
       *    且写入时被归一化 —— 计数器恒等于 `asked_gap_set.length`。
       */
      await persist(
        {
          attempt: next,
          content_items: pick(patch.content_items, currentRecord.content_items),
          draft_state:
            patch.draft_state === undefined
              ? currentRecord.draft_state
              : replaceDraftState(currentRecord.draft_state, {
                  parse_state: patch.draft_state.parse_state,
                  asked_gap_set: patch.draft_state.asked_gap_set,
                  abandoned_gap_set: patch.draft_state.abandoned_gap_set,
                  gap_priority_hint: patch.draft_state.gap_priority_hint,
                }),
        },
        pair,
      );
      return next;
    },

    async readAttemptDraftState(
      attempt_id: ObjectId<'ATT'>,
    ): Promise<AttemptDraftState | null> {
      return (await readRecordFromIndex(attempt_id, await indexAttempts()))?.draft_state ?? null;
    },

    async updateAttemptDraftState(
      attempt_id: ObjectId<'ATT'>,
      patch: AttemptDraftStatePatch,
    ): Promise<AttemptDraftState> {
      const index = await indexAttempts();
      const pair = await resolveFromIndex(attempt_id, index);
      const currentRecord = await readRecordFromIndex(attempt_id, index);
      if (currentRecord === null) {
        throw new AttemptRepositoryError('ATTEMPT_NOT_FOUND', attempt_id);
      }

      /* §7.3 rule 2 / AC-72: an archived record is not editable - un-archive first. */
      if (currentRecord.attempt.archive_state === 'archived') {
        throw new AttemptRepositoryError('ARCHIVED_NOT_EDITABLE', attempt_id, {
          layer: 'GATE',
          message:
            'An archived Attempt is not editable; un-archive it first (contract §7.3 rule 2 / AC-72).',
        });
      }

      /*
       * docs/02 §C.5 硬规则 2：`Formal` 化后该记录**保留但不删除**（只读留档），
       * 且**不再承载任何门槛作用**。因此对 `Formal` 记录拒绝写入，而不是静默丢弃。
       */
      if (currentRecord.attempt.state === 'Formal') {
        throw new AttemptRepositoryError('FORMAL_DRAFT_STATE_READONLY', attempt_id, {
          layer: 'GATE',
          message:
            'After a Formal Attempt is saved its attached draft state is kept as a read-only archive (docs/02 §C.5 rule 2); it is no longer modified and no longer carries any threshold effect.',
        });
      }

      const next = applyDraftStatePatch(currentRecord.draft_state, patch);
      await persist({ ...currentRecord, draft_state: next }, pair);
      return next;
    },

    async readAttemptContentItems(
      attempt_id: ObjectId<'ATT'>,
    ): Promise<readonly PersistedContentItem[]> {
      return (await readRecordFromIndex(attempt_id, await indexAttempts()))?.content_items ?? [];
    },

    async listAttempts(): Promise<readonly Attempt[]> {
      const index = await indexAttempts();
      const attempts: Attempt[] = [];
      for (const attempt_id of index.keys()) {
        const attempt = await readAttemptFromIndex(attempt_id, index);
        if (attempt !== null) {
          attempts.push(attempt);
        }
      }
      return attempts.sort((left, right) => {
        if (left.created_at !== right.created_at) {
          return left.created_at < right.created_at ? -1 : 1;
        }
        return left.attempt_id < right.attempt_id ? -1 : 1;
      });
    },

    /**
     * LOGICAL projects, read from the `workspace.json` project index (§1.3).
     * 🔴 Deliberately NOT a listing of the physical `projects/` directory: the internal
     *    unassigned bucket is a storage-layout detail and must never surface as a
     *    project the user did not create (D-019 / D-045).
     */
    async listProjects(): Promise<readonly string[]> {
      const metadata = await readWorkspaceMetadata(storage);
      if (metadata === null) {
        return [];
      }
      return metadata.projects.map((entry) => entry.project_id);
    },
  };

  async function resolveFromIndex(
    attempt_id: ObjectId<'ATT'>,
    index: ReadonlyMap<ObjectId<'ATT'>, MutablePair>,
  ): Promise<AttemptFilePair> {
    const pair = index.get(attempt_id);
    if (pair === undefined || pair.sidecar_path === null) {
      throw new AttemptRepositoryError('ATTEMPT_NOT_FOUND', attempt_id);
    }
    return {
      attempt_id: pair.attempt_id,
      storage_project_id: pair.storage_project_id,
      sidecar_path: pair.sidecar_path,
      markdown_path: pair.markdown_path,
    };
  }
}

/** Exposed for tests / diagnostics: the last path segment of a discovered path. */
export function fileNameOf(path: string): string {
  return baseNameOfWorkspacePath(path);
}
