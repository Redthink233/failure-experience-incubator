/**
 * S01-05 ｜ C1 – C6 ｜ Step ① capture and Draft creation.
 *
 * Canonical AC references used by this file:
 *   AC-01 / AC-04 / AC-05 / AC-06 / AC-77 / AC-87 / AC-88 / AC-89.
 * 🔴 This file creates NO new AC. Every AI answer is a hand-written fixture
 *    (NOT_A_REAL_LLM_OUTPUT): no model and no provider is verified here.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EMPTY_INPUT_ENTRY_HINT,
  validateAttemptCaptureInput,
} from '../../../application/capture/input-validation.js';
import { L4_PRODUCT_LAYER_FIELDS } from '../../../domain/types/attempt.js';
import {
  makeHarness,
  NOT_A_REAL_LLM_OUTPUT,
  parsePayload,
  timeoutError,
} from './capture-test-harness.js';

describe('S01-05｜step ① capture (fixtures are NOT_A_REAL_LLM_OUTPUT)', () => {
  it('AC-87｜C1 an empty input is refused with an entry hint - no record, no error', async () => {
    const validation = validateAttemptCaptureInput('');
    assert.equal(validation.kind, 'rejected');
    if (validation.kind !== 'rejected') {
      return;
    }
    assert.equal(validation.code, 'EMPTY_OR_WHITESPACE_ONLY');
    assert.equal(validation.entry_hint, EMPTY_INPUT_ENTRY_HINT);
    assert.ok(validation.entry_hint.trim().length > 0);

    const harness = makeHarness({ kind: 'structured', value: parsePayload() });
    const outcome = await harness.service.beginCapture({ operation_id: 'op-1', raw_text: '' });
    assert.equal(outcome.kind, 'input_rejected');
    assert.equal(outcome.attempt, null);
    assert.equal(outcome.parse, null);
    assert.equal((await harness.repository.listAttempts()).length, 0);
    assert.equal(harness.provider.invocations.length, 0, 'no AI call may happen for a rejected input');
  });

  it('AC-87｜C2 a pure-whitespace input is refused as well', async () => {
    for (const blank of ['   ', '\n\t ', '\u3000\u3000']) {
      const validation = validateAttemptCaptureInput(blank);
      assert.equal(validation.kind, 'rejected', `"${blank}" must be refused`);
    }
    const harness = makeHarness({ kind: 'structured', value: parsePayload() });
    const outcome = await harness.service.beginCapture({ operation_id: 'op-2', raw_text: ' \n ' });
    assert.equal(outcome.kind, 'input_rejected');
    assert.equal((await harness.repository.listAttempts()).length, 0);
  });

  it('AC-88｜C3 one-character and short inputs create a Draft (no ≥ 8 character threshold)', async () => {
    for (const short of ['失', '失败了', '还是不行']) {
      const validation = validateAttemptCaptureInput(short);
      assert.equal(validation.kind, 'accepted', `"${short}" (${short.length} chars) must be accepted`);
    }
    const harness = makeHarness({ kind: 'structured', value: parsePayload() });
    const outcome = await harness.service.beginCapture({ operation_id: 'op-3', raw_text: '失' });
    assert.equal(outcome.kind, 'captured');
    assert.equal(outcome.attempt?.state, 'Draft');
    assert.equal(outcome.attempt?.raw_text.value, '失');
  });

  it('AC-04｜C4 a natural-language input creates a Draft whose optional fields are explicitly unknown', async () => {
    assert.equal(NOT_A_REAL_LLM_OUTPUT, 'NOT_A_REAL_LLM_OUTPUT');
    const harness = makeHarness({ kind: 'structured', value: parsePayload() });
    const raw = '我试着把热风温度调到 70 度，结果表面裂了';
    const outcome = await harness.service.beginCapture({ operation_id: 'op-4', raw_text: raw });

    assert.equal(outcome.kind, 'captured');
    const attempt = outcome.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    assert.equal(attempt.state, 'Draft');
    assert.equal(attempt.archive_state, 'active');
    assert.equal(attempt.raw_text.source_type, 'Fact');
    assert.equal(attempt.raw_text.value, raw);
    /* The Draft starts with EXPLICIT unknown - never an empty string, never a default. */
    assert.equal(attempt.goal.presence_state, 'unknown');
    assert.equal(attempt.actual_attempt.presence_state, 'unknown');
    assert.equal(attempt.actual_result.presence_state, 'unknown');
    assert.equal(attempt.result_status.presence_state, 'unknown');
    assert.equal(attempt.cost.presence_state, 'unknown');
    assert.equal(attempt.occurred_at.presence_state, 'unknown');
    assert.deepEqual(attempt.candidate_causes, []);
    assert.deepEqual(attempt.failure_tags, []);
    /* §9 ② is a separate step: parsing does not write into the Draft. */
    assert.equal(attempt.actual_result.presence_state, 'unknown');
  });

  it('AC-77｜C5 the Draft is persistable and carries the four product-layer records', async () => {
    const harness = makeHarness({ kind: 'structured', value: parsePayload() });
    const outcome = await harness.service.beginCapture({
      operation_id: 'op-5',
      raw_text: '把温度调到 70 度后表面开裂',
    });
    const attempt = outcome.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }

    const reloaded = await harness.repository.readAttempt(attempt.attempt_id);
    assert.ok(reloaded !== null, 'the Draft must be readable back from the workspace');
    assert.equal(reloaded?.raw_text.value, attempt.raw_text.value);

    for (const field of L4_PRODUCT_LAYER_FIELDS) {
      if (field === 'ai_source_marks') {
        /* ④ is satisfied structurally: every content item carries its own `source_type`. */
        assert.equal(reloaded?.raw_text.source_type, 'Fact');
        continue;
      }
      assert.ok(
        Object.prototype.hasOwnProperty.call(reloaded, field),
        `the Attempt must carry the L4 field "${field}"`,
      );
    }
    assert.equal(reloaded?.data_source_nature, 'field_record');
  });

  it('AC-89｜C6 a runtime AI failure preserves the Draft instead of faking a parse', async () => {
    const harness = makeHarness({ kind: 'error', error: timeoutError() });
    const outcome = await harness.service.beginCapture({
      operation_id: 'op-6',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });

    assert.equal(outcome.kind, 'captured');
    assert.ok(outcome.parse !== null);
    assert.equal(outcome.parse?.kind, 'runtime_failure');
    if (outcome.parse?.kind !== 'runtime_failure') {
      return;
    }
    assert.equal(outcome.parse.ai_error?.code, 'PROVIDER_TIMEOUT');
    assert.equal(outcome.parse.retryable, true);
    assert.equal(outcome.parse.draft_preserved, true);

    const attempt = outcome.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    /* 🔴 The Draft survives, intact, and is still listable: nothing was swallowed. */
    const stored = await harness.repository.listAttempts();
    assert.equal(stored.length, 1);
    assert.equal(stored[0]?.attempt_id, attempt.attempt_id);
    assert.equal(stored[0]?.raw_text.value, '把热风温度调到 70 度，结果开裂');
    assert.equal(stored[0]?.state, 'Draft');
  });
});
