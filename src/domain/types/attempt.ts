/**
 * `Attempt` - the action-unit record (fact layer).
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
 *   - §1.1       `Attempt` is a product-core fact / experience object;
 *   - §2.1       two-level state `Draft` / `Formal` + orthogonal archive bit;
 *   - §4.2       per-item `source_type` is invariant;
 *   - §9         step ①..⑤ I/O;
 *   - §9.4.1     Level A primary field paths (frozen);
 *   - §11.1      L4 product-layer automatic records = exactly 4 items;
 *   - §12 item 1 `Draft` / `Formal` and `Fact` / `Extraction` / `Inference`
 *                are Worker-forbidden-to-change enumerated values.
 *
 * 🔴 `Draft` / `Formal` are a two-value union, NEVER a boolean.
 * 🔴 The archive bit is a separate dimension, NEVER merged into `AttemptState`.
 * 🔴 No product-level version / revision / edit-count field exists (AC-122).
 */

import type { ArchiveState } from './archive.js';
import type { ObjectId } from '../ids/object-id.js';
import type { FieldPresenceState } from './presence.js';
import type { MaybeProvided } from './presence.js';
import { provided } from './presence.js';
import type { ContentItem, DecisionInferenceContentItem, FactContentItem } from './source-type.js';
import { isReusableAsConfirmedDecision } from './source-type.js';

/** Two-value attempt state. NOT a boolean, NEVER merged with the archive bit. */
export type AttemptState = 'Draft' | 'Formal';

export const ATTEMPT_STATES: readonly AttemptState[] = ['Draft', 'Formal'];
export const ATTEMPT_DRAFT: 'Draft' = 'Draft';
export const ATTEMPT_FORMAL: 'Formal' = 'Formal';

/**
 * L4 ③ data-source nature: field record / retrospective entry / demo sample.
 * (contract §11.1 item ③; D-044 / AC-135)
 */
export type DataSourceNature = 'field_record' | 'retrospective_entry' | 'demo_sample';

export const DATA_SOURCE_NATURES: readonly DataSourceNature[] = [
  'field_record',
  'retrospective_entry',
  'demo_sample',
];

/** Canonical Chinese labels - display only, never used as a value. */
export const DATA_SOURCE_NATURE_LABELS: Readonly<Record<DataSourceNature, string>> = {
  field_record: '现场记录',
  retrospective_entry: '事后补录',
  demo_sample: 'Demo 示例数据',
};

/**
 * L4 product-layer automatic records - EXACTLY 4 (§11.1 / AC-77).
 * 🔴 ④ `ai_source_marks` is satisfied structurally by the per-item `source_type`
 *    carried by every `ContentItem`; no duplicate field is stored.
 * 🔴 「发生时间」(occurred_at) is NOT part of L4 (§4.2 rule 5 / AC-78).
 */
export const L4_PRODUCT_LAYER_FIELDS = [
  'created_at',
  'updated_at',
  'data_source_nature',
  'ai_source_marks',
] as const;

export type L4Field = (typeof L4_PRODUCT_LAYER_FIELDS)[number];

export interface Attempt {
  /**
   * The `ATT_` object id (§3.1 / §3.2). Branded like every other core object id and
   * like `EvidenceRef.target_id`, so an Attempt can never be identified by a file name,
   * a list position or an unrelated string.
   */
  readonly attempt_id: ObjectId<'ATT'>;
  /** `Project` is optional in the product model; `null` = not assigned. */
  readonly project_id: string | null;
  readonly state: AttemptState;
  /** Orthogonal to `state`; `active` | `archived`. */
  readonly archive_state: ArchiveState;

  /** Step ① - the user's raw natural language, always a user `Fact`. */
  readonly raw_text: FactContentItem;

  /* ---- Level A primary fields (frozen mapping, §9.4.1) ---- */
  readonly goal: MaybeProvided<ContentItem>;
  readonly actual_attempt: MaybeProvided<ContentItem>;
  readonly condition: MaybeProvided<ContentItem>;
  readonly actual_result: MaybeProvided<ContentItem>;

  /* ---- Formal prerequisites and optional content ---- */
  /**
   * Result status. A DECISION-type `Inference`: it becomes usable as a Formal
   * prerequisite only after the user explicitly accepts it (D-012 / §4.3).
   */
  readonly result_status: MaybeProvided<ContentItem<'Inference'>>;
  readonly expected_result: MaybeProvided<ContentItem>;
  readonly judgment_basis: MaybeProvided<ContentItem>;
  readonly key_parameters: readonly ContentItem[];
  /** Step ④ candidate failure causes: `Inference|decision`, `unresolved` by default. */
  readonly candidate_causes: readonly DecisionInferenceContentItem[];
  /** 「发生时间」 - a USER `Fact`; `created_at` MUST NOT impersonate it (§4.2 rule 5). */
  readonly occurred_at: MaybeProvided<ContentItem<'Fact'>>;
  /** docs/05 §4「版本 / 环境」 - optional, unknown is expressed explicitly. */
  readonly environment: MaybeProvided<ContentItem>;
  /** docs/05 §4「成本」 - only ever from the user; never estimated (AC-52). */
  readonly cost: MaybeProvided<ContentItem<'Fact'>>;
  readonly user_note: MaybeProvided<ContentItem>;
  /** Optional free-form tags. Never a required field, never a value grade (AC-12). */
  readonly failure_tags: readonly string[];

  /* ---- L4 automatic records (§11.1) ---- */
  readonly created_at: string;
  readonly updated_at: string;
  readonly data_source_nature: DataSourceNature;
}

/* ------------------------------------------------------------------ *
 * Step ① input gate
 * ------------------------------------------------------------------ */

/**
 * Step ① has exactly ONE gate: the input is non-empty and not pure whitespace.
 * 🔴 No character-count threshold, no semantic judgement, no AI pre-check
 *    (D-047 / AC-87 / AC-88).
 */
export function isNonBlankAttemptInput(rawText: string): boolean {
  return rawText.trim().length > 0;
}

export interface DraftAttemptInput {
  readonly attempt_id: ObjectId<'ATT'>;
  readonly raw_text: string;
  readonly created_at: string;
  readonly project_id?: string | null;
  readonly data_source_nature?: DataSourceNature;
}

/**
 * Creates the `Draft` produced by step ①.
 *
 * Every Level A field starts as an EXPLICIT `unknown` - never as an empty string
 * or a default value (§4.2 rule 7 / AC-04).
 *
 * Throws only for an empty / whitespace-only input, which is a domain invariant
 * violation: the entry surface must show a hint instead of an error (AC-87).
 */
export function createDraftAttempt(input: DraftAttemptInput): Attempt {
  if (!isNonBlankAttemptInput(input.raw_text)) {
    throw new Error(
      'Step ① gate: an Attempt Draft requires non-empty, non-whitespace input (D-047 / AC-87).',
    );
  }
  return {
    attempt_id: input.attempt_id,
    project_id: input.project_id ?? null,
    state: ATTEMPT_DRAFT,
    archive_state: 'active',
    raw_text: {
      content_item_id: `${input.attempt_id}:raw_text`,
      source_type: 'Fact',
      value: input.raw_text,
    },
    goal: { presence_state: 'unknown' },
    actual_attempt: { presence_state: 'unknown' },
    condition: { presence_state: 'unknown' },
    actual_result: { presence_state: 'unknown' },
    result_status: { presence_state: 'unknown' },
    expected_result: { presence_state: 'unknown' },
    judgment_basis: { presence_state: 'unknown' },
    key_parameters: [],
    candidate_causes: [],
    occurred_at: { presence_state: 'unknown' },
    environment: { presence_state: 'unknown' },
    cost: { presence_state: 'unknown' },
    user_note: { presence_state: 'unknown' },
    failure_tags: [],
    created_at: input.created_at,
    updated_at: input.created_at,
    data_source_nature: input.data_source_nature ?? 'field_record',
  };
}

/** Helper for fixtures: attach a provided content item to a field. */
export function withProvided<T>(item: T): MaybeProvided<T> {
  return provided(item);
}

/* ------------------------------------------------------------------ *
 * Formal gate (§2.1 / D-012)
 * ------------------------------------------------------------------ */

export type FormalGateField = 'goal' | 'actual_attempt' | 'actual_result' | 'result_status';

export const FORMAL_GATE_FIELDS: readonly FormalGateField[] = [
  'goal',
  'actual_attempt',
  'actual_result',
  'result_status',
];

export interface FormalGateResult {
  readonly satisfied: boolean;
  readonly missing_fields: readonly FormalGateField[];
  /** True only when the user has EXPLICITLY accepted the result status. */
  readonly result_status_confirmed: boolean;
}

/**
 * A `Formal Attempt` requires: goal + actual attempt + actual result + a
 * user-confirmed result status (§2.1 / §9 step ⑤).
 *
 * The result status is never auto-confirmed: `display` inferences and
 * `unresolved` decision inferences do not satisfy the gate (§4.3).
 */
export function evaluateFormalGate(attempt: Attempt): FormalGateResult {
  const missing: FormalGateField[] = [];
  if (attempt.goal.presence_state === 'unknown') {
    missing.push('goal');
  }
  if (attempt.actual_attempt.presence_state === 'unknown') {
    missing.push('actual_attempt');
  }
  if (attempt.actual_result.presence_state === 'unknown') {
    missing.push('actual_result');
  }

  const confirmed =
    attempt.result_status.presence_state === 'present' &&
    isReusableAsConfirmedDecision(attempt.result_status.item);

  if (!confirmed) {
    missing.push('result_status');
  }

  return {
    satisfied: missing.length === 0,
    missing_fields: missing,
    result_status_confirmed: confirmed,
  };
}

/* ------------------------------------------------------------------ *
 * State transition (§10.1 layer 1 = GATE)
 * ------------------------------------------------------------------ */

export type AttemptTransitionDenialCode =
  | 'FORMAL_GATE_UNSATISFIED'
  | 'NOT_A_CANONICAL_TRANSITION';

export interface AttemptTransitionAllowed {
  readonly allowed: true;
}

export interface AttemptTransitionDenied {
  readonly allowed: false;
  /** Layer 1 of §10.1: only affects upgrade eligibility. */
  readonly layer: 'GATE';
  readonly code: AttemptTransitionDenialCode;
  readonly reason: string;
  readonly missing_fields: readonly FormalGateField[];
}

export type AttemptTransitionCheck = AttemptTransitionAllowed | AttemptTransitionDenied;

/**
 * `Draft -> Formal` may only be triggered by an explicit user confirmation and
 * only when the Formal gate is satisfied; `Formal -> Draft` is not a canonical
 * transition. The system MUST NOT auto-upgrade (§2.1 / AC-Q06-5).
 *
 * A denial is a GATE outcome: existing data is preserved, nothing is displayed as
 * a system error, and the user is never locked out of continuing (§10.1 layer 1).
 */
export function checkAttemptStateTransition(
  attempt: Attempt,
  next: AttemptState,
): AttemptTransitionCheck {
  if (attempt.state === next) {
    return { allowed: true };
  }
  if (attempt.state === 'Formal' && next === 'Draft') {
    return {
      allowed: false,
      layer: 'GATE',
      code: 'NOT_A_CANONICAL_TRANSITION',
      reason:
        'Formal -> Draft is not a canonical transition; the record must stay Formal unless it is archived (contract §2.1).',
      missing_fields: [],
    };
  }
  const gate = evaluateFormalGate(attempt);
  if (!gate.satisfied) {
    return {
      allowed: false,
      layer: 'GATE',
      code: 'FORMAL_GATE_UNSATISFIED',
      reason:
        'A Formal Attempt requires goal + actual attempt + actual result + a user-confirmed result status (contract §2.1).',
      missing_fields: gate.missing_fields,
    };
  }
  return { allowed: true };
}

/** Presence state of a Level A dimension of a given `Attempt`. */
export function attemptFieldPresenceState(
  attempt: Attempt,
  field: 'goal' | 'actual_attempt' | 'condition' | 'actual_result',
): FieldPresenceState {
  return attempt[field].presence_state;
}
