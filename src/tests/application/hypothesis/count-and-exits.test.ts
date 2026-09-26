/**
 * S01 ｜ `M9` count and exits (task §6, §10, §11, §19, §42 Q1-Q9).
 *
 * Contract: §8.3 (1-2 adaptive, `EXIT-A` / `EXIT-B` / `EXIT-C`), §9.2 (the three routes are NOT
 * interchangeable and a zero output is never silent), §6 (`N_检索` is the FIRST gate), `D-028`,
 * `D-046` V-1, `D-047`.
 *
 * 🔴 The two things these tests protect: (①) the count follows the number of INDEPENDENT directions and
 *    nothing else - not `N_检索`, not "always two", and (②) the route names the real reason.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  at,
  groundedAnswer,
  generationAnswerOf,
  ID_RELATED,
  ID_RELATED_SECOND,
  ID_SOURCE,
  levelAPath,
  makeHarness,
  modelSuggestionAnswer,
  seedEmptyHistoryFixture,
  seedStandardFixture,
  selection,
} from './harness.js';

describe('M9 ｜ count (Q1-Q5)', () => {
  it('[AC-34] Q1: one real direction produces ONE grounded hypothesis', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-q1',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    assert.equal(outcome.hypotheses.length, 1);
  });

  it('[AC-34] Q2: two independent directions produce TWO grounded hypotheses', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          hypothesis_statement: '在当前条件下，把干燥温度继续降低一档，观察颜色变化是否仍高于目标范围。',
          next_change: '把干燥温度从 60 摄氏度改为 50 摄氏度。',
          evidence_selections: [selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1')],
        }),
        groundedAnswer({
          hypothesis_statement: '在当前条件下，把保温时间缩短一半，观察颜色变化是否仍高于目标范围。',
          next_change: '把保温时间从 30 分钟改为 15 分钟。',
          evidence_selections: [
            selection(ID_RELATED_SECOND, levelAPath(ID_RELATED_SECOND, 'goal'), 'grounding', 'G1'),
          ],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-q2',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    assert.equal(outcome.hypotheses.length, 2);
    for (const hypothesis of outcome.hypotheses) {
      assert.equal(hypothesis.decision_state, 'undecided');
    }
    /* 🔴 Each one is INDEPENDENTLY decidable. */
    assert.notEqual(
      outcome.hypotheses[0]?.hypothesis_id,
      outcome.hypotheses[1]?.hypothesis_id,
    );
  });

  it('[AC-34] Q3: three grounded hypotheses are refused, never trimmed', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({ hypothesis_statement: '方向一：在当前条件下调整温度。' }),
        groundedAnswer({
          hypothesis_statement: '方向二：在当前条件下调整时间。',
          next_change: '把保温时间从 30 分钟改为 15 分钟。',
          evidence_selections: [
            selection(ID_RELATED_SECOND, levelAPath(ID_RELATED_SECOND, 'goal'), 'grounding', 'G1'),
          ],
        }),
        groundedAnswer({
          hypothesis_statement: '方向三：在当前条件下调整湿度。',
          next_change: '把湿度从 40% 改为 30%。',
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-q3',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((entry) => entry.code === 'TOO_MANY_GROUNDED_HYPOTHESES'));
    assert.deepEqual(harness.hypothesisFiles(), []);
  });

  it('[AC-34] Q4a: a near-synonym rewrite that pads the count is refused', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({ hypothesis_statement: '在当前条件下，降低温度是否能改善颜色变化。' }),
        groundedAnswer({
          hypothesis_statement: '在当前条件下，降低温度是否能改善颜色变化！',
          next_change: '把保温时间从 30 分钟改为 15 分钟。',
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-q4a',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((entry) => entry.code === 'DUPLICATE_HYPOTHESIS_STATEMENT'));
  });

  it('[AC-34] Q4b: the same change over the same evidence is not two directions', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          hypothesis_statement: '在当前条件下，降低干燥温度后颜色变化是否仍高于目标范围。',
          next_change: '把干燥温度从 60 摄氏度改为 50 摄氏度。',
        }),
        groundedAnswer({
          hypothesis_statement: '在当前条件下，改用更低的干燥温度后颜色变化是否仍偏高。',
          next_change: '把干燥温度从 60 摄氏度改为 50 摄氏度。',
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-q4b',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((entry) => entry.code === 'GROUNDED_COUNT_PADDING'));
  });

  it('[AC-38] Q5: the count is NOT decided by N_检索', async () => {
    const two_related = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const two_outcome = await two_related.harness.service.generateHypotheses({
      operation_id: 'op-q5-two',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(two_outcome.kind, 'generated');
    if (two_outcome.kind === 'generated') {
      /* `N_检索 = 2` did NOT force two hypotheses. */
      assert.equal(two_outcome.hypotheses.length, 1);
    }

    const one_related = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          evidence_selections: [
            selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1'),
          ],
        }),
      ]),
    });
    const one_outcome = await one_related.harness.service.generateHypotheses({
      operation_id: 'op-q5-one',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(one_outcome.kind, 'generated');
    if (one_outcome.kind === 'generated') {
      assert.equal(one_outcome.hypotheses.length, 1);
    }
  });

  it('[AC-34] N=1: a single historical source still allows ONE grounded hypothesis', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          hypothesis_statement: '在当前条件下，本次记录里的做法没有达到目标范围。',
          evidence_selections: [
            selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1'),
          ],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-n1',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const view = await harness.service.readHypothesis(outcome.hypotheses[0]?.hypothesis_id ?? ('HYP_x' as never));
    assert.equal(view?.evidence_overview.n_citation, 1);
    assert.equal(view?.evidence_overview.single_source, true);
  });

  it('[AC-41] N=1: two independent directions are allowed when one record really supports both', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          hypothesis_statement: '在当前条件下，把干燥温度再降低一档，观察颜色变化是否仍高于目标范围。',
          next_change: '把干燥温度从 60 摄氏度改为 50 摄氏度。',
          evidence_selections: [
            selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1'),
          ],
        }),
        groundedAnswer({
          hypothesis_statement: '在当前条件下，把预热时间延长一倍，观察颜色变化是否仍高于目标范围。',
          next_change: '把预热时间从 5 分钟改为 10 分钟。',
          evidence_selections: [
            selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1'),
          ],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-n1-two',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    assert.equal(outcome.hypotheses.length, 2);
    /* 🔴 Both rest on ONE record, so each one's own N_引用 is exactly 1. */
    for (const hypothesis of outcome.hypotheses) {
      const view = await harness.service.readHypothesis(hypothesis.hypothesis_id);
      assert.equal(view?.evidence_overview.n_citation, 1);
      assert.equal(view?.evidence_overview.single_source, true);
    }
  });
});

describe('M9 ｜ exits (Q6-Q9)', () => {
  it('[AC-43][AC-47] Q6: N_检索 = 0 forces EXIT-A and zero grounded hypotheses', async () => {
    const harness = await seedEmptyHistoryFixture({
      generation: generationAnswerOf(
        [],
        [modelSuggestionAnswer()],
        'EXIT-A',
        '本次没有可以对照的历史材料。',
      ),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-q6',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.equal(outcome.exit_route, 'EXIT-A');
    assert.ok(outcome.absence_statement.length > 0);
    /* A `Model Suggestion` is explicitly allowed here - it is NOT filling a grounded position. */
    assert.equal(outcome.model_suggestions.length, 1);
    const batch = await harness.service.listGenerationBatches(at(ID_SOURCE));
    assert.equal(batch[0]?.hypothesis_ids.length, 0);
    assert.equal(batch[0]?.model_suggestion_ids.length, 1);
  });

  it('[AC-59] Q6 negative: a model claiming a historical basis with N_检索 = 0 is refused', async () => {
    const harness = await seedEmptyHistoryFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-q6-negative',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((entry) => entry.code === 'GROUNDED_WITHOUT_GROUNDING_SOURCES'));
  });

  it('[AC-55] Q6: the three 0-like situations are told apart instead of sharing one wording', async () => {
    const empty = await seedEmptyHistoryFixture({
      generation: generationAnswerOf([], [], 'EXIT-A', '没有历史材料。'),
    });
    const empty_outcome = await empty.service.generateHypotheses({
      operation_id: 'op-q6-empty',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(empty_outcome.kind, 'zero_output');
    if (empty_outcome.kind !== 'zero_output') {
      return;
    }
    assert.equal(empty_outcome.exit_route, 'EXIT-A');
    assert.match(empty_outcome.absence_statement, /还没有可用的历史正式记录/);

    /* A workspace that HAS history, but nothing related to this record. */
    const no_related = makeHarness({
      generation: generationAnswerOf([], [], 'EXIT-A', '没有相关历史。'),
    });
    await no_related.seed({
      attempt_id: ID_SOURCE,
      goal: 'G',
      approach: 'S1',
      condition: 'C1',
      result: 'R1',
    });
    await no_related.seed({
      attempt_id: ID_RELATED,
      goal: 'COMPLETELY_DIFFERENT',
      approach: 'S9',
      condition: 'C9',
      result: 'R9',
    });
    await no_related.runRetrieval();
    const second = await no_related.service.generateHypotheses({
      operation_id: 'op-q6-norelated',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(second.kind, 'zero_output');
    if (second.kind !== 'zero_output') {
      return;
    }
    assert.equal(second.exit_route, 'EXIT-A');
    assert.match(second.absence_statement, /没有任何一条与本次记录相关/);
    assert.notEqual(second.absence_statement, empty_outcome.absence_statement);
  });

  it('[AC-44][AC-60] Q7: grounding holds but nothing is verifiable -> EXIT-B', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          support_criterion: '效果更好。',
          refutation_criterion: '结果不错。',
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-q7',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.equal(outcome.exit_route, 'EXIT-B');
    assert.ok(
      outcome.rejected_proposals.some((rejected) => rejected.stage === 'verifiability'),
    );
  });

  it('[AC-44] Q7: identical support and refutation criteria can never be told apart -> EXIT-B', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          support_criterion: '颜色变化值高于目标范围。',
          refutation_criterion: '颜色变化值高于目标范围。',
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-q7b',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.equal(outcome.exit_route, 'EXIT-B');
  });

  it('[AC-44] Q7: an explicit missing ⑦ or ⑧ is not verifiable -> EXIT-B', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer({ refutation_criterion: null })]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-q7c',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.equal(outcome.exit_route, 'EXIT-B');
  });

  it('[AC-45] Q8: nothing formable at all -> EXIT-C', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([], [], 'EXIT-C', '本次无法形成明确的待验证假设。'),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-q8',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.equal(outcome.exit_route, 'EXIT-C');
  });

  it('[AC-35] Q9: EXIT-B / EXIT-C are never presented as 「历史证据不足」', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf(
        [],
        [],
        'EXIT-C',
        '历史证据不足，因此无法形成假设。',
      ),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-q9',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.equal(outcome.exit_route, 'EXIT-C');
    assert.equal(/证据不足/.test(outcome.absence_statement), false);
    assert.match(outcome.absence_statement, /无法把它整理成一条明确的待验证假设/);
  });

  it('[AC-98] a silent zero output is refused: the model must state why', async () => {
    const { harness } = await seedStandardFixture({
      generation: { grounded: [], model_suggestions: [], exit_route: 'EXIT-A' },
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-silent-zero',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(
      outcome.issues.some((entry) => entry.code === 'ZERO_OUTPUT_WITHOUT_EXPLICIT_STATEMENT'),
    );
  });
});
