/**
 * S01-06 ｜ The browser bootstrap: the ONLY place the App Shell touches a real browser capability.
 *
 * 🔴 IT OWNS THREE THINGS, AND NOTHING ELSE:
 *    1. the session-only credential store (`M13`) - the API key's one and only destination;
 *    2. the directory picker call (`M2`), which MUST run inside the user's click;
 *    3. the wiring of the two together into `createBrowserUiGateway` (the composition root).
 *    Everything above it (state, derivation, rendering) is framework-neutral TypeScript.
 * 🔴 A WORKSPACE IS ONLY EVER OPENED FROM A USER GESTURE (task §9 / U3). There is no code path here
 *    that opens a directory on load, scans a disk, or restores a previously granted handle.
 * 🔴 THE API KEY GOES INTO `M13`'s SESSION STORE AND NOWHERE ELSE. It is never written to the
 *    workspace, never to `localStorage`, never to `IndexedDB` and never into a `ProviderConfig`.
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
import { createAppSession } from './session/app-session.js';
import { createBrowserUiGateway, createBrowserUiReadGateway } from './session/browser-gateway.js';

export function startAppShell(root: HTMLElement | null): void {
  if (root === null) {
    throw new Error('The App Shell needs a mount point (#app).');
  }

  const credentials = createSessionCredentialStore(createBrowserSessionStorage());
  let storage: WorkspaceStorage | null = null;

  const session = createAppSession({
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
      if (api_key.trim().length > 0) {
        /* 🔴 The ONE place a secret enters `M13`. Nothing here returns, logs or copies it. */
        credentials.put(credentialRefForProvider(String(config.provider_id)), api_key);
      }
      return createBrowserUiGateway({ storage, config, credentials });
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
