/**
 * `M16` ｜ **Demo baseline seed** —— D1–D9 / D14 / D15 / D18 / D19 / D20。
 *
 * 🔴 这一套证明的是「**seed 真的做出了什么**」：8 条、全部 `Formal`、全部 `demo_sample`、
 *    结果状态四态齐全、`condition` 有缺失维度、≥3 个 `Project`、幂等、ID 稳定，
 *    并且**无模型**就能浏览。
 * 🔴 与「**没有预置什么**」有关的断言在 `demo-baseline-derivation-absence.test.ts`：
 *    `Insight` / `Hypothesis` / `EvidenceRef` / `Retrieval Derivation` 的缺席是**另一套**事实，
 *    混在一起会让「8 条都有」掩盖「派生对象都不在」。
 * 🔴 全程 `InMemoryWorkspaceStorage`：本文件**不碰真实文件系统**，
 *    真实目录资产由 `demo-baseline-asset.test.ts` 单独核对。
 *
 * Canonical references used: AC-18 / AC-14 / AC-20 / AC-48 / AC-130 / AC-Q06-6.
 * 本文件不新建任何 `AC`；凡是断言结构的地方都标 `IMPLEMENTATION INVARIANT`。
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isWellFormedObjectId } from '../../domain/ids/object-id.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import { evaluateFormalGate } from '../../domain/types/attempt.js';
import { provided } from '../../domain/types/presence.js';
import { factItem } from '../../domain/types/source-type.js';
import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import { createAttemptRepository } from '../../workspace/repository/attempt-repository.js';
import { readWorkspaceMetadata } from '../../workspace/schema/workspace-metadata.js';
import { summarizeAttempt } from '../../application/workflow/attempt-summaries.js';
import { composeBrowserWorkspaceReader } from '../../browser/application/workspace-reader-composition.js';
import { compareAttempts } from '../../retrieval/compare/comparator.js';
import { BADGE_DEMO, BADGE_LIVE, RAIL_STATE_FORMAL } from '../../ui/copy.js';
import { natureBadgeOf, railItemOf } from '../../ui/presenters/rail.js';
import {
  DEMO_ATTEMPTS,
  DEMO_ATTEMPT_COUNT,
  DEMO_WORKSPACE_ID,
  DEMO_WORKSPACE_NAME,
  TE_DEMO_LIVE_01,
  demoAttemptByKey,
  readDemoBaseline,
  seedDemoBaseline,
  type SeedDemoBaselineOutcome,
} from '../../demo/index.js';

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

async function seededWorkspace(): Promise<{
  readonly storage: InMemoryWorkspaceStorage;
  readonly outcome: Extract<SeedDemoBaselineOutcome, { kind: 'seeded' }>;
}> {
  const storage = new InMemoryWorkspaceStorage();
  const outcome = await seedDemoBaseline({ storage });
  assert.equal(outcome.kind, 'seeded', 'the seed must succeed on an empty workspace');
  if (outcome.kind !== 'seeded') {
    throw new Error('unreachable');
  }
  return { storage, outcome };
}

async function allAttempts(storage: InMemoryWorkspaceStorage) {
  return createAttemptRepository({ storage }).listAttempts();
}

function fixtureId(key: string): ObjectId<'ATT'> {
  const fixture = demoAttemptByKey(key);
  assert.ok(fixture !== null, `${key} must exist in the frozen definition`);
  return fixture.attempt_id;
}

/* ------------------------------------------------------------------ *
 * D1 / D2 / D15 - the set, its size, its idempotency and its identity
 * ------------------------------------------------------------------ */

describe('M16 ｜ D1 / D2 / D15 - exactly eight, repeatable, with stable ids', () => {
  it('D1 / AC-48 / IMPLEMENTATION INVARIANT: a fresh seed leaves EXACTLY eight Attempts', async () => {
    const { outcome, storage } = await seededWorkspace();

    assert.equal(DEMO_ATTEMPT_COUNT, 8, 'the frozen baseline size is eight');
    assert.equal(outcome.result.attempts.length, 8);
    assert.equal(outcome.result.created, 8);
    assert.equal(outcome.result.reused, 0);
    assert.equal((await allAttempts(storage)).length, 8);
    /* 🔴 Eight is inside the sanctioned 5–10 band - never fewer, and never a ninth "for looks". */
    assert.ok(8 >= 5 && 8 <= 10);
  });

  it('D2 / AC-48 / IMPLEMENTATION INVARIANT: a second seed still leaves exactly eight and creates nothing', async () => {
    const storage = new InMemoryWorkspaceStorage();
    await seedDemoBaseline({ storage });
    const second = await seedDemoBaseline({ storage });

    assert.equal(second.kind, 'seeded');
    if (second.kind !== 'seeded') {
      return;
    }
    assert.equal(second.result.created, 0, 'a repeated seed must not create a second copy');
    assert.equal(second.result.reused, 8);
    assert.equal((await allAttempts(storage)).length, 8, 'never sixteen');
  });

  it('D15 / IMPLEMENTATION INVARIANT: the persisted ids are byte-identical across repeated seeds', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const first = await seedDemoBaseline({ storage });
    const second = await seedDemoBaseline({ storage });
    assert.equal(first.kind, 'seeded');
    assert.equal(second.kind, 'seeded');
    if (first.kind !== 'seeded' || second.kind !== 'seeded') {
      return;
    }
    assert.deepEqual(
      second.result.attempts.map((attempt) => String(attempt.attempt_id)),
      first.result.attempts.map((attempt) => String(attempt.attempt_id)),
    );
    /* And the ids really are the frozen ones - not freshly generated look-alikes. */
    assert.deepEqual(
      first.result.attempts.map((attempt) => String(attempt.attempt_id)),
      DEMO_ATTEMPTS.map((fixture) => String(fixture.attempt_id)),
    );
    for (const fixture of DEMO_ATTEMPTS) {
      assert.ok(
        isWellFormedObjectId(fixture.attempt_id),
        `${fixture.fixture_key} must use a well-formed ATT_ object id`,
      );
    }
  });

  it('AC-48 / IMPLEMENTATION INVARIANT: a workspace whose workspace_id differs is REFUSED, never adopted', async () => {
    const storage = new InMemoryWorkspaceStorage();
    /* A workspace that already belongs to a real user. */
    await storage.writeFile(
      'workspace.json',
      `${JSON.stringify({
        schema_version: '1',
        workspace_id: 'WS_01J0000000000000000000000A',
        name: null,
        created_at: '2026-01-01T00:00:00.000Z',
        projects: [],
      })}\n`,
    );

    const outcome = await seedDemoBaseline({ storage });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind === 'refused') {
      assert.equal(outcome.code, 'DEMO_SEED_FOREIGN_WORKSPACE');
    }
    assert.deepEqual(await allAttempts(storage), [], 'a foreign workspace must stay untouched');
  });

  it('AC-48 / IMPLEMENTATION INVARIANT: an edited fixture slot is a CONFLICT, never a silent overwrite', async () => {
    const storage = new InMemoryWorkspaceStorage();
    await seedDemoBaseline({ storage });

    const repository = createAttemptRepository({ storage });
    await repository.updateAttempt(fixtureId('DEMO-01'), {
      goal: provided(factItem('edited', '把干燥温度提高到 90 摄氏度')),
      updated_at: '2026-08-09T00:00:00.000Z',
    });

    const outcome = await seedDemoBaseline({ storage });
    assert.equal(outcome.kind, 'conflict');
    if (outcome.kind === 'conflict') {
      assert.equal(outcome.fixture_key, 'DEMO-01');
    }
    /* 🔴 The edited record is preserved verbatim: the seed tool never rewrites stored history. */
    const after = await repository.readAttempt(fixtureId('DEMO-01'));
    assert.ok(after !== null);
    assert.equal(
      after.goal.presence_state === 'present' ? after.goal.item.value : null,
      '把干燥温度提高到 90 摄氏度',
    );
  });
});

/* ------------------------------------------------------------------ *
 * D3 - D8 - what each of the eight records actually is
 * ------------------------------------------------------------------ */

describe('M16 ｜ D3 / D4 - state, archive bit and data-source nature of the eight', () => {
  it('D3 / AC-18 / IMPLEMENTATION INVARIANT: all eight records are Formal', async () => {
    const { outcome } = await seededWorkspace();
    for (const attempt of outcome.result.attempts) {
      assert.equal(attempt.state, 'Formal');
      assert.deepEqual(Object.keys(attempt).includes('is_formal'), false, 'state is never a boolean');
    }
  });

  it('AC-18 / AC-Q06-6 / IMPLEMENTATION INVARIANT: every seeded record really satisfies the Formal gate', async () => {
    const { outcome } = await seededWorkspace();
    for (const attempt of outcome.result.attempts) {
      const gate = evaluateFormalGate(attempt);
      assert.equal(
        gate.satisfied,
        true,
        `${attempt.attempt_id} must satisfy goal + attempt + result + confirmed status`,
      );
      /* 🔴 The status is a user-ACCEPTED decision inference - not a display inference. */
      assert.equal(gate.result_status_confirmed, true);
    }
  });

  it('D4 / AC-48 / IMPLEMENTATION INVARIANT: all eight carry the demo_sample data-source nature', async () => {
    const { outcome } = await seededWorkspace();
    for (const attempt of outcome.result.attempts) {
      assert.equal(attempt.data_source_nature, 'demo_sample');
    }
  });

  it('D5 / AC-73 / IMPLEMENTATION INVARIANT: DEMO-07 is the one archived fixture', async () => {
    const { storage } = await seededWorkspace();
    const archived = DEMO_ATTEMPTS.filter((fixture) => fixture.archive_state === 'archived');
    assert.deepEqual(
      archived.map((fixture) => fixture.fixture_key),
      ['DEMO-07'],
    );

    const record = await createAttemptRepository({ storage }).readAttempt(fixtureId('DEMO-07'));
    assert.ok(record !== null);
    assert.equal(record.state, 'Formal', 'archiving is orthogonal to state - it is still Formal');
    assert.equal(record.archive_state, 'archived');
  });

  it('D6 / AC-48 / IMPLEMENTATION INVARIANT: the other seven fixtures are active', async () => {
    const { storage } = await seededWorkspace();
    const repository = createAttemptRepository({ storage });
    for (const fixture of DEMO_ATTEMPTS) {
      if (fixture.fixture_key === 'DEMO-07') {
        continue;
      }
      const record = await repository.readAttempt(fixture.attempt_id);
      assert.ok(record !== null, `${fixture.fixture_key} must be persisted`);
      assert.equal(record.archive_state, 'active', `${fixture.fixture_key} must stay active`);
    }
  });

  it('D7 / AC-48: Failed, Partial, Success and Unknown are all covered', async () => {
    const { outcome } = await seededWorkspace();
    const statuses = new Set(
      outcome.result.attempts.map((attempt) =>
        attempt.result_status.presence_state === 'present' ? attempt.result_status.item.value : '',
      ),
    );
    assert.deepEqual([...statuses].sort(), ['Failed', 'Partial', 'Success', 'Unknown']);
    /* 🔴 DEMO-04 must use the literal spelling the existing grounding rule already recognises. */
    assert.equal(demoAttemptByKey('DEMO-04')?.result_status, 'Unknown');
  });

  it('D8 / AC-22 / AC-14: condition is present on four fixtures and explicitly unknown on four', async () => {
    const { outcome } = await seededWorkspace();
    const present: string[] = [];
    const unknown: string[] = [];
    for (const fixture of DEMO_ATTEMPTS) {
      const attempt = outcome.result.attempts.find((entry) => entry.attempt_id === fixture.attempt_id);
      assert.ok(attempt !== undefined);
      if (attempt.condition.presence_state === 'present') {
        present.push(fixture.fixture_key);
        assert.equal(attempt.condition.item.value, fixture.condition);
      } else {
        unknown.push(fixture.fixture_key);
        /* 🔴 「未知」 is an EXPLICIT state, never an empty string and never a default value. */
        assert.equal(fixture.condition, null);
      }
      /* 🔴 The seed never invents follow-up questions: P1 is complete on every fixture. */
      assert.equal(attempt.goal.presence_state === 'unknown', false);
    }
    assert.deepEqual(present, ['DEMO-01', 'DEMO-02', 'DEMO-04', 'DEMO-07']);
    assert.deepEqual(unknown, ['DEMO-03', 'DEMO-05', 'DEMO-06', 'DEMO-08']);
  });

  it('D9 / AC-48 / IMPLEMENTATION INVARIANT: three logical Projects exist and are real PRJ_ ids', async () => {
    const { storage } = await seededWorkspace();
    const metadata = await readWorkspaceMetadata(storage);
    assert.ok(metadata !== null);
    assert.equal(metadata.workspace_id, DEMO_WORKSPACE_ID);
    assert.equal(metadata.name, DEMO_WORKSPACE_NAME);

    const projectIds = await createAttemptRepository({ storage }).listProjects();
    assert.deepEqual([...projectIds].sort(), [
      'PRJ_DEM0PRA0000000000000000000',
      'PRJ_DEM0PRB0000000000000000000',
      'PRJ_DEM0PRC0000000000000000000',
    ]);
    for (const project of metadata.projects) {
      assert.notEqual(project.project_id, project.name, 'a name never impersonates an id');
      assert.ok(project.name !== null && /[\u4e00-\u9fff]/u.test(project.name));
    }
    /* 🔴 Two projects in the 竹材干燥 domain and one in 论文写作 - 「异 Project 但 Level A 命中」 exists. */
    assert.equal(metadata.projects.length, 3);
  });
});

/* ------------------------------------------------------------------ *
 * D14 - no second demo flag, no invented fields
 * ------------------------------------------------------------------ */

describe('M16 ｜ D14 - the canonical nature field is the ONLY demo marker', () => {
  it('D14 / AC-48 / IMPLEMENTATION INVARIANT: no is_demo / is_seed / demo_flag / source_flag field exists', async () => {
    const { outcome } = await seededWorkspace();
    for (const attempt of outcome.result.attempts) {
      const duplicates = Object.keys(attempt).filter(
        (key) =>
          key !== 'data_source_nature' &&
          /(demo|seed|flag|nature)/iu.test(key),
      );
      assert.deepEqual(duplicates, [], `${attempt.attempt_id} carries a second demo marker`);
    }
  });

  it('AC-48 / IMPLEMENTATION INVARIANT: fields with no fixture value stay explicitly unknown, never invented', async () => {
    const { outcome } = await seededWorkspace();
    for (const attempt of outcome.result.attempts) {
      for (const field of ['expected_result', 'judgment_basis', 'occurred_at', 'environment', 'cost', 'user_note'] as const) {
        assert.equal(
          attempt[field].presence_state,
          'unknown',
          `${attempt.attempt_id}.${field} must be explicitly unknown - never an invented value`,
        );
      }
      assert.deepEqual(attempt.key_parameters, [], 'no key_parameter is invented');
      assert.deepEqual(attempt.candidate_causes, [], 'no candidate cause is invented');
      assert.deepEqual(attempt.failure_tags, [], 'no failure tag is invented');
    }
  });
});

/* ------------------------------------------------------------------ *
 * D18 / D19 - provider-less browse, and the judge really is idle
 * ------------------------------------------------------------------ */

describe('M16 ｜ D18 / D19 - the eight records browse with no model at all', () => {
  it('D18 / AC-130: the provider-less reader lists and opens all eight records', async () => {
    const { storage } = await seededWorkspace();
    /* 🔴 No provider, no credential, no API key: the read composition has no parameter for them. */
    const reader = composeBrowserWorkspaceReader({ storage });

    const summaries = await reader.index.listWorkflowAttempts();
    assert.equal(summaries.length, 8);
    assert.deepEqual(
      [...summaries].map((summary) => String(summary.attempt_id)).sort(),
      DEMO_ATTEMPTS.map((fixture) => String(fixture.attempt_id)).sort(),
    );

    for (const fixture of DEMO_ATTEMPTS) {
      const browsed = await reader.reads.readWorkflow(fixture.attempt_id);
      assert.equal(browsed.kind, 'snapshot', `${fixture.fixture_key} must open without a model`);
      if (browsed.kind !== 'snapshot') {
        continue;
      }
      assert.equal(browsed.snapshot.attempt.state, 'Formal');
      assert.equal(browsed.snapshot.attempt.data_source_nature, 'demo_sample');
      assert.equal(browsed.snapshot.archive_state, fixture.archive_state);
      /* 🔴 Nothing derived was pre-seeded: no derivation, so no N_检索 - `null`, never `0`. */
      assert.equal(browsed.snapshot.retrieval.state, 'not_available');
      assert.equal(browsed.snapshot.retrieval.n_retrieval, null);
      assert.deepEqual(browsed.snapshot.insights.views, []);
      assert.deepEqual(browsed.snapshot.hypotheses.views, []);
    }

    /* 🔴 A fresh reader over the same persisted workspace returns the same eight (reload path). */
    const reopened = reader.reopen();
    assert.equal((await reopened.index.listWorkflowAttempts()).length, 8);
  });

  it('D19 / AC-130 / IMPLEMENTATION INVARIANT: a full browse issues zero dimension-judge calls', async () => {
    const { storage } = await seededWorkspace();

    /*
     * The control: the SAME judge instance must be genuinely callable, or "zero calls during browse"
     * would be vacuous. Comparing DEMO-01 against DEMO-02 reaches it on the three dimensions the
     * deterministic rules cannot decide.
     */
    const judge_calls: string[] = [];
    const judge = async (input: {
      readonly dimension: string;
      readonly source_value: string;
      readonly candidate_value: string;
    }): Promise<{ readonly kind: 'judged'; readonly verdict: 'compared_not_matched'; readonly reason: string }> => {
      judge_calls.push(input.dimension);
      return { kind: 'judged', verdict: 'compared_not_matched', reason: 'NOT_A_REAL_LLM_OUTPUT' };
    };

    const repository = createAttemptRepository({ storage });
    const source = await repository.readAttempt(fixtureId('DEMO-01'));
    const candidate = await repository.readAttempt(fixtureId('DEMO-02'));
    assert.ok(source !== null && candidate !== null);
    const compared = await compareAttempts(judge, source, candidate);
    assert.equal(compared.kind, 'compared');
    assert.ok(judge_calls.length > 0, 'the control must really reach the judge');
    assert.equal(
      judge_calls.includes('condition'),
      false,
      'condition is decided deterministically and must never reach the judge',
    );

    /* The measurement: the same judge, reset, stays untouched through a complete browse. */
    judge_calls.length = 0;
    const reader = composeBrowserWorkspaceReader({ storage });
    await reader.index.listWorkflowAttempts();
    for (const fixture of DEMO_ATTEMPTS) {
      await reader.reads.readWorkflow(fixture.attempt_id);
    }
    await reader.reads.readWorkflow('ATT_00000000000000000000000000' as ObjectId<'ATT'>);
    await reader.reads.traceHypothesis('HYP_00000000000000000000000000' as ObjectId<'HYP'>);

    assert.deepEqual(judge_calls, [], 'browsing a demo workspace must call no model');
    assert.equal(Object.keys(reader).includes('provider'), false);
    assert.equal(JSON.stringify(reader).includes('credential'), false);
  });
});

/* ------------------------------------------------------------------ *
 * D20 - the badge comes from the field, not from a fixture id
 * ------------------------------------------------------------------ */

describe('M16 ｜ D20 - the Demo badge is a projection of data_source_nature', () => {
  it('D20 / AC-48 / IMPLEMENTATION INVARIANT: the badge follows the field, never the record identity', async () => {
    const { outcome } = await seededWorkspace();

    assert.deepEqual(natureBadgeOf('demo_sample'), { label: BADGE_DEMO, is_demo: true });
    assert.deepEqual(natureBadgeOf('field_record'), { label: BADGE_LIVE, is_demo: false });
    assert.deepEqual(natureBadgeOf('retrospective_entry'), { label: BADGE_LIVE, is_demo: false });

    for (const attempt of outcome.result.attempts) {
      const line = railItemOf(summarizeAttempt(attempt), null);
      assert.equal(line.badge.is_demo, true);
      assert.equal(line.badge.label, BADGE_DEMO);
    }

    /*
     * The proof that the badge is NOT a fixture-id lookup: the SAME record kind rendered with the
     * Live nature loses the badge, with no fixture key involved anywhere.
     */
    const demo = outcome.result.attempts[0];
    assert.ok(demo !== undefined);
    const asLive = railItemOf(
      summarizeAttempt({ ...demo, data_source_nature: 'field_record' }),
      null,
    );
    assert.equal(asLive.badge.is_demo, false);
    assert.equal(asLive.badge.label, BADGE_LIVE);
  });

  it('D20 / AC-73: archived and Demo badges are independent and both visible on DEMO-07', async () => {
    const { storage } = await seededWorkspace();
    const record = await createAttemptRepository({ storage }).readAttempt(fixtureId('DEMO-07'));
    assert.ok(record !== null);
    const line = railItemOf(summarizeAttempt(record), String(record.attempt_id));

    /* 🔴 Copied from the persisted record - the UI never guesses either one. */
    assert.equal(line.badge.label, BADGE_DEMO);
    assert.equal(line.archived, true);
    assert.equal(line.archived_label, '已归档');
    assert.equal(line.selected, true);
    assert.equal(line.state_label, RAIL_STATE_FORMAL);
  });
});

/* ------------------------------------------------------------------ *
 * The live script is registered, never seeded
 * ------------------------------------------------------------------ */

describe('M16 ｜ the live demo script is text only', () => {
  it('AC-48 / IMPLEMENTATION INVARIANT: TE-DEMO-LIVE-01 is registered and is NOT a ninth record', async () => {
    const { storage, outcome } = await seededWorkspace();

    assert.equal(TE_DEMO_LIVE_01.te_id, 'TE-DEMO-LIVE-01');
    assert.ok(TE_DEMO_LIVE_01.step_a_input.includes('50 摄氏度'));
    assert.ok(TE_DEMO_LIVE_01.step_a_input.includes('降低竹片干燥后的颜色变化'));

    /* 🔴 The script text is not stored anywhere in the workspace. */
    const listed = await allAttempts(storage);
    assert.equal(listed.length, 8);
    for (const attempt of listed) {
      assert.equal(
        attempt.raw_text.value.includes('这次干燥还是没成功'),
        false,
        'the live input must never be pre-seeded',
      );
    }
    assert.equal(
      outcome.result.attempts.some((attempt) => attempt.raw_text.value.includes('热风循环干燥箱')),
      false,
    );
  });

  it('AC-48 / IMPLEMENTATION INVARIANT: the baseline reads back through the frozen ids, not through a nature filter', async () => {
    const { storage } = await seededWorkspace();
    const readBack = await readDemoBaseline(storage);
    assert.equal(readBack.length, 8);
    assert.deepEqual(
      readBack.map((attempt) => String(attempt.attempt_id)),
      DEMO_ATTEMPTS.map((fixture) => String(fixture.attempt_id)),
    );
  });
});
