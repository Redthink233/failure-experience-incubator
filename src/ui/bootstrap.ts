/**
 * S01-06 ｜ The browser bootstrap: the ONLY place the App Shell touches a real browser capability.
 *
 * 🔴 IT OWNS THREE THINGS, AND NOTHING ELSE:
 *    1. the session-only credential store (`M13`) - the API key's one and only destination - plus the
 *       two-method, secret-free view of it the App Shell is allowed to hold (`credentials`);
 *    2. the directory picker call (`M2`), which MUST run inside the user's click;
 *    3. the wiring of the two together into `createBrowserUiGateway` (the composition root).
 *    Everything above it (state, derivation, rendering) is framework-neutral TypeScript.
 * 🔴 AND IT NO LONGER *REQUIRES* A CREDENTIAL CARRIER TO BOOT (`FINAL-RAPID-INTEGRATION-01` §3.2).
 *    Building the store eagerly used to throw on a runtime without `sessionStorage` and take the whole
 *    page down with it. The capability is probed into a VALUE (`resolveCredentialCapability`), so this
 *    function always reaches `mountAppShell`: with a carrier the model settings work as before; without
 *    one the workspace still opens and saving a model configuration is refused with the frozen
 *    sentence, because a key has nowhere legal to go. No other carrier is ever used (`D-056`).
 * 🔴 A WORKSPACE IS ONLY EVER OPENED FROM A USER GESTURE (task §9 / U3). There is no code path here
 *    that opens a directory on load, scans a disk, or restores a previously granted handle.
 * 🔴 THE API KEY GOES INTO `M13`'s SESSION STORE AND NOWHERE ELSE. It is never written to the
 *    workspace, never to `localStorage`, never to `IndexedDB` and never into a `ProviderConfig`.
 * 🔴 THE STORE IS WRITTEN IN EXACTLY ONE PLACE (`credentials.put`, below) AND READ, FOR THE FORM, IN
 *    NONE AT ALL (`CORRECTION-02` §4). The `credentials` port handed to the session can ask whether a
 *    credential EXISTS and can REMOVE one; it can never return a value, so no code path can rehydrate
 *    a stored key into the input box.
 *
 * DOM scope only.
 */

import { noticeForThrownError, workflowNotice } from '../application/workflow/errors.js';
import { createBrowserSessionStorage } from '../browser/ai/session-storage.js';
import {
  createSessionCredentialStore,
  credentialRefForProvider,
} from '../browser/ai/session-credential-store.js';
import {
  isWorkspaceDirectoryPickerSupported,
  selectWorkspaceDirectory,
} from '../browser/workspace/directory-picker.js';
import { createFsaWorkspaceStorage } from '../browser/workspace/fsa-workspace-storage.js';
import type { WorkspaceStorage } from '../workspace/storage.js';
import { mountAppShell } from './app-root.js';
import {
  NO_CREDENTIAL_PORT,
  credentialUnavailableMessage,
  resolveCredentialCapability,
} from './settings/credential-capability.js';
import type { CredentialPort } from './settings/credential-capability.js';
import { createAppSession } from './session/app-session.js';
import { createBrowserUiGateway, createBrowserUiReadGateway } from './session/browser-gateway.js';

export function startAppShell(root: HTMLElement | null): void {
  if (root === null) {
    throw new Error('The App Shell needs a mount point (#app).');
  }

  /*
   * 🔴 THE CREDENTIAL CARRIER IS PROBED, AND ITS ABSENCE IS A STATE (`FINAL-RAPID-INTEGRATION-01`).
   *
   *    This call used to be inlined as
   *        `createSessionCredentialStore(createBrowserSessionStorage())`
   *    and it THREW whenever the runtime had no session storage - which aborted `startAppShell`
   *    before `mountAppShell`, leaving a BLANK PAGE with no explanation and no workspace entry.
   * 🔴 THERE IS STILL NO FALLBACK, AND THAT IS UNCHANGED BEHAVIOUR (`D-056`): the set of carriers this
   *    function may reach for is EMPTY. When the probe fails, nothing is stored anywhere - not in
   *    `localStorage`, not in `IndexedDB`, not in a module-level map - and the model configuration is
   *    refused instead of being presented as saved.
   * 🔴 BROWSING IS NOT AFFECTED. The workspace reader is built from the directory handle below and
   *    needs no credential, so the workspace entry and the provider-less read path stay usable.
   * 🔴 THE WIRING IS BUILT ONCE, HERE, SO EVERY LATER READ AGREES WITH IT: `credentials_wiring` is
   *    either the store built from the ONE sanctioned carrier or `null`, and `createGateway` below
   *    consults it rather than re-probing.
   */
  const capability = resolveCredentialCapability(() => createBrowserSessionStorage());
  const credentials_wiring =
    capability.kind === 'available'
      ? (() => {
          const store = createSessionCredentialStore(capability.store);
          const port: CredentialPort = {
            has: (provider_id: string): boolean => store.has(credentialRefForProvider(provider_id)),
            clear: (provider_id: string): void =>
              store.remove(credentialRefForProvider(provider_id)),
          };
          return { store, port };
        })()
      : null;

  /**
   * The App Shell's view of that store, restricted to what it may know (`CORRECTION-02` §1/§3).
   *
   * 🔴 TWO METHODS, NEITHER OF WHICH TOUCHES A SECRET. `has` answers a boolean question so the panel
   *    can stop asking for a key the session already holds; `clear` removes exactly the one provider's
   *    credential so the 「清除本次会话的 API Key」 button does what its sentence says. There is no
   *    `resolve`, so the App Shell has no way to put a stored key back into the input box.
   * 🔴 THE REF IS DERIVED FROM THE PROVIDER ID, the same derivation the `put` below uses - so `has`
   *    and `clear` can only ever name the provider they were asked about.
   * 🔴 WITH NO CARRIER, THE PANEL GETS `NO_CREDENTIAL_PORT`: it holds nothing, so the panel asks for a
   *    key and the clear button has nothing to clear. That is the honest description of this runtime.
   */
  const credentialPort: CredentialPort = credentials_wiring?.port ?? NO_CREDENTIAL_PORT;
  let storage: WorkspaceStorage | null = null;

  const session = createAppSession({
    /* 🔴 The session credential store, through its non-secret surface. */
    credentials: credentialPort,
    /*
     * 🔴 THE READER IS BUILT THE MOMENT A DIRECTORY IS AUTHORIZED, with no provider involved
     *    (S01-06B). It composes over the SAME `storage` object the command gateway will use, so a
     *    later model configuration never asks the user to pick a directory again.
     */
    attachStorage: () => {
      if (storage === null) {
        return null;
      }
      /*
       * 🔴 A failure here PROPAGATES on purpose: `pickWorkspace` owns the single safe-error mapping,
       *    so the reader cannot report a workspace failure behind the caller's back.
       */
      return createBrowserUiReadGateway({ storage }).read_port;
    },
    createGateway: ({ config, api_key }) => {
      if (storage === null) {
        return {
          kind: 'unsupported',
          message: '还没有可用的本地工作区，无法建立模型连接。',
        };
      }
      /*
       * 🔴 NO SESSION STORAGE ⇒ THE CONFIGURATION IS REFUSED, IN THE PANEL, IN ONE SENTENCE
       *    (`FINAL-RAPID-INTEGRATION-01` §3.2). This is the SAME `unsupported` outcome the capability
       *    table produces, so the panel stays open, `settings_save_error` carries the reason, the top
       *    bar stays at 「模型服务未配置」 and the provider never reaches `ready`. Nothing is written,
       *    and the typed key is not kept anywhere - there is nowhere legal to keep it.
       */
      if (credentials_wiring === null) {
        return { kind: 'unsupported', message: credentialUnavailableMessage(capability) };
      }
      if (api_key.trim().length > 0) {
        /* 🔴 The ONE place a secret enters `M13`. Nothing here returns, logs or copies it. */
        credentials_wiring.store.put(credentialRefForProvider(String(config.provider_id)), api_key);
      }
      return createBrowserUiGateway({
        storage,
        config,
        credentials: credentials_wiring.store,
      });
    },
  });

  async function pickWorkspace(): Promise<void> {
    if (!isWorkspaceDirectoryPickerSupported()) {
      session.reportWorkspaceFailure(workflowNotice('WORKSPACE_UNAVAILABLE'));
      return;
    }
    try {
      const handle = await selectWorkspaceDirectory();
      if (handle === null) {
        /* 🔴 A dismissal is a user choice, not a failure, and it reads/opens nothing. */
        return;
      }
      storage = createFsaWorkspaceStorage(handle);
      const label = (handle as { readonly name?: unknown }).name;
      await session.attachWorkspace(typeof label === 'string' ? label : '');
    } catch (error) {
      /* 🔴 A raw thrown value is converted to a SAFE product notice. It never reaches the DOM. */
      session.reportWorkspaceFailure(noticeForThrownError(error));
    }
  }

  mountAppShell(root, {
    session,
    picker_supported: isWorkspaceDirectoryPickerSupported(),
    pickWorkspace: () => {
      void pickWorkspace();
    },
  });
}
