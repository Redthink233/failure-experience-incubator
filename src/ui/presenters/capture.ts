/**
 * S01-06 ｜ Steps ①②③④⑤ presentation: the structured content, the follow-up budget, the result
 * status and the Formal gate gap.
 *
 * 🔴 PROVENANCE IS ALWAYS SHOWN, NEVER INFERRED BACKWARDS (task §19 / §21 / §36). Every value comes
 *    with the source type the record itself carries - 「AI 解析结果」 for an `Extraction`, 「你提供的信息」
 *    for a `Fact`. A model induction is never presented as a user fact, and a user's own words are
 *    never presented as something the model confirmed.
 * 🔴 `unknown` IS DISPLAYED AS unknown. A field the user never provided says 「未知 / 未提供」 instead of
 *    rendering an empty box that reads as "the AI already knows this" (task §19).
 * 🔴 THE FORMAL GATE IS NOT RE-DERIVED HERE. The four prerequisites are read through the DOMAIN's own
 *    predicate (`evaluateFormalGate`) - the same one `M5` uses to decide a save - so the UI and the
 *    service can never disagree about what is missing (task §23).
 * 🔴 NO CHARACTER-THRESHOLD, NO COMPLETENESS SCORE. Step ① accepts one character or a thousand; the
 *    only thing that is checked anywhere is "not blank" (§18 / AC-87).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO I/O.
 */

import {
  CAUSES_STATE_ACCEPTED,
  CAUSES_STATE_REJECTED,
  CAUSES_STATE_UNRESOLVED,
  CAUSES_SOURCE,
  CONFIRM_SOURCE_AI,
  CONFIRM_SOURCE_USER,
  FOLLOWUP_ANSWER_SOURCE_AI,
  FOLLOWUP_ANSWER_SOURCE_USER,
  FOLLOWUP_QUESTION_SOURCE,
  PARSE_SOURCE_AI,
  PARSE_UNKNOWN,
  fieldLabel,
  followUpQuestionFor,
} from '../copy.js';
import type { Attempt, FormalGateField } from '../../domain/types/attempt.js';
import { evaluateFormalGate } from '../../domain/types/attempt.js';
import type { ContentItem, SourceType } from '../../domain/types/source-type.js';
import type { MaybeProvided } from '../../domain/types/presence.js';
import type { PersistedContentItem } from '../../domain/types/content-item-record.js';
import type { D9WorkflowSnapshot } from '../../application/workflow/types.js';
import type { CauseAnalysisProposal, CauseDecision } from '../../application/capture/types.js';

/* ------------------------------------------------------------------ *
 * Source labels
 * ------------------------------------------------------------------ */

export type SourceRole = 'user' | 'ai' | 'unknown';

export function sourceLabelOf(source_type: SourceType): string {
  /* 🔴 `Fact` = the user's own words; anything else is a model-side item and says so. */
  return source_type === 'Fact' ? CONFIRM_SOURCE_USER : CONFIRM_SOURCE_AI;
}

export function sourceRoleOf(source_type: SourceType): SourceRole {
  return source_type === 'Fact' ? 'user' : 'ai';
}

/* ------------------------------------------------------------------ *
 * The structured field grid (② and ③)
 * ------------------------------------------------------------------ */

export interface CaptureFieldView {
  readonly field: string;
  readonly label: string;
  readonly value: string | null;
  readonly source: SourceRole;
  readonly source_label: string;
  /** The record's own provenance hint, e.g. 「来自第 ② 步结构化解析」. `null` when absent. */
  readonly origin_hint: string | null;
  readonly unknown_label: string;
}

interface FieldSpec {
  readonly key: string;
  readonly attemptField:
    | 'goal'
    | 'actual_attempt'
    | 'condition'
    | 'actual_result'
    | 'expected_result'
    | 'judgment_basis'
    | 'environment'
    | 'user_note';
}

const FIELD_SPECS: readonly FieldSpec[] = [
  { key: 'goal', attemptField: 'goal' },
  { key: 'actual_attempt', attemptField: 'actual_attempt' },
  { key: 'condition', attemptField: 'condition' },
  { key: 'actual_result', attemptField: 'actual_result' },
  { key: 'expected_result', attemptField: 'expected_result' },
  { key: 'judgment_basis', attemptField: 'judgment_basis' },
  { key: 'environment', attemptField: 'environment' },
  { key: 'user_note', attemptField: 'user_note' },
];

/** The content-item `field_key` an `Attempt` field is persisted under (canonical mapping). */
const CONTENT_KEY_BY_ATTEMPT_FIELD: Readonly<Record<FieldSpec['attemptField'], string>> = {
  goal: 'goal',
  actual_attempt: 'actual_attempt',
  condition: 'condition',
  actual_result: 'actual_result',
  expected_result: 'expected_result',
  judgment_basis: 'judgment_basis',
  environment: 'version_env',
  user_note: 'note',
};

function valueOfMaybeProvided(item: MaybeProvided<ContentItem>): {
  value: string;
  source: SourceRole;
  source_label: string;
} | null {
  if (item.presence_state !== 'present') {
    return null;
  }
  return {
    value: item.item.value,
    source: sourceRoleOf(item.item.source_type),
    source_label: sourceLabelOf(item.item.source_type),
  };
}

function fieldViewOf(
  attempt: Attempt,
  content_items: readonly PersistedContentItem[],
  spec: FieldSpec,
): CaptureFieldView {
  const confirmed = valueOfMaybeProvided(attempt[spec.attemptField]);
  const label = fieldLabel(spec.key);
  if (confirmed !== null) {
    return {
      field: spec.key,
      label,
      value: confirmed.value,
      source: confirmed.source,
      source_label: confirmed.source_label,
      origin_hint: null,
      unknown_label: PARSE_UNKNOWN,
    };
  }
  /*
   * Not yet settled: the step ② AI proposal lives in the persisted content items and is shown as
   * such - never as a confirmed value, and never silently promoted into the field slot.
   */
  const content_key = CONTENT_KEY_BY_ATTEMPT_FIELD[spec.attemptField];
  const proposal = content_items.find((item) => item.field_key === content_key);
  if (proposal !== undefined) {
    return {
      field: spec.key,
      label,
      value: proposal.value,
      source: 'ai',
      source_label: PARSE_SOURCE_AI,
      origin_hint: proposal.origin_hint,
      unknown_label: PARSE_UNKNOWN,
    };
  }
  return {
    field: spec.key,
    label,
    value: null,
    source: 'unknown',
    source_label: PARSE_UNKNOWN,
    origin_hint: null,
    unknown_label: PARSE_UNKNOWN,
  };
}

/** The ② / ③ field grid of one record. */
export function captureFieldsOf(snapshot: D9WorkflowSnapshot | null): readonly CaptureFieldView[] {
  if (snapshot === null) {
    return [];
  }
  return FIELD_SPECS.map((spec) =>
    fieldViewOf(snapshot.attempt, snapshot.capture.content_items, spec),
  );
}

/** The key parameters, always a list, each carrying its own provenance. */
export function keyParameterViewsOf(snapshot: D9WorkflowSnapshot | null): readonly CaptureFieldView[] {
  if (snapshot === null) {
    return [];
  }
  return snapshot.attempt.key_parameters.map((item, index) => ({
    field: 'key_parameters',
    label: `${fieldLabel('key_parameters')} ${index + 1}`,
    value: item.value,
    source: sourceRoleOf(item.source_type),
    source_label: sourceLabelOf(item.source_type),
    origin_hint: null,
    unknown_label: PARSE_UNKNOWN,
  }));
}

/* ------------------------------------------------------------------ *
 * The result status (a decision-type inference - §4.3 / AC-Q06-6)
 * ------------------------------------------------------------------ */

export interface ResultStatusView {
  readonly proposed_value: string | null;
  readonly decision_state: 'unresolved' | 'accepted' | 'rejected' | null;
  readonly confirmed: boolean;
  readonly label: string;
}

export function resultStatusViewOf(snapshot: D9WorkflowSnapshot | null): ResultStatusView {
  const label = fieldLabel('result_status');
  if (snapshot === null) {
    return { proposed_value: null, decision_state: null, confirmed: false, label };
  }
  const slot = snapshot.attempt.result_status;
  if (slot.presence_state === 'present') {
    /* 🔴 `result_status` is a DECISION-type inference; a `display` inference carries no decision. */
    const item = slot.item;
    const decision_state = item.confirmation_class === 'decision' ? item.decision_state : null;
    return {
      proposed_value: item.value,
      decision_state,
      confirmed: decision_state === 'accepted',
      label,
    };
  }
  const proposal = snapshot.capture.content_items.find(
    (item) => item.field_key === 'result_status',
  );
  return {
    proposed_value: proposal?.value ?? null,
    decision_state: null,
    confirmed: false,
    label,
  };
}

/* ------------------------------------------------------------------ *
 * Follow-up questions (② - max 3 in TOTAL, never three rounds)
 * ------------------------------------------------------------------ */

export interface AskableFollowUpView {
  readonly gap: string;
  readonly question_text: string;
  readonly source_label: string;
}

export interface FollowUpView {
  /** The next gap the SERVICE says may be asked about, or `null` when there is nothing to ask. */
  readonly next: AskableFollowUpView | null;
  readonly remaining: number;
  readonly asked_count: number;
  readonly exhausted: boolean;
  readonly skipped: readonly string[];
  /** Questions already registered, in order, with the wording they were registered with. */
  readonly asked: readonly string[];
}

export function followUpViewOf(snapshot: D9WorkflowSnapshot | null): FollowUpView {
  if (snapshot === null) {
    return { next: null, remaining: 0, asked_count: 0, exhausted: true, skipped: [], asked: [] };
  }
  const follow_up = snapshot.capture.follow_up;
  const asked = follow_up.budget.asked.map((entry) => entry.question_text);
  return {
    next:
      follow_up.next_gap === null || follow_up.exhausted
        ? null
        : {
            gap: follow_up.next_gap,
            question_text: followUpQuestionFor(follow_up.next_gap),
            source_label: FOLLOWUP_QUESTION_SOURCE,
          },
    remaining: follow_up.remaining,
    asked_count: follow_up.budget.asked.length,
    exhausted: follow_up.exhausted,
    skipped: follow_up.budget.skipped_gaps.map((gap) => fieldLabel(gap)),
    asked,
  };
}

export interface FollowUpAnswerLayerView {
  readonly value: string;
  readonly source_label: string;
}

export interface FollowUpAnswersView {
  /** The user's own wording, one entry per answer (`Fact`). */
  readonly user: readonly FollowUpAnswerLayerView[];
  /** The AI's induction of an answer, when the record actually carries one (`Extraction`). */
  readonly ai: readonly FollowUpAnswerLayerView[];
}

/**
 * The persisted double-layer of the follow-up answers.
 *
 * 🔴 The two layers are listed SEPARATELY and never merged (task §20). The AI layer is shown only
 *    when the record really carries one - it is never fabricated to make the pair look complete
 *    (`D-024`: a gap the user filled that the parse never covered has a `Fact` layer only).
 */
export function followUpAnswersOf(snapshot: D9WorkflowSnapshot | null): FollowUpAnswersView {
  if (snapshot === null) {
    return { user: [], ai: [] };
  }
  const items = snapshot.capture.content_items;
  const layer = (field_key: string, source_label: string): readonly FollowUpAnswerLayerView[] =>
    items
      .filter((item) => item.field_key === field_key)
      .map((item) => ({ value: item.value, source_label }));
  return {
    user: layer('followup_user_answer', FOLLOWUP_ANSWER_SOURCE_USER),
    ai: layer('followup_ai_extraction', FOLLOWUP_ANSWER_SOURCE_AI),
  };
}

/* ------------------------------------------------------------------ *
 * ④ candidate causes
 * ------------------------------------------------------------------ */

export interface CandidateCauseView {
  readonly content_item_id: string;
  readonly statement: string;
  readonly decision_state: CauseDecision;
  readonly decision_label: string;
  readonly source_label: string;
  readonly supporting_count: number;
}

export interface CausesView {
  readonly analysed: boolean;
  readonly candidates: readonly CandidateCauseView[];
  readonly empty_statement: string | null;
  readonly source_label: string;
}

function causeDecisionLabel(decision: CauseDecision): string {
  if (decision === 'accepted') {
    return CAUSES_STATE_ACCEPTED;
  }
  return decision === 'rejected' ? CAUSES_STATE_REJECTED : CAUSES_STATE_UNRESOLVED;
}

export function causesViewOf(
  proposal: CauseAnalysisProposal | null,
  decisions: Readonly<Record<string, CauseDecision>>,
): CausesView {
  if (proposal === null) {
    return { analysed: false, candidates: [], empty_statement: null, source_label: CAUSES_SOURCE };
  }
  return {
    analysed: true,
    candidates: proposal.candidates.map((candidate) => {
      const decision = decisions[candidate.content_item_id] ?? candidate.decision_state;
      return {
        content_item_id: candidate.content_item_id,
        statement: candidate.statement,
        decision_state: decision,
        decision_label: causeDecisionLabel(decision),
        source_label: CAUSES_SOURCE,
        supporting_count: candidate.supporting_source_paths.length,
      };
    }),
    /* 🔴 Zero candidates is a legal outcome and always carries its own explicit sentence (AC-92). */
    empty_statement: proposal.candidates.length === 0 ? proposal.absence_statement : null,
    source_label: CAUSES_SOURCE,
  };
}

/**
 * The candidate causes the RECORD ITSELF carries, in read order.
 *
 * 🔴 SESSION-FREE ON PURPOSE (`PRE-PSA-HARDENING-01` §4): `causesViewOf` renders the分析 the user just
 *    ran in THIS session, which a saved record has none of. Browsing a record must instead show what
 *    is persisted on it - and, when that is nothing, say exactly that rather than borrow the sentence
 *    of a declined analysis. No decision verb is derived here: the labels are the record's own.
 */
export function persistedCausesOf(snapshot: D9WorkflowSnapshot | null): readonly CandidateCauseView[] {
  if (snapshot === null) {
    return [];
  }
  return snapshot.attempt.candidate_causes.map((item) => ({
    content_item_id: String(item.content_item_id),
    statement: item.value,
    decision_state: item.decision_state,
    decision_label: causeDecisionLabel(item.decision_state),
    source_label: CAUSES_SOURCE,
    supporting_count: 0,
  }));
}

/* ------------------------------------------------------------------ *
 * ⑤ the Formal gate gap
 * ------------------------------------------------------------------ */

export interface FormalGateView {
  readonly ready: boolean;
  readonly missing: readonly string[];
}

/** The four prerequisites, READ through the domain's own predicate so the UI cannot drift from `M5`. */
export function formalGateViewOf(snapshot: D9WorkflowSnapshot | null): FormalGateView {
  if (snapshot === null) {
    return { ready: false, missing: [] };
  }
  const gate = evaluateFormalGate(snapshot.attempt);
  return {
    ready: gate.satisfied === true,
    missing: gate.missing_fields.map((field: FormalGateField) => fieldLabel(field)),
  };
}

/** The attempt's own raw words, shown back to the user so step ① stays visible. */
export function rawTextOf(snapshot: D9WorkflowSnapshot | null): string | null {
  if (snapshot === null) {
    return null;
  }
  return snapshot.attempt.raw_text.value.length > 0 ? snapshot.attempt.raw_text.value : null;
}
