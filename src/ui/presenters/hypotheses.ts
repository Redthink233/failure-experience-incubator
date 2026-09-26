/**
 * S01-06 ｜ Step ⑨ / ⑩ presentation: hypotheses, model suggestions and the evidence trace.
 *
 * 🔴 THE TWO OUTPUTS ARE VISUALLY SEPARATE (task §34 / §38). `grounded` and `model` are rendered in
 *    two different areas, and a `Model Suggestion` ALWAYS carries its non-historical notice. Saving a
 *    model suggestion is a SAVE (content), accepting it is a DECISION - the interface keeps the two
 *    buttons apart because the domain keeps the two slots apart (`D-042`).
 * 🔴 A HYPOTHESIS IS NEVER AN EXPERIENCE ASSET (task §37 / U7): this module has no asset path at all,
 *    and the card is always titled 「待验证方向」.
 * 🔴 THE EIGHT ITEMS ARE NAMED IN HUMAN WORDS (§35): 待验证假设 / 为什么提出 / 历史依据 / 下一轮改变什么 /
 *    哪些条件保持不变 / 观察什么 / 什么结果支持它 / 什么结果反驳它. No TypeScript property name is rendered.
 * 🔴 `EXIT-A/B/C` KEEP THEIR OWN MEANING (§39). `EXIT-B` and `EXIT-C` are about formability and
 *    verifiability - they are never re-worded into "the history was insufficient".
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO I/O.
 */

import {
  EXIT_STATEMENTS,
  HYPOTHESIS_CRITERIA_AI,
  HYPOTHESIS_CRITERIA_USER,
  HYPOTHESIS_EMPTY,
  HYPOTHESIS_ITEM_LABELS,
  HYPOTHESIS_ITEM_MISSING,
  HYPOTHESIS_MODEL_NOTICE,
  HYPOTHESIS_STATE_ACCEPTED,
  HYPOTHESIS_STATE_REJECTED,
  HYPOTHESIS_STATE_UNDECIDED,
  REASONING_ONLY_NOTE,
  SOURCE_PARTITION_LABELS,
  EVIDENCE_ARCHIVED,
  EVIDENCE_ROLE_LABELS,
  TRACE_EMPTY,
  citationCount,
} from '../copy.js';
import type { HypothesisItemKey } from '../copy.js';
import { humanizeFieldPath, shortIdLabel } from './fields.js';
import type { DecisionState, HypothesisEditableSlot } from '../../domain/types/hypothesis.js';
import type { ContentItemDecisionState } from '../../domain/types/source-type.js';
import type { HypothesisTraceView, HypothesisView } from '../../application/hypothesis/types.js';
import type { D9WorkflowSnapshot } from '../../application/workflow/types.js';

/* ------------------------------------------------------------------ *
 * The eight items
 * ------------------------------------------------------------------ */

export interface CriterionEntryView {
  readonly content_item_id: string;
  readonly value: string;
  /** `ai` = an AI proposal (an `Inference`); `user` = something the user supplied (a `Fact`). */
  readonly source: 'ai' | 'user';
  readonly source_label: string;
  readonly decision_state: ContentItemDecisionState | null;
  readonly is_decidable: boolean;
}

export interface HypothesisItemView {
  readonly key: HypothesisItemKey;
  readonly label: string;
  readonly present: boolean;
  readonly read_only: boolean;
  /** The rendered content for ①–⑤, and a compact summary for ⑥⑦⑧. `null` when explicitly missing. */
  readonly summary: string | null;
  /** Only ⑥⑦⑧ carry entries; ①–⑤ are system-managed and read-only. */
  readonly entries: readonly CriterionEntryView[];
  readonly missing_label: string;
}

const ITEM_ORDER: readonly HypothesisItemKey[] = [
  'hypothesis_statement',
  'rationale',
  'referenced_attempts',
  'next_change',
  'kept_conditions',
  'observation_metric',
  'support_criterion',
  'refutation_criterion',
];

const READ_ONLY_ITEMS: readonly HypothesisItemKey[] = [
  'hypothesis_statement',
  'rationale',
  'referenced_attempts',
  'next_change',
  'kept_conditions',
];

const SLOT_BY_ITEM: Partial<Record<HypothesisItemKey, HypothesisEditableSlot>> = {
  observation_metric: 'observation_metric',
  support_criterion: 'support_criterion',
  refutation_criterion: 'refutation_criterion',
};

function decisionStateOf(item: { readonly confirmation_class?: string; readonly decision_state?: unknown }): ContentItemDecisionState | null {
  if (item.confirmation_class !== 'decision') {
    return null;
  }
  const state = item.decision_state;
  return state === 'accepted' || state === 'rejected' || state === 'unresolved' ? state : null;
}

function entriesOf(view: HypothesisView, slot: HypothesisEditableSlot): readonly CriterionEntryView[] {
  const ai: CriterionEntryView[] = view.hypothesis.editable_items.ai_inferences
    .filter((entry) => entry.slot === slot)
    .map((entry) => ({
      content_item_id: entry.item.content_item_id,
      value: entry.item.value,
      source: 'ai',
      source_label: HYPOTHESIS_CRITERIA_AI,
      decision_state: decisionStateOf(entry.item),
      is_decidable: true,
    }));
  const user: CriterionEntryView[] = view.hypothesis.editable_items.user_facts
    .filter((entry) => entry.slot === slot)
    .map((entry) => ({
      content_item_id: entry.item.content_item_id,
      value: entry.item.value,
      source: 'user',
      source_label: HYPOTHESIS_CRITERIA_USER,
      decision_state: null,
      /* 🔴 A user-supplied item is never "decided" by a button - it is the user's own information. */
      is_decidable: false,
    }));
  return [...ai, ...user];
}

function summaryOf(view: HypothesisView, key: HypothesisItemKey): string | null {
  const core = view.hypothesis.core;
  switch (key) {
    case 'hypothesis_statement':
      return core.hypothesis_statement.length > 0 ? core.hypothesis_statement : null;
    case 'rationale':
      return core.rationale.length > 0 ? core.rationale : null;
    case 'referenced_attempts':
      return core.referenced_attempt_ids.length === 0
        ? null
        : core.referenced_attempt_ids.map((id) => shortIdLabel(String(id))).join('、');
    case 'next_change':
      return core.next_change.length > 0 ? core.next_change : null;
    case 'kept_conditions':
      return core.kept_conditions.length === 0
        ? null
        : core.kept_conditions
            .map(
              (reference) =>
                `${humanizeFieldPath(reference.source_field_path)}（${shortIdLabel(String(reference.attempt_id))}）`,
            )
            .join('、');
    default:
      return null;
  }
}

function itemViewsOf(view: HypothesisView): readonly HypothesisItemView[] {
  return ITEM_ORDER.map((key) => {
    const read_only = READ_ONLY_ITEMS.includes(key);
    const slot = SLOT_BY_ITEM[key];
    const entries = slot === undefined ? [] : entriesOf(view, slot);
    const summary =
      slot === undefined
        ? summaryOf(view, key)
        : entries.length === 0
          ? null
          : entries.map((entry) => entry.value).join('；');
    const presence = view.item_presence[key];
    return {
      key,
      label: HYPOTHESIS_ITEM_LABELS[key],
      /* 🔴 Presence is READ from the service's derivation - the UI does not re-test for blanks. */
      present: presence === undefined ? summary !== null : presence === 'present',
      read_only,
      summary,
      entries,
      missing_label: HYPOTHESIS_ITEM_MISSING,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Cards
 * ------------------------------------------------------------------ */

export interface HypothesisCardView {
  readonly hypothesis_id: string;
  readonly kind: 'grounded' | 'model';
  readonly title: string;
  readonly decision_state: DecisionState;
  readonly decision_label: string;
  readonly items: readonly HypothesisItemView[];
  readonly kept_condition_recommendations: readonly string[];
  readonly reasoning_input_labels: readonly string[];
  readonly reasoning_only_note: string;
  readonly model_prior_notice: string | null;
  readonly non_historical_notice: string;
  readonly saved: boolean | null;
  readonly is_saved_but_undecided: boolean;
  readonly source_partition_labels: readonly string[];
  readonly n_citation: number;
  readonly can_accept: boolean;
  readonly can_reject: boolean;
  readonly is_current_batch: boolean;
  readonly is_experience_asset: false;
}

export function hypothesisDecisionLabel(state: DecisionState): string {
  if (state === 'accepted') {
    return HYPOTHESIS_STATE_ACCEPTED;
  }
  return state === 'rejected' ? HYPOTHESIS_STATE_REJECTED : HYPOTHESIS_STATE_UNDECIDED;
}

export function hypothesisCardOf(
  view: HypothesisView,
  options: { readonly current_batch_id: string | null },
): HypothesisCardView {
  const hypothesis = view.hypothesis;
  return {
    hypothesis_id: String(hypothesis.hypothesis_id),
    kind: hypothesis.kind,
    title: '待验证方向',
    decision_state: hypothesis.decision_state,
    decision_label: hypothesisDecisionLabel(hypothesis.decision_state),
    items: itemViewsOf(view),
    kept_condition_recommendations: view.kept_condition_recommendations.map((item) => item.value),
    reasoning_input_labels: view.reasoning_input_refs.map((reference) => reference.label),
    reasoning_only_note: REASONING_ONLY_NOTE,
    model_prior_notice: view.model_prior_notice,
    non_historical_notice: HYPOTHESIS_MODEL_NOTICE,
    saved: hypothesis.saved,
    is_saved_but_undecided: view.is_saved_but_undecided,
    source_partition_labels: view.source_partitions.map(
      (partition) => SOURCE_PARTITION_LABELS[partition] ?? partition,
    ),
    n_citation: view.citation.n_citation,
    can_accept: view.can_accept,
    can_reject: view.can_reject,
    is_current_batch:
      options.current_batch_id !== null && hypothesis.generation_batch === options.current_batch_id,
    /* 🔴 Always `false` - restated so a future renderer cannot flip it (§37 / AC-41). */
    is_experience_asset: false,
  };
}

export interface HypothesisExitView {
  readonly route: 'EXIT-A' | 'EXIT-B' | 'EXIT-C';
  readonly statement: string;
}

export interface HypothesesPresentation {
  readonly generated: boolean;
  readonly grounded: readonly HypothesisCardView[];
  readonly model_suggestions: readonly HypothesisCardView[];
  readonly exit: HypothesisExitView | null;
  readonly empty_statement: string;
}

/**
 * The step ⑨ presentation.
 *
 * 🔴 `exit` is taken from the CURRENT generation batch's own `exit_route`. `EXIT-B`/`EXIT-C` keep
 *    their canonical meaning; the batch's own `absence_statement` is only a fallback for an
 *    unrecognised route, never a re-wording of a recognised one.
 */
export function hypothesesPresentationOf(
  snapshot: D9WorkflowSnapshot | null,
): HypothesesPresentation {
  if (snapshot === null) {
    return {
      generated: false,
      grounded: [],
      model_suggestions: [],
      exit: null,
      empty_statement: HYPOTHESIS_EMPTY,
    };
  }
  const options = { current_batch_id: snapshot.hypotheses.current_batch_id };
  const grounded = snapshot.hypotheses.views.map((view) => hypothesisCardOf(view, options));
  const model_suggestions = snapshot.hypotheses.model_suggestions.map((view) =>
    hypothesisCardOf(view, options),
  );
  const current = snapshot.hypotheses.batches.find((batch) => batch.is_current) ?? null;

  return {
    generated: snapshot.hypotheses.batches.length > 0,
    grounded,
    model_suggestions,
    exit: exitViewOf(current),
    empty_statement: HYPOTHESIS_EMPTY,
  };
}

function exitViewOf(batch: { readonly exit_route: string | null; readonly absence_statement: string | null } | null): HypothesisExitView | null {
  if (batch === null || batch.exit_route === null) {
    return null;
  }
  const route = batch.exit_route;
  if (route === 'EXIT-A' || route === 'EXIT-B' || route === 'EXIT-C') {
    return { route, statement: EXIT_STATEMENTS[route] };
  }
  return batch.absence_statement === null
    ? null
    : { route: 'EXIT-A', statement: batch.absence_statement };
}

/* ------------------------------------------------------------------ *
 * Step ⑩ - the evidence trace
 * ------------------------------------------------------------------ */

type TraceRow = HypothesisTraceView['traceability'][number];

export interface TraceRowView {
  readonly evidence_ref_id: string;
  readonly role_label: string;
  readonly target_label: string;
  /** Human label of the landing point, e.g. 「实际尝试」. */
  readonly field_label: string;
  /** The technical path - shown muted, never as the headline (§29). */
  readonly field_path: string;
  readonly content: string | null;
  readonly archived: boolean;
  readonly counted: boolean;
  readonly resolvable: boolean;
  readonly unresolved_reason: string | null;
}

export interface TracePanelView {
  readonly owner_id: string;
  readonly kind: 'grounded' | 'model';
  readonly n_citation: number;
  readonly citation_label: string;
  readonly rows: readonly TraceRowView[];
  readonly empty_statement: string;
  readonly model_suggestion_has_no_trace: boolean;
}

export function traceRowOf(row: TraceRow): TraceRowView {
  if (row.resolvable) {
    return {
      evidence_ref_id: row.evidence_ref_id,
      role_label: EVIDENCE_ROLE_LABELS[row.role] ?? row.role,
      target_label: shortIdLabel(String(row.target_id)),
      field_label: humanizeFieldPath(row.source_field_path),
      field_path: row.source_field_path,
      content: row.content_value,
      archived: row.source_archived,
      counted: row.counted_toward_n_citation,
      resolvable: true,
      unresolved_reason: null,
    };
  }
  return {
    evidence_ref_id: row.evidence_ref_id,
    role_label: EVIDENCE_ROLE_LABELS[row.role] ?? row.role,
    target_label: shortIdLabel(String(row.target_id)),
    field_label: humanizeFieldPath(row.source_field_path),
    field_path: row.source_field_path,
    content: null,
    archived: false,
    counted: row.counted_toward_n_citation,
    resolvable: false,
    unresolved_reason: row.reason,
  };
}

export function tracePanelOf(trace: HypothesisTraceView): TracePanelView {
  return {
    owner_id: String(trace.owner_id),
    kind: trace.kind,
    /* 🔴 `N_引用` is read from `M7`'s single derivation - never counted from `rows`. */
    n_citation: trace.citation.n_citation,
    citation_label: citationCount(trace.citation.n_citation),
    rows: trace.traceability.map((row) => traceRowOf(row)),
    empty_statement: TRACE_EMPTY,
    model_suggestion_has_no_trace: trace.model_suggestion_has_no_trace,
  };
}

/** The archived marker a trace row may carry (task §42 - 「来源已归档」, never 「引用失效」). */
export function archivedMarkerFor(row: TraceRowView): string | null {
  return row.archived ? EVIDENCE_ARCHIVED : null;
}
