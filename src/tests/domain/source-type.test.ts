/**
 * T1 ｜ Domain type fixture can correctly express Fact / Extraction / Inference.
 *
 * ITC-01 (domain type fixture). Canonical AC references used by this file:
 *   AC-09 / AC-11 / AC-27 / AC-30 / AC-95.
 * Every assertion (or assertion group) names the canonical AC it verifies.
 * 🔴 This file creates NO new AC and references no AC outside the existing range.
 *
 * IMPLEMENTATION INVARIANT: `Fact` / `Extraction` / `Inference` are three distinct
 * enumerated values and are never flattened into one string or a two-value "AI or user"
 * flag (contract §4.2 rule 1 / §12 item 1).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CONTENT_ITEM_DECISION_STATES,
  CONFIRMATION_CLASSES,
  SOURCE_TYPES,
  decisionInferenceItem,
  displayInferenceItem,
  extractionItem,
  factItem,
  followUpAnswerPair,
  isDecisionInference,
  isDisplayInference,
  isExtraction,
  isFact,
  isInference,
  isReusableAsConfirmedDecision,
} from '../../domain/types/source-type.js';
import type {
  ContentItem,
  DecisionInferenceContentItem,
  DisplayInferenceContentItem,
  FactContentItem,
} from '../../domain/types/source-type.js';
import type {
  AssertTrue,
  Disjoint,
  ForbiddenProductKeys,
  HasNoKey,
} from './type-assertions.js';

/* ------------------------------------------------------------------ *
 * Compile-time assertions (fail `npm run typecheck` when violated)
 * ------------------------------------------------------------------ */

export type SourceTypeTypeAssertions = [
  AssertTrue<HasNoKey<FactContentItem, ForbiddenProductKeys>>,
  AssertTrue<HasNoKey<DecisionInferenceContentItem, ForbiddenProductKeys>>,
  /** Fact / Extraction / Inference are pairwise distinct - never one merged value. */
  AssertTrue<Disjoint<'Fact', 'Extraction' | 'Inference'>>,
  AssertTrue<Disjoint<'Extraction', 'Inference'>>,
  /** A display inference has no decision slot, and vice versa. */
  AssertTrue<HasNoKey<DisplayInferenceContentItem, 'decision_state'>>,
  AssertTrue<HasNoKey<DecisionInferenceContentItem, 'presence_state'>>,
];

/* ------------------------------------------------------------------ *
 * Runtime assertions
 * ------------------------------------------------------------------ */

describe('T1 domain type fixture｜Fact / Extraction / Inference', () => {
  it('[AC-30] follow-up answer is stored in two layers: user words = Fact, AI induction = Extraction', () => {
    const [userWords, aiInduction] = followUpAnswerPair(
      'CI-answer-fact',
      '我把热风温度调到 70 度',
      'CI-answer-extraction',
      '用户提高了热风温度参数',
    );

    assert.equal(userWords.source_type, 'Fact');
    assert.equal(aiInduction.source_type, 'Extraction');

    // The two layers are distinguishable in code, not merely by value text.
    assert.ok(isFact(userWords));
    assert.ok(isExtraction(aiInduction));
    assert.ok(!isFact(aiInduction));
    assert.ok(!isExtraction(userWords));

    // 🔴 Forbidden by AC-30: user words labelled Inference, AI induction labelled Fact.
    assert.notEqual(userWords.source_type, 'Inference');
    assert.notEqual(aiInduction.source_type, 'Fact');
  });

  it('[AC-27][AC-11] an accepted Insight item can never be relabelled as Fact', () => {
    const accepted = decisionInferenceItem('CI-insight', '该条件下热风升温未见效', 'accepted');

    // §4.2 rule 1: the source type is invariant - acceptance changes the state, not the source.
    assert.equal(accepted.source_type, 'Inference');
    assert.equal(accepted.decision_state, 'accepted');
    assert.ok(!isFact(accepted));
    assert.ok(!isExtraction(accepted));
    assert.ok(isInference(accepted));

    // No "已证实 / Verified / Confirmed" value may exist in the source-type vocabulary.
    assert.deepEqual([...SOURCE_TYPES], ['Fact', 'Extraction', 'Inference']);
    for (const forbidden of ['Verified', 'Confirmed', 'Proven', 'Factual']) {
      assert.ok(!SOURCE_TYPES.includes(forbidden as never));
    }
  });

  it('[AC-95] only an explicitly ACCEPTED decision-type Inference is reusable as a confirmed basis', () => {
    assert.equal(isReusableAsConfirmedDecision(decisionInferenceItem('CI-1', 'x', 'accepted')), true);
    assert.equal(
      isReusableAsConfirmedDecision(decisionInferenceItem('CI-2', 'x', 'unresolved')),
      false,
    );
    assert.equal(
      isReusableAsConfirmedDecision(decisionInferenceItem('CI-3', 'x', 'rejected')),
      false,
    );
    // display inferences never qualify, whatever else is true about them
    assert.equal(isReusableAsConfirmedDecision(displayInferenceItem('CI-4', 'x')), false);
    // user Facts and Extractions never qualify either
    assert.equal(isReusableAsConfirmedDecision(factItem('CI-5', 'x')), false);
    assert.equal(isReusableAsConfirmedDecision(extractionItem('CI-6', 'x')), false);
  });

  it('[AC-09] a display-type Inference carries no "confirmed" state at all', () => {
    const display = displayInferenceItem('CI-display', '与历史记录相关');

    assert.equal(display.confirmation_class, 'display');
    // 🔴 "unfed back ≠ confirmed": there is no confirmed/unconfirmed flag to read.
    assert.ok(!('decision_state' in display));
    assert.deepEqual([...CONFIRMATION_CLASSES], ['display', 'decision']);
    assert.ok(isDisplayInference(display));
    assert.ok(!isDecisionInference(display));
  });

  it('IMPLEMENTATION INVARIANT (contract §1.5 / §4.2 rule 1): decision items require an explicit state', () => {
    const decision = decisionInferenceItem('CI-decision', '原因候选', 'unresolved');

    assert.equal(decision.confirmation_class, 'decision');
    assert.equal(decision.decision_state, 'unresolved');
    assert.deepEqual(
      [...CONTENT_ITEM_DECISION_STATES],
      ['unresolved', 'accepted', 'rejected'],
    );
    // The content-item decision state is its own vocabulary - not the Insight state machine.
    assert.ok(!CONTENT_ITEM_DECISION_STATES.includes('candidate' as never));
    assert.ok(!CONTENT_ITEM_DECISION_STATES.includes('undecided' as never));
  });

  it('IMPLEMENTATION INVARIANT: ContentItem is a discriminated union, not a string alias', () => {
    const items: readonly ContentItem[] = [
      factItem('CI-a', 'fact'),
      extractionItem('CI-b', 'extraction'),
      displayInferenceItem('CI-c', 'display inference'),
      decisionInferenceItem('CI-d', 'decision inference', 'unresolved'),
    ];

    const sourceTypes = items.map((item) => item.source_type);
    assert.deepEqual(sourceTypes, ['Fact', 'Extraction', 'Inference', 'Inference']);
    // Three distinct layers survive in one heterogeneous collection.
    assert.equal(new Set(sourceTypes).size, 3);
    // No boolean "isAi" / "isUser" flag exists on any item.
    for (const item of items) {
      assert.ok(!('is_ai' in item));
      assert.ok(!('is_user' in item));
      assert.equal(typeof item.source_type, 'string');
    }
  });
});
