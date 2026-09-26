/**
 * S01 ｜ `M8` structured-output schemas and payload readers for step ⑧.
 *
 * Contract: §0.4 D ("Structured Output = Provider-native / constrained JSON + schema 校验 +
 * repair·retry；🔴 属实现层，不改变产品语义"), §9 step ⑧, §9.2 (the two step ⑧ exits), §11.3.
 *
 * 🔴 THESE ARE APPLICATION SCHEMAS, NOT THE PRODUCT DATA SCHEMA. They describe the shape of ONE
 *    AI answer; they create no field on `Insight`, no Decision and no AC.
 * 🔴 The JSON-Schema subset is the one `M10` actually validates (`type: object` + `required` +
 *    per-property `type`), so the semantics below are enforced by THIS reader. It never repairs
 *    silently: every problem is an explicit issue and the whole answer is refused.
 * 🔴 NO SCORING VOCABULARY AND NO NUMBER AT ALL is accepted: §11 of the M8 task rejects
 *    `score` / `confidence` / `probability` / `percentage` / `quality_level` / `evidence_strength`
 *    / `rank` / `grade` by name, and a numeric leaf anywhere is refused so that "E2 / E3 decided by
 *    a numeric threshold" is structurally impossible (`D-020` / `D-037` / AC-23 / AC-93).
 * 🔴 The model may NOT decide the state: any `status` / `state` / `decision_state` key is refused
 *    (`§16`: only `E5` — an explicit user action — may promote a `candidate`).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { StructuredOutputRequest } from '../../ai/provider/structured-output.js';
import { PREFERRED_STRUCTURED_OUTPUT_MODE } from '../../ai/provider/structured-output.js';
import { REF_ROLES } from '../../domain/types/evidence-ref.js';
import type { RefRole } from '../../domain/types/evidence-ref.js';
import { findForbiddenProofWording, singleSourceGeneralizationGuard } from './generalization.js';
import type {
  CandidateInsightProposal,
  InsightEvidenceSelection,
  InsightGateRecheckProposal,
  InsightGenerationProposal,
  InsightMissingItemProposal,
  InsightPayloadIssue,
} from './types.js';
import { INSIGHT_EXIT_ROUTES } from './types.js';
import type { InsightExitRoute } from './types.js';

/** Caller-owned schema ids. 🔴 Not a product version system (AC-122). */
export const INSIGHT_GENERATION_SCHEMA_ID = 'candidate-insight-generation-v1';
export const INSIGHT_GATE_RECHECK_SCHEMA_ID = 'insight-gate-recheck-v1';

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
 * Step ⑧ schema. `insights` may be an EMPTY array (a legal zero-output result) and `exit_route` is
 * required so that "0 insights" is always accompanied by an explicit route (§19).
 */
export const insightGenerationJsonSchema: Readonly<Record<string, unknown>> = {
  type: 'object',
  required: ['insights', 'exit_route'],
  properties: {
    insights: { type: 'array' },
    exit_route: { type: 'string' },
    absence_statement: { type: 'string' },
  },
};

/** The `E2` / `E3` re-check schema (`§24`). */
export const insightGateRecheckJsonSchema: Readonly<Record<string, unknown>> = {
  type: 'object',
  required: ['e2_check', 'e2_reason', 'e3_check', 'e3_reason'],
  properties: {
    e2_check: { type: 'string' },
    e2_reason: { type: 'string' },
    e3_check: { type: 'string' },
    e3_reason: { type: 'string' },
    missing_items: { type: 'array' },
  },
};

/* ------------------------------------------------------------------ *
 * 1. Structural guards over an answer
 * ------------------------------------------------------------------ */

/**
 * Key names that carry a numeric judgement quantity (§11 of the M8 task).
 *
 * 🔴 Deliberately duplicated from the capture layer rather than imported: the application modules
 *    do not import each other (each one is a `D9` step boundary owned by its own task), and a
 *    shared helper module would be a new layer that neither task authorises.
 */
const FORBIDDEN_SCORING_KEY_PATTERN =
  /(confidence|score|probabilit|likelihood|percent|weight|importance|contribution|similarity|ranking|rank_score|grade|quality_level|evidence_strength|strength)/i;

/** Key names through which the model could try to decide the `Insight` state itself (§16). */
const FORBIDDEN_STATE_KEY_PATTERN = /^(status|state|insight_state|decision_state|accepted|is_accepted)$/i;

/** Every dotted path whose KEY names a scoring concept. Empty means 「clean」. */
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

/** Every dotted path whose KEY tries to decide the state. Empty means 「clean」. */
export function findForbiddenStateFields(value: unknown, path = ''): readonly string[] {
  if (value === null || typeof value !== 'object') {
    return [];
  }
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      found.push(...findForbiddenStateFields(entry, `${path}[${index}]`));
    });
    return found;
  }
  for (const [key, child] of Object.entries(value as Readonly<Record<string, unknown>>)) {
    const childPath = path.length === 0 ? key : `${path}.${key}`;
    if (FORBIDDEN_STATE_KEY_PATTERN.test(key)) {
      found.push(childPath);
    }
    found.push(...findForbiddenStateFields(child, childPath));
  }
  return found;
}

/** Dotted paths of every NUMERIC leaf. Step ⑧ carries no number whatsoever (§11). */
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
 * 2. Reader helpers
 * ------------------------------------------------------------------ */

export type InsightPayloadRead<T> =
  | { readonly kind: 'ok'; readonly payload: T }
  | { readonly kind: 'issue'; readonly issues: readonly InsightPayloadIssue[] };

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function issue(
  code: InsightPayloadIssue['code'],
  path: string,
  detail: string,
): InsightPayloadIssue {
  return { code, path, detail };
}

/** Reads an optional free text: absent or `null` becomes `null`, anything else must be a string. */
function readOptionalText(
  record: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: InsightPayloadIssue[],
): string | null {
  const raw = record[key];
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw !== 'string') {
    issues.push(issue('SCHEMA_VIOLATION', `${path}.${key}`, `${key} must be a string or null.`));
    return null;
  }
  return raw;
}

function readDiscreteCheck(
  record: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: InsightPayloadIssue[],
): 'pass' | 'fail' | null {
  const raw = record[key];
  if (raw === 'pass' || raw === 'fail') {
    return raw;
  }
  issues.push(
    issue(
      'SCHEMA_VIOLATION',
      `${path}.${key}`,
      `${key} must be exactly "pass" or "fail"; a score, a level or a confidence value is never accepted here (§14 / AC-93).`,
    ),
  );
  return null;
}

function readRequiredText(
  record: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: InsightPayloadIssue[],
): string {
  const raw = record[key];
  if (!isNonBlank(raw)) {
    issues.push(
      issue('SCHEMA_VIOLATION', `${path}.${key}`, `${key} must be a non-blank string.`),
    );
    return '';
  }
  return raw;
}

function readMissingItems(
  value: unknown,
  path: string,
  issues: InsightPayloadIssue[],
): readonly InsightMissingItemProposal[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push(issue('SCHEMA_VIOLATION', path, 'missing_items must be an array.'));
    return [];
  }
  const items: InsightMissingItemProposal[] = [];
  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isPlainObject(entry)) {
      issues.push(issue('SCHEMA_VIOLATION', entryPath, 'Each missing item must be an object.'));
      return;
    }
    items.push({
      description: readRequiredText(entry, 'description', entryPath, issues),
      why_important: readRequiredText(entry, 'why_important', entryPath, issues),
      how_to_supplement: readOptionalText(entry, 'how_to_supplement', entryPath, issues),
    });
  });
  return items;
}

function readEvidenceSelections(
  value: unknown,
  path: string,
  issues: InsightPayloadIssue[],
): readonly InsightEvidenceSelection[] {
  if (!Array.isArray(value)) {
    issues.push(
      issue(
        'SCHEMA_VIOLATION',
        path,
        'evidence_selections must be an array (an empty array is legal).',
      ),
    );
    return [];
  }
  const selections: InsightEvidenceSelection[] = [];
  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isPlainObject(entry)) {
      issues.push(issue('SCHEMA_VIOLATION', entryPath, 'Each selection must be an object.'));
      return;
    }
    const target_id = entry['target_id'];
    const source_field_path = entry['source_field_path'];
    const role = entry['role'];
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
    selections.push({ target_id, source_field_path, role: role as RefRole });
  });
  return selections;
}

/* ------------------------------------------------------------------ *
 * 3. Shared guards applied to every text the answer produced
 * ------------------------------------------------------------------ */

function collectProposalTexts(proposal: CandidateInsightProposal): readonly string[] {
  const texts: string[] = [proposal.proposition, proposal.scope, proposal.basis];
  if (proposal.verifiability !== null) {
    texts.push(proposal.verifiability);
  }
  texts.push(proposal.e2_reason, proposal.e3_reason);
  for (const item of proposal.missing_items) {
    texts.push(item.description, item.why_important);
    if (item.how_to_supplement !== null) {
      texts.push(item.how_to_supplement);
    }
  }
  return texts.filter((text) => text.trim().length > 0);
}

/** 措辞红线 `D-038`: no 「已证实 / 已验证为事实 / 证明了 / 方法 X 已被证明无效」wording. */
function assertNoProofWording(
  texts: readonly string[],
  path: string,
  issues: InsightPayloadIssue[],
): void {
  for (const text of texts) {
    const found = findForbiddenProofWording(text);
    if (found.length > 0) {
      issues.push(
        issue(
          'FORBIDDEN_WORDING',
          path,
          `The text asserts a proven fact ("${found.join('", "')}"); an Insight stays an Inference for its whole life (D-038 / contract §4.2 rule 2).`,
        ),
      );
    }
  }
}

/** Distinct evidence targets of one proposal - the size of its record-level evidence base. */
export function distinctEvidenceTargetsOf(proposal: CandidateInsightProposal): number {
  return new Set(proposal.evidence_selections.map((selection) => selection.target_id)).size;
}

/**
 * The three-part presentation must be STRUCTURALLY present whenever a gate is unsatisfied
 * (`D-038` / §18 / §35): ① 缺什么 ② 为什么重要 ③ 如何补充.
 *
 * 🔴 A `fail` without a missing item would leave the user with a verdict and no way forward, and a
 *    missing item without an `how_to_supplement` would drop the AI suggestion half of the
 *    presentation. Both are refused here instead of being filled in by a default sentence -
 *    inventing the missing content is exactly what `D-038` forbids.
 */
function assertThreePartPresentation(
  e2_check: 'pass' | 'fail' | null,
  e3_check: 'pass' | 'fail' | null,
  missing_items: readonly InsightMissingItemProposal[],
  path: string,
  issues: InsightPayloadIssue[],
): void {
  const anyFail = e2_check === 'fail' || e3_check === 'fail';
  if (!anyFail) {
    return;
  }
  if (missing_items.length === 0) {
    issues.push(
      issue(
        'SCHEMA_VIOLATION',
        `${path}missing_items`,
        'An unsatisfied E2 / E3 must be presented in three parts (缺什么 / 为什么重要 / 如何补充); a silent failure is refused (D-038).',
      ),
    );
    return;
  }
  missing_items.forEach((item, index) => {
    if (item.how_to_supplement === null) {
      issues.push(
        issue(
          'SCHEMA_VIOLATION',
          `${path}missing_items[${index}].how_to_supplement`,
          '「如何补充」is part of the mandatory three-part presentation and must be offered as an AI suggestion (D-038 / AC-99).',
        ),
      );
    }
  });
}

/* ------------------------------------------------------------------ *
 * 4. Step ⑧ reader
 * ------------------------------------------------------------------ */

/**
 * Reads and cleans one step ⑧ answer.
 *
 * 🔴 Never repairs and never guesses: every violation is an explicit issue and the WHOLE answer is
 *    refused, so a partially accepted answer can never become a persisted `Insight`.
 */
export function readInsightGenerationPayload(
  value: unknown,
): InsightPayloadRead<InsightGenerationProposal> {
  const issues: InsightPayloadIssue[] = [];
  if (!isPlainObject(value)) {
    return {
      kind: 'issue',
      issues: [issue('SCHEMA_VIOLATION', '', 'A step ⑧ result must be a JSON object.')],
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
          'Step ⑧ rejects score / confidence / probability / percentage / quality_level / evidence_strength / rank / grade; E2 and E3 are discrete judgements (AC-23 / AC-93).',
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
          'Step ⑧ carries no number at all, so no numeric value can decide E2 / E3 (§11 / AC-93).',
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
          'AI_CLAIMED_INSIGHT_STATE',
          stateClaims.join(', '),
          'The model may not decide the Insight state: only an explicit user accept action (E5) can promote a candidate (§16 / D-039).',
        ),
      ],
    };
  }

  const raw_insights = value['insights'];
  if (!Array.isArray(raw_insights)) {
    return {
      kind: 'issue',
      issues: [issue('SCHEMA_VIOLATION', 'insights', 'insights must be an array (empty is legal).')],
    };
  }

  const raw_exit = value['exit_route'];
  if (typeof raw_exit !== 'string') {
    return {
      kind: 'issue',
      issues: [issue('SCHEMA_VIOLATION', 'exit_route', 'exit_route must be a string.')],
    };
  }

  const insights: CandidateInsightProposal[] = [];
  raw_insights.forEach((entry, index) => {
    const path = `insights[${index}]`;
    if (!isPlainObject(entry)) {
      issues.push(issue('SCHEMA_VIOLATION', path, 'Each insight must be an object.'));
      return;
    }
    const proposal: CandidateInsightProposal = {
      proposition: readRequiredText(entry, 'proposition', path, issues),
      scope: readRequiredText(entry, 'scope', path, issues),
      basis: readRequiredText(entry, 'basis', path, issues),
      verifiability: readOptionalText(entry, 'verifiability', path, issues),
      evidence_selections: readEvidenceSelections(entry['evidence_selections'], `${path}.evidence_selections`, issues),
      e2_check: readDiscreteCheck(entry, 'e2_check', path, issues) ?? 'fail',
      e2_reason: readRequiredText(entry, 'e2_reason', path, issues),
      e3_check: readDiscreteCheck(entry, 'e3_check', path, issues) ?? 'fail',
      e3_reason: readRequiredText(entry, 'e3_reason', path, issues),
      missing_items: readMissingItems(entry['missing_items'], `${path}.missing_items`, issues),
    };
    if (
      proposal.proposition.trim().length === 0 ||
      proposal.scope.trim().length === 0 ||
      proposal.basis.trim().length === 0
    ) {
      /* Already reported by `readRequiredText`; do not add a second finding for the same field. */
      return;
    }

    assertNoProofWording(collectProposalTexts(proposal), path, issues);

    /*
     * 🔴 `N = 1` guard: one record can never establish a general rule (D-021 E4 / D-007). It is a
     *    deterministic check over the produced text, so prompt wording cannot circumvent it (§10
     *    `N3` of the M8 task). A refused selection aborts the whole generation before anything is
     *    persisted, so this count can never overstate a stored evidence base.
     */
    const guard = singleSourceGeneralizationGuard({
      distinct_evidence_targets: distinctEvidenceTargetsOf(proposal),
      proposition: proposal.proposition,
    });
    if (!guard.allowed) {
      issues.push(
        issue('GENERALIZED_CLAIM_FROM_SINGLE_SOURCE', `${path}.proposition`, guard.detail),
      );
    }

    insights.push(proposal);
  });

  insights.forEach((proposal, index) => {
    assertThreePartPresentation(
      proposal.e2_check,
      proposal.e3_check,
      proposal.missing_items,
      `insights[${index}].`,
      issues,
    );
  });

  if (issues.length > 0) {
    return { kind: 'issue', issues };
  }

  if (insights.length > 0) {
    if (raw_exit !== 'NONE') {
      return {
        kind: 'issue',
        issues: [
          issue(
            'SCHEMA_VIOLATION',
            'exit_route',
            'A generation that produced at least one Candidate Insight must report exit_route = NONE: E2 / E3 failing is NOT a zero-output exit (D-038 / §19).',
          ),
        ],
      };
    }
    return {
      kind: 'ok',
      payload: { insights, exit_route: 'NONE', absence_statement: null },
    };
  }

  if (!(INSIGHT_EXIT_ROUTES as readonly string[]).includes(raw_exit)) {
    return {
      kind: 'issue',
      issues: [
        issue(
          'SCHEMA_VIOLATION',
          'exit_route',
          `With no Candidate Insight formed, exit_route must be one of ${INSIGHT_EXIT_ROUTES.join(' / ')} (contract §9.2).`,
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
          'A zero-output result must state why no candidate proposition could be formed; silence is not an answer (contract §9.2 / D-047).',
        ),
      ],
    };
  }

  return {
    kind: 'ok',
    payload: {
      insights: [],
      exit_route: raw_exit as InsightExitRoute,
      absence_statement: absence,
    },
  };
}

/* ------------------------------------------------------------------ *
 * 5. Re-check reader
 * ------------------------------------------------------------------ */

/** Reads and cleans one `E2` / `E3` re-check answer (`§24`). */
export function readInsightGateRecheckPayload(
  value: unknown,
): InsightPayloadRead<InsightGateRecheckProposal> {
  const issues: InsightPayloadIssue[] = [];
  if (!isPlainObject(value)) {
    return {
      kind: 'issue',
      issues: [issue('SCHEMA_VIOLATION', '', 'A gate re-check result must be a JSON object.')],
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
          'A gate re-check is discrete: no score, confidence, percentage, level, strength, rank or grade is accepted (AC-93).',
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
          'A gate re-check carries no number at all, so no numeric value can decide E2 / E3 (§11 / AC-93).',
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
          'AI_CLAIMED_INSIGHT_STATE',
          stateClaims.join(', '),
          'The model may not decide the Insight state (§16 / D-039).',
        ),
      ],
    };
  }

  const e2_check = readDiscreteCheck(value, 'e2_check', '', issues);
  const e3_check = readDiscreteCheck(value, 'e3_check', '', issues);
  const e2_reason = readRequiredText(value, 'e2_reason', '', issues);
  const e3_reason = readRequiredText(value, 'e3_reason', '', issues);
  const missing_items = readMissingItems(value['missing_items'], 'missing_items', issues);

  assertNoProofWording(
    [e2_reason, e3_reason, ...missing_items.flatMap((item) => [item.description, item.why_important])],
    'recheck',
    issues,
  );

  assertThreePartPresentation(e2_check, e3_check, missing_items, '', issues);

  if (issues.length > 0 || e2_check === null || e3_check === null) {
    return { kind: 'issue', issues };
  }
  return {
    kind: 'ok',
    payload: { e2_check, e3_check, e2_reason, e3_reason, missing_items },
  };
}
