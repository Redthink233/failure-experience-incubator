/**
 * S01-06 ｜ AppSession - the App Shell's state and its user intents.
 *
 * ── THE FOUR RULES THIS FILE EXISTS TO ENFORCE ──────────────────────────────────────
 * 🔴 IT RENDERS NOTHING AND DECIDES NO BUSINESS RULE. It collects a user intent, calls ONE port
 *    method, stores whatever came back and asks the gateways for a re-read. Every semantic decision
 *    (is this related? is E1 satisfied? may this be accepted? how many citations?) belongs to
 *    `M4`–`M9` / `M15`, and the UI layer is forbidden from re-deriving any of them (task §49).
 * 🔴 NOTHING IS PERSISTED HERE. The session state is not written anywhere - not to the workspace,
 *    not to `localStorage`, not to `sessionStorage`. A reload rebuilds the whole view from the
 *    workspace through the read model, which is exactly why no "current step" is needed (task §7).
 * 🔴 NO READ HAPPENS BEFORE AUTHORIZATION (task §9 / U2). While `workspace.status !== 'connected'`
 *    the port is `null`, and every reader returns immediately. There is no "optimistic" listing.
 * 🔴 NOTHING GENERATES BY ITSELF (task §30 / §34). Step ⑧ and step ⑨ have one entry point each, and
 *    both are only reachable from an explicit user click. No command is triggered by a snapshot
 *    arriving, by a step becoming available, or by another command finishing.
 *
 * ── THE ASYNC INTEGRITY RULES THIS FILE ALSO EXISTS TO ENFORCE (`FINAL-RAPID-B`) ──────
 * 🔴 A LATE ANSWER NEVER WINS (§1). Every read is stamped with the workspace it started in, the
 *    selection it was issued for and a monotonic request token; when it returns, all three must still
 *    hold or the result is DROPPED. `selectAttempt(A)` followed by `selectAttempt(B)` therefore ends on
 *    B even when A's read answers last.
 * 🔴 AN OPERATION BELONGS TO THE WORKSPACE IT STARTED IN (§2). A workspace switch replaces both ports
 *    and bumps the epoch; every post-`await` state write of an older operation is then a NO-OP, so an
 *    in-flight read of A can never draw A's record into B's screen.
 * 🔴 RECORD-SCOPED STATE RESETS AS ONE ACT (§3). One function clears everything that belongs to the
 *    record on screen - snapshot, causes, decisions, edits, evidence, expansion, notices, pending - on
 *    every path that changes which record the UI is about. It never touches the provider, the session
 *    credential or the workspace authorization: those are session scope.
 * 🔴 CAUSE DECISIONS ARE SERIALISED PER RECORD, AND NEVER DROPPED (§4 / §5). Writes for one record are
 *    queued and coalesced, so the LAST decision the user made is the decision the record ends up with,
 *    and a second click can never be swallowed by a pending first one.
 * 🔴 ⑤ WAITS FOR ④ (§6). A formal save drains that record's cause queue first and is then the LAST
 *    word on `candidate_causes`.
 * 🔴 EVERY RECORD OPERATION NAMES ITS RECORD (§7). Operation ids and ledger keys carry the
 *    `attempt_id`, so A's successful operation can never be replayed as B's.
 * 🔴 A RECOVERY RUNS AGAINST THE RECORD THE NOTICE NAMED (§8), never against whatever happens to be
 *    selected when the button is pressed.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO storage, NO network of its own.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type {
  D9WorkflowSnapshot,
  WorkflowNotice,
  WorkflowStepResult,
} from '../../application/workflow/types.js';
import { workflowNotice } from '../../application/workflow/errors.js';
import type { WorkflowAttemptSummary } from '../../application/workflow/attempt-summaries.js';
import type { CauseAnalysisProposal, CauseDecision } from '../../application/capture/types.js';
import type { CaptureContentKey } from '../../application/capture/types.js';
import type { FollowUpGapKey } from '../../domain/types/follow-up.js';
import type { HypothesisEditableSlot } from '../../domain/types/hypothesis.js';
import { followUpQuestionFor } from '../copy.js';
import type { TraceRowView } from '../presenters/hypotheses.js';
import { tracePanelOf } from '../presenters/hypotheses.js';
import { shortIdLabel } from '../presenters/fields.js';
import type { RecoveryKey } from '../presenters/notices.js';
import type { WorkspaceStatus } from '../presenters/rail.js';
import type { SettingsDraft } from '../settings/provider-presets.js';
import {
  EMPTY_SETTINGS_DRAFT,
  draftForPreset,
  findPreset,
  providerConfigOf,
  validateSettingsDraft,
} from '../settings/provider-presets.js';
import type { BrowserUiGatewayResult } from './browser-gateway.js';
import type { UiReadPort, UiWorkflowPort } from './ui-port.js';
import { createOperationLedger, createOperationIdFactory } from './operation-ids.js';
import type { UiActionKey } from './operation-ids.js';

/* ------------------------------------------------------------------ *
 * Gateway factory (injected by the DOM bootstrap / the tests)
 * ------------------------------------------------------------------ */

export interface GatewayRequest {
  readonly config: NonNullable<ReturnType<typeof providerConfigOf>>;
  /** The session-only secret. 🔴 It is handed to the credential store, NEVER to a `ProviderConfig`. */
  readonly api_key: string;
}

export type GatewayFactory = (request: GatewayRequest) => BrowserUiGatewayResult;

/**
 * The session-credential facts the App Shell needs that are **not secrets** (`CORRECTION-02`).
 *
 * 🔴 THERE IS DELIBERATELY NO `resolve` HERE, AND NO `put`. The App Shell must be able to (a) learn
 *    whether the session already holds a credential for a provider, so it stops asking for one it
 *    already has, and (b) REMOVE that credential, so the 「清除本次会话的 API Key」 button does what
 *    it says. Neither operation needs the secret, and neither may expose it: adding a read path here
 *    is how a plaintext key would end up back in the input box.
 * 🔴 THE VALUE ITSELF IS STILL WRITTEN BY THE BOOTSTRAP, at the single `put` site inside
 *    `createGateway`. This port only makes that same store OBSERVABLE and REMOVABLE by provider id.
 * 🔴 BOTH METHODS TAKE A PROVIDER ID AND DERIVE THE REF WITH `credentialRefForProvider`, so clearing
 *    can only ever name the one provider the caller asked about - there is no iteration, no "clear
 *    all", and no way to reach a second provider's credential from here.
 */
export interface SessionCredentialPort {
  /** `true` when this session holds a credential for exactly this provider. Never returns a value. */
  has(provider_id: string): boolean;
  /** Removes this provider's credential from the session store. Removes nothing else. */
  clear(provider_id: string): void;
}

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

export interface WorkspaceState {
  readonly status: WorkspaceStatus;
  /** The chosen directory's name, shown in the top bar. `null` before a choice is made. */
  readonly label: string | null;
  /** An authorization failure, already mapped to a safe product notice. */
  readonly notice: WorkflowNotice | null;
}

export interface ProviderState {
  readonly status: 'unconfigured' | 'ready' | 'unsupported';
  readonly provider_id: string | null;
  readonly display_name: string | null;
  readonly model: string | null;
  readonly connection_label: string | null;
  /** The frozen unsupported sentence, when no path could be resolved. */
  readonly message: string | null;
  readonly key_present: boolean;
}

export interface EvidenceState {
  readonly title: string;
  readonly source_attempt_id: string | null;
  readonly field_label: string | null;
  readonly role_label: string | null;
  readonly content: string | null;
  readonly archived: boolean;
  readonly unresolved_reason: string | null;
  readonly n_citation: number | null;
  readonly citation_label: string | null;
  readonly rows: readonly TraceRowView[];
}

export interface PendingQuestion {
  readonly gap: string;
  readonly text: string;
}

export interface AppSessionState {
  readonly workspace: WorkspaceState;
  readonly provider: ProviderState;
  readonly attempts: readonly WorkflowAttemptSummary[];
  readonly attempts_loaded: boolean;
  readonly selected_attempt_id: string | null;
  readonly snapshot: D9WorkflowSnapshot | null;
  readonly attempt_missing: boolean;
  readonly new_attempt_open: boolean;
  readonly raw_input: string;
  readonly pending_question: PendingQuestion | null;
  readonly followup_answers: Readonly<Record<string, string>>;
  readonly confirmation_edits: Readonly<Record<string, string>>;
  readonly result_status_decision: 'unresolved' | 'accepted' | 'rejected';
  readonly result_status_text: string | null;
  readonly cause_proposal: CauseAnalysisProposal | null;
  readonly cause_decisions: Readonly<Record<string, CauseDecision>>;
  readonly insight_edits: Readonly<Record<string, string>>;
  /**
   * The UN-SAVED ⑥⑦⑧ criterion text the user has typed, keyed `${hypothesis_id}:${slot}`.
   *
   * 🔴 WHY IT MUST LIVE HERE (`FINAL-RAPID-C` §10, integrated by `FINAL-RAPID-INTEGRATION-01`): the
   *    additive criterion field in `components/steps.ts` is rebuilt from scratch on EVERY render
   *    (`app-root.ts` replaces the whole tree), so an input whose value lives only in the DOM is
   *    erased by any unrelated state update - deciding another criterion, a notice arriving, a
   *    pending flag flipping. A controlled field needs a value that outlives the render, and this is
   *    that value.
   * 🔴 IT IS THE EXACT ANALOGUE OF `insight_edits` (`⑧`): transient form state, keyed by the object
   *    it belongs to, cleared wholesale when the record on screen changes. It is NOT persisted - a
   *    reload starts with an empty map, and nothing here is ever sent to the workspace.
   * 🔴 IT IS NOT A SECOND SOURCE OF TRUTH. The saved value stays in the hypothesis object; this map
   *    only carries what the user has typed and not yet saved, and the entry is DELETED the moment a
   *    save succeeds (`addHypothesisCriterion`).
   */
  readonly hypothesis_criterion_edits: Readonly<Record<string, string>>;
  readonly pending: Readonly<Record<string, boolean>>;
  readonly notices: readonly WorkflowNotice[];
  readonly settings_open: boolean;
  readonly settings_draft: SettingsDraft;
  /**
   * The INPUT-side reasons the draft cannot be saved - 「请填写 Model。」 and friends.
   *
   * 🔴 It is cleared the moment the user edits the draft, because it describes the draft as it was.
   */
  readonly settings_errors: readonly string[];
  /**
   * The reason a save COMPOSED NOTHING - the frozen unsupported sentence, or "no workspace yet".
   *
   * 🔴 WHY THIS IS A SECOND FIELD AND NOT PART OF `settings_errors`: "please fill this in" and "this
   *    configuration has no supported connection" are different outcomes with different remedies
   *    (task §7 A vs §7 C), and the panel renders them as two different blocks.
   * 🔴 WHY IT EXISTS AT ALL: the settings panel is a full-height overlay, so a statement rendered
   *    outside it is invisible while the user is looking at the form. Without this field the save
   *    appeared to do nothing at all (task §7 C "不允许错误只出现在被 overlay 遮住的页面外部
   *    notice").
   * 🔴 TRANSIENT UI STATE. It is never persisted, never sent to the workspace and never a product
   *    field - exactly like `retrieval_expanded` / `ai_requires_model`.
   */
  readonly settings_save_error: string | null;
  /**
   * `true` when the SESSION STORE already holds a credential for the draft's provider.
   *
   * 🔴 WHY IT IS STATE AND NOT A RENDER-TIME CALL: the panel's advice block is derived from `state`
   *    like everything else, so the fact has to live here. It is refreshed at the four moments it can
   *    change (open the panel, switch provider, save, clear) and nowhere else.
   * 🔴 IT IS A BOOLEAN ON PURPOSE. The credential itself is never part of the view state - a field
   *    that could hold a key is a field that could be rendered, and the input value must stay empty
   *    even when this flag is `true` (`CORRECTION-02` §4).
   * 🔴 TRANSIENT UI STATE, like `settings_save_error`: never persisted, never sent to the workspace.
   */
  readonly settings_key_in_session: boolean;
  readonly retrieval_expanded: boolean;
  readonly evidence: EvidenceState | null;
  readonly flash: string | null;
  /** Set when a step ⑧ / ⑨ generation was refused by the service - kept verbatim for the card. */
  readonly generation_refusal: string | null;
  /**
   * `true` when the user tried to run a `D9` COMMAND while no model composition exists.
   *
   * 🔴 THIS IS RUNTIME/UI STATE ONLY. It is not persisted, not sent to the workspace, and it is NOT
   *    a product field: it records "this click needed a model and there is none" for ONE render, so
   *    the App Shell can offer the settings panel instead of a system error (S01-06B §8).
   * 🔴 `false` means nothing about the workspace - browsing is available whenever it is connected,
   *    which is why this flag is never consulted by a read path.
   */
  readonly ai_requires_model: boolean;
}

function initialState(draft: SettingsDraft = EMPTY_SETTINGS_DRAFT): AppSessionState {
  return {
    workspace: { status: 'unselected', label: null, notice: null },
    provider: {
      status: 'unconfigured',
      provider_id: null,
      display_name: null,
      model: null,
      connection_label: null,
      message: null,
      key_present: false,
    },
    attempts: [],
    attempts_loaded: false,
    selected_attempt_id: null,
    snapshot: null,
    attempt_missing: false,
    new_attempt_open: false,
    raw_input: '',
    pending_question: null,
    followup_answers: {},
    confirmation_edits: {},
    result_status_decision: 'unresolved',
    result_status_text: null,
    cause_proposal: null,
    cause_decisions: {},
    insight_edits: {},
    hypothesis_criterion_edits: {},
    pending: {},
    notices: [],
    settings_open: false,
    settings_draft: draft,
    settings_errors: [],
    settings_save_error: null,
    settings_key_in_session: false,
    retrieval_expanded: false,
    evidence: null,
    flash: null,
    generation_refusal: null,
    ai_requires_model: false,
  };
}

/** The gap → content key mapping (the canonical `Attempt` field a follow-up answer lands in). */
export function captureFieldForGap(gap: string): string {
  return gap === 'key_parameter' ? 'key_parameters' : gap;
}

/**
 * The draft-buffer key of ONE ⑥⑦⑧ slot of ONE hypothesis (`FINAL-RAPID-C` §10).
 *
 * 🔴 IT IS EXPORTED SO THERE IS EXACTLY ONE DEFINITION. The component renders the field with
 *    `state.hypothesis_criterion_edits[hypothesisCriterionEditKey(id, slot)]` and calls
 *    `setHypothesisCriterionEdit(id, slot, …)`; the session writes and deletes the same key here. Two
 *    hand-written template strings would be two chances to disagree, and the disagreement would show
 *    up as a field that clears itself.
 * 🔴 IT CARRIES THE OBJECT AND THE SLOT, NOT A POSITION: a reordering of the cards can never move one
 *    hypothesis's un-saved text onto another.
 */
export function hypothesisCriterionEditKey(hypothesis_id: string, slot: string): string {
  return `${hypothesis_id}:${slot}`;
}

/**
 * A recovery a notice offers, WITH ITS TARGET (`FINAL-RAPID-B` §8).
 *
 * 🔴 THE TARGET IS PART OF THE REQUEST. A notice is rendered with the record it is about, and the
 *    click must act on THAT record - "A failed, the user moved to B, and pressing A's button operated
 *    B" is the defect this type exists to make unrepresentable.
 */
export interface NoticeRecoveryRequest {
  readonly key: RecoveryKey;
  readonly attempt_id: string | null;
}

/**
 * What a recovery request actually did.
 *
 * 🔴 `refused` IS A REAL OUTCOME, NOT A SILENT ONE. When the named record cannot be brought on screen
 *    (it is gone, or the workspace moved on) the command MUST NOT be run against a different record -
 *    so nothing runs and the caller is told so.
 */
export type RecoveryOutcome = 'ran' | 'workspace_picker' | 'refused';

export interface AppSession {
  getState(): AppSessionState;
  subscribe(listener: (state: AppSessionState) => void): () => void;

  /* workspace / provider */
  attachWorkspace(label: string): Promise<void>;
  reportWorkspaceFailure(notice: WorkflowNotice): void;
  openSettings(): void;
  closeSettings(): void;
  updateSettingsDraft(patch: Partial<SettingsDraft>): void;
  chooseSettingsPreset(provider_id: string): void;
  saveSettings(): Promise<void>;
  clearCredential(): void;

  /* rail */
  refreshAttempts(): Promise<void>;
  selectAttempt(attempt_id: string): Promise<void>;
  openNewAttempt(): void;
  closeNewAttempt(): void;

  /* ① */
  setRawInput(value: string): void;
  beginCapture(): Promise<void>;

  /* ② */
  askNextFollowUp(): Promise<void>;
  setFollowUpAnswer(gap: string, value: string): void;
  abandonFollowUp(gap: string): Promise<void>;

  /* ③ */
  setConfirmationEdit(field: string, value: string): void;
  setResultStatusDecision(decision: 'unresolved' | 'accepted' | 'rejected'): void;
  setResultStatusText(value: string): void;
  confirmStructured(): Promise<void>;

  /* ④ */
  analyseCauses(): Promise<void>;
  decideCause(content_item_id: string, decision: CauseDecision): void;

  /* ⑤ */
  saveFormal(): Promise<void>;

  /* ⑥⑦ */
  rerunRetrieval(): Promise<void>;
  toggleRetrievalExpanded(): void;
  selectComparisonPoint(input: {
    attempt_id: string;
    dimension_label: string;
    text: string;
    role: string;
  }): void;

  /* ⑧ */
  generateInsights(): Promise<void>;
  acceptInsight(insight_id: string): Promise<void>;
  rejectInsight(insight_id: string): Promise<void>;
  revokeInsightAcceptance(insight_id: string): Promise<void>;
  setInsightEdit(insight_id: string, value: string): void;
  saveInsightEdit(insight_id: string): Promise<void>;

  /* ⑨⑩ */
  generateHypotheses(): Promise<void>;
  acceptHypothesis(hypothesis_id: string): Promise<void>;
  rejectHypothesis(hypothesis_id: string): Promise<void>;
  saveModelSuggestion(hypothesis_id: string, saved: boolean): Promise<void>;
  decideHypothesisCriterion(
    hypothesis_id: string,
    content_item_id: string,
    decision_state: 'accepted' | 'rejected' | 'unresolved',
  ): Promise<void>;
  addHypothesisCriterion(
    hypothesis_id: string,
    slot: HypothesisEditableSlot,
    value: string,
  ): Promise<void>;
  /**
   * Records the ⑥⑦⑧ criterion text the user is TYPING, before it is saved (`FINAL-RAPID-C` §10).
   *
   * 🔴 IT EXISTS SO THE FIELD CAN BE CONTROLLED. The component renders the field's value from
   *    `hypothesis_criterion_edits`, so a re-render restores what the user typed instead of emptying
   *    the box. Without a setter there is nowhere for a keystroke to go and the field must read itself
   *    out of the DOM - which is the defect this member removes.
   * 🔴 `slot` is a plain `string` here rather than `HypothesisEditableSlot`: this is a KEY builder, and
   *    it must accept whatever slot key the item carries without inventing a narrowing rule. The
   *    narrowing stays where it belongs, at the SAVE (`addHypothesisCriterion`).
   */
  setHypothesisCriterionEdit(hypothesis_id: string, slot: string, value: string): void;
  traceHypothesis(hypothesis_id: string): Promise<void>;
  clearEvidence(): void;

  /* archive / notices */
  setArchived(attempt_id: string, archived: boolean): Promise<void>;
  dismissNotices(): void;
  flashMessage(message: string): void;
  /**
   * Runs the recovery a notice offers, AGAINST THE RECORD THE NOTICE NAMED (`FINAL-RAPID-B` §8).
   *
   * 🔴 IT IS ON THE SESSION AND NOT IN THE VIEW because only the session can (a) bring the target
   *    record on screen safely and (b) prove the command really ran against it. The view keeps its
   *    single responsibility: render the notice and hand the key + target back.
   */
  recoverNotice(recovery: NoticeRecoveryRequest): Promise<RecoveryOutcome>;
}

export interface AppSessionDeps {
  readonly createGateway: GatewayFactory;
  /**
   * Called once a directory has been authorized.
   *
   * 🔴 It RETURNS the provider-independent read port for that workspace (S01-06B). Returning it -
   *    rather than storing it somewhere and telling the session about it later - keeps the ONE
   *    moment at which the App Shell learns "a workspace now exists" explicit, which is what makes
   *    「授权前不读任何文件」 checkable.
   * 🔴 `null` means the caller could not build a reader (no storage, or an unusable one). Reads are
   *    then simply unavailable, exactly as before authorization.
   */
  readonly attachStorage?: (label: string) => UiReadPort | null;
  readonly initial_draft?: SettingsDraft;
  /**
   * The session credential store, seen through its two non-secret operations (`CORRECTION-02`).
   *
   * 🔴 OPTIONAL: a caller that does not supply it keeps the previous behaviour exactly - the clear
   *    button can only empty the form, and the panel always asks for a key. The DOM bootstrap DOES
   *    supply it, so the shipped product always has the real semantics.
   */
  readonly credentials?: SessionCredentialPort;
}

/**
 * One record's `candidate_causes` write, and the queue that owns it (`FINAL-RAPID-B` §4 / §5 / §6).
 *
 * 🔴 THE PORT IS CAPTURED WHEN THE WRITE IS SCHEDULED, NEVER RE-READ AFTER AN `await`: a write that
 *    started against one composition must not finish against another (task §2 of the brief).
 * 🔴 `decisions` IS ALWAYS THE LATEST INTENT, not a snapshot of when the click happened. A queued
 *    write therefore promotes the state the user has since reached, which is what makes
 *    `accepted → rejected` end as `rejected`.
 */
interface CauseWrite {
  readonly attempt_id: string;
  readonly port: UiWorkflowPort;
  proposal: CauseAnalysisProposal;
  decisions: Readonly<Record<string, CauseDecision>>;
  /** A newer decision arrived; the running drain must come round again. */
  dirty: boolean;
  /** The in-flight drain, so ⑤ can wait for the queue to empty (§6). */
  running: Promise<void> | null;
}

export function createAppSession(deps: AppSessionDeps): AppSession {
  let state = initialState(deps.initial_draft);
  /**
   * The provider-independent READ port (S01-06B).
   *
   * 🔴 It is established the moment a directory is authorized and it OUTLIVES a provider failure:
   *    an unusable model configuration must not take the workspace away.
   */
  let read_port: UiReadPort | null = null;
  /** The full `D9` command port: only ever set by a SUCCESSFUL provider composition. */
  let port: UiWorkflowPort | null = null;
  const listeners = new Set<(state: AppSessionState) => void>();
  const ledger = createOperationLedger(createOperationIdFactory());
  /**
   * WHICH WORKSPACE THE SCREEN IS ABOUT (`FINAL-RAPID-B` §1 / §2).
   *
   * 🔴 It is bumped by the two acts that replace the workspace - authorizing a directory and reporting
   *    that the directory was lost. An operation remembers the value it started under; any state write
   *    it attempts afterwards is dropped once the value has moved on.
   */
  let workspace_epoch = 0;
  /**
   * WHICH RECORD THE SCREEN IS ABOUT, and WHICH READ IS ALLOWED TO ANSWER.
   *
   * 🔴 `selection_epoch` changes on every act that re-points the centre (select a record, open ①, a
   *    capture that produced a new one); `read_token` counts the reads themselves. A read must match
   *    the workspace, the selection AND still be the newest request - otherwise it is stale.
   */
  let selection_epoch = 0;
  let read_token = 0;
  /** One queue per record: cause writes for the SAME record never run concurrently (§4). */
  const cause_writes = new Map<string, CauseWrite>();

  function get(): AppSessionState {
    return state;
  }

  function emit(): void {
    for (const listener of listeners) {
      listener(state);
    }
  }

  function set(patch: Partial<AppSessionState>): void {
    state = { ...state, ...patch };
    emit();
  }

  function setPending(key: string, active: boolean): void {
    const next = { ...state.pending };
    if (active) {
      next[key] = true;
    } else {
      delete next[key];
    }
    set({ pending: next });
  }

  function pushNotice(notice: WorkflowNotice): void {
    set({ notices: [...state.notices, notice], flash: null });
  }

  /**
   * Everything that belongs to the RECORD ON SCREEN, cleared as ONE act (`FINAL-RAPID-B` §3).
   *
   * 🔴 WHY ONE FUNCTION AND NOT FOUR CALL SITES: the workspace-switch bug was caused by four
   *    hand-written partial clears that drifted apart - one path forgot the cause decisions, another
   *    forgot the evidence. A single patch cannot drift from itself.
   * 🔴 IT IS A PURE PATCH BUILDER so a command body can apply it through its operation scope
   *    (`OperationScope.apply`), which is what keeps "a record created by an operation whose workspace
   *    was replaced" from re-pointing the screen (§2).
   * 🔴 WHAT IS CLEARED: the snapshot and its "missing" flag, the new-record panel, the ② follow-up
   *    question and its answers, the ③ edits and result status, the ④ proposal and decisions, the ⑧
   *    edits, the ⑨ criterion draft text, the evidence panel, the ⑦ expansion, the generation
   *    refusal, the transient flash, the notices raised BY record operations, every pending flag, and
   *    the "this needs a model" prompt.
   * 🔴 WHAT IS NOT CLEARED - AND MUST NOT BE: `provider` (the session's model configuration), the
   *    `settings_*` fields (the session credential and its draft) and `workspace` (the authorization).
   *    They are SESSION / WORKSPACE scope; clearing them here is how a record switch would silently
   *    log the user out and how a workspace switch would drop an already configured provider.
   */
  function recordScopedResetPatch(
    next_attempt_id: string | null,
    overrides: Partial<AppSessionState> = {},
  ): Partial<AppSessionState> {
    return {
      selected_attempt_id: next_attempt_id,
      snapshot: null,
      attempt_missing: false,
      new_attempt_open: false,
      pending_question: null,
      followup_answers: {},
      confirmation_edits: {},
      result_status_decision: 'unresolved',
      result_status_text: null,
      cause_proposal: null,
      cause_decisions: {},
      insight_edits: {},
      hypothesis_criterion_edits: {},
      evidence: null,
      retrieval_expanded: false,
      generation_refusal: null,
      flash: null,
      notices: [],
      pending: {},
      ai_requires_model: false,
      ...overrides,
    };
  }

  /** The reset above, applied now, and the one act that re-points the screen. */
  function resetRecordScopedState(
    next_attempt_id: string | null,
    overrides: Partial<AppSessionState> = {},
  ): void {
    /* 🔴 A new selection invalidates every read already in flight (§1). */
    selection_epoch += 1;
    set(recordScopedResetPatch(next_attempt_id, overrides));
  }

  /**
   * Whether the session store currently holds a credential for this provider (`CORRECTION-02`).
   *
   * 🔴 A PURE QUESTION WITH A BOOLEAN ANSWER. No secret crosses this boundary, which is what keeps
   *    the API Key input empty even when the answer is `true`.
   * 🔴 Called at the four moments the answer can change - open the panel, switch provider, save,
   *    clear - and never during rendering, so the panel's advice is derived from `state` alone.
   */
  function credentialInSession(provider_id: string): boolean {
    return deps.credentials?.has(provider_id) ?? false;
  }

  /**
   * Records the outcome of one command.
   *
   * 🔴 A notice is shown for BOTH layers: a `GATE` notice tells the user what to add, a `RUNTIME`
   *    notice says the system did not finish. Neither is ever re-worded here (task §44).
   * 🔴 IT IS WORKSPACE-AWARE (`FINAL-RAPID-B` §2). An outcome that belongs to a workspace the user has
   *    since left is not news about THIS screen, so its notice is not raised. The boolean is still
   *    returned unchanged: whether the operation is allowed to end is the caller's decision, not the
   *    notice's.
   */
  function recordIfCurrent<T>(epoch: number, result: WorkflowStepResult<T>): boolean {
    if (workspace_epoch === epoch && result.notice !== null) {
      pushNotice(result.notice);
    }
    return result.kind === 'delegated';
  }

  /**
   * 🔴 THE ONE READ GATE. It is closed until a workspace is authorized, which is what makes
   *    「授权前不读任何文件」 a property of the code rather than a convention.
   * 🔴 When a full command composition exists it WINS: its read model carries the step ⑥ runtime
   *    observation of the instance that really ran ⑥, so reading through it preserves the full `D9`
   *    behaviour exactly. With no model configured the provider-independent reader answers instead,
   *    and both derive from the same persisted objects.
   */
  function requirePort(): UiReadPort | null {
    if (port === null) {
      return read_port;
    }
    return port;
  }

  /**
   * 🔴 THE COMMAND GATE. It is the ONLY difference between the two operating modes.
   *
   * 🔴 It does NOT throw and it does NOT produce a `RUNTIME`/`GATE` notice: "no model is configured
   *    yet" is not a system failure, and rendering one would tell the user something false. It raises
   *    the dedicated `ai_requires_model` flag and lets the App Shell offer the settings panel
   *    (S01-06B §8 / §13).
   */
  function requireCommandPort(): UiWorkflowPort | null {
    if (port === null) {
      set({ ai_requires_model: true });
      return null;
    }
    return port;
  }

  function selectedId(): string | null {
    return state.selected_attempt_id;
  }

  async function refreshAttempts(): Promise<void> {
    const active = requirePort();
    if (active === null) {
      return;
    }
    /* 🔴 The rail is stamped with its workspace too: a list read from the previous directory must not
     *    arrive after the user has chosen a new one (`FINAL-RAPID-B` §2). */
    const epoch = workspace_epoch;
    const attempts = await active.listWorkflowAttempts();
    if (epoch !== workspace_epoch) {
      return;
    }
    set({ attempts, attempts_loaded: true });
  }

  /**
   * Re-reads the record on screen - IF IT IS STILL THE ONE THE USER IS LOOKING AT.
   *
   * 🔴 THE READ IS STAMPED BEFORE IT LEAVES AND RE-CHECKED WHEN IT RETURNS (`FINAL-RAPID-B` §1). Four
   *    facts must all still hold: the workspace, the selection, the selection's own id, and "this is
   *    the newest read issued". A read of A that answers after the user has opened B is therefore
   *    DISCARDED rather than allowed to overwrite B's snapshot - which is the race that made a slow
   *    A flicker back over a fast B.
   * 🔴 THE ORDER IS CHEAPEST-FIRST ON PURPOSE. The token check alone catches a superseded read; the
   *    selection and id checks additionally catch a read issued and superseded by the SAME id (e.g.
   *    re-selecting the record, or a write-triggered refresh racing a selection).
   */
  async function refreshSnapshot(): Promise<void> {
    const active = requirePort();
    const attempt_id = selectedId();
    if (active === null || attempt_id === null) {
      return;
    }
    const epoch = workspace_epoch;
    const selection = selection_epoch;
    read_token += 1;
    const token = read_token;
    const result = await active.readWorkflow(attempt_id as ObjectId<'ATT'>);
    if (epoch !== workspace_epoch || selection !== selection_epoch || token !== read_token) {
      return;
    }
    if (selectedId() !== attempt_id) {
      return;
    }
    if (result.kind === 'snapshot') {
      set({ snapshot: result.snapshot, attempt_missing: false });
      return;
    }
    if (result.kind === 'not_found') {
      /* 🔴 A stable empty state: the record is gone, the workspace was readable. */
      set({ snapshot: null, attempt_missing: true });
      return;
    }
    /* 🔴 `unavailable`: an environment failure with a retry - never shown as "the record vanished". */
    set({ snapshot: null, attempt_missing: false });
    pushNotice(result.notice);
  }

  async function afterWrite(): Promise<void> {
    await refreshSnapshot();
    await refreshAttempts();
  }

  async function composeGateway(): Promise<void> {
    const draft = state.settings_draft;
    /*
     * 🔴 THE CREDENTIAL GATE IS APPLIED HERE, AT THE SAVE (`PSA-D2 = B`, `CORRECTION-03` §2/§3/§10).
     *    `credential_available = typed_api_key_present OR session_credential_present`; when neither
     *    holds, `validateSettingsDraft` returns a reason and this function returns BEFORE building a
     *    config or calling the gateway - so no provider is composed, the panel stays open, the state
     *    stays `unconfigured` and the top bar keeps saying 「模型服务未配置」.
     * 🔴 THE SESSION FACT IS ASKED OF THE STORE, not read from `settings_key_in_session`: the flag
     *    exists so the PANEL can render, while the gate must decide on the store's current answer.
     *    Both are refreshed from the same store, so they cannot disagree in practice.
     */
    const credential_fact = { session_credential_present: credentialInSession(draft.provider_id) };
    const errors = validateSettingsDraft(draft, credential_fact);
    if (errors.length > 0) {
      set({ settings_errors: errors });
      return;
    }
    const config = providerConfigOf(draft, credential_fact);
    if (config === null) {
      set({ settings_errors: validateSettingsDraft(draft, credential_fact) });
      return;
    }
    const result = deps.createGateway({ config, api_key: draft.api_key });
    /*
     * 🔴 THE SESSION FACT IS RE-READ *AFTER* THE GATEWAY WAS BUILT, because the factory's `put` (the
     *    ONE place a key enters the store) happens inside that call. Asking before would report the
     *    state of the previous save. The `api_key` clause keeps the answer correct for a caller that
     *    supplies no credential port at all.
     */
    const key_in_session =
      draft.api_key.trim().length > 0 || credentialInSession(String(config.provider_id));
    if (result.kind !== 'ready') {
      /*
       * 🔴 AN UNSUPPORTED / FAILED MODEL CONFIGURATION IS CONFINED TO THE COMMAND PATH. The workspace
       *    stays authorized, the rail keeps its records and existing records stay openable - the two
       *    capabilities are separate on purpose (S01-06B §11 / §13).
       * 🔴 THE PANEL STAYS OPEN AND SAYS SO WHERE THE USER IS LOOKING (task §7 C). The reason travels
       *    in `settings_save_error`, which the panel renders as its own inline block; the top-bar
       *    badge states the same thing for AFTER the panel is closed.
       */
      port = null;
      set({
        settings_errors: [],
        settings_save_error: result.message,
        settings_key_in_session: key_in_session,
        provider: {
          status: 'unsupported',
          provider_id: String(config.provider_id),
          display_name: config.display_name,
          model: config.model,
          connection_label: null,
          message: result.message,
          key_present: draft.api_key.trim().length > 0,
        },
      });
      return;
    }
    /*
     * 🔴 THE PLAINTEXT LEAVES THE FORM ONLY WHEN IT REALLY LEFT THE FORM (`FINAL-RAPID-B` §10). The
     *    condition is the SESSION STORE's own answer, re-asked after the composition: a key the store
     *    now holds is no longer needed in `settings_draft.api_key`, and leaving it there means the
     *    secret keeps being carried by a field that is re-rendered on every keystroke elsewhere.
     * 🔴 AND WHEN NOTHING HOLDS IT, THE FIELD IS KEPT. With no credential store wired, clearing would
     *    erase the only copy of the key and the very next save would be refused by the credential gate
     *    (`PSA-D2 = B`) - a silent downgrade of a configuration the user just made work. The store's
     *    answer is therefore the ONLY licence to clear.
     * 🔴 IT IS READ FROM THE STORE, NOT FROM `key_in_session`: that flag also counts a merely TYPED key,
     *    which is precisely the case that has nothing safe to clear into.
     */
    const key_stored = credentialInSession(String(config.provider_id));
    port = result.gateway.port;
    set({
      settings_errors: [],
      settings_save_error: null,
      settings_key_in_session: key_in_session,
      settings_open: false,
      ai_requires_model: false,
      /* 🔴 An emptied field here is what makes 「重新打开设置时输入框为空」 true by construction. */
      settings_draft: key_stored ? { ...draft, api_key: '' } : draft,
      provider: {
        status: 'ready',
        provider_id: String(config.provider_id),
        display_name: result.gateway.provider_display_name,
        model: result.gateway.model,
        connection_label: result.gateway.connection_label,
        message: null,
        /*
         * 🔴 THE BADGE KEEPS ITS ESTABLISHED MEANING: "the configuration that was just composed carried
         *    a key". It is read off `draft` - the draft AS SUBMITTED, which is why the emptying of
         *    `settings_draft.api_key` below does not change the answer (§10). The field and the badge
         *    are two different statements, and the existing suites pin both: a save with a typed key
         *    reports `key_present: true`, a save whose form was empty (the session supplied the key)
         *    reports `false`.
         */
        key_present: draft.api_key.trim().length > 0,
      },
    });
  }

  /**
   * The scope handed to ONE operation body (`FINAL-RAPID-B` §2).
   *
   * 🔴 AN OPERATION BINDS ITS WORKSPACE AT THE START AND PROVES IT AT THE END. Every state write a
   *    body performs after an `await` goes through `apply`, which is a no-op once the workspace has
   *    been replaced - so an operation that started in A can never draw A's record, A's decisions or
   *    A's notices onto B's screen.
   * 🔴 `record` is the same rule for notices, and `retire` is the escape hatch for the one case the
   *    outcome boolean cannot express: ⑤ completed while the automatic ⑥ did not (§7).
   */
  interface OperationScope {
    readonly operation_id: string;
    /** `true` while the workspace this operation started in is still the live one. */
    isCurrent(): boolean;
    /** Applies `patch` ONLY while the workspace is still the one this operation started in. */
    apply(patch: Partial<AppSessionState>): void;
    /** Records the outcome; its notice is raised only while still current. */
    record<T>(result: WorkflowStepResult<T>): boolean;
    /**
     * Retires this operation's id, so a later click starts a GENUINELY NEW operation instead of
     * replaying this one (§7).
     */
    retire(): void;
  }

  /**
   * Runs one user action: pending flag, one operation id, one port call, one re-read.
   *
   * @param key the UI pending key - what `components/steps.ts` reads to disable a control. It stays
   *        the plain action name on purpose; only the LEDGER key is record-scoped (see below).
   * @param record_id the record this operation belongs to, or `null`. It becomes part of the
   *        operation id AND of the ledger key (`formal-save:<attempt_id>`), so record B can never
   *        inherit record A's successful operation (`FINAL-RAPID-B` §7).
   */
  async function run(
    key: string,
    action: UiActionKey,
    record_id: string | null,
    body: (scope: OperationScope) => Promise<'ok' | 'retryable' | 'skip'>,
  ): Promise<void> {
    if (state.pending[key] === true) {
      return;
    }
    /* 🔴 THE WORKSPACE IS READ ONCE, BEFORE ANYTHING CAN CHANGE IT (§2). */
    const epoch = workspace_epoch;
    const ledger_key = record_id === null ? key : `${key}:${record_id}`;
    setPending(key, true);
    set({ flash: null });
    try {
      const operation_id = ledger.operationIdFor(ledger_key, action, record_id);
      const scope: OperationScope = {
        operation_id,
        isCurrent: () => workspace_epoch === epoch,
        apply: (patch) => {
          if (workspace_epoch === epoch) {
            set(patch);
          }
        },
        record: (result) => recordIfCurrent(epoch, result),
        retire: () => {
          ledger.forget(ledger_key);
        },
      };
      const outcome = await body(scope);
      if (outcome === 'ok') {
        ledger.forget(ledger_key);
      }
      /*
       * 🔴 NO RE-READ FOR A SUPERSEDED WORKSPACE: the ports it would call belong to a directory the
       *    user has left, and the state it would write belongs to that same directory (§2).
       */
      if (outcome !== 'skip' && workspace_epoch === epoch) {
        await afterWrite();
      }
    } finally {
      setPending(key, false);
    }
  }

  /* ---------------------------------------------------------------- *
   * The per-record cause-persistence queue (§4 / §5 / §6)
   * ---------------------------------------------------------------- */

  /**
   * Queues one record's decisions for writing - SERIALISED, COALESCED AND NEVER SWALLOWED.
   *
   * 🔴 WHY A QUEUE AND NOT A TASK PER CLICK: every write carries the WHOLE `candidate_causes` set, so
   *    two writes for the same record running at once can only be resolved by "whoever returns last
   *    wins" - and a slow older write then overwrites a newer decision (§4). One drain at a time makes
   *    the ORDER of writes the order of the clicks.
   * 🔴 WHY COALESCING AND NOT SKIPPING: the previous code dropped a decision that arrived while one was
   *    pending, so `accepted → rejected` persisted `accepted` (§5). Marking the queue dirty instead
   *    means the running drain comes round again and writes the LATEST intent.
   */
  function scheduleCauseWrite(input: {
    readonly attempt_id: string;
    readonly port: UiWorkflowPort;
    readonly proposal: CauseAnalysisProposal;
    readonly decisions: Readonly<Record<string, CauseDecision>>;
  }): void {
    const existing = cause_writes.get(input.attempt_id);
    if (existing === undefined) {
      const write: CauseWrite = { ...input, dirty: true, running: null };
      cause_writes.set(input.attempt_id, write);
      write.running = drainCauseWrites(write);
      return;
    }
    existing.proposal = input.proposal;
    existing.decisions = input.decisions;
    existing.dirty = true;
    if (existing.running === null) {
      existing.running = drainCauseWrites(existing);
    }
  }

  /**
   * Writes one record's decisions until nothing newer is waiting.
   *
   * 🔴 ONE WRITE AT A TIME, ONE RECORD AT A TIME. A different record has its own queue, so two records
   *    never contend - but they never share a write either.
   * 🔴 A SUCCESSFUL WRITE RETIRES ITS ID, so a changed decision is a NEW operation rather than a replay
   *    the service would refuse to apply. A FAILED write keeps its id, so the next decision retries the
   *    same operation - which is what `M4`'s idempotence needs.
   * 🔴 THE DRAIN STOPS ON A SUPERSEDED WORKSPACE (§2) and on a retryable failure, and in both cases it
   *    stops WITHOUT clearing what the user most recently said: `decisions` is still the latest intent,
   *    so ⑤ persists it even when this queue could not.
   */
  async function drainCauseWrites(write: CauseWrite): Promise<void> {
    const ledger_key = `cause-decision:${write.attempt_id}`;
    try {
      while (write.dirty) {
        write.dirty = false;
        const epoch = workspace_epoch;
        const { attempt_id, port: active, proposal, decisions } = write;
        const result = await active.persistCandidateCauses({
          operation_id: ledger.operationIdFor(ledger_key, 'cause-persistence', attempt_id),
          decision: active.decideCandidateCauses({
            attempt_id,
            candidates: proposal.candidates,
            decisions,
          }),
        });
        const ok = recordIfCurrent(epoch, result);
        if (ok) {
          ledger.forget(ledger_key);
        }
        if (epoch !== workspace_epoch) {
          break;
        }
        if (!ok) {
          break;
        }
        await afterWrite();
      }
    } finally {
      write.running = null;
    }
  }

  /**
   * Waits until one record's cause writes have COMPLETELY drained (§6).
   *
   * 🔴 IT IS ⑤'s PRE-CONDITION. Reading `state.cause_decisions` without waiting would persist the
   *    right decisions while an older queued write was still on its way to overwrite them - so ⑤ waits
   *    for the queue, and the save it then performs is the LAST word on the record's causes.
   * 🔴 IT RE-READS THE ENTRY AFTER EVERY AWAIT: a decision that arrives while we are waiting rejoins
   *    the SAME drain (its promise is the one we are awaiting), so this loop cannot exit early.
   */
  async function drainCauseWritesFor(attempt_id: string): Promise<void> {
    let write = cause_writes.get(attempt_id);
    while (write !== undefined && write.running !== null) {
      await write.running;
      write = cause_writes.get(attempt_id);
    }
  }

  /* ---------------------------------------------------------------- *
   * Selection
   * ---------------------------------------------------------------- */

  /**
   * Re-points the centre onto one record: clear everything scoped to the previous one, then read.
   *
   * 🔴 IT IS THE ONLY WAY THE SELECTION MOVES, so "a record change clears the record-scoped state"
   *    holds on every path (§3) - including the recovery route, which has to bring a notice's target
   *    on screen before it may run that notice's command (§8).
   */
  async function selectAttemptAndRead(attempt_id: string): Promise<void> {
    resetRecordScopedState(attempt_id);
    /* 🔴 Selecting a record ONLY reads it. No generation is triggered by opening a record. */
    await refreshSnapshot();
  }

  /* ---------------------------------------------------------------- *
   * workspace / provider
   * ---------------------------------------------------------------- */

  const session: AppSession = {
    getState: get,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async attachWorkspace(label) {
      /*
       * 🔴 THE WORKSPACE CHANGES BEFORE ANYTHING ELSE DOES (`FINAL-RAPID-B` §2). Bumping the epoch is
       *    what stops an operation that is still in flight from the previous directory: from this line
       *    on, its `apply` / `record` are no-ops, so a slow read of A cannot land after B was chosen.
       *    Both ports are dropped for the same reason - a composition built over the old storage must
       *    never serve the new one, and an `await` of an old operation must never write through it.
       * 🔴 THE LEDGER AND THE CAUSE QUEUES ARE WORKSPACE SCOPE, not session scope: a successful
       *    operation id from the previous directory must not be replayed into this one (§7), and a
       *    queued write must not be aimed at a storage that is no longer open (§2).
       * 🔴 THE READER IS ESTABLISHED HERE, BEFORE ANY MODEL EXISTS. This is the whole point of
       *    S01-06-D1: after this call the rail can list records and the centre can open one, with no
       *    provider, no API Key and no successful capability resolution.
       */
      workspace_epoch += 1;
      read_port = deps.attachStorage?.(label) ?? null;
      port = null;
      ledger.clear();
      cause_writes.clear();
      /*
       * 🔴 THE CENTRE BELONGS TO THE OLD WORKSPACE: no snapshot, no causes, no decisions, no edits and
       *    no notices survive the switch (§3). Without this, a switch could show B's rail next to A's
       *    record - and the buttons on that record would then write A's state into B.
       */
      resetRecordScopedState(null);
      set({
        workspace: { status: 'connected', label, notice: null },
        attempts: [],
        attempts_loaded: false,
      });
      /*
       * 🔴 The COMMAND composition is built over a concrete storage, so it is (re)built NOW - a model
       *    configured before the workspace existed must not stay unused, and a NEWLY chosen directory
       *    must not keep a composition that pointed at the old one.
       */
      if (state.settings_draft.model.trim().length > 0) {
        await composeGateway();
      } else {
        port = null;
      }
      /* 🔴 A read needs no provider: the rail is listed as soon as the reader exists. */
      if (requirePort() !== null) {
        await refreshAttempts();
      }
    },

    reportWorkspaceFailure(notice) {
      /*
       * 🔴 A WORKSPACE FAILURE IS A DIFFERENT STATEMENT FROM A PROVIDER FAILURE (S01-06B §13). Losing
       *    the directory really does remove every read - which is exactly why the two must be shown
       *    separately and never collapsed into one message.
       * 🔴 IT IS ALSO A WORKSPACE CHANGE (`FINAL-RAPID-B` §2): the epoch moves, the ports and the
       *    ledger are dropped, and the record on screen is released. A record that can no longer be
       *    read must not be left looking open next to a workspace that needs re-authorizing.
       */
      workspace_epoch += 1;
      read_port = null;
      port = null;
      ledger.clear();
      cause_writes.clear();
      resetRecordScopedState(null);
      set({
        workspace: { status: 'needs_authorization', label: state.workspace.label, notice },
        attempts: [],
        attempts_loaded: false,
      });
    },

    openSettings() {
      /* 🔴 Opening the panel IS the user following the guidance, so the prompt is cleared.
       *    The credential question is re-asked here because the session store can have changed since
       *    the panel was last built (a save, a clear, or a whole page reload). */
      set({
        settings_open: true,
        settings_errors: [],
        settings_save_error: null,
        settings_key_in_session: credentialInSession(state.settings_draft.provider_id),
        ai_requires_model: false,
      });
    },

    closeSettings() {
      /*
       * 🔴 CLOSING EXITS THE PANEL AND NOTHING ELSE (task §6). The DRAFT is kept as it stands - there
       *    is no persistent settings draft to write and none is introduced - a configured provider is
       *    left exactly as it was, and no credential is touched. It follows that closing cannot clear
       *    an API key and cannot start a request.
       */
      set({ settings_open: false, settings_errors: [], settings_save_error: null });
    },

    updateSettingsDraft(patch) {
      /* 🔴 A draft edit invalidates BOTH statements: they described the previous draft.
       *    Switching the provider also changes WHICH credential is being talked about, so the
       *    session fact is re-read from the merged draft rather than from the patch. */
      const draft = { ...state.settings_draft, ...patch };
      set({
        settings_draft: draft,
        settings_errors: [],
        settings_save_error: null,
        settings_key_in_session: credentialInSession(draft.provider_id),
      });
    },

    chooseSettingsPreset(provider_id) {
      const preset = findPreset(provider_id);
      if (preset === null) {
        return;
      }
      const draft = draftForPreset(preset, state.settings_draft);
      set({
        settings_draft: draft,
        settings_errors: [],
        settings_save_error: null,
        settings_key_in_session: credentialInSession(draft.provider_id),
      });
    },

    async saveSettings() {
      /*
       * 🔴 THE ONE USER-VISIBLE SAVE PATH, WITH EXACTLY THREE OUTCOMES (task §7 / §8):
       *    A. the draft is invalid          ⇒ `settings_errors` is set, the panel stays OPEN;
       *    B. the gateway composes          ⇒ the provider becomes `ready`, the panel CLOSES;
       *    C. the composition is unsupported ⇒ `settings_save_error` is set, the panel stays OPEN.
       *    There is no fourth outcome and no silent one: every click lands in A, B or C.
       * 🔴 A MISSING CREDENTIAL IS AN OUTCOME-A CASE (`PSA-D2 = B`, `CORRECTION-03`). It is a blocking
       *    input reason, not a runtime failure: the user is told to fill the field, IN the panel, and
       *    nothing is composed. That is what stops a configuration with no usable key from ever being
       *    presented as `ready`.
       * 🔴 IT STILL MAKES NO PROVIDER CALL. Composing an adapter is not calling a model; the fake
       *    gateway in the tests records zero invocations across a save.
       */
      await composeGateway();
    },

    clearCredential() {
      /*
       * 🔴 THE ACT THAT MAKES THE BUTTON'S SENTENCE TRUE (`CORRECTION-02` §1). Everything about it is
       *    deliberately narrow:
       *    · ONE PROVIDER - the one the form is showing, resolved through `credentialRefForProvider`
       *      inside the port. There is no iteration and no "clear everything", so a second provider's
       *      credential cannot be caught by accident.
       *    · the WORKSPACE IS UNTOUCHED - this is a credential act, not a storage act.
       *    · the DRAFT KEEPS ITS PROVIDER AND MODEL, so the user only has to supply a new key.
       *    · the COMMAND PORT IS DROPPED, because a composition whose provider can no longer
       *      authenticate must not keep reporting `ready` (§2). The provider falls back to the
       *      CANONICAL `unconfigured` state - 「模型服务未配置」 - and the next model action asks for
       *      settings again through the existing `ai_requires_model` path. No new state is invented.
       *    · the READER IS UNTOUCHED, so browsing existing records keeps working.
       */
      const provider_id = state.settings_draft.provider_id;
      deps.credentials?.clear(provider_id);
      port = null;
      set({
        settings_draft: { ...state.settings_draft, api_key: '' },
        settings_errors: [],
        settings_save_error: null,
        settings_key_in_session: credentialInSession(provider_id),
        provider: {
          status: 'unconfigured',
          provider_id: null,
          display_name: null,
          model: null,
          connection_label: null,
          message: null,
          key_present: false,
        },
      });
    },

    /* ---------------------------------------------------------------- *
     * rail
     * ---------------------------------------------------------------- */

    async refreshAttempts() {
      await refreshAttempts();
    },

    async selectAttempt(attempt_id) {
      /*
       * 🔴 THE WHOLE RECORD-SCOPED RESET, ON THE SHARED PATH (§3). Selecting another record used to
       *    clear a hand-written subset of the state, so a stale cause proposal, evidence panel or
       *    insight edit could stay on screen attached to the wrong record.
       */
      await selectAttemptAndRead(attempt_id);
    },

    openNewAttempt() {
      /*
       * 🔴 OPENING ① IS A RECORD CHANGE TOO. The record the user was editing leaves the screen, so its
       *    snapshot, causes, decisions and edits leave with it (§3) - otherwise ① would appear over the
       *    previous record's answers. `raw_input` is emptied because that IS the panel's field: it
       *    belongs to the form rather than to a record, which is why it is not part of the shared reset.
       */
      resetRecordScopedState(null, { new_attempt_open: true, raw_input: '' });
    },

    closeNewAttempt() {
      set({ new_attempt_open: false });
    },

    /* ---------------------------------------------------------------- *
     * ①
     * ---------------------------------------------------------------- */

    setRawInput(value) {
      set({ raw_input: value });
    },

    async beginCapture() {
      const active = requireCommandPort();
      if (active === null || state.raw_input.trim().length === 0) {
        return;
      }
      /*
       * 🔴 THE SUBMITTED TEXT IS READ ONCE, BEFORE THE `await`. `raw_input` may legitimately change
       *    while the capture is in flight (the user typing on), and the command must carry what the
       *    user actually submitted rather than whatever the box holds when the request is built.
       */
      const raw_text = state.raw_input;
      await run('capture', 'capture', null, async (scope) => {
        const result = await active.beginCapture({ operation_id: scope.operation_id, raw_text });
        const ok = scope.record(result);
        const attempt = result.value?.attempt ?? null;
        if (attempt !== null) {
          /*
           * 🔴 A NEW RECORD IS A NEW RECORD (§3): every record-scoped field of the previous one is
           *    cleared as the new id takes over, so ② of the new attempt can never open on top of ③
           *    of the old one. `scope.apply` keeps the reset inside this operation's workspace, so a
           *    capture that finished after the user switched directories does not re-point the new
           *    screen at the old workspace's record (§2).
           * 🔴 `raw_input` is emptied HERE and not by the shared reset: it is the panel's own field.
           */
          scope.apply(recordScopedResetPatch(String(attempt.attempt_id), { raw_input: '' }));
          return 'ok';
        }
        return ok ? 'ok' : 'retryable';
      });
    },

    /* ---------------------------------------------------------------- *
     * ②
     * ---------------------------------------------------------------- */

    async askNextFollowUp() {
      const active = requireCommandPort();
      const attempt_id = selectedId();
      if (active === null || attempt_id === null) {
        return;
      }
      const snapshot = state.snapshot;
      if (snapshot === null) {
        return;
      }
      const gap = snapshot.capture.follow_up.next_gap;
      if (gap === null || snapshot.capture.follow_up.exhausted) {
        return;
      }
      setPending('followup-ask', true);
      try {
        /*
         * 🔴 THE QUESTION BELONGS TO THE RECORD IT WAS ASKED FOR (§7): both the ledger key and the id
         *    name the attempt, so asking the same gap on another record is a different operation.
         */
        const epoch = workspace_epoch;
        const ledger_key = `follow-up-question:${attempt_id}:${gap}`;
        const question_id = ledger.operationIdFor(ledger_key, 'follow-up-question', attempt_id);
        const result = await active.askFollowUpQuestion({
          operation_id: question_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
          question_text: questionTextFor(snapshot, gap),
          target_gap: gap,
        });
        const ok = recordIfCurrent(epoch, result);
        const asked = result.value?.question ?? null;
        if (asked !== null) {
          ledger.forget(ledger_key);
          /* 🔴 A question for a workspace the user has left is never shown as the current one (§2). */
          if (workspace_epoch === epoch) {
            set({ pending_question: { gap, text: asked.question_text } });
          }
        }
        if (ok && workspace_epoch === epoch) {
          await refreshSnapshot();
        }
      } finally {
        setPending('followup-ask', false);
      }
    },

    setFollowUpAnswer(gap, value) {
      set({ followup_answers: { ...state.followup_answers, [gap]: value } });
    },

    async abandonFollowUp(gap) {
      const active = requireCommandPort();
      const attempt_id = selectedId();
      if (active === null || attempt_id === null) {
        return;
      }
      await run(`follow-up-abandon:${gap}`, 'follow-up-abandon', attempt_id, async (scope) => {
        const result = await active.abandonFollowUpGap({
          operation_id: scope.operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
          gap: gap as Parameters<typeof active.abandonFollowUpGap>[0]['gap'],
        });
        const ok = scope.record(result);
        if (ok) {
          scope.apply({ pending_question: null });
        }
        return ok ? 'ok' : 'retryable';
      });
    },

    /* ---------------------------------------------------------------- *
     * ③
     * ---------------------------------------------------------------- */

    setConfirmationEdit(field, value) {
      set({ confirmation_edits: { ...state.confirmation_edits, [field]: value } });
    },

    setResultStatusDecision(decision) {
      set({ result_status_decision: decision });
    },

    setResultStatusText(value) {
      set({ result_status_text: value });
    },

    async confirmStructured() {
      const active = requireCommandPort();
      const attempt_id = selectedId();
      if (active === null || attempt_id === null) {
        return;
      }
      const edits = state.confirmation_edits;
      const followups = state.followup_answers;
      /* 🔴 A blank correction is never sent: "leave it unknown" is expressed by NOT correcting it. */
      const corrections: {
        readonly field: CaptureContentKey;
        readonly value: string;
        readonly answer_to_gap?: FollowUpGapKey;
      }[] = [
        ...Object.entries(edits)
          .filter(([, value]) => value.trim().length > 0)
          .map(([field, value]) => ({ field: field as CaptureContentKey, value })),
        ...Object.entries(followups)
          .filter(([, value]) => value.trim().length > 0)
          .map(([gap, value]) => ({
            field: captureFieldForGap(gap) as CaptureContentKey,
            value,
            answer_to_gap: gap as FollowUpGapKey,
          })),
      ];
      const decision = state.result_status_decision;
      const text = state.result_status_text ?? proposedStatusText(state.snapshot);

      await run('confirmation', 'confirmation', attempt_id, async (scope) => {
        const result = await active.applyStructuredConfirmation({
          operation_id: scope.operation_id,
          confirmation: {
            /* 🔴 Re-keyed by the workflow to the stable child id, so a retry replays (M15 §6). */
            operation_id: scope.operation_id,
            attempt_id,
            ...(corrections.length === 0 ? {} : { corrections }),
            ...(decision === 'unresolved' && text === null
              ? {}
              : { result_status: { decision, ...(text === null ? {} : { value: text }) } }),
            user_confirmed: true,
          },
        });
        const ok = scope.record(result);
        if (ok) {
          scope.apply({ confirmation_edits: {}, followup_answers: {}, pending_question: null });
        }
        return ok ? 'ok' : 'retryable';
      });
    },

    /* ---------------------------------------------------------------- *
     * ④
     * ---------------------------------------------------------------- */

    async analyseCauses() {
      const active = requireCommandPort();
      const attempt_id = selectedId();
      if (active === null || attempt_id === null) {
        return;
      }
      /*
       * 🔴 THE ANALYSIS IS A RECORD OPERATION (§7) and goes through the shared runner for that reason:
       *    its id names the attempt, its state writes are workspace-guarded (§2) and its failure never
       *    re-reads a directory the user has left.
       * 🔴 A FAILURE DOES NOT RE-READ (`skip`): ④ produced nothing, so the record on screen is already
       *    the truth. Only a delegated outcome refreshes the snapshot.
       */
      await run('cause-analysis', 'cause-analysis', attempt_id, async (scope) => {
        const result = await active.analyseCandidateCauses(attempt_id as ObjectId<'ATT'>);
        const ok = scope.record(result);
        const outcome = result.value;
        if (outcome !== null && outcome.kind === 'analysed') {
          /* 🔴 A NEW PROPOSAL REPLACES THE OLD DECISIONS, and both belong to THIS record (§3 / §4). */
          scope.apply({ cause_proposal: outcome.proposal, cause_decisions: {} });
        }
        return ok ? 'ok' : 'skip';
      });
    },

    /**
     * 🔴 CORRECTION-01 (D2): the decision is PERSISTED, not only mirrored in UI state.
     *
     *    `persistCandidateCauses` is the record's ONLY door for a candidate cause
     *    (`workflow-service.ts` step ④: "a candidate cause becomes part of the record only through
     *    the explicit `persistCandidateCauses`"), and it used to be called from nowhere. So the
     *    record's `candidate_causes` stayed `[]`, `causes_recorded`
     *    (`presenters/steps.ts`) could never become true, ④ stayed `current` forever and ⑤ stayed
     *    `locked` - a dead end with no reachable way out.
     *
     * 🔴 THE PERSISTED SET CARRIES EVERY CANDIDATE with its current decision state, so a cause the
     *    user has not touched is stored as `unresolved`: visible and durable, never read as
     *    confirmed (`AC-94`). Deciding one cause therefore materialises the whole set.
     */
    decideCause(content_item_id, decision) {
      const active = requireCommandPort();
      const attempt_id = selectedId();
      const proposal = state.cause_proposal;
      const decisions = { ...state.cause_decisions, [content_item_id]: decision };
      /*
       * 🔴 THE SCREEN UPDATES IMMEDIATELY AND THE WRITE IS QUEUED, NOT SKIPPED (§4 / §5). Showing the
       *    answer at once is what makes the control responsive; queueing it is what stops a second
       *    click from being swallowed while the first write is in flight. `accepted → rejected` on the
       *    same cause therefore ends `rejected` on screen AND in the record.
       */
      set({ cause_decisions: decisions });
      if (active === null || attempt_id === null || proposal === null) {
        /*
         * 🔴 `requireCommandPort` has already raised the dedicated `ai_requires_model` flag (its
         *    documented, non-notice signal), and a null selection means no record is on screen -
         *    in both cases there is no record to write to, and nothing was silently discarded.
         */
        return;
      }
      /*
       * 🔴 ONE QUEUE PER RECORD, DRAINED ONE WRITE AT A TIME. Every write carries the WHOLE candidate
       *    set, so two concurrent writes for the same record could only be ordered by "whoever returns
       *    last" - which is exactly how an older write used to overwrite a newer decision. Serialising
       *    makes the order of the writes the order of the clicks, and coalescing means the LATEST
       *    intent is always what the last write carries.
       * 🔴 THE PORT IS HANDED OVER HERE, not re-read after an `await`: a write that starts against one
       *    composition must not finish against another (§2).
       */
      scheduleCauseWrite({ attempt_id, port: active, proposal, decisions });
    },

    /* ---------------------------------------------------------------- *
     * ⑤
     * ---------------------------------------------------------------- */

    async saveFormal() {
      const active = requireCommandPort();
      const attempt_id = selectedId();
      if (active === null) {
        /*
         * 🔴 `requireCommandPort` has already raised the dedicated `ai_requires_model` flag: "no
         *    model is configured yet" is not a system failure and is deliberately not a notice
         *    (`S01-06B` §8 / §13). The App Shell answers it by offering the settings panel.
         */
        return;
      }
      if (attempt_id === null) {
        /*
         * 🔴 CORRECTION-01 (D1): A USER-VISIBLE ACTION MUST NEVER END IN A SILENT `return`.
         *
         *    The previous single guard (`active === null || attempt_id === null`) collapsed both
         *    cases into `return`, so tapping 「确认并保存这次尝试」 with no record on screen changed
         *    nothing at all - no notice, no pending state, no write. To the user that is
         *    indistinguishable from a broken button, which is exactly how the PSA-A rehearsal
         *    reported it.
         */
        pushNotice(workflowNotice('ATTEMPT_NOT_FOUND'));
        return;
      }
      /*
       * 🔴 ⑤ WAITS FOR ④ (`FINAL-RAPID-B` §6). Every cause decision the user has made must be IN the
       *    record before it is promoted, so this save first lets that record's queue drain and then
       *    reads the decisions it sees - which also makes THIS save the last word on `candidate_causes`:
       *    with the queue empty, no older cause write is left to put the old values back afterwards.
       */
      await drainCauseWritesFor(attempt_id);
      const proposal = state.cause_proposal;
      /* 🔴 The user's cause answers are decided by `M5`'s own pure rule, then persisted WITH the save. */
      const cause_decision =
        proposal === null
          ? undefined
          : active.decideCandidateCauses({
              attempt_id,
              candidates: proposal.candidates,
              decisions: Object.fromEntries(
                proposal.candidates.map((candidate) => [
                  candidate.content_item_id,
                  state.cause_decisions[candidate.content_item_id] ?? 'unresolved',
                ]),
              ),
            });

      await run('formal-save', 'formal-save', attempt_id, async (scope) => {
        const result = await active.saveFormalAttempt({
          operation_id: scope.operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
          user_explicitly_confirmed: true,
          ...(cause_decision === undefined ? {} : { candidate_causes: cause_decision }),
        });
        const ok = scope.record(result);
        const saved = result.value;
        /*
         * 🔴 THE ⑤ OPERATION ENDS THE MOMENT THE RECORD IS `Formal` - WHATEVER ⑥ DID (§7). A failed
         *    AUTOMATIC ⑥ arrives as `RETRIEVAL_RUNTIME_INCOMPLETE` (`workflow-service.ts`), i.e. as a
         *    RUNTIME notice whose `kind` is not `delegated`: read as "the save failed" it would leave
         *    this operation pending a retry it does not need. Retrying ⑥ is the notice's own
         *    `rerun_retrieval` command, which runs as `retrieval-rerun:<attempt_id>` and can never
         *    replay this save. Retiring the id here is what makes that a property of the code.
         */
        const record_is_formal =
          saved !== null && saved.save.attempt !== null && saved.save.attempt.state === 'Formal';
        if (record_is_formal) {
          scope.retire();
        }
        if (saved !== null && saved.promotion_happened) {
          /* 🔴 ⑤ ⇒ ⑥ is automatic and lives in the service. The UI only reports that it happened. */
          scope.apply({ flash: 'saved' });
        }
        return ok ? 'ok' : 'retryable';
      });
    },

    /* ---------------------------------------------------------------- *
     * ⑥⑦
     * ---------------------------------------------------------------- */

    async rerunRetrieval() {
      const active = requireCommandPort();
      const attempt_id = selectedId();
      if (active === null || attempt_id === null) {
        return;
      }
      await run('retrieval-rerun', 'retrieval-rerun', attempt_id, async (scope) => {
        const result = await active.rerunRetrieval({
          operation_id: scope.operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
        });
        const ok = scope.record(result);
        /* 🔴 A rerun never cascades: no insight and no hypothesis is regenerated from here (§26). */
        return ok ? 'ok' : 'retryable';
      });
    },

    toggleRetrievalExpanded() {
      set({ retrieval_expanded: !state.retrieval_expanded });
    },

    selectComparisonPoint(input) {
      set({
        evidence: {
          title: `${shortIdLabel(input.attempt_id)}｜${input.dimension_label}`,
          source_attempt_id: input.attempt_id,
          field_label: input.dimension_label,
          role_label: input.role,
          content: input.text,
          archived: false,
          unresolved_reason: null,
          n_citation: null,
          citation_label: null,
          rows: [],
        },
      });
    },

    /* ---------------------------------------------------------------- *
     * ⑧
     * ---------------------------------------------------------------- */

    async generateInsights() {
      const active = requireCommandPort();
      const attempt_id = selectedId();
      if (active === null || attempt_id === null) {
        return;
      }
      await run('insight-generation', 'insight-generation', attempt_id, async (scope) => {
        const result = await active.generateInsights({
          operation_id: scope.operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
        });
        const ok = scope.record(result);
        scope.apply({ generation_refusal: ok ? null : refusalTextOf(result.value) });
        return ok ? 'ok' : 'retryable';
      });
    },

    async acceptInsight(insight_id) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`insight-action:${insight_id}`, 'insight-action', insight_id, async (scope) => {
        const result = await active.acceptInsight({
          operation_id: scope.operation_id,
          insight_id: insight_id as ObjectId<'INS'>,
          user_explicitly_accepted: true,
        });
        return scope.record(result) ? 'ok' : 'retryable';
      });
    },

    async rejectInsight(insight_id) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`insight-action:${insight_id}`, 'insight-action', insight_id, async (scope) => {
        const result = await active.rejectInsight({
          operation_id: scope.operation_id,
          insight_id: insight_id as ObjectId<'INS'>,
        });
        return scope.record(result) ? 'ok' : 'retryable';
      });
    },

    async revokeInsightAcceptance(insight_id) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`insight-action:${insight_id}`, 'insight-action', insight_id, async (scope) => {
        const result = await active.revokeInsightAcceptance({
          operation_id: scope.operation_id,
          insight_id: insight_id as ObjectId<'INS'>,
        });
        return scope.record(result) ? 'ok' : 'retryable';
      });
    },

    setInsightEdit(insight_id, value) {
      set({ insight_edits: { ...state.insight_edits, [insight_id]: value } });
    },

    async saveInsightEdit(insight_id) {
      const active = requireCommandPort();
      const value = state.insight_edits[insight_id];
      if (active === null || value === undefined) {
        return;
      }
      await run(`insight-action:${insight_id}`, 'insight-action', insight_id, async (scope) => {
        const result = await active.editInsightContent({
          operation_id: scope.operation_id,
          insight_id: insight_id as ObjectId<'INS'>,
          proposition: value,
        });
        const ok = scope.record(result);
        if (ok) {
          const next = { ...state.insight_edits };
          delete next[insight_id];
          scope.apply({ insight_edits: next });
        }
        return ok ? 'ok' : 'retryable';
      });
    },

    /* ---------------------------------------------------------------- *
     * ⑨⑩
     * ---------------------------------------------------------------- */

    async generateHypotheses() {
      const active = requireCommandPort();
      const attempt_id = selectedId();
      if (active === null || attempt_id === null) {
        return;
      }
      await run('hypothesis-generation', 'hypothesis-generation', attempt_id, async (scope) => {
        const result = await active.generateHypotheses({
          operation_id: scope.operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
        });
        const ok = scope.record(result);
        scope.apply({ generation_refusal: ok ? null : refusalTextOf(result.value) });
        return ok ? 'ok' : 'retryable';
      });
    },

    async acceptHypothesis(hypothesis_id) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`hypothesis-action:${hypothesis_id}`, 'hypothesis-action', hypothesis_id, async (scope) => {
        const result = await active.acceptHypothesis({
          operation_id: scope.operation_id,
          hypothesis_id: hypothesis_id as ObjectId<'HYP'>,
          user_explicitly_accepted: true,
        });
        return scope.record(result) ? 'ok' : 'retryable';
      });
    },

    async rejectHypothesis(hypothesis_id) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`hypothesis-action:${hypothesis_id}`, 'hypothesis-action', hypothesis_id, async (scope) => {
        const result = await active.rejectHypothesis({
          operation_id: scope.operation_id,
          hypothesis_id: hypothesis_id as ObjectId<'HYP'>,
        });
        return scope.record(result) ? 'ok' : 'retryable';
      });
    },

    async saveModelSuggestion(hypothesis_id, saved) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`hypothesis-action:${hypothesis_id}`, 'hypothesis-action', hypothesis_id, async (scope) => {
        /* 🔴 The SAVE slot only. The decision slot is untouched by this call (`D-042`). */
        const result = await active.saveModelSuggestion({
          operation_id: scope.operation_id,
          hypothesis_id: hypothesis_id as ObjectId<'HYP'>,
          saved,
        });
        return scope.record(result) ? 'ok' : 'retryable';
      });
    },

    async decideHypothesisCriterion(hypothesis_id, content_item_id, decision_state) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`hypothesis-action:${hypothesis_id}`, 'hypothesis-action', hypothesis_id, async (scope) => {
        const result = await active.decideHypothesisCriterion({
          operation_id: scope.operation_id,
          hypothesis_id: hypothesis_id as ObjectId<'HYP'>,
          content_item_id,
          decision_state,
        });
        return scope.record(result) ? 'ok' : 'retryable';
      });
    },

    setHypothesisCriterionEdit(hypothesis_id, slot, value) {
      /*
       * 🔴 ONE KEY, ONE FIELD, AND NO OTHER STATE IS TOUCHED. This is the field's own buffer, so a
       *    keystroke must not clear an error, re-raise a notice or re-read anything - it is the exact
       *    analogue of `setInsightEdit` for ⑧.
       * 🔴 THE KEY IS BUILT BY THE SHARED FUNCTION, so the component that RENDERS the field and this
       *    setter can never disagree about which buffer entry belongs to which slot.
       */
      set({
        hypothesis_criterion_edits: {
          ...state.hypothesis_criterion_edits,
          [hypothesisCriterionEditKey(hypothesis_id, slot)]: value,
        },
      });
    },

    async addHypothesisCriterion(hypothesis_id, slot, value) {
      const active = requireCommandPort();
      if (active === null || value.trim().length === 0) {
        return;
      }
      await run(`hypothesis-action:${hypothesis_id}`, 'hypothesis-action', hypothesis_id, async (scope) => {
        /* 🔴 A user-supplied item is minted as the user's own `Fact` - never as an AI inference. */
        const content_item_id = `${hypothesis_id}:${slot}:user`;
        const result = await active.editHypothesisCriteria({
          operation_id: scope.operation_id,
          hypothesis_id: hypothesis_id as ObjectId<'HYP'>,
          user_items: [{ slot, content_item_id, value }],
        });
        const ok = scope.record(result);
        if (ok) {
          /*
           * 🔴 THE DRAFT LEAVES THE BUFFER ONLY WHEN THE WRITE REALLY HAPPENED (`FINAL-RAPID-C` §10).
           *    The entry is dropped exactly as `saveInsightEdit` drops its ⑧ edit, so the buffer never
           *    holds a value that is already stored - and a FAILED save keeps the user's text for a
           *    retry instead of silently discarding it. The `scope.apply` keeps the drop inside this
           *    operation's workspace, so a save that finished after a workspace switch cannot clear a
           *    buffer belonging to the new screen (§2).
           */
          const next = { ...state.hypothesis_criterion_edits };
          delete next[hypothesisCriterionEditKey(hypothesis_id, slot)];
          scope.apply({ hypothesis_criterion_edits: next });
        }
        return ok ? 'ok' : 'retryable';
      });
    },

    async traceHypothesis(hypothesis_id) {
      const active = requirePort();
      if (active === null) {
        return;
      }
      /*
       * 🔴 ⑩ IS A READ AND IS STAMPED LIKE ONE (§1 / §2). The evidence rail belongs to the workspace
       *    and the record on screen, so a trace that answers after the user moved on must not open a
       *    panel over the new record - nor raise a notice about the old one.
       */
      const epoch = workspace_epoch;
      const selection = selection_epoch;
      const result = await active.traceHypothesis(hypothesis_id as ObjectId<'HYP'>);
      if (epoch !== workspace_epoch || selection !== selection_epoch) {
        return;
      }
      if (result.value !== null && result.value !== undefined) {
        const panel = tracePanelOf(result.value);
        set({
          evidence: {
            title: panel.owner_id,
            source_attempt_id: null,
            field_label: null,
            role_label: null,
            content: null,
            archived: false,
            unresolved_reason: null,
            n_citation: panel.n_citation,
            citation_label: panel.citation_label,
            rows: panel.rows,
          },
        });
      }
      if (result.notice !== null) {
        pushNotice(result.notice);
      }
    },

    clearEvidence() {
      set({ evidence: null });
    },

    /* ---------------------------------------------------------------- *
     * archive / notices
     * ---------------------------------------------------------------- */

    async setArchived(attempt_id, archived) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`archive:${attempt_id}`, 'archive', attempt_id, async (scope) => {
        const result = await active.setAttemptArchived({
          operation_id: scope.operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
          archive_state: archived ? 'archived' : 'active',
        });
        return scope.record(result) ? 'ok' : 'retryable';
      });
    },

    dismissNotices() {
      set({ notices: [], generation_refusal: null, flash: null, ai_requires_model: false });
    },

    flashMessage(message) {
      set({ flash: message });
    },

    /* ---------------------------------------------------------------- *
     * notices - the recovery route (§8 / §9)
     * ---------------------------------------------------------------- */

    async recoverNotice(request) {
      /*
       * 🔴 THE TARGET COMES FROM THE NOTICE, NEVER FROM THE SCREEN (`FINAL-RAPID-B` §8). This is the
       *    fix for the reported defect: pressing A's 「重新检索」 while B was open used to re-run B's
       *    retrieval and leave A exactly as broken as it was.
       * 🔴 SAFE-SELECT, THEN RUN. A `D9` command like `rerunRetrieval` carries no attempt id, so the
       *    only way to run it against a specific record is to have that record selected - therefore the
       *    selection is made AND VERIFIED first, and a record that cannot be opened is refused rather
       *    than silently substituted.
       * 🔴 A REFUSAL IS RETURNED, NOT SWALLOWED: running the command against the wrong record is worse
       *    than running nothing at all, because it reports a repair that never happened.
       */
      if (request.key === 'dismiss' || request.key === 'none') {
        /* 🔴 「关闭」 means close, and nothing else (§9). */
        session.dismissNotices();
        return 'ran';
      }
      if (request.key === 'select_workspace' || request.key === 'grant_workspace_access') {
        /*
         * 🔴 THE PICKER BELONGS TO THE DOM LAYER: a directory may only be chosen from a real user
         *    gesture, so the session reports that the picker is the remedy instead of opening anything
         *    itself (S01-06 §9 / U3).
         */
        return 'workspace_picker';
      }
      const target = request.attempt_id;
      if (target === null) {
        /* 🔴 A record command with no record named cannot be honoured - and must NOT fall back to
         *    whichever record happens to be selected. */
        return 'refused';
      }
      if (selectedId() !== target) {
        await selectAttemptAndRead(target);
        /* 🔴 THE VERIFICATION: the selection really moved, the record really exists, and it really
         *    read. Anything less and the command must not run. */
        if (selectedId() !== target || state.attempt_missing || state.snapshot === null) {
          return 'refused';
        }
      }
      if (request.key === 'rerun_retrieval') {
        await session.rerunRetrieval();
        return 'ran';
      }
      if (request.key === 'regenerate_insights') {
        await session.generateInsights();
        return 'ran';
      }
      if (request.key === 'regenerate_hypotheses') {
        await session.generateHypotheses();
        return 'ran';
      }
      return 'refused';
    },
  };

  return session;
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

/** The canonical question text for a gap: the wording already used, else the copy deck's sentence. */
function questionTextFor(snapshot: D9WorkflowSnapshot, gap: string): string {
  const asked = snapshot.capture.follow_up.budget.asked.find((entry) => entry.target_gap === gap);
  return asked === undefined ? followUpQuestionFor(gap) : asked.question_text;
}

function proposedStatusText(snapshot: D9WorkflowSnapshot | null): string | null {
  if (snapshot === null) {
    return null;
  }
  const slot = snapshot.attempt.result_status;
  if (slot.presence_state === 'present') {
    return slot.item.value;
  }
  const proposal = snapshot.capture.content_items.find((item) => item.field_key === 'result_status');
  return proposal?.value ?? null;
}

/** The refusal detail of a generation that produced nothing, kept verbatim for the card. */
function refusalTextOf(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const candidate = value as { readonly kind?: unknown; readonly detail?: unknown; readonly absence_statement?: unknown };
  if (typeof candidate.absence_statement === 'string') {
    return candidate.absence_statement;
  }
  if (candidate.kind === 'refused' && typeof candidate.detail === 'string') {
    return candidate.detail;
  }
  return null;
}
