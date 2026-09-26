/**
 * T3 ｜ The `Insight` state machine and the `Hypothesis` decision slot are NOT the same.
 *
 * ITC-01 / ITC-03 (cross-object semantic separation).
 * Canonical AC references used by this file:
 *   AC-13 / AC-26 / AC-33 / AC-36 / AC-64 / AC-65 / AC-66 / AC-68 / AC-69 /
 *   AC-70 / AC-104 / AC-120 / AC-122.
 * 🔴 This file creates NO new AC.
 *
 * 🔴 S01-01A boundary wording (F01 / F04 / F05), deliberately split by AC:
 *   AC-66 = a `Hypothesis` (either kind) never becomes an `Experience Asset`;
 *   AC-70 = a `Model Suggestion` never grounds / never counts toward N /
 *           is never traced by step ⑩ / never upgrades to History-grounded - a
 *           HYPOTHESIS-side behaviour constraint, NOT "a Hypothesis cannot be an
 *           `EvidenceRef` target" (`EvidenceRef.target_id` is always `ObjectId<'ATT'>`).
 *
 * IMPLEMENTATION INVARIANT: contract §12 items 1 / 2 / 3 / 19 - the enumerations may not
 * be renamed, merged or extended.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  INSIGHT_STATES,
  INSIGHT_STATE_EVENT_TRIGGERS,
  INSIGHT_STATE_TRANSITIONS,
  canInsightServeAsGroundingSource,
  insightTransitionFor,
  isExperienceAssetView,
  stateAfterReferencedEvidenceArchived,
} from '../../domain/types/insight.js';
import type {
  Insight,
  InsightState,
  InsightStateEvent,
  InsightStateEventTrigger,
} from '../../domain/types/insight.js';
import {
  DECISION_STATES,
  HYPOTHESIS_KINDS,
  MODEL_SUGGESTION_ANNOTATION,
  SOURCE_PARTITIONS,
  canBecomeExperienceAssetDirectly,
  canModelSuggestionGround,
  checkEditableItemSeparation,
  decisionStateAfterEditableItemChange,
  decisionStateOfNewGeneration,
  isGroundingBinaryOutcome,
  isModelSuggestion,
  isSavedButUndecided,
} from '../../domain/types/hypothesis.js';
import type { DecisionState, Hypothesis } from '../../domain/types/hypothesis.js';
import { canAcceptInsight, canRejectInsight, gateSatisfied, gateUnsatisfied } from '../../domain/types/gates.js';
import type { GateMissingItem } from '../../domain/types/gates.js';
import { formatSourceFieldPath } from '../../domain/types/evidence-ref.js';
import type { EvidenceRef } from '../../domain/types/evidence-ref.js';
import { isObjectIdOfKind } from '../../domain/ids/object-id.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import {
  decisionInferenceItem,
  displayInferenceItem,
  factItem,
} from '../../domain/types/source-type.js';
import type {
  DecisionInferenceContentItem,
  DisplayInferenceContentItem,
} from '../../domain/types/source-type.js';
import { FIXED_ATTEMPT_ID, FIXED_HYPOTHESIS_ID, FIXED_INSIGHT_ID, FIXED_TIME } from './fixtures.js';
import type { AssertTrue, Disjoint, HasNoKey, IsExactly, IsNotAssignable } from './type-assertions.js';

/* ------------------------------------------------------------------ *
 * Compile-time assertions
 * ------------------------------------------------------------------ */

export type StateMachineSeparationAssertions = [
  /** `candidate` belongs to `Insight` only - it is NOT a Hypothesis decision value. */
  AssertTrue<IsNotAssignable<'candidate', DecisionState>>,
  /** `undecided` belongs to `Hypothesis` only - it is NOT an Insight state. */
  AssertTrue<IsNotAssignable<'undecided', InsightState>>,
  /** The two unions share only `accepted` / `rejected`, and neither IS the other. */
  AssertTrue<IsNotAssignable<InsightState, DecisionState>>,
  AssertTrue<IsNotAssignable<DecisionState, InsightState>>,
  AssertTrue<Disjoint<'candidate', DecisionState>>,
  AssertTrue<Disjoint<'undecided', InsightState>>,
  /** The two objects do not expose each other's state field. */
  AssertTrue<HasNoKey<Insight, 'decision_state'>>,
  AssertTrue<HasNoKey<Hypothesis, 'state'>>,
  /**
   * F01 (§11.3 / AC-65): the trigger vocabulary is exactly the four canonical reasons.
   * 🔴 "referenced evidence archived" is NOT one of them - it is not a state transition.
   */
  AssertTrue<IsNotAssignable<'referenced_evidence_archived', InsightStateEventTrigger>>,
  /**
   * F02 (D-038 / AC-36): "如何补充" is a DISPLAY-type Inference. A DECISION-type
   * Inference is rejected by the compiler, so it can never be presented as an AI
   * suggestion that silently becomes a basis.
   */
  AssertTrue<IsExactly<NonNullable<GateMissingItem['how_to_supplement']>, DisplayInferenceContentItem>>,
  AssertTrue<IsNotAssignable<DecisionInferenceContentItem, DisplayInferenceContentItem>>,
  /**
   * F04 (contract §5.1 / §5.2 rule 4): an `EvidenceRef.target_id` is ALWAYS the id of the
   * referenced Formal Attempt. A `HypothesisKind` is therefore structurally unable to
   * occupy the target position - no runtime predicate can (or should) express that.
   */
  AssertTrue<IsExactly<EvidenceRef['target_id'], ObjectId<'ATT'>>>,
];

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

function makeInsight(state: InsightState, evidence_refs: readonly EvidenceRef[] = []): Insight {
  return {
    insight_id: FIXED_INSIGHT_ID,
    attempt_id: FIXED_ATTEMPT_ID,
    state,
    proposition: '在当前条件下提高热风温度未能缩短干燥时长',
    applicable_scope: '50 摄氏度 / 该材料批次',
    evidence_refs,
    judgment_basis: '只有一条依据，属于单来源',
    gate_checks: [],
    generation_batch: 'GB-0001',
    created_at: FIXED_TIME,
    updated_at: FIXED_TIME,
  };
}

function makeEditableItems(): Hypothesis['editable_items'] {
  return {
    user_facts: [
      { slot: 'observation_metric', item: factItem('CI-user-metric', '含水率') },
    ],
    ai_inferences: [
      { slot: 'support_criterion', item: displayInferenceItem('CI-ai-support', '含水率下降') },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Runtime assertions
 * ------------------------------------------------------------------ */

describe('T3 state machine separation｜Insight vs Hypothesis', () => {
  it('[T3] IMPLEMENTATION INVARIANT (contract §12 items 2-3): the two three-state machines are different', () => {
    assert.deepEqual([...INSIGHT_STATES], ['candidate', 'accepted', 'rejected']);
    assert.deepEqual([...DECISION_STATES], ['undecided', 'accepted', 'rejected']);
    assert.notDeepEqual([...INSIGHT_STATES], [...DECISION_STATES]);
    // Shared members exist, but the machines are distinct.
    const shared = INSIGHT_STATES.filter((state) =>
      (DECISION_STATES as readonly string[]).includes(state),
    );
    assert.deepEqual([...shared], ['accepted', 'rejected']);
  });

  it('[AC-33] `candidate` must never be used for a Hypothesis output', () => {
    assert.ok(!(DECISION_STATES as readonly string[]).includes('candidate'));
    assert.ok((INSIGHT_STATES as readonly string[]).includes('candidate'));
    assert.deepEqual([...HYPOTHESIS_KINDS], ['grounded', 'model']);
  });

  it('[AC-65] InsightStateEvent carries exactly state transition + time + trigger reason class', () => {
    const event: InsightStateEvent = {
      event_id: 'EV-1',
      insight_id: FIXED_INSIGHT_ID,
      from_state: 'candidate',
      to_state: 'accepted',
      occurred_at: FIXED_TIME,
      trigger: 'user_accept',
    };

    assert.deepEqual(Object.keys(event).sort(), [
      'event_id',
      'from_state',
      'insight_id',
      'occurred_at',
      'to_state',
      'trigger',
    ]);
    // 🔴 No version / revision / edit-count / score field may appear on the trace.
    for (const forbidden of ['version', 'version_number', 'rollback', 'diff', 'edit_count', 'score']) {
      assert.ok(!(forbidden in event), `event must not carry "${forbidden}"`);
    }
    // The trigger vocabulary is exactly the four canonical reasons of §11.3.
    assert.deepEqual([...INSIGHT_STATE_EVENT_TRIGGERS], [
      'user_accept',
      'user_revoke',
      'content_edit',
      're_accept',
    ]);
  });

  it('IMPLEMENTATION INVARIANT (contract §2.2): the migration matrix is reproduced exactly', () => {
    assert.equal(INSIGHT_STATE_TRANSITIONS.length, 9);

    const accept = insightTransitionFor('candidate', 'accept');
    assert.equal(accept?.to, 'accepted');
    assert.equal(accept?.recheck_gates, false);

    const reject = insightTransitionFor('candidate', 'reject');
    assert.equal(reject?.to, 'rejected');

    const revoke = insightTransitionFor('accepted', 'revoke_acceptance');
    // Revoking returns to candidate - never to rejected.
    assert.equal(revoke?.to, 'candidate');

    const editAccepted = insightTransitionFor('accepted', 'edit_content');
    assert.equal(editAccepted?.to, 'candidate');
    assert.equal(editAccepted?.recheck_gates, true);

    const editRejected = insightTransitionFor('rejected', 'edit_content');
    // A rejected Insight falls back to candidate: it never becomes accepted directly.
    assert.equal(editRejected?.to, 'candidate');
    assert.notEqual(editRejected?.to, 'accepted');

    for (const state of INSIGHT_STATES) {
      assert.equal(insightTransitionFor(state, 'edit_meta')?.to, 'unchanged');
    }
  });

  it('[AC-26] accepting requires E1-E4; rejecting never does', () => {
    const allSatisfied = [gateSatisfied('E1'), gateSatisfied('E2'), gateSatisfied('E3'), gateSatisfied('E4')];
    assert.equal(canAcceptInsight(allSatisfied), true);

    const missingE2 = [
      gateSatisfied('E1'),
      gateUnsatisfied('E2', [
        {
          description: '缺少可核对的引用',
          why_important: '没有引用就无法追溯',
          how_to_supplement: displayInferenceItem('CI-hint', '补充引用历史记录（AI 建议）'),
        },
      ]),
      gateSatisfied('E3'),
      gateSatisfied('E4'),
    ];
    assert.equal(canAcceptInsight(missingE2), false);
    // 🔴 A reject is not gated by E1-E4.
    assert.equal(canRejectInsight(), true);
    // The three-part presentation is available and its "how to supplement" is display Inference.
    const hint = missingE2[1]?.missing_items[0]?.how_to_supplement;
    assert.equal(hint?.source_type, 'Inference');
    assert.equal(hint?.confirmation_class, 'display');
    // 🔴 A decision-type Inference is not even assignable to that slot (D-038).
    const decisionHint = decisionInferenceItem('CI-hint-decision', '请补充引用');
    assert.equal(decisionHint.confirmation_class, 'decision');
    assert.notEqual(decisionHint.confirmation_class, hint?.confirmation_class);
  });

  it('[AC-13][AC-36] Experience Asset is a VIEW of an accepted Insight, never an object', () => {
    assert.equal(isExperienceAssetView(makeInsight('accepted')), true);
    assert.equal(isExperienceAssetView(makeInsight('candidate')), false);
    assert.equal(isExperienceAssetView(makeInsight('rejected')), false);
    // An accepted Insight (the Experience Asset view) can never SERVE AS a grounding source.
    assert.equal(canInsightServeAsGroundingSource(), false);
    assert.equal(canBecomeExperienceAssetDirectly(), false);
  });

  it('[AC-36] IMPLEMENTATION INVARIANT (contract §5.2 rule 2): accepted Insight cannot SERVE AS a grounding source, but it still owns its EvidenceRefs', () => {
    // 🔴 Wording matters: the constraint is on the SOURCE side of a reference only.
    assert.equal(canInsightServeAsGroundingSource(), false);

    const ownRef: EvidenceRef = {
      evidence_ref_id: 'REF-1',
      target_id: FIXED_ATTEMPT_ID,
      source_field_path: formatSourceFieldPath('goal', 'CI-goal'),
      role: 'grounding',
      owner_id: FIXED_INSIGHT_ID,
    };
    const accepted = makeInsight('accepted', [ownRef]);
    // The Insight still carries its reference to a `Formal Attempt` (§3.3 / §5.1 owner_id).
    assert.equal(accepted.evidence_refs.length, 1);
    assert.equal(accepted.evidence_refs[0]?.target_id, FIXED_ATTEMPT_ID);
    assert.equal(accepted.evidence_refs[0]?.role, 'grounding');
    assert.equal(accepted.evidence_refs[0]?.owner_id, accepted.insight_id);
    // "cannot SERVE AS a grounding source" is the only claim - never "never carries grounding".
    assert.notEqual(canInsightServeAsGroundingSource(), true);
  });

  it('[AC-66] a Hypothesis never becomes an Experience Asset, and has no direct object relation to it', () => {
    assert.equal(canBecomeExperienceAssetDirectly(), false);
    assert.deepEqual([...HYPOTHESIS_KINDS], ['grounded', 'model']);
  });

  it('[AC-70] a Model Suggestion never grounds, never counts toward N, never traced by step ⑩', () => {
    assert.equal(canModelSuggestionGround(), false);
    assert.equal(isModelSuggestion('model'), true);
    assert.equal(isModelSuggestion('grounded'), false);
    // 🔴 AC-70 is a Hypothesis-side behaviour constraint. It is NOT a claim that a
    //    `HypothesisKind` can be an `EvidenceRef` target: the target is always an
    //    `ATT_` object id (§5.1 / §5.2 rule 4, enforced by the type system).
    assert.equal(isObjectIdOfKind(FIXED_ATTEMPT_ID, 'attempt'), true);
    assert.equal(isObjectIdOfKind(FIXED_HYPOTHESIS_ID, 'attempt'), false);
    assert.equal(isObjectIdOfKind(FIXED_INSIGHT_ID, 'attempt'), false);
  });

  it('[AC-68][AC-69] the save slot and the decision slot are independent', () => {
    assert.equal(isSavedButUndecided(true, 'undecided'), true);
    assert.equal(isSavedButUndecided(true, 'accepted'), false);
    assert.equal(isSavedButUndecided(false, 'undecided'), false);
    assert.equal(isSavedButUndecided(null, 'undecided'), false);
    // The overall Model Suggestion annotation is permanent and whole.
    assert.equal(MODEL_SUGGESTION_ANNOTATION, '模型通用建议 / 非你的历史经验依据');
  });

  it('[AC-104] editing ⑥⑦⑧ never moves the decision slot', () => {
    for (const state of DECISION_STATES) {
      assert.equal(decisionStateAfterEditableItemChange(state), state);
    }
  });

  it('[AC-120] a newly generated Hypothesis never inherits the previous decision slot', () => {
    assert.equal(decisionStateOfNewGeneration(), 'undecided');
    for (const stale of ['accepted', 'rejected']) {
      assert.notEqual(decisionStateOfNewGeneration(), stale);
    }
  });

  it('IMPLEMENTATION INVARIANT (§8.6 rule 2): user Fact items and AI Inference items stay separated', () => {
    const items = makeEditableItems();
    assert.equal(checkEditableItemSeparation(items), true);

    // Freshly built, correctly separated columns also pass.
    const separated = {
      user_facts: [
        { slot: 'observation_metric' as const, item: factItem('CI-x', '用户条目') },
      ],
      ai_inferences: [
        {
          slot: 'support_criterion' as const,
          item: displayInferenceItem('CI-y', 'AI 条目'),
        },
      ],
    };
    assert.equal(checkEditableItemSeparation(separated), true);
    // An empty pair is vacuously separated (nothing was mixed).
    assert.equal(
      checkEditableItemSeparation({
        user_facts: [],
        ai_inferences: [],
      }),
      true,
    );
    assert.deepEqual(
      separated.user_facts.map((entry) => entry.item.source_type),
      ['Fact'],
    );
    assert.deepEqual(
      separated.ai_inferences.map((entry) => entry.item.source_type),
      ['Inference'],
    );
    // 🔴 The two columns are physically separate keys - never one merged list.
    assert.notDeepEqual(Object.keys(items).sort(), ['entries']);
  });

  it('IMPLEMENTATION INVARIANT (§8.2 rules 1-2): grounding is binary and requires G + traceable reference + no N', () => {
    // G1 satisfied, no N hit, and a traceable historical reference exists ⇒ grounded.
    assert.equal(isGroundingBinaryOutcome(['G1'], [], true), true);
    // A G-basis without a traceable reference is exactly N1 - not grounded.
    assert.equal(isGroundingBinaryOutcome(['G1'], [], false), false);
    // A traceable reference with no G1-G4 basis cannot be `History-grounded`.
    assert.equal(isGroundingBinaryOutcome([], [], true), false);
    // Any N condition defeats grounding, even with a traceable reference.
    assert.equal(isGroundingBinaryOutcome(['G1'], ['N4'], true), false);
    assert.equal(isGroundingBinaryOutcome(['G1', 'G2'], ['N1'], true), false);
    // Nothing at all.
    assert.equal(isGroundingBinaryOutcome([], [], false), false);
    // 🔴 There is no third "mixed" source label and no partial-grounding grade.
    assert.deepEqual([...SOURCE_PARTITIONS], ['historical_evidence', 'model_prior']);
    assert.ok(!(SOURCE_PARTITIONS as readonly string[]).includes('mixed'));
  });

  it('IMPLEMENTATION INVARIANT (contract §11.3 / D-043): archiving referenced evidence is not a state-transition trigger', () => {
    // 🔴 "引用证据归档但状态不变" must never be recorded as a state-transition event.
    assert.ok(
      !(INSIGHT_STATE_EVENT_TRIGGERS as readonly string[]).includes('referenced_evidence_archived'),
    );
    assert.equal(INSIGHT_STATE_EVENT_TRIGGERS.length, 4);
    for (const state of INSIGHT_STATES) {
      assert.equal(stateAfterReferencedEvidenceArchived(state), state);
    }
  });
});
