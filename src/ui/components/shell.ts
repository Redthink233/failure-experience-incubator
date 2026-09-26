/**
 * S01-06 ｜ The App Shell chrome: Top Bar, workspace entry, model settings and the notice strip.
 *
 * 🔴 WHAT THE TOP BAR MAY SHOW (task §8): the product name, the workspace status and the model
 *    connection status, plus the settings entry point. It shows NO token count, NO prompt text, NO
 *    latency, NO internal request id and NO runtime stack - there is no field for one, and the
 *    notices it renders are the service's own fixed sentences.
 * 🔴 MODEL SETTINGS NEVER ASK FOR A PATH (task §11 / §13). The connection label is DISPLAYED, never
 *    chosen; the custom base URL field appears only for a preset whose capability is browser-direct.
 * 🔴 THE API KEY IS A PASSWORD FIELD, THE FORM SAYS 「仅当前会话使用」, and there is NO "remember me",
 *    NO "save to workspace" and NO auto-restore control anywhere (task §12).
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
  SETTINGS_CLEAR_KEY,
  SETTINGS_CUSTOM_BASE_URL,
  SETTINGS_CUSTOM_BASE_URL_NOTE,
  SETTINGS_EXPLAIN,
  SETTINGS_MODEL,
  SETTINGS_OPEN,
  SETTINGS_PROVIDER,
  SETTINGS_SAVE,
  SETTINGS_STATUS_UNCONFIGURED,
  SETTINGS_TITLE,
  SETTINGS_UNSUPPORTED,
  WORKSPACE_ENTRY_EXPLAIN,
  WORKSPACE_ENTRY_TITLE,
  WORKSPACE_PICK_BUTTON,
  WORKSPACE_PICKER_UNSUPPORTED,
  WORKSPACE_REGANT_BUTTON,
} from '../copy.js';
import { workspaceStatusLabel } from '../presenters/rail.js';
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
      button(SETTINGS_OPEN, () => session.openSettings(), { class: 'btn btn-ghost' }),
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
 * Model settings (tasks §11 / §12 / §13 / §14)
 * ------------------------------------------------------------------ */

export function modelSettings(context: ViewContext): HTMLElement | null {
  const { state, session } = context;
  if (!state.settings_open) {
    return null;
  }
  const draft = state.settings_draft;
  const preset = findPreset(draft.provider_id);
  const blocking = validateSettingsDraft(draft);
  const warnings = settingsWarnings(draft);

  return el(
    'section',
    { class: 'card card-settings', attrs: { role: 'dialog', 'aria-label': SETTINGS_TITLE } },
    el('h2', { class: 'section-title', text: SETTINGS_TITLE }),
    note(SETTINGS_EXPLAIN),
    preset === null ? null : row(SETTINGS_PROVIDER, presetSelector(context)),
    preset === null
      ? null
      : el(
          'div',
          { class: 'kv' },
          el('div', { class: 'kv-key', text: '连接方式' }),
          el('div', { class: 'kv-value', text: connectionLabelOf(preset.capability) }),
        ),
    labelInput(SETTINGS_MODEL, 'text', draft.model, (value) =>
      session.updateSettingsDraft({ model: value }),
    ),
    labelInput(SETTINGS_API_KEY, 'password', draft.api_key, (value) =>
      session.updateSettingsDraft({ api_key: value }),
    ),
    note(SETTINGS_API_KEY_NOTE),
    preset === null || preset.allows_custom_base_url
      ? labelInput(SETTINGS_CUSTOM_BASE_URL, 'text', draft.custom_base_url, (value) =>
          session.updateSettingsDraft({ custom_base_url: value }),
        )
      : note(SETTINGS_BASE_URL_FORBIDDEN),
    preset === null || !preset.allows_custom_base_url ? null : note(SETTINGS_CUSTOM_BASE_URL_NOTE),
    ...blocking.map((message) => noticeLine(message, 'gate')),
    ...warnings.map((message) => noticeLine(message, 'runtime')),
    el(
      'div',
      { class: 'action-row' },
      button(SETTINGS_SAVE, () => {
        void session.saveSettings();
      }, { class: 'btn btn-primary' }),
      button(SETTINGS_CLEAR_KEY, () => session.clearCredential(), { class: 'btn btn-ghost' }),
    ),
  );
}

function presetSelector(context: ViewContext): HTMLElement {
  const select = el('select', {
    class: 'input',
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

/** One labelled input. `label` is associated with the control so a screen reader can name it. */
export function labelInput(
  label: string,
  type: 'text' | 'password',
  value: string,
  onChange: (value: string) => void,
  options: { readonly rows?: number } = {},
): HTMLElement {
  const id = `field-${label.replace(/[^A-Za-z0-9]/gu, '')}-${type}`;
  const control =
    options.rows === undefined
      ? el('input', {
          class: 'input',
          attrs: { id, type },
          props: { value },
          on: {
            input: (event) => onChange((event.target as HTMLInputElement).value),
          },
        })
      : el('textarea', {
          class: 'input input-area',
          attrs: { id, rows: String(options.rows) },
          props: { value },
          on: {
            input: (event) => onChange((event.target as HTMLTextAreaElement).value),
          },
        });
  return el(
    'div',
    { class: 'form-row' },
    el('label', { class: 'form-label', attrs: { for: id }, text: label }),
    control,
  );
}

/* ------------------------------------------------------------------ *
 * Notices (tasks §44 / §45)
 * ------------------------------------------------------------------ */

function noticeLine(message: string, tone: 'gate' | 'runtime'): HTMLElement {
  return el('p', {
    class: `notice notice-${tone}`,
    attrs: { role: tone === 'gate' ? 'status' : 'alert' },
    text: message,
  });
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
