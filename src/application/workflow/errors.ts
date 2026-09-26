/**
 * S01 ｜ `M15` - the workspace / runtime error boundary (task §15, §16).
 *
 * Contract: contract §10.1 layer 1 (`GATE`) / layer 2 (`RUNTIME`), §0.4 A (a browser may only touch a
 * user-authorized directory), §7.3 (an archived record is not editable), AC-127 / AC-128.
 * HANDOFF §6: `M1` / `M15` must handle BOTH `WorkspaceStorageError` AND `BrowserWorkspaceAccessError`,
 * and `original_error` / a stack / a DOM exception / a raw provider body must NEVER reach the UI.
 *
 * ── THE CENTRAL RULE OF THIS FILE ───────────────────────────────────────────────────
 * A thrown value is converted into a `WorkflowNotice` whose message is a FIXED sentence from the
 * table below. Nothing derived from the thrown value is ever copied into a notice - not the message,
 * not the code, not a path. That is what makes "no raw exception reaches the product view model" a
 * property of the code shape instead of a review habit.
 *
 * 🔴 `BrowserWorkspaceAccessError` lives in `src/browser/workspace/**` and CANNOT be imported here:
 *    the framework-neutral application layer must not depend on the browser scope. It is therefore
 *    recognised STRUCTURALLY - by its stable `name` plus its frozen `code` set. The class really does
 *    set both (`workspace-access-error.ts`), and a test asserts the recognition against the real
 *    class, so the structural check cannot rot silently.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import { WorkspaceStorageError } from '../../workspace/storage.js';
import { WorkspaceSchemaError } from '../../workspace/schema/schema-error.js';
import type {
  WorkflowErrorCode,
  WorkflowNotice,
  WorkflowRecoveryAction,
} from './types.js';

/**
 * 🔴 FIXED product sentences. They are keyed by CODE only, so no thrown value can influence the text.
 */
export const WORKFLOW_ERROR_MESSAGES: Readonly<Record<WorkflowErrorCode, string>> = {
  ATTEMPT_NOT_FOUND: '这条记录不存在，因此这一步没有执行。',
  INSIGHT_NOT_FOUND: '这条候选经验不存在，因此这一步没有执行。',
  HYPOTHESIS_NOT_FOUND: '这条待验证假设不存在，因此这一步没有执行。',
  ATTEMPT_NOT_FORMAL:
    '第 ⑥ 步只对已经正式保存（Formal）的记录运行。这条记录还是草稿，记录保持不变。',
  GATE_NOT_SATISFIED: '当前条件还不满足这一步的前置要求；记录保持不变，可以按提示补充后重试。',
  WORKFLOW_COMMAND_INVALID: '这次操作不完整，或与约定的操作方式不一致；记录保持不变。',
  WORKSPACE_PERMISSION_REQUIRED:
    '当前会话还没有获得工作区目录的访问授权。没有任何内容被读取或写入，请先完成一次授权。',
  WORKSPACE_PERMISSION_DENIED:
    '工作区目录的访问被拒绝或已撤回。已有内容没有被修改，重新授权后可以继续。',
  WORKSPACE_UNAVAILABLE:
    '当前运行环境无法访问工作区目录。没有打开任何目录，也没有读取任何文件。',
  WORKSPACE_OPERATION_UNSUPPORTED:
    '当前浏览器的文件系统接口不支持这项操作。没有复制、没有删除，也没有留下重复文件。',
  WORKSPACE_CONTENT_UNREADABLE:
    '工作区里有一条记录无法按约定格式读取。原始文件没有被修改，需要人工确认后再处理。',
  WORKSPACE_FAILURE_UNCLASSIFIED: '工作区操作没有完成，已有内容保持不变，可以重试。',
  PROVIDER_FAILURE: '模型服务这次没有正常返回。已经保存的内容没有被修改，可以重试。',
  RETRIEVAL_RUNTIME_INCOMPLETE:
    '历史检索这次没有跑完（运行期失败）。这条记录已经正式保存，检索结果可以重试。',
  PERSISTENCE_RECOVERY_BLOCKED:
    '写入没有完成，已经写入的部分被保留；用同一次操作重试即可补齐剩余部分。',
  INTERNAL_FAILURE: '这一步没有完成。已经保存的内容保持不变，可以重试。',
};

/**
 * 🔴 THE GATE SET, and the reason it is written as a LIST.
 *
 * `GATE` ⇔ the refusal is a statement about the PRODUCT STATE or the USER'S REQUEST: the record does
 * not exist, the record does not qualify yet, or the command is malformed. Everything else in this
 * vocabulary is a statement about the ENVIRONMENT and is therefore `RUNTIME` - which is why the
 * default here is `RUNTIME` and a code has to be named explicitly to become a gate. Adding a new
 * environment failure can therefore never be mislabelled as a product gate by omission.
 */
const GATE_CODES: ReadonlySet<WorkflowErrorCode> = new Set<WorkflowErrorCode>([
  'ATTEMPT_NOT_FOUND',
  'INSIGHT_NOT_FOUND',
  'HYPOTHESIS_NOT_FOUND',
  'ATTEMPT_NOT_FORMAL',
  'GATE_NOT_SATISFIED',
  'WORKFLOW_COMMAND_INVALID',
]);

/**
 * 🔴 RUNTIME codes a retry cannot help with.
 *
 * They stay `RUNTIME` - they ARE statements about the environment - but offering a retry would be a
 * false promise, so `retryable` is `false` for them. Note the deliberate asymmetry: a GATE is never
 * retryable either, but for a different reason (repeating a product-rule refusal changes nothing).
 */
const NON_RETRYABLE_RUNTIME_CODES: ReadonlySet<WorkflowErrorCode> = new Set<WorkflowErrorCode>([
  'WORKSPACE_OPERATION_UNSUPPORTED',
]);

export function workflowErrorLayer(code: WorkflowErrorCode): 'GATE' | 'RUNTIME' {
  return GATE_CODES.has(code) ? 'GATE' : 'RUNTIME';
}

/** `true` only when the failure is environment-side AND a retry can plausibly help. */
export function workflowErrorRetryable(code: WorkflowErrorCode): boolean {
  return !GATE_CODES.has(code) && !NON_RETRYABLE_RUNTIME_CODES.has(code);
}

/**
 * Builds one notice.
 *
 * 🔴 `recovery` is accepted only for a `RUNTIME` notice - a gate is never given a "retry the machine"
 *    affordance, and a runtime failure is never given a "fix your record" one.
 */
export function workflowNotice(
  code: WorkflowErrorCode,
  recovery: WorkflowRecoveryAction | null = null,
): WorkflowNotice {
  const layer = workflowErrorLayer(code);
  return {
    layer,
    code,
    message: WORKFLOW_ERROR_MESSAGES[code],
    retryable: workflowErrorRetryable(code),
    recovery: layer === 'RUNTIME' ? recovery : null,
  };
}

/* ------------------------------------------------------------------ *
 * Structural recognition of the browser access error
 * ------------------------------------------------------------------ */

/** The stable `name` the browser class really sets. */
export const BROWSER_WORKSPACE_ACCESS_ERROR_NAME = 'BrowserWorkspaceAccessError';

/** The FROZEN `BrowserWorkspaceAccessErrorCode` set, mirrored - not re-declared as a product type. */
export const BROWSER_WORKSPACE_ACCESS_ERROR_CODES = [
  'PERMISSION_DENIED',
  'PERMISSION_REQUIRED',
  'WORKSPACE_UNAVAILABLE',
  'MOVE_UNSUPPORTED_BY_BROWSER',
] as const;

export type RecognisedBrowserAccessCode = (typeof BROWSER_WORKSPACE_ACCESS_ERROR_CODES)[number];

interface BrowserAccessShape {
  readonly name: string;
  readonly code: string;
}

/**
 * `true` when the thrown value is the browser File System Access failure.
 *
 * 🔴 Recognised by `name` + `code`, because the class cannot be imported across the scope boundary.
 *    Requiring BOTH keeps a coincidental `code` on an unrelated error from being misread.
 */
export function isBrowserWorkspaceAccessError(error: unknown): error is BrowserAccessShape {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as { readonly name?: unknown; readonly code?: unknown };
  return (
    candidate.name === BROWSER_WORKSPACE_ACCESS_ERROR_NAME &&
    typeof candidate.code === 'string' &&
    (BROWSER_WORKSPACE_ACCESS_ERROR_CODES as readonly string[]).includes(candidate.code)
  );
}

const BROWSER_CODE_TO_WORKFLOW: Readonly<Record<RecognisedBrowserAccessCode, WorkflowErrorCode>> = {
  PERMISSION_REQUIRED: 'WORKSPACE_PERMISSION_REQUIRED',
  PERMISSION_DENIED: 'WORKSPACE_PERMISSION_DENIED',
  WORKSPACE_UNAVAILABLE: 'WORKSPACE_UNAVAILABLE',
  MOVE_UNSUPPORTED_BY_BROWSER: 'WORKSPACE_OPERATION_UNSUPPORTED',
};

const BROWSER_CODE_RECOVERY: Readonly<Record<RecognisedBrowserAccessCode, WorkflowRecoveryAction>> = {
  PERMISSION_REQUIRED: { kind: 'grant_workspace_access' },
  PERMISSION_DENIED: { kind: 'grant_workspace_access' },
  WORKSPACE_UNAVAILABLE: { kind: 'select_workspace' },
  MOVE_UNSUPPORTED_BY_BROWSER: { kind: 'none' },
};

/** `M2`'s `WorkspaceStorageError` → a safe notice. */
function noticeForStorageError(error: WorkspaceStorageError): WorkflowNotice {
  const code: WorkflowErrorCode =
    error.code === 'NOT_FOUND' || error.code === 'NOT_A_FILE' || error.code === 'NOT_A_DIRECTORY'
      ? 'WORKSPACE_CONTENT_UNREADABLE'
      : 'WORKSPACE_FAILURE_UNCLASSIFIED';
  return workflowNotice(code, { kind: 'select_workspace' });
}

/**
 * Maps a THROWN value to a safe notice.
 *
 * 🔴 ALWAYS returns a notice: an unrecognised thrown value must not escape as an exception, because
 *    that is how a raw DOM exception would reach the UI. It becomes `INTERNAL_FAILURE` instead.
 */
export function noticeForThrownError(error: unknown): WorkflowNotice {
  if (isBrowserWorkspaceAccessError(error)) {
    const code = error.code as RecognisedBrowserAccessCode;
    return workflowNotice(BROWSER_CODE_TO_WORKFLOW[code], BROWSER_CODE_RECOVERY[code]);
  }
  if (error instanceof WorkspaceStorageError) {
    return noticeForStorageError(error);
  }
  if (error instanceof WorkspaceSchemaError) {
    return workflowNotice('WORKSPACE_CONTENT_UNREADABLE', { kind: 'select_workspace' });
  }
  return workflowNotice('INTERNAL_FAILURE', { kind: 'none' });
}

/** 🔴 Diagnostics ONLY. Never rendered, never persisted, never a field of a view model. */
export function diagnosticMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
