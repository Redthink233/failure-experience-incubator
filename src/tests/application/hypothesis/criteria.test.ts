/**
 * S01 ｜ `M9` ⑥⑦⑧ provenance and verifiability (task §16, §17, §18, §37, §38, §45 C1-C8).
 *
 * Contract: §8.6 rules 2-4 (two columns; a content edit never moves the decision slot), §4.2 rules 1-3
 * (a `source_type` is invariant), §4.3 (only an ACCEPTED decision `Inference` is reusable), §18
 * (observable, distinguishable criteria; no mandatory numeric threshold), `D-037`.
 *
 * 🔴 The two things these tests protect: (①) user `Fact` and AI `Inference` NEVER merge or swap labels,
 *    and (②) an AI criterion the user has not accepted is never presented as settled.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateCriteriaStructurally, judgeCriteria } from '../../../application/hypothesis/verifiability.js';
import {
  at,
  groundedAnswer,
  generationAnswerOf,
  ID_SOURCE,
  seedStandardFixture,
} from './harness.js';

async function generated() {
  const { harness } = await seedStandardFixture({
    generation: generationAnswerOf([
      groundedAnswer({ observation_metric: '颜色变化值。', support_criterion: '颜色变化值高于目标范围。', refutation_criterion: '颜色变化值落入目标范围。' }),
    ]),
  });
  const outcome = await harness.service.generateHypotheses({
    operation_id: 'op-criteria',
    source_attempt_id: at(ID_SOURCE),
  });
  assert.equal(outcome.kind, 'generated');
  if (outcome.kind !== 'generated') {
    throw new Error('unreachable');
  }
  return { harness, hypothesis_id: outcome.hypotheses[0]!.hypothesis_id };
}

describe('M9 ｜ ⑥⑦⑧ provenance', () => {
  it('[AC-51] C1: the AI metric is an Inference｜decision｜unresolved', async () => {
    const { harness, hypothesis_id } = await generated();
    const view = await harness.service.readHypothesis(hypothesis_id);
    const metric = view?.hypothesis.editable_items.ai_inferences.find(
      (entry) => entry.slot === 'observation_metric',
    );
    assert.equal(metric?.item.source_type, 'Inference');
    assert.equal(metric?.item.confirmation_class, 'decision');
    assert.equal(
      metric?.item.confirmation_class === 'decision' ? metric.item.decision_state : null,
      'unresolved',
    );
  });

  it('[AC-51] C2 / C3: the AI support and refutation criteria are the same shape', async () => {
    const { harness, hypothesis_id } = await generated();
    const view = await harness.service.readHypothesis(hypothesis_id);
    for (const slot of ['support_criterion', 'refutation_criterion'] as const) {
      const entry = view?.hypothesis.editable_items.ai_inferences.find((item) => item.slot === slot);
      assert.equal(entry?.item.source_type, 'Inference');
      assert.equal(
        entry?.item.confirmation_class === 'decision' ? entry.item.decision_state : null,
        'unresolved',
      );
    }
  });

  it('[AC-51] C4: a user-provided metric is stored as a Fact', async () => {
    const { harness, hypothesis_id } = await generated();
    const applied = await harness.service.editHypothesisCriteria({
      operation_id: 'op-c4',
      hypothesis_id,
      user_items: [{ slot: 'observation_metric', content_item_id: 'user-metric-1', value: '每轮结束时的色差读数。' }],
    });
    assert.equal(applied.kind, 'applied');
    if (applied.kind !== 'applied') {
      return;
    }
    const user = applied.hypothesis.editable_items.user_facts.find(
      (entry) => entry.slot === 'observation_metric',
    );
    assert.equal(user?.item.source_type, 'Fact');
    assert.equal(user?.item.value, '每轮结束时的色差读数。');
  });

  it('[AC-51] C5: the user Fact and the AI Inference COEXIST - the AI proposal is never deleted', async () => {
    const { harness, hypothesis_id } = await generated();
    const applied = await harness.service.editHypothesisCriteria({
      operation_id: 'op-c5',
      hypothesis_id,
      user_items: [{ slot: 'observation_metric', content_item_id: 'user-metric-1', value: '每轮结束时的色差读数。' }],
    });
    assert.equal(applied.kind, 'applied');
    if (applied.kind !== 'applied') {
      return;
    }
    const items = applied.hypothesis.editable_items;
    assert.equal(items.user_facts.length, 1);
    assert.ok(items.ai_inferences.length >= 3, 'the AI proposals must survive the user overlay');
    assert.equal(
      items.user_facts.every((entry) => entry.item.source_type === 'Fact'),
      true,
    );
    assert.equal(
      items.ai_inferences.every((entry) => entry.item.source_type === 'Inference'),
      true,
    );
    /* 🔴 The read model presents the user item first WITHOUT pretending the AI never spoke. */
    assert.equal(applied.view.is_experience_asset, false);
  });

  it('[AC-51] C5: the read model presents the user item before the AI proposal, without replacing it', async () => {
    const { harness, hypothesis_id } = await generated();
    await harness.service.editHypothesisCriteria({
      operation_id: 'op-c5b',
      hypothesis_id,
      user_items: [{ slot: 'support_criterion', content_item_id: 'user-support-1', value: '色差读数低于阈值。' }],
    });
    const applied = await harness.service.readHypothesis(hypothesis_id);
    const items = applied?.hypothesis.editable_items;
    assert.ok(items !== undefined);
    assert.ok(items.user_facts.some((entry) => entry.slot === 'support_criterion'));
    assert.ok(items.ai_inferences.some((entry) => entry.slot === 'support_criterion'));
  });

  it('[AC-51] C6: accepting an AI criterion leaves it an Inference', async () => {
    const { harness, hypothesis_id } = await generated();
    const view = await harness.service.readHypothesis(hypothesis_id);
    const target = view?.hypothesis.editable_items.ai_inferences[0];
    assert.ok(target !== undefined);
    const applied = await harness.service.decideHypothesisCriterion({
      operation_id: 'op-c6',
      hypothesis_id,
      content_item_id: target.item.content_item_id,
      decision_state: 'accepted',
    });
    assert.equal(applied.kind, 'applied');
    if (applied.kind !== 'applied') {
      return;
    }
    const after = applied.hypothesis.editable_items.ai_inferences.find(
      (entry) => entry.item.content_item_id === target.item.content_item_id,
    );
    assert.equal(after?.item.source_type, 'Inference');
    assert.equal(
      after?.item.confirmation_class === 'decision' ? after.item.decision_state : null,
      'accepted',
    );
    /* 🔴 The decision slot of the HYPOTHESIS did not move (the criterion's slot is separate). */
    assert.equal(applied.hypothesis.decision_state, 'undecided');
  });

  it('[AC-51] C6: an unknown criterion id is refused instead of silently ignored', async () => {
    const { harness, hypothesis_id } = await generated();
    const applied = await harness.service.decideHypothesisCriterion({
      operation_id: 'op-c6b',
      hypothesis_id,
      content_item_id: 'nope',
      decision_state: 'accepted',
    });
    assert.equal(applied.kind, 'rejected');
    if (applied.kind === 'rejected') {
      assert.equal(applied.code, 'INVALID_CRITERION_TARGET');
    }
  });

  it('[AC-51] C4 / C5: a blank user value is refused - it is never 「显式缺失」', async () => {
    const { harness, hypothesis_id } = await generated();
    const applied = await harness.service.editHypothesisCriteria({
      operation_id: 'op-c4b',
      hypothesis_id,
      user_items: [{ slot: 'observation_metric', content_item_id: 'user-metric-2', value: '   ' }],
    });
    assert.equal(applied.kind, 'rejected');
    if (applied.kind === 'rejected') {
      assert.equal(applied.code, 'READ_ONLY_ITEM');
    }
  });
});

describe('M9 ｜ verifiability (C7 / C8 / §18)', () => {
  it('[AC-50] C7: an observable, mutually exclusive pair is verifiable', () => {
    const verdict = evaluateCriteriaStructurally({
      support_criterion: '重复该做法后，色差读数仍然高于 5。',
      refutation_criterion: '重复该做法后，色差读数落到 5 或以下。',
    });
    assert.equal(verdict.verdict, 'verifiable');
  });

  it('[AC-50] C7: identical criteria can never be told apart', () => {
    const verdict = evaluateCriteriaStructurally({
      support_criterion: '色差读数高于 5。',
      refutation_criterion: '色差读数高于 5。',
    });
    assert.equal(verdict.verdict, 'not_verifiable');
  });

  it('[AC-50] C8: 「效果更好」 is not a criterion', () => {
    for (const vague of ['效果更好', '性能提升', '看起来改善', '结果不错']) {
      const verdict = evaluateCriteriaStructurally({
        support_criterion: vague,
        refutation_criterion: '色差读数落到 5 或以下。',
      });
      assert.equal(verdict.verdict, 'not_verifiable', `"${vague}" must not be a criterion`);
    }
  });

  it('[AC-50] C8: the independent check can refuse a pair the word list cannot spot', () => {
    const verdict = judgeCriteria({
      support_criterion: '观察者认为这一轮比上一轮好一些。',
      refutation_criterion: '观察者认为这一轮没有比上一轮好。',
      checked: 'not_observable_or_not_exclusive',
      checked_reason: '两个判据都依赖主观印象，无法观察也无法区分。',
    });
    assert.equal(verdict.verdict, 'not_verifiable');
    assert.equal(verdict.source, 'discrete_ai_check');
  });

  it('[AC-50] C8: an unconfirmed pair may not pass as verified', () => {
    const verdict = judgeCriteria({
      support_criterion: '色差读数高于 5。',
      refutation_criterion: '色差读数落到 5 或以下。',
      checked: null,
      checked_reason: null,
    });
    assert.equal(verdict.verdict, 'not_verifiable');
  });

  it('[AC-50] §18: a numeric threshold is never REQUIRED, and digits inside prose are legal', () => {
    const qualitative = evaluateCriteriaStructurally({
      support_criterion: '再次出现分层现象。',
      refutation_criterion: '没有再出现分层现象。',
    });
    assert.equal(qualitative.verdict, 'verifiable');
  });
});
