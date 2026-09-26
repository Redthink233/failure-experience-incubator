/**
 * S01 ｜ `M9` grounding (task §7, §8, §28, §41 G1-G4 / N1-N6).
 *
 * Contract: §8.2 rule 1 (BINARY - no 「部分锚定」), the G1-G4 bases, the N1-N6 conditions, §5.2 rule 4
 * (a `Draft` is never referenceable), §5.2 rule 6 / `D-035` (an `Unknown` result cannot carry a
 * direction alone), `TQ34`, `D-007` / `D-021 E4`.
 *
 * 🔴 The two things these tests protect: (①) a declared basis is VERIFIED against the landing point's
 *    carrier field rather than believed, and (②) every `N` condition is FAIL-CLOSED without a model.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  at,
  fieldPath,
  generationAnswerOf,
  groundedAnswer,
  ID_DRAFT,
  ID_RELATED,
  ID_RELATED_SECOND,
  ID_SOURCE,
  ID_UNRELATED,
  levelAPath,
  makeHarness,
  seedStandardFixture,
  selection,
} from './harness.js';

const unknownResultFixture = async (generation: Readonly<Record<string, unknown>>) => {
  const harness = makeHarness({ generation });
  await harness.seed({
    attempt_id: ID_SOURCE,
    project_id: 'PRJ_shared',
    goal: 'G',
    approach: 'S1',
    condition: 'C1',
    result: 'R1',
  });
  await harness.seed({
    attempt_id: ID_RELATED,
    project_id: 'PRJ_other',
    goal: 'G',
    approach: 'S2',
    condition: 'C1',
    result: 'R2',
    result_status_value: 'unknown',
  });
  await harness.runRetrieval();
  return harness;
};

describe('M9 ｜ grounding G1-G4 (positive)', () => {
  it('[AC-36] G1: the problem object / variable really comes from history', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          evidence_selections: [selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1')],
          grounding_bases: ['G1'],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-g1',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
  });

  it('[AC-36] G2: the condition really comes from history', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          evidence_selections: [
            selection(ID_RELATED, fieldPath(ID_RELATED, 'condition'), 'grounding', 'G2'),
          ],
          grounding_bases: ['G2'],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-g2',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
  });

  it('[AC-36] G3: the target metric really comes from history', async () => {
    const harness = makeHarness({
      generation: generationAnswerOf([
        groundedAnswer({
          evidence_selections: [
            selection(ID_RELATED, fieldPath(ID_RELATED, 'expected_result'), 'grounding', 'G3'),
          ],
          grounding_bases: ['G3'],
        }),
      ]),
    });
    await harness.seed({
      attempt_id: ID_SOURCE,
      project_id: 'PRJ_shared',
      goal: 'G',
      approach: 'S1',
      condition: 'C1',
      result: 'R1',
    });
    await harness.seed({
      attempt_id: ID_RELATED,
      project_id: 'PRJ_other',
      goal: 'G',
      approach: 'S2',
      condition: 'C1',
      result: 'R2',
      /* The target metric IS recorded on this record, so `G3` can be established. */
      expected_result: '目标范围 R',
    });
    await harness.runRetrieval();
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-g3',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
  });

  it('[AC-36] G4: the exclusion comes from a record whose attempt really fell short', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          evidence_selections: [
            selection(ID_RELATED, fieldPath(ID_RELATED, 'actual_result'), 'grounding', 'G4'),
          ],
          grounding_bases: ['G4'],
        }),
      ]),
    });
    /* The default fixture result status is `Failed`, so 「已尝试且未达预期」 really holds. */
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-g4',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
  });

  it('[AC-40] G4 negative: an UNKNOWN result can never establish an exclusion', async () => {
    const harness = await unknownResultFixture(
      generationAnswerOf([
        groundedAnswer({
          evidence_selections: [
            selection(ID_RELATED, fieldPath(ID_RELATED, 'actual_result'), 'grounding', 'G4'),
          ],
          grounding_bases: ['G4'],
        }),
      ]),
    );
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-g4-unknown',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.equal(outcome.exit_route, 'EXIT-A');
    assert.ok(
      outcome.rejected_proposals.some((rejected) => rejected.conditions.includes('N3')),
      'the unbacked G4 declaration must be reported as N3',
    );
  });
});

describe('M9 ｜ grounding N1-N6 (fail-closed negative)', () => {
  it('[AC-36] N1: only saying 「参考了历史」 with no field to point at is refused without any model', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({ evidence_selections: [], grounding_bases: ['G1'] }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-n1',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.ok(outcome.rejected_proposals.some((rejected) => rejected.conditions.includes('N1')));
    /* 🔴 No semantic check was even needed: the condition is structural. */
    assert.equal(harness.provider.check_calls.length, 0);
  });

  it('[AC-36] N2: citing an unrelated record is refused', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          evidence_selections: [
            selection(ID_UNRELATED, levelAPath(ID_UNRELATED, 'goal'), 'grounding', 'G1'),
          ],
          grounding_bases: ['G1'],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-n2',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.ok(outcome.rejected_proposals.some((rejected) => rejected.conditions.includes('N2')));
  });

  it('[AC-36] N3: wording similarity without a real basis is refused', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          /* The claim names the CONDITION, but the landing point is the record's GOAL. */
          evidence_selections: [selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G2')],
          grounding_bases: ['G2'],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-n3',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.ok(outcome.rejected_proposals.some((rejected) => rejected.conditions.includes('N3')));
  });

  it('[AC-36] N4: a variable that comes entirely from the model prior is refused', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({ grounding_bases: [] }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-n4',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.ok(outcome.rejected_proposals.some((rejected) => rejected.conditions.includes('N4')));
  });

  it('[AC-139] N5: citing a Draft is refused', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          evidence_selections: [
            selection(ID_DRAFT, levelAPath(ID_DRAFT, 'goal'), 'grounding', 'G1'),
          ],
          grounding_bases: ['G1'],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-n5',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.ok(outcome.rejected_proposals.some((rejected) => rejected.conditions.includes('N5')));
  });

  it('[AC-36] N6: an unknown / missing historical field cannot ground', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          /* `expected_result` is explicitly UNKNOWN on the standard fixture. */
          evidence_selections: [
            selection(ID_RELATED, fieldPath(ID_RELATED, 'expected_result'), 'grounding', 'G3'),
          ],
          grounding_bases: ['G3'],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-n6',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.ok(outcome.rejected_proposals.some((rejected) => rejected.conditions.includes('N6')));
  });

  it('[AC-36] the model may not declare itself grounded: an unbacked claim is refused', async () => {
    const { harness } = await seedStandardFixture({
      /* The second basis is declared but nothing backs it. */
      generation: generationAnswerOf([
        groundedAnswer({
          evidence_selections: [selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1')],
          grounding_bases: ['G1', 'G3'],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-partial-declaration',
      source_attempt_id: at(ID_SOURCE),
    });
    /* `G1` is real, so the hypothesis is grounded on `G1`; the unbacked `G3` claim adds nothing. */
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    assert.equal(outcome.hypotheses.length, 1);
  });

  it('[AC-36] M7 remains the authority: a rejected selection fails the WHOLE generation closed', async () => {
    /*
     * 🔴 The selection passes `M9`'s structural pass (a `Fact` landing point with `role = support`) but
     *    the only target has `result_status = Unknown`, which §5.2 rule 6 / `D-035` forbids. `M7`
     *    refuses, so NOTHING is persisted rather than a partial reference set being written.
     */
    const harness = await unknownResultFixture(
      generationAnswerOf([
        groundedAnswer({
          evidence_selections: [selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'support', 'G1')],
          grounding_bases: ['G1'],
        }),
      ]),
    );
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-m7-failclosed',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.equal(outcome.code, 'EVIDENCE_SELECTION_REFUSED');
    assert.ok(
      outcome.rejections.some(
        (rejection) => rejection.code === 'UNKNOWN_RESULT_CANNOT_CARRY_DIRECTION_ALONE',
      ),
      'the M7 rejection must be surfaced verbatim',
    );
    assert.deepEqual(harness.hypothesisFiles(), []);
    assert.deepEqual(harness.batchFiles(), []);
  });

  it('[AC-41] a grounded statement may not generalise from one record (D-007 / D-021 E4)', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          hypothesis_statement: '把干燥温度降低一级这种方法总是无效。',
          evidence_selections: [selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1')],
          grounding_bases: ['G1'],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-generalize',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(
      outcome.issues.some((entry) => entry.code === 'GENERALIZED_CLAIM_FROM_SINGLE_SOURCE'),
    );
  });

  it('[AC-53] grounding never becomes a number: no score / confidence / partial grade is representable', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer({ grounding_bases: ['G1'], confidence: 'high' })]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-no-score',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((entry) => entry.code === 'FORBIDDEN_SCORING_FIELD'));
  });

  it('[AC-50] a numeric threshold FIELD is refused, while a digit inside prose is allowed', async () => {
    const with_field = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer({ threshold: 50 })]),
    });
    const refused = await with_field.harness.service.generateHypotheses({
      operation_id: 'op-numeric-field',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(refused.kind, 'refused');

    const with_prose = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          support_criterion: '重复该做法后，颜色变化值仍然高于 50 摄氏度的目标上限。',
        }),
      ]),
    });
    const accepted = await with_prose.harness.service.generateHypotheses({
      operation_id: 'op-numeric-prose',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(accepted.kind, 'generated');
  });

  it('[AC-36] the independent check is what settles the semantic half (not the generation payload)', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    await harness.service.generateHypotheses({ operation_id: 'op-semantic', source_attempt_id: at(ID_SOURCE) });
    /* 🔴 The `M6` judge and the step ⑨ generation are separate calls from the grounding check. */
    assert.equal(harness.provider.hypothesis_calls.length, 1);
    assert.equal(harness.provider.check_calls.length, 1);
    assert.ok(harness.provider.check_calls[0]?.user_message.includes('HYP_'));
  });

  it('[AC-36] an unconfirmed semantic half may not pass: a missing verdict is NOT a pass', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
      check: { checks: [] },
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-missing-verdict',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.equal(outcome.exit_route, 'EXIT-A');
    assert.ok(outcome.rejected_proposals.some((rejected) => rejected.conditions.includes('N3')));
  });

  it('[AC-36] a partially-anchored vocabulary is refused by the reader', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer({ partial_grounding: 'weak' })]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-partial-vocab',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((entry) => entry.code === 'FORBIDDEN_PARTIAL_GROUNDING'));
  });

  it('[AC-36] a self-declared grounded flag is refused (the verdict is not the model\'s to give)', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer({ grounded: true })]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-self-claim',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((entry) => entry.code === 'AI_CLAIMED_GROUNDING_FLAG'));
  });

  it('[AC-33] a `candidate` decision claim from the model is refused', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer({ decision_state: 'candidate' })]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-candidate-claim',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((entry) => entry.code === 'AI_CLAIMED_DECISION_STATE'));
  });

  it('[AC-37] a 「混合来源」 partition label from the model is refused', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer({ source_partition: 'mixed' })]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-mixed-claim',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((entry) => entry.code === 'FORBIDDEN_MIXED_SOURCE_PARTITION'));
  });

  it('[AC-33] naming the output 「候选经验」 is refused', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer({ rationale: '这条候选经验由历史得出。' })]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-wrong-name',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((entry) => entry.code === 'FORBIDDEN_OBJECT_NAMING'));
  });

  it('[AC-38] a two-record evidence base is judged by its own grounding, not by the single-record guard', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          hypothesis_statement: '在两个历史记录的条件下，把温度继续降低一级仍然没有达到目标范围。',
          evidence_selections: [
            selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1'),
            selection(ID_RELATED_SECOND, levelAPath(ID_RELATED_SECOND, 'goal'), 'support', 'G1'),
          ],
          grounding_bases: ['G1'],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-two-records',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const view = await harness.service.readHypothesis(
      outcome.hypotheses[0]?.hypothesis_id ?? ('HYP_x' as never),
    );
    assert.equal(view?.evidence_overview.n_citation, 2);
    assert.equal(view?.evidence_overview.single_source, false);
  });
});
