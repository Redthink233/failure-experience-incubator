/**
 * S01-05 ｜ Application-local structured-output schemas and payload readers.
 *
 * Contract: §9 ② / §9 ④; §0.4 D ("Structured Output = Provider-native / constrained JSON +
 * schema 校验 + repair·retry；🔴 属实现层，不改变产品语义").
 *
 * 🔴 THESE ARE APPLICATION SCHEMAS, NOT THE PRODUCT DATA SCHEMA. They describe the shape of one
 *    AI answer; they create no field on `Attempt`, no Decision and no AC.
 *
 * 🔴 The JSON-Schema subset is the one `M10` actually validates (`type: object` + `required` +
 *    per-property `type`). "Not extracted" is therefore expressed by OMITTING the key - the AI is
 *    never given a slot in which to write a sentinel such as "N/A" / "未知" / "无".
 *
 * 🔴 NO SCORING VOCABULARY: any answer containing a confidence / probability / score / weight /
 *    importance / similarity key is refused, and no numeric leaf is accepted in a cause answer
 *    (§6.3 rule 5 / AC-23 / AC-93 / D-020 / D-037).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { StructuredOutputRequest } from '../../ai/provider/structured-output.js';
import { PREFERRED_STRUCTURED_OUTPUT_MODE } from '../../ai/provider/structured-output.js';
import type { CaptureFieldKey, ParseRuntimeStatus } from './types.js';
import { CAPTURE_FIELD_KEYS, PARSE_RUNTIME_STATUSES } from './types.js';

/** Caller-owned schema ids. 🔴 Not a product version system (AC-122). */
export const ATTEMPT_PARSE_SCHEMA_ID = 'attempt-structured-parse-v1';
export const CANDIDATE_CAUSE_SCHEMA_ID = 'candidate-cause-analysis-v1';

function stringProperty(): Readonly<Record<string, unknown>> {
  return { type: 'string' };
}

function propertiesFor(keys: readonly string[]): Readonly<Record<string, unknown>> {
  const properties: Record<string, unknown> = {};
  for (const key of keys) {
    properties[key] = stringProperty();
  }
  return properties;
}

/**
 * Step ② schema. Only `parse_status` is required - every content field may legitimately be
 * absent, and its absence IS the `unknown` information (AC-04).
 */
export const attemptParseJsonSchema: Readonly<Record<string, unknown>> = {
  type: 'object',
  required: ['parse_status'],
  properties: {
    ...propertiesFor([
      'parse_status',
      ...CAPTURE_FIELD_KEYS,
      'result_status_proposal',
      'cause_absence_note',
    ]),
    key_parameters: { type: 'array' },
  },
};

/**
 * Step ④ schema. `causes` may be an EMPTY array (AC-91) and `cause_absence_note` is required so
 * that a 0-cause answer can never be silent (AC-92).
 */
export const candidateCauseJsonSchema: Readonly<Record<string, unknown>> = {
  type: 'object',
  required: ['causes', 'cause_absence_note'],
  properties: {
    causes: { type: 'array' },
    cause_absence_note: stringProperty(),
  },
};

export function structuredOutputRequest(
  schema_id: string,
  json_schema: Readonly<Record<string, unknown>>,
): StructuredOutputRequest {
  return {
    schema_id,
    json_schema,
    preferred_mode: PREFERRED_STRUCTURED_OUTPUT_MODE,
  };
}

/* ------------------------------------------------------------------ *
 * Guard ① - scoring vocabulary
 * ------------------------------------------------------------------ */

const FORBIDDEN_SCORING_KEY_PATTERN =
  /(confidence|score|probabilit|likelihood|percent|weight|importance|contribution|similarity|ranking|rank_score|grade)/i;

/** Every dotted path whose KEY names a scoring concept. Empty means "clean". */
export function findForbiddenScoringFields(value: unknown, path = ''): readonly string[] {
  if (value === null || typeof value !== 'object') {
    return [];
  }
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      found.push(...findForbiddenScoringFields(entry, `${path}[${index}]`));
    });
    return found;
  }
  for (const [key, child] of Object.entries(value as Readonly<Record<string, unknown>>)) {
    const childPath = path.length === 0 ? key : `${path}.${key}`;
    if (FORBIDDEN_SCORING_KEY_PATTERN.test(key)) {
      found.push(childPath);
    }
    found.push(...findForbiddenScoringFields(child, childPath));
  }
  return found;
}

/** Dotted paths of every NUMERIC leaf. Used to keep step ④ free of any number (AC-93). */
export function findNumericLeaves(value: unknown, path = ''): readonly string[] {
  if (typeof value === 'number') {
    return [path.length === 0 ? '(root)' : path];
  }
  if (value === null || typeof value !== 'object') {
    return [];
  }
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      found.push(...findNumericLeaves(entry, `${path}[${index}]`));
    });
    return found;
  }
  for (const [key, child] of Object.entries(value as Readonly<Record<string, unknown>>)) {
    found.push(...findNumericLeaves(child, path.length === 0 ? key : `${path}.${key}`));
  }
  return found;
}

/* ------------------------------------------------------------------ *
 * Guard ② - sentinel suppression
 * ------------------------------------------------------------------ */

const SENTINEL_VALUES: readonly string[] = [
  'n/a',
  'na',
  'null',
  'nil',
  'none',
  'undefined',
  'unknown',
  'not provided',
  'not_provided',
  'tbd',
  '-',
  '--',
  '—',
  '未知',
  '未提供',
  '未提及',
  '未说明',
  '不清楚',
  '不知道',
  '无',
  '没有',
  '暂无',
  '待定',
  '空',
  '(空)',
  '（空）',
];

/**
 * True when a returned string must NOT be stored as a field value: a blank string or one of the
 * placeholder tokens the contract forbids (§4.2 rule 7 / AC-04, task §8).
 * 🔴 Such a value is dropped and the field stays `unknown` - the application never keeps the
 *    placeholder, and never invents a real value to replace it either.
 */
export function isSentinelLikeValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }
  return SENTINEL_VALUES.includes(normalized);
}

/* ------------------------------------------------------------------ *
 * Payload readers
 * ------------------------------------------------------------------ */

export type PayloadIssueCode =
  | 'SCHEMA_VIOLATION'
  | 'FORBIDDEN_NUMERIC_FIELD'
  | 'ZERO_CAUSE_WITHOUT_EXPLICIT_STATEMENT';

export interface PayloadIssue {
  readonly code: PayloadIssueCode;
  readonly detail: string;
}

export type PayloadRead<T> =
  | { readonly kind: 'ok'; readonly payload: T }
  | { readonly kind: 'issue'; readonly issue: PayloadIssue };

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readOptionalText(
  source: Readonly<Record<string, unknown>>,
  key: string,
  sanitized_away: string[],
): string | null {
  const raw = source[key];
  if (raw === undefined) {
    return null;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  if (isSentinelLikeValue(raw)) {
    sanitized_away.push(key);
    return null;
  }
  return raw;
}

export interface ParsedAttemptPayload {
  readonly parse_status: ParseRuntimeStatus;
  readonly fields: Readonly<Partial<Record<CaptureFieldKey, string>>>;
  readonly key_parameters: readonly string[];
  readonly result_status_proposal: string | null;
  /** Fields whose returned value was a blank / sentinel token and is therefore `unknown`. */
  readonly sanitized_away: readonly string[];
}

/** Reads and cleans a step ② answer. Never throws; every rejection is an explicit issue. */
export function readParsedAttemptPayload(value: unknown): PayloadRead<ParsedAttemptPayload> {
  if (!isPlainObject(value)) {
    return {
      kind: 'issue',
      issue: { code: 'SCHEMA_VIOLATION', detail: 'A structured parse result must be a JSON object.' },
    };
  }

  const scoring = findForbiddenScoringFields(value);
  if (scoring.length > 0) {
    return {
      kind: 'issue',
      issue: {
        code: 'FORBIDDEN_NUMERIC_FIELD',
        detail: `The parse answer contains scoring vocabulary at: ${scoring.join(', ')} (AC-23 / D-020).`,
      },
    };
  }

  const raw_status = value['parse_status'];
  if (typeof raw_status !== 'string' || !PARSE_RUNTIME_STATUSES.includes(raw_status as ParseRuntimeStatus)) {
    return {
      kind: 'issue',
      issue: {
        code: 'SCHEMA_VIOLATION',
        detail: `parse_status must be one of ${PARSE_RUNTIME_STATUSES.join(' / ')}; received "${String(raw_status)}".`,
      },
    };
  }

  const sanitized_away: string[] = [];
  const fields: Partial<Record<CaptureFieldKey, string>> = {};
  for (const field of CAPTURE_FIELD_KEYS) {
    const text = readOptionalText(value, field, sanitized_away);
    if (text !== null) {
      fields[field] = text;
    }
  }

  const key_parameters: string[] = [];
  const raw_parameters = value['key_parameters'];
  if (raw_parameters !== undefined) {
    if (!Array.isArray(raw_parameters)) {
      return {
        kind: 'issue',
        issue: { code: 'SCHEMA_VIOLATION', detail: 'key_parameters must be an array of strings.' },
      };
    }
    for (const entry of raw_parameters) {
      if (typeof entry !== 'string') {
        return {
          kind: 'issue',
          issue: {
            code: 'SCHEMA_VIOLATION',
            detail: 'key_parameters must contain only strings; a structured value is never accepted here.',
          },
        };
      }
      if (!isSentinelLikeValue(entry)) {
        key_parameters.push(entry);
      }
    }
  }

  return {
    kind: 'ok',
    payload: {
      parse_status: raw_status as ParseRuntimeStatus,
      fields,
      key_parameters,
      result_status_proposal: readOptionalText(value, 'result_status_proposal', sanitized_away),
      sanitized_away,
    },
  };
}

export interface RawCandidateCause {
  readonly statement: string;
  readonly supporting_source_paths: readonly string[];
}

export interface ParsedCausePayload {
  readonly causes: readonly RawCandidateCause[];
  readonly cause_absence_note: string;
}

/** Reads and cleans a step ④ answer. 🔴 A 0-cause answer without an explicit note is refused. */
export function readCausePayload(value: unknown): PayloadRead<ParsedCausePayload> {
  if (!isPlainObject(value)) {
    return {
      kind: 'issue',
      issue: { code: 'SCHEMA_VIOLATION', detail: 'A cause analysis result must be a JSON object.' },
    };
  }

  const scoring = findForbiddenScoringFields(value);
  if (scoring.length > 0) {
    return {
      kind: 'issue',
      issue: {
        code: 'FORBIDDEN_NUMERIC_FIELD',
        detail: `The cause answer contains scoring vocabulary at: ${scoring.join(', ')} (AC-93 / D-020).`,
      },
    };
  }

  const numeric = findNumericLeaves(value);
  if (numeric.length > 0) {
    return {
      kind: 'issue',
      issue: {
        code: 'FORBIDDEN_NUMERIC_FIELD',
        detail: `Step ④ introduces no number at all; numeric value(s) found at: ${numeric.join(', ')} (AC-93).`,
      },
    };
  }

  const raw_causes = value['causes'];
  if (!Array.isArray(raw_causes)) {
    return {
      kind: 'issue',
      issue: { code: 'SCHEMA_VIOLATION', detail: 'causes must be an array (an empty array is legal).' },
    };
  }

  const causes: RawCandidateCause[] = [];
  for (const entry of raw_causes) {
    if (!isPlainObject(entry)) {
      return {
        kind: 'issue',
        issue: { code: 'SCHEMA_VIOLATION', detail: 'Each candidate cause must be a JSON object.' },
      };
    }
    const statement = entry['statement'];
    if (typeof statement !== 'string' || isSentinelLikeValue(statement)) {
      return {
        kind: 'issue',
        issue: {
          code: 'SCHEMA_VIOLATION',
          detail: 'Each candidate cause needs a non-empty statement; a placeholder is not a statement.',
        },
      };
    }
    const raw_paths = entry['supporting_source_paths'];
    const supporting: string[] = [];
    if (raw_paths !== undefined) {
      if (!Array.isArray(raw_paths) || raw_paths.some((item) => typeof item !== 'string')) {
        return {
          kind: 'issue',
          issue: {
            code: 'SCHEMA_VIOLATION',
            detail: 'supporting_source_paths must be an array of field names.',
          },
        };
      }
      for (const item of raw_paths) {
        if (!isSentinelLikeValue(item as string)) {
          supporting.push(item as string);
        }
      }
    }
    causes.push({ statement, supporting_source_paths: supporting });
  }

  const raw_note = value['cause_absence_note'];
  const absence_note = typeof raw_note === 'string' ? raw_note.trim() : '';

  if (causes.length === 0 && absence_note.length === 0) {
    return {
      kind: 'issue',
      issue: {
        code: 'ZERO_CAUSE_WITHOUT_EXPLICIT_STATEMENT',
        detail:
          'A 0-cause result must state 「当前依据不足，暂不推断原因」or an equivalent explicit sentence; silence is not an answer (AC-92).',
      },
    };
  }

  return { kind: 'ok', payload: { causes, cause_absence_note: absence_note } };
}
