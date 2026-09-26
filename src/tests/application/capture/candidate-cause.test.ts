/**
 * S01-05 ｜ A1 – A7 ｜ Step ④ candidate failure causes and step ⑤ user handling.
 *
 * Canonical AC references used by this file:
 *   AC-10 / AC-11 / AC-91 / AC-92 / AC-93 / AC-94 / AC-95 / AC-96 / AC-28.
 * 🔴 This file creates NO new AC. All AI answers are hand-written fixtures
 *    (NOT_A_REAL_LLM_OUTPUT) - no model and no provider is verified here.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CauseAnalysisProposal } from '../../../application/capture/types.js';
import type { CauseDecisionResult } from '../../../application/capture/cause-analysis.js';
import { candidateCausePromptMessages } from '../../../application/capture/prompts.js';
import { candidateCauseJsonSchema } from '../../../application/capture/schemas.js';
import { isReusableAsConfirmedDecision } from '../../../domain/types/source-type.js';
import { decisionInferenceItem } from '../../../domain/types/source-type.js';
import { assertObjectIdOfKind } from '../../../domain/ids/object-id.js';
import {
  ZERO_CAUSE_STATEMENT,
  causePayload,
  makeHarness,
  parsePayload,
  timeoutError,
} from './capture-test-harness.js';
import type { CaptureHarness } from './capture-test-harness.js';

const TWO_CAUSES = causePayload([
  { statement: '失败可能与温度控制不稳定有关', supporting_source_paths: ['condition'] },
  { statement: '另一个可能的原因是升温速度过快', supporting_source_paths: ['actual_attempt'] },
]);

/** Brings a record to the point where step ④ can run, and returns it. */
async function prepared(harness: CaptureHarness, operation: string) {
  const outcome = await harness.service.beginCapture({
    operation_id: `${operation}-begin`,
    raw_text: '把热风温度调到 70 度后表面开裂',
  });
  const attempt = outcome.attempt;
  assert.ok(attempt !== null);
  if (attempt === null) {
    throw new Error('fixture setup failed');
  }
  await harness.service.applyStructuredConfirmation({
    operation_id: `${operation}-confirm`,
    attempt_id: attempt.attempt_id,
    result_status: { decision: 'accepted', value: '未达到预期' },
    user_confirmed: true,
  });
  return attempt.attempt_id;
}

async function analysed(harness: CaptureHarness, operation: string): Promise<CauseAnalysisProposal> {
  const attempt_id = await prepared(harness, operation);
  const outcome = await harness.service.analyseCandidateCauses(attempt_id);
  assert.equal(outcome?.kind, 'analysed');
  if (outcome?.kind !== 'analysed') {
    throw new Error('fixture setup failed');
  }
  return outcome.proposal;
}

function decide(
  harness: CaptureHarness,
  proposal: CauseAnalysisProposal,
  decisions?: Readonly<Record<string, 'accepted' | 'rejected' | 'unresolved'>>,
): CauseDecisionResult {
  return harness.service.decideCandidateCauses({
    attempt_id: proposal.attempt_id,
    candidates: proposal.candidates,
    ...(decisions === undefined ? {} : { decisions }),
  });
}

describe('S01-05｜step ④ / ⑤ candidate failure causes', () => {
  it('AC-95｜A1 every generated candidate is an unresolved decision-type Inference', async () => {
    const harness = makeHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      { kind: 'structured', value: TWO_CAUSES },
    ]);
    const proposal = await analysed(harness, 'a1');
    assert.equal(proposal.candidates.length, 2);
    for (const candidate of proposal.candidates) {
      assert.equal(candidate.source_type, 'Inference');
      assert.equal(candidate.confirmation_class, 'decision');
      assert.equal(candidate.decision_state, 'unresolved');
      assert.ok(candidate.content_item_id.startsWith(String(proposal.attempt_id)));
      assert.equal(proposal.absence_statement, null);
    }
  });

  it('AC-91｜A2 zero candidates is a legal outcome and never blocks the save', async () => {
    const harness = makeHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      { kind: 'structured', value: causePayload([], ZERO_CAUSE_STATEMENT) },
    ]);
    const proposal = await analysed(harness, 'a2');
    assert.deepEqual(proposal.candidates, []);
    assert.equal(proposal.absence_statement, ZERO_CAUSE_STATEMENT);

    const attempt_id = assertObjectIdOfKind(proposal.attempt_id, 'attempt');
    const saved = await harness.service.saveFormalAttempt({
      operation_id: 'a2-save',
      attempt_id,
      user_explicitly_confirmed: true,
    });
    assert.equal(saved.formalization.decision.outcome, 'ready');
    assert.equal(saved.attempt?.state, 'Formal');
    assert.deepEqual(saved.attempt?.candidate_causes, []);
  });

  it('AC-94｜A3 an untouched candidate stays unresolved and is never an accepted basis', async () => {
    const harness = makeHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      { kind: 'structured', value: TWO_CAUSES },
    ]);
    const proposal = await analysed(harness, 'a3');
    const decided = decide(harness, proposal);
    assert.deepEqual(decided.ignored_content_item_ids, []);
    assert.deepEqual(decided.outcome.changed_content_item_ids, []);
    for (const candidate of decided.outcome.candidates) {
      assert.equal(candidate.decision_state, 'unresolved');
      /* Reuse gate §4.3: only an explicitly accepted decision inference may be reused. */
      assert.equal(
        isReusableAsConfirmedDecision(
          decisionInferenceItem(candidate.content_item_id, candidate.statement, 'unresolved'),
        ),
        false,
      );
      assert.equal(
        isReusableAsConfirmedDecision(
          decisionInferenceItem(candidate.content_item_id, candidate.statement, 'rejected'),
        ),
        false,
      );
      assert.equal(
        isReusableAsConfirmedDecision(
          decisionInferenceItem(candidate.content_item_id, candidate.statement, 'accepted'),
        ),
        true,
      );
    }
  });

  it('AC-10｜A4 an accepted candidate is still an Inference - acceptance changes the decision, not the source', async () => {
    const harness = makeHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      { kind: 'structured', value: TWO_CAUSES },
    ]);
    const proposal = await analysed(harness, 'a4');
    const target = proposal.candidates[0];
    assert.ok(target !== undefined);
    if (target === undefined) {
      return;
    }
    const decided = decide(harness, proposal, { [target.content_item_id]: 'accepted' });
    const accepted = decided.outcome.candidates.find(
      (candidate) => candidate.content_item_id === target.content_item_id,
    );
    assert.equal(accepted?.decision_state, 'accepted');
    assert.equal(accepted?.source_type, 'Inference', 'acceptance never rewrites the source type');
    assert.equal(accepted?.confirmation_class, 'decision');
    assert.deepEqual([...decided.outcome.changed_content_item_ids], [target.content_item_id]);
  });

  it('AC-95｜A5 a rejected candidate keeps its content and never becomes a Fact', async () => {
    const harness = makeHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      { kind: 'structured', value: TWO_CAUSES },
    ]);
    const proposal = await analysed(harness, 'a5');
    const target = proposal.candidates[1];
    assert.ok(target !== undefined);
    if (target === undefined) {
      return;
    }
    const decided = decide(harness, proposal, { [target.content_item_id]: 'rejected' });
    const rejected = decided.outcome.candidates.find(
      (candidate) => candidate.content_item_id === target.content_item_id,
    );
    assert.equal(rejected?.decision_state, 'rejected');
    assert.equal(rejected?.source_type, 'Inference');
    assert.equal(rejected?.statement, target.statement, 'V1 has no physical delete (AC-76)');
    assert.equal(decided.outcome.candidates.length, 2);

    const unknowns = decide(harness, proposal, { 'ATT_UNKNOWN:cause': 'accepted' });
    assert.deepEqual([...unknowns.ignored_content_item_ids], ['ATT_UNKNOWN:cause']);
  });

  it('AC-94｜A6 a Formal save does not require every candidate to be handled', async () => {
    const harness = makeHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      { kind: 'structured', value: TWO_CAUSES },
    ]);
    const proposal = await analysed(harness, 'a6');
    const first = proposal.candidates[0];
    assert.ok(first !== undefined);
    if (first === undefined) {
      return;
    }
    const decided = decide(harness, proposal, { [first.content_item_id]: 'accepted' });
    const saved = await harness.service.saveFormalAttempt({
      operation_id: 'a6-save',
      attempt_id: assertObjectIdOfKind(proposal.attempt_id, 'attempt'),
      user_explicitly_confirmed: true,
      candidate_causes: decided,
    });
    assert.equal(saved.formalization.decision.outcome, 'ready');
    assert.equal(saved.attempt?.state, 'Formal');
    const stored = saved.attempt?.candidate_causes ?? [];
    assert.equal(stored.length, 2);
    assert.deepEqual(
      stored.map((item) => item.decision_state),
      ['accepted', 'unresolved'],
      'an untouched candidate is persisted as unresolved, never as accepted',
    );
    for (const item of stored) {
      assert.equal(item.source_type, 'Inference');
    }
  });

  it('AC-93｜A7 the cause step has no scoring vocabulary and refuses numbers outright', async () => {
    const prompt = candidateCausePromptMessages([{ field: 'goal', value: '缩短干燥时间' }])
      .map((message) => `${message.role}:${message.content}`)
      .join('\n');
    assert.ok(prompt.includes('不得输出任何评分 / 概率 / 置信度 / 贡献度 / 重要度'));
    assert.ok(prompt.includes('允许 0 条候选原因'));

    const properties = candidateCauseJsonSchema['properties'] as Readonly<Record<string, unknown>>;
    assert.deepEqual(Object.keys(properties).sort(), ['cause_absence_note', 'causes']);
    assert.deepEqual(candidateCauseJsonSchema['required'], ['causes', 'cause_absence_note']);

    /* (a) a scoring key in the answer is refused. */
    const scored = makeHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      {
        kind: 'structured',
        value: {
          causes: [{ statement: '失败可能与温度有关', confidence: 0.82 }],
          cause_absence_note: '',
        },
      },
    ]);
    const scored_id = await prepared(scored, 'a7a');
    const scored_outcome = await scored.service.analyseCandidateCauses(scored_id);
    assert.equal(scored_outcome?.kind, 'runtime_failure');
    if (scored_outcome?.kind === 'runtime_failure') {
      assert.equal(scored_outcome.local_code, 'FORBIDDEN_NUMERIC_FIELD');
      assert.equal(scored_outcome.draft_preserved, true);
    }

    /* (b) ANY numeric leaf is refused - the step introduces no new number (AC-93). */
    const numeric = makeHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      {
        kind: 'structured',
        value: { causes: [{ statement: '失败可能与温度有关' }], cause_absence_note: '', rank: 2 },
      },
    ]);
    const numeric_id = await prepared(numeric, 'a7b');
    const numeric_outcome = await numeric.service.analyseCandidateCauses(numeric_id);
    assert.equal(numeric_outcome?.kind, 'runtime_failure');
    if (numeric_outcome?.kind === 'runtime_failure') {
      assert.equal(numeric_outcome.local_code, 'FORBIDDEN_NUMERIC_FIELD');
    }

    /* (c) a silent 0-cause answer is refused instead of being rendered as "nothing to say". */
    const silent = makeHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      { kind: 'structured', value: { causes: [], cause_absence_note: '   ' } },
    ]);
    const silent_id = await prepared(silent, 'a7c');
    const silent_outcome = await silent.service.analyseCandidateCauses(silent_id);
    assert.equal(silent_outcome?.kind, 'runtime_failure');
    if (silent_outcome?.kind === 'runtime_failure') {
      assert.equal(silent_outcome.local_code, 'ZERO_CAUSE_WITHOUT_EXPLICIT_STATEMENT');
    }

    /* (d) an adapter error is reported as such - never reinterpreted as "no cause found". */
    const broken = makeHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      { kind: 'error', error: timeoutError() },
    ]);
    const broken_id = await prepared(broken, 'a7d');
    const broken_outcome = await broken.service.analyseCandidateCauses(broken_id);
    assert.equal(broken_outcome?.kind, 'runtime_failure');
    if (broken_outcome?.kind === 'runtime_failure') {
      assert.equal(broken_outcome.ai_error?.code, 'PROVIDER_TIMEOUT');
      assert.equal(broken_outcome.local_code, null);
    }
  });
});
