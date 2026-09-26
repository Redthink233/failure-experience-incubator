/**
 * S01 ｜ `M9` the constrained AI call helpers of step ⑨.
 *
 * Contract: §0.4 D (Structured Output = provider-native / constrained JSON + schema validation +
 * repair·retry; it is an implementation-layer concern and changes no product semantics);
 * §10.1 layer 2 (`RUNTIME`: keep existing data + explicit message + retry allowed).
 *
 * 🔴 THE ONLY AI ENTRY POINT OF `M9`. Every call goes through the INJECTED `M10` `ProviderAdapter` and
 *    nothing else: no `fetch`, no provider SDK, no thin-proxy client, no browser-direct construction,
 *    no session store. `M9` can represent no credential beyond an opaque `CredentialRef`.
 * 🔴 A runtime failure NEVER means an invalid `Hypothesis` and never discards a stored record: the
 *    caller keeps everything and may retry.
 * 🔴 When the provider cannot express a constrained structure at all, the step FAILS EXPLICITLY
 *    instead of quietly continuing on free text.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ProviderAdapter } from '../../ai/provider/adapter.js';
import type { CredentialRef } from '../../ai/provider/credential.js';
import type { AiRequest } from '../../ai/provider/request.js';
import { validateAiRequest } from '../../ai/provider/request.js';
import type { AiResult } from '../../ai/provider/result.js';
import type { StructuredOutputRequest } from '../../ai/provider/structured-output.js';
import {
  evaluateStructuredResponse,
  selectStructuredOutputMode,
} from '../../ai/provider/structured-output.js';
import type { HypothesisRuntimeFailure } from './types.js';
import { hypothesisRuntimeFailure, hypothesisRuntimeFailureFromAiError } from './types.js';

export type HypothesisStructuredOutcome =
  | { readonly kind: 'ok'; readonly value: Readonly<Record<string, unknown>> }
  | HypothesisRuntimeFailure;

export interface HypothesisStructuredInvocation {
  readonly adapter: ProviderAdapter;
  /** An opaque handle only - this layer cannot represent a secret. */
  readonly credential_ref: CredentialRef | null;
  readonly request: AiRequest;
  readonly structured_output: StructuredOutputRequest;
}

/**
 * Runs one constrained AI call.
 *
 * Order of checks is deliberate:
 *   ① the request is validated BEFORE any network call (`REQUEST_INVALID`);
 *   ② an unsupported structured-output capability fails explicitly and calls nothing;
 *   ③ an adapter error is reported verbatim (the fixed `M10` message table - never interpolated);
 *   ④ a missing / unparseable / off-schema answer is a runtime failure, never a fabricated result.
 */
export async function invokeHypothesisStructured(
  invocation: HypothesisStructuredInvocation,
): Promise<HypothesisStructuredOutcome> {
  const violations = validateAiRequest(invocation.request);
  if (violations.length > 0) {
    return hypothesisRuntimeFailure(
      'REQUEST_INVALID',
      `The AI request was rejected before any network call: ${violations
        .map((violation) => violation.code)
        .join(', ')}.`,
      false,
    );
  }

  const mode = selectStructuredOutputMode(
    invocation.adapter.capability.structured_output,
    invocation.structured_output.preferred_mode,
  );
  if (mode === 'none') {
    return hypothesisRuntimeFailure(
      'NO_STRUCTURED_OUTPUT_AVAILABLE',
      'The configured provider offers no constrained-output mode, so a structured step ⑨ answer cannot be guaranteed; refusing to continue on free text alone.',
      false,
    );
  }

  const result: AiResult = await invocation.adapter.execute({
    provider_id: invocation.adapter.provider_id,
    request: invocation.request,
    credential_ref: invocation.credential_ref,
  });

  if (result.kind === 'error') {
    return hypothesisRuntimeFailureFromAiError(result.error);
  }

  if (result.structured !== null) {
    return { kind: 'ok', value: result.structured };
  }

  const evaluated = evaluateStructuredResponse(mode, result.text, invocation.structured_output);
  if (evaluated.kind === 'valid') {
    return { kind: 'ok', value: evaluated.value };
  }
  if (evaluated.kind === 'no_structured_output_available') {
    return hypothesisRuntimeFailure(
      'NO_STRUCTURED_OUTPUT_AVAILABLE',
      'The provider answer carried no constrained structure to validate.',
      false,
    );
  }
  return hypothesisRuntimeFailure(
    'MALFORMED_STRUCTURED_RESULT',
    `The provider answer did not match the requested structure (${evaluated.kind}).`,
    true,
  );
}
