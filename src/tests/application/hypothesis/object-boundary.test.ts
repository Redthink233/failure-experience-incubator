/**
 * S01 ｜ `M9` object boundary (task §40 O1-O7, §5, §22, §23).
 *
 * Contract: §1.1 / §8.1 (two kinds, one id space), §2.3 (`candidate` forbidden), §8.4 (SAVE ≠ ACCEPT),
 * §8.5 (a `Hypothesis` NEVER becomes an `Experience Asset` - `D-041` / AC-41), §22.
 *
 * 🔴 These are PRODUCT-boundary assertions, not implementation trivia: they are the ones that would
 *    silently turn a "next direction to try" into an "accumulated experience" if they broke.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DECISION_STATES, HYPOTHESIS_KINDS } from '../../../domain/types/hypothesis.js';
import { at, generationAnswerOf, groundedAnswer, hypothesisIdOf, ID_SOURCE, modelSuggestionAnswer, seedStandardFixture } from './harness.js';

describe('M9 ｜ object boundary', () => {
  it('[AC-33] O1: a grounded entry is stored with kind = grounded', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-o1',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    assert.equal(outcome.hypotheses.length, 1);
    assert.equal(outcome.hypotheses[0]?.kind, 'grounded');
    assert.deepEqual([...HYPOTHESIS_KINDS], ['grounded', 'model']);
  });

  it('[AC-33] O2: a model suggestion is stored with kind = model and shares the same id space', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([], [modelSuggestionAnswer()], 'EXIT-A', '本次没有可对照的历史材料。'),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-o2',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.equal(outcome.model_suggestions.length, 1);
    const model = outcome.model_suggestions[0];
    assert.equal(model?.kind, 'model');
    assert.match(String(model?.hypothesis_id), /^HYP_/);
  });

  it('[AC-33] O3: no Hypothesis ever carries a `candidate` state', async () => {
    assert.deepEqual([...DECISION_STATES], ['undecided', 'accepted', 'rejected']);
    assert.equal((DECISION_STATES as readonly string[]).includes('candidate'), false);
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    await harness.service.generateHypotheses({ operation_id: 'op-o3', source_attempt_id: at(ID_SOURCE) });
    for (const path of harness.hypothesisFiles()) {
      const raw = harness.storage.peek(path) ?? '';
      assert.equal(/"decision_state":\s*"candidate"/.test(raw), false, `${path} carries a candidate state`);
    }
  });

  it('[AC-33] O4: a freshly generated Hypothesis starts undecided', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-o4',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    assert.equal(outcome.hypotheses[0]?.decision_state, 'undecided');
  });

  it('[IMPLEMENTATION INVARIANT] O5: an accepted Hypothesis is STILL an Inference and never becomes a Fact', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-o5',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const hypothesis_id = outcome.hypotheses[0]?.hypothesis_id ?? hypothesisIdOf('HYP_missing');
    const applied = await harness.service.acceptHypothesis({
      operation_id: 'op-o5-accept',
      hypothesis_id,
      user_explicitly_accepted: true,
    });
    assert.equal(applied.kind, 'applied');
    if (applied.kind !== 'applied') {
      return;
    }
    assert.equal(applied.hypothesis.decision_state, 'accepted');
    assert.equal(applied.view.is_experience_asset, false);
    for (const entry of applied.hypothesis.editable_items.ai_inferences) {
      assert.equal(entry.item.source_type, 'Inference');
    }
    for (const entry of applied.hypothesis.editable_items.user_facts) {
      assert.equal(entry.item.source_type, 'Fact');
    }
    const raw = harness.rawHypothesisFile(hypothesis_id) ?? '';
    assert.equal(/"source_type":\s*"Fact"/.test(raw), false, 'no AI-authored text may be relabelled Fact');
  });

  it('[AC-66] O6: no Hypothesis of either kind enters the Experience Asset view', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()], [modelSuggestionAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-o6',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    const views = await harness.service.listHypothesesBySourceAttempt(at(ID_SOURCE));
    assert.ok(views.length >= 1);
    for (const view of views) {
      assert.equal(view.is_experience_asset, false);
    }
    /* The Experience Asset view is `M8`'s and holds `accepted Insight`s only. */
    const assets = await harness.insight_service.listExperienceAssets();
    for (const asset of assets) {
      assert.match(String(asset.insight.insight_id), /^INS_/);
    }
    assert.equal(
      assets.some((asset) => String(asset.insight.insight_id).startsWith('HYP_')),
      false,
    );
  });

  it('[AC-66] O7: no Hypothesis -> Insight / Experience Asset conversion API exists', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const surface = Object.keys(harness.service);
    for (const forbidden of [
      'promoteHypothesisToInsight',
      'convertToExperienceAsset',
      'createExperienceAsset',
      'acceptAsInsight',
      'generateInsightFromHypothesis',
    ]) {
      assert.equal(surface.includes(forbidden), false, `the service must not expose ${forbidden}`);
    }
    /* The ONLY legal continuation is a new Formal Attempt, which no API of this module performs. */
    for (const name of surface) {
      assert.equal(
        /promote|convert|graduate|matur/i.test(name),
        false,
        `no promotion-shaped API may exist (found "${name}")`,
      );
    }
  });

  it('[AC-33] O3/O4 boundary: the persisted document carries the frozen kind and decision vocabulary only', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()], [modelSuggestionAnswer()]),
    });
    await harness.service.generateHypotheses({ operation_id: 'op-o34', source_attempt_id: at(ID_SOURCE) });
    const kinds = new Set<string>();
    for (const path of harness.hypothesisFiles()) {
      const parsed = JSON.parse(harness.storage.peek(path) ?? '{}') as Record<string, unknown>;
      kinds.add(String(parsed['kind']));
      assert.ok(['undecided', 'accepted', 'rejected'].includes(String(parsed['decision_state'])));
    }
    assert.deepEqual([...kinds].sort(), ['grounded', 'model']);
  });
});
