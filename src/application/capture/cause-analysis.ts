/**
 * S01-05 ｜ Step ④ candidate failure causes + step ⑤ user handling of them.
 *
 * Contract: §9 ④ / §9 ⑤; §4.1 (`Inference｜decision`); §4.3 (reuse gate); §4.2 rule 1;
 *           `D-048` and AC-10 (calibrated) / AC-91 / AC-92 / AC-93 / AC-94 / AC-95 / AC-96.
 *
 * 🔴 A cause is ALWAYS an `Inference` with `confirmation_class = 'decision'`. It is never a
 *    `Fact` and never an `Extraction`, and an accepted cause stays `Inference` forever (§4.2
 *    rule 2). Wording that asserts the cause as established is a product semantic violation.
 * 🔴 The candidate count may be ZERO and that is a legal, non-blocking outcome; 0 causes must be
 *    accompanied by an explicit 「当前依据不足，暂不推断原因」statement and must never be padded
 *    to look complete (AC-91 / AC-92 / AC-93).
 * 🔴 AN UNTOUCHED CANDIDATE IS NEVER ACCEPTED. It stays `unresolved`, remains visible and
 *    persisted, and can never be reused as an already-confirmed basis / grounding / `N_引用`
 *    (AC-94 / AC-95 / §4.3).
 * 🔴 NO SUPPORTING FIELD IS DELETED: rejection is a decision state, not a removal (AC-76).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ProviderAdapter } from '../../ai/provider/adapter.js';
import type { CredentialRef } from '../../ai/provider/credential.js';
import type { AiRequest } from '../../ai/provider/request.js';
import type { Attempt } from '../../domain/types/attempt.js';
import type { DecisionInferenceContentItem } from '../../domain/types/source-type.js';
import {
  decisionInferenceItem,
  isReusableAsConfirmedDecision,
} from '../../domain/types/source-type.js';
import { newContentItemId } from '../../domain/ids/content-item-id.js';
import type { AttemptPatch } from '../../workspace/repository/attempt-repository.js';
import { candidateCausePromptMessages } from './prompts.js';
import type { CausePromptField } from './prompts.js';
import {
  CANDIDATE_CAUSE_SCHEMA_ID,
  candidateCauseJsonSchema,
  readCausePayload,
  structuredOutputRequest,
} from './schemas.js';
import { invokeStructured } from './structured-parse.js';
import type {
  CandidateCauseProposal,
  CauseAnalysisOutcome,
  CauseDecision,
  CauseDecisionOutcome,
} from './types.js';
import { runtimeFailure } from './types.js';

/**
 * The MINIMAL context sent to step ④: the content the user already confirmed at step ③.
 *
 * 🔴 The raw text is deliberately NOT re-sent, and no history is attached (contract §0.4 A).
 * 🔴 An `unresolved` / `rejected` result status is NOT sent as a basis: only an accepted
 *    decision-type `Inference` may be reused as an already-confirmed judgement (§4.3 / AC-95).
 */
export function confirmedCauseFieldValues(attempt: Attempt): readonly CausePromptField[] {
  const fields: CausePromptField[] = [];
  const add = (name: string, value: { presence_state: string; item?: { value: string } }): void => {
    if (value.presence_state === 'present' && value.item !== undefined) {
      fields.push({ field: name, value: value.item.value });
    }
  };
  add('goal', attempt.goal);
  add('actual_attempt', attempt.actual_attempt);
  add('condition', attempt.condition);
  add('actual_result', attempt.actual_result);
  add('expected_result', attempt.expected_result);
  add('judgment_basis', attempt.judgment_basis);
  add('environment', attempt.environment);
  if (attempt.key_parameters.length > 0) {
    fields.push({
      field: 'key_parameters',
      value: attempt.key_parameters.map((item) => item.value).join('; '),
    });
  }
  const status = attempt.result_status;
  if (
    status.presence_state === 'present' &&
    isReusableAsConfirmedDecision(status.item)
  ) {
    fields.push({ field: 'result_status', value: status.item.value });
  }
  return fields;
}

export function buildCandidateCauseRequest(
  adapter: ProviderAdapter,
  fields: readonly CausePromptField[],
): AiRequest {
  return {
    provider_id: adapter.provider_id,
    model: adapter.config.model,
    messages: candidateCausePromptMessages(fields),
    structured_output: structuredOutputRequest(
      CANDIDATE_CAUSE_SCHEMA_ID,
      candidateCauseJsonSchema,
    ),
  };
}

/**
 * Step ④. Returns a PROPOSAL - nothing is persisted here, and no state of the Attempt changes.
 */
export async function analyseCandidateCauses(
  adapter: ProviderAdapter,
  credential_ref: CredentialRef | null,
  attempt: Attempt,
): Promise<CauseAnalysisOutcome> {
  const request = buildCandidateCauseRequest(adapter, confirmedCauseFieldValues(attempt));
  const structured_output = request.structured_output;
  if (structured_output === null) {
    return runtimeFailure('REQUEST_INVALID', 'The cause request must carry a schema.', false);
  }

  const invoked = await invokeStructured({ adapter, credential_ref, request, structured_output });
  if (invoked.kind === 'runtime_failure') {
    return invoked;
  }

  const read = readCausePayload(invoked.value);
  if (read.kind === 'issue') {
    const scoring = read.issue.code === 'FORBIDDEN_NUMERIC_FIELD';
    return runtimeFailure(
      scoring ? 'FORBIDDEN_NUMERIC_FIELD' : read.issue.code,
      read.issue.detail,
      !scoring,
    );
  }

  const payload = read.payload;
  /*
   * 🔴 Every candidate obtains its OWN identity at generation time. The AI answer carries only
   *    statements, so the array position of a cause can never become an id (contract §3.2).
   * 🔴 The user's later `accepted` / `rejected` / `unresolved` decision binds to that id - never
   *    to a list position - so reordering (or re-rendering) the candidate list cannot move a
   *    decision onto another cause (task §5).
   */
  const candidates: CandidateCauseProposal[] = payload.causes.map((cause) => ({
    content_item_id: newContentItemId(attempt.attempt_id),
    source_type: 'Inference',
    confirmation_class: 'decision',
    statement: cause.statement,
    supporting_source_paths: cause.supporting_source_paths,
    decision_state: 'unresolved',
  }));

  return {
    kind: 'analysed',
    proposal: {
      attempt_id: attempt.attempt_id,
      candidates,
      absence_statement: candidates.length === 0 ? payload.cause_absence_note : null,
    },
  };
}

export interface CauseDecisionRequest {
  readonly attempt_id: string;
  readonly candidates: readonly CandidateCauseProposal[];
  /** Decisions by `content_item_id`. An omitted id means "left untouched" (AC-94). */
  readonly decisions?: Readonly<Record<string, CauseDecision>>;
}

export interface CauseDecisionApplied {
  readonly kind: 'decided';
  readonly outcome: CauseDecisionOutcome;
  /** Ids present in `decisions` that match no candidate - reported, never silently dropped. */
  readonly ignored_content_item_ids: readonly string[];
}

export type CauseDecisionResult = CauseDecisionApplied;

/**
 * Step ⑤. Applies the user's accept / reject / leave-unresolved decisions.
 *
 * 🔴 `accepted` does NOT change `source_type`: an accepted cause stays `Inference` (§4.2 rule 2).
 * 🔴 `rejected` keeps the statement - V1 has no physical delete (AC-76).
 * 🔴 An id absent from `decisions` keeps `unresolved`: there is no default-accept path (AC-94).
 */
export function decideCandidateCauses(request: CauseDecisionRequest): CauseDecisionResult {
  const decisions = request.decisions ?? {};
  const matched = new Set<string>();

  const candidates = request.candidates.map((candidate) => {
    const requested = decisions[candidate.content_item_id];
    if (requested !== undefined) {
      matched.add(candidate.content_item_id);
    }
    return {
      content_item_id: candidate.content_item_id,
      source_type: 'Inference' as const,
      confirmation_class: 'decision' as const,
      statement: candidate.statement,
      supporting_source_paths: candidate.supporting_source_paths,
      decision_state: requested ?? candidate.decision_state,
    };
  });

  const changed = candidates
    .filter((candidate, index) => candidate.decision_state !== request.candidates[index]?.decision_state)
    .map((candidate) => candidate.content_item_id);

  return {
    kind: 'decided',
    outcome: {
      attempt_id: request.attempt_id,
      candidates,
      changed_content_item_ids: changed,
    },
    ignored_content_item_ids: Object.keys(decisions).filter((id) => !matched.has(id)),
  };
}

/**
 * Persistable form of the candidate set.
 *
 * 🔴 Supporting source paths have no slot on `DecisionInferenceContentItem`, so they stay in the
 *    application proposal; see the INTEGRATION item reported by S01-05.
 */
export function candidateCausesPatch(outcome: CauseDecisionOutcome): AttemptPatch {
  const items: DecisionInferenceContentItem[] = outcome.candidates.map((candidate) =>
    decisionInferenceItem(candidate.content_item_id, candidate.statement, candidate.decision_state),
  );
  return { candidate_causes: items };
}
