/**
 * S01 ｜ `M15` - how a delegated module outcome becomes a LAYER (task §15).
 *
 * ── THE DISCRIMINATOR, STATED ONCE ──────────────────────────────────────────────────
 * 🔴 `GATE`    ⇔ the refusal is a statement about the PRODUCT STATE or the USER'S REQUEST: nothing
 *                is broken, the record simply does not qualify yet, the command is malformed, or the
 *                user must ask for the action explicitly. Repeating the IDENTICAL command unchanged
 *                would fail identically.
 * 🔴 `RUNTIME` ⇔ the refusal is a statement about the ENVIRONMENT: the model did not return a usable
 *                answer, the workspace failed, or persistence could not complete. Repeating the
 *                IDENTICAL command may succeed.
 *
 * That single test decides every mapping below, so the classification is not a per-case opinion.
 *
 * 🔴 THE MODULE OUTCOME IS NEVER RE-WORDED. The workflow returns it verbatim (`WorkflowStepResult
 *    .value`); the notice is an ADDITIONAL, user-safe layer signal. So a refusal detail stays exactly
 *    as `M8` / `M9` authored it, and the workflow invents no second wording for a frozen failure.
 * 🔴 A `refused` outcome is NOT a thrown error: nothing was written and the record is untouched.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { RunRetrievalOutcome } from '../../retrieval/compare/retrieval-service.js';
import type { HypothesisActionOutcome, HypothesisGenerationRefusedOutcome } from '../hypothesis/types.js';
import type { InsightActionOutcome, InsightGenerationRefusedOutcome } from '../insight/types.js';
import { workflowErrorLayer, workflowNotice } from './errors.js';
import type {
  WorkflowErrorCode,
  WorkflowFailureLayer,
  WorkflowNotice,
  WorkflowRecoveryAction,
} from './types.js';

/** How one delegated call is classified. `ACCEPTANCE` is structurally unreachable (`task §15`). */
export interface OutcomeClassification {
  readonly kind: 'delegated' | 'gate' | 'runtime';
  readonly layer: 'OK' | WorkflowFailureLayer;
  readonly notice: WorkflowNotice | null;
}

const OK: OutcomeClassification = { kind: 'delegated', layer: 'OK', notice: null };

function gate(code: WorkflowErrorCode): OutcomeClassification {
  return { kind: 'gate', layer: 'GATE', notice: workflowNotice(code, null) };
}

function runtime(code: WorkflowErrorCode, recovery: WorkflowRecoveryAction): OutcomeClassification {
  return { kind: 'runtime', layer: 'RUNTIME', notice: workflowNotice(code, recovery) };
}

export { OK as OK_OUTCOME };

/* ------------------------------------------------------------------ *
 * 1. `M8` / `M9` generation refusals
 * ------------------------------------------------------------------ */

/** The exact GATE / RUNTIME split of a step ⑧ refusal. */
export const INSIGHT_REFUSAL_CODES: Readonly<
  Record<InsightGenerationRefusedOutcome['code'], WorkflowErrorCode>
> = {
  SOURCE_ATTEMPT_NOT_FOUND: 'ATTEMPT_NOT_FOUND',
  REGENERATION_REQUIRED: 'WORKFLOW_COMMAND_INVALID',
  OPERATION_ID_CONFLICT: 'WORKFLOW_COMMAND_INVALID',
  /* The MODEL proposed a reference `M7` refuses; a retry may differ. */
  EVIDENCE_SELECTION_REFUSED: 'PROVIDER_FAILURE',
  /* The MODEL's answer was unusable. */
  AI_PROPOSAL_REJECTED: 'PROVIDER_FAILURE',
  PERSISTENCE_RECOVERY_BLOCKED: 'PERSISTENCE_RECOVERY_BLOCKED',
};

/** The exact GATE / RUNTIME split of a step ⑨ refusal. */
export const HYPOTHESIS_REFUSAL_CODES: Readonly<
  Record<HypothesisGenerationRefusedOutcome['code'], WorkflowErrorCode>
> = {
  SOURCE_ATTEMPT_NOT_FOUND: 'ATTEMPT_NOT_FOUND',
  REGENERATION_REQUIRED: 'WORKFLOW_COMMAND_INVALID',
  OPERATION_ID_CONFLICT: 'WORKFLOW_COMMAND_INVALID',
  EVIDENCE_SELECTION_REFUSED: 'PROVIDER_FAILURE',
  AI_PROPOSAL_REJECTED: 'PROVIDER_FAILURE',
  /*
   * 🔴 Contract §8: a History-grounded hypothesis whose own `N_引用` would be 0 is not a valid
   *    hypothesis. That is a statement about the RECORD, i.e. a GATE - and it is literally task §15's
   *    own GATE example 「grounded Hypothesis 不成立」.
   */
  GROUNDING_WITHOUT_TRACEABLE_REFERENCE: 'GATE_NOT_SATISFIED',
  PERSISTENCE_RECOVERY_BLOCKED: 'PERSISTENCE_RECOVERY_BLOCKED',
};

/** `M8` step ⑧ outcome → classification. */
export function classifyInsightGeneration(
  outcome: { readonly kind: string; readonly code?: string; readonly local_code?: string | null },
  attempt_id: ObjectId<'ATT'>,
): OutcomeClassification {
  if (outcome.kind === 'generated' || outcome.kind === 'zero_output') {
    return OK;
  }
  if (outcome.kind === 'runtime_failure') {
    return runtime(
      outcome.local_code === null || outcome.local_code === undefined
        ? 'PROVIDER_FAILURE'
        : 'INTERNAL_FAILURE',
      { kind: 'regenerate_insights', attempt_id },
    );
  }
  const code = outcome.code as InsightGenerationRefusedOutcome['code'];
  const mapped = INSIGHT_REFUSAL_CODES[code] ?? 'INTERNAL_FAILURE';
  return workflowErrorLayer(mapped) === 'GATE'
    ? gate(mapped)
    : runtime(mapped, { kind: 'regenerate_insights', attempt_id });
}

/** `M9` step ⑨ outcome → classification. */
export function classifyHypothesisGeneration(
  outcome: { readonly kind: string; readonly code?: string; readonly local_code?: string | null },
  attempt_id: ObjectId<'ATT'>,
): OutcomeClassification {
  if (outcome.kind === 'generated' || outcome.kind === 'zero_output') {
    return OK;
  }
  if (outcome.kind === 'runtime_failure') {
    return runtime(
      outcome.local_code === null || outcome.local_code === undefined
        ? 'PROVIDER_FAILURE'
        : 'INTERNAL_FAILURE',
      { kind: 'regenerate_hypotheses', attempt_id },
    );
  }
  const code = outcome.code as HypothesisGenerationRefusedOutcome['code'];
  const mapped = HYPOTHESIS_REFUSAL_CODES[code] ?? 'INTERNAL_FAILURE';
  return workflowErrorLayer(mapped) === 'GATE'
    ? gate(mapped)
    : runtime(mapped, { kind: 'regenerate_hypotheses', attempt_id });
}

/* ------------------------------------------------------------------ *
 * 2. Lifecycle actions
 * ------------------------------------------------------------------ */

/**
 * `M8` / `M9` lifecycle actions.
 *
 * 🔴 A `rejected` action is ALWAYS a `GATE`: those modules refuse a lifecycle action only because a
 *    frozen rule says so (a non-canonical transition, an unsatisfied `E1`-`E4`, a read-only item, a
 *    `Model Suggestion`-only save slot), and repeating it unchanged fails identically.
 * 🔴 A `runtime_failure` is ALWAYS `RUNTIME`.
 */
export function classifyAction(
  outcome: InsightActionOutcome | HypothesisActionOutcome | { readonly kind: string },
): OutcomeClassification {
  if (outcome.kind === 'applied' || outcome.kind === 'rechecked') {
    return OK;
  }
  if (outcome.kind === 'runtime_failure') {
    return runtime('PROVIDER_FAILURE', { kind: 'none' });
  }
  return gate('GATE_NOT_SATISFIED');
}

/* ------------------------------------------------------------------ *
 * 3. `M6` step ⑥
 * ------------------------------------------------------------------ */

/**
 * `M6` step ⑥.
 *
 * 🔴 `completed` covers BOTH empty states AND `RELATED_HISTORY`: `HISTORY_EMPTY` and
 *    `NO_RELATED_HISTORY` are legitimate SUCCESSES, not failures (`D-046` V-1 / AC-97 / AC-98).
 * 🔴 `source_not_formal` is a `GATE` - the mirror of task §15's 「Attempt 不能 Formal」 example.
 * 🔴 `runtime_incomplete` is a `RUNTIME` and is NEVER reported as "no related history" (`§8` / `§27`).
 */
export function classifyRetrieval(
  outcome: RunRetrievalOutcome,
  attempt_id: ObjectId<'ATT'>,
): OutcomeClassification {
  switch (outcome.kind) {
    case 'completed':
      return OK;
    case 'runtime_incomplete':
      return runtime('RETRIEVAL_RUNTIME_INCOMPLETE', { kind: 'rerun_retrieval', attempt_id });
    case 'source_not_formal':
      return gate('ATTEMPT_NOT_FORMAL');
    case 'source_not_found':
      return gate('ATTEMPT_NOT_FOUND');
  }
}

/* ------------------------------------------------------------------ *
 * 4. `M4` / `M5` capture
 * ------------------------------------------------------------------ */

/** Step ① / ② entry. 🔴 An empty input is an entry hint, not a system error (`AC-87`). */
export function classifyBeginCapture(outcome: { readonly kind: string }): OutcomeClassification {
  return outcome.kind === 'captured' ? OK : gate('WORKFLOW_COMMAND_INVALID');
}

/** Step ③. */
export function classifyConfirmation(result: { readonly kind: string }): OutcomeClassification {
  return result.kind === 'applied' ? OK : gate('WORKFLOW_COMMAND_INVALID');
}

/** Step ② follow-up. */
export function classifyFollowUp(outcome: { readonly kind: string }): OutcomeClassification {
  return outcome.kind === 'asked' ? OK : gate('WORKFLOW_COMMAND_INVALID');
}

/** Step ② follow-up dismissal. */
export function classifyAbandon(outcome: { readonly kind: string }): OutcomeClassification {
  return outcome.kind === 'abandoned' ? OK : gate('WORKFLOW_COMMAND_INVALID');
}

/** Step ④⑤ candidate causes. */
export function classifyCausePersistence(outcome: { readonly persisted: unknown }): OutcomeClassification {
  return outcome.persisted === null ? gate('ATTEMPT_NOT_FOUND') : OK;
}

/**
 * Step ⑤ save.
 *
 * 🔴 `draft_retained` is a `GATE`: the `Formal` gate is not satisfied (or the user did not explicitly
 *    confirm), the record is preserved and the missing items are reported. It is NOT a system error.
 */
export function classifyFormalSave(outcome: {
  readonly formalization: { readonly decision: { readonly outcome: string } };
  readonly attempt: unknown;
}): OutcomeClassification {
  return outcome.formalization.decision.outcome === 'ready' && outcome.attempt !== null
    ? OK
    : gate('GATE_NOT_SATISFIED');
}
