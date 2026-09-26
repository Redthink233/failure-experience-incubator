/**
 * S01-06 ｜ Model Settings: the provider presets and the draft -> `ProviderConfig` mapping.
 *
 * ── WHAT THIS FILE IS, AND WHAT IT REFUSES TO BE ─────────────────────────────────────
 * 🔴 This is an S01-06 INTEGRATION / WIRING artefact, **not a new product `Decision`**. The browser
 *    side of this repository shipped no provider catalogue: `M10` defines the `ProviderConfig` /
 *    `ProviderCapability` SHAPE, `M12`'s registry holds the authoritative registrations on the
 *    SERVER, and `composeBrowserProvider` builds an adapter from a config it is GIVEN. A settings
 *    screen needs some config to start from, so the presets below are that starting point.
 * 🔴 THE PRESETS ARE CONFIGURATION DATA ONLY - a `provider_id`, a default model name and a
 *    capability SHAPE. They are not a claim that any provider is reachable, CORS-enabled, verified
 *    or even correct: reachability is decided by `resolveProviderPath` and, on the proxy path, by
 *    `M12`'s server-side registry. S01-06 executes ZERO real provider calls.
 * 🔴 THE USER NEVER PICKS A NETWORK PATH (task §11). There is no direct/proxy switch anywhere in the
 *    view model: the connection label is DISPLAYED, and it is produced by the frozen decision point.
 * 🔴 CUSTOM BASE URL IS BROWSER-DIRECT-ONLY (task §13). It is offered for a browser-direct preset and
 *    refused for a proxy preset - and on the proxy path `base_url` must stay `null`, which is what
 *    `createThinProxyAdapter` itself asserts. A proxy target is therefore not expressible here.
 * 🔴 THE API KEY IS NEVER PUT IN A `ProviderConfig`. It travels separately, into `M13`'s
 *    session-only credential store, and this file has no field that could persist it.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, NO storage.
 */

import { providerId } from '../../ai/provider/ids.js';
import type { ProviderId } from '../../ai/provider/ids.js';
import { resolveProviderPath } from '../../ai/provider/capability.js';
import type { BaseUrlSource, ProviderCapability, ProviderConfig } from '../../ai/provider/capability.js';
import {
  SETTINGS_BASE_URL_FORBIDDEN,
  SETTINGS_BASE_URL_REQUIRED,
  SETTINGS_CONNECTION_DIRECT,
  SETTINGS_CONNECTION_PROXY,
  SETTINGS_KEY_PRESENT_IN_SESSION,
  SETTINGS_KEY_REQUIRED,
  SETTINGS_MODEL_REQUIRED,
  SETTINGS_UNSUPPORTED,
} from '../copy.js';

export interface ProviderPreset {
  readonly provider_id: ProviderId;
  readonly display_name: string;
  readonly default_model: string;
  readonly capability: ProviderCapability;
  /** The registered fixed base URL, or `null` when the user must supply one. */
  readonly fixed_base_url: string | null;
  /**
   * Whether the panel OFFERS the custom Base URL field for this preset.
   *
   * 🔴 IT IS NOT SIMPLY `capability.browser_direct`. A preset may be browser-direct and still pin a
   *    PRODUCT-REGISTERED endpoint - `DeepSeek` does exactly that (`PRE-PSA-BLOCKER-01` §10) - in
   *    which case a custom URL is not offered even though the path is browser-direct. The two facts
   *    are separate on purpose: `capability` decides the PATH, this flag decides the FORM.
   * 🔴 IT MUST NEVER BE `true` ON A PROXY PRESET: a user-supplied URL on the proxy path is the
   *    generic-URL-proxy that AC-147 forbids, and `validateSettingsDraft` refuses that draft.
   */
  readonly allows_custom_base_url: boolean;
  /** Why this preset is shaped the way it is - shown next to the connection label. */
  readonly note: string;
}

/** `json_object` structured output over the browser-direct path. */
const JSON_OBJECT: ProviderCapability = {
  structured_output: 'json_object',
  browser_direct: true,
  thin_proxy: false,
};

const PROXY_ONLY: ProviderCapability = {
  structured_output: 'json_object',
  browser_direct: false,
  thin_proxy: true,
};

/**
 * The presets.
 *
 * 🔴 TWO PRESETS ARE BROWSER-DIRECT: `browser-direct-custom` (the user supplies both endpoint and
 *    key) and `deepseek` (a product-registered endpoint). Everything else is marked `thin_proxy`
 *    because an in-browser call to a hosted vendor endpoint depends on CORS behaviour this task does
 *    NOT verify.
 * 🔴 BEING BROWSER-DIRECT IS A CONFIGURATION SHAPE, NOT A REACHABILITY CLAIM. `deepseek`'s CORS
 *    behaviour has NOT been tested, its `note` says so verbatim, and no code here asserts that the
 *    endpoint answers (`PRE-PSA-BLOCKER-01` §9 / §11).
 */
export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    provider_id: providerId('browser-direct-custom'),
    display_name: '自定义（浏览器直连）',
    default_model: '',
    capability: JSON_OBJECT,
    fixed_base_url: null,
    allows_custom_base_url: true,
    note: '请求由浏览器直接发往你填写的地址，密钥只保留在当前会话里。',
  },
  {
    /*
     * 🔴 THE PSA CANDIDATE, AND NOTHING MORE THAN A CANDIDATE (PRE-PSA-BLOCKER-01 §9 / §10).
     *    `deepseek-flash` and the endpoint below are the values the NEXT phase will exercise with a
     *    real key in a real browser. This file states the configuration; it does NOT state that the
     *    endpoint is reachable, CORS-enabled or verified - those all stay PENDING REAL PSA.
     * 🔴 THE ENDPOINT IS THE FULL CHAT-COMPLETIONS URL ON PURPOSE: the browser-direct adapter POSTs
     *    `config.base_url` VERBATIM and never appends a path, so the value must already name the
     *    route the request goes to.
     */
    provider_id: providerId('deepseek'),
    display_name: 'DeepSeek',
    default_model: 'deepseek-flash',
    capability: JSON_OBJECT,
    fixed_base_url: 'https://api.deepseek.com/chat/completions',
    allows_custom_base_url: false,
    note: '浏览器直连，实际可用性待 PSA 验证。',
  },
  {
    provider_id: providerId('moonshot'),
    display_name: 'Moonshot',
    default_model: 'moonshot-v1-8k',
    capability: PROXY_ONLY,
    fixed_base_url: null,
    allows_custom_base_url: false,
    note: '通过受支持的代理连接访问，目标地址不由页面决定。',
  },
  {
    provider_id: providerId('zhipu'),
    display_name: '智谱 GLM',
    default_model: 'glm-4-flash',
    capability: PROXY_ONLY,
    fixed_base_url: null,
    allows_custom_base_url: false,
    note: '通过受支持的代理连接访问，目标地址不由页面决定。',
  },
  {
    provider_id: providerId('openai'),
    display_name: 'OpenAI',
    default_model: 'gpt-4o-mini',
    capability: PROXY_ONLY,
    fixed_base_url: null,
    allows_custom_base_url: false,
    note: '通过受支持的代理连接访问，目标地址不由页面决定。',
  },
];

export function findPreset(provider_id: string): ProviderPreset | null {
  return PROVIDER_PRESETS.find((preset) => String(preset.provider_id) === provider_id) ?? null;
}

/** The DISPLAY label of the path the frozen decision point resolves, or the unsupported sentence. */
export function connectionLabelOf(capability: ProviderCapability): string {
  const resolution = resolveProviderPath(capability);
  if (resolution.kind !== 'resolved') {
    return SETTINGS_UNSUPPORTED;
  }
  return resolution.path === 'browser_direct' ? SETTINGS_CONNECTION_DIRECT : SETTINGS_CONNECTION_PROXY;
}

/* ------------------------------------------------------------------ *
 * The draft
 * ------------------------------------------------------------------ */

export interface SettingsDraft {
  readonly provider_id: string;
  readonly model: string;
  readonly api_key: string;
  readonly custom_base_url: string;
}

export const EMPTY_SETTINGS_DRAFT: SettingsDraft = {
  provider_id: String(PROVIDER_PRESETS[0]?.provider_id ?? 'browser-direct-custom'),
  model: '',
  api_key: '',
  custom_base_url: '',
};

/** The draft a preset switch produces: the model default follows the provider, the key is kept. */
export function draftForPreset(preset: ProviderPreset, previous: SettingsDraft): SettingsDraft {
  return {
    provider_id: String(preset.provider_id),
    model: previous.model.trim().length > 0 ? previous.model : preset.default_model,
    api_key: previous.api_key,
    custom_base_url: preset.allows_custom_base_url ? previous.custom_base_url : '',
  };
}

/**
 * The BLOCKING validation of a draft.
 *
 * 🔴 A missing API KEY IS NOT A BLOCKING ERROR. The composed object graph only needs a provider
 *    config, so the workspace can be read - and history browsed - before a key is entered. The key
 *    becomes necessary the moment a model actually has to answer, which is what the warning below
 *    says. Refusing to compose without a key would make the rail unreadable for no reason.
 * 🔴 These messages are all INPUT-side statements ("please fill X"). A failure that comes back from
 *    the model service is a RUNTIME notice and is rendered by the notice layer instead - the two are
 *    never conflated (task §44).
 */
export function validateSettingsDraft(draft: SettingsDraft): readonly string[] {
  const messages: string[] = [];
  const preset = findPreset(draft.provider_id);
  if (preset === null) {
    messages.push(SETTINGS_UNSUPPORTED);
    return messages;
  }
  if (draft.model.trim().length === 0) {
    messages.push(SETTINGS_MODEL_REQUIRED);
  }
  if (preset.allows_custom_base_url) {
    if (preset.fixed_base_url === null && draft.custom_base_url.trim().length === 0) {
      messages.push(SETTINGS_BASE_URL_REQUIRED);
    }
  } else if (draft.custom_base_url.trim().length > 0) {
    messages.push(SETTINGS_BASE_URL_FORBIDDEN);
  }
  return messages;
}

/**
 * Non-blocking advice about the credential: true, and worth saying, but never a reason to refuse the
 * configuration.
 *
 * 🔴 THE ADVICE DEPENDS ON A FACT THE DRAFT DOES NOT CARRY: whether this browser session ALREADY holds
 *    a credential for the selected provider (`CORRECTION-02` §3). After a refresh the field is empty
 *    while the session still holds the key, and in that state 「请填写 API Key」 is false advice -
 *    the user can save and the stored key will be used. The caller therefore passes the session fact
 *    in; this function stays pure and reads no store itself.
 * 🔴 IT NEVER PREVENTS A SAVE. Both outcomes are ADVICE. A missing key is not a blocking error -
 *    the composed object graph only needs a provider config, so the workspace can be read, and history
 *    browsed, before a key exists.
 */
export function settingsWarnings(
  draft: SettingsDraft,
  options: { readonly session_credential_present?: boolean } = {},
): readonly string[] {
  if (draft.api_key.trim().length > 0) {
    return [];
  }
  return options.session_credential_present === true
    ? [SETTINGS_KEY_PRESENT_IN_SESSION]
    : [SETTINGS_KEY_REQUIRED];
}

/**
 * The `ProviderConfig` for a valid draft, or `null` when the draft is not valid / the preset is
 * unknown.
 *
 * 🔴 The API KEY IS NOT READ HERE. Building the config and storing the credential are two separate
 *    acts, and only the second one touches the session store.
 */
export function providerConfigOf(draft: SettingsDraft): ProviderConfig | null {
  if (validateSettingsDraft(draft).length > 0) {
    return null;
  }
  const preset = findPreset(draft.provider_id);
  if (preset === null) {
    return null;
  }
  const custom = draft.custom_base_url.trim();
  const uses_custom = preset.allows_custom_base_url && custom.length > 0;
  const base_url = uses_custom ? custom : preset.fixed_base_url;
  /* 🔴 On the proxy path a custom URL is not merely ignored - validation above refuses the draft. */
  const base_url_source: BaseUrlSource = uses_custom ? 'user_custom' : 'registered_fixed';

  return {
    provider_id: preset.provider_id,
    display_name: preset.display_name,
    model: draft.model.trim(),
    base_url,
    base_url_source,
    capability: preset.capability,
  };
}

/**
 * `true` when the provider the draft names can be composed into a working adapter at all.
 *
 * 🔴 This mirrors the frozen capability rule rather than replacing it: the adapter is still built by
 *    `composeBrowserProvider`, which calls `resolveProviderPath` itself. A preset whose capability
 *    names no path is an explicit `unsupported` state, never a silent fallback (task §14 / AC-150).
 */
export function presetHasReachablePath(preset: ProviderPreset): boolean {
  return resolveProviderPath(preset.capability).kind === 'resolved';
}
