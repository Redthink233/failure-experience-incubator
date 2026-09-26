/**
 * T2 ｜ `Draft` and `Formal` are two DIFFERENT states (never a boolean).
 *
 * ITC-01 (domain type fixture) + ITC-04 (step ① gate).
 * Canonical AC references used by this file:
 *   AC-01 / AC-02 / AC-03 / AC-04 / AC-77 / AC-78 / AC-87 / AC-88 / AC-Q06-5 / AC-135.
 * 🔴 This file creates NO new AC.
 *
 * IMPLEMENTATION INVARIANT: the archive bit is orthogonal to `Draft`/`Formal` and is
 * never merged into a single enum (contract §2.1 / §12 item 1).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ATTEMPT_STATES,
  FORMAL_GATE_FIELDS,
  L4_PRODUCT_LAYER_FIELDS,
  checkAttemptStateTransition,
  createDraftAttempt,
  evaluateFormalGate,
  isNonBlankAttemptInput,
} from '../../domain/types/attempt.js';
import type { Attempt, AttemptState, DraftAttemptInput } from '../../domain/types/attempt.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import { ARCHIVE_STATES } from '../../domain/types/archive.js';
import { provided } from '../../domain/types/presence.js';
import { decisionInferenceItem, displayInferenceItem, factItem } from '../../domain/types/source-type.js';
import { makeDraft, makeFormal, FIXED_ATTEMPT_ID, FIXED_TIME } from './fixtures.js';
import type { AssertTrue, Disjoint, HasNoKey, IsExactly, IsNotAssignable } from './type-assertions.js';

/* ------------------------------------------------------------------ *
 * Compile-time assertions
 * ------------------------------------------------------------------ */

export type AttemptStateTypeAssertions = [
  /** `Draft` / `Formal` - exactly a two-value union, never `boolean`. */
  AssertTrue<IsExactly<AttemptState, 'Draft' | 'Formal'>>,
  AssertTrue<Disjoint<AttemptState, 'active' | 'archived'>>,
  /** The archive bit is NOT part of the state union. */
  AssertTrue<HasNoKey<Attempt, 'is_completed'>>,
  AssertTrue<HasNoKey<Attempt, 'completed'>>,
  /**
   * F06 (contract §3.1 / §3.2): `attempt_id` is a branded `ATT_` object id - the same
   * vocabulary `EvidenceRef.target_id` uses - so it can never be satisfied by an
   * arbitrary string, a file name or a list position.
   */
  AssertTrue<IsExactly<Attempt['attempt_id'], ObjectId<'ATT'>>>,
  AssertTrue<IsExactly<DraftAttemptInput['attempt_id'], ObjectId<'ATT'>>>,
  AssertTrue<IsNotAssignable<string, ObjectId<'ATT'>>>,
  AssertTrue<Disjoint<ObjectId<'ATT'>, ObjectId<'INS'>>>,
];

/* ------------------------------------------------------------------ *
 * Runtime assertions
 * ------------------------------------------------------------------ */

describe('T2 attempt state｜Draft vs Formal', () => {
  it('[T2] IMPLEMENTATION INVARIANT (contract §2.1 / §12 item 1): Draft and Formal are two distinct states', () => {
    assert.deepEqual([...ATTEMPT_STATES], ['Draft', 'Formal']);
    assert.equal(ATTEMPT_STATES.length, 2);
    assert.notEqual(ATTEMPT_STATES[0], ATTEMPT_STATES[1]);
    // Not a boolean: the values are strings, and neither is true/false.
    assert.equal(typeof ATTEMPT_STATES[0], 'string');
    assert.ok(!ATTEMPT_STATES.includes(true as never));
  });

  it('IMPLEMENTATION INVARIANT (contract §2.1 / §12 item 1): the archive bit is orthogonal', () => {
    assert.deepEqual([...ARCHIVE_STATES], ['active', 'archived']);
    // The two dimensions must not be merged into one enumeration.
    assert.ok(!(ARCHIVE_STATES as readonly string[]).includes('Draft'));
    assert.ok(!(ARCHIVE_STATES as readonly string[]).includes('Formal'));
    assert.ok(!(ATTEMPT_STATES as readonly string[]).includes('archived'));
    assert.equal(makeDraft().archive_state, 'active');
    assert.equal(makeDraft({ archive_state: 'archived' }).state, 'Draft');
  });

  it('[AC-01] raw natural language alone produces a saved Attempt Draft', () => {
    const attempt = createDraftAttempt({
      attempt_id: FIXED_ATTEMPT_ID,
      raw_text: '试了一下把温度提到 70 度，还是不行。',
      created_at: FIXED_TIME,
    });

    assert.equal(attempt.state, 'Draft');
    assert.equal(attempt.raw_text.source_type, 'Fact');
    assert.equal(attempt.raw_text.value, '试了一下把温度提到 70 度，还是不行。');
    assert.equal(attempt.created_at, FIXED_TIME);
    assert.equal(attempt.updated_at, FIXED_TIME);
  });

  it('[AC-87][AC-88] the only step ① gate is non-empty / non-whitespace input; no length threshold', () => {
    assert.equal(isNonBlankAttemptInput('失败了'), true);
    assert.equal(isNonBlankAttemptInput('还是不行'), true);
    assert.equal(isNonBlankAttemptInput('   '), false);
    assert.equal(isNonBlankAttemptInput(''), false);
    assert.equal(isNonBlankAttemptInput('\n\t '), false);

    // 3-character and 4-character inputs must be accepted (no "≥ 8 characters" rule).
    const short3 = createDraftAttempt({
      attempt_id: FIXED_ATTEMPT_ID,
      raw_text: '失败了',
      created_at: FIXED_TIME,
    });
    const short4 = createDraftAttempt({
      attempt_id: FIXED_ATTEMPT_ID,
      raw_text: '还是不行',
      created_at: FIXED_TIME,
    });
    assert.equal(short3.state, 'Draft');
    assert.equal(short4.state, 'Draft');
    assert.equal(short3.raw_text.value.length, 3);
    assert.equal(short4.raw_text.value.length, 4);

    // Empty / whitespace-only input violates the domain invariant.
    assert.throws(
      () =>
        createDraftAttempt({
          attempt_id: FIXED_ATTEMPT_ID,
          raw_text: '   ',
          created_at: FIXED_TIME,
        }),
      /Step ① gate/,
    );
  });

  it('[AC-04] missing fields are stored as an EXPLICIT 「未知 / 未提供」, never as empty or default', () => {
    const attempt = makeDraft();

    for (const field of ['goal', 'actual_attempt', 'condition', 'actual_result'] as const) {
      // The key exists - absence is not expressed by omitting the key.
      assert.ok(field in attempt);
      assert.equal(attempt[field].presence_state, 'unknown');
      assert.ok(!('item' in attempt[field]));
      // 🔴 Never an empty string / null / default value.
      assert.notEqual((attempt[field] as { item?: unknown }).item, '');
    }
    assert.equal(attempt.result_status.presence_state, 'unknown');
    assert.equal(attempt.occurred_at.presence_state, 'unknown');
    assert.equal(attempt.environment.presence_state, 'unknown');
    assert.equal(attempt.key_parameters.length, 0);
    assert.equal(attempt.candidate_causes.length, 0);
    assert.equal(attempt.failure_tags.length, 0);
  });

  it('[AC-02][AC-Q06-5] a record stays Draft when a Formal prerequisite is missing', () => {
    const draft = makeDraft();
    const gate = evaluateFormalGate(draft);

    assert.equal(gate.satisfied, false);
    assert.deepEqual([...gate.missing_fields], [...FORMAL_GATE_FIELDS]);
    assert.equal(gate.result_status_confirmed, false);

    const transition = checkAttemptStateTransition(draft, 'Formal');
    assert.equal(transition.allowed, false);
    if (!transition.allowed) {
      // §10.1 layer 1: this is a GATE outcome, not a runtime failure.
      assert.equal(transition.layer, 'GATE');
      assert.equal(transition.code, 'FORMAL_GATE_UNSATISFIED');
      assert.ok(transition.missing_fields.includes('goal'));
    }
    // 🔴 No auto-upgrade: the record itself is untouched.
    assert.equal(draft.state, 'Draft');
  });

  it('[AC-03] all four prerequisites satisfied allows the Formal transition', () => {
    const formal = makeFormal();
    const gate = evaluateFormalGate(formal);

    assert.equal(gate.satisfied, true);
    assert.deepEqual([...gate.missing_fields], []);
    assert.equal(gate.result_status_confirmed, true);
    assert.equal(checkAttemptStateTransition(formal, 'Formal').allowed, true);
  });

  it('[AC-02] a provided but UNCONFIRMED result status still blocks Formal', () => {
    const partiallyReady = makeDraft({
      goal: provided(factItem('CI-goal', '缩短干燥时长')),
      actual_attempt: provided(factItem('CI-approach', '提升热风温度')),
      actual_result: provided(factItem('CI-result', '出现明显开裂')),
      // decision-type but not accepted, then a display-type variant
      result_status: provided(decisionInferenceItem('CI-status-1', 'Failed', 'unresolved')),
    });

    const gate = evaluateFormalGate(partiallyReady);
    assert.equal(gate.satisfied, false);
    assert.deepEqual([...gate.missing_fields], ['result_status']);
    assert.equal(gate.result_status_confirmed, false);

    const stillNotConfirmed = makeDraft({
      ...partiallyReady,
      result_status: provided(displayInferenceItem('CI-status-2', 'Failed')),
    });
    assert.equal(evaluateFormalGate(stillNotConfirmed).satisfied, false);
  });

  it('IMPLEMENTATION INVARIANT (contract §2.1): Formal -> Draft is not a canonical transition', () => {
    const formal = makeFormal();
    const transition = checkAttemptStateTransition(formal, 'Draft');

    assert.equal(transition.allowed, false);
    if (!transition.allowed) {
      assert.equal(transition.code, 'NOT_A_CANONICAL_TRANSITION');
      assert.equal(transition.layer, 'GATE');
    }
    // Same-state transitions are always allowed (idempotent save).
    assert.equal(checkAttemptStateTransition(formal, 'Formal').allowed, true);
    assert.equal(checkAttemptStateTransition(makeDraft(), 'Draft').allowed, true);
  });

  it('[AC-77][AC-78] L4 product-layer automatic records are exactly 4 items', () => {
    assert.equal(L4_PRODUCT_LAYER_FIELDS.length, 4);
    assert.deepEqual(
      [...L4_PRODUCT_LAYER_FIELDS],
      ['created_at', 'updated_at', 'data_source_nature', 'ai_source_marks'],
    );
    // 🔴 Not 5: 「发生时间」 is NOT part of L4.
    assert.ok(!(L4_PRODUCT_LAYER_FIELDS as readonly string[]).includes('occurred_at'));

    const attempt: Attempt = makeFormal();
    // ①② exist and are distinguishable (the "was it modified?" check needs both).
    assert.notEqual(attempt.created_at, attempt.updated_at);
    // ③ 数据来源性质 is persisted per record.
    assert.equal(attempt.data_source_nature, 'field_record');
    // ④ AI source marks are carried per content item, not duplicated as a field.
    assert.ok(!('ai_source_marks' in attempt));
    assert.equal(attempt.raw_text.source_type, 'Fact');
    // 「发生时间」 is a user Fact whenever it exists.
    const withOccurrence = makeDraft({
      occurred_at: provided(factItem('CI-occurred', '2026-09-20')),
    });
    assert.equal(withOccurrence.occurred_at.presence_state, 'present');
  });

  it('[AC-135] data-source nature distinguishes demo data from live user input', () => {
    assert.equal(makeDraft().data_source_nature, 'field_record');
    assert.equal(
      makeDraft({ data_source_nature: 'demo_sample' }).data_source_nature,
      'demo_sample',
    );
    assert.equal(
      makeDraft({ data_source_nature: 'retrospective_entry' }).data_source_nature,
      'retrospective_entry',
    );
    assert.notEqual(
      makeDraft().data_source_nature,
      makeDraft({ data_source_nature: 'demo_sample' }).data_source_nature,
    );
  });
});
