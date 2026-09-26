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
 * Framework-neutral: NO DOM, NO Node runtime API, NO storage, NO network of its own.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type {
  D9WorkflowSnapshot,
  WorkflowNotice,
  WorkflowStepResult,
} from '../../application/workflow/types.js';
import type { WorkflowAttemptSummary } from '../../application/workflow/attempt-summaries.js';
import type { CauseAnalysisProposal, CauseDecision } from '../../application/capture/types.js';
import type { CaptureContentKey } from '../../application/capture/types.js';
import type { FollowUpGapKey } from '../../domain/types/follow-up.js';
import type { HypothesisEditableSlot } from '../../domain/types/hypothesis.js';
import { followUpQuestionFor } from '../copy.js';
import type { TraceRowView } from '../presenters/hypotheses.js';
import { tracePanelOf } from '../presenters/hypotheses.js';
import { shortIdLabel } from '../presenters/fields.js';
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
  readonly pending: Readonly<Record<string, boolean>>;
  readonly notices: readonly WorkflowNotice[];
  readonly settings_open: boolean;
  readonly settings_draft: SettingsDraft;
  readonly settings_errors: readonly string[];
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
    pending: {},
    notices: [],
    settings_open: false,
    settings_draft: draft,
    settings_errors: [],
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
  traceHypothesis(hypothesis_id: string): Promise<void>;
  clearEvidence(): void;

  /* archive / notices */
  setArchived(attempt_id: string, archived: boolean): Promise<void>;
  dismissNotices(): void;
  flashMessage(message: string): void;
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
   * Records the outcome of one command.
   *
   * 🔴 A notice is shown for BOTH layers: a `GATE` notice tells the user what to add, a `RUNTIME`
   *    notice says the system did not finish. Neither is ever re-worded here (task §44).
   */
  function record<T>(result: WorkflowStepResult<T>): boolean {
    if (result.notice !== null) {
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
    const attempts = await active.listWorkflowAttempts();
    set({ attempts, attempts_loaded: true });
  }

  async function refreshSnapshot(): Promise<void> {
    const active = requirePort();
    const attempt_id = selectedId();
    if (active === null || attempt_id === null) {
      return;
    }
    const result = await active.readWorkflow(attempt_id as ObjectId<'ATT'>);
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
    const errors = validateSettingsDraft(draft);
    if (errors.length > 0) {
      set({ settings_errors: errors });
      return;
    }
    const config = providerConfigOf(draft);
    if (config === null) {
      set({ settings_errors: validateSettingsDraft(draft) });
      return;
    }
    const result = deps.createGateway({ config, api_key: draft.api_key });
    if (result.kind !== 'ready') {
      /*
       * 🔴 AN UNSUPPORTED / FAILED MODEL CONFIGURATION IS CONFINED TO THE COMMAND PATH. The workspace
       *    stays authorized, the rail keeps its records and existing records stay openable - the two
       *    capabilities are separate on purpose (S01-06B §11 / §13).
       */
      port = null;
      set({
        settings_errors: [],
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
    port = result.gateway.port;
    set({
      settings_errors: [],
      settings_open: false,
      ai_requires_model: false,
      provider: {
        status: 'ready',
        provider_id: String(config.provider_id),
        display_name: result.gateway.provider_display_name,
        model: result.gateway.model,
        connection_label: result.gateway.connection_label,
        message: null,
        key_present: draft.api_key.trim().length > 0,
      },
    });
  }

  /** Runs one user action: pending flag, one operation id, one port call, one re-read. */
  async function run(
    key: string,
    action: UiActionKey,
    body: (operation_id: string) => Promise<'ok' | 'retryable' | 'skip'>,
  ): Promise<void> {
    if (state.pending[key] === true) {
      return;
    }
    setPending(key, true);
    set({ flash: null });
    try {
      const operation_id = ledger.operationIdFor(key, action);
      const outcome = await body(operation_id);
      if (outcome === 'ok') {
        ledger.forget(key);
      }
      if (outcome !== 'skip') {
        await afterWrite();
      }
    } finally {
      setPending(key, false);
    }
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
       * 🔴 THE READER IS ESTABLISHED HERE, BEFORE ANY MODEL EXISTS. This is the whole point of
       *    S01-06-D1: after this call the rail can list records and the centre can open one, with no
       *    provider, no API Key and no successful capability resolution.
       */
      read_port = deps.attachStorage?.(label) ?? null;
      set({
        workspace: { status: 'connected', label, notice: null },
        attempts: [],
        attempts_loaded: false,
        ai_requires_model: false,
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
       */
      read_port = null;
      port = null;
      set({
        workspace: { status: 'needs_authorization', label: state.workspace.label, notice },
        attempts: [],
        attempts_loaded: false,
      });
    },

    openSettings() {
      /* 🔴 Opening the panel IS the user following the guidance, so the prompt is cleared. */
      set({ settings_open: true, settings_errors: [], ai_requires_model: false });
    },

    closeSettings() {
      set({ settings_open: false, settings_errors: [] });
    },

    updateSettingsDraft(patch) {
      set({ settings_draft: { ...state.settings_draft, ...patch }, settings_errors: [] });
    },

    chooseSettingsPreset(provider_id) {
      const preset = findPreset(provider_id);
      if (preset === null) {
        return;
      }
      set({ settings_draft: draftForPreset(preset, state.settings_draft), settings_errors: [] });
    },

    async saveSettings() {
      await composeGateway();
    },

    clearCredential() {
      /* 🔴 The session store is owned by the bootstrap; clearing it clears the whole session. */
      set({ settings_draft: { ...state.settings_draft, api_key: '' } });
    },

    /* ---------------------------------------------------------------- *
     * rail
     * ---------------------------------------------------------------- */

    async refreshAttempts() {
      await refreshAttempts();
    },

    async selectAttempt(attempt_id) {
      set({
        selected_attempt_id: attempt_id,
        new_attempt_open: false,
        attempt_missing: false,
        pending_question: null,
        followup_answers: {},
        confirmation_edits: {},
        result_status_decision: 'unresolved',
        result_status_text: null,
        cause_proposal: null,
        cause_decisions: {},
        insight_edits: {},
        retrieval_expanded: false,
        evidence: null,
        generation_refusal: null,
        ai_requires_model: false,
      });
      /* 🔴 Selecting a record ONLY reads it. No generation is triggered by opening a record. */
      await refreshSnapshot();
    },

    openNewAttempt() {
      set({
        new_attempt_open: true,
        selected_attempt_id: null,
        snapshot: null,
        raw_input: '',
        evidence: null,
        ai_requires_model: false,
      });
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
      await run('capture', 'capture', async (operation_id) => {
        const result = await active.beginCapture({ operation_id, raw_text: state.raw_input });
        const ok = record(result);
        const attempt = result.value?.attempt ?? null;
        if (attempt !== null) {
          set({
            selected_attempt_id: String(attempt.attempt_id),
            new_attempt_open: false,
            raw_input: '',
          });
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
        const operation_id = ledger.operationIdFor(`follow-up-question:${gap}`, 'follow-up-question');
        const result = await active.askFollowUpQuestion({
          operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
          question_text: questionTextFor(snapshot, gap),
          target_gap: gap,
        });
        const ok = record(result);
        const asked = result.value?.question ?? null;
        if (asked !== null) {
          ledger.forget(`follow-up-question:${gap}`);
          set({ pending_question: { gap, text: asked.question_text } });
        }
        if (ok) {
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
      await run(`follow-up-abandon:${gap}`, 'follow-up-abandon', async (operation_id) => {
        const result = await active.abandonFollowUpGap({
          operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
          gap: gap as Parameters<typeof active.abandonFollowUpGap>[0]['gap'],
        });
        const ok = record(result);
        if (ok) {
          set({ pending_question: null });
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

      await run('confirmation', 'confirmation', async (operation_id) => {
        const result = await active.applyStructuredConfirmation({
          operation_id,
          confirmation: {
            /* 🔴 Re-keyed by the workflow to the stable child id, so a retry replays (M15 §6). */
            operation_id,
            attempt_id,
            ...(corrections.length === 0 ? {} : { corrections }),
            ...(decision === 'unresolved' && text === null
              ? {}
              : { result_status: { decision, ...(text === null ? {} : { value: text }) } }),
            user_confirmed: true,
          },
        });
        const ok = record(result);
        if (ok) {
          set({ confirmation_edits: {}, followup_answers: {}, pending_question: null });
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
      setPending('cause-analysis', true);
      set({ flash: null });
      try {
        const result = await active.analyseCandidateCauses(attempt_id as ObjectId<'ATT'>);
        const ok = record(result);
        const outcome = result.value;
        if (outcome !== null && outcome.kind === 'analysed') {
          set({ cause_proposal: outcome.proposal, cause_decisions: {} });
        }
        if (ok) {
          await afterWrite();
        }
      } finally {
        setPending('cause-analysis', false);
      }
    },

    decideCause(content_item_id, decision) {
      set({ cause_decisions: { ...state.cause_decisions, [content_item_id]: decision } });
    },

    /* ---------------------------------------------------------------- *
     * ⑤
     * ---------------------------------------------------------------- */

    async saveFormal() {
      const active = requireCommandPort();
      const attempt_id = selectedId();
      if (active === null || attempt_id === null) {
        return;
      }
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

      await run('formal-save', 'formal-save', async (operation_id) => {
        const result = await active.saveFormalAttempt({
          operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
          user_explicitly_confirmed: true,
          ...(cause_decision === undefined ? {} : { candidate_causes: cause_decision }),
        });
        const ok = record(result);
        const saved = result.value;
        if (saved !== null && saved.promotion_happened) {
          /* 🔴 ⑤ ⇒ ⑥ is automatic and lives in the service. The UI only reports that it happened. */
          set({ flash: 'saved' });
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
      await run('retrieval-rerun', 'retrieval-rerun', async (operation_id) => {
        const result = await active.rerunRetrieval({
          operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
        });
        const ok = record(result);
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
      await run('insight-generation', 'insight-generation', async (operation_id) => {
        const result = await active.generateInsights({
          operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
        });
        const ok = record(result);
        set({ generation_refusal: ok ? null : refusalTextOf(result.value) });
        return ok ? 'ok' : 'retryable';
      });
    },

    async acceptInsight(insight_id) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`insight-action:${insight_id}`, 'insight-action', async (operation_id) => {
        const result = await active.acceptInsight({
          operation_id,
          insight_id: insight_id as ObjectId<'INS'>,
          user_explicitly_accepted: true,
        });
        return record(result) ? 'ok' : 'retryable';
      });
    },

    async rejectInsight(insight_id) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`insight-action:${insight_id}`, 'insight-action', async (operation_id) => {
        const result = await active.rejectInsight({
          operation_id,
          insight_id: insight_id as ObjectId<'INS'>,
        });
        return record(result) ? 'ok' : 'retryable';
      });
    },

    async revokeInsightAcceptance(insight_id) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`insight-action:${insight_id}`, 'insight-action', async (operation_id) => {
        const result = await active.revokeInsightAcceptance({
          operation_id,
          insight_id: insight_id as ObjectId<'INS'>,
        });
        return record(result) ? 'ok' : 'retryable';
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
      await run(`insight-action:${insight_id}`, 'insight-action', async (operation_id) => {
        const result = await active.editInsightContent({
          operation_id,
          insight_id: insight_id as ObjectId<'INS'>,
          proposition: value,
        });
        const ok = record(result);
        if (ok) {
          const next = { ...state.insight_edits };
          delete next[insight_id];
          set({ insight_edits: next });
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
      await run('hypothesis-generation', 'hypothesis-generation', async (operation_id) => {
        const result = await active.generateHypotheses({
          operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
        });
        const ok = record(result);
        set({ generation_refusal: ok ? null : refusalTextOf(result.value) });
        return ok ? 'ok' : 'retryable';
      });
    },

    async acceptHypothesis(hypothesis_id) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`hypothesis-action:${hypothesis_id}`, 'hypothesis-action', async (operation_id) => {
        const result = await active.acceptHypothesis({
          operation_id,
          hypothesis_id: hypothesis_id as ObjectId<'HYP'>,
          user_explicitly_accepted: true,
        });
        return record(result) ? 'ok' : 'retryable';
      });
    },

    async rejectHypothesis(hypothesis_id) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`hypothesis-action:${hypothesis_id}`, 'hypothesis-action', async (operation_id) => {
        const result = await active.rejectHypothesis({
          operation_id,
          hypothesis_id: hypothesis_id as ObjectId<'HYP'>,
        });
        return record(result) ? 'ok' : 'retryable';
      });
    },

    async saveModelSuggestion(hypothesis_id, saved) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`hypothesis-action:${hypothesis_id}`, 'hypothesis-action', async (operation_id) => {
        /* 🔴 The SAVE slot only. The decision slot is untouched by this call (`D-042`). */
        const result = await active.saveModelSuggestion({
          operation_id,
          hypothesis_id: hypothesis_id as ObjectId<'HYP'>,
          saved,
        });
        return record(result) ? 'ok' : 'retryable';
      });
    },

    async decideHypothesisCriterion(hypothesis_id, content_item_id, decision_state) {
      const active = requireCommandPort();
      if (active === null) {
        return;
      }
      await run(`hypothesis-action:${hypothesis_id}`, 'hypothesis-action', async (operation_id) => {
        const result = await active.decideHypothesisCriterion({
          operation_id,
          hypothesis_id: hypothesis_id as ObjectId<'HYP'>,
          content_item_id,
          decision_state,
        });
        return record(result) ? 'ok' : 'retryable';
      });
    },

    async addHypothesisCriterion(hypothesis_id, slot, value) {
      const active = requireCommandPort();
      if (active === null || value.trim().length === 0) {
        return;
      }
      await run(`hypothesis-action:${hypothesis_id}`, 'hypothesis-action', async (operation_id) => {
        /* 🔴 A user-supplied item is minted as the user's own `Fact` - never as an AI inference. */
        const content_item_id = `${hypothesis_id}:${slot}:user`;
        const result = await active.editHypothesisCriteria({
          operation_id,
          hypothesis_id: hypothesis_id as ObjectId<'HYP'>,
          user_items: [{ slot, content_item_id, value }],
        });
        return record(result) ? 'ok' : 'retryable';
      });
    },

    async traceHypothesis(hypothesis_id) {
      const active = requirePort();
      if (active === null) {
        return;
      }
      const result = await active.traceHypothesis(hypothesis_id as ObjectId<'HYP'>);
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
      await run(`archive:${attempt_id}`, 'archive', async (operation_id) => {
        const result = await active.setAttemptArchived({
          operation_id,
          attempt_id: attempt_id as ObjectId<'ATT'>,
          archive_state: archived ? 'archived' : 'active',
        });
        return record(result) ? 'ok' : 'retryable';
      });
    },

    dismissNotices() {
      set({ notices: [], generation_refusal: null, flash: null, ai_requires_model: false });
    },

    flashMessage(message) {
      set({ flash: message });
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
