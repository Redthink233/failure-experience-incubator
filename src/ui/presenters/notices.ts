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
 * 🔴 NO INVENTED RETRY POLICY, AND NO FAKE RETRY BUTTON (`FINAL-RAPID-B` §9). The only actions offered
 *    are the ones `notice.recovery` already names (S01-06 §45): there is no "retry 10 times", no
 *    auto-retry, no background queue. And `retryable` here means "a REAL command is offered below" -
 *    never "the service called it retryable". The strip used to render a control labelled 「重试」 for
 *    a notice that named no command, and clicking it only dismissed the card: a button whose wording
 *    and behaviour disagreed, which §9 forbids outright. A notice with nothing to re-run now offers
 *    「关闭」 - a control whose wording IS its behaviour.
 * 🔴 THE RECOVERY TARGET TRAVELS WITH THE NOTICE (`FINAL-RAPID-B` §8). `RecoveryView.attempt_id` is
 *    the record the command must run against; the App Shell is no longer free to substitute the record
 *    that happens to be selected.
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
  SETTINGS_CLOSE,
} from '../copy.js';
import type { WorkflowNotice, WorkflowRecoveryAction } from '../../application/workflow/types.js';

export type RecoveryKey =
  | 'rerun_retrieval'
  | 'regenerate_insights'
  | 'regenerate_hypotheses'
  | 'grant_workspace_access'
  | 'select_workspace'
  /**
   * 🔴 THE HONEST REPLACEMENT FOR A RETRY THAT CANNOT HAPPEN (§9). It is a REAL action - it removes the
   *    notice - so a control carrying it may be labelled 「关闭」 without lying. It is deliberately NOT a
   *    member of `WorkflowRecoveryAction`: the service never names it, the App Shell offers it only
   *    where the service named nothing.
   */
  | 'dismiss'
  /** A rendered key this layer does not recognise. The App Shell treats it as "nothing to run". */
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
  /**
   * 🔴 `true` ONLY WHEN A REAL COMMAND IS OFFERED IN `recovery` (`FINAL-RAPID-B` §9).
   *
   * It is NOT a copy of `WorkflowNotice.retryable`: the service saying "a retry may help" is not the
   * same fact as the App Shell having something to run. Conflating the two is exactly how a 「重试」
   * control that only dismissed a card was shipped.
   */
  readonly retryable: boolean;
  /**
   * The one action this notice offers, or `null` when it offers none.
   *
   * 🔴 `dismiss` IS A REAL ACTION: the App Shell's recovery route answers it by removing the notice,
   *    so the rendered control says 「关闭」 and really closes.
   */
  readonly recovery: RecoveryView | null;
}

/**
 * The label of the control that only removes a notice.
 *
 * 🔴 IT REUSES THE COPY DECK'S 「关闭」 rather than re-typing the word here: a product sentence belongs
 *    to `copy.ts`, and this module owns no user-visible wording of its own.
 */
export function dismissLabel(): string {
  return SETTINGS_CLOSE;
}

/** The dismissal a notice offers when the service named no command to re-run (§9). */
function dismissView(): RecoveryView {
  return { key: 'dismiss', label: dismissLabel(), attempt_id: null };
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
  const command = recoveryViewOf(notice.recovery);
  return {
    tone,
    heading: tone === 'gate' ? NOTICE_GATE_HEADING : NOTICE_RUNTIME_HEADING,
    hint: tone === 'gate' ? NOTICE_GATE_HINT : NOTICE_RUNTIME_HINT,
    /* 🔴 The message is copied verbatim from the service. This layer composes no failure text. */
    message: notice.message,
    code: notice.code,
    /*
     * 🔴 A RETRY IS OFFERED ONLY WHERE ONE REALLY EXISTS (§9). With no command named by the service
     *    there is nothing to re-run, so the notice does not claim to be retryable - whatever the
     *    service's own `retryable` said.
     */
    retryable: notice.retryable === true && command !== null,
    /*
     * 🔴 AND A NOTICE THAT NAMES NO COMMAND STILL HAS TO BE CLOSEABLE. Offering a dismissal here - and
     *    only here, i.e. only where the fake retry used to be - keeps the strip usable without
     *    inventing a retry: the label says 关闭 and the action really closes. A GATE notice (never
     *    retryable, never command-backed) keeps its previous rendering untouched.
     */
    recovery: command ?? (notice.retryable === true ? dismissView() : null),
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
 * 🔴 IT IS NOT RETRYABLE AND SAYS SO (§9). No command exists that would "retry" a composition the
 *    capability table cannot resolve, so `retryable` is `false`; the notice offers the honest 关闭
 *    instead of a 「重试」 that would silently do nothing.
 */
export function shellRuntimeNoticeView(message: string, code: string): NoticeView {
  return {
    tone: 'runtime',
    heading: NOTICE_RUNTIME_HEADING,
    hint: NOTICE_RUNTIME_HINT,
    message,
    code,
    retryable: false,
    recovery: dismissView(),
  };
}

/**
 * The label of the generic retry control.
 *
 * 🔴 IT IS NOW UNREACHABLE BY CONSTRUCTION, AND THAT IS THE POINT (§9). The strip renders this label
 *    only for a notice that is `retryable` and names no command - and `noticeViewOf` /
 *    `shellRuntimeNoticeView` can no longer produce that combination. It is kept because it is the
 *    copy deck's retry word and the strip's contract still takes a label; a notice that really can be
 *    retried carries its own command label.
 */
export function retryLabel(): string {
  return NOTICE_RETRY;
}

/**
 * Narrows a rendered recovery key back to the key type (`FINAL-RAPID-B` §8).
 *
 * 🔴 The DOM layer reads the key off a rendered node as a plain `string`; this is the ONE place that
 *    turns it back into the union, so an unexpected key becomes `none` - "nothing to run" - instead of
 *    being interpreted as some other command.
 */
export function recoveryKeyOf(key: string): RecoveryKey {
  switch (key) {
    case 'rerun_retrieval':
    case 'regenerate_insights':
    case 'regenerate_hypotheses':
    case 'grant_workspace_access':
    case 'select_workspace':
    case 'dismiss':
      return key;
    default:
      return 'none';
  }
}
