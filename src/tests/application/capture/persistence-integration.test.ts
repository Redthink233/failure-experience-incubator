/**
 * S01-05-INTEGRATE ｜ IMPLEMENTATION INVARIANT ｜ persistence wiring of the capture layer.
 *
 * 🔴 This file creates NO new AC. Every case is an IMPLEMENTATION INVARIANT tied to an EXISTING
 *    Frozen section / Decision:
 *      task §4 / §5 / §6   → contract §4.2 rule 3 (`D-024` / AC-30), §9 ③, docs/02 §C.4;
 *      task §7 / §8 / §9   → docs/02 §C.5 (`TC-29` / AC-Q06-1), AC-16 / AC-17 / AC-88 / AC-89;
 *      task §10            → §9 ②; the in-memory proposal cache is never the only source of truth;
 *      task §13 / §14 / §15→ AC-10 / AC-93 / AC-94 / AC-95 (candidate causes).
 *
 * 🔴 Every AI payload used here is a hand-written fixture (`NOT_A_REAL_LLM_OUTPUT`). No network
 *    call is made and no model behaviour is claimed.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { projectAttemptToLevelA } from '../../../domain/projection/level-a.js';
import { LEVEL_A_FORBIDDEN_SOURCE_FIELDS } from '../../../domain/projection/level-a.js';
import {
  CONTENT_ITEM_FIELD_KEYS,
  FOLLOW_UP_AI_EXTRACTION_FIELD_KEY,
  FOLLOW_UP_QUESTION_FIELD_KEY,
  FOLLOW_UP_USER_ANSWER_FIELD_KEY,
  KEY_PARAMETER_FIELD_KEY,
} from '../../../domain/types/content-item-record.js';
import {
  FOLLOW_UP_GAP_KEYS,
  MAX_KEY_FOLLOW_UP_QUESTIONS,
} from '../../../domain/types/follow-up.js';
import {
  LEVEL_A_DIMENSIONS,
  LEVEL_A_FIELD_PATH_MAP,
} from '../../../domain/types/level-a.js';
import {
  UNASSIGNED_PROJECT_BUCKET,
  attemptSidecarPath,
} from '../../../workspace/schema/paths.js';
import { AttemptRepositoryError } from '../../../workspace/repository/attempt-repository.js';
import {
  NOT_A_REAL_LLM_OUTPUT,
  causePayload,
  makeReloadableHarness,
  parsePayload,
  timeoutError,
} from './capture-test-harness.js';

const ACCEPTED_STATUS = { decision: 'accepted' as const, value: '未达到预期' };

/** Raw sidecar JSON of an Attempt - used to assert what really reached the disk image. */
function sidecarJson(harness: { storage: { peek(path: string): string | undefined } }, attempt_id: string): string {
  const json = harness.storage.peek(attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, attempt_id));
  assert.ok(json !== undefined, 'the Attempt sidecar must exist');
  return json as string;
}

describe('S01-05-INTEGRATE｜follow-up dual persistence (§4.2 rule 3 / AC-30)', () => {
  it('IMPLEMENTATION INVARIANT (I3/I4/I5): a follow-up answer persists as TWO independently typed content items', async () => {
    assert.equal(NOT_A_REAL_LLM_OUTPUT, 'NOT_A_REAL_LLM_OUTPUT');
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({
        condition: 'AI 归纳：热风温度 70 度',
        result_status_proposal: '未达到预期',
      }),
    });

    const started = await harness.service.beginCapture({
      operation_id: 'i3-begin',
      raw_text: '把热风温度从 50 度调到 70 度想缩短干燥时间，结果表面开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }

    const user_words = '环境湿度 60%，热风温度 70 度';
    const applied = await harness.service.applyStructuredConfirmation({
      operation_id: 'i3-confirm',
      attempt_id: attempt.attempt_id,
      corrections: [{ field: 'condition', value: user_words, answer_to_gap: 'condition' }],
      result_status: ACCEPTED_STATUS,
      user_confirmed: true,
    });
    assert.equal(applied.result.kind, 'applied');

    /* (1) The main field path carries the USER's wording, as a user `Fact` (§9 ③). */
    const stored = await harness.repository.readAttempt(attempt.attempt_id);
    assert.equal(stored?.condition.presence_state, 'present');
    const condition = stored?.condition.presence_state === 'present' ? stored.condition.item : null;
    assert.equal(condition?.source_type, 'Fact');
    assert.equal(condition?.value, user_words);

    /* (2) Both provenance layers are persisted, as TWO items with distinct ids. */
    const items = await harness.repository.readAttemptContentItems(attempt.attempt_id);
    const user_item = items.find((item) => item.field_key === FOLLOW_UP_USER_ANSWER_FIELD_KEY);
    const ai_item = items.find((item) => item.field_key === FOLLOW_UP_AI_EXTRACTION_FIELD_KEY);
    assert.ok(user_item !== undefined, 'the user-answer layer must be persisted');
    assert.ok(ai_item !== undefined, 'the AI-induction layer must be persisted');
    if (user_item === undefined || ai_item === undefined) {
      return;
    }
    assert.equal(user_item.source_type, 'Fact');
    assert.equal(user_item.value, user_words);
    assert.equal(ai_item.source_type, 'Extraction');
    assert.equal(ai_item.value, 'AI 归纳：热风温度 70 度');
    assert.notEqual(user_item.content_item_id, ai_item.content_item_id);
    /* 🔴 Neither layer may be relabelled into the other (§4.2 rule 1 / AC-30). */
    assert.ok(!items.some((item) => item.source_type === 'Fact' && item.field_key === FOLLOW_UP_AI_EXTRACTION_FIELD_KEY));
    assert.ok(!items.some((item) => item.source_type === 'Extraction' && item.field_key === FOLLOW_UP_USER_ANSWER_FIELD_KEY));

    /* (3) A brand-new repository over the SAME storage still sees both layers. */
    const reloaded = harness.reopenRepository();
    const after_reload = await reloaded.readAttemptContentItems(attempt.attempt_id);
    assert.deepEqual(
      after_reload.map((item) => [item.field_key, item.source_type, item.value]).sort(),
      items.map((item) => [item.field_key, item.source_type, item.value]).sort(),
    );
  });

  it('IMPLEMENTATION INVARIANT (I4b): an answer to a gap the AI never induced persists ONE layer - nothing is fabricated', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'i4b-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    /* `condition` is NOT in the parse fixture, so there is no AI induction to pair with. */
    assert.ok(started.follow_up?.missing_gaps.includes('condition'));

    await harness.service.applyStructuredConfirmation({
      operation_id: 'i4b-confirm',
      attempt_id: attempt.attempt_id,
      corrections: [{ field: 'condition', value: '室温 25 度', answer_to_gap: 'condition' }],
      result_status: ACCEPTED_STATUS,
      user_confirmed: true,
    });

    const items = await harness.repository.readAttemptContentItems(attempt.attempt_id);
    assert.equal(
      items.filter((item) => item.field_key === FOLLOW_UP_USER_ANSWER_FIELD_KEY).length,
      1,
    );
    /* 🔴 No AI induction was produced, so no `Extraction` may be invented (§4.2 rule 1). */
    assert.equal(
      items.filter((item) => item.field_key === FOLLOW_UP_AI_EXTRACTION_FIELD_KEY).length,
      0,
    );
  });
});

describe('S01-05-INTEGRATE｜Level A stays a four-dimension projection (task §6 / §9.4.1)', () => {
  it('IMPLEMENTATION INVARIANT (I6): a follow-up answer completes the main field and survives a reload', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'i6-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    /* The condition gap really is open before the answer. */
    const before = projectAttemptToLevelA(attempt);
    assert.equal(before.condition.presence_state, 'unknown');

    const user_words = '环境湿度 60%';
    await harness.service.applyStructuredConfirmation({
      operation_id: 'i6-confirm',
      attempt_id: attempt.attempt_id,
      corrections: [{ field: 'condition', value: user_words, answer_to_gap: 'condition' }],
      result_status: ACCEPTED_STATUS,
      user_confirmed: true,
    });

    const reloaded = harness.reopenRepository();
    const reread = await reloaded.readAttempt(attempt.attempt_id);
    assert.ok(reread !== null);
    if (reread === null) {
      return;
    }

    /* 🔴 S01-03 reads `level_a.condition` - the follow-up answer must NOT be an island. */
    const projection = projectAttemptToLevelA(reread);
    assert.equal(projection.condition.presence_state, 'present');
    assert.equal(projection.condition.item?.value, user_words);
    assert.equal(projection.condition.item?.source_type, 'Fact');
    assert.equal(projection.condition.field_path, 'condition');

    /* 🔴 The mapping still has EXACTLY one primary path per dimension - no second / third path. */
    assert.deepEqual([...LEVEL_A_DIMENSIONS].sort(), ['approach', 'condition', 'goal', 'result']);
    assert.equal(Object.keys(LEVEL_A_FIELD_PATH_MAP).length, 4);
    assert.equal(projection.condition.field_path, LEVEL_A_FIELD_PATH_MAP.condition);
    for (const dimension of LEVEL_A_DIMENSIONS) {
      assert.equal(projection[dimension].field_path, LEVEL_A_FIELD_PATH_MAP[dimension]);
    }
    /* The follow-up provenance keys are NOT Level A primary paths, and never may become one. */
    for (const key of [
      FOLLOW_UP_USER_ANSWER_FIELD_KEY,
      FOLLOW_UP_AI_EXTRACTION_FIELD_KEY,
      FOLLOW_UP_QUESTION_FIELD_KEY,
    ]) {
      assert.ok(
        !Object.values(LEVEL_A_FIELD_PATH_MAP).includes(key as never),
        `${key} must not be a Level A primary field path`,
      );
      assert.ok(!LEVEL_A_FORBIDDEN_SOURCE_FIELDS.includes(key as never));
    }
    /* And both provenance layers are present in the same reloaded record. */
    const items = await reloaded.readAttemptContentItems(attempt.attempt_id);
    assert.equal(items.filter((item) => item.field_key === FOLLOW_UP_USER_ANSWER_FIELD_KEY).length, 1);
  });
});

describe('S01-05-INTEGRATE｜Attempt Draft State persistence (docs/02 §C.5)', () => {
  it('IMPLEMENTATION INVARIANT (I7): the draft state round-trips and its counter is derived, never patched directly', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'i7-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }

    const initial = await harness.repository.readAttemptDraftState(attempt.attempt_id);
    assert.ok(initial !== null);
    assert.equal(initial?.attempt_id, attempt.attempt_id);
    assert.equal(initial?.parse_state, 'pending_user_confirm');
    assert.equal(initial?.asked_key_question_count, 0);
    assert.deepEqual([...initial?.abandoned_gap_set ?? []], []);

    const updated = await harness.repository.updateAttemptDraftState(attempt.attempt_id, {
      parse_state: 'not_extracted',
      abandoned_gap_set: ['judgment_basis'],
      gap_priority_hint: { remaining_gaps: [{ gap: 'condition', priority: 'P2' }] },
    });
    assert.equal(updated.parse_state, 'not_extracted');
    assert.deepEqual([...updated.abandoned_gap_set], ['judgment_basis']);

    const reread = await harness.reopenRepository().readAttemptDraftState(attempt.attempt_id);
    assert.deepEqual(reread, updated);

    /* 🔴 The counter is not independently patchable: its ONLY growth path is registering a real
     *    question, which writes the question item and the counter in the same patch (§11). */
    await harness.service.askFollowUpQuestion({
      operation_id: 'i7-q1',
      attempt_id: attempt.attempt_id,
      question_text: '当时的具体条件是什么？',
      target_gap: 'condition',
    });
    const grown = await harness.reopenRepository().readAttemptDraftState(attempt.attempt_id);
    assert.equal(grown?.asked_key_question_count, 1);
    assert.deepEqual([...grown?.asked_gap_set ?? []], ['condition']);
    assert.deepEqual([...grown?.abandoned_gap_set ?? []], ['judgment_basis']);

    /* The attached record really is part of the sidecar document. */
    assert.ok(sidecarJson(harness, attempt.attempt_id).includes('"draft_state"'));
  });

  it('IMPLEMENTATION INVARIANT (I8/I9): the question counter is persisted, so a recreated service still refuses the 4th question', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'i8-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }

    const askable = started.follow_up?.missing_gaps ?? [];
    assert.ok(askable.length >= MAX_KEY_FOLLOW_UP_QUESTIONS, `expected at least 3 open gaps, got ${askable.length}`);

    /* Re-presenting the SAME question must not grow the budget (AC-Q06-1). */
    const first = await harness.service.askFollowUpQuestion({
      operation_id: 'i8-q1',
      attempt_id: attempt.attempt_id,
      question_text: '当时的具体条件是什么？',
      target_gap: 'condition',
    });
    assert.equal(first.kind, 'asked');
    assert.equal(first.draft_state?.asked_key_question_count, 1);
    const repeated = await harness.service.askFollowUpQuestion({
      operation_id: 'i8-q1-repeat',
      attempt_id: attempt.attempt_id,
      question_text: '当时的具体条件是什么？（再展示一次）',
      target_gap: 'condition',
    });
    assert.equal(repeated.kind, 'rejected');
    assert.equal(repeated.rejection_code, 'GAP_ALREADY_ASKED');
    assert.equal(repeated.draft_state?.asked_key_question_count, 1);

    for (const [index, gap] of (['judgment_basis', 'key_parameter'] as const).entries()) {
      const asked = await harness.service.askFollowUpQuestion({
        operation_id: `i8-q${index + 2}`,
        attempt_id: attempt.attempt_id,
        question_text: `追问 ${gap}`,
        target_gap: gap,
      });
      assert.equal(asked.kind, 'asked');
    }

    /* The 3rd question fills the budget; the 4th must not exist (AC-16). */
    const snapshot = await harness.repository.readAttemptDraftState(attempt.attempt_id);
    assert.equal(snapshot?.asked_key_question_count, MAX_KEY_FOLLOW_UP_QUESTIONS);

    /* 🔴 A BRAND-NEW service over the same workspace still refuses the 4th question. */
    const reopened = harness.reopen();
    const fourth = await reopened.askFollowUpQuestion({
      operation_id: 'i8-q4',
      attempt_id: attempt.attempt_id,
      question_text: '第 4 个问题',
      target_gap: 'goal',
    });
    assert.equal(fourth.kind, 'rejected');
    assert.equal(fourth.rejection_code, 'BUDGET_EXHAUSTED');
    assert.equal(fourth.draft_state?.asked_key_question_count, MAX_KEY_FOLLOW_UP_QUESTIONS);

    /* And the reopened service reads the persisted state, not a fresh one. */
    const state = await reopened.readCaptureState(attempt.attempt_id);
    assert.equal(state?.draft_state.asked_key_question_count, MAX_KEY_FOLLOW_UP_QUESTIONS);
    assert.equal(state?.follow_up.exhausted, true);
    assert.equal(state?.follow_up.next_gap, null);

    /* The persisted question items and the persisted counter describe the same fact. */
    const items = await reopened.readCaptureState(attempt.attempt_id);
    assert.equal(
      items?.content_items.filter((item) => item.field_key === FOLLOW_UP_QUESTION_FIELD_KEY).length,
      MAX_KEY_FOLLOW_UP_QUESTIONS,
    );
  });

  it('IMPLEMENTATION INVARIANT (I10): an abandoned gap is persisted and never asked again after a reload (AC-17)', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'i10-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }

    const abandoned = await harness.service.abandonFollowUpGap({
      operation_id: 'i10-abandon',
      attempt_id: attempt.attempt_id,
      gap: 'condition',
    });
    assert.equal(abandoned.kind, 'abandoned');
    assert.deepEqual([...abandoned.draft_state?.abandoned_gap_set ?? []], ['condition']);
    /* A dismissal is not a question and never costs budget (AC-Q06-4). */
    assert.equal(abandoned.draft_state?.asked_key_question_count, 0);

    const reopened = harness.reopen();
    const asked = await reopened.askFollowUpQuestion({
      operation_id: 'i10-ask',
      attempt_id: attempt.attempt_id,
      question_text: '当时的具体条件是什么？',
      target_gap: 'condition',
    });
    assert.equal(asked.kind, 'rejected');
    assert.equal(asked.rejection_code, 'GAP_ALREADY_DISMISSED');

    const state = await reopened.readCaptureState(attempt.attempt_id);
    assert.deepEqual([...state?.draft_state.abandoned_gap_set ?? []], ['condition']);
    assert.notEqual(state?.follow_up.next_gap, 'condition');
  });

  it('IMPLEMENTATION INVARIANT (I11): a runtime failure records extract_failed and keeps the Draft intact (AC-89)', async () => {
    const harness = makeReloadableHarness({ kind: 'error', error: timeoutError() });
    const started = await harness.service.beginCapture({
      operation_id: 'i11-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    assert.equal(started.parse?.kind, 'runtime_failure');

    const state = await harness.service.readCaptureState(attempt.attempt_id);
    assert.equal(state?.draft_state.parse_state, 'extract_failed');
    assert.equal(state?.attempt.state, 'Draft');
    assert.equal(state?.attempt.raw_text.value, '把热风温度调到 70 度，结果开裂');
    /* 🔴 Nothing was fabricated: no extraction item exists for a failed parse. */
    assert.deepEqual([...state?.content_items ?? []], []);
  });

  it('IMPLEMENTATION INVARIANT (I13): the attached records are not Attempt members, so they cannot reach Level A / evidence / counts', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'i13-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    const state = await harness.service.readCaptureState(attempt.attempt_id);
    assert.ok(state !== null);
    if (state === null) {
      return;
    }

    /* 🔴 Structural: the draft state and the content-item collection are SIDE records. */
    assert.ok(!('draft_state' in attempt), 'draft_state must not be an Attempt member');
    assert.ok(!('content_items' in attempt), 'content_items must not be an Attempt member');

    /* The Level A projection is exactly the four canonical dimensions. */
    const projection = projectAttemptToLevelA(attempt);
    assert.deepEqual(Object.keys(projection).sort(), [...LEVEL_A_DIMENSIONS].sort());

    /* The draft state's own keys are not Level A field paths. */
    for (const key of Object.keys(state.draft_state)) {
      assert.ok(
        !Object.values(LEVEL_A_FIELD_PATH_MAP).includes(key as never),
        `draft state member "${key}" must not be a Level A field path`,
      );
    }

    /* A listing of product objects never carries the attached records. */
    const listed = await harness.repository.listAttempts();
    assert.ok(listed.length > 0);
    for (const entry of listed) {
      assert.ok(!('draft_state' in entry));
      assert.ok(!('content_items' in entry));
    }
  });

  it('IMPLEMENTATION INVARIANT (I12): after Formal the draft state is kept as a read-only archive', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'i12-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    await harness.service.askFollowUpQuestion({
      operation_id: 'i12-q1',
      attempt_id: attempt.attempt_id,
      question_text: '当时的具体条件是什么？',
      target_gap: 'condition',
    });
    const before = await harness.repository.readAttemptDraftState(attempt.attempt_id);
    assert.equal(before?.asked_key_question_count, 1);

    await harness.service.applyStructuredConfirmation({
      operation_id: 'i12-confirm',
      attempt_id: attempt.attempt_id,
      result_status: ACCEPTED_STATUS,
      user_confirmed: true,
    });
    const saved = await harness.service.saveFormalAttempt({
      operation_id: 'i12-save',
      attempt_id: attempt.attempt_id,
      user_explicitly_confirmed: true,
    });
    assert.equal(saved.attempt?.state, 'Formal');

    /* 🔴 Kept, not deleted (docs/02 §C.5 硬规则 2). */
    const after = await harness.repository.readAttemptDraftState(attempt.attempt_id);
    assert.ok(after !== null);
    assert.equal(after?.asked_key_question_count, before?.asked_key_question_count);
    assert.deepEqual([...after?.asked_gap_set ?? []], [...before?.asked_gap_set ?? []]);
    assert.equal(sidecarJson(harness, attempt.attempt_id).includes('"draft_state"'), true);

    /* 🔴 Read-only archive: it no longer carries a threshold effect and is no longer modified. */
    await assert.rejects(
      () =>
        harness.repository.updateAttemptDraftState(attempt.attempt_id, {
          parse_state: 'extracted',
        }),
      (error: unknown) =>
        error instanceof AttemptRepositoryError && error.code === 'FORMAL_DRAFT_STATE_READONLY',
    );
  });
});

describe('S01-05-INTEGRATE｜pending proposal recovery (task §10)', () => {
  it('IMPLEMENTATION INVARIANT (I14): step ③ still works after a reload with an EMPTY in-memory cache', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({
        condition: '环境湿度 60%',
        result_status_proposal: '未达到预期',
        key_parameters: ['热风温度 70 度'],
      }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'i14-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }

    /* 🔴 A brand-new service has NO in-memory proposal for this Attempt. */
    const reopened = harness.reopen();
    const applied = await reopened.applyStructuredConfirmation({
      operation_id: 'i14-confirm',
      attempt_id: attempt.attempt_id,
      result_status: ACCEPTED_STATUS,
      user_confirmed: true,
    });
    assert.equal(applied.result.kind, 'applied');

    /* The recovered proposal really carried the AI extractions - they were applied. */
    assert.ok(applied.result.extraction_fields.includes('goal'));
    assert.ok(applied.result.extraction_fields.includes('actual_attempt'));
    assert.ok(applied.result.extraction_fields.includes('condition'));
    const persisted = applied.persisted;
    assert.ok(persisted !== null);
    if (persisted === null) {
      return;
    }
    assert.equal(persisted.goal.presence_state, 'present');
    assert.equal(
      persisted.goal.presence_state === 'present' ? persisted.goal.item.source_type : null,
      'Extraction',
    );
    assert.equal(persisted.key_parameters.length, 1);

    /* The persisted state tells step ③ where it is, without any in-memory help. */
    const state = await reopened.readCaptureState(attempt.attempt_id);
    assert.equal(state?.draft_state.parse_state, 'extracted');
  });
});

describe('S01-05-INTEGRATE｜candidate causes stay unchanged (task §14 / §15)', () => {
  it('IMPLEMENTATION INVARIANT (I15): supporting_source_paths is application-local and never persisted', async () => {
    const harness = makeReloadableHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      {
        kind: 'structured',
        value: causePayload([{ statement: '热风温度过高导致表层失水过快' }]),
      },
    ]);
    const started = await harness.service.beginCapture({
      operation_id: 'i15-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    await harness.service.applyStructuredConfirmation({
      operation_id: 'i15-confirm',
      attempt_id: attempt.attempt_id,
      result_status: ACCEPTED_STATUS,
      user_confirmed: true,
    });

    const analysed = await harness.service.analyseCandidateCauses(attempt.attempt_id);
    assert.equal(analysed?.kind, 'analysed');
    if (analysed?.kind !== 'analysed') {
      return;
    }
    /* 🔴 Still available as an application-local diagnostic on the PROPOSAL. */
    assert.deepEqual([...analysed.proposal.candidates[0]?.supporting_source_paths ?? []], ['condition']);

    const candidate = analysed.proposal.candidates[0];
    assert.ok(candidate !== undefined);
    if (candidate === undefined) {
      return;
    }
    const decision = harness.service.decideCandidateCauses({
      attempt_id: attempt.attempt_id,
      candidates: analysed.proposal.candidates,
      decisions: { [candidate.content_item_id]: 'accepted' },
    });
    const persisted = await harness.service.persistCandidateCauses({
      operation_id: 'i15-causes',
      decision,
    });
    assert.ok(persisted.persisted !== null);

    /* 🔴 The persisted candidate keeps ONLY the canonical decision-type Inference shape. */
    const json = sidecarJson(harness, attempt.attempt_id);
    assert.ok(
      !json.includes('supporting_source_paths'),
      'supporting_source_paths must not become a persisted product field',
    );
    const document = JSON.parse(json) as { candidate_causes: readonly Record<string, unknown>[] };
    assert.equal(document.candidate_causes.length, 1);
    for (const item of document.candidate_causes) {
      assert.deepEqual(Object.keys(item).sort(), [
        'confirmation_class',
        'content_item_id',
        'decision_state',
        'source_type',
        'value',
      ]);
      assert.equal(item['source_type'], 'Inference');
      assert.equal(item['confirmation_class'], 'decision');
      assert.equal(item['decision_state'], 'accepted');
    }
    /* An accepted cause stays `Inference` forever (§4.2 rule 2). */
    const stored = await harness.repository.readAttempt(attempt.attempt_id);
    assert.equal(stored?.candidate_causes[0]?.source_type, 'Inference');

    /* No score / confidence / support-strength vocabulary reached the record either (AC-93). */
    for (const forbidden of ['confidence', 'score', 'probability', 'support_strength']) {
      assert.ok(!json.includes(forbidden), `${forbidden} must not be persisted`);
    }
  });
});

describe('S01-05-INTEGRATE｜persisted content-item vocabulary', () => {
  it('IMPLEMENTATION INVARIANT: the follow-up field keys are part of the frozen field-key set, with no new object type', () => {
    for (const key of [
      FOLLOW_UP_QUESTION_FIELD_KEY,
      FOLLOW_UP_USER_ANSWER_FIELD_KEY,
      FOLLOW_UP_AI_EXTRACTION_FIELD_KEY,
      KEY_PARAMETER_FIELD_KEY,
    ]) {
      assert.ok(
        (CONTENT_ITEM_FIELD_KEYS as readonly string[]).includes(key),
        `${key} must be a frozen content-item field key`,
      );
    }
    /* The gap vocabulary is exactly the canonical P1/P2/P3 dimensions - unchanged. */
    assert.deepEqual([...FOLLOW_UP_GAP_KEYS], [
      'goal',
      'actual_attempt',
      'actual_result',
      'condition',
      'judgment_basis',
      'key_parameter',
    ]);
    assert.equal(MAX_KEY_FOLLOW_UP_QUESTIONS, 3);
  });
});
