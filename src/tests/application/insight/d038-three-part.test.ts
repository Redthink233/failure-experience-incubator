/**
 * S01 ｜ `M8` `D-038` three-part presentation and the two step ⑧ exits (task §18, §35, §19, §34).
 *
 * 🔴 `D-038`: an `E2` / `E3` failure keeps the `Insight` as `candidate` and MUST be presented in
 *    three parts - ① 缺什么 ② 为什么重要 ③ 如何补充 - with 「如何补充」 labelled as an AI suggestion
 *    (display-type `Inference`). Nothing may be silently dropped, auto-repaired or rewritten.
 * 🔴 contract §9.2: step ⑧ uses `EXIT-A` / `EXIT-C`; the two empty states must never share wording,
 *    and an `E2` / `E3` failure is NOT an exit route.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  at,
  expectGenerated,
  expectZeroOutput,
  generationAnswer,
  ID_SOURCE,
  insightAnswer,
  makeHarness,
  missingItem,
  seedStandardFixture,
  zeroOutputAnswer,
} from './harness.js';

describe('S01 M8 D-038 three-part presentation', () => {
  it('AC-99 / D-038: an E2 failure keeps the candidate and presents all three parts', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          e2_check: 'fail',
          e2_reason: '结论仍然含混。',
          missing_items: [
            missingItem('结论含混', '含混的结论无法复用，也无法验证。', '把结论改写为可观察的结果描述。'),
          ],
        }),
      ]),
    });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-d038-e2',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);
    assert.equal(insight.state, 'candidate');

    const e2 = insight.gate_checks.find((check) => check.gate_id === 'E2');
    assert.ok(e2 !== undefined);
    assert.equal(e2.satisfied, false);
    const item = e2.missing_items[0];
    assert.ok(item !== undefined);
    /* ① 缺什么 ② 为什么重要 */
    assert.ok(item.description.trim().length > 0);
    assert.ok(item.why_important.trim().length > 0);
    /* ③ 如何补充 - present AND labelled as an AI suggestion (display-type Inference) */
    assert.ok(item.how_to_supplement !== null);
    assert.equal(item.how_to_supplement.source_type, 'Inference');
    assert.equal(item.how_to_supplement.confirmation_class, 'display');
    assert.ok(item.how_to_supplement.value.includes('改写'));

    /* 🔴 Persisted, not just returned: the presentation survives a reload. */
    const reopened = expectGenerated(
      await harness.reopen().generateCandidateInsights({
        operation_id: 'op-d038-e2',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.equal(reopened.idempotent_replay, true);
    const stored = await harness.reopenInsightRepository().readById(insight.insight_id);
    assert.ok(stored !== null);
    assert.equal(stored.insight.state, 'candidate');
    assert.equal(
      stored.insight.gate_checks.find((check) => check.gate_id === 'E2')?.missing_items[0]
        ?.how_to_supplement?.source_type,
      'Inference',
    );
  });

  it('AC-99 / D-038: an E3 failure is presented the same way', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          e3_check: 'fail',
          e3_reason: '关键条件完全缺失。',
          missing_items: [
            missingItem('适用条件缺失', '没有条件就无法判断这条经验能否复用。', '补充温度与时长。'),
          ],
        }),
      ]),
    });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-d038-e3',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const e3 = outcome.insights[0]?.gate_checks.find((check) => check.gate_id === 'E3');
    assert.ok(e3 !== undefined);
    assert.equal(e3.satisfied, false);
    assert.ok(e3.missing_items[0]?.how_to_supplement !== null);
    assert.equal(outcome.insights[0]?.state, 'candidate');
  });

  it('AC-99 / §35: an E2 + E3 failure presents BOTH gaps explicitly', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          e2_check: 'fail',
          e2_reason: '结论含混。',
          e3_check: 'fail',
          e3_reason: '条件缺失。',
          missing_items: [
            missingItem('结论含混', '含混结论无法复用。', '改写成结果描述。'),
            missingItem('条件缺失', '缺条件无法复用。', '补充温度与时长。'),
          ],
        }),
      ]),
    });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-d038-both',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);
    const e2 = insight.gate_checks.find((check) => check.gate_id === 'E2');
    const e3 = insight.gate_checks.find((check) => check.gate_id === 'E3');
    assert.equal(e2?.satisfied, false);
    assert.equal(e3?.satisfied, false);
    assert.equal(e2?.missing_items.length, 2);
    assert.equal(e3?.missing_items.length, 2);
    assert.equal(insight.state, 'candidate');
  });

  it('AC-99 / §18: a failing gate NEVER becomes a zero-output result and is never auto-repaired', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          e2_check: 'fail',
          e2_reason: '结论含混。',
          missing_items: [missingItem('结论含混', '含混结论无法复用。', '改写成结果描述。')],
        }),
      ]),
    });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-not-zero',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.equal(outcome.insights.length, 1);
    assert.equal(outcome.batch.exit_route, null);
    assert.equal(outcome.batch.absence_statement, null);
    /* 🔴 Not auto-repaired: the proposition is stored verbatim. */
    assert.equal(outcome.insights[0]?.proposition, insightAnswer()['proposition']);
  });

  it('AC-99 / D-038: a failure answer that hides its gaps is refused outright', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([insightAnswer({ e2_check: 'fail', e2_reason: '结论含混。' })]),
    });
    const outcome = await harness.service.generateCandidateInsights({
      operation_id: 'op-silent-fail',
      source_attempt_id: ID_SOURCE as never,
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.code, 'AI_PROPOSAL_REJECTED');
    assert.deepEqual(harness.insightFiles(), []);
  });
});

describe('S01 M8 zero-output exits (contract §9.2)', () => {
  it('AC-97 / §19: with no usable history the exit is EXIT-A, decided structurally with NO model call', async () => {
    const harness = makeHarness({ generation: generationAnswer([insightAnswer()]) });
    await harness.seed({ attempt_id: ID_SOURCE, goal: 'G', approach: 'S1', condition: 'C1', result: 'R1' });
    const derivation = await harness.runRetrieval();

    const outcome = expectZeroOutput(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-exit-a',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.equal(outcome.exit_route, 'EXIT-A');
    assert.ok(outcome.absence_statement.includes('还没有可用的历史正式记录'));
    assert.equal(harness.provider.generation_calls.length, 0);
    assert.equal(outcome.batch.exit_route, 'EXIT-A');
    assert.equal(derivation.status, 'HISTORY_EMPTY');
  });

  it('AC-97 / D-046 V-1: HISTORY_EMPTY and NO_RELATED_HISTORY are never merged into one wording', async () => {
    const empty = makeHarness({ generation: generationAnswer([insightAnswer()]) });
    await empty.seed({ attempt_id: ID_SOURCE, goal: 'G', approach: 'S1', condition: 'C1', result: 'R1' });
    await empty.runRetrieval();
    const empty_outcome = expectZeroOutput(
      await empty.service.generateCandidateInsights({
        operation_id: 'op-empty',
        source_attempt_id: ID_SOURCE as never,
      }),
    );

    const unrelated = makeHarness({ generation: generationAnswer([insightAnswer()]) });
    await unrelated.seed({ attempt_id: ID_SOURCE, goal: 'G', approach: 'S1', condition: 'C1', result: 'R1' });
    await unrelated.seed({ attempt_id: 'ATT_0000000000000000000000000N', goal: 'X9', approach: 'S9', condition: 'C9', result: 'R9' });
    const unrelated_derivation = await unrelated.runRetrieval();
    const unrelated_outcome = expectZeroOutput(
      await unrelated.service.generateCandidateInsights({
        operation_id: 'op-unrelated',
        source_attempt_id: ID_SOURCE as never,
      }),
    );

    assert.equal(unrelated_derivation.status, 'NO_RELATED_HISTORY');
    assert.equal(empty_outcome.exit_route, 'EXIT-A');
    assert.equal(unrelated_outcome.exit_route, 'EXIT-A');
    assert.notEqual(empty_outcome.absence_statement, unrelated_outcome.absence_statement);
    assert.ok(unrelated_outcome.absence_statement.includes('没有任何一条与本次记录相关'));
    /* 🔴 Neither is described as 「历史证据不足」 in the other's terms. */
    assert.equal(empty_outcome.absence_statement.includes('不相关'), false);
  });

  it('AC-97 / §19: with usable history the model may still choose EXIT-A or EXIT-C, and the route is kept', async () => {
    for (const route of ['EXIT-A', 'EXIT-C'] as const) {
      const { harness } = await seedStandardFixture({
        generation: zeroOutputAnswer(route, `${route}: 当前不足以形成明确的可复用命题。`),
      });
      const outcome = expectZeroOutput(
        await harness.service.generateCandidateInsights({
          operation_id: `op-${route}`,
          source_attempt_id: ID_SOURCE as never,
        }),
      );
      assert.equal(outcome.exit_route, route);
      assert.equal(outcome.batch.exit_route, route);
      assert.equal(harness.provider.generation_calls.length, 1);
    }
  });

  it('AC-97 / §19: a zero answer without an explicit statement is refused', async () => {
    const { harness } = await seedStandardFixture({
      generation: { insights: [], exit_route: 'EXIT-C' },
    });
    const outcome = await harness.service.generateCandidateInsights({
      operation_id: 'op-silent-zero',
      source_attempt_id: ID_SOURCE as never,
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      throw new Error('unreachable');
    }
    assert.ok(outcome.issues.some((issue) => issue.code === 'ZERO_OUTPUT_WITHOUT_EXPLICIT_STATEMENT'));
  });

  it('AC-97 / §19: reporting an exit route WHILE producing insights is refused', async () => {
    const { harness } = await seedStandardFixture({
      generation: { insights: [insightAnswer()], exit_route: 'EXIT-C' },
    });
    const outcome = await harness.service.generateCandidateInsights({
      operation_id: 'op-both',
      source_attempt_id: ID_SOURCE as never,
    });
    assert.equal(outcome.kind, 'refused');
    assert.deepEqual(harness.insightFiles(), []);
  });

  it('AC-97 / §19: EXIT-B is NOT a step ⑧ exit', async () => {
    const { harness } = await seedStandardFixture({
      generation: { insights: [], exit_route: 'EXIT-B', absence_statement: 'x' },
    });
    const outcome = await harness.service.generateCandidateInsights({
      operation_id: 'op-exitb',
      source_attempt_id: ID_SOURCE as never,
    });
    assert.equal(outcome.kind, 'refused');
    assert.ok(at(ID_SOURCE) !== null);
  });
});
