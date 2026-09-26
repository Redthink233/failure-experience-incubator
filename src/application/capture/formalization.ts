/**
 * S01-05 ｜ Step ⑤ - the `Draft` / `Formal` boundary (save) and the threshold separation.
 *
 * Contract: §2.1 / §9 ① / §9 ⑤ / §10.1 layer 1 / `D-012` / `D-026` / `D-047` / `D-048`.
 *
 * 🔴 FOUR DIFFERENT THRESHOLDS, never one:
 *      ① object creatable        - 非空、非纯空白输入 (§9 ① / AC-87 / AC-88)
 *      ② runtime continuable     - AI / 保存失败时保留数据并可重试 (§10.1 layer 2 / AC-89)
 *      ③ `Formal` save           - 目标 + 实际尝试 + 实际结果 + 用户显式确认的结果状态 (§2.1)
 *      ④ experience promotion    - `E1`–`E5` (§2.2) - 🔴 NOT evaluated by this module
 *    A stricter threshold must never be used to justify the previous one (AC-29 / task §16).
 *
 * 🔴 The Formal gate and the state-transition check are the EXISTING domain functions
 *    (`evaluateFormalGate` / `checkAttemptStateTransition`). No threshold is re-derived, no
 *    threshold is raised, and a denial is a `GATE` outcome: data is preserved, nothing is shown
 *    as a system error and the user is never locked out (§10.1 layer 1).
 * 🔴 Saving does NOT require every candidate cause to be handled: an unresolved candidate is
 *    persisted as `unresolved` (AC-94).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { Attempt, FormalGateField, FormalGateResult } from '../../domain/types/attempt.js';
import {
  ATTEMPT_FORMAL,
  checkAttemptStateTransition,
  evaluateFormalGate,
} from '../../domain/types/attempt.js';
import type { AttemptPatch } from '../../workspace/repository/attempt-repository.js';
import type { CaptureGateReport } from './gates.js';
import { evaluateCaptureGates } from './gates.js';
import type { FollowUpQuestionBudget } from './follow-up-budget.js';
import { isFollowUpBudgetExhausted } from './follow-up-budget.js';
import type { FormalizationDecision, FormalizationBlockReason } from './types.js';
import { P1_GAP_KEYS } from './types.js';

/** The four distinct thresholds, stated together so they can never be conflated (AC-29). */
export const CAPTURE_THRESHOLDS = {
  object_creatable: '非空、非纯空白输入 → 可创建 Draft（不设字符数阈值、不设语义判定）',
  runtime_continuable: 'AI / 保存失败 → 保留已有数据 + 明确提示 + 允许重试（不设产品层重试上限）',
  formal_save: '目标 + 实际尝试 + 实际结果 + 用户显式确认的结果状态 → Formal Attempt',
  experience_promotion: 'E1–E5 → Experience Asset（本模块不评估，属第 ⑧ 步）',
} as const;

export const P1_MISSING_WITH_EXHAUSTED_BUDGET_NOTE =
  '3 个关键追问问题已经用完，但目标 / 实际尝试 / 实际结果仍未齐备；这条记录保持 Draft，不会伪装成 Formal Attempt，也不会被丢弃 —— 你可以随时继续补充（AC-Q06-5）。';

export interface FormalizationRequest {
  /** Idempotency handle supplied by `M15`. */
  readonly operation_id: string;
  readonly attempt: Attempt;
  /** 🔴 Only an explicit user confirmation may trigger `Draft -> Formal` (§2.1 / AC-Q06-5). */
  readonly user_explicitly_confirmed: boolean;
  /** Used to state the AC-Q06-5 situation explicitly instead of silently keeping a Draft. */
  readonly follow_up_budget?: FollowUpQuestionBudget;
}

export interface FormalizationResult {
  readonly decision: FormalizationDecision;
  readonly gate_report: CaptureGateReport;
  readonly formal_gate: FormalGateResult;
  readonly missing_fields: readonly FormalGateField[];
  readonly follow_up_budget_exhausted: boolean;
  /** Present when a Draft is retained and the situation needs an explicit sentence. */
  readonly retention_note: string | null;
  /** 🔴 `{ state: 'Formal' }` and nothing else - a promotion invents no field value. */
  readonly promotion_patch: AttemptPatch | null;
}

/**
 * Evaluates whether the record may become a `Formal Attempt`.
 *
 * 🔴 A missing `P1` prerequisite keeps the record a `Draft` EVEN IF the follow-up budget is
 *    exhausted - there is no "budget used up so let us call it Formal" path (AC-Q06-5).
 * 🔴 Unresolved candidate causes are NOT a blocker (AC-94); the promotion patch deliberately
 *    does not touch `candidate_causes`, so whatever the save step wrote stays as it is.
 */
export function evaluateFormalization(request: FormalizationRequest): FormalizationResult {
  const { attempt } = request;
  const budget_exhausted =
    request.follow_up_budget === undefined
      ? false
      : isFollowUpBudgetExhausted(request.follow_up_budget);

  const gate_report = evaluateCaptureGates(attempt, {
    user_explicitly_accepted: request.user_explicitly_confirmed,
  });
  const formal_gate = evaluateFormalGate(attempt);
  const p1_missing = P1_GAP_KEYS.some((gap) => formal_gate.missing_fields.includes(gap as FormalGateField));

  if (!request.user_explicitly_confirmed) {
    return {
      decision: {
        outcome: 'draft_retained',
        attempt_id: attempt.attempt_id,
        missing_fields: formal_gate.missing_fields,
        block_reasons: ['NOT_USER_CONFIRMED'],
      },
      gate_report,
      formal_gate,
      missing_fields: formal_gate.missing_fields,
      follow_up_budget_exhausted: budget_exhausted,
      retention_note:
        '只有用户显式确认才能把这条记录保存为 Formal；系统不会自动升级（§2.1 / AC-Q06-5）。',
      promotion_patch: null,
    };
  }

  const transition = checkAttemptStateTransition(attempt, ATTEMPT_FORMAL);
  if (!transition.allowed) {
    const reason: FormalizationBlockReason =
      transition.code === 'FORMAL_GATE_UNSATISFIED'
        ? 'FORMAL_GATE_UNSATISFIED'
        : 'NOT_A_CANONICAL_TRANSITION';
    return {
      decision: {
        outcome: 'draft_retained',
        attempt_id: attempt.attempt_id,
        missing_fields: transition.missing_fields,
        block_reasons: [reason],
      },
      gate_report,
      formal_gate,
      missing_fields: transition.missing_fields,
      follow_up_budget_exhausted: budget_exhausted,
      retention_note:
        budget_exhausted && p1_missing
          ? P1_MISSING_WITH_EXHAUSTED_BUDGET_NOTE
          : '这条记录仍是 Draft；已有内容全部保留，补全后用一次显式确认即可保存为 Formal。',
      promotion_patch: null,
    };
  }

  return {
    decision: {
      outcome: 'ready',
      attempt_id: attempt.attempt_id,
      missing_fields: [],
      block_reasons: [],
    },
    gate_report,
    formal_gate,
    missing_fields: [],
    follow_up_budget_exhausted: budget_exhausted,
    retention_note: null,
    promotion_patch: { state: ATTEMPT_FORMAL },
  };
}
