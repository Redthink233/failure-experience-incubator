/**
 * S01 ｜ `M9` the `Model Suggestion` (task §20, §21, §33, §46 M1-M9).
 *
 * Contract: §8.2 rule 3 (the whole-partition annotation), §8.4 (`D-042`: SAVE ≠ ACCEPT ≠ 采纳 ≠ 确认),
 * `D-041` (never an `Experience Asset`), `D-030`, AC-68 / AC-69 / AC-70.
 *
 * 🔴 The two things these tests protect: (①) a `Model Suggestion` never carries evidence, never counts
 *    and is never traced, and (②) the SAVE slot and the DECISION slot are INDEPENDENT - saving never
 *    reads as accepting, and accepting never reads as saving.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MODEL_SUGGESTION_ANNOTATION } from '../../../domain/types/hypothesis.js';
import {
  at,
  generationAnswerOf,
  groundedAnswer,
  ID_SOURCE,
  modelSuggestionAnswer,
  seedStandardFixture,
} from './harness.js';

async function withModelSuggestion() {
  const { harness } = await seedStandardFixture({
    generation: generationAnswerOf([groundedAnswer()], [modelSuggestionAnswer()]),
  });
  const outcome = await harness.service.generateHypotheses({
    operation_id: 'op-model',
    source_attempt_id: at(ID_SOURCE),
  });
  assert.equal(outcome.kind, 'generated');
  if (outcome.kind !== 'generated') {
    throw new Error('unreachable');
  }
  const model = outcome.model_suggestions[0];
  assert.ok(model !== undefined, 'the fixture must produce one Model Suggestion');
  return { harness, model };
}

describe('M9 ｜ Model Suggestion', () => {
  it('[AC-70] M1 / M2: its EvidenceRef[] is empty and its N_引用 is 0', async () => {
    const { harness, model } = await withModelSuggestion();
    assert.deepEqual([...model.evidence_refs], []);
    const view = await harness.service.readHypothesis(model.hypothesis_id);
    assert.equal(view?.citation.n_citation, 0);
    assert.deepEqual([...view!.citation.counted_ref_ids], []);
    assert.equal(view?.evidence_overview.n_citation, 0);
  });

  it('[AC-70] M3: its ⑩ traceability list is empty', async () => {
    const { harness, model } = await withModelSuggestion();
    const trace = await harness.service.traceHypothesis(model.hypothesis_id);
    assert.deepEqual([...trace!.traceability], []);
    assert.equal(trace?.citation.n_citation, 0);
    assert.equal(trace?.model_suggestion_has_no_trace, true);
  });

  it('[AC-69] M4: the whole-partition notice is ALWAYS present and survives every action', async () => {
    const { harness, model } = await withModelSuggestion();
    assert.equal(model.hypothesis_id.length > 0, true);
    let view = await harness.service.readHypothesis(model.hypothesis_id);
    assert.equal(view?.model_prior_notice, MODEL_SUGGESTION_ANNOTATION);
    assert.match(String(view?.model_prior_notice), /非你的历史经验依据/);

    await harness.service.saveModelSuggestion({
      operation_id: 'op-m4-save',
      hypothesis_id: model.hypothesis_id,
      saved: true,
    });
    view = await harness.service.readHypothesis(model.hypothesis_id);
    assert.equal(view?.model_prior_notice, MODEL_SUGGESTION_ANNOTATION);

    await harness.service.acceptHypothesis({
      operation_id: 'op-m4-accept',
      hypothesis_id: model.hypothesis_id,
      user_explicitly_accepted: true,
    });
    view = await harness.service.readHypothesis(model.hypothesis_id);
    assert.equal(view?.model_prior_notice, MODEL_SUGGESTION_ANNOTATION);
  });

  it('[AC-67] M5: SAVING never changes the decision slot', async () => {
    const { harness, model } = await withModelSuggestion();
    const applied = await harness.service.saveModelSuggestion({
      operation_id: 'op-m5',
      hypothesis_id: model.hypothesis_id,
      saved: true,
    });
    assert.equal(applied.kind, 'applied');
    if (applied.kind !== 'applied') {
      return;
    }
    assert.equal(applied.hypothesis.decision_state, 'undecided');
    assert.equal(applied.hypothesis.saved, true);
  });

  it('[AC-68] M6: ACCEPTING never sets the save slot', async () => {
    const { harness, model } = await withModelSuggestion();
    const applied = await harness.service.acceptHypothesis({
      operation_id: 'op-m6',
      hypothesis_id: model.hypothesis_id,
      user_explicitly_accepted: true,
    });
    assert.equal(applied.kind, 'applied');
    if (applied.kind !== 'applied') {
      return;
    }
    assert.equal(applied.hypothesis.decision_state, 'accepted');
    assert.equal(applied.hypothesis.saved, false, 'accept must never imply saved');
  });

  it('[AC-68] M7: saved = true + undecided is legal, and its meaning is 「内容被保留，决策状态仍未完成」', async () => {
    const { harness, model } = await withModelSuggestion();
    await harness.service.saveModelSuggestion({
      operation_id: 'op-m7',
      hypothesis_id: model.hypothesis_id,
      saved: true,
    });
    const view = await harness.service.readHypothesis(model.hypothesis_id);
    assert.equal(view?.is_saved_but_undecided, true);
    assert.equal(view?.save_meaning, '内容被保留，决策状态仍未完成');
    /* 🔴 No 已接受 / 已采纳 / 已确认 wording is ever produced for a save. */
    assert.equal(/接受|采纳|确认/.test(String(view?.save_meaning)), false);
  });

  it('[AC-68] M7: saved = false is NOT described as 「用户已保存」', async () => {
    const { harness, model } = await withModelSuggestion();
    const view = await harness.service.readHypothesis(model.hypothesis_id);
    assert.equal(view?.save_meaning, '本次生成结果，用户尚未保留');
    assert.equal(/用户已保存/.test(String(view?.save_meaning)), false);
  });

  it('[AC-66] M8: an ACCEPTED Model Suggestion is still not an experience', async () => {
    const { harness, model } = await withModelSuggestion();
    const applied = await harness.service.acceptHypothesis({
      operation_id: 'op-m8',
      hypothesis_id: model.hypothesis_id,
      user_explicitly_accepted: true,
    });
    assert.equal(applied.kind, 'applied');
    if (applied.kind !== 'applied') {
      return;
    }
    assert.equal(applied.view.is_experience_asset, false);
    assert.equal(applied.hypothesis.kind, 'model');
    const assets = await harness.insight_service.listExperienceAssets();
    assert.equal(assets.length, 0, 'no experience asset may be created from a Model Suggestion');
  });

  it('[AC-70] M9: it never upgrades to grounded, whatever the user does', async () => {
    const { harness, model } = await withModelSuggestion();
    await harness.service.saveModelSuggestion({
      operation_id: 'op-m9-save',
      hypothesis_id: model.hypothesis_id,
      saved: true,
    });
    await harness.service.acceptHypothesis({
      operation_id: 'op-m9-accept',
      hypothesis_id: model.hypothesis_id,
      user_explicitly_accepted: true,
    });
    const view = await harness.service.readHypothesis(model.hypothesis_id);
    assert.equal(view?.hypothesis.kind, 'model');
    assert.deepEqual([...view!.hypothesis.evidence_refs], []);
    assert.deepEqual([...view!.hypothesis.core.referenced_attempt_ids], []);
    assert.equal(view?.citation.n_citation, 0);
    assert.deepEqual([...view!.source_partitions], ['model_prior']);
  });

  it('[AC-70] §20: a Model Suggestion selects no evidence and claims no history', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf(
        [],
        [
          modelSuggestionAnswer({
            evidence_selections: [
              { target_id: 'ATT_0000000000000000000000000C', source_field_path: 'x', role: 'support' },
            ],
          }),
        ],
        'EXIT-A',
        '本次不形成假设。',
      ),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-model-evidence',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((entry) => entry.code === 'MODEL_SUGGESTION_SELECTED_EVIDENCE'));
  });

  it('[AC-70] §20: a Model Suggestion may not name a historical record', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf(
        [],
        [modelSuggestionAnswer({ rationale: '依据来自 ATT_0000000000000000000000000C。' })],
        'EXIT-A',
        '本次不形成假设。',
      ),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-model-history',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((entry) => entry.code === 'MODEL_SUGGESTION_CLAIMS_HISTORY'));
  });

  it('[AC-46][AC-70] §21: a save slot on a grounded hypothesis does not exist', async () => {
    const { harness, model } = await withModelSuggestion();
    const outcome = await harness.service.listHypothesesBySourceAttempt(at(ID_SOURCE));
    const grounded = outcome.find((view) => view.hypothesis.kind === 'grounded');
    assert.ok(grounded !== undefined);
    assert.equal(grounded.hypothesis.saved, null);
    assert.equal(grounded.save_meaning, null);
    const refused = await harness.service.saveModelSuggestion({
      operation_id: 'op-save-grounded',
      hypothesis_id: grounded.hypothesis.hypothesis_id,
      saved: true,
    });
    assert.equal(refused.kind, 'rejected');
    if (refused.kind === 'rejected') {
      assert.equal(refused.code, 'NOT_A_MODEL_SUGGESTION');
    }
    assert.equal(model.saved, false);
  });

  it('[AC-67] refresh: a Model Suggestion survives a service reopen in the same shape', async () => {
    const { harness, model } = await withModelSuggestion();
    const reopened = harness.reopen();
    const view = await reopened.readHypothesis(model.hypothesis_id);
    assert.equal(view?.hypothesis.kind, 'model');
    assert.equal(view?.model_prior_notice, MODEL_SUGGESTION_ANNOTATION);
    assert.equal(view?.hypothesis.saved, false);
    assert.equal(view?.hypothesis.decision_state, 'undecided');
  });
});
