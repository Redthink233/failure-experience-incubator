/**
 * PRE-PSA-BLOCKER-01 ｜ The App Shell chrome: Top Bar, workspace entry, the Settings Center and the
 * notice strip.
 *
 * 🔴 WHAT THE TOP BAR MAY SHOW (task §8): the product name, the workspace status and the model
 *    connection status, plus the settings entry point. It shows NO token count, NO prompt text, NO
 *    latency, NO internal request id and NO runtime stack - there is no field for one, and the
 *    notices it renders are the service's own fixed sentences.
 * 🔴 THERE IS EXACTLY ONE SETTINGS ENTRY, AND IT IS CALLED 「设置」 (`PRE-PSA-BLOCKER-01` §4). The
 *    panel it opens is a Settings Center whose first section is 「模型服务」; a top-bar button naming
 *    one section of it would misdescribe the page and read as a second entry.
 * 🔴 MODEL SETTINGS NEVER ASK FOR A PATH (task §11 / §13). The connection label is DISPLAYED, never
 *    chosen; the custom base URL field appears only for a preset that OFFERS one.
 * 🔴 THE API KEY IS A PASSWORD FIELD, THE FORM SAYS 「仅当前浏览器会话使用；刷新后仍可用」
 *    (`D-056` / `CORRECTION-01` - the note quotes the session boundary, NOT a refresh), and there is
 *    NO "remember me", NO "save to workspace" and NO auto-restore control anywhere (task §12).
 * 🔴 EVERY CONTROL CARRIES AN EXPLICIT LOGICAL ID from `SETTINGS_CONTROL_IDS`. A control id is NEVER
 *    derived from a label. ⚠️ **The label-derived scheme was NOT the cause of the reported symptom**
 *    (`PRE-PSA-BLOCKER-01` §23.2 / `CORRECTION-02` §7): the ids that actually shipped were built from
 *    ASCII labels and did not collide. The OBSERVED root cause of the lost caret was a render path that
 *    returned before restoring focus; the explicit id is PREVENTIVE HARDENING - it removes the
 *    duplicate-id class and makes focus restoration identity-based instead of positional. See
 *    `src/ui/settings/control-identity.ts` for both mechanisms, stated with that distinction.
 *
 * DOM scope only.
 */

import { badge, button, el, note, row } from '../dom.js';
import {
  HERO_LOCAL_NOTE,
  HERO_PRIMARY_CTA,
  HERO_STEPS,
  HERO_SUBTITLE,
  HERO_TITLE,
  HERO_TRANSMISSION_NOTE,
  MODEL_REQUIRED_ACTION,
  MODEL_REQUIRED_NOTICE,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
  SETTINGS_API_KEY,
  SETTINGS_API_KEY_NOTE,
  SETTINGS_BASE_URL_FORBIDDEN,
  SETTINGS_CANCEL,
  SETTINGS_CLEAR_KEY,
  SETTINGS_CLOSE,
  SETTINGS_CONNECTION_ROW,
  SETTINGS_CUSTOM_BASE_URL,
  SETTINGS_CUSTOM_BASE_URL_NOTE,
  SETTINGS_ERRORS_HEADING,
  SETTINGS_EXPLAIN,
  SETTINGS_MODEL,
  SETTINGS_OPEN,
  SETTINGS_PROVIDER,
  SETTINGS_SAVE,
  SETTINGS_SECTION_MODEL,
  SETTINGS_STATUS_UNCONFIGURED,
  SETTINGS_TITLE,
  SETTINGS_UNSUPPORTED,
  SETTINGS_UNSUPPORTED_HEADING,
  SETTINGS_UNSUPPORTED_HINT,
  WORKSPACE_ENTRY_EXPLAIN,
  WORKSPACE_ENTRY_TITLE,
  WORKSPACE_PICK_BUTTON,
  WORKSPACE_PICKER_UNSUPPORTED,
  WORKSPACE_REGANT_BUTTON,
} from '../copy.js';
import { workspaceStatusLabel } from '../presenters/rail.js';
import { SETTINGS_CONTROL_IDS } from '../settings/control-identity.js';
import {
  PROVIDER_PRESETS,
  connectionLabelOf,
  findPreset,
  settingsWarnings,
  validateSettingsDraft,
} from '../settings/provider-presets.js';
import type { AppSession, AppSessionState } from '../session/app-session.js';
import type { NoticeView } from '../presenters/notices.js';

export interface ViewContext {
  readonly state: AppSessionState;
  readonly session: AppSession;
  /** `false` when the runtime has no directory picker at all. */
  readonly picker_supported: boolean;
  /**
   * Opens the native directory picker - 🔴 the ONE place a workspace may be obtained.
   *
   * It is a callback rather than a call inside a component because the picker must run inside a real
   * user gesture; the bootstrap owns that boundary and the component only reports the click.
   */
  readonly pickWorkspace: () => void;
}

/* ------------------------------------------------------------------ *
 * Top bar
 * ------------------------------------------------------------------ */

export function topBar(context: ViewContext): HTMLElement {
  const { state, session } = context;
  const workspace = workspaceStatusLabel(state.workspace.status, state.workspace.label);
  const provider =
    state.provider.status === 'ready'
      ? `${state.provider.display_name ?? ''}${state.provider.model === null ? '' : `｜${state.provider.model}`}｜${state.provider.connection_label ?? ''}`
      : state.provider.status === 'unsupported'
        ? SETTINGS_UNSUPPORTED
        : SETTINGS_STATUS_UNCONFIGURED;

  return el(
    'header',
    { class: 'top-bar' },
    el(
      'div',
      { class: 'top-bar-brand' },
      el('div', { class: 'product-name', text: PRODUCT_NAME }),
      el('div', { class: 'product-tagline', text: PRODUCT_TAGLINE }),
    ),
    el(
      'div',
      { class: 'top-bar-status' },
      badge(workspace, 'workspace'),
      badge(provider, state.provider.status === 'unsupported' ? 'warn' : 'provider'),
    ),
    el(
      'div',
      { class: 'top-bar-actions' },
      button(SETTINGS_OPEN, () => session.openSettings(), {
        class: 'btn btn-ghost',
        attrs: { 'data-action': 'open-settings' },
      }),
    ),
  );
}

/* ------------------------------------------------------------------ *
 * Workspace entry (tasks §9 / §10)
 * ------------------------------------------------------------------ */

export function workspaceEntry(context: ViewContext): HTMLElement {
  const state = context.state;
  const needsAuthorization = state.workspace.status === 'needs_authorization';
  const statusText =
    state.workspace.label === null
      ? WORKSPACE_ENTRY_EXPLAIN
      : `${state.workspace.label}｜${WORKSPACE_ENTRY_EXPLAIN}`;

  return el(
    'section',
    { class: 'card card-hero' },
    el('h1', { class: 'hero-title', text: HERO_TITLE }),
    el('p', { class: 'hero-subtitle', text: HERO_SUBTITLE }),
    el(
      'ol',
      { class: 'hero-steps' },
      ...HERO_STEPS.map((step) => el('li', { text: step })),
    ),
    el('h2', { class: 'section-title', text: WORKSPACE_ENTRY_TITLE }),
    el('p', { class: 'note', text: statusText }),
    note(HERO_LOCAL_NOTE),
    note(HERO_TRANSMISSION_NOTE),
    el(
      'div',
      { class: 'action-row' },
      button(
        needsAuthorization ? WORKSPACE_REGANT_BUTTON : WORKSPACE_PICK_BUTTON,
        () => context.pickWorkspace(),
        { class: 'btn btn-primary', attrs: { 'data-action': 'pick-workspace' } },
      ),
    ),
    context.picker_supported ? null : note(WORKSPACE_PICKER_UNSUPPORTED),
  );
}

/** The hero shown once a workspace exists but no record is selected. */
export function heroCard(context: ViewContext): HTMLElement {
  return el(
    'section',
    { class: 'card card-hero' },
    el('h1', { class: 'hero-title', text: HERO_TITLE }),
    el('p', { class: 'hero-subtitle', text: HERO_SUBTITLE }),
    el(
      'div',
      { class: 'action-row' },
      button(HERO_PRIMARY_CTA, () => context.session.openNewAttempt(), { class: 'btn btn-primary' }),
    ),
    note(HERO_LOCAL_NOTE),
  );
}

/* ------------------------------------------------------------------ *
 * Settings Center (tasks §11 / §12 / §13 / §14 ｜ PRE-PSA-BLOCKER-01 §4-§8)
 * ------------------------------------------------------------------ */

/**
 * The Settings Center - the ONE settings surface (task §5).
 *
 * 🔴 A GENERAL PANEL WITH SECTIONS, NOT A ONE-FIELD FORM. V1 ships exactly one section, 「模型服务」;
 *    the header / section / footer shape is deliberately the simple container a second section would
 *    slot into later. No account, theme, language, cloud-sync or telemetry section exists and none is
 *    invented here.
 * 🔴 IT CAN ALWAYS BE LEFT. The header carries a 「×」 and the footer a 「取消」, and BOTH call
 *    `session.closeSettings()` - the same intent the Escape key uses. Closing exits the panel only:
 *    the draft is kept as it stands, no credential is touched and no request is started (task §6).
 * 🔴 SAVE FEEDBACK IS ALWAYS INSIDE THIS PANEL (task §7). The validation reasons and the
 *    composition-failure reason are rendered as blocks in the form itself, because the panel is a
 *    full-height overlay and anything outside it is invisible while the form is open.
 */
export function settingsCenter(context: ViewContext): HTMLElement | null {
  const { state, session } = context;
  if (!state.settings_open) {
    return null;
  }
  const draft = state.settings_draft;
  const preset = findPreset(draft.provider_id);
  /*
   * 🔴 THE CREDENTIAL FACTS THE DRAFT CANNOT CARRY (`CORRECTION-02` §3 / `CORRECTION-03` §2): after a
   *    refresh the field is empty while the session HOLDS the key. The same fact decides BOTH blocks -
   *    「请填写 API Key」 is now a BLOCKING reason when nothing is available, and 「当前浏览器会话已有
   *    API Key…」 is the positive advice when the session has one. It comes from `state`, so this
   *    component stays a pure function of the state it was handed.
   */
  const credential_fact = { session_credential_present: state.settings_key_in_session };
  const blocking = validateSettingsDraft(draft, credential_fact);
  const warnings = settingsWarnings(draft, credential_fact);
  const offers_base_url = preset === null || preset.allows_custom_base_url;

  return el(
    'section',
    {
      class: 'card card-settings',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': SETTINGS_TITLE },
    },
    /* ── header: the title and the visible way out ─────────────────── */
    el(
      'div',
      { class: 'settings-head' },
      el('h2', { class: 'section-title', text: SETTINGS_TITLE }),
      button('×', () => session.closeSettings(), {
        class: 'btn btn-ghost settings-close',
        attrs: {
          id: SETTINGS_CONTROL_IDS.close,
          'aria-label': SETTINGS_CLOSE,
          title: SETTINGS_CLOSE,
          'data-action': 'close-settings',
        },
      }),
    ),
    note(SETTINGS_EXPLAIN),

    /* ── section: 模型服务 ─────────────────────────────────────────── */
    el('h3', { class: 'sub-title', text: SETTINGS_SECTION_MODEL }),
    preset === null ? null : row(SETTINGS_PROVIDER, presetSelector(context)),
    preset === null
      ? null
      : el(
          'div',
          { class: 'kv' },
          el('div', { class: 'kv-key', text: SETTINGS_CONNECTION_ROW }),
          el('div', { class: 'kv-value', text: connectionLabelOf(preset.capability) }),
        ),
    /* 🔴 The preset's own note is where 「待 PSA 验证」 is said, so it is never merely decorative. */
    preset === null ? null : note(preset.note),
    labelInput({
      id: SETTINGS_CONTROL_IDS.model,
      label: SETTINGS_MODEL,
      type: 'text',
      value: draft.model,
      onChange: (value) => session.updateSettingsDraft({ model: value }),
    }),
    labelInput({
      id: SETTINGS_CONTROL_IDS.api_key,
      label: SETTINGS_API_KEY,
      type: 'password',
      value: draft.api_key,
      onChange: (value) => session.updateSettingsDraft({ api_key: value }),
    }),
    note(SETTINGS_API_KEY_NOTE),
    offers_base_url
      ? labelInput({
          id: SETTINGS_CONTROL_IDS.base_url,
          label: SETTINGS_CUSTOM_BASE_URL,
          type: 'text',
          value: draft.custom_base_url,
          onChange: (value) => session.updateSettingsDraft({ custom_base_url: value }),
        })
      : note(SETTINGS_BASE_URL_FORBIDDEN),
    /* 🔴 A note for a field that is NOT on screen would be a sentence about nothing. */
    !offers_base_url || preset === null ? null : note(SETTINGS_CUSTOM_BASE_URL_NOTE),

    /* ── save feedback: A (input) and C (composition) ──────────────── */
    blocking.length === 0
      ? null
      : feedbackBlock(SETTINGS_ERRORS_HEADING, blocking, null, 'gate'),
    state.settings_save_error === null
      ? null
      : feedbackBlock(
          SETTINGS_UNSUPPORTED_HEADING,
          [state.settings_save_error],
          SETTINGS_UNSUPPORTED_HINT,
          'runtime',
        ),
    warnings.length === 0 ? null : feedbackBlock(null, warnings, null, 'runtime'),

    /* ── footer: save + the second way out ─────────────────────────── */
    el(
      'div',
      { class: 'action-row settings-actions' },
      button(
        SETTINGS_SAVE,
        () => {
          void session.saveSettings();
        },
        {
          class: 'btn btn-primary',
          attrs: { id: SETTINGS_CONTROL_IDS.save, 'data-action': 'save-settings' },
        },
      ),
      button(SETTINGS_CANCEL, () => session.closeSettings(), {
        class: 'btn btn-ghost',
        attrs: { id: SETTINGS_CONTROL_IDS.cancel, 'data-action': 'cancel-settings' },
      }),
      button(SETTINGS_CLEAR_KEY, () => session.clearCredential(), { class: 'btn btn-ghost' }),
    ),
  );
}

function presetSelector(context: ViewContext): HTMLElement {
  const select = el('select', {
    class: 'input',
    attrs: { id: SETTINGS_CONTROL_IDS.provider, 'aria-label': SETTINGS_PROVIDER },
    props: { value: context.state.settings_draft.provider_id },
    on: {
      change: (event) => {
        const target = event.target as HTMLSelectElement | null;
        if (target !== null) {
          context.session.chooseSettingsPreset(target.value);
        }
      },
    },
  });
  for (const option of PROVIDER_PRESETS) {
    const id = String(option.provider_id);
    select.appendChild(
      el('option', {
        props: { value: id, selected: id === context.state.settings_draft.provider_id },
        text: option.display_name,
      }),
    );
  }
  return select;
}

/**
 * One labelled input.
 *
 * 🔴 `id` IS A REQUIRED, EXPLICIT PARAMETER AND IS NEVER DERIVED FROM `label`. The id IS the control's
 *    identity for focus restoration, while the label is text a human reads - and the two must be able
 *    to change independently. ⚠️ **Deriving one from the other was NOT what caused the lost caret**
 *    (`CORRECTION-02` §7): the shipped ids came from ASCII labels and never collided, and the OBSERVED
 *    cause was a render path that returned before restoring focus. Explicit identity is PREVENTIVE
 *    HARDENING: it removes the duplicate-id class outright rather than relying on the labels staying
 *    ASCII. Recorded with that distinction in `src/ui/settings/control-identity.ts`.
 * 🔴 `label` is still associated through `for=`, so the control keeps its accessible name.
 */
export interface LabelInputSpec {
  /** The control's logical identity. 🔴 Never computed from `label`, never re-used across controls. */
  readonly id: string;
  readonly label: string;
  readonly type: 'text' | 'password';
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly rows?: number;
}

export function labelInput(spec: LabelInputSpec): HTMLElement {
  const control =
    spec.rows === undefined
      ? el('input', {
          class: 'input',
          attrs: { id: spec.id, type: spec.type },
          props: { value: spec.value },
          on: {
            input: (event) => spec.onChange((event.target as HTMLInputElement).value),
          },
        })
      : el('textarea', {
          class: 'input input-area',
          attrs: { id: spec.id, rows: String(spec.rows) },
          props: { value: spec.value },
          on: {
            input: (event) => spec.onChange((event.target as HTMLTextAreaElement).value),
          },
        });
  return el(
    'div',
    { class: 'form-row' },
    el('label', { class: 'form-label', attrs: { for: spec.id }, text: spec.label }),
    control,
  );
}

/* ------------------------------------------------------------------ *
 * Notices (tasks §44 / §45)
 * ------------------------------------------------------------------ */

/**
 * One inline feedback block - the only shape a save outcome is ever reported in inside the panel.
 *
 * 🔴 `gate` IS "PLEASE ADD SOMETHING" AND `runtime` IS "THE SYSTEM DID NOT FINISH"; the two never
 *    share a heading, and neither is ever re-worded from a raw error (task §44 / §7).
 * 🔴 EVERY MESSAGE IS AN EXISTING PRODUCT SENTENCE. Nothing here composes text from a thrown value,
 *    a status code or a provider body.
 */
function feedbackBlock(
  heading: string | null,
  messages: readonly string[],
  hint: string | null,
  tone: 'gate' | 'runtime',
): HTMLElement {
  return el(
    'div',
    {
      class: `notice notice-${tone}`,
      attrs: { role: tone === 'gate' ? 'status' : 'alert' },
    },
    heading === null ? null : el('div', { class: 'notice-heading', text: heading }),
    ...messages.map((message) => el('div', { class: 'notice-message', text: message })),
    hint === null ? null : el('div', { class: 'notice-hint', text: hint }),
  );
}

/**
 * The one prompt shown when an AI action was requested with no model configured (S01-06B §8).
 *
 * 🔴 IT IS NOT A NOTICE FROM THE SERVICE. No code, no layer, no retry and no `RUNTIME` tone: the
 *    workspace is fine and the record is intact - there is simply no model to run the action with.
 * 🔴 Its button opens the EXISTING settings panel; it does not configure anything by itself and it
 *    starts no network call.
 */
export function modelRequiredNotice(context: ViewContext): HTMLElement | null {
  if (!context.state.ai_requires_model) {
    return null;
  }
  return el(
    'section',
    { class: 'notice-strip' },
    el(
      'div',
      { class: 'notice-card notice-guide', attrs: { role: 'status' } },
      el('div', { class: 'notice-message', text: MODEL_REQUIRED_NOTICE }),
      button(MODEL_REQUIRED_ACTION, () => context.session.openSettings(), {
        class: 'btn btn-primary',
        attrs: { 'data-action': 'open-model-settings' },
      }),
    ),
  );
}

export function noticeStrip(
  notices: readonly NoticeView[],
  onRecovery: (key: string, attempt_id: string | null) => void,
  onRetry: () => void,
  retry_label: string,
): HTMLElement | null {
  if (notices.length === 0) {
    return null;
  }
  return el(
    'section',
    { class: 'notice-strip' },
    ...notices.map((notice) =>
      el(
        'div',
        { class: `notice-card notice-${notice.tone}`, attrs: { role: notice.tone === 'gate' ? 'status' : 'alert' } },
        el('div', { class: 'notice-heading', text: notice.heading }),
        el('div', { class: 'notice-message', text: notice.message }),
        el('div', { class: 'notice-hint', text: notice.hint }),
        notice.recovery === null
          ? notice.retryable
            ? button(retry_label, onRetry, { class: 'btn btn-ghost' })
            : null
          : button(
              notice.recovery.label,
              () => onRecovery(notice.recovery?.key ?? 'none', notice.recovery?.attempt_id ?? null),
              { class: 'btn btn-ghost' },
            ),
      ),
    ),
  );
}
