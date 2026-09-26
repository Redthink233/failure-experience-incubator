/**
 * S01-05 ｜ Step ② structured parse - the ONLY AI entry point of the capture path.
 *
 * Contract: §9 ②; §0.4 D; §10.1 layer 2 (`RUNTIME`).
 *
 * 🔴 The AI call goes through the INJECTED `M10` `ProviderAdapter` and nothing else: no direct
 *    HTTP call, no provider SDK, no proxy client module, no session store. The application
 *    submits an `AiInvocation` plus a normalized `AiRequest` and receives an `AiResult`.
 * 🔴 A runtime failure NEVER means the Attempt is invalid: the caller keeps the Draft, keeps the
 *    user's text and may retry (AC-89 / task §26). Nothing here mutates or discards a record.
 * 🔴 When the provider cannot express a constrained structure at all, the step FAILS EXPLICITLY
 *    instead of quietly continuing with free text (task §11).
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
import { newContentItemId } from '../../domain/ids/content-item-id.js';
import { attemptParsePromptMessages } from './prompts.js';
import {
  ATTEMPT_PARSE_SCHEMA_ID,
  attemptParseJsonSchema,
  readParsedAttemptPayload,
  structuredOutputRequest,
} from './schemas.js';
import type {
  CaptureFieldKey,
  CaptureRuntimeFailure,
  ParsedKeyParameter,
  StructuredParseOutcome,
} from './types.js';
import { CAPTURE_FIELD_KEYS, runtimeFailure, runtimeFailureFromAiError } from './types.js';

/**
 * Builds the normalized step ② request.
 * 🔴 The model comes from the adapter's CONFIGURATION, never from business logic (AC-132).
 */
export function buildAttemptParseRequest(adapter: ProviderAdapter, raw_text: string): AiRequest {
  return {
    provider_id: adapter.provider_id,
    model: adapter.config.model,
    messages: attemptParsePromptMessages(raw_text),
    structured_output: structuredOutputRequest(ATTEMPT_PARSE_SCHEMA_ID, attemptParseJsonSchema),
  };
}

/* ------------------------------------------------------------------ *
 * Shared structured invocation
 * ------------------------------------------------------------------ */

export type StructuredInvocationOutcome =
  | { readonly kind: 'ok'; readonly value: Readonly<Record<string, unknown>> }
  | CaptureRuntimeFailure;

export interface StructuredInvocation {
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
 *   ③ an adapter error is reported verbatim (fixed M10 message table - never interpolated);
 *   ④ a missing / unparseable / off-schema answer is a runtime failure, never a fabricated
 *      result (task §11).
 */
export async function invokeStructured(
  invocation: StructuredInvocation,
): Promise<StructuredInvocationOutcome> {
  const violations = validateAiRequest(invocation.request);
  if (violations.length > 0) {
    return runtimeFailure(
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
    return runtimeFailure(
      'NO_STRUCTURED_OUTPUT_AVAILABLE',
      'The configured provider offers no constrained-output mode, so a structured parse cannot be guaranteed; refusing to continue on free text alone.',
      false,
    );
  }

  const result: AiResult = await invocation.adapter.execute({
    provider_id: invocation.adapter.provider_id,
    request: invocation.request,
    credential_ref: invocation.credential_ref,
  });

  if (result.kind === 'error') {
    return runtimeFailureFromAiError(result.error);
  }

  if (result.structured !== null) {
    return { kind: 'ok', value: result.structured };
  }

  const evaluated = evaluateStructuredResponse(mode, result.text, invocation.structured_output);
  if (evaluated.kind === 'valid') {
    return { kind: 'ok', value: evaluated.value };
  }
  if (evaluated.kind === 'no_structured_output_available') {
    return runtimeFailure(
      'NO_STRUCTURED_OUTPUT_AVAILABLE',
      'The provider answer carried no constrained structure to validate.',
      false,
    );
  }
  return runtimeFailure(
    'MALFORMED_STRUCTURED_RESULT',
    `The provider answer did not match the requested structure (${evaluated.kind}).`,
    true,
  );
}

/* ------------------------------------------------------------------ *
 * Step ②
 * ------------------------------------------------------------------ */

export interface AttemptParseInput {
  readonly attempt_id: string;
  readonly raw_text: string;
}

/**
 * Parses the user's raw text into an application-local proposal.
 *
 * 🔴 The raw text is sent UNCHANGED (it is the user's `Fact`). The proposal carries only what AI
 *    could support from it; every other field stays `unknown` (AC-04).
 */
export async function parseAttemptText(
  adapter: ProviderAdapter,
  credential_ref: CredentialRef | null,
  input: AttemptParseInput,
): Promise<StructuredParseOutcome> {
  const request = buildAttemptParseRequest(adapter, input.raw_text);
  const structured_output = request.structured_output;
  if (structured_output === null) {
    return runtimeFailure('REQUEST_INVALID', 'The parse request must carry a schema.', false);
  }

  const invoked = await invokeStructured({ adapter, credential_ref, request, structured_output });
  if (invoked.kind === 'runtime_failure') {
    return invoked;
  }

  const read = readParsedAttemptPayload(invoked.value);
  if (read.kind === 'issue') {
    const scoring = read.issue.code === 'FORBIDDEN_NUMERIC_FIELD';
    return runtimeFailure(
      scoring ? 'FORBIDDEN_NUMERIC_FIELD' : 'SCHEMA_VIOLATION',
      read.issue.detail,
      !scoring,
    );
  }

  const payload = read.payload;
  const extractions = CAPTURE_FIELD_KEYS.filter(
    (field) => payload.fields[field] !== undefined,
  ).map((field) => ({ field, value: payload.fields[field] as string }));

  /*
   * 🔴 Each parameter becomes a real OBJECT with its own identity, minted here (the moment the
   *    item is created) and never recomputed afterwards. The AI answer is a plain string array,
   *    so the model has no say in identity, and no list position is ever promoted to an id
   *    (contract §3.2 / task §3 · §6).
   */
  const key_parameters: ParsedKeyParameter[] = payload.key_parameters.map((value) => ({
    content_item_id: newContentItemId(input.attempt_id),
    value,
  }));

  const missing_fields: readonly CaptureFieldKey[] = CAPTURE_FIELD_KEYS.filter(
    (field) => payload.fields[field] === undefined,
  );

  return {
    kind: 'parsed',
    proposal: {
      attempt_id: input.attempt_id,
      parse_status: payload.parse_status,
      extractions,
      key_parameters,
      missing_fields,
      result_status_proposal: payload.result_status_proposal,
    },
  };
}
