/**
 * S01 ｜ `M9` the decision slot and regeneration (task §21, §22, §34, §35).
 *
 * Contract: §2.3 (the decision vocabulary), §2.4 / `D-051` (batches are NOT versions; a new generation
 * never inherits the old slot; an older `accepted` stays `accepted`), §8.4 (`D-042`), §8.5.
 *
 * 🔴 The two things these tests protect: (①) `accepted` means "a direction worth verifying", never
 *    "supported", and (②) regeneration is a BATCH relation, never a correction of the earlier result.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSavedButUndecided } from '../../../domain/types/hypothesis.js';
import {
  at,
  groundedAnswer,
  generationAnswerOf,
  ID_SOURCE,
  modelSuggestionAnswer,
  seedStandardFixture,
} from './harness.js';

async function generated() {
  const { harness } = await seedStandardFixture({
    generation: generationAnswerOf([groundedAnswer()], [modelSuggestionAnswer()]),
  });
  const outcome = await harness.service.generateHypotheses({
    operation_id: 'op-decision',
    source_attempt_id: at(ID_SOURCE),
  });
  assert.equal(outcome.kind, 'generated');
  if (outcome.kind !== 'generated') {
    throw new Error('unreachable');
  }
  return { harness, grounded_id: outcome.hypotheses[0]!.hypothesis_id, model_id: outcome.model_suggestions[0]!.hypothesis_id };
}

describe('M9 ｜ hypothesis decision slot', () => {
  it('[AC-33] accepting requires an EXPLICIT user action', async () => {
    const { harness, grounded_id } = await generated();
    const refused = await harness.service.acceptHypothesis({
      operation_id: 'op-accept-not-explicit',
      hypothesis_id: grounded_id,
      user_explicitly_accepted: false,
    });
    assert.equal(refused.kind, 'rejected');
    if (refused.kind === 'rejected') {
      assert.equal(refused.code, 'INVALID_COMMAND');
    }
    const view = await harness.service.readHypothesis(grounded_id);
    assert.equal(view?.hypothesis.decision_state, 'undecided');
  });

  it('[AC-33] rejecting a direction is always a user action and needs no gate', async () => {
    const { harness, grounded_id } = await generated();
    const applied = await harness.service.rejectHypothesis({
      operation_id: 'op-reject',
      hypothesis_id: grounded_id,
    });
    assert.equal(applied.kind, 'applied');
    if (applied.kind !== 'applied') {
      return;
    }
    assert.equal(applied.hypothesis.decision_state, 'rejected');
    assert.equal(applied.view.can_accept, false);
    assert.equal(applied.view.can_reject, false);
  });

  it('[IMPLEMENTATION INVARIANT] a rejected direction is not revived by a decision - a new generation is the way back', async () => {
    const { harness, grounded_id } = await generated();
    await harness.service.rejectHypothesis({ operation_id: 'op-revive-1', hypothesis_id: grounded_id });
    const refused = await harness.service.acceptHypothesis({
      operation_id: 'op-revive-2',
      hypothesis_id: grounded_id,
      user_explicitly_accepted: true,
    });
    assert.equal(refused.kind, 'rejected');
    if (refused.kind === 'rejected') {
      assert.equal(refused.code, 'NOT_A_CANONICAL_DECISION');
    }
  });

  it('[AC-104] editing ⑥⑦⑧ never moves the decision slot', async () => {
    const { harness, grounded_id } = await generated();
    await harness.service.acceptHypothesis({
      operation_id: 'op-edit-1',
      hypothesis_id: grounded_id,
      user_explicitly_accepted: true,
    });
    const applied = await harness.service.editHypothesisCriteria({
      operation_id: 'op-edit-2',
      hypothesis_id: grounded_id,
      user_items: [{ slot: 'observation_metric', content_item_id: 'user-metric', value: '色差读数。' }],
    });
    assert.equal(applied.kind, 'applied');
    if (applied.kind !== 'applied') {
      return;
    }
    assert.equal(applied.hypothesis.decision_state, 'accepted');
  });

  it('[AC-106] there is no content-modification state machine on a Hypothesis', async () => {
    const { harness } = await generated();
    const surface = Object.keys(harness.service);
    for (const forbidden of [
      'editHypothesisContent',
      'demoteHypothesis',
      'revokeAcceptance',
      'rollbackHypothesis',
    ]) {
      assert.equal(surface.includes(forbidden), false, `${forbidden} must not exist`);
    }
    /* And the read-only boundary is exposed so a caller cannot even offer such an edit. */
    const views = await harness.service.listHypothesesBySourceAttempt(at(ID_SOURCE));
    for (const view of views) {
      assert.deepEqual([...view.read_only_field_keys], [
        'hypothesis_statement',
        'rationale',
        'referenced_attempts',
        'next_change',
        'kept_conditions',
      ]);
      assert.deepEqual([...view.editable_field_keys], [
        'observation_metric',
        'support_criterion',
        'refutation_criterion',
      ]);
    }
  });

  it('[AC-116][AC-120] §34: regeneration is a NEW batch that preserves the OLDER result and its state', async () => {
    const { harness, grounded_id, model_id } = await generated();
    await harness.service.acceptHypothesis({
      operation_id: 'op-regen-accept',
      hypothesis_id: grounded_id,
      user_explicitly_accepted: true,
    });
    await harness.service.saveModelSuggestion({
      operation_id: 'op-regen-save',
      hypothesis_id: model_id,
      saved: true,
    });

    const second = await harness.service.regenerateHypotheses({
      operation_id: 'op-regen-2',
      source_attempt_id: at(ID_SOURCE),
      explicit_regeneration: true,
    });
    assert.equal(second.kind, 'generated');
    if (second.kind !== 'generated') {
      return;
    }

    const batches = await harness.service.listGenerationBatches(at(ID_SOURCE));
    assert.equal(batches.length, 2);
    /* 🔴 Two batches, two DIFFERENT batch ids, and the older hypothesis is untouched. */
    assert.notEqual(batches[0]?.batch_id, batches[1]?.batch_id);
    const older = await harness.service.readHypothesis(grounded_id);
    assert.equal(older?.hypothesis.decision_state, 'accepted', 'an older accepted stays accepted');
    const older_model = await harness.service.readHypothesis(model_id);
    assert.equal(older_model?.hypothesis.saved, true, 'an older saved stays saved');
    /* 🔴 The new generation starts undecided and unsaved - it inherits nothing. */
    assert.equal(second.hypotheses[0]?.decision_state, 'undecided');
    assert.equal(second.hypotheses[0]?.saved, null);
    assert.equal(second.model_suggestions[0]?.saved, false);
    assert.notEqual(second.hypotheses[0]?.hypothesis_id, grounded_id);
  });

  it('[AC-120] §34: a batch never claims to be more correct than another', async () => {
    const { harness } = await generated();
    await harness.service.regenerateHypotheses({
      operation_id: 'op-batch-2',
      source_attempt_id: at(ID_SOURCE),
      explicit_regeneration: true,
    });
    for (const path of harness.batchFiles()) {
      const raw = harness.storage.peek(path) ?? '';
      assert.equal(
        /"is_latest"|"supersedes"|"is_better"|"more_correct"|"is_current"|"confidence"/.test(raw),
        false,
        `${path} claims an ordering the contract does not define`,
      );
    }
  });

  it('[IMPLEMENTATION INVARIANT] §35: hypothesis ids are never derived from an array position', async () => {
    const { harness } = await generated();
    const views = await harness.service.listHypothesesBySourceAttempt(at(ID_SOURCE));
    for (const view of views) {
      assert.match(String(view.hypothesis.hypothesis_id), /^HYP_[0-9A-HJKMNP-TV-Z]{26}$/);
    }
    const ids = views.map((view) => String(view.hypothesis.hypothesis_id));
    assert.equal(new Set(ids).size, ids.length);
  });

  it('[AC-68] §21: saving and accepting are independent in BOTH directions', async () => {
    const { harness, model_id } = await generated();
    const saved = await harness.service.saveModelSuggestion({
      operation_id: 'op-independent-save',
      hypothesis_id: model_id,
      saved: true,
    });
    assert.equal(saved.kind, 'applied');
    if (saved.kind === 'applied') {
      assert.equal(saved.hypothesis.decision_state, 'undecided');
      assert.equal(isSavedButUndecided(saved.hypothesis.saved, saved.hypothesis.decision_state), true);
    }
    const accepted = await harness.service.acceptHypothesis({
      operation_id: 'op-independent-accept',
      hypothesis_id: model_id,
      user_explicitly_accepted: true,
    });
    assert.equal(accepted.kind, 'applied');
    if (accepted.kind === 'applied') {
      assert.equal(accepted.hypothesis.saved, true, 'accept must not clear a save that already happened');
      assert.equal(accepted.hypothesis.decision_state, 'accepted');
    }
  });

  it('[IMPLEMENTATION INVARIANT] an action on a missing hypothesis is an explicit rejection, never a crash', async () => {
    const { harness } = await generated();
    const outcome = await harness.service.acceptHypothesis({
      operation_id: 'op-missing',
      hypothesis_id: 'HYP_0000000000000000000000000B' as never,
      user_explicitly_accepted: true,
    });
    assert.equal(outcome.kind, 'rejected');
    if (outcome.kind === 'rejected') {
      assert.equal(outcome.code, 'HYPOTHESIS_NOT_FOUND');
      assert.equal(outcome.hypothesis, null);
    }
  });

  it('[AC-121] a rerun never cascades: step ⑨ has ONE explicit entry-point pair and no trigger', async () => {
    const { harness } = await generated();
    const surface = Object.keys(harness.service).sort();
    /* 🔴 Exactly the two command-driven generation entry points, plus the batch reader. */
    assert.deepEqual(
      surface.filter((name) => /generat/i.test(name)),
      ['generateHypotheses', 'listGenerationBatches', 'regenerateHypotheses'],
    );
    /* 🔴 No listener, no timer, no watcher and no retrieval call exists in this module. */
    for (const name of surface) {
      assert.equal(
        /watch|listen|subscribe|onRetrieval|auto|schedule/i.test(name),
        false,
        'no automatic trigger may exist (found "' + name + '")',
      );
    }
    /* 🔴 A rerun of step ⑥ alone leaves the step ⑨ result untouched. */
    const before = await harness.service.listGenerationBatches(at(ID_SOURCE));
    await harness.runRetrieval();
    const after = await harness.service.listGenerationBatches(at(ID_SOURCE));
    assert.deepEqual(
      after.map((batch) => batch.batch_id),
      before.map((batch) => batch.batch_id),
      'a retrieval rerun must not regenerate step ⑨',
    );
    /* And the step ⑨ call count is unchanged: nothing ran on its own. */
    assert.equal(harness.provider.hypothesis_calls.length, 1);
  });
});
