/**
 * S01-05 ｜ Q1 – Q5 ｜ The follow-up question budget (`max-3-key-questions-total`).
 *
 * Canonical AC references used by this file:
 *   AC-14 / AC-15 / AC-16 / AC-17 / AC-18 / AC-19 / AC-Q06-1 / AC-Q06-2 / AC-Q06-3 /
 *   AC-Q06-4 / AC-Q06-5 / AC-Q06-6.
 * 🔴 This file creates NO new AC.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FOLLOW_UP_BUDGET_RULE,
  MAX_FOLLOW_UP_QUESTIONS,
  createFollowUpQuestionBudget,
  isFollowUpBudgetExhausted,
  nextFollowUpGap,
  recordFollowUpGapDismissed,
  recordUserSuppliedGap,
  remainingFollowUpQuestions,
  requestFollowUpQuestion,
} from '../../../application/capture/follow-up-budget.js';
import {
  P1_MISSING_WITH_EXHAUSTED_BUDGET_NOTE,
  evaluateFormalization,
} from '../../../application/capture/formalization.js';
import { FOLLOW_UP_GAP_KEYS } from '../../../application/capture/types.js';
import { provided } from '../../../domain/types/presence.js';
import { extractionItem } from '../../../domain/types/source-type.js';
import { makeHarness, parsePayload } from './capture-test-harness.js';

const P1_GAP = 'goal' as const;
const P2_GAP = 'condition' as const;
const P3_GAP = 'key_parameter' as const;

describe('S01-05｜follow-up question budget', () => {
  it('AC-16｜Q1 the budget counts key QUESTIONS, not rounds: 0 → 1 → 2 → 3', () => {
    let budget = createFollowUpQuestionBudget();
    assert.equal(FOLLOW_UP_BUDGET_RULE, 'max-3-key-questions-total');
    assert.equal(budget.max_total, MAX_FOLLOW_UP_QUESTIONS);
    assert.equal(MAX_FOLLOW_UP_QUESTIONS, 3);
    assert.equal(remainingFollowUpQuestions(budget), 3);
    assert.equal(isFollowUpBudgetExhausted(budget), false);

    const gaps = ['goal', 'actual_attempt', 'actual_result'] as const;
    const expected_remaining = [2, 1, 0];
    gaps.forEach((gap, index) => {
      const result = requestFollowUpQuestion(budget, {
        question_text: `请补充 ${gap}`,
        target_gaps: [gap],
      });
      assert.equal(result.allowed, true, `question ${index + 1} must be allowed`);
      budget = result.budget;
      assert.equal(budget.asked.length, index + 1);
      assert.equal(remainingFollowUpQuestions(budget), expected_remaining[index]);
    });
    assert.equal(budget.asked.length, 3);
    assert.equal(isFollowUpBudgetExhausted(budget), true);
    /* 🔴 It is a ceiling, not a quota: nothing here forces a 3rd question in the first place. */
    assert.equal(nextFollowUpGap(createFollowUpQuestionBudget(), []), null);
  });

  it('AC-16｜Q2 a 4th key question cannot be produced, for any reason', () => {
    let budget = createFollowUpQuestionBudget();
    for (const gap of ['goal', 'actual_attempt', 'actual_result'] as const) {
      const result = requestFollowUpQuestion(budget, {
        question_text: `请补充 ${gap}`,
        target_gaps: [gap],
      });
      assert.equal(result.allowed, true);
      budget = result.budget;
    }
    const fourth = requestFollowUpQuestion(budget, {
      question_text: '请补充条件',
      target_gaps: [P2_GAP],
    });
    assert.equal(fourth.allowed, false);
    if (fourth.allowed) {
      return;
    }
    assert.equal(fourth.code, 'BUDGET_EXHAUSTED');
    assert.equal(fourth.budget.asked.length, 3, 'a refused question costs no budget');
    assert.equal(remainingFollowUpQuestions(fourth.budget), 0);
  });

  it('AC-Q06-3｜Q3 one question targets exactly one gap - bundling is refused', () => {
    const budget = createFollowUpQuestionBudget();
    const bundled = requestFollowUpQuestion(budget, {
      question_text: '请补充条件、判断依据和关键参数',
      target_gaps: [P2_GAP, P3_GAP],
    });
    assert.equal(bundled.allowed, false);
    if (bundled.allowed) {
      return;
    }
    assert.equal(bundled.code, 'MULTIPLE_GAPS_BUNDLED');
    assert.equal(bundled.budget.asked.length, 0, 'a bundled question must not consume budget');

    const none = requestFollowUpQuestion(budget, { question_text: '请补充点什么', target_gaps: [] });
    assert.equal(none.allowed, false);
    if (!none.allowed) {
      assert.equal(none.code, 'NO_TARGET_GAP');
    }

    /* 🔴 Only the canonical P1/P2/P3 dimensions are valid targets (§15: no metadata fishing). */
    assert.deepEqual([...FOLLOW_UP_GAP_KEYS], [
      'goal',
      'actual_attempt',
      'actual_result',
      'condition',
      'judgment_basis',
      'key_parameter',
    ]);
    assert.ok(!(FOLLOW_UP_GAP_KEYS as readonly string[]).includes('key_parameters'));
    assert.ok(!(FOLLOW_UP_GAP_KEYS as readonly string[]).includes('expected_result'));
    assert.ok(!(FOLLOW_UP_GAP_KEYS as readonly string[]).includes('environment'));
    assert.ok(!(FOLLOW_UP_GAP_KEYS as readonly string[]).includes('version_env'));
    assert.ok(!(FOLLOW_UP_GAP_KEYS as readonly string[]).includes('user_note'));
    assert.ok(!(FOLLOW_UP_GAP_KEYS as readonly string[]).includes('note'));
    assert.ok(!(FOLLOW_UP_GAP_KEYS as readonly string[]).includes('failure_tag'));
    /* AC-Q06-6: the result status is never a follow-up target. */
    assert.ok(!(FOLLOW_UP_GAP_KEYS as readonly string[]).includes('result_status'));
  });

  it('AC-Q06-5｜Q4 the budget running out never turns a Draft into a Formal Attempt', async () => {
    const harness = makeHarness({ kind: 'structured', value: parsePayload() });
    const created = await harness.repository.createAttempt({ raw_text: '只写了条件' });
    /* Only a P2 field is provided: the P1 core stays missing. */
    const partial = await harness.repository.updateAttempt(created.attempt_id, {
      condition: provided(extractionItem('p1-condition', '温度 50 度')),
    });
    assert.equal(partial.goal.presence_state, 'unknown');
    assert.equal(partial.actual_attempt.presence_state, 'unknown');

    let budget = createFollowUpQuestionBudget();
    for (const gap of ['goal', 'actual_attempt', 'actual_result'] as const) {
      const result = requestFollowUpQuestion(budget, {
        question_text: `请补充 ${gap}`,
        target_gaps: [gap],
      });
      assert.equal(result.allowed, true);
      budget = result.budget;
    }
    assert.equal(isFollowUpBudgetExhausted(budget), true);

    const formalization = evaluateFormalization({
      operation_id: 'q4',
      attempt: partial,
      /* Even an explicit confirmation cannot promote a record that lacks the P1 core. */
      user_explicitly_confirmed: true,
      follow_up_budget: budget,
    });
    assert.equal(formalization.decision.outcome, 'draft_retained');
    assert.deepEqual([...formalization.decision.block_reasons], ['FORMAL_GATE_UNSATISFIED']);
    assert.deepEqual([...formalization.missing_fields].sort(), [
      'actual_attempt',
      'actual_result',
      'goal',
      'result_status',
    ]);
    assert.equal(formalization.follow_up_budget_exhausted, true);
    assert.equal(formalization.retention_note, P1_MISSING_WITH_EXHAUSTED_BUDGET_NOTE);
    assert.equal(formalization.promotion_patch, null);

    /* 🔴 P2/P3 remaining unknown does NOT block a save once P1 + result status are there. */
    assert.equal(formalization.formal_gate.result_status_confirmed, false);
  });

  it('AC-17｜Q5 an unknown stays unknown, a dismissed gap is never re-asked, and user input is free', () => {
    /* Nothing missing → 0 questions (AC-14 / AC-15). */
    const fresh = createFollowUpQuestionBudget();
    assert.equal(nextFollowUpGap(fresh, []), null);

    /* Exactly one gap → exactly one question, then stop (AC-Q06-2). */
    assert.equal(nextFollowUpGap(fresh, [P2_GAP]), P2_GAP);
    const asked = requestFollowUpQuestion(fresh, {
      question_text: `请补充 ${P2_GAP}`,
      target_gaps: [P2_GAP],
    });
    assert.equal(asked.allowed, true);
    if (!asked.allowed) {
      return;
    }
    assert.equal(nextFollowUpGap(asked.budget, [P2_GAP]), null);

    /* The same gap is never asked twice, and a dismissed gap never comes back (AC-17). */
    const again = requestFollowUpQuestion(asked.budget, {
      question_text: '再问一次条件',
      target_gaps: [P2_GAP],
    });
    assert.equal(again.allowed, false);
    if (!again.allowed) {
      assert.equal(again.code, 'GAP_ALREADY_ASKED');
    }
    const dismissed = recordFollowUpGapDismissed(asked.budget, P1_GAP);
    const retry = requestFollowUpQuestion(dismissed, {
      question_text: '再问一次目标',
      target_gaps: [P1_GAP],
    });
    assert.equal(retry.allowed, false);
    if (!retry.allowed) {
      assert.equal(retry.code, 'GAP_ALREADY_DISMISSED');
      assert.equal(
        remainingFollowUpQuestions(retry.budget),
        remainingFollowUpQuestions(asked.budget),
        'a refused question never costs budget',
      );
    }

    /* 🔴 A value the user volunteers is not a question and consumes nothing (AC-Q06-4). */
    const volunteered = recordUserSuppliedGap(dismissed, P3_GAP);
    assert.deepEqual(volunteered.asked, dismissed.asked);
    assert.equal(remainingFollowUpQuestions(volunteered), remainingFollowUpQuestions(dismissed));
    assert.equal(nextFollowUpGap(volunteered, [P3_GAP]), P3_GAP);
  });
});
