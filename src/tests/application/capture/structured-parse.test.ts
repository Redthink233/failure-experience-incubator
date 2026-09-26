/**
 * S01-05 ｜ P1 – P6 ｜ Step ② structured parse and the Extraction boundary.
 *
 * Canonical AC references used by this file:
 *   AC-04 / AC-07 / AC-10 / AC-11 / AC-28 / AC-88 / AC-89 / AC-Q06-5 / AC-Q06-6.
 * 🔴 This file creates NO new AC. All AI answers are hand-written fixtures
 *    (NOT_A_REAL_LLM_OUTPUT) - a green run says nothing about any model's ability.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { attemptParsePromptMessages } from '../../../application/capture/prompts.js';
import {
  ATTEMPT_PARSE_SCHEMA_ID,
  attemptParseJsonSchema,
  structuredOutputRequest,
} from '../../../application/capture/schemas.js';
import { CAPTURE_FIELD_KEYS } from '../../../application/capture/types.js';
import { confirmStructuredAttempt } from '../../../application/capture/confirmation.js';
import { evaluateFormalization } from '../../../application/capture/formalization.js';
import { contentOf, makeHarness, parsePayload } from './capture-test-harness.js';

const PROMPT_TEXT = attemptParsePromptMessages('原始输入')
  .map((message) => `${message.role}:${message.content}`)
  .join('\n');

describe('S01-05｜step ② structured parse', () => {
  it('AC-07｜P1 explicit text becomes Extraction, and only the fields really stated are filled', async () => {
    const harness = makeHarness({
      kind: 'structured',
      value: parsePayload({
        goal: '缩短干燥时间',
        actual_attempt: '把热风温度调高',
        actual_result: '表面开裂',
        condition: '环境湿度 60%',
      }),
    });
    const outcome = await harness.service.beginCapture({
      operation_id: 'p1',
      raw_text: '我想缩短干燥时间，把热风温度调高，环境湿度 60%，结果表面开裂',
    });

    assert.equal(outcome.parse?.kind, 'parsed');
    if (outcome.parse?.kind !== 'parsed') {
      return;
    }
    const fields = outcome.parse.proposal.extractions.map((entry) => entry.field);
    assert.deepEqual([...fields].sort(), ['actual_attempt', 'actual_result', 'condition', 'goal']);

    const attempt = outcome.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    const confirmation = confirmStructuredAttempt({
      attempt,
      proposal: outcome.parse.proposal,
      request: { operation_id: 'p1-c', attempt_id: attempt.attempt_id, user_confirmed: true },
    });
    assert.equal(confirmation.kind, 'applied');
    if (confirmation.kind !== 'applied') {
      return;
    }
    /* 🔴 An AI extraction stays `Extraction`; confirming it does not make it a `Fact`. */
    const goal = contentOf(confirmation.patch.goal);
    assert.ok(goal !== null);
    assert.equal(goal?.source_type, 'Extraction');
    assert.equal(goal?.value, '缩短干燥时间');
    assert.deepEqual([...confirmation.extraction_fields].sort(), [
      'actual_attempt',
      'actual_result',
      'condition',
      'goal',
    ]);
    assert.deepEqual(confirmation.user_fact_fields, []);
  });

  it('AC-04｜P2 an unstaked field stays unknown - neither hallucinated nor sentinel-filled', async () => {
    const baseline = await makeHarness({ kind: 'structured', value: parsePayload() });
    const first = await baseline.service.beginCapture({ operation_id: 'p2a', raw_text: '原始输入' });
    assert.equal(first.parse?.kind, 'parsed');
    if (first.parse?.kind === 'parsed') {
      assert.ok(first.parse.proposal.missing_fields.includes('condition'));
      assert.ok(first.parse.proposal.missing_fields.includes('judgment_basis'));
    }

    /* A placeholder answer must be dropped, never stored as if it were a real value. */
    const harness = makeHarness({
      kind: 'structured',
      value: parsePayload({ condition: '未知', judgment_basis: 'N/A', environment: '   ' }),
    });
    const outcome = await harness.service.beginCapture({ operation_id: 'p2b', raw_text: '原始输入' });
    assert.equal(outcome.parse?.kind, 'parsed');
    if (outcome.parse?.kind !== 'parsed') {
      return;
    }
    const fields = outcome.parse.proposal.extractions.map((entry) => entry.field);
    assert.ok(!fields.includes('condition'));
    assert.ok(!fields.includes('judgment_basis'));
    assert.ok(!fields.includes('environment'));
    assert.ok(outcome.parse.proposal.missing_fields.includes('condition'));

    const attempt = outcome.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    const confirmation = confirmStructuredAttempt({
      attempt,
      proposal: outcome.parse.proposal,
      request: { operation_id: 'p2c', attempt_id: attempt.attempt_id, user_confirmed: true },
    });
    if (confirmation.kind !== 'applied') {
      assert.fail('the confirmation should have been applied');
    }
    assert.equal(confirmation.patch.condition, undefined);
    assert.equal(confirmation.patch.environment, undefined);
  });

  it('IMPLEMENTATION INVARIANT (P3): the parse step produces no Cause / Insight / Hypothesis (contract §9 ② / AC-28)', async () => {
    const schema_keys = Object.keys(
      (attemptParseJsonSchema['properties'] ?? {}) as Readonly<Record<string, unknown>>,
    );
    for (const forbidden of ['causes', 'candidate_causes', 'insight', 'hypothesis', 'experience']) {
      assert.ok(!schema_keys.includes(forbidden), `the parse schema must not request "${forbidden}"`);
    }
    assert.ok(
      PROMPT_TEXT.includes('不要推断失败原因'),
      'the parse prompt must forbid producing failure causes',
    );
    assert.ok(PROMPT_TEXT.includes('Insight') && PROMPT_TEXT.includes('Hypothesis'));
    for (const key of CAPTURE_FIELD_KEYS) {
      assert.ok(schema_keys.includes(key), `the parse schema must describe "${key}"`);
    }

    const harness = makeHarness({ kind: 'structured', value: parsePayload() });
    const outcome = await harness.service.beginCapture({ operation_id: 'p3', raw_text: '原始输入' });
    assert.equal(outcome.parse?.kind, 'parsed');
    if (outcome.parse?.kind !== 'parsed') {
      return;
    }
    assert.deepEqual(Object.keys(outcome.parse.proposal).sort(), [
      'attempt_id',
      'extractions',
      'key_parameters',
      'missing_fields',
      'parse_status',
      'result_status_proposal',
    ]);
  });

  it('AC-89｜P4 a malformed / unvalidatable structured result is an explicit runtime failure', async () => {
    const request = structuredOutputRequest(ATTEMPT_PARSE_SCHEMA_ID, attemptParseJsonSchema);

    /* (a) not JSON at all → the M10 validator cannot interpret it. */
    const unparseable = await makeHarness(
      { kind: 'text', text: '{not json' },
      { structured_output: 'json_object' },
    );
    const first = await unparseable.service.beginCapture({ operation_id: 'p4a', raw_text: '原始输入' });
    assert.equal(first.parse?.kind, 'runtime_failure');
    if (first.parse?.kind === 'runtime_failure') {
      assert.equal(first.parse.local_code, 'MALFORMED_STRUCTURED_RESULT');
      assert.equal(first.parse.draft_preserved, true);
    }

    /* (b) valid JSON, but the payload is off-schema (no `parse_status`). */
    const offSchema = await makeHarness({ kind: 'structured', value: { goal: '改写目标' } });
    const second = await offSchema.service.beginCapture({ operation_id: 'p4b', raw_text: '原始输入' });
    assert.equal(second.parse?.kind, 'runtime_failure');
    if (second.parse?.kind === 'runtime_failure') {
      assert.equal(second.parse.local_code, 'SCHEMA_VIOLATION');
    }

    /* (c) the provider cannot express a constrained answer → fail explicitly, call nothing. */
    const none = await makeHarness(
      { kind: 'structured', value: parsePayload() },
      { structured_output: 'none' },
    );
    const third = await none.service.beginCapture({ operation_id: 'p4c', raw_text: '原始输入' });
    assert.equal(third.parse?.kind, 'runtime_failure');
    if (third.parse?.kind === 'runtime_failure') {
      assert.equal(third.parse.local_code, 'NO_STRUCTURED_OUTPUT_AVAILABLE');
      assert.equal(third.parse.retryable, false);
    }
    assert.equal(none.provider.invocations.length, 0, 'an unsupported mode must not reach the network');

    /* The request itself is well formed: the failure came from the answer, not the request. */
    assert.equal(request.preferred_mode, 'native_schema');
    assert.equal(request.json_schema, attemptParseJsonSchema);
  });

  it('AC-07｜P5 a user rewrite becomes user Fact content while untouched inductions stay Extraction', async () => {
    const harness = makeHarness({
      kind: 'structured',
      value: parsePayload({ goal: 'AI 抽的目标', actual_attempt: 'AI 抽的尝试' }),
    });
    const outcome = await harness.service.beginCapture({ operation_id: 'p5', raw_text: '原始输入' });
    assert.equal(outcome.attempt !== null, true);
    const attempt = outcome.attempt;
    if (attempt === null) {
      return;
    }

    const applied = await harness.service.applyStructuredConfirmation({
      operation_id: 'p5-confirm',
      attempt_id: attempt.attempt_id,
      corrections: [{ field: 'goal', value: '我自己改写的目标' }],
      result_status: { decision: 'unresolved' },
      user_confirmed: true,
    });
    if (applied.result.kind !== 'applied') {
      assert.fail(`expected an applied confirmation, received ${applied.result.kind}`);
    }
    assert.ok(applied.result.user_fact_fields.includes('goal'));
    assert.ok(applied.result.extraction_fields.includes('actual_attempt'));

    const persisted_goal = contentOf(applied.persisted?.goal);
    assert.ok(persisted_goal !== null);
    assert.equal(persisted_goal?.source_type, 'Fact');
    assert.equal(persisted_goal?.value, '我自己改写的目标');

    const persisted_attempt = contentOf(applied.persisted?.actual_attempt);
    assert.equal(persisted_attempt?.source_type, 'Extraction');
    assert.equal(persisted_attempt?.value, 'AI 抽的尝试');
    /* 🔴 The overridden AI induction is NOT relabelled as a Fact; it is reported, not rewritten. */
    assert.deepEqual(
      applied.result.retained_ai_extractions.map((entry) => entry.value),
      ['AI 抽的目标'],
    );
    assert.equal(applied.result.integration_notes.length, 1);
  });

  it('AC-Q06-5｜P6 nothing becomes Formal before the user explicitly confirms', async () => {
    const harness = makeHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const outcome = await harness.service.beginCapture({ operation_id: 'p6', raw_text: '原始输入' });
    const attempt = outcome.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }

    const applied = await harness.service.applyStructuredConfirmation({
      operation_id: 'p6-content',
      attempt_id: attempt.attempt_id,
      result_status: { decision: 'accepted', value: '未达到预期' },
      /* 🔴 The content is confirmed but the FORMAL promotion is not requested yet. */
      user_confirmed: true,
    });
    if (applied.result.kind !== 'applied') {
      assert.fail('expected an applied confirmation');
    }
    assert.equal(applied.persisted?.state, 'Draft');
    assert.equal(
      Object.prototype.hasOwnProperty.call(applied.result.patch, 'state'),
      false,
      'a content confirmation must never carry a state change',
    );

    const ready = applied.persisted;
    assert.ok(ready !== null);
    if (ready === null) {
      return;
    }
    /* The Formal prerequisites are now satisfied, yet the record is STILL a Draft. */
    const withoutConfirmation = evaluateFormalization({
      operation_id: 'p6-save',
      attempt: ready,
      user_explicitly_confirmed: false,
    });
    assert.equal(withoutConfirmation.decision.outcome, 'draft_retained');
    assert.deepEqual([...withoutConfirmation.decision.block_reasons], ['NOT_USER_CONFIRMED']);
    assert.equal(withoutConfirmation.promotion_patch, null);

    const withConfirmation = evaluateFormalization({
      operation_id: 'p6-save-2',
      attempt: ready,
      user_explicitly_confirmed: true,
    });
    assert.equal(withConfirmation.decision.outcome, 'ready');
    assert.deepEqual(withConfirmation.promotion_patch, { state: 'Formal' });
  });
});
