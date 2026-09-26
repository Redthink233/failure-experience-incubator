/**
 * M10 ｜ Structured output: capability selection, schema validation, repairability.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D ("Structured Output = Provider-native / constrained JSON + schema 校验 +
 *     repair·retry；🔴 属实现层，不改变产品语义")
 *   - docs/06 §《S00-03 决策同步（2026-09-24，CONFIRMED：D-058–D-062）》 §2
 *
 * 🔴 SCOPE LIMIT (deliberate): this is a MINIMAL validator for the small object-subset the
 *    product actually needs (`type: object` + `required` + per-property `type`). It is NOT a
 *    JSON-Schema implementation and must never be described as one.
 *
 * 🔴 NO PRODUCT PROMPT LIVES HERE. This module knows nothing about `Attempt` / `Cause` /
 *    `Insight` / `Hypothesis`; S01-05 and later own those schemas.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { StructuredOutputMode } from './capability.js';

/** Preferred mode is a PREFERENCE; the capability decides what is actually possible. */
export const PREFERRED_STRUCTURED_OUTPUT_MODE: StructuredOutputMode = 'native_schema';

export interface StructuredOutputRequest {
  /** Caller-owned identifier for the schema (e.g. `attempt-parse-v1`). Not a product version system. */
  readonly schema_id: string;
  /** Minimal object schema: `{ type: 'object', required: [...], properties: { k: { type: 'string' } } }`. */
  readonly json_schema: Readonly<Record<string, unknown>>;
  readonly preferred_mode: StructuredOutputMode;
}

/**
 * Provider-native schema wins whenever the provider offers it; otherwise plain constrained JSON;
 * otherwise `none`. 🔴 `none` is returned as `none` - the caller must then fail explicitly or
 * accept free text, but it must not pretend a constraint exists.
 */
export function selectStructuredOutputMode(
  capability_mode: StructuredOutputMode,
  preferred_mode: StructuredOutputMode,
): StructuredOutputMode {
  if (capability_mode === 'native_schema') {
    return 'native_schema';
  }
  if (capability_mode === 'json_object') {
    return 'json_object';
  }
  if (preferred_mode === 'none') {
    return 'none';
  }
  return 'none';
}

export type SchemaIssueKind =
  | 'not_valid_json'
  | 'not_an_object'
  | 'missing_required'
  | 'unexpected_type'
  | 'unexpected_property';

export interface SchemaIssue {
  /** Dotted path of the offending value; `''` means the root. */
  readonly path: string;
  readonly kind: SchemaIssueKind;
  readonly detail: string;
}

export type SchemaValidationResult =
  | { readonly kind: 'valid'; readonly value: Readonly<Record<string, unknown>>; readonly issues: readonly [] }
  | { readonly kind: 'invalid'; readonly value: null; readonly issues: readonly SchemaIssue[] };

/** Minimal JSON-Schema-subset keywords understood by this module. */
const SUPPORTED_PROPERTY_TYPES: readonly string[] = ['string', 'number', 'boolean', 'object', 'array'];

function jsonTypeOf(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

function validateProperties(
  candidate: Readonly<Record<string, unknown>>,
  schema: Readonly<Record<string, unknown>>,
  issues: SchemaIssue[],
): void {
  const required = Array.isArray(schema['required']) ? schema['required'] : [];
  for (const key of required) {
    if (typeof key === 'string' && !(key in candidate)) {
      issues.push({ path: key, kind: 'missing_required', detail: `Required property "${key}" is absent.` });
    }
  }

  const properties = schema['properties'];
  if (properties === null || typeof properties !== 'object' || Array.isArray(properties)) {
    return;
  }
  for (const [key, raw_spec] of Object.entries(properties as Readonly<Record<string, unknown>>)) {
    if (!(key in candidate)) {
      continue;
    }
    const spec = raw_spec as Readonly<Record<string, unknown>>;
    const expected = spec['type'];
    if (typeof expected !== 'string' || !SUPPORTED_PROPERTY_TYPES.includes(expected)) {
      continue;
    }
    const actual = jsonTypeOf(candidate[key]);
    const matches = expected === 'number' ? actual === 'number' : actual === expected;
    if (!matches) {
      issues.push({
        path: key,
        kind: 'unexpected_type',
        detail: `Property "${key}" must be "${expected}" but was "${actual}".`,
      });
    }
  }
}

/** Validates an already-parsed JSON value against the minimal schema subset. */
export function validateStructuredValue(
  candidate: unknown,
  json_schema: Readonly<Record<string, unknown>>,
): SchemaValidationResult {
  const issues: SchemaIssue[] = [];
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
    issues.push({
      path: '',
      kind: 'not_an_object',
      detail: 'A structured result must be a JSON object.',
    });
    return { kind: 'invalid', value: null, issues };
  }
  validateProperties(candidate as Readonly<Record<string, unknown>>, json_schema, issues);
  if (issues.length > 0) {
    return { kind: 'invalid', value: null, issues };
  }
  return { kind: 'valid', value: candidate as Readonly<Record<string, unknown>>, issues: [] };
}

/** Parses provider text and validates it in one step. Unparseable text is its own issue kind. */
export function validateStructuredText(
  text: string,
  json_schema: Readonly<Record<string, unknown>>,
): SchemaValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return {
      kind: 'invalid',
      value: null,
      issues: [{ path: '', kind: 'not_valid_json', detail: 'The provider response is not valid JSON.' }],
    };
  }
  return validateStructuredValue(parsed, json_schema);
}

/**
 * Repairability rule (implementation parameter, deliberately simple and testable):
 *   - STRUCTURAL damage (not JSON / root not an object) is NOT repairable by re-prompting:
 *     the response cannot be interpreted at all;
 *   - FIELD-LEVEL damage (missing required property / wrong primitive type) IS repairable:
 *     a constrained retry can plausibly fix it.
 */
export function isRepairable(issues: readonly SchemaIssue[]): boolean {
  if (issues.length === 0) {
    return false;
  }
  return issues.every((issue) => issue.kind === 'missing_required' || issue.kind === 'unexpected_type' || issue.kind === 'unexpected_property');
}

export type StructuredOutcome =
  | { readonly kind: 'valid'; readonly value: Readonly<Record<string, unknown>> }
  | { readonly kind: 'repairable_error'; readonly issues: readonly SchemaIssue[] }
  | { readonly kind: 'non_repairable_error'; readonly issues: readonly SchemaIssue[] }
  | { readonly kind: 'no_structured_output_available' };

/** Combines mode selection and validation into the single outcome a caller acts on. */
export function evaluateStructuredResponse(
  mode: StructuredOutputMode,
  text: string,
  request: StructuredOutputRequest | null,
): StructuredOutcome {
  if (request === null) {
    return { kind: 'no_structured_output_available' };
  }
  if (mode === 'none') {
    return { kind: 'no_structured_output_available' };
  }
  const result = validateStructuredText(text, request.json_schema);
  if (result.kind === 'valid') {
    return { kind: 'valid', value: result.value };
  }
  if (isRepairable(result.issues)) {
    return { kind: 'repairable_error', issues: result.issues };
  }
  return { kind: 'non_repairable_error', issues: result.issues };
}
