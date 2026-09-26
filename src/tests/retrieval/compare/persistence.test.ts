/**
 * S01-03 ｜ Retrieval Derivation persistence (P1–P7) and the strict document reader.
 *
 * Canonical acceptance points: `AC-122` (`D-040`/`D-051`: no version system anywhere), `AC-130`
 * (`D-059`: Local Workspace Files, no database), `AC-76` (V1 has no physical delete), `AC-79`/`AC-81`
 * (`D-045`: retrieval is triggered by an explicit action, never by a background job), `AC-85`/`AC-86`
 * (`D-046`: the full candidate set is what is stored).
 *
 * 🔴 Every assertion here is about the APPLICATION's behaviour. No model was called: the judge
 *    double is a hand-written `NOT_A_REAL_LLM_OUTPUT` fixture.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeHarness } from './harness.js';
import type { FakeReply, JudgeCall, RetrievalHarness } from './harness.js';
import { isRetrievalDerivationId } from '../../../retrieval/compare/derivation-id.js';
import {
  parseRetrievalDerivation,
  retrievalDerivationPath,
  serializeRetrievalDerivation,
} from '../../../retrieval/compare/persistence.js';
import { RETRIEVALS_DIRECTORY } from '../../../retrieval/compare/persistence.js';
import type {
  RetrievalDerivationRecord,
  RetrievalRuntimeFailure,
} from '../../../retrieval/compare/types.js';
import { WorkspaceSchemaError } from '../../../workspace/schema/schema-error.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';

const ID_SOURCE = 'ATT_0000000000000000000000000S';

function att(value: string): ObjectId<'ATT'> {
  return value as ObjectId<'ATT'>;
}

/** A harness whose judge can be switched to "provider unreachable" mid-test. */
function switchableHarness(): { readonly h: RetrievalHarness; setFailing(value: boolean): void } {
  const state = { failing: false };
  const h = makeHarness((call: JudgeCall): FakeReply => {
    if (state.failing) {
      return {
        kind: 'error',
        error: {
          code: 'PROVIDER_TIMEOUT',
          failure_kind: 'timeout',
          message: 'The provider request timed out.',
          retryable: true,
          path: 'browser_direct',
          http_status: null,
          target_block_reason: null,
        },
      };
    }
    return {
      kind: 'structured',
      value: {
        verdict: call.source_value === call.candidate_value ? 'matched' : 'compared_not_matched',
        reason: 'NOT_A_REAL_LLM_OUTPUT',
      },
    };
  });
  return { h, setFailing: (value) => (state.failing = value) };
}

async function seedPyramid(h: RetrievalHarness, extra: number): Promise<void> {
  // Source needs all four dimensions present so a judge is required for a differing approach.
  await h.seed({ goal: 'G', approach: 'S1', condition: 'C1', result: 'R1', attempt_id: ID_SOURCE });
  for (let index = 0; index < extra; index += 1) {
    await h.seed({ goal: 'G', approach: `S${index + 2}`, condition: 'C2', result: 'R2' });
  }
}

async function runOnce(h: RetrievalHarness): Promise<RetrievalDerivationRecord> {
  const outcome = await h.service.runRetrievalForFormalAttempt({ source_attempt_id: att(ID_SOURCE) });
  assert.equal(outcome.kind, 'completed');
  if (outcome.kind !== 'completed') {
    throw new Error('unreachable');
  }
  return outcome.derivation;
}

describe('S01-03｜Retrieval Derivation persistence', () => {
  it('AC-130: 首次成功检索即保存当前有效 Derivation（无数据库）', async () => {
    const { h } = switchableHarness();
    await seedPyramid(h, 1);

    const record = await runOnce(h);
    assert.equal(record.n_retrieval, 1);
    assert.ok(h.rawDerivationFile(ID_SOURCE) !== undefined);
    assert.deepEqual([...h.retrievalFiles()], [retrievalDerivationPath(ID_SOURCE)]);
  });

  it('AC-85: reload 后 N / 候选 / 顺序 / matched / uncompared 完全相同（不重跑 LLM）', async () => {
    const { h } = switchableHarness();
    await seedPyramid(h, 3);
    const before = await runOnce(h);

    // 全新 service + 全新 repository + 同一份持久化 workspace。
    const reloaded = h.reopen();
    const after = await reloaded.readCurrentDerivation(att(ID_SOURCE));
    assert.ok(after !== null);
    const restored = after as RetrievalDerivationRecord;

    assert.equal(restored.n_retrieval, before.n_retrieval);
    assert.deepEqual(
      [...restored.candidate_entries.map((entry) => entry.candidate_attempt_id)],
      [...before.candidate_entries.map((entry) => entry.candidate_attempt_id)],
    );
    assert.deepEqual([...restored.hit_level_a_dimensions], [...before.hit_level_a_dimensions]);
    assert.deepEqual([...restored.uncompared_dimensions], [...before.uncompared_dimensions]);
    assert.equal(JSON.stringify(restored), JSON.stringify(before));
  });

  it('AC-122: rerun 成功整体替换当前 Derivation，且不建立任何版本列表', async () => {
    const { h } = switchableHarness();
    await seedPyramid(h, 1);
    const first = await runOnce(h);
    await h.seed({ goal: 'G', approach: 'S9', condition: 'C9', result: 'R9' });
    const second = await runOnce(h);

    assert.notEqual(second.derivation_id, first.derivation_id);
    assert.equal(second.n_retrieval, 2);
    // 仍然只有一个当前 Derivation 文件：替换而不是追加。
    assert.deepEqual([...h.retrievalFiles()], [retrievalDerivationPath(ID_SOURCE)]);
    const raw = h.rawDerivationFile(ID_SOURCE) ?? '';
    for (const forbidden of ['version', 'revision', 'rollback', 'diff', 'history']) {
      assert.equal(raw.includes(`"${forbidden}"`), false, `${forbidden} must not be persisted`);
    }
  });

  it('AC-81: rerun 运行时失败不得覆盖旧的当前 Derivation', async () => {
    const { h, setFailing } = switchableHarness();
    await seedPyramid(h, 1);
    const before = await runOnce(h);

    setFailing(true);
    const outcome = await h.service.runRetrievalForFormalAttempt({
      source_attempt_id: att(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    const failure: RetrievalRuntimeFailure = outcome.failure;
    assert.equal(failure.kind, 'runtime_incomplete');
    assert.equal(failure.local_code, null);
    assert.equal(failure.ai_error?.code, 'PROVIDER_TIMEOUT');
    assert.equal(failure.retryable, true);
    assert.equal(outcome.previous_derivation_preserved, true);

    const after = await h.reopen().readCurrentDerivation(att(ID_SOURCE));
    assert.equal(JSON.stringify(after), JSON.stringify(before));
  });

  it('IMPLEMENTATION INVARIANT（§26）: 从未成功过时运行时失败不留任何 Derivation', async () => {
    const { h, setFailing } = switchableHarness();
    await seedPyramid(h, 1);
    setFailing(true);

    const outcome = await h.service.runRetrievalForFormalAttempt({
      source_attempt_id: att(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.previous_derivation_preserved, false);
    assert.equal(await h.reopen().readCurrentDerivation(att(ID_SOURCE)), null);
    assert.deepEqual([...h.retrievalFiles()], []);
  });

  it('IMPLEMENTATION INVARIANT（§25 / AC-122）: derivation_id 唯一、稳定、非位置型', async () => {
    const { h } = switchableHarness();
    await seedPyramid(h, 1);
    const first = await runOnce(h);
    assert.ok(isRetrievalDerivationId(first.derivation_id, ID_SOURCE));
    // 位置型 / 计数型身份必须被拒绝：既不是三段式，也不是一个生成的 26 字符主体。
    for (const positional of [
      `${ID_SOURCE}:retrieval:0`,
      `${ID_SOURCE}:retrieval:1`,
      `${ID_SOURCE}:retrieval:12`,
      `${ID_SOURCE}:0`,
      '0',
      'index:0',
    ]) {
      assert.equal(isRetrievalDerivationId(positional, ID_SOURCE), false, positional);
    }
    // 身份必须属于该源记录。
    assert.equal(
      isRetrievalDerivationId(`${ID_SOURCE}:retrieval:0000000000000000000000000A`, 'ATT_other'),
      false,
    );
    // 重新检索产生新的身份，而不是复用旧身份。
    const second = await runOnce(h);
    assert.notEqual(first.derivation_id, second.derivation_id);
    assert.equal(await h.reopen().readCurrentDerivation(att(ID_SOURCE)).then((r) => r?.derivation_id), second.derivation_id);
  });

  it('IMPLEMENTATION INVARIANT（§29）: 同一源记录出现两条当前 Derivation 即显式失败', async () => {
    const { h } = switchableHarness();
    await seedPyramid(h, 1);
    const record = await runOnce(h);
    await h.storage.writeFile(
      `${RETRIEVALS_DIRECTORY}/renamed-copy.json`,
      serializeRetrievalDerivation(record),
    );

    await assert.rejects(
      () => h.derivations.readCurrent(att(ID_SOURCE)),
      (error: unknown) => error instanceof WorkspaceSchemaError && error.code === 'DUPLICATE_OBJECT_ID',
    );
  });

  it('AC-122: 文档读取严格 — 计数不一致 / 位置型身份 / fold hint 不一致一律拒绝', async () => {
    const { h } = switchableHarness();
    await seedPyramid(h, 2);
    const record = await runOnce(h);
    const document = JSON.parse(serializeRetrievalDerivation(record)) as Record<string, unknown>;

    const withField = (key: string, value: unknown): string =>
      JSON.stringify({ ...document, [key]: value });

    assert.throws(
      () => parseRetrievalDerivation(withField('n_retrieval', record.n_retrieval + 1)),
      (error: unknown) => error instanceof WorkspaceSchemaError,
    );
    assert.throws(
      () => parseRetrievalDerivation(withField('derivation_id', `${ID_SOURCE}:retrieval:0`)),
      (error: unknown) => error instanceof WorkspaceSchemaError,
    );
    assert.throws(
      () =>
        parseRetrievalDerivation(
          withField('fold_hint', {
            first_screen_size: 2,
            total_candidate_count: 2,
            remaining_beyond_first_screen: 1,
            expandable: true,
          }),
        ),
      (error: unknown) => error instanceof WorkspaceSchemaError,
    );
    // 解析器同样拒绝任何数值相似度 / 版本类字段（共享红线守卫）。
    assert.throws(
      () => parseRetrievalDerivation(withField('similarity_score', 0.82)),
      (error: unknown) => error instanceof WorkspaceSchemaError && error.code === 'FORBIDDEN_KEY',
    );
  });

  it('AC-122: 序列化器在写入前拒绝任何数值相似度 / 版本类字段', () => {
    const poisoned = {
      derivation_id: `${ID_SOURCE}:retrieval:0000000000000000000000000A`,
      source_attempt_id: att(ID_SOURCE),
      status: 'RELATED_HISTORY',
      n_retrieval: 0,
      hit_level_a_dimensions: [],
      uncompared_dimensions: [],
      eligible_history_count: 0,
      candidate_entries: [],
      fold_hint: {
        first_screen_size: 0,
        total_candidate_count: 0,
        remaining_beyond_first_screen: 0,
        expandable: false,
      },
      created_at: '2026-09-25T00:00:00.000Z',
      confidence_score: 0.91,
    } as unknown as RetrievalDerivationRecord;

    assert.throws(
      () => serializeRetrievalDerivation(poisoned),
      (error: unknown) => error instanceof WorkspaceSchemaError && error.code === 'FORBIDDEN_KEY',
    );
  });

  it('AC-81: 不存在后台 / 定时 / 监听式重跑（只由显式调用驱动）', async () => {
    const { h } = switchableHarness();
    await seedPyramid(h, 1);
    const first = await runOnce(h);
    const idAfterFirst = first.derivation_id;

    // 不调用服务、只读记录：必须保持完全不变（没有隐藏的自动重跑）。
    const a = await h.reopen().readCurrentDerivation(att(ID_SOURCE));
    const b = await h.reopen().readCurrentDerivation(att(ID_SOURCE));
    assert.equal(a?.derivation_id, idAfterFirst);
    assert.equal(b?.derivation_id, idAfterFirst);
    // 记录不可读回「已检索过 / 已过期」这类产品字段。
    const serialized = JSON.stringify(first);
    for (const forbidden of ['is_stale', 'already_retrieved', 'retrieval_fresh']) {
      assert.equal(serialized.includes(`"${forbidden}"`), false);
    }
  });
});
