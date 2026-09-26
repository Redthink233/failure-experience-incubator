/**
 * S01 ｜ `M8` step ⑧ generation suite (task §33 `G1`-`G7`, §6, §11, §42).
 *
 * 🔴 Every AI answer used here is `NOT_A_REAL_LLM_OUTPUT` (see `harness.ts`). Real Provider Calls =
 *    NOT EXECUTED.
 * 🔴 `IMPLEMENTATION INVARIANT` suites assert what the PRODUCT semantics of step ⑧ are (the task is
 *    explicit that these are not covered by a precise `AC`); `AC-*` suites reference the existing
 *    acceptance points.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  expectGenerated,
  expectRefused,
  expectRuntimeFailure,
  expectZeroOutput,
  generationAnswer,
  ID_DRAFT,
  ID_RELATED,
  ID_RELATED_SECOND,
  ID_SOURCE,
  ID_UNRELATED_SECOND,
  insightAnswer,
  levelAPath,
  NOT_A_REAL_LLM_OUTPUT,
  seedStandardFixture,
  selection,
  timeoutError,
  zeroOutputAnswer,
} from './harness.js';
import { INSIGHT_GENERATION_SCHEMA_ID } from '../../../application/insight/schemas.js';

describe('S01 M8 ⑧ generation', () => {
  it('G1 / AC-28: an explicit step ⑧ command produces a Candidate Insight', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([insightAnswer()]),
    });

    /* 🔴 Nothing exists before the command: no background generation, no todo pool (G6 / D-022). */
    assert.deepEqual(harness.insightFiles(), []);

    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-1',
        source_attempt_id: ID_SOURCE as never,
      }),
    );

    assert.equal(outcome.insights.length, 1);
    assert.equal(
      harness.provider.generation_calls.length,
      1,
      'exactly one explicit step ⑧ call is made',
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);
    assert.equal(insight.proposition, insightAnswer()['proposition']);
    assert.equal(insight.attempt_id, ID_SOURCE);
    assert.equal(insight.generation_batch, outcome.batch.batch_id);
  });

  it('G2 / IMPLEMENTATION INVARIANT（§16 / D-039）: a new Insight is ALWAYS `candidate`', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer(),
        insightAnswer({
          proposition: '在当前条件下，先按 S2 方案测试再复核，颜色变化仍未达到目标范围。',
          evidence_selections: [selection(ID_RELATED_SECOND, levelAPath(ID_RELATED_SECOND, 'goal'), 'support')],
        }),
      ]),
    });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-1',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.equal(outcome.insights.length, 2);
    for (const insight of outcome.insights) {
      assert.equal(insight.state, 'candidate');
    }
  });

  it('G3 / AC-26: the model can NEVER output `accepted`', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([{ ...insightAnswer(), state: 'accepted' }]),
    });
    const refused = expectRefused(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-1',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.equal(refused.code, 'AI_PROPOSAL_REJECTED');
    assert.ok(refused.issues.some((issue) => issue.code === 'AI_CLAIMED_INSIGHT_STATE'));
    /* 🔴 Nothing was persisted, so no state can have been smuggled in. */
    assert.deepEqual(harness.insightFiles(), []);
    assert.deepEqual(harness.batchFiles(), []);
  });

  it('G4 / IMPLEMENTATION INVARIANT: 0 insights is a legal outcome with an explicit exit route', async () => {
    const { harness } = await seedStandardFixture({
      generation: zeroOutputAnswer('EXIT-C', '当前只能形成含混的说法，不足以形成明确的可复用命题。'),
    });
    const outcome = expectZeroOutput(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-1',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.equal(outcome.exit_route, 'EXIT-C');
    assert.ok(outcome.absence_statement.trim().length > 0);
    assert.deepEqual(outcome.batch.insight_ids, []);
    assert.deepEqual(harness.insightFiles(), []);
  });

  it('G5 / IMPLEMENTATION INVARIANT: no padding - the count is exactly what the evidence supports', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const one = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-sole',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.equal(one.insights.length, 1, 'a single proposition must not be padded up to 3');
  });

  it('G6 / AC-28: only the explicit step ⑧ command creates a candidate', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    /* Saving the Formal record and running ⑥⑦ produced no Insight at all. */
    assert.deepEqual(harness.insightFiles(), []);
    assert.deepEqual(harness.batchFiles(), []);
    assert.equal(harness.provider.generation_calls.length, 0);

    await harness.service.generateCandidateInsights({
      operation_id: 'op-1',
      source_attempt_id: ID_SOURCE as never,
    });
    assert.equal(harness.insightFiles().length, 1);
  });

  it('G7 / IMPLEMENTATION INVARIANT（§32）: replaying the SAME operation creates no second Insight and no second batch', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const first = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-replay',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const files_after_first = harness.insightFiles();
    const batches_after_first = harness.batchFiles();

    /* A brand-new service over the same workspace: the batch record is the idempotency anchor. */
    const replayed = expectGenerated(
      await harness.reopen().generateCandidateInsights({
        operation_id: 'op-replay',
        source_attempt_id: ID_SOURCE as never,
      }),
    );

    assert.equal(replayed.idempotent_replay, true);
    assert.deepEqual(replayed.insights.map((insight) => insight.insight_id), first.insights.map((i) => i.insight_id));
    assert.equal(replayed.batch.batch_id, first.batch.batch_id);
    assert.deepEqual(harness.insightFiles(), files_after_first);
    assert.deepEqual(harness.batchFiles(), batches_after_first);
    assert.equal(
      harness.provider.generation_calls.length,
      1,
      'a replay must not call the model a second time',
    );
  });

  it('IMPLEMENTATION INVARIANT: the same operation id for another record is refused', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    await harness.service.generateCandidateInsights({
      operation_id: 'op-conflict',
      source_attempt_id: ID_SOURCE as never,
    });
    const refused = expectRefused(
      await harness.reopen().generateCandidateInsights({
        operation_id: 'op-conflict',
        source_attempt_id: ID_RELATED as never,
      }),
    );
    assert.equal(refused.code, 'OPERATION_ID_CONFLICT');
  });

  it('§6 / AC-145: only the minimal context is sent, and it is the M10 interface that is used', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    await harness.service.generateCandidateInsights({
      operation_id: 'op-ctx',
      source_attempt_id: ID_SOURCE as never,
    });

    const call = harness.provider.generation_calls[0];
    assert.ok(call !== undefined);
    assert.equal(call.schema_id, INSIGHT_GENERATION_SCHEMA_ID);

    /* The current record and the related historical content ARE present. */
    assert.ok(call.user_message.includes(ID_SOURCE));
    assert.ok(call.user_message.includes(ID_RELATED));
    assert.ok(call.user_message.includes(levelAPath(ID_RELATED, 'goal')));

    /* 🔴 An unrelated record, the Draft and a whole-workspace dump are NOT sent. */
    for (const forbidden of [ID_UNRELATED_SECOND, ID_DRAFT, 'X1', 'R5', 'S5', 'workspace.json']) {
      assert.equal(
        call.user_message.includes(forbidden),
        false,
        `the step ⑧ context must not carry "${forbidden}"`,
      );
    }

    /* 🔴 Every invocation went through the injected `M10` adapter - this IS that adapter. */
    assert.equal(harness.provider.invocations.length, harness.provider.calls.length);
    for (const invocation of harness.provider.invocations) {
      assert.equal(invocation.provider_id, harness.provider.adapter.provider_id);
      assert.equal(invocation.credential_ref, null);
    }
  });

  it('§6 / AC-95: only an ACCEPTED decision inference is offered as a confirmed basis', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([insightAnswer()]),
    });
    /* Add one accepted and one unresolved candidate cause to the source record afterwards. */
    await harness.attempts.updateAttempt(ID_SOURCE as never, {
      candidate_causes: [
        {
          content_item_id: `${ID_SOURCE}:cause:accepted`,
          source_type: 'Inference',
          confirmation_class: 'decision',
          decision_state: 'accepted',
          value: 'ACCEPTED_CAUSE_MARKER',
        },
        {
          content_item_id: `${ID_SOURCE}:cause:unresolved`,
          source_type: 'Inference',
          confirmation_class: 'decision',
          decision_state: 'unresolved',
          value: 'UNRESOLVED_CAUSE_MARKER',
        },
      ],
    });
    await harness.service.generateCandidateInsights({
      operation_id: 'op-cause',
      source_attempt_id: ID_SOURCE as never,
    });
    const call = harness.provider.generation_calls[0];
    assert.ok(call !== undefined);
    assert.ok(call.user_message.includes('ACCEPTED_CAUSE_MARKER'));
    assert.equal(
      call.user_message.includes('UNRESOLVED_CAUSE_MARKER'),
      false,
      'an unresolved decision inference is never presented as a confirmed basis (§4.3 / AC-95)',
    );
  });

  it('§24 / AC-89: an AI runtime failure preserves everything and is retryable', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([insightAnswer()]),
      fail_step_8_with: timeoutError(),
    });
    const failure = expectRuntimeFailure(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-fail',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.equal(failure.ai_error?.code, 'PROVIDER_TIMEOUT');
    assert.equal(failure.retryable, true);
    assert.equal(failure.insights_preserved, true);
    assert.deepEqual(harness.insightFiles(), []);
    /* 🔴 A runtime failure never becomes an empty result. */
    assert.equal(failure.detail, 'The provider request timed out.');
    assert.ok(!failure.detail.includes(NOT_A_REAL_LLM_OUTPUT));
  });

  it('IMPLEMENTATION INVARIANT（task §11 / AC-23）: a scoring or numeric answer is refused outright', async () => {
    for (const payload of [
      { insights: [{ ...insightAnswer(), confidence: 'high' }], exit_route: 'NONE' },
      { insights: [{ ...insightAnswer(), e2_check: 0.9 }], exit_route: 'NONE' },
      { insights: [{ ...insightAnswer(), evidence_strength: 'strong' }], exit_route: 'NONE' },
    ]) {
      const { harness } = await seedStandardFixture({ generation: payload });
      const refused = expectRefused(
        await harness.service.generateCandidateInsights({
          operation_id: 'op-score',
          source_attempt_id: ID_SOURCE as never,
        }),
      );
      assert.equal(refused.code, 'AI_PROPOSAL_REJECTED');
      assert.ok(
        refused.issues.some(
          (issue) =>
            issue.code === 'FORBIDDEN_SCORING_FIELD' || issue.code === 'SCHEMA_VIOLATION',
        ),
      );
    }
  });

  it('AC-99 / §19: an E2-failing candidate is NOT turned into a zero-output exit', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          e2_check: 'fail',
          e2_reason: '当前表述仍然含混，不足以成为一个明确的经验命题。',
          missing_items: [
            {
              description: '命题仍然含混',
              why_important: '含混的结论无法被复用，也无法被验证。',
              how_to_supplement: '把“效果不好”改成可观察的结果描述。',
            },
          ],
        }),
      ]),
    });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-e2fail',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.equal(outcome.insights.length, 1);
    assert.equal(outcome.insights[0]?.state, 'candidate');
    assert.equal(outcome.batch.exit_route, null);
  });

  it('AC-132: the model comes from the adapter configuration, never from business logic', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([insightAnswer()]),
      model: 'configured-model-7',
    });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-model',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.equal(outcome.insights.length, 1);
    const invocation = harness.provider.invocations.find(
      (entry) => entry.request.structured_output?.schema_id === INSIGHT_GENERATION_SCHEMA_ID,
    );
    assert.equal(invocation?.request.model, 'configured-model-7');
  });
});
