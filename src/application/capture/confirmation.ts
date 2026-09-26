/**
 * S01-05 ｜ Step ③ - the user's integral correction / confirmation of the structured result.
 *
 * Contract: §9 ③ / `D-011` / `D-014` / AC-07 / AC-10 / AC-Q06-6.
 *   - the parse result is confirmed or corrected AS A WHOLE; no per-field ticking is required;
 *   - a value the user changed or supplied is recorded as the user's own `Fact` (§9 ③);
 *   - an AI induction the user did NOT change simply STAYS `Extraction` - confirmation never
 *     upgrades it to `Fact`, and there is no "confirmed extraction = fact" rule (§4.1 / §4.2
 *     rule 1);
 *   - the result status is a decision-type `Inference`: it is usable only after an EXPLICIT user
 *     acceptance and its confirmation is never delegated to the follow-up mechanism (§4.3 /
 *     AC-Q06-6).
 *
 * 🔴 NOTHING here can promote the record: the produced patch only carries field CONTENT. The
 *    `Draft -> Formal` promotion is a separate, explicitly requested step (`formalization.ts`),
 *    so an AI parse proposal can never become a formal authoritative result without the user's
 *    explicit confirmation (§2.1 / AC-Q06-5).
 *
 * 🔴 NO DELETION: a rejected result status is stored as `decision_state = 'rejected'` with its
 *    content intact. V1 has no physical delete at all (AC-76).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { Attempt } from '../../domain/types/attempt.js';
import type { AttemptPatch } from '../../workspace/repository/attempt-repository.js';
import type { MaybeProvided } from '../../domain/types/presence.js';
import { provided } from '../../domain/types/presence.js';
import type { ContentItem, InferenceContentItem } from '../../domain/types/source-type.js';
import {
  decisionInferenceItem,
  extractionItem,
  factItem,
  isReusableAsConfirmedDecision,
} from '../../domain/types/source-type.js';
import type { PersistedContentItem } from '../../domain/types/content-item-record.js';
import {
  followUpAiExtractionItem,
  followUpAiExtractionItemId,
  followUpUserAnswerItem,
  followUpUserAnswerItemId,
} from '../../domain/types/content-item-record.js';
import type { FollowUpGapKey } from '../../domain/types/follow-up.js';
import type {
  CaptureContentKey,
  CaptureFieldKey,
  ParsedFieldExtraction,
  ResultStatusDecision,
  StructuredConfirmationRequest,
  StructuredParseProposal,
} from './types.js';
import { CAPTURE_FIELD_KEYS } from './types.js';
import { isSentinelLikeValue } from './schemas.js';

/** Content item ids are derived from the Attempt id so an item is traceable to its record. */
export function extractionItemId(attempt_id: string, field: string): string {
  return `${attempt_id}:${field}:ai`;
}

export function userFactItemId(attempt_id: string, field: string): string {
  return `${attempt_id}:${field}:user`;
}

export interface ConfirmationApplied {
  readonly kind: 'applied' | 'pending';
  readonly attempt_id: string;
  /** 🔴 Field CONTENT only - never `state` (a promotion is a separate explicit action). */
  readonly patch: AttemptPatch;
  /**
   * 🔴 `Attempt` sidecar 的 `content_items` 集合（持久化），承载**非主字段路径**的内容条目：
   *    追问答案的双层落库（用户原话 `Fact` + AI 归纳 `Extraction`）。
   *    它们**不是** Level A 的一部分，也不进入 `EvidenceRef` / `N_*`（docs/02 §C.5 硬规则 3）。
   */
  readonly content_items: readonly PersistedContentItem[];
  readonly user_fact_fields: readonly CaptureContentKey[];
  readonly extraction_fields: readonly CaptureContentKey[];
  /** AI inductions the user overrode; mirrored into `content_items` (never discarded). */
  readonly retained_ai_extractions: readonly ParsedFieldExtraction[];
  readonly result_status_content_item: InferenceContentItem | null;
  readonly result_status_decision: ResultStatusDecision;
  readonly user_confirmed: boolean;
  /** Non-blocking observations for `M15`. Empty in the ordinary case. */
  readonly integration_notes: readonly string[];
}

export type ConfirmationRejectedCode =
  | 'CORRECTION_WITHOUT_VALUE'
  | 'RESULT_STATUS_DECISION_WITHOUT_TEXT'
  | 'ATTEMPT_NOT_FOUND';

export interface ConfirmationRejected {
  readonly kind: 'invalid_command';
  readonly code: ConfirmationRejectedCode;
  readonly detail: string;
}

export type ConfirmationResult = ConfirmationApplied | ConfirmationRejected;

export interface ConfirmationInput {
  readonly attempt: Attempt;
  /** `null` when step ② failed at runtime - the user may still fill fields by hand. */
  readonly proposal: StructuredParseProposal | null;
  readonly request: StructuredConfirmationRequest;
}

const RETAINED_AI_INDUCTION_NOTE =
  '一条被用户取值覆盖的 AI 归纳会被保留为**独立**的 `Extraction` 内容条目，并随 `Attempt` sidecar 持久化；用户取值位于主字段槽位，二者来源属性各自不变、不会被合并（§4.2 rule 1 / rule 3）。本条仅作提示，不阻断流程。';

type ContentOverlay = Partial<Record<CaptureFieldKey, MaybeProvided<ContentItem>>>;

/** Builds the Draft-level content patch for a confirmation. */
export function confirmStructuredAttempt(input: ConfirmationInput): ConfirmationResult {
  const { attempt, proposal, request } = input;
  const corrections = new Map<CaptureContentKey, string>();
  /** The canonical gap each follow-up-carrying correction answers (task §4 / AC-30). */
  const answer_gaps = new Map<CaptureContentKey, FollowUpGapKey>();
  for (const correction of request.corrections ?? []) {
    if (isSentinelLikeValue(correction.value)) {
      return {
        kind: 'invalid_command',
        code: 'CORRECTION_WITHOUT_VALUE',
        detail: `A correction must carry the user's own wording; "${correction.field}" received a blank or placeholder value. Leaving a field unknown is expressed by not correcting it at all (AC-04).`,
      };
    }
    corrections.set(correction.field, correction.value);
    if (correction.answer_to_gap !== undefined) {
      answer_gaps.set(correction.field, correction.answer_to_gap);
    }
  }

  const proposal_fields = new Map<CaptureContentKey, string>();
  for (const extraction of proposal?.extractions ?? []) {
    proposal_fields.set(extraction.field, extraction.value);
  }

  const overlay: ContentOverlay = {};
  const user_fact_fields: CaptureContentKey[] = [];
  const extraction_fields: CaptureContentKey[] = [];
  const retained_ai_extractions: ParsedFieldExtraction[] = [];

  for (const field of CAPTURE_FIELD_KEYS) {
    const corrected = corrections.get(field);
    const extracted = proposal_fields.get(field);
    if (corrected !== undefined) {
      overlay[field] = provided(factItem(userFactItemId(attempt.attempt_id, field), corrected));
      user_fact_fields.push(field);
      if (extracted !== undefined) {
        retained_ai_extractions.push({ field, value: extracted });
      }
      continue;
    }
    if (extracted !== undefined) {
      overlay[field] = provided(
        extractionItem(extractionItemId(attempt.attempt_id, field), extracted),
      );
      extraction_fields.push(field);
    }
  }

  /* ---- key_parameters: AI extractions first, then the user's own parameter statements ---- */
  /*
   * 🔴 Every parameter keeps the identity it was minted with at step ②: the identity travels
   *    WITH the item, so it is the SAME id in the persisted content-item collection and here,
   *    and no array index / array length / display order participates in it. Reordering
   *    `Attempt.key_parameters` therefore cannot swap two items' identities (task §4).
   */
  const parameters: ContentItem[] = [];
  for (const parameter of proposal?.key_parameters ?? []) {
    parameters.push(extractionItem(parameter.content_item_id, parameter.value));
  }
  const user_parameter = corrections.get('key_parameters');
  if (user_parameter !== undefined) {
    parameters.push(factItem(userFactItemId(attempt.attempt_id, 'key_parameters'), user_parameter));
    user_fact_fields.push('key_parameters');
  }

  /*
   * ---- 追问答案的双层落库（contract §4.2 rule 3 / `D-024` / AC-30） ----
   *
   * 🔴 用户原话与 AI 归纳是**两条独立内容条目**，永不合并、永不互相改标：
   *      用户原话 → `Fact`｜`field_key = followup_user_answer`
   *      AI 归纳   → `Extraction`｜`field_key = followup_ai_extraction`
   * 🔴 AI 归纳取自第 ② 步已持久化的同主字段抽取结果；若该字段本就没有 AI 归纳
   *    （正是追问针对的缺口场景），**不伪造**条目 —— 只落用户原话那一层。
   * 🔴 主字段槽位仍按既有确认规则更新为「用户提供的取值 = 用户 `Fact`」，
   *    因此追问答案不会成为「孤岛内容条目」（§9 ③），`level_a.condition` 等可直接读出。
   */
  const follow_up_items: PersistedContentItem[] = [];
  for (const [field, target_gap] of answer_gaps) {
    const user_words = corrections.get(field);
    if (user_words === undefined) {
      continue;
    }
    follow_up_items.push(
      followUpUserAnswerItem(
        followUpUserAnswerItemId(attempt.attempt_id, field),
        target_gap,
        user_words,
      ),
    );
    const ai_induction = proposal_fields.get(field);
    if (ai_induction !== undefined) {
      follow_up_items.push(
        followUpAiExtractionItem(
          followUpAiExtractionItemId(attempt.attempt_id, field),
          target_gap,
          ai_induction,
        ),
      );
    }
  }

  /* ---- user tags: optional, never graded, never a save condition (AC-12) ---- */
  const failure_tags =
    request.failure_tags === undefined
      ? null
      : [...new Set(request.failure_tags.map((tag) => tag.trim()))].filter(
          (tag) => tag.length > 0 && !isSentinelLikeValue(tag),
        );

  /* ---- result status: a decision-type Inference, never auto-accepted ---- */
  const decision: ResultStatusDecision = request.result_status?.decision ?? 'unresolved';
  const proposed_status = request.result_status?.value ?? proposal?.result_status_proposal ?? null;
  let result_status_item: InferenceContentItem | null = null;

  if (decision === 'unresolved') {
    if (proposed_status !== null && !isSentinelLikeValue(proposed_status)) {
      /* Persisted as `unresolved` so an untouched candidate stays visible and pending (§4.3). */
      result_status_item = decisionInferenceItem(
        extractionItemId(attempt.attempt_id, 'result_status'),
        proposed_status,
        'unresolved',
      );
    }
  } else {
    if (proposed_status === null || isSentinelLikeValue(proposed_status)) {
      return {
        kind: 'invalid_command',
        code: 'RESULT_STATUS_DECISION_WITHOUT_TEXT',
        detail:
          'Accepting or rejecting a result status requires the status text itself; AI proposes it at step ③ and the user may rewrite it, but it cannot be empty (AC-Q06-6).',
      };
    }
    result_status_item = decisionInferenceItem(
      extractionItemId(attempt.attempt_id, 'result_status'),
      proposed_status,
      decision === 'accepted' ? 'accepted' : 'rejected',
    );
  }

  const patch: AttemptPatch = {
    ...overlay,
    ...(proposal !== null || user_parameter !== undefined ? { key_parameters: parameters } : {}),
    ...(failure_tags === null ? {} : { failure_tags }),
    ...(result_status_item === null ? {} : { result_status: provided(result_status_item) }),
  };

  return {
    kind: request.user_confirmed ? 'applied' : 'pending',
    attempt_id: attempt.attempt_id,
    patch,
    content_items: follow_up_items,
    user_fact_fields,
    extraction_fields,
    retained_ai_extractions,
    result_status_content_item: result_status_item,
    result_status_decision: decision,
    user_confirmed: request.user_confirmed,
    integration_notes: retained_ai_extractions.length > 0 ? [RETAINED_AI_INDUCTION_NOTE] : [],
  };
}

/** True when the attempt already carries a user-confirmed result status (§2.1 prerequisite). */
export function hasUserConfirmedResultStatus(attempt: Attempt): boolean {
  const status = attempt.result_status;
  return status.presence_state === 'present' && isReusableAsConfirmedDecision(status.item);
}
