/**
 * S01 ｜ `M8` generation-batch suite (task §41 `B1`-`B7`, §28, §29, contract §2.4 / `D-051`).
 *
 * 🔴 A generation batch is a BATCH RELATION, never a version number: no ordinal, no "which is more
 *    correct", no rollback, no diff, no restore. ✅
 * 🔴 An explicit regeneration preserves every older `Insight` and NEVER moves an older `accepted`
 *    one; the newer batch is only 「当前生成结果」.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  expectGenerated,
  expectRefused,
  generationAnswer,
  ID_SOURCE,
  insightAnswer,
  seedStandardFixture,
} from './harness.js';

describe('S01 M8 generation batches', () => {
  it('IMPLEMENTATION INVARIANT（D-051）/ B1: the first explicit generation produces exactly one batch', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-1',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const batches = await harness.service.listGenerationBatches(ID_SOURCE as never);
    assert.equal(batches.length, 1);
    assert.equal(batches[0]?.batch_id, outcome.batch.batch_id);
    assert.deepEqual(batches[0]?.insight_ids, outcome.insights.map((insight) => insight.insight_id));
  });

  it('AC-122 / IMPLEMENTATION INVARIANT / B2: replaying the same operation keeps the batch count at one', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    await harness.service.generateCandidateInsights({
      operation_id: 'op-replay',
      source_attempt_id: ID_SOURCE as never,
    });
    await harness.reopen().generateCandidateInsights({
      operation_id: 'op-replay',
      source_attempt_id: ID_SOURCE as never,
    });
    assert.equal((await harness.service.listGenerationBatches(ID_SOURCE as never)).length, 1);
    assert.equal(harness.batchFiles().length, 1);
  });

  it('IMPLEMENTATION INVARIANT（D-051 / §28 / §29）: a second generation requires the EXPLICIT regeneration flag', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    await harness.service.generateCandidateInsights({
      operation_id: 'op-1',
      source_attempt_id: ID_SOURCE as never,
    });

    /* 🔴 Without the flag: refused. This is what keeps "no silent re-generation" structural. */
    const refused = expectRefused(
      await harness.reopen().generateCandidateInsights({
        operation_id: 'op-2',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.equal(refused.code, 'REGENERATION_REQUIRED');
    assert.equal((await harness.service.listGenerationBatches(ID_SOURCE as never)).length, 1);

    /* 🔴 With the flag: a NEW batch, and the model is called again. */
    const regenerated = expectGenerated(
      await harness.reopen().regenerateCandidateInsights({
        operation_id: 'op-2',
        source_attempt_id: ID_SOURCE as never,
        explicit_regeneration: true,
      }),
    );
    assert.equal(harness.provider.generation_calls.length, 2);
    const batches = await harness.service.listGenerationBatches(ID_SOURCE as never);
    assert.equal(batches.length, 2);
    assert.notEqual(regenerated.batch.batch_id, batches[0]?.batch_id);
  });

  it('AC-122 / IMPLEMENTATION INVARIANT / B3 / B4 / B5: an older batch and its Insights survive, and an older `accepted` stays accepted', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const first = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-1',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const first_insight = first.insights[0];
    assert.ok(first_insight !== undefined);
    await harness.service.acceptInsight({
      operation_id: 'op-accept',
      insight_id: first_insight.insight_id,
      user_explicitly_accepted: true,
    });

    const second = expectGenerated(
      await harness.reopen().regenerateCandidateInsights({
        operation_id: 'op-2',
        source_attempt_id: ID_SOURCE as never,
        explicit_regeneration: true,
      }),
    );
    assert.notEqual(second.batch.batch_id, first.batch.batch_id);

    /* B4: the older Insight still exists, with its own batch relation. */
    const older = await harness.reopen().readInsight(first_insight.insight_id);
    assert.ok(older !== null);
    assert.equal(older.insight.generation_batch, first.batch.batch_id);
    /* B5 / §2.4: regeneration never revokes an acceptance. */
    assert.equal(older.insight.state, 'accepted');
    assert.equal(older.is_experience_asset, true);
    assert.equal((await harness.service.listExperienceAssets()).length, 1);
    /* 🔴 And the older Insight carries NO "superseded / hidden / revoked" mark. */
    const raw = harness.rawInsightFile(first_insight.insight_id);
    assert.ok(typeof raw === 'string');
    assert.equal(/superseded|hidden|revoked|deprecated/i.test(raw), false);
    /* The newer insights are candidates, and the newer batch is not "accepted" by inheritance. */
    assert.equal(second.insights[0]?.state, 'candidate');
    assert.equal(harness.eventLog().split('\n').filter((line) => line.trim().length > 0).length, 1);
  });

  it('B6 / AC-122: no version number, no ordinal and no generation counter is persisted', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-b6',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);

    for (const path of [insight.insight_id, 'batch']) {
      const raw =
        path === 'batch'
          ? harness.storage.peek(harness.batchFiles()[0] ?? '')
          : harness.rawInsightFile(path);
      assert.ok(typeof raw === 'string' && raw.length > 0);
      const keys = JSON.parse(raw) as Record<string, unknown>;
      for (const key of Object.keys(keys)) {
        if (/version/i.test(key)) {
          assert.equal(
            key,
            'schema_version',
            `"${key}" looks like a product version field; only the technical schema_version may exist`,
          );
        }
        assert.equal(
          /^(generation_number|ordinal|revision|sequence|index|round)$/i.test(key),
          false,
          `"${key}" must not exist - a batch is a relation, not a version`,
        );
      }
    }
    /* 🔴 The batch identity is not an ordinal either. */
    assert.equal(/:[0-9]+$/.test(outcome.batch.batch_id), false);
  });

  it('AC-122 / IMPLEMENTATION INVARIANT / B7: no rollback / diff / restore-old-version capability exists', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    await harness.service.generateCandidateInsights({
      operation_id: 'op-b7',
      source_attempt_id: ID_SOURCE as never,
    });
    for (const member of Object.keys(harness.service)) {
      assert.equal(
        /^(rollback|restore|revert|diff|compare_batches|select_version|set_current)/i.test(member),
        false,
        `"${member}" must not exist`,
      );
    }
    /* 🔴 No batch carries an "is current" flag: the relation is DERIVED, never stored as a rank. */
    const batch_raw = harness.storage.peek(harness.batchFiles()[0] ?? '') ?? '';
    assert.equal(/is_current|current_version|latest/i.test(batch_raw), false);
  });

  it('AC-97 / IMPLEMENTATION INVARIANT（§28）: a zero-output generation is still one batch and is regenerable', async () => {
    const { harness } = await seedStandardFixture({
      generation: { insights: [], exit_route: 'EXIT-C', absence_statement: '当前不足以形成明确命题。' },
    });
    await harness.service.generateCandidateInsights({
      operation_id: 'op-zero',
      source_attempt_id: ID_SOURCE as never,
    });
    const batches = await harness.service.listGenerationBatches(ID_SOURCE as never);
    assert.equal(batches.length, 1);
    assert.equal(batches[0]?.exit_route, 'EXIT-C');
    assert.equal(batches[0]?.absence_statement, '当前不足以形成明确命题。');
    assert.deepEqual(batches[0]?.insight_ids, []);

    const replayed = await harness.reopen().generateCandidateInsights({
      operation_id: 'op-zero',
      source_attempt_id: ID_SOURCE as never,
    });
    assert.equal(replayed.kind, 'zero_output');
    if (replayed.kind !== 'zero_output') {
      throw new Error('unreachable');
    }
    assert.equal(replayed.idempotent_replay, true);
    assert.equal(replayed.exit_route, 'EXIT-C');
  });

  it('IMPLEMENTATION INVARIANT（D-045 / §29）: a retrieval rerun does NOT automatically regenerate an Insight', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    await harness.service.generateCandidateInsights({
      operation_id: 'op-1',
      source_attempt_id: ID_SOURCE as never,
    });
    const batches_before = harness.batchFiles().length;
    const insights_before = harness.insightFiles().length;

    /* A retrieval rerun happens (the user explicitly asked for it). */
    await harness.runRetrieval();

    assert.equal(harness.provider.generation_calls.length, 1);
    assert.equal(harness.batchFiles().length, batches_before);
    assert.equal(harness.insightFiles().length, insights_before);
  });
});
