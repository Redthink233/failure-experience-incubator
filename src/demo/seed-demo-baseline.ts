/**
 * `M16` ｜ **`seed_demo_baseline`** —— 幂等地写入 8 条 `Formal Attempt` 的 Demo 基线。
 *
 * 语义（任务书 §18 / doc §P.1「seed 幂等」/「reset 方案」）:
 *   连续执行两次 `seed`，结果仍然是**恰好 8 条** Demo 记录，且**对象 ID 完全相同**。
 *
 * 实现方式：**静态定义 + 固定 ObjectId + 「存在则复用 / 不存在则创建」**。
 * 🔴 不新增任何「业务层 demo key」字段：幂等靠的是**冻结的对象 ID 本身**（`§3.2` 身份来自内容），
 *    不是第二套标记体系。
 * 🔴 记录一律走**真实的 `AttemptRepository`**（`createAttempt` → `updateAttempt`），
 *    因此 `Formal` 门槛、`Draft → Formal` 合法性、sidecar 一致性（`content_items` /
 *    `draft_state`）全部由生产代码保证 —— seed **没有**绕过 `Formal` 门槛（doc §J.4）。
 *
 * 🔴 seed 只写 **`Attempt` 层**：不预置 `Retrieval Derivation` / `Insight` / `Hypothesis` /
 *    `EvidenceRef` / `N_检索` / `N_引用` / `matched result` / `comparison result`。
 *    本模块是 `providerless` 的：它**不接收** provider / credential，也**不调用**任何模型。
 *
 * Framework-neutral 的反面：本模块依赖调用方注入的 `WorkspaceStorage`，自身不做 I/O。
 */

import type { Attempt } from '../domain/types/attempt.js';
import type { ObjectId } from '../domain/ids/object-id.js';
import { provided, unprovided } from '../domain/types/presence.js';
import { decisionInferenceItem, factItem } from '../domain/types/source-type.js';
import type { WorkspaceStorage } from '../workspace/storage.js';
import {
  createAttemptRepository,
  type AttemptRepository,
} from '../workspace/repository/attempt-repository.js';
import { ensureProject } from '../workspace/schema/project-metadata.js';
import {
  ensureWorkspace,
  readWorkspaceMetadata,
  registerProjectInIndex,
} from '../workspace/schema/workspace-metadata.js';
import { writeDemoWorkspaceMarker } from './demo-workspace-marker.js';
import {
  DEMO_ATTEMPTS,
  DEMO_ATTEMPT_COUNT,
  DEMO_PROJECTS,
  DEMO_WORKSPACE_ID,
  DEMO_WORKSPACE_NAME,
  type DemoAttemptDefinition,
} from './demo-baseline-definition.js';

/**
 * 工作空间元数据的固定创建时间 —— 让「首次 seed」的结果**逐字节可复现**。
 * 🔴 这是技术元数据（`schema_version` 同级），不是产品版本系统（`AC-122`）。
 */
export const DEMO_WORKSPACE_CREATED_AT = '2026-08-01T00:00:00.000Z';

/** 同样的理由，用于 `project.json`。 */
const DEMO_PROJECT_CREATED_AT = DEMO_WORKSPACE_CREATED_AT;

export interface SeedDemoBaselineResult {
  readonly workspace_id: ObjectId<'WS'>;
  readonly workspace_name: string;
  /** 八条 Demo 记录，按 fixture 键顺序（`DEMO-01` … `DEMO-08`）。 */
  readonly attempts: readonly Attempt[];
  /** 本次真正新建的记录数。 */
  readonly created: number;
  /** 本次发现已存在且与定义一致、因而原样保留的记录数。 */
  readonly reused: number;
}

export type SeedDemoBaselineOutcome =
  | { readonly kind: 'seeded'; readonly result: SeedDemoBaselineResult }
  | {
      /** 目标工作空间不是 Demo 工作空间（既有 `workspace_id` 不是冻结的 Demo ID）。 */
      readonly kind: 'refused';
      readonly code: 'DEMO_SEED_FOREIGN_WORKSPACE';
      readonly reason: string;
    }
  | {
      /** 某条 fixture 位已被一条**语义不同**的记录占用 —— 拒绝覆盖，绝不改写历史。 */
      readonly kind: 'conflict';
      readonly code: 'DEMO_SEED_CONFLICT';
      readonly fixture_key: string;
      readonly reason: string;
    };

export interface SeedDemoBaselineDeps {
  readonly storage: WorkspaceStorage;
  /** 可注入时钟；seed 对每条记录都显式给出时间戳，因此它通常不会被用到。 */
  readonly now?: () => string;
}

/** Outcome of one fixture slot. */
type SlotOutcome =
  | { readonly kind: 'ok'; readonly attempt: Attempt; readonly created: boolean }
  | { readonly kind: 'conflict'; readonly reason: string };

function contentItemId(attempt_id: string, field: string): string {
  return `${attempt_id}:${field}`;
}

/**
 * Does an already-persisted record still agree with the frozen definition?
 *
 * 🔴 A disagreement is a **conflict**, not something to silently overwrite: the seed tool is a
 *    setup action, never a history rewriter. The operator's remedy is `reset_demo_baseline`.
 */
function matchesDefinition(attempt: Attempt, fixture: DemoAttemptDefinition): boolean {
  const levelA = (item: { readonly presence_state: string; readonly item?: { readonly value: string } }): string | null =>
    item.presence_state === 'present' ? (item.item?.value ?? null) : null;

  return (
    attempt.state === 'Formal' &&
    attempt.archive_state === fixture.archive_state &&
    attempt.data_source_nature === 'demo_sample' &&
    attempt.project_id === fixture.project_id &&
    levelA(attempt.goal) === fixture.goal &&
    levelA(attempt.actual_attempt) === fixture.actual_attempt &&
    levelA(attempt.condition) === fixture.condition &&
    levelA(attempt.actual_result) === fixture.actual_result
  );
}

/**
 * Seeds one fixture slot through the REAL repository.
 *
 * 🔴 The `Draft` is created first and then promoted, so the `Formal` gate really runs
 *    (`goal` + `actual_attempt` + `actual_result` + a user-accepted `result_status`).
 *    The four Level A values are stored as user `Fact` items: the fixture definition *is* the
 *    demo record's own declared content - no model ever parsed it, so labelling it `Extraction`
 *    would be exactly the "pretend an LLM output existed" this task forbids (task §15).
 */
async function seedOneSlot(
  repository: AttemptRepository,
  fixture: DemoAttemptDefinition,
): Promise<SlotOutcome> {
  const existing = await repository.readAttempt(fixture.attempt_id);
  if (existing !== null) {
    return matchesDefinition(existing, fixture)
      ? { kind: 'ok', attempt: existing, created: false }
      : {
          kind: 'conflict',
          reason:
            `The ${fixture.fixture_key} slot is occupied by a record whose persisted content no longer ` +
            'matches the frozen demo definition. The seed tool never overwrites stored history; run ' +
            '`reset_demo_baseline` instead.',
        };
  }

  const attempt_id = fixture.attempt_id;
  await repository.createAttempt({
    raw_text: fixture.raw_text,
    project_id: fixture.project_id,
    data_source_nature: 'demo_sample',
    created_at: fixture.created_at,
  });

  const formalized = await repository.updateAttempt(attempt_id, {
    goal: provided(factItem(contentItemId(attempt_id, 'goal'), fixture.goal)),
    actual_attempt: provided(
      factItem(contentItemId(attempt_id, 'actual_attempt'), fixture.actual_attempt),
    ),
    condition:
      fixture.condition === null
        ? unprovided()
        : provided(factItem(contentItemId(attempt_id, 'condition'), fixture.condition)),
    actual_result: provided(
      factItem(contentItemId(attempt_id, 'actual_result'), fixture.actual_result),
    ),
    /*
     * 🔴 A `Formal` record needs a result status the USER accepted (`D-012` / §4.3). The demo
     *    fixture declares its history already settled, so it is stored as an ACCEPTED decision
     *    inference - the same shape a real user's confirmation produces.
     */
    result_status: provided(
      decisionInferenceItem(
        contentItemId(attempt_id, 'result_status'),
        fixture.result_status,
        'accepted',
      ),
    ),
    state: 'Formal',
    updated_at: fixture.updated_at,
  });

  if (fixture.archive_state === 'archived') {
    /* §7.3 rule 2: archiving is a state change on an otherwise untouched record - never a deletion. */
    return {
      kind: 'ok',
      attempt: await repository.updateAttempt(attempt_id, {
        archive_state: 'archived',
        updated_at: fixture.updated_at,
      }),
      created: true,
    };
  }

  return { kind: 'ok', attempt: formalized, created: true };
}

/**
 * Writes (or re-confirms) the frozen demo baseline in the supplied workspace.
 *
 * Idempotent: a second call creates nothing and returns the SAME eight object IDs.
 * Fail-closed on a foreign workspace: an existing `workspace.json` with a different
 * `workspace_id` is refused instead of being adopted, so the tool can never sprinkle demo
 * records into someone's real workspace.
 */
export async function seedDemoBaseline(
  deps: SeedDemoBaselineDeps,
): Promise<SeedDemoBaselineOutcome> {
  const storage = deps.storage;

  const before = await readWorkspaceMetadata(storage);
  if (before !== null && before.workspace_id !== DEMO_WORKSPACE_ID) {
    return {
      kind: 'refused',
      code: 'DEMO_SEED_FOREIGN_WORKSPACE',
      reason:
        `The target workspace already declares workspace_id "${before.workspace_id}", which is not the ` +
        'demo baseline workspace. Seed only ever runs against the demo workspace.',
    };
  }

  await ensureWorkspace(storage, {
    workspace_id: DEMO_WORKSPACE_ID,
    name: DEMO_WORKSPACE_NAME,
    created_at: DEMO_WORKSPACE_CREATED_AT,
  });

  for (const project of DEMO_PROJECTS) {
    await ensureProject(storage, project.project_id, {
      name: project.name,
      created_at: DEMO_PROJECT_CREATED_AT,
    });
    await registerProjectInIndex(storage, {
      project_id: project.project_id,
      name: project.name,
    });
  }

  /*
   * ONE repository, with the id generator replaced by a slot the seed fills per fixture.
   * 🔴 The generated id must never be random here: identity is what makes a repeated seed idempotent.
   */
  let next_id: ObjectId<'ATT'> | null = null;
  const repository = createAttemptRepository({
    storage,
    ...(deps.now === undefined ? {} : { now: deps.now }),
    newAttemptId: (): ObjectId<'ATT'> => {
      if (next_id === null) {
        throw new Error('seed_demo_baseline: no fixture id was prepared for this creation.');
      }
      const prepared = next_id;
      next_id = null;
      return prepared;
    },
  });

  const attempts: Attempt[] = [];
  let created = 0;
  let reused = 0;

  for (const fixture of DEMO_ATTEMPTS) {
    next_id = fixture.attempt_id;
    let outcome: SlotOutcome;
    try {
      outcome = await seedOneSlot(repository, fixture);
    } catch (error) {
      return {
        kind: 'conflict',
        code: 'DEMO_SEED_CONFLICT',
        fixture_key: fixture.fixture_key,
        reason: `Writing the ${fixture.fixture_key} slot failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      };
    }
    if (outcome.kind === 'conflict') {
      return {
        kind: 'conflict',
        code: 'DEMO_SEED_CONFLICT',
        fixture_key: fixture.fixture_key,
        reason: outcome.reason,
      };
    }
    attempts.push(outcome.attempt);
    if (outcome.created) {
      created += 1;
    } else {
      reused += 1;
    }
  }

  /* The marker is the operator-level "this directory is the demo baseline" proof (reset reads it). */
  await writeDemoWorkspaceMarker(storage);

  return {
    kind: 'seeded',
    result: {
      workspace_id: DEMO_WORKSPACE_ID,
      workspace_name: DEMO_WORKSPACE_NAME,
      attempts,
      created,
      reused,
    },
  };
}

/**
 * Reads the eight demo records back out of a workspace, in fixture order.
 *
 * 🔴 Deliberately NOT a `listAttempts()` filter by `data_source_nature`: the set is identified by
 *    the **frozen object IDs**, so a live record that happens to be demo-labelled can never be
 *    mistaken for a baseline record.
 */
export async function readDemoBaseline(
  storage: WorkspaceStorage,
): Promise<readonly Attempt[]> {
  const repository = createAttemptRepository({ storage });
  const found: Attempt[] = [];
  for (const fixture of DEMO_ATTEMPTS) {
    const attempt = await repository.readAttempt(fixture.attempt_id);
    if (attempt !== null) {
      found.push(attempt);
    }
  }
  return found;
}

/** How many of the eight frozen demo records currently exist in this workspace. */
export async function countDemoBaselineRecords(storage: WorkspaceStorage): Promise<number> {
  return (await readDemoBaseline(storage)).length;
}

/** The frozen fixture count - exported so tests and the CLI never hardcode `8`. */
export const DEMO_BASELINE_SIZE = DEMO_ATTEMPT_COUNT;

export type { DemoAttemptDefinition };
