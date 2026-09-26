/**
 * S01-06 ｜ Notices: the GATE / RUNTIME split (task §44 / §45).
 *
 * 🔴 `GATE` AND `RUNTIME` ARE NEVER RENDERED THE SAME WAY. A gate is 「需要补充 / 当前条件未满足」 - the
 *    user must add something. A runtime failure is 「系统本次没有完成 / 可以重试」 - the environment
 *    failed and the data is intact. Turning both into one red error box would tell the user they made
 *    a mistake when the provider merely timed out, which is exactly what §44 forbids.
 * 🔴 ONLY `WorkflowNotice` IS CONSUMED. Its `message` is a FIXED product sentence produced by
 *    `M15` - no stack trace, no `DOMException`, no raw provider body ever reaches this layer, and
 *    this module has no field that could carry one.
 * 🔴 NO INVENTED RETRY POLICY. The only actions offered are the ones `notice.recovery` already names
 *    (S01-06 §45). There is no "retry 10 times", no auto-retry, no background queue.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO I/O.
 */

import {
  NOTICE_GATE_HEADING,
  NOTICE_GATE_HINT,
  NOTICE_RECOVERY_GRANT_ACCESS,
  NOTICE_RECOVERY_REGENERATE_HYPOTHESES,
  NOTICE_RECOVERY_REGENERATE_INSIGHTS,
  NOTICE_RECOVERY_RERUN_RETRIEVAL,
  NOTICE_RECOVERY_SELECT_WORKSPACE,
  NOTICE_RETRY,
  NOTICE_RUNTIME_HEADING,
  NOTICE_RUNTIME_HINT,
} from '../copy.js';
import type { WorkflowNotice, WorkflowRecoveryAction } from '../../application/workflow/types.js';

export type RecoveryKey =
  | 'rerun_retrieval'
  | 'regenerate_insights'
  | 'regenerate_hypotheses'
  | 'grant_workspace_access'
  | 'select_workspace'
  | 'none';

export interface RecoveryView {
  readonly key: RecoveryKey;
  readonly label: string;
  /** Present for the attempt-scoped actions, so the caller never has to guess the target. */
  readonly attempt_id: string | null;
}

export interface NoticeView {
  readonly tone: 'gate' | 'runtime';
  readonly heading: string;
  readonly hint: string;
  readonly message: string;
  readonly code: string;
  readonly retryable: boolean;
  readonly recovery: RecoveryView | null;
}

function recoveryViewOf(action: WorkflowRecoveryAction | null): RecoveryView | null {
  if (action === null) {
    return null;
  }
  switch (action.kind) {
    case 'rerun_retrieval':
      return {
        key: 'rerun_retrieval',
        label: NOTICE_RECOVERY_RERUN_RETRIEVAL,
        attempt_id: String(action.attempt_id),
      };
    case 'regenerate_insights':
      return {
        key: 'regenerate_insights',
        label: NOTICE_RECOVERY_REGENERATE_INSIGHTS,
        attempt_id: String(action.attempt_id),
      };
    case 'regenerate_hypotheses':
      return {
        key: 'regenerate_hypotheses',
        label: NOTICE_RECOVERY_REGENERATE_HYPOTHESES,
        attempt_id: String(action.attempt_id),
      };
    case 'grant_workspace_access':
      return { key: 'grant_workspace_access', label: NOTICE_RECOVERY_GRANT_ACCESS, attempt_id: null };
    case 'select_workspace':
      return { key: 'select_workspace', label: NOTICE_RECOVERY_SELECT_WORKSPACE, attempt_id: null };
    default:
      return null;
  }
}

export function noticeViewOf(notice: WorkflowNotice): NoticeView {
  const tone = notice.layer === 'GATE' ? 'gate' : 'runtime';
  return {
    tone,
    heading: tone === 'gate' ? NOTICE_GATE_HEADING : NOTICE_RUNTIME_HEADING,
    hint: tone === 'gate' ? NOTICE_GATE_HINT : NOTICE_RUNTIME_HINT,
    /* 🔴 The message is copied verbatim from the service. This layer composes no failure text. */
    message: notice.message,
    code: notice.code,
    retryable: notice.retryable === true,
    recovery: recoveryViewOf(notice.recovery),
  };
}

/** The deduplicated notice list of one screen, newest first. */
export function noticeViewsOf(notices: readonly WorkflowNotice[]): readonly NoticeView[] {
  const seen = new Set<string>();
  const views: NoticeView[] = [];
  for (const notice of [...notices].reverse()) {
    const key = `${notice.layer}:${notice.code}:${notice.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    views.push(noticeViewOf(notice));
  }
  return views;
}

/**
 * A RUNTIME notice produced by the App Shell itself (e.g. a provider composition that returned
 * `unsupported`).
 *
 * 🔴 It is deliberately shaped like a service notice so the screen shows ONE failure language, and
 *    it is worded as a system-side failure - never as something the user filled in wrong.
 */
export function shellRuntimeNoticeView(message: string, code: string): NoticeView {
  return {
    tone: 'runtime',
    heading: NOTICE_RUNTIME_HEADING,
    hint: NOTICE_RUNTIME_HINT,
    message,
    code,
    retryable: true,
    recovery: null,
  };
}

/** The label of the generic retry button, offered only when the notice says a retry can help. */
export function retryLabel(): string {
  return NOTICE_RETRY;
}
