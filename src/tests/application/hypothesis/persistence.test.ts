/**
 * S01 ｜ `M9` persistence and crash recovery (task §31-§36, §49 P1-P11).
 *
 * Contract: `D-059` (Local Workspace Files, no required database), §7 (no physical delete),
 * §12 item 20 / AC-122 (no version system), §36 (a partial write must be RECOVERABLE by replaying the
 * same `operation_id`), §3.2 rule 1 (ids are globally unique and never reused).
 *
 * 🔴 The two things these tests protect: (①) everything the user needs survives a reopen, and (②) an
 *    interrupted write NEVER produces a duplicate hypothesis, a second batch or a "half-generation"
 *    reported as success.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemoryWorkspaceStorage } from '../../../workspace/memory-storage.js';
import { createHypothesisRepository } from '../../../application/hypothesis/hypothesis-repository.js';
import { findForbiddenHypothesisDocumentKeys } from '../../../application/hypothesis/persistence.js';
import {
  at,
  FaultInjectingStorage,
  generationAnswerOf,
  groundedAnswer,
  ID_SOURCE,
  makeHarness,
  modelSuggestionAnswer,
  seedStandardFixture,
} from './harness.js';

describe('M9 ｜ persistence', () => {
  it('[IMPLEMENTATION INVARIANT] P1 / P2: a grounded hypothesis is written to the workspace and survives a reopen', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-p1',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const hypothesis_id = outcome.hypotheses[0]!.hypothesis_id;
    assert.equal(harness.hypothesisFiles().length, 1);
    assert.equal(harness.hypothesisFiles()[0], `hypotheses/${hypothesis_id}.json`);
    /* The human-readable companion exists too. */
    assert.equal(
      harness.storage.peek(`hypotheses/${hypothesis_id}.md`) !== undefined,
      true,
    );

    const reopened = await harness.reopen().readHypothesis(hypothesis_id);
    assert.equal(reopened?.hypothesis.hypothesis_id, hypothesis_id);
    assert.equal(reopened?.hypothesis.kind, 'grounded');
  });

  it('[AC-67] P3 / P4: the save slot and the decision slot both survive a reopen', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()], [modelSuggestionAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-p34',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const grounded_id = outcome.hypotheses[0]!.hypothesis_id;
    const model_id = outcome.model_suggestions[0]!.hypothesis_id;
    await harness.service.acceptHypothesis({
      operation_id: 'op-p34-accept',
      hypothesis_id: grounded_id,
      user_explicitly_accepted: true,
    });
    await harness.service.saveModelSuggestion({
      operation_id: 'op-p34-save',
      hypothesis_id: model_id,
      saved: true,
    });

    const service = harness.reopen();
    const grounded = await service.readHypothesis(grounded_id);
    const model = await service.readHypothesis(model_id);
    assert.equal(grounded?.hypothesis.decision_state, 'accepted');
    /* 🔴 Accepting the grounded one did NOT touch the save slot (it has none). */
    assert.equal(grounded?.hypothesis.saved, null);
    assert.equal(model?.hypothesis.saved, true);
    assert.equal(model?.hypothesis.decision_state, 'undecided');
    assert.equal(model?.save_meaning, '内容被保留，决策状态仍未完成');
  });

  it('[IMPLEMENTATION INVARIANT] P5: the EvidenceRef[] survives a reopen', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-p5',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const hypothesis_id = outcome.hypotheses[0]!.hypothesis_id;
    const before = outcome.hypotheses[0]!.evidence_refs;
    const after = (await harness.reopen().readHypothesis(hypothesis_id))?.hypothesis.evidence_refs;
    assert.deepEqual([...before], [...(after ?? [])]);
    assert.match(String(after?.[0]?.evidence_ref_id), /^EREF_/);
    assert.equal(after?.[0]?.owner_id, hypothesis_id);
  });

  it('[IMPLEMENTATION INVARIANT] P6: the 8-item provenance (user Fact / AI Inference) survives a reopen', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-p6',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const hypothesis_id = outcome.hypotheses[0]!.hypothesis_id;
    await harness.service.editHypothesisCriteria({
      operation_id: 'op-p6-edit',
      hypothesis_id,
      user_items: [{ slot: 'observation_metric', content_item_id: 'user-metric', value: '色差读数。' }],
    });
    const reopened = await harness.reopen().readHypothesis(hypothesis_id);
    const items = reopened?.hypothesis.editable_items;
    assert.equal(items?.user_facts.length, 1);
    assert.equal(items?.user_facts[0]?.item.source_type, 'Fact');
    assert.equal(items?.ai_inferences.every((entry) => entry.item.source_type === 'Inference'), true);
    assert.equal(reopened?.item_presence['observation_metric'], 'present');
  });

  it('[IMPLEMENTATION INVARIANT] P7: the generation batch survives a reopen and is NOT a version', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-p7',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const batches = await harness.reopen().listGenerationBatches(at(ID_SOURCE));
    assert.equal(batches.length, 1);
    assert.equal(batches[0]?.operation_id, 'op-p7');
    assert.equal(batches[0]?.hypothesis_ids.length, 1);
    const raw = harness.storage.peek(`hypotheses/batches/${batches[0]!.batch_id}.json`) ?? '';
    assert.equal(
      /"(version|versions|version_number|generation_version|revision|revision_id|revision_history|rollback|edit_count|batch_ordinal|generation_index)"\s*:/.test(
        raw,
      ),
      false,
      'a batch record must not carry a version-shaped field',
    );
  });

  it('[IMPLEMENTATION INVARIANT] P8: replaying the same operation produces no duplicate anything', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()], [modelSuggestionAnswer()]),
    });
    const first = await harness.service.generateHypotheses({
      operation_id: 'op-p8',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(first.kind, 'generated');
    if (first.kind !== 'generated') {
      return;
    }
    const files_after_first = [...harness.hypothesisFiles()].sort();
    const batches_after_first = [...harness.batchFiles()].sort();

    const replay = await harness.service.generateHypotheses({
      operation_id: 'op-p8',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(replay.kind, 'generated');
    if (replay.kind !== 'generated') {
      return;
    }
    assert.equal(replay.idempotent_replay, true);
    assert.equal(replay.hypotheses[0]?.hypothesis_id, first.hypotheses[0]?.hypothesis_id);
    assert.deepEqual([...harness.hypothesisFiles()].sort(), files_after_first);
    assert.deepEqual([...harness.batchFiles()].sort(), batches_after_first);
    /* 🔴 The model was NOT asked again: a replay replays the PLAN. */
    assert.equal(harness.provider.hypothesis_calls.length, 1);
  });

  it('[IMPLEMENTATION INVARIANT] P8: a second generation WITHOUT the explicit flag is refused', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    await harness.service.generateHypotheses({ operation_id: 'op-p8b-1', source_attempt_id: at(ID_SOURCE) });
    const second = await harness.service.generateHypotheses({
      operation_id: 'op-p8b-2',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(second.kind, 'refused');
    if (second.kind !== 'refused') {
      return;
    }
    assert.equal(second.code, 'REGENERATION_REQUIRED');
  });

  it('[IMPLEMENTATION INVARIANT] P8: the same operation id used for a different record is a conflict', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    await harness.service.generateHypotheses({ operation_id: 'op-p8c', source_attempt_id: at(ID_SOURCE) });
    const conflict = await harness.service.generateHypotheses({
      operation_id: 'op-p8c',
      source_attempt_id: at('ATT_0000000000000000000000000C'),
    });
    assert.equal(conflict.kind, 'refused');
    if (conflict.kind !== 'refused') {
      return;
    }
    assert.equal(conflict.code, 'OPERATION_ID_CONFLICT');
  });

  it('[IMPLEMENTATION INVARIANT] P9: a partial write (first hypothesis ok, batch write failed) recovers on the SAME operation', async () => {
    const inner = new InMemoryWorkspaceStorage();
    /* 🔴 The injected failure hits the batch write, which happens AFTER the hypothesis files. */
    const faulty = new FaultInjectingStorage(inner, 'hypotheses/batches/');
    const harness = makeHarness(
      { generation: generationAnswerOf([groundedAnswer()], [modelSuggestionAnswer()]) },
      faulty,
      inner,
    );
    await harness.seed({
      attempt_id: ID_SOURCE,
      project_id: 'PRJ_shared',
      goal: 'G',
      approach: 'S1',
      condition: 'C1',
      result: 'R1',
    });
    await harness.seed({
      attempt_id: 'ATT_0000000000000000000000000C',
      project_id: 'PRJ_other',
      goal: 'G',
      approach: 'S2',
      condition: 'C1',
      result: 'R2',
    });
    await harness.runRetrieval();

    await assert.rejects(
      harness.service.generateHypotheses({ operation_id: 'op-p9', source_attempt_id: at(ID_SOURCE) }),
      /INJECTED WRITE FAILURE/,
    );

    /* The interrupted state really is PARTIAL: hypotheses on disk, no batch record. */
    assert.equal(harness.hypothesisFiles().length, 2);
    assert.deepEqual(harness.batchFiles(), []);
    assert.equal(harness.anchorFiles().length, 1);

    /* 🔴 The SAME operation id resumes and completes the plan - no duplicate, no second batch. */
    const recovered = await harness.service.generateHypotheses({
      operation_id: 'op-p9',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(recovered.kind, 'generated');
    if (recovered.kind !== 'generated') {
      return;
    }
    assert.equal(recovered.idempotent_replay, true);
    assert.equal(harness.hypothesisFiles().length, 2);
    assert.equal(harness.batchFiles().length, 1);
    assert.equal(recovered.hypotheses.length, 1);
    assert.equal(recovered.model_suggestions.length, 1);
    /* 🔴 The model was asked exactly ONCE: the recovery replayed the durable plan. */
    assert.equal(harness.provider.hypothesis_calls.length, 1);
    /* The anchor is now marked complete. */
    const anchor_raw = harness.storage.peek(harness.anchorFiles()[0] ?? '') ?? '';
    assert.match(anchor_raw, /"status": "complete"/);
  });

  it('[IMPLEMENTATION INVARIANT] P9: a partial write is never reported as a successful generation', async () => {
    const inner = new InMemoryWorkspaceStorage();
    const faulty = new FaultInjectingStorage(inner, 'hypotheses/batches/');
    const harness = makeHarness(
      { generation: generationAnswerOf([groundedAnswer()]) },
      faulty,
      inner,
    );
    await harness.seed({
      attempt_id: ID_SOURCE,
      project_id: 'PRJ_shared',
      goal: 'G',
      approach: 'S1',
      condition: 'C1',
      result: 'R1',
    });
    await harness.seed({
      attempt_id: 'ATT_0000000000000000000000000C',
      project_id: 'PRJ_other',
      goal: 'G',
      approach: 'S2',
      condition: 'C1',
      result: 'R2',
    });
    await harness.runRetrieval();
    await assert.rejects(
      harness.service.generateHypotheses({ operation_id: 'op-p9b', source_attempt_id: at(ID_SOURCE) }),
    );
    /* 🔴 A fresh service over the SAME workspace sees NO completed generation. */
    const batches = await harness.reopen().listGenerationBatches(at(ID_SOURCE));
    assert.deepEqual([...batches], []);
  });

  it('[IMPLEMENTATION INVARIANT] P10: there is no database', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    await harness.service.generateHypotheses({ operation_id: 'op-p10', source_attempt_id: at(ID_SOURCE) });
    const paths = Object.keys(harness.storage.snapshot());
    assert.ok(paths.length > 0);
    for (const path of paths) {
      assert.equal(/\.(db|sqlite|sqlite3|mdb)$/.test(path), false, `${path} looks like a database`);
      assert.equal(/^db\//.test(path), false);
    }
    assert.equal(harness.storage.kind, 'memory');
    /* Everything lives under the documented directories only. */
    for (const path of paths.filter((entry) => entry.startsWith('hypotheses/'))) {
      assert.match(
        path,
        /^hypotheses\/(batches\/|operations\/)?[^/]+\.(json|md)$/,
        `${path} is not part of the documented layout`,
      );
    }
  });

  it('[AC-133] P11: no credential is ever written', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()], [modelSuggestionAnswer()]),
    });
    await harness.service.generateHypotheses({ operation_id: 'op-p11', source_attempt_id: at(ID_SOURCE) });
    for (const [path, contents] of Object.entries(harness.storage.snapshot())) {
      assert.equal(
        /api_key|apikey|access_token|refresh_token|credential|password|secret|Authorization/i.test(
          contents,
        ),
        false,
        `${path} carries something credential-shaped`,
      );
    }
    /* And the repository refuses such a document outright. */
    const repository = createHypothesisRepository({ storage: harness.storage });
    const stored = await repository.listBySourceAttempt(at(ID_SOURCE));
    assert.ok(stored.length > 0);
    const hypothesis_id = stored[0]!.hypothesis.hypothesis_id;
    const poisoned = JSON.parse(harness.rawHypothesisFile(hypothesis_id) ?? '{}') as Record<
      string,
      unknown
    >;
    poisoned['api_key'] = 'sk-nope';
    assert.equal(findForbiddenHypothesisDocumentKeys(poisoned).includes('api_key'), true);
    await harness.storage.writeFile(`hypotheses/${hypothesis_id}.json`, JSON.stringify(poisoned));
    await assert.rejects(() => repository.readById(hypothesis_id), /Forbidden keys present/);
  });
});
