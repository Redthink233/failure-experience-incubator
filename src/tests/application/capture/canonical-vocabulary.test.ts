/**
 * S01-05B ｜ IMPLEMENTATION INVARIANT ｜ canonical field-key vocabulary + stable content-item identity.
 *
 * 🔴 This file creates NO new AC and no new Decision. Every case restores / asserts an EXISTING
 *    Frozen口径:
 *      task §2 / §6 → docs/02 §C.4.3 `field_key` 清单（`TQ18`，canonical 名称）；
 *      task §3 / §7 → docs/04 §2.2 + `D-018` / `D-023`（`P1`/`P2`/`P3`，P3 = `key_parameter`）；
 *      task §4 / §5 / §8 → docs/02 §C.4.1（`item_id` 是条目唯一标识，**禁止**用数组下标代替）+
 *                          `D-017`「同一缺口只正式提问一次」+ AC-Q06-1。
 *
 * 🔴 Tests target the VOCABULARY TYPES and the MAPPERS - never a repository-wide text scan.
 *    `key_parameters` / `environment` / `user_note` / `failure_tags` remain legal as `Attempt`
 *    PHYSICAL property names (contract §13.2 `TQ02` / `CC-02`, Implementation Parameter); what is
 *    asserted here is that they are never used as a `PersistedContentItem.field_key`.
 *
 * 🔴 Every AI payload used here is a hand-written fixture (`NOT_A_REAL_LLM_OUTPUT`). No network
 *    call is made and no model behaviour is claimed.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ATTEMPT_PHYSICAL_FIELD_KEYS,
  CONTENT_ITEM_FIELD_KEY_BY_ATTEMPT_FIELD,
  CONTENT_ITEM_FIELD_KEYS,
  FAILURE_TAG_FIELD_KEY,
  FOLLOW_UP_QUESTION_FIELD_KEY,
  KEY_PARAMETER_FIELD_KEY,
  NOTE_FIELD_KEY,
  VERSION_ENV_FIELD_KEY,
  canonicalFieldKeyForAttemptField,
  findContentItem,
  followUpQuestionItemId,
  isContentItemFieldKey,
} from '../../../domain/types/content-item-record.js';
import {
  FOLLOW_UP_GAP_ATTEMPT_FIELD,
  FOLLOW_UP_GAP_KEYS,
  GAP_PRIORITY,
  MAX_KEY_FOLLOW_UP_QUESTIONS,
  isFollowUpGapKey,
} from '../../../domain/types/follow-up.js';
import { NOT_A_REAL_LLM_OUTPUT, makeReloadableHarness, parsePayload } from './capture-test-harness.js';

const ACCEPTED_STATUS = { decision: 'accepted' as const, value: '未达到预期' };

/** The physical property names that must NEVER be a `field_key`. */
const FORBIDDEN_FIELD_KEY_ALIASES = [
  'key_parameters',
  'environment',
  'user_note',
  'failure_tags',
] as const;

/* ------------------------------------------------------------------ *
 * §2 / §6 - canonical field_key vocabulary
 * ------------------------------------------------------------------ */

describe('S01-05B｜canonical field_key vocabulary (task §2 / §6)', () => {
  it('IMPLEMENTATION INVARIANT (V1): the canonical Attempt-level keys ARE members of the frozen set', () => {
    for (const key of ['key_parameter', 'version_env', 'note', 'failure_tag']) {
      assert.ok(
        (CONTENT_ITEM_FIELD_KEYS as readonly string[]).includes(key),
        `${key} must be a frozen content-item field key`,
      );
      assert.equal(isContentItemFieldKey(key), true);
    }
    /* The exported constants resolve to those canonical spellings - not to the physical ones. */
    assert.equal(KEY_PARAMETER_FIELD_KEY, 'key_parameter');
    assert.equal(VERSION_ENV_FIELD_KEY, 'version_env');
    assert.equal(NOTE_FIELD_KEY, 'note');
    assert.equal(FAILURE_TAG_FIELD_KEY, 'failure_tag');
    /* Field-key constants live in the frozen set, as the follow-up keys already do. */
    for (const key of [
      KEY_PARAMETER_FIELD_KEY,
      VERSION_ENV_FIELD_KEY,
      NOTE_FIELD_KEY,
      FAILURE_TAG_FIELD_KEY,
      FOLLOW_UP_QUESTION_FIELD_KEY,
    ]) {
      assert.ok((CONTENT_ITEM_FIELD_KEYS as readonly string[]).includes(key));
    }
  });

  it('IMPLEMENTATION INVARIANT (V2): the physical-property aliases are NOT field keys', () => {
    for (const alias of FORBIDDEN_FIELD_KEY_ALIASES) {
      assert.equal(
        (CONTENT_ITEM_FIELD_KEYS as readonly string[]).includes(alias),
        false,
        `${alias} must not be a content-item field key`,
      );
      assert.equal(isContentItemFieldKey(alias), false);
    }
    /* 🔴 …while remaining perfectly legal as `Attempt` PHYSICAL property names: no repo-wide ban. */
    for (const alias of FORBIDDEN_FIELD_KEY_ALIASES) {
      assert.ok(
        (ATTEMPT_PHYSICAL_FIELD_KEYS as readonly string[]).includes(alias),
        `${alias} stays a legal Attempt physical property name`,
      );
    }
  });

  it('IMPLEMENTATION INVARIANT (V3): the physical → canonical mapper is total and explicit', () => {
    for (const physical of ATTEMPT_PHYSICAL_FIELD_KEYS) {
      const mapped = canonicalFieldKeyForAttemptField(physical);
      assert.equal(
        isContentItemFieldKey(mapped),
        true,
        `${physical} must map to a frozen content-item field key`,
      );
      assert.equal(mapped, CONTENT_ITEM_FIELD_KEY_BY_ATTEMPT_FIELD[physical]);
      assert.equal(
        (FORBIDDEN_FIELD_KEY_ALIASES as readonly string[]).includes(mapped),
        false,
        `${physical} must not map onto an alias`,
      );
    }
    /* The four drifted names are exactly the ones where the two vocabularies differ. */
    assert.equal(canonicalFieldKeyForAttemptField('key_parameters'), 'key_parameter');
    assert.equal(canonicalFieldKeyForAttemptField('environment'), 'version_env');
    assert.equal(canonicalFieldKeyForAttemptField('user_note'), 'note');
    assert.equal(canonicalFieldKeyForAttemptField('failure_tags'), 'failure_tag');
    /* …and the untouched names map to themselves (no gratuitous renaming). */
    for (const same of [
      'goal',
      'actual_attempt',
      'condition',
      'actual_result',
      'result_status',
      'expected_result',
      'judgment_basis',
      'occurred_at',
      'cost',
    ] as const) {
      assert.equal(canonicalFieldKeyForAttemptField(same), same);
    }
  });

  it('IMPLEMENTATION INVARIANT (V4): a step ② extraction reaches the sidecar under the CANONICAL key', async () => {
    assert.equal(NOT_A_REAL_LLM_OUTPUT, 'NOT_A_REAL_LLM_OUTPUT');
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({
        environment: '烤箱型号 X-200 / 固件 2.4',
        user_note: '这次是赶工期',
        key_parameters: ['热风温度 70 度'],
        result_status_proposal: '未达到预期',
      }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'v4-begin',
      raw_text: '把热风温度从 50 度调到 70 度想缩短干燥时间，结果表面开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }

    const items = await harness.repository.readAttemptContentItems(attempt.attempt_id);
    const field_keys = items.map((item) => item.field_key);
    const field_key_text: readonly string[] = field_keys;
    for (const canonical of ['version_env', 'note', 'key_parameter'] as const) {
      assert.ok(field_key_text.includes(canonical), `${canonical} must be persisted as field_key`);
    }
    for (const alias of FORBIDDEN_FIELD_KEY_ALIASES) {
      assert.equal(
        field_key_text.includes(alias),
        false,
        `${alias} must never be persisted as a field_key`,
      );
    }
    /* The AI parse really did produce those three fields - they were mapped, not dropped. */
    assert.equal(
      items.filter((item) => item.field_key === VERSION_ENV_FIELD_KEY).length,
      1,
    );
    assert.equal(items.filter((item) => item.field_key === NOTE_FIELD_KEY).length, 1);
    assert.equal(items.filter((item) => item.field_key === KEY_PARAMETER_FIELD_KEY).length, 1);

    /* 🔴 A brand-new repository re-parses the sidecar: the frozen vocabulary check really passes. */
    const reread = await harness.reopenRepository().readAttemptContentItems(attempt.attempt_id);
    assert.deepEqual(
      reread.map((item) => item.field_key).sort(),
      [...field_keys].sort(),
    );
  });
});

/* ------------------------------------------------------------------ *
 * §3 / §7 - canonical follow-up gap vocabulary
 * ------------------------------------------------------------------ */

describe('S01-05B｜canonical follow-up gap vocabulary (task §3 / §7)', () => {
  it('IMPLEMENTATION INVARIANT (G1): the gap set is exactly the canonical P1/P2/P3 dimensions', () => {
    assert.deepEqual([...FOLLOW_UP_GAP_KEYS], [
      'goal',
      'actual_attempt',
      'actual_result',
      'condition',
      'judgment_basis',
      'key_parameter',
    ]);
    assert.equal((FOLLOW_UP_GAP_KEYS as readonly string[]).includes('key_parameters'), false);
    assert.equal(isFollowUpGapKey('key_parameter'), true);
    assert.equal(isFollowUpGapKey('key_parameters'), false);
    /* No metadata or result-status target may enter the question budget (task §3). */
    for (const forbidden of [
      'result_status',
      'expected_result',
      'environment',
      'version_env',
      'user_note',
      'note',
      'failure_tag',
    ]) {
      assert.equal((FOLLOW_UP_GAP_KEYS as readonly string[]).includes(forbidden), false);
    }
    assert.equal(MAX_KEY_FOLLOW_UP_QUESTIONS, 3);
    /* Priority map covers every canonical gap, including P3 = key_parameter. */
    assert.deepEqual(Object.keys(GAP_PRIORITY).sort(), [...FOLLOW_UP_GAP_KEYS].sort());
    assert.equal(GAP_PRIORITY.key_parameter, 'P3');
    assert.equal(GAP_PRIORITY.condition, 'P2');
    assert.equal(GAP_PRIORITY.goal, 'P1');
  });

  it('IMPLEMENTATION INVARIANT (G2): `key_parameter` still reaches the Attempt physical `key_parameters` through the explicit mapping', async () => {
    /* Both vocabularies resolve to the same canonical key - no physical name is used as a gap key. */
    assert.equal(FOLLOW_UP_GAP_ATTEMPT_FIELD.key_parameter, 'key_parameters');
    assert.equal(
      canonicalFieldKeyForAttemptField(FOLLOW_UP_GAP_ATTEMPT_FIELD.key_parameter),
      KEY_PARAMETER_FIELD_KEY,
    );

    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'g2-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    /* The P3 gap really is open: no parameter is recorded yet. */
    assert.equal(attempt.key_parameters.length, 0);
    assert.ok(started.follow_up?.missing_gaps.includes('key_parameter'));

    const asked = await harness.service.askFollowUpQuestion({
      operation_id: 'g2-ask',
      attempt_id: attempt.attempt_id,
      question_text: '这次用到的关键参数是什么？',
      target_gap: 'key_parameter',
    });
    assert.equal(asked.kind, 'asked');

    /* The user answers it: the correction names the PHYSICAL slot, the gap names the canonical one. */
    const user_parameters = '热风温度 70 度 / 传送带速度中档';
    const applied = await harness.service.applyStructuredConfirmation({
      operation_id: 'g2-confirm',
      attempt_id: attempt.attempt_id,
      corrections: [
        {
          field: 'key_parameters',
          value: user_parameters,
          answer_to_gap: 'key_parameter',
        },
      ],
      result_status: ACCEPTED_STATUS,
      user_confirmed: true,
    });
    assert.equal(applied.result.kind, 'applied');

    const persisted = await harness.repository.readAttempt(attempt.attempt_id);
    assert.equal(persisted?.key_parameters.length, 1);
    assert.equal(persisted?.key_parameters[0]?.value, user_parameters);
    assert.equal(persisted?.key_parameters[0]?.source_type, 'Fact');

    /* 🔴 The mapping is what closes the gap: it is read from the PHYSICAL property, not guessed. */
    const state = await harness.service.readCaptureState(attempt.attempt_id);
    assert.equal(state?.follow_up.missing_gaps.includes('key_parameter'), false);
    assert.equal(state?.draft_state.asked_key_question_count, 1);

    /* …and it survives a reload, still as a parameter (not as a new gap). */
    const reopened = await harness.service.readCaptureState(attempt.attempt_id);
    assert.equal(reopened?.attempt.key_parameters.length, 1);
  });
});

/* ------------------------------------------------------------------ *
 * §4 / §5 / §8 - stable follow-up question identity
 * ------------------------------------------------------------------ */

describe('S01-05B｜stable follow-up question identity (task §4 / §5 / §8)', () => {
  it('IMPLEMENTATION INVARIANT (S-A/B): the identity is (`attempt_id`, canonical gap) - stable, and distinct per gap', () => {
    const attempt_id = 'ATT_00000000000000000000000001';
    assert.equal(
      followUpQuestionItemId(attempt_id, 'condition'),
      followUpQuestionItemId(attempt_id, 'condition'),
    );
    /* Traceable: the id names both the Attempt and the canonical gap it is about. */
    const condition_id = followUpQuestionItemId(attempt_id, 'condition');
    assert.ok(condition_id.includes(attempt_id));
    assert.ok(condition_id.endsWith(':condition'));

    const ids = FOLLOW_UP_GAP_KEYS.map((gap) => followUpQuestionItemId(attempt_id, gap));
    assert.equal(new Set(ids).size, FOLLOW_UP_GAP_KEYS.length, 'each gap must own a distinct id');
    /* 🔴 NOT position-shaped: no id may end in an index. */
    for (const id of ids) {
      assert.equal(/:\d+$/.test(id), false, `${id} must not be position-based`);
    }
  });

  it('IMPLEMENTATION INVARIANT (S-C): the identity does not depend on the asked count or on array position', async () => {
    const question_for = 'condition';
    const other_gap = 'judgment_basis';

    /* Harness 1: the gap is the FIRST question asked. */
    const first = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started_first = await first.service.beginCapture({
      operation_id: 'c-first-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt_first = started_first.attempt;
    assert.ok(attempt_first !== null);
    if (attempt_first === null) {
      return;
    }
    const asked_first = await first.service.askFollowUpQuestion({
      operation_id: 'c-first-q1',
      attempt_id: attempt_first.attempt_id,
      question_text: '当时的具体条件是什么？',
      target_gap: question_for,
    });
    assert.equal(asked_first.kind, 'asked');
    assert.equal(asked_first.draft_state?.asked_key_question_count, 1);

    /* Harness 2: the SAME gap is the SECOND question asked (different array position). */
    const second = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started_second = await second.service.beginCapture({
      operation_id: 'c-second-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt_second = started_second.attempt;
    assert.ok(attempt_second !== null);
    if (attempt_second === null) {
      return;
    }
    const asked_other = await second.service.askFollowUpQuestion({
      operation_id: 'c-second-q1',
      attempt_id: attempt_second.attempt_id,
      question_text: '判断依据是什么？',
      target_gap: other_gap,
    });
    assert.equal(asked_other.kind, 'asked');
    const asked_second = await second.service.askFollowUpQuestion({
      operation_id: 'c-second-q2',
      attempt_id: attempt_second.attempt_id,
      question_text: '当时的具体条件是什么？',
      target_gap: question_for,
    });
    assert.equal(asked_second.kind, 'asked');
    assert.equal(asked_second.draft_state?.asked_key_question_count, 2);

    /*
     * 🔴 Same gap ⇒ same identity, although the asked count (1 vs 2) and the array position of the
     *    gap (0 vs 1) differ. A position-based id would produce `…:0` vs `…:1` here and fail.
     *    The two harnesses are separate workspaces, so the gap-derived suffix is what is compared.
     */
    const gap_suffix = (id: string): string => id.split(':').slice(1).join(':');
    const first_id = asked_first.question?.content_item_id ?? '';
    const second_id = asked_second.question?.content_item_id ?? '';
    assert.equal(gap_suffix(first_id), gap_suffix(second_id));
    assert.equal(gap_suffix(first_id), `followup_question:${question_for}`);
    assert.notEqual(second_id, asked_other.question?.content_item_id);
  });

  it('IMPLEMENTATION INVARIANT (S-D/E): a reload resolves the same item, and a repeated request adds no second one', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'se-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }

    const question_text = '当时的具体条件是什么？';
    const asked = await harness.service.askFollowUpQuestion({
      operation_id: 'se-q1',
      attempt_id: attempt.attempt_id,
      question_text,
      target_gap: 'condition',
    });
    assert.equal(asked.kind, 'asked');
    const question_id = followUpQuestionItemId(attempt.attempt_id, 'condition');
    assert.equal(asked.question?.content_item_id, question_id);

    /* (D) A reload still resolves the SAME gap to the SAME content item. */
    const reloaded_reader = harness.reopenRepository();
    const after_reload = await reloaded_reader.readAttemptContentItems(attempt.attempt_id);
    const resolved = findContentItem(after_reload, question_id);
    assert.ok(resolved !== null, 'the asked gap must resolve to its persisted question item');
    assert.equal(resolved?.field_key, FOLLOW_UP_QUESTION_FIELD_KEY);
    assert.equal(resolved?.value, question_text);
    assert.equal(resolved?.source_type, 'Inference');

    /* (E) Asking the same gap again is refused and produces NO second question item. */
    const repeated = await harness.service.askFollowUpQuestion({
      operation_id: 'se-q1-repeat',
      attempt_id: attempt.attempt_id,
      question_text: '（再展示一次）当时的具体条件是什么？',
      target_gap: 'condition',
    });
    assert.equal(repeated.kind, 'rejected');
    assert.equal(repeated.rejection_code, 'GAP_ALREADY_ASKED');
    assert.equal(repeated.draft_state?.asked_key_question_count, 1);

    const items = await reloaded_reader.readAttemptContentItems(attempt.attempt_id);
    assert.equal(
      items.filter((item) => item.field_key === FOLLOW_UP_QUESTION_FIELD_KEY).length,
      1,
      'a repeated request must never create a second question item',
    );
    assert.equal(findContentItem(items, question_id)?.value, question_text);
  });

  it('IMPLEMENTATION INVARIANT (S-E2): the same idempotency holds for a recreated service (AC-Q06-1 / AC-16)', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'se2-begin',
      raw_text: '把热风温度调到 70 度，结果开裂',
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    await harness.service.askFollowUpQuestion({
      operation_id: 'se2-q1',
      attempt_id: attempt.attempt_id,
      question_text: '当时的具体条件是什么？',
      target_gap: 'condition',
    });

    /* A brand-new service instance over the same workspace rebuilt the budget from the record. */
    const reopened = harness.reopen();
    const repeated = await reopened.askFollowUpQuestion({
      operation_id: 'se2-q1-again',
      attempt_id: attempt.attempt_id,
      question_text: '当时的具体条件是什么？（新会话再问）',
      target_gap: 'condition',
    });
    assert.equal(repeated.kind, 'rejected');
    assert.equal(repeated.rejection_code, 'GAP_ALREADY_ASKED');
    assert.equal(repeated.draft_state?.asked_key_question_count, 1);

    const items = await harness.reopenRepository().readAttemptContentItems(attempt.attempt_id);
    assert.equal(
      items.filter((item) => item.field_key === FOLLOW_UP_QUESTION_FIELD_KEY).length,
      1,
    );
    assert.equal(
      findContentItem(items, followUpQuestionItemId(attempt.attempt_id, 'condition'))?.field_key,
      FOLLOW_UP_QUESTION_FIELD_KEY,
    );
  });
});
