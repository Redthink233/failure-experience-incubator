/**
 * S01-06 ｜ The REAL browser gateway: workspace storage + provider composition + workflow composition.
 *
 * 🔴 THE ONE PLACE THAT KNOWS A RUNTIME. This is the S01-06 counterpart of
 *    `src/browser/application/**`: the App Shell itself must not `new` a service, must not build an
 *    adapter and must not decide a provider path. It calls the two frozen composition functions and
 *    receives either a composed graph or an explicit `unsupported` result.
 * 🔴 NO SILENT FALLBACK (task §14 / AC-150). An `unsupported` provider is RETURNED, never worked
 *    around: the caller shows 「当前配置无法建立受支持的模型连接。」 and offers the settings panel.
 * 🔴 THE STORAGE IS INJECTED, ALREADY AUTHORIZED. This module never opens a directory and never
 *    touches a picker: `M2` produced the storage from a real user gesture before this is called.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network of its own.
 */

import type { CredentialRef, CredentialResolver } from '../../ai/provider/credential.js';
import type { HttpTransport } from '../../ai/provider/transport.js';
import type { ProviderConfig } from '../../ai/provider/capability.js';
import type { WorkspaceStorage } from '../../workspace/storage.js';
import { createWorkflowAttemptIndex } from '../../application/workflow/attempt-summaries.js';
import { composeBrowserProvider } from '../../browser/application/provider-composition.js';
import { composeBrowserWorkflow } from '../../browser/application/workflow-composition.js';
import {
  composeBrowserWorkspaceReader,
} from '../../browser/application/workspace-reader-composition.js';
import type { BrowserWorkspaceReader } from '../../browser/application/workspace-reader-composition.js';
import { connectionLabelOf } from '../settings/provider-presets.js';
import type { UiReadPort, UiWorkflowPort } from './ui-port.js';
import { createUiReadPort, createUiWorkflowPort } from './ui-port.js';

/* ------------------------------------------------------------------ *
 * The provider-independent READ gateway (S01-06B)
 * ------------------------------------------------------------------ */

export interface BrowserUiReadGateway {
  readonly read_port: UiReadPort;
  /** The whole read composition, kept so a later command composition can share its storage. */
  readonly reader: BrowserWorkspaceReader;
}

/**
 * Builds the browse path for one already-authorized workspace.
 *
 * 🔴 NO PROVIDER, NO CREDENTIAL, NO PATH RESOLUTION: it returns a value, never an `unsupported`
 *    result, because there is no provider capability to be unsupported. Selecting a workspace is
 *    therefore enough to LIST and OPEN existing records (`S01-06-D1`).
 * 🔴 It composes over the SAME `WorkspaceStorage` the command composition will use, so a later model
 *    configuration never asks the user to pick a directory again.
 */
export function createBrowserUiReadGateway(input: {
  readonly storage: WorkspaceStorage;
}): BrowserUiReadGateway {
  const reader = composeBrowserWorkspaceReader({ storage: input.storage });
  return {
    reader,
    read_port: createUiReadPort({ reads: reader.reads, index: reader.index }),
  };
}

export interface BrowserUiGateway {
  readonly port: UiWorkflowPort;
  readonly credential_ref: CredentialRef;
  /** The DISPLAY label of the resolved path - never a user-selectable option. */
  readonly connection_label: string;
  readonly provider_display_name: string;
  readonly model: string;
}

export type BrowserUiGatewayResult =
  | { readonly kind: 'ready'; readonly gateway: BrowserUiGateway }
  | { readonly kind: 'unsupported'; readonly message: string };

export interface BrowserUiGatewayInput {
  readonly storage: WorkspaceStorage;
  readonly config: ProviderConfig;
  /** `M13`'s session store (or any resolver). 🔴 The resolver only - never a secret. */
  readonly credentials: CredentialResolver;
  /** Injectable transport, used by the wiring tests. Defaults to the real browser `fetch`. */
  readonly transport?: HttpTransport;
}

export function createBrowserUiGateway(input: BrowserUiGatewayInput): BrowserUiGatewayResult {
  const provider = composeBrowserProvider({
    config: input.config,
    credentials: input.credentials,
    ...(input.transport === undefined ? {} : { transport: input.transport }),
  });
  if (provider.kind !== 'composed') {
    return { kind: 'unsupported', message: provider.message };
  }

  const composition = composeBrowserWorkflow({ storage: input.storage, provider });
  if (composition.kind !== 'composed') {
    return { kind: 'unsupported', message: composition.message };
  }

  const index = createWorkflowAttemptIndex({ listAttempts: () => composition.composition.attempts.listAttempts() });
  const port = createUiWorkflowPort({
    workflow: composition.composition.workflow,
    index,
    capture: composition.composition.capture,
  });

  return {
    kind: 'ready',
    gateway: {
      port,
      credential_ref: provider.credential_ref,
      connection_label: connectionLabelOf(input.config.capability),
      provider_display_name: input.config.display_name,
      model: input.config.model,
    },
  };
}
