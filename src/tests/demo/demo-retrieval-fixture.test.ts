/**
 * `M16` ｜ **Demo seed 的检索语义** —— 任务书 §31。
 *
 * 🔴 **本文件不预置任何派生结果**，也不写入任何「Gold 命中集合」。它证明的是 seed 的
 *    **结构语义**：哪些配对会命中、哪些维度会被结构性地拦在模型之外、哪条记录根本不进语料。
 *    被模型判定的那些（同义改写、结果归属）**不在**本文件的射程内 —— 它们只能由彩排 / `PSA` 观测。
 *
 * 🔴 分工：
 *      · `condition` 的 50°C / 50 摄氏度 / 70°C 是 **`D-050` 明文列举的记号等价与取值不同**，
 *        由 **确定性规则** 判定，因此可以在没有模型的情况下**断言**；
 *      · `goal` / `actual_attempt` / `actual_result` 的语义改写只能由维度裁判判定，
 *        所以这里用一个手写的 `NOT_A_REAL_LLM_OUTPUT` 双替身驱动，**只验证管线结构**，
 *        绝不声称「某两个字段被判为相关」。
 *
 * 🔴 产物只在内存 storage 里，测试结束即消失。
 *
 * Canonical references used: AC-20 / AC-22 / AC-73 / AC-97 / AC-109 / AC-113 / AC-115.
 * 凡是断言结构的地方都标 `IMPLEMENTATION INVARIANT`。
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Attempt } from '../../domain/types/attempt.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import { LEVEL_A_DIMENSIONS } from '../../domain/types/level-a.js';
import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import { createAttemptRepository } from '../../workspace/repository/attempt-repository.js';
import { compareAttempts, globalUncomparedDimensionsOf } from '../../retrieval/compare/comparator.js';
import { eligibleHistoricalAttempts } from '../../retrieval/compare/corpus.js';
import type { DimensionJudge } from '../../retrieval/compare/dimension-judge.js';
import { deterministicDimensionVerdict } from '../../retrieval/compare/field-rules.js';
import { notationallyEqual, sameUnitDifferentMagnitude } from '../../retrieval/compare/normalization.js';
import { DEMO_ATTEMPTS, demoAttemptByKey, readDemoBaseline, seedDemoBaseline } from '../../demo/index.js';

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const NON_LLM = 'NOT_A_REAL_LLM_OUTPUT';

function conditionOf(key: string): string {
  const fixture = demoAttemptByKey(key);
  assert.ok(fixture !== null, `${key} must exist`);
  assert.ok(fixture.condition !== null, `${key} must carry a condition for this case`);
  return fixture.condition;
}

async function seededAttempts(): Promise<readonly Attempt[]> {
  const storage = new InMemoryWorkspaceStorage();
  const outcome = await seedDemoBaseline({ storage });
  assert.equal(outcome.kind, 'seeded');
  return readDemoBaseline(storage);
}

async function attemptOf(key: string): Promise<Attempt> {
  const attempts = await seededAttempts();
  const fixture = demoAttemptByKey(key);
  assert.ok(fixture !== null);
  const found = attempts.find((attempt) => attempt.attempt_id === fixture.attempt_id);
  assert.ok(found !== undefined, `${key} must be persisted`);
  return found;
}

interface JudgeReport {
  readonly calls: readonly string[];
  readonly judge: DimensionJudge;
}

/** A scripted judge: it records which dimensions reached it and always answers the same verdict. */
function scriptedJudge(verdict: 'matched' | 'compared_not_matched'): JudgeReport {
  const calls: string[] = [];
  const judge: DimensionJudge = async (input) => {
    calls.push(input.dimension);
    return { kind: 'judged', verdict, reason: NON_LLM };
  };
  return { calls, judge };
}

/* ------------------------------------------------------------------ *
 * The deterministic half - D-050's explicit examples
 * ------------------------------------------------------------------ */

describe('M16 ｜ §31 - the condition fixture is decided by the deterministic rule, not by a model', () => {
  it('AC-113 / AC-97: `50°C` and `50 摄氏度` are notationally equal, so the rule returns matched', () => {
    const left = conditionOf('DEMO-01');
    const right = conditionOf('DEMO-02');

    assert.equal(notationallyEqual(left, right), true);
    const verdict = deterministicDimensionVerdict(left, right);
    assert.equal(verdict.verdict, 'matched');
    assert.equal(verdict.rule, 'notation_equivalence');
    assert.ok(verdict.reason !== null);
    /* 🔴 The two sides keep their own spelling: normalization is comparison-time only. */
    assert.equal(left, '50°C');
    assert.equal(right, '50 摄氏度');
  });

  it('AC-109 / AC-97: `50°C` and `70°C` are the same unit with a different magnitude, so the rule returns compared_not_matched', () => {
    const left = conditionOf('DEMO-01');
    const right = conditionOf('DEMO-07');

    assert.equal(sameUnitDifferentMagnitude(left, right), true);
    const verdict = deterministicDimensionVerdict(left, right);
    assert.equal(verdict.verdict, 'compared_not_matched');
    assert.equal(verdict.rule, 'same_unit_different_magnitude');
    /* 🔴 A provable difference never becomes `matched` - that is the widening D-050 forbids. */
    assert.notEqual(verdict.verdict, 'matched');
  });

  it('AC-22: an explicitly unknown condition is intercepted BEFORE any model call', async () => {
    const demo01 = await attemptOf('DEMO-01');
    const demo03 = await attemptOf('DEMO-03');
    const report = scriptedJudge('matched');

    const outcome = await compareAttempts(report.judge, demo01, demo03);
    assert.equal(outcome.kind, 'compared');
    if (outcome.kind !== 'compared') {
      return;
    }

    const condition = outcome.states.find((state) => state.dimension === 'condition');
    assert.ok(condition !== undefined);
    assert.equal(condition.tri_state, 'uncompared');
    assert.equal(condition.basis, 'structural_unknown');
    assert.equal(
      report.calls.includes('condition'),
      false,
      'an unknown dimension must never reach the dimension judge',
    );
    /* 🔴 Two unknowns are not similar either; here one side is unknown and the rule is the same. */
    assert.deepEqual(globalUncomparedDimensionsOf(demo03), ['condition']);
  });

  it('AC-113 / AC-97: the DEMO-01 / DEMO-02 pair never asks the judge about the condition', async () => {
    const demo01 = await attemptOf('DEMO-01');
    const demo02 = await attemptOf('DEMO-02');
    const report = scriptedJudge('compared_not_matched');

    const outcome = await compareAttempts(report.judge, demo01, demo02);
    assert.equal(outcome.kind, 'compared');
    if (outcome.kind !== 'compared') {
      return;
    }

    const condition = outcome.states.find((state) => state.dimension === 'condition');
    assert.ok(condition !== undefined);
    assert.equal(condition.tri_state, 'matched');
    assert.equal(condition.basis, 'deterministic_rule');
    assert.equal(report.calls.includes('condition'), false);

    /* 🔴 And the pair IS related even though the judge said no to everything else. */
    assert.equal(outcome.comparison.related, true);
    /*
     * 🔴 Three dimensions match WITHOUT a model: `goal` and `actual_attempt` are the same string on
     *    both fixtures, and `condition` is the `50°C` / `50 摄氏度` notational pair. Only `result`
     *    needs the judge. This is precisely the `D-050` equivalence forms ① (同义 / 同一实质) and
     *    ③ (单位等价表达) behaving as frozen.
     */
    assert.deepEqual(
      [...outcome.comparison.matched_level_a_dimensions].sort(),
      ['approach', 'condition', 'goal'],
    );
    assert.deepEqual(outcome.comparison.compared_not_matched_dimensions, ['result']);
    assert.deepEqual(outcome.comparison.uncompared_dimensions, []);
    assert.equal(
      String(outcome.comparison.candidate_attempt_id),
      String(demo02.attempt_id),
    );
  });
});

/* ------------------------------------------------------------------ *
 * The Level B trap and the archived fixture
 * ------------------------------------------------------------------ */

describe('M16 ｜ §31 - Level B sameness never makes a record related, and archiving excludes it', () => {
  it('AC-20 / AC-115: DEMO-06 shares DEMO-01\u2019s Project and is still related = false', async () => {
    const demo01 = await attemptOf('DEMO-01');
    const demo06 = await attemptOf('DEMO-06');

    /* The Level B trap is real: the two records really are in the same logical Project. */
    assert.equal(demo06.project_id, demo01.project_id);
    assert.equal(demo01.project_id, 'PRJ_DEM0PRA0000000000000000000');

    const report = scriptedJudge('compared_not_matched');
    const outcome = await compareAttempts(report.judge, demo01, demo06);
    assert.equal(outcome.kind, 'compared');
    if (outcome.kind !== 'compared') {
      return;
    }

    assert.deepEqual(outcome.comparison.matched_level_a_dimensions, []);
    assert.equal(outcome.comparison.related, false, 'a shared Project must never imply related');
    /* 🔴 `related` is exactly "the matched set is non-empty" - no project term exists in it. */
    assert.deepEqual(outcome.comparison.uncompared_dimensions, ['condition']);
    assert.equal(report.calls.includes('condition'), false);
  });

  it('AC-73: DEMO-07 is Formal but archived, so it never joins a new retrieval', async () => {
    const attempts = await seededAttempts();
    const demo01 = attempts.find((attempt) => attempt.attempt_id === demoAttemptByKey('DEMO-01')?.attempt_id);
    assert.ok(demo01 !== undefined);

    const eligible = eligibleHistoricalAttempts(demo01.attempt_id, attempts);
    const eligibleIds = eligible.map((attempt) => String(attempt.attempt_id));

    assert.equal(eligibleIds.includes(String(demoAttemptByKey('DEMO-07')?.attempt_id)), false);
    assert.equal(eligibleIds.includes(String(demo01.attempt_id)), false, 'a record is never its own history');
    assert.equal(eligible.length, 6, 'six of the seven other fixtures are eligible');
    assert.equal(
      eligible.every((attempt) => attempt.state === 'Formal' && attempt.archive_state === 'active'),
      true,
    );
  });

  it('AC-20: the corpus is not filtered by Project, so a cross-Project hit is reachable', async () => {
    const attempts = await seededAttempts();
    const demo01 = attempts.find((attempt) => attempt.attempt_id === demoAttemptByKey('DEMO-01')?.attempt_id);
    assert.ok(demo01 !== undefined);

    const eligible = eligibleHistoricalAttempts(demo01.attempt_id, attempts);
    const foreign = eligible.filter((attempt) => attempt.project_id !== demo01.project_id);
    assert.deepEqual(
      foreign.map((attempt) => String(attempt.attempt_id)).sort(),
      [
        String(demoAttemptByKey('DEMO-04')?.attempt_id),
        String(demoAttemptByKey('DEMO-05')?.attempt_id),
        String(demoAttemptByKey('DEMO-08')?.attempt_id),
      ].sort(),
      'the 论文写作 / 竹材干燥 B records must be reachable from a 竹材干燥 A source',
    );
  });
});

/* ------------------------------------------------------------------ *
 * The comparison writes nothing
 * ------------------------------------------------------------------ */

describe('M16 ｜ §31 - comparing two fixtures persists nothing', () => {
  it('AC-97 / IMPLEMENTATION INVARIANT: the comparison leaves the workspace byte-identical', async () => {
    const storage = new InMemoryWorkspaceStorage();
    await seedDemoBaseline({ storage });
    const before = JSON.stringify(storage.snapshot());

    const repository = createAttemptRepository({ storage });
    const attempts = await repository.listAttempts();
    const source = attempts[0];
    assert.ok(source !== undefined);

    for (const candidate of attempts) {
      if (candidate.attempt_id === source.attempt_id) {
        continue;
      }
      const report = scriptedJudge('compared_not_matched');
      await compareAttempts(report.judge, source, candidate);
    }

    assert.equal(JSON.stringify(storage.snapshot()), before, 'a comparison must not persist a result');
    assert.equal(storage.filePathsWithExtension('.json').length, 13);
  });

  it('IMPLEMENTATION INVARIANT: the four canonical Level A dimensions are all that is ever compared', async () => {
    const demo01 = await attemptOf('DEMO-01');
    const demo03 = await attemptOf('DEMO-03');
    const report = scriptedJudge('matched');

    const outcome = await compareAttempts(report.judge, demo01, demo03);
    assert.equal(outcome.kind, 'compared');
    if (outcome.kind !== 'compared') {
      return;
    }
    assert.deepEqual(
      [...new Set(outcome.states.map((state) => state.dimension))].sort(),
      [...LEVEL_A_DIMENSIONS].sort(),
    );
    assert.equal(outcome.states.length, 4);
    /* 🔴 `result_status` is NOT a Level A dimension and must never be compared. */
    assert.equal(
      outcome.states.some((state) => String(state.dimension) === 'result_status'),
      false,
    );
  });

  it('IMPLEMENTATION INVARIANT: every fixture projection is well defined for the comparator', async () => {
    const attempts = await seededAttempts();
    assert.equal(attempts.length, 8);
    for (const fixture of DEMO_ATTEMPTS) {
      const attempt = attempts.find((entry) => String(entry.attempt_id) === String(fixture.attempt_id));
      assert.ok(attempt !== undefined, `${fixture.fixture_key} must be readable`);
      const unknowns = globalUncomparedDimensionsOf(attempt);
      if (fixture.condition === null) {
        assert.deepEqual(unknowns, ['condition'], `${fixture.fixture_key} must expose one unknown`);
      } else {
        assert.deepEqual(unknowns, [], `${fixture.fixture_key} must expose no unknown dimension`);
      }
    }
  });

  it('IMPLEMENTATION INVARIANT: the fixture ids used by these cases are the seeded ones', async () => {
    const attempts = await seededAttempts();
    for (const fixture of DEMO_ATTEMPTS) {
      assert.equal(
        attempts.some(
          (attempt) => attempt.attempt_id === (fixture.attempt_id as ObjectId<'ATT'>),
        ),
        true,
      );
    }
  });
});
