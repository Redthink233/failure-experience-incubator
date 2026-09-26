/**
 * S01 ｜ `M9` structured-output schemas and payload readers for step ⑨.
 *
 * Contract: §0.4 D (Structured Output = provider-native / constrained JSON + schema validation +
 * repair·retry; 🔴 an implementation-layer concern that changes no product semantics), §8.2
 * (grounding is binary, the two source partitions, no third 「混合」 label), §8.3 (the count), §9.2
 * (the three exits), `D-028`, `D-037` (no numeric judgement quantity), `TQ34`.
 *
 * 🔴 THESE ARE APPLICATION SCHEMAS, NOT THE PRODUCT DATA SCHEMA. They describe the shape of ONE AI
 *    answer; they create no field on `Hypothesis`, no Decision and no AC.
 * 🔴 NO SCORING VOCABULARY AND NO NUMBER AT ALL IS ACCEPTED AS A VALUE: `score` / `confidence` /
 *    `probability` / `percentage` / `quality_level` / `evidence_strength` / `rank` / `grade` are
 *    refused BY NAME, and a numeric JSON leaf anywhere is refused, so "the model picked a threshold"
 *    is structurally impossible (`D-020` / `D-037`).
 *    🔴 NOTE the deliberate difference from step ⑧: DIGITS INSIDE PROSE are allowed here, because a
 *    criterion may legitimately cite a threshold the HISTORY recorded (「降到 50 摄氏度」). What is
 *    refused is a numeric FIELD, which is how a manufactured threshold would arrive.
 * 🔴 THE MODEL MAY NOT DECIDE THE OBJECT: any `status` / `state` / `decision_state` / `kind` /
 *    `saved` key is refused (`§22`), and a boolean `grounded` self-claim is refused too - the
 *    grounding verdict belongs to the structural pass plus an INDEPENDENT discrete check (§8).
 * 🔴 THE MODEL MAY NOT NAME A DIFFERENT OBJECT: 「候选经验」/ `Candidate Insight` / 「经验资产」 are
 *    refused, because ⑨ produces a `Hypothesis` or a `Model Suggestion` and nothing else (§8.1).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { StructuredOutputRequest } from '../../ai/provider/structured-output.js';
import { PREFERRED_STRUCTURED_OUTPUT_MODE } from '../../ai/provider/structured-output.js';
import { GROUNDING_BASES } from '../../domain/types/hypothesis.js';
import type { GroundingBasis } from '../../domain/types/hypothesis.js';
import { REF_ROLES } from '../../domain/types/evidence-ref.js';
import type { RefRole } from '../../domain/types/evidence-ref.js';
import {
  citedAttemptIdsIn,
  findForbiddenObjectNaming,
  findForbiddenProofWording,
  findKeepUnchangedClaim,
  normalizeProposalText,
  singleRecordGeneralizationGuard,
} from './text.js';
import type {
  GroundedHypothesisProposal,
  GroundingCheckEntryProposal,
  GroundingCheckProposal,
  HypothesisEvidenceSelection,
  HypothesisExitRoute,
  HypothesisGenerationProposal,
  HypothesisKeepProposal,
  HypothesisPayloadIssue,
  ModelSuggestionProposal,
} from './types.js';
import { HYPOTHESIS_EXIT_ROUTES } from './types.js';
import { CRITERIA_CHECK_VALUES, GROUNDING_CHECK_VALUES } from './verifiability.js';

/** Caller-owned schema ids. 🔴 Not a product version system (AC-122). */
export const HYPOTHESIS_GENERATION_SCHEMA_ID = 'hypothesis-generation-v1';
export const HYPOTHESIS_GROUNDING_CHECK_SCHEMA_ID = 'hypothesis-grounding-check-v1';

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

/**
 * Step ⑨ schema.
 *
 * `grounded` may be an EMPTY array (a legal zero-output result) and `exit_route` is required so that
 * "0 grounded hypotheses" is always accompanied by an explicit route (§9.2).
 */
export const hypothesisGenerationJsonSchema: Readonly<Record<string, unknown>> = {
  type: 'object',
  required: ['grounded', 'model_suggestions', 'exit_route'],
  properties: {
    grounded: { type: 'array' },
    model_suggestions: { type: 'array' },
    exit_route: { type: 'string' },
    absence_statement: { type: 'string' },
  },
};

/** The independent discrete grounding / criteria check schema (§8). */
export const hypothesisGroundingCheckJsonSchema: Readonly<Record<string, unknown>> = {
  type: 'object',
  required: ['checks'],
  properties: {
    checks: { type: 'array' },
  },
};

/* ------------------------------------------------------------------ *
 * 1. Structural guards over an answer
 * ------------------------------------------------------------------ */

/**
 * Key names that carry a numeric judgement quantity (`D-020` / `D-037` / AC-23).
 *
 * 🔴 Deliberately duplicated from the sibling step rather than imported: the application modules do
 *    not import each other's internals (each is a `D9` step boundary owned by its own task), and a
 *    shared helper module would be a new layer that neither task authorises.
 */
const FORBIDDEN_SCORING_KEY_PATTERN =
  /(confidence|score|probabilit|likelihood|percent|weight|importance|contribution|similarity|ranking|rank_score|grade|quality_level|evidence_strength|strength)/i;

/**
 * Key names through which the model could try to decide the object itself (§22 / §8).
 *
 * 🔴 `kind` is in the list because which of the two kinds was produced is decided by WHICH ARRAY the
 *    entry is in - a self-declared `kind` would let the model relabel a `Model Suggestion` as
 *    `grounded`.
 */
const FORBIDDEN_STATE_KEY_PATTERN =
  /^(status|state|decision_state|decision|accepted|is_accepted|saved|saved_by_user|kind|object_type|experience_asset|is_experience_asset|grounded_flag)$/i;

/** The exact string that would name the wrong object type when used as a bare value (§8.1). */
const FORBIDDEN_BARE_OBJECT_VALUES: readonly string[] = ['candidate', 'partial', 'partial_grounding'];

/** Key names that would open a third source-partition label (§8.2 rule 2). */
const FORBIDDEN_PARTITION_KEY_PATTERN = /^(source_partition|source_partitions|mixed_source|mixed_source_partition|partition)$/i;

/** Key names that would introduce a «partially anchored» middle grade (§8.2 rule 1 / `TQ34`). */
const FORBIDDEN_PARTIAL_GROUNDING_KEY_PATTERN = /^(partial_grounding|partially_anchored|grounding_partial|anchor_level)$/i;

/** A boolean self-declaration of grounding. The verdict is never the model's to give (§8). */
const GROUNDING_SELF_CLAIM_KEY_PATTERN = /^(grounded|is_grounded|history_grounded|is_history_grounded)$/i;

/** Every dotted path whose KEY names a scoring concept. Empty means 「clean」. */
export function findForbiddenScoringFields(value: unknown, path = ''): readonly string[] {
  return collectKeysMatching(value, path, (key) => FORBIDDEN_SCORING_KEY_PATTERN.test(key));
}

/**
 * 🔴 THE ONE COLLISION, RESOLVED BY PATH.
 *
 * `kind` is refused as a PROPOSAL-level key, because which of the two kinds was produced is decided
 * by WHICH ARRAY the entry sits in - a self-declared `kind` would let the model relabel a
 * `Model Suggestion` as `grounded`. Inside ⑤, however, `kind` is a MANDATORY discriminator of the
 * two legitimate ⑤ forms (`historical_ref` / `model_recommendation`, §8.6 rule 7 / §15). The collision
 * is therefore resolved by PATH: only `...keep.kind` is admitted; every other occurrence of `kind`
 * (anywhere, at any depth) is still refused.
 */
const KEEP_KIND_PATH = /\.keep\.kind$/;

/** Every dotted path whose KEY tries to decide the object. Empty means 「clean」. */
export function findForbiddenStateFields(value: unknown, path = ''): readonly string[] {
  return collectKeysMatching(value, path, (key) => FORBIDDEN_STATE_KEY_PATTERN.test(key)).filter(
    (found) => !KEEP_KIND_PATH.test(found),
  );
}

/** Every dotted path whose KEY would open a third source partition. Empty means 「clean」. */
export function findForbiddenPartitionFields(value: unknown, path = ''): readonly string[] {
  return collectKeysMatching(value, path, (key) => FORBIDDEN_PARTITION_KEY_PATTERN.test(key));
}

/** Every dotted path whose KEY would introduce a middle grounding grade. Empty means 「clean」. */
export function findForbiddenPartialGroundingFields(
  value: unknown,
  path = '',
): readonly string[] {
  return collectKeysMatching(value, path, (key) =>
    FORBIDDEN_PARTIAL_GROUNDING_KEY_PATTERN.test(key),
  );
}

/** Every dotted path whose KEY carries a boolean self-declaration of grounding. */
export function findGroundingSelfClaimFields(value: unknown, path = ''): readonly string[] {
  if (value === null || typeof value !== 'object') {
    return [];
  }
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      found.push(...findGroundingSelfClaimFields(entry, `${path}[${index}]`));
    });
    return found;
  }
  for (const [key, child] of Object.entries(value as Readonly<Record<string, unknown>>)) {
    const childPath = path.length === 0 ? key : `${path}.${key}`;
    if (typeof child === 'boolean' && GROUNDING_SELF_CLAIM_KEY_PATTERN.test(key)) {
      found.push(childPath);
    }
    found.push(...findGroundingSelfClaimFields(child, childPath));
  }
  return found;
}

/** Dotted paths of every NUMERIC leaf. Step ⑨ carries no numeric FIELD anywhere (`D-037`). */
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

/** Every dotted path whose STRING leaf is exactly one of the forbidden bare object values. */
export function findForbiddenBareObjectValues(value: unknown, path = ''): readonly string[] {
  if (typeof value === 'string') {
    return FORBIDDEN_BARE_OBJECT_VALUES.includes(value.trim().toLowerCase()) ? [path] : [];
  }
  if (value === null || typeof value !== 'object') {
    return [];
  }
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      found.push(...findForbiddenBareObjectValues(entry, `${path}[${index}]`));
    });
    return found;
  }
  for (const [key, child] of Object.entries(value as Readonly<Record<string, unknown>>)) {
    found.push(...findForbiddenBareObjectValues(child, path.length === 0 ? key : `${path}.${key}`));
  }
  return found;
}

function collectKeysMatching(
  value: unknown,
  path: string,
  matches: (key: string) => boolean,
): readonly string[] {
  if (value === null || typeof value !== 'object') {
    return [];
  }
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      found.push(...collectKeysMatching(entry, `${path}[${index}]`, matches));
    });
    return found;
  }
  for (const [key, child] of Object.entries(value as Readonly<Record<string, unknown>>)) {
    const childPath = path.length === 0 ? key : `${path}.${key}`;
    if (matches(key)) {
      found.push(childPath);
    }
    found.push(...collectKeysMatching(child, childPath, matches));
  }
  return found;
}

/* ------------------------------------------------------------------ *
 * 2. Reader helpers
 * ------------------------------------------------------------------ */

export type HypothesisPayloadRead<T> =
  | { readonly kind: 'ok'; readonly payload: T }
  | { readonly kind: 'issue'; readonly issues: readonly HypothesisPayloadIssue[] };

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function issue(
  code: HypothesisPayloadIssue['code'],
  path: string,
  detail: string,
): HypothesisPayloadIssue {
  return { code, path, detail };
}

/**
 * Reads an OPTIONAL item.
 *
 * 🔴 A blank string is NEVER a substitute for 「显式缺失」 (§13 / H4): it is refused outright, because
 *    an empty value would be indistinguishable from 「缺失」 while looking like content.
 */
function readOptionalItem(
  record: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: HypothesisPayloadIssue[],
): string | null {
  const raw = record[key];
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw !== 'string') {
    issues.push(issue('SCHEMA_VIOLATION', `${path}.${key}`, `${key} must be a string or null.`));
    return null;
  }
  if (raw.trim().length === 0) {
    issues.push(
      issue(
        'SCHEMA_VIOLATION',
        `${path}.${key}`,
        `${key} must not be a blank string: 「显式缺失」 is expressed by omitting the key or by null, never by an empty string (§13).`,
      ),
    );
    return null;
  }
  return raw;
}

function readRequiredText(
  record: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: HypothesisPayloadIssue[],
): string {
  const raw = record[key];
  if (!isNonBlank(raw)) {
    issues.push(issue('SCHEMA_VIOLATION', `${path}.${key}`, `${key} must be a non-blank string.`));
    return '';
  }
  return raw;
}

function readGroundingBases(
  value: unknown,
  path: string,
  issues: HypothesisPayloadIssue[],
): readonly GroundingBasis[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push(issue('SCHEMA_VIOLATION', path, 'grounding_bases must be an array.'));
    return [];
  }
  const bases: GroundingBasis[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== 'string' || !(GROUNDING_BASES as readonly string[]).includes(entry)) {
      issues.push(
        issue(
          'SCHEMA_VIOLATION',
          `${path}[${index}]`,
          `A grounding basis must be one of ${GROUNDING_BASES.join(' / ')} (§8.2).`,
        ),
      );
      return;
    }
    bases.push(entry as GroundingBasis);
  });
  return bases;
}

function readEvidenceSelections(
  value: unknown,
  path: string,
  issues: HypothesisPayloadIssue[],
  options: { readonly allow_missing: boolean },
): readonly HypothesisEvidenceSelection[] {
  if (value === undefined || value === null) {
    if (options.allow_missing) {
      return [];
    }
    issues.push(
      issue(
        'SCHEMA_VIOLATION',
        path,
        'evidence_selections must be an array (an empty array is legal, but the key must be present for a grounded hypothesis).',
      ),
    );
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push(issue('SCHEMA_VIOLATION', path, 'evidence_selections must be an array.'));
    return [];
  }
  const selections: HypothesisEvidenceSelection[] = [];
  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isPlainObject(entry)) {
      issues.push(issue('SCHEMA_VIOLATION', entryPath, 'Each selection must be an object.'));
      return;
    }
    const target_id = entry['target_id'];
    const source_field_path = entry['source_field_path'];
    const role = entry['role'];
    const basis = entry['grounding_basis'];
    if (!isNonBlank(target_id)) {
      issues.push(
        issue('SCHEMA_VIOLATION', `${entryPath}.target_id`, 'target_id must be a non-blank string.'),
      );
      return;
    }
    if (!isNonBlank(source_field_path)) {
      issues.push(
        issue(
          'SCHEMA_VIOLATION',
          `${entryPath}.source_field_path`,
          'source_field_path must be a non-blank string.',
        ),
      );
      return;
    }
    if (typeof role !== 'string' || !(REF_ROLES as readonly string[]).includes(role)) {
      issues.push(
        issue(
          'SCHEMA_VIOLATION',
          `${entryPath}.role`,
          `role must be one of ${REF_ROLES.join(' / ')} (§5.2 rule 1).`,
        ),
      );
      return;
    }
    let grounding_basis: GroundingBasis | null = null;
    if (basis !== undefined && basis !== null) {
      if (typeof basis !== 'string' || !(GROUNDING_BASES as readonly string[]).includes(basis)) {
        issues.push(
          issue(
            'SCHEMA_VIOLATION',
            `${entryPath}.grounding_basis`,
            `grounding_basis must be one of ${GROUNDING_BASES.join(' / ')} or null (§8.2).`,
          ),
        );
        return;
      }
      grounding_basis = basis as GroundingBasis;
    }
    selections.push({
      target_id,
      source_field_path,
      role: role as RefRole,
      grounding_basis,
    });
  });
  return selections;
}

/**
 * Reads ⑤.
 *
 * 🔴 A `model_recommendation` that asserts 「保持不变」 is refused (`K5`): a kept condition must be a
 *    REFERENCE to a condition the history really recorded. When history is unknown the only legal
 *    forms are 「设为 Y」 or an explicit omission.
 */
function readKeep(
  value: unknown,
  path: string,
  issues: HypothesisPayloadIssue[],
): HypothesisKeepProposal | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isPlainObject(value)) {
    issues.push(issue('SCHEMA_VIOLATION', path, 'keep must be an object or null.'));
    return null;
  }
  const kind = value['kind'];
  if (kind === 'historical_ref') {
    const target_id = value['target_id'];
    const source_field_path = value['source_field_path'];
    if (!isNonBlank(target_id) || !isNonBlank(source_field_path)) {
      issues.push(
        issue(
          'SCHEMA_VIOLATION',
          path,
          'A historical_ref keep needs a non-blank target_id and source_field_path; a kept historical condition is a REFERENCE, never prose (§8.6 rule 7).',
        ),
      );
      return null;
    }
    return { kind: 'historical_ref', target_id, source_field_path };
  }
  if (kind === 'model_recommendation') {
    const text = value['text'];
    if (!isNonBlank(text)) {
      issues.push(
        issue('SCHEMA_VIOLATION', `${path}.text`, 'A model_recommendation keep needs a non-blank text.'),
      );
      return null;
    }
    const unchanged = findKeepUnchangedClaim(text);
    if (unchanged.length > 0) {
      issues.push(
        issue(
          'KEEP_UNCHANGED_WITHOUT_HISTORICAL_FACT',
          path,
          `⑤ asserts 「${unchanged.join('", "')}」 without referring to a condition the history recorded. A condition that history left unknown may never be kept unchanged - only 「设为 Y」 or an explicit omission is legal (§8.6 rule 7 / K5).`,
        ),
      );
      return null;
    }
    return { kind: 'model_recommendation', text };
  }
  issues.push(
    issue(
      'SCHEMA_VIOLATION',
      `${path}.kind`,
      'keep.kind must be "historical_ref" or "model_recommendation".',
    ),
  );
  return null;
}

/* ------------------------------------------------------------------ *
 * 3. Shared guards applied to every text the answer produced
 * ------------------------------------------------------------------ */

function assertNoForbiddenWording(
  texts: readonly (string | null)[],
  path: string,
  issues: HypothesisPayloadIssue[],
): void {
  for (const text of texts) {
    if (text === null || text.trim().length === 0) {
      continue;
    }
    const naming = findForbiddenObjectNaming(text);
    if (naming.length > 0) {
      issues.push(
        issue(
          'FORBIDDEN_OBJECT_NAMING',
          path,
          `The text calls the output "${naming.join('", "')}". Step ⑨ produces a History-grounded Hypothesis or a Model Suggestion - never a 候选经验 / 经验资产 (§8.1).`,
        ),
      );
    }
    const proof = findForbiddenProofWording(text);
    if (proof.length > 0) {
      issues.push(
        issue(
          'FORBIDDEN_WORDING',
          path,
          `The text asserts a proven fact ("${proof.join('", "')}"); a Hypothesis stays an Inference for its whole life (D-038).`,
        ),
      );
    }
  }
}

/** The evidence-selection signature of one grounded proposal, used to detect count padding. */
function selectionSignature(
  selections: readonly HypothesisEvidenceSelection[],
): string {
  return selections
    .map((entry) => `${entry.target_id}|${entry.source_field_path}`)
    .sort()
    .join(';');
}

/* ------------------------------------------------------------------ *
 * 4. Step ⑨ reader
 * ------------------------------------------------------------------ */

export interface ReadHypothesisGenerationOptions {
  /**
   * `true` when at least one related, referenceable content candidate exists.
   *
   * 🔴 When it is `false`, ANY grounded entry in the answer is a structural violation: the model
   *    would be claiming a historical basis that does not exist (§6 / §8.1).
   */
  readonly grounding_possible: boolean;
}

function readGroundedEntry(
  entry: Readonly<Record<string, unknown>>,
  path: string,
  issues: HypothesisPayloadIssue[],
): GroundedHypothesisProposal | null {
  const statement = readRequiredText(entry, 'hypothesis_statement', path, issues);
  const rationale = readRequiredText(entry, 'rationale', path, issues);
  const next_change = readRequiredText(entry, 'next_change', path, issues);
  if (statement.length === 0 || rationale.length === 0 || next_change.length === 0) {
    return null;
  }
  const keep = readKeep(entry['keep'], `${path}.keep`, issues);
  const observation_metric = readOptionalItem(entry, 'observation_metric', path, issues);
  const support_criterion = readOptionalItem(entry, 'support_criterion', path, issues);
  const refutation_criterion = readOptionalItem(entry, 'refutation_criterion', path, issues);
  const evidence_selections = readEvidenceSelections(
    entry['evidence_selections'],
    `${path}.evidence_selections`,
    issues,
    { allow_missing: false },
  );
  const grounding_bases = readGroundingBases(
    entry['grounding_bases'],
    `${path}.grounding_bases`,
    issues,
  );

  assertNoForbiddenWording(
    [
      statement,
      rationale,
      next_change,
      observation_metric,
      support_criterion,
      refutation_criterion,
      keep !== null && keep.kind === 'model_recommendation' ? keep.text : '',
    ],
    path,
    issues,
  );

  /*
   * 🔴 H6: a historical fact cited in ② must be findable among the references. Any `ATT_`-shaped
   *    token in `rationale` that no selection points at would be an unsupported appeal to history.
   */
  const selected_targets = new Set(evidence_selections.map((selection) => selection.target_id));
  for (const cited of citedAttemptIdsIn(rationale)) {
    if (!selected_targets.has(cited)) {
      issues.push(
        issue(
          'SCHEMA_VIOLATION',
          `${path}.rationale`,
          `② cites "${cited}" as a historical fact, but no selection points at it; every historical fact named in the basis must be findable among the references (H6 / §8.2).`,
        ),
      );
    }
  }

  /*
   * 🔴 `N = 1` guard: one record can never establish a general rule (D-007 / D-021 E4). It is a
   *    deterministic check over the produced text, so prompt wording cannot circumvent it.
   */
  const guard = singleRecordGeneralizationGuard({
    distinct_evidence_targets: selected_targets.size,
    statement,
  });
  if (!guard.allowed) {
    issues.push(
      issue('GENERALIZED_CLAIM_FROM_SINGLE_SOURCE', `${path}.hypothesis_statement`, guard.detail),
    );
  }

  return {
    hypothesis_statement: statement,
    rationale,
    next_change,
    keep,
    observation_metric,
    support_criterion,
    refutation_criterion,
    evidence_selections,
    grounding_bases,
  };
}

/** The `ATT_`-shaped tokens inside a text - read through the shared helper. */
function citedAttemptIdsOf(text: string): readonly string[] {
  return citedAttemptIdsIn(text);
}

function readModelSuggestionEntry(
  entry: Readonly<Record<string, unknown>>,
  path: string,
  issues: HypothesisPayloadIssue[],
): ModelSuggestionProposal | null {
  const statement = readRequiredText(entry, 'hypothesis_statement', path, issues);
  const rationale = readRequiredText(entry, 'rationale', path, issues);
  const next_change = readRequiredText(entry, 'next_change', path, issues);
  if (statement.length === 0 || rationale.length === 0 || next_change.length === 0) {
    return null;
  }
  const keep = readKeep(entry['keep'], `${path}.keep`, issues);
  const observation_metric = readOptionalItem(entry, 'observation_metric', path, issues);
  const support_criterion = readOptionalItem(entry, 'support_criterion', path, issues);
  const refutation_criterion = readOptionalItem(entry, 'refutation_criterion', path, issues);

  /*
   * 🔴 §20 / §8.4: a Model Suggestion carries NO `EvidenceRef` and NEVER claims history. An empty
   *    selection array is tolerated (it says the same thing), a non-empty one is refused.
   */
  const raw_selections = entry['evidence_selections'];
  if (raw_selections !== undefined && raw_selections !== null) {
    if (!Array.isArray(raw_selections)) {
      issues.push(
        issue('SCHEMA_VIOLATION', `${path}.evidence_selections`, 'evidence_selections must be an array.'),
      );
    } else if (raw_selections.length > 0) {
      issues.push(
        issue(
          'MODEL_SUGGESTION_SELECTED_EVIDENCE',
          `${path}.evidence_selections`,
          'A Model Suggestion must select no evidence at all: its EvidenceRef[] is empty by definition, it never grounds and it always counts 0 toward N_引用 (§8.4 / D-042).',
        ),
      );
    }
  }
  const bases = entry['grounding_bases'];
  if (Array.isArray(bases) && bases.length > 0) {
    issues.push(
      issue(
        'MODEL_SUGGESTION_CLAIMS_HISTORY',
        `${path}.grounding_bases`,
        'A Model Suggestion declares no grounding basis: it is 【模型先验】 for its whole life and may never be upgraded to History-grounded (§8.2 rule 3 / §8.4).',
      ),
    );
  }

  const texts = [
    statement,
    rationale,
    next_change,
    observation_metric,
    support_criterion,
    refutation_criterion,
    keep !== null && keep.kind === 'model_recommendation' ? keep.text : '',
  ];
  assertNoForbiddenWording(texts, path, issues);
  for (const text of texts) {
    if (text === null || text.trim().length === 0) {
      continue;
    }
    if (citedAttemptIdsOf(text).length > 0) {
      issues.push(
        issue(
          'MODEL_SUGGESTION_CLAIMS_HISTORY',
          path,
          'A Model Suggestion must not name a historical record: ② and ③ may never fabricate a historical basis (§8.4).',
        ),
      );
    }
  }

  return {
    hypothesis_statement: statement,
    rationale,
    next_change,
    keep,
    observation_metric,
    support_criterion,
    refutation_criterion,
  };
}

/**
 * Reads and cleans one step ⑨ answer.
 *
 * 🔴 Never repairs and never guesses: every violation is an explicit issue and the WHOLE answer is
 *    refused, so a partially accepted answer can never become a persisted `Hypothesis`.
 */
export function readHypothesisGenerationPayload(
  value: unknown,
  options: ReadHypothesisGenerationOptions,
): HypothesisPayloadRead<HypothesisGenerationProposal> {
  const issues: HypothesisPayloadIssue[] = [];
  if (!isPlainObject(value)) {
    return {
      kind: 'issue',
      issues: [issue('SCHEMA_VIOLATION', '', 'A step ⑨ result must be a JSON object.')],
    };
  }

  const scoring = findForbiddenScoringFields(value);
  if (scoring.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'FORBIDDEN_SCORING_FIELD',
          scoring.join(', '),
          'Step ⑨ refuses score / confidence / probability / percentage / quality_level / evidence_strength / rank / grade; grounding is binary and ⑦⑧ are observable criteria (D-037 / TQ34).',
        ),
      ],
    };
  }
  const numbers = findNumericLeaves(value);
  if (numbers.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'FORBIDDEN_SCORING_FIELD',
          numbers.join(', '),
          'Step ⑨ accepts no numeric FIELD at all, so no supplied number can act as a threshold; a threshold may only be cited inside prose when the history recorded it (§18 / D-037).',
        ),
      ],
    };
  }
  const stateClaims = findForbiddenStateFields(value);
  if (stateClaims.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'AI_CLAIMED_DECISION_STATE',
          stateClaims.join(', '),
          'The model may not decide the object: the kind comes from which array the entry is in, and the decision slot changes only through an explicit user action (§22 / §8.4).',
        ),
      ],
    };
  }
  const partitions = findForbiddenPartitionFields(value);
  if (partitions.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'FORBIDDEN_MIXED_SOURCE_PARTITION',
          partitions.join(', '),
          'There are exactly two source partitions (【历史证据】/【模型先验】) and 「混合」is never a label; which partitions are present is DERIVED by the application, not declared by the model (§8.2 rule 2).',
        ),
      ],
    };
  }
  const partials = findForbiddenPartialGroundingFields(value);
  if (partials.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'FORBIDDEN_PARTIAL_GROUNDING',
          partials.join(', '),
          'Grounding is binary: there is no 「部分锚定」 and no middle grade (TQ34 / §8.2 rule 1).',
        ),
      ],
    };
  }
  const selfClaims = findGroundingSelfClaimFields(value);
  if (selfClaims.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'AI_CLAIMED_GROUNDING_FLAG',
          selfClaims.join(', '),
          'The model may not declare itself grounded: the verdict comes from the structural pass plus an INDEPENDENT discrete check, never from the same payload that made the claim (§8.2).',
        ),
      ],
    };
  }
  const bareObjects = findForbiddenBareObjectValues(value);
  if (bareObjects.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'FORBIDDEN_OBJECT_NAMING',
          bareObjects.join(', '),
          'The value "candidate" (and any 「部分锚定」 value) names an object ⑨ does not produce and a grounding grade that does not exist (§8.1 / §8.2 rule 1).',
        ),
      ],
    };
  }

  const raw_grounded = value['grounded'];
  if (!Array.isArray(raw_grounded)) {
    return {
      kind: 'issue',
      issues: [issue('SCHEMA_VIOLATION', 'grounded', 'grounded must be an array (empty is legal).')],
    };
  }
  const raw_models = value['model_suggestions'];
  if (!Array.isArray(raw_models)) {
    return {
      kind: 'issue',
      issues: [
        issue('SCHEMA_VIOLATION', 'model_suggestions', 'model_suggestions must be an array (empty is legal).'),
      ],
    };
  }
  const raw_exit = value['exit_route'];
  if (typeof raw_exit !== 'string') {
    return {
      kind: 'issue',
      issues: [issue('SCHEMA_VIOLATION', 'exit_route', 'exit_route must be a string.')],
    };
  }

  /* 🔴 §8.3 / Q3: the count is 1-2. A third grounded entry is refused, never trimmed. */
  if (raw_grounded.length > 2) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'TOO_MANY_GROUNDED_HYPOTHESES',
          'grounded',
          `A generation produces at most 2 History-grounded hypotheses; received ${String(raw_grounded.length)} (§8.3 / Q3).`,
        ),
      ],
    };
  }

  /* 🔴 §6: with no usable grounding source, NOTHING may be grounded. */
  if (!options.grounding_possible && raw_grounded.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'GROUNDED_WITHOUT_GROUNDING_SOURCES',
          'grounded',
          'N_检索 = 0 or no related referenceable content exists, so the grounded count MUST be 0; a Model Suggestion may never fill a History-grounded position (§6).',
        ),
      ],
    };
  }

  const grounded: GroundedHypothesisProposal[] = [];
  raw_grounded.forEach((entry, index) => {
    const path = `grounded[${index}]`;
    if (!isPlainObject(entry)) {
      issues.push(issue('SCHEMA_VIOLATION', path, 'Each grounded hypothesis must be an object.'));
      return;
    }
    const read = readGroundedEntry(entry, path, issues);
    if (read !== null) {
      grounded.push(read);
    }
  });

  const model_suggestions: ModelSuggestionProposal[] = [];
  raw_models.forEach((entry, index) => {
    const path = `model_suggestions[${index}]`;
    if (!isPlainObject(entry)) {
      issues.push(issue('SCHEMA_VIOLATION', path, 'Each model suggestion must be an object.'));
      return;
    }
    const read = readModelSuggestionEntry(entry, path, issues);
    if (read !== null) {
      model_suggestions.push(read);
    }
  });

  /* 🔴 Q4: two entries that are the same claim, or the same change over the same evidence. */
  grounded.forEach((entry, index) => {
    for (let other = index + 1; other < grounded.length; other += 1) {
      const candidate = grounded[other];
      if (candidate === undefined) {
        continue;
      }
      if (
        normalizeProposalText(entry.hypothesis_statement) ===
        normalizeProposalText(candidate.hypothesis_statement)
      ) {
        issues.push(
          issue(
            'DUPLICATE_HYPOTHESIS_STATEMENT',
            `grounded[${String(other)}].hypothesis_statement`,
            'Two grounded hypotheses state the same proposition; a second entry must be an INDEPENDENT direction, not a rewrite (§8.3 / Q4).',
          ),
        );
        continue;
      }
      if (
        normalizeProposalText(entry.next_change) === normalizeProposalText(candidate.next_change) &&
        selectionSignature(entry.evidence_selections) === selectionSignature(candidate.evidence_selections)
      ) {
        issues.push(
          issue(
            'GROUNDED_COUNT_PADDING',
            `grounded[${String(other)}]`,
            'Two grounded hypotheses change the same thing against the same evidence, so they are not two independent directions; padding the count toward 2 is refused (§8.3 / Q4).',
          ),
        );
      }
    }
  });

  /*
   * 🔴 §8.2 `N4` is deliberately NOT a payload-level refusal here: a grounded entry that declares no
   *    basis has 「关键变量完全来自模型先验」 and is reported as that condition by the grounding pass,
   *    which keeps the failure attributable per proposal instead of discarding the whole answer.
   *    All other `N` conditions are structural and are settled the same way.
   */
  if (issues.length > 0) {
    return { kind: 'issue', issues };
  }

  if (grounded.length > 0) {
    if (raw_exit !== 'NONE') {
      return {
        kind: 'issue',
        issues: [
          issue(
            'SCHEMA_VIOLATION',
            'exit_route',
            'A generation that produced at least one grounded hypothesis must report exit_route = NONE: a zero-output exit is only about producing NOTHING (§9.2).',
          ),
        ],
      };
    }
    return {
      kind: 'ok',
      payload: { grounded, model_suggestions, exit_route: 'NONE', absence_statement: null },
    };
  }

  if (!(HYPOTHESIS_EXIT_ROUTES as readonly string[]).includes(raw_exit)) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'SCHEMA_VIOLATION',
          'exit_route',
          `With no grounded hypothesis formed, exit_route must be one of ${HYPOTHESIS_EXIT_ROUTES.join(' / ')} (§9.2).`,
        ),
      ],
    };
  }

  const absence = value['absence_statement'];
  if (!isNonBlank(absence)) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'ZERO_OUTPUT_WITHOUT_EXPLICIT_STATEMENT',
          'absence_statement',
          'A zero-output result must state why nothing was formed; a silent zero result is refused (§9.2 / D-047).',
        ),
      ],
    };
  }

  /*
   * 🔴 Q9: `EXIT-B` / `EXIT-C` must never be presented as an evidence problem. The route is
   *    re-derived structurally by the service, so this only guards the statement.
   */
  const early = findForbiddenObjectNaming(absence);
  if (early.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'FORBIDDEN_OBJECT_NAMING',
          'absence_statement',
          `The explanation calls the output "${early.join('", "')}"; step ⑨ produces no such object (§8.1).`,
        ),
      ],
    };
  }

  return {
    kind: 'ok',
    payload: {
      grounded: [],
      model_suggestions,
      exit_route: raw_exit as HypothesisExitRoute,
      absence_statement: absence,
    },
  };
}

/* ------------------------------------------------------------------ *
 * 5. The independent grounding / criteria check reader
 * ------------------------------------------------------------------ */

/**
 * Reads one independent check answer.
 *
 * 🔴 `expected_hypothesis_ids` makes the answer BOUND to this generation: a verdict for an unknown
 *    identity is refused instead of being silently ignored.
 * 🔴 The verdict vocabulary is enforced here: anything other than `grounded` / `not_grounded` (a
 *    grade, a score, a percentage, 「partial」, 「maybe」) is a schema violation (`TQ34`).
 */
export function readGroundingCheckPayload(
  value: unknown,
  expected_hypothesis_ids: readonly string[],
): HypothesisPayloadRead<GroundingCheckProposal> {
  const issues: HypothesisPayloadIssue[] = [];
  if (!isPlainObject(value)) {
    return {
      kind: 'issue',
      issues: [issue('SCHEMA_VIOLATION', '', 'A grounding check result must be a JSON object.')],
    };
  }
  const scoring = findForbiddenScoringFields(value);
  if (scoring.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'FORBIDDEN_SCORING_FIELD',
          scoring.join(', '),
          'The grounding check is discrete: no score, confidence, percentage, level, strength, rank or grade is accepted (TQ34).',
        ),
      ],
    };
  }
  const numbers = findNumericLeaves(value);
  if (numbers.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'FORBIDDEN_SCORING_FIELD',
          numbers.join(', '),
          'The grounding check carries no number at all, so no numeric value can decide it (§8.2 rule 1).',
        ),
      ],
    };
  }
  const stateClaims = findForbiddenStateFields(value);
  if (stateClaims.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'AI_CLAIMED_DECISION_STATE',
          stateClaims.join(', '),
          'The check reports a verdict; it may not decide the object (§22).',
        ),
      ],
    };
  }
  const partials = findForbiddenPartialGroundingFields(value);
  if (partials.length > 0) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'FORBIDDEN_PARTIAL_GROUNDING',
          partials.join(', '),
          'Grounding is binary; no middle grade exists (TQ34).',
        ),
      ],
    };
  }

  const raw_checks = value['checks'];
  if (!Array.isArray(raw_checks)) {
    return {
      kind: 'issue',
      issues: [issue('SCHEMA_VIOLATION', 'checks', 'checks must be an array.')],
    };
  }

  const expected = new Set(expected_hypothesis_ids);
  const checks: GroundingCheckEntryProposal[] = [];
  raw_checks.forEach((entry, index) => {
    const path = `checks[${index}]`;
    if (!isPlainObject(entry)) {
      issues.push(issue('SCHEMA_VIOLATION', path, 'Each check must be an object.'));
      return;
    }
    const hypothesis_id = entry['hypothesis_id'];
    if (!isNonBlank(hypothesis_id)) {
      issues.push(
        issue('SCHEMA_VIOLATION', `${path}.hypothesis_id`, 'hypothesis_id must be a non-blank string.'),
      );
      return;
    }
    if (!expected.has(hypothesis_id)) {
      issues.push(
        issue(
          'SCHEMA_VIOLATION',
          `${path}.hypothesis_id`,
          `The check names "${hypothesis_id}", which is not part of this generation.`,
        ),
      );
      return;
    }
    const grounding_check = entry['grounding_check'];
    if (
      typeof grounding_check !== 'string' ||
      !(GROUNDING_CHECK_VALUES as readonly string[]).includes(grounding_check)
    ) {
      issues.push(
        issue(
          'FORBIDDEN_PARTIAL_GROUNDING',
          `${path}.grounding_check`,
          `grounding_check must be exactly ${GROUNDING_CHECK_VALUES.map((value) => `"${value}"`).join(' or ')}; a grade, a score, a confidence or "partial" is never accepted (TQ34).`,
        ),
      );
      return;
    }
    const condition = entry['condition'];
    let parsed_condition: string | null = null;
    if (condition !== undefined && condition !== null) {
      if (condition !== 'N3' && condition !== 'N4') {
        issues.push(
          issue(
            'SCHEMA_VIOLATION',
            `${path}.condition`,
            'condition must be "N3", "N4" or null: only the two semantic conditions are this check\'s to report (§8.2).',
          ),
        );
        return;
      }
      parsed_condition = condition;
    }
    const criteria_check = entry['criteria_check'];
    if (
      typeof criteria_check !== 'string' ||
      !(CRITERIA_CHECK_VALUES as readonly string[]).includes(criteria_check)
    ) {
      issues.push(
        issue(
          'SCHEMA_VIOLATION',
          `${path}.criteria_check`,
          `criteria_check must be exactly ${CRITERIA_CHECK_VALUES.map((value) => `"${value}"`).join(' or ')} (§18).`,
        ),
      );
      return;
    }
    const grounding_reason = readRequiredText(entry, 'grounding_reason', path, issues);
    const criteria_reason = readRequiredText(entry, 'criteria_reason', path, issues);
    if (grounding_reason.length === 0 || criteria_reason.length === 0) {
      return;
    }
    assertNoForbiddenWording([grounding_reason, criteria_reason], path, issues);
    checks.push({
      hypothesis_id,
      grounding_check,
      condition: parsed_condition,
      grounding_reason,
      criteria_check,
      criteria_reason,
    });
  });

  if (issues.length > 0) {
    return { kind: 'issue', issues };
  }
  return { kind: 'ok', payload: { checks } };
}
