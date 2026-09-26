/**
 * S01-06 ｜ Step derivation: which of ①–⑩ is done, which is the current focus (task §7 / §54 / §55).
 *
 * 🔴 THE WHOLE POINT OF THIS FILE: the ten step states are DERIVED, never stored. There is no
 *    `current_step`, no `progress_percent`, no `workflow_stage`, no `step_completed[]` and no
 *    `completion_score` - not in the workspace, not in this module, not anywhere. A reload rebuilds
 *    the very same view from the persisted objects through `M15`'s read model.
 *
 * 🔴 IT IS A DISPLAY HINT, NOT A PERMISSION. `available_actions` (and the module gates behind it)
 *    decide what may actually run; this module only decides which card the interface highlights. A
 *    wrong hint can therefore never authorise an action - it can only make the screen look odd.
 *
 * 🔴 `PRE-PSA-HARDENING-01` §2 / §3 - A `Formal` RECORD HAS NO CAPTURE PHASE LEFT. The steps ①–⑤
 *    describe the capture lifecycle, and `Formal` IS that lifecycle's persisted end (`D-045`). For a
 *    saved record the read model offers no capture command at all, so deriving ②/③/④ from the mere
 *    ABSENCE of a `DraftState` would point the focus at an action that does not exist - and would
 *    draw 「当前」/「继续追问」 on a record that finished being captured long ago. `Formal` therefore
 *    settles ①–⑤ from that ONE persisted fact, and the focus moves to the post-save chain ⑥–⑩,
 *    whose steps keep their own per-object derivation. A `Draft` is untouched: ② is the focus
 *    exactly when its parse has not run.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO I/O.
 */

import {
  STEP_COPY,
  STEP_LOCKED_HINT,
  STEP_STATUS_CURRENT,
  STEP_STATUS_DONE,
  STEP_STATUS_TODO,
} from '../copy.js';
import type { D9WorkflowSnapshot, WorkflowCapability } from '../../application/workflow/types.js';

export type D9StepStatus = 'done' | 'current' | 'todo';

export interface D9StepView {
  /** 0-based position. */
  readonly index: number;
  /** ① … ⑩ - the product's own numbering. */
  readonly number: string;
  readonly question: string;
  readonly status: D9StepStatus;
  readonly status_label: string;
  /** `true` for a step beyond the current focus: it is still visible, but not yet reachable. */
  readonly locked: boolean;
  readonly locked_hint: string | null;
}

/**
 * The observable facts every step state is derived from.
 *
 * 🔴 Each field is read off `M15`'s read model: `attempt_state`, the capture draft state, the
 *    persisted candidate causes, the retrieval state, the generation batches. Nothing is inferred
 *    from "the user probably clicked something earlier".
 */
export interface D9StepFacts {
  readonly captured: boolean;
  readonly parsed: boolean;
  readonly confirmed: boolean;
  readonly causes_recorded: boolean;
  readonly formal: boolean;
  readonly retrieved: boolean;
  readonly compared: boolean;
  readonly insights_generated: boolean;
  readonly hypotheses_generated: boolean;
  readonly traced: boolean;
}

const NO_FACTS: D9StepFacts = {
  captured: false,
  parsed: false,
  confirmed: false,
  causes_recorded: false,
  formal: false,
  retrieved: false,
  compared: false,
  insights_generated: false,
  hypotheses_generated: false,
  traced: false,
};

export function stepFactsOf(snapshot: D9WorkflowSnapshot | null): D9StepFacts {
  if (snapshot === null) {
    return NO_FACTS;
  }
  const parse_state = snapshot.capture.draft_state.parse_state;
  const formal = snapshot.attempt_state === 'Formal';
  const retrieved = snapshot.retrieval.state === 'ready';
  const candidate_count = snapshot.retrieval.view?.candidates.length ?? 0;

  return {
    /* A snapshot exists only for a persisted `Attempt`, so step ① has been recorded. */
    captured: true,
    /* An AI parse ran (or was attempted): the draft state left `not_parsed`. */
    parsed:
      formal ||
      parse_state === 'pending_user_confirm' ||
      parse_state === 'extracted' ||
      parse_state === 'not_extracted',
    /* The user settled the structured content: confirmation writes `extracted`. */
    confirmed: parse_state === 'extracted' || formal,
    /*
     * 🔴 `formal || …`: a saved record's capture phase is closed (see the file header). This is a
     *    PHASE-level statement about the record, not a claim that a per-record cause analysis ran -
     *    `candidate_causes` stays exactly what is persisted, and the ④ card renders that as-is.
     */
    causes_recorded: formal || snapshot.attempt.candidate_causes.length > 0,
    formal,
    retrieved,
    compared: retrieved && candidate_count > 0,
    insights_generated: snapshot.insights.batches.length > 0,
    hypotheses_generated: snapshot.hypotheses.batches.length > 0,
    traced:
      snapshot.hypotheses.batches.length > 0 &&
      snapshot.hypotheses.views.some((view) => view.citation.n_citation > 0),
  };
}

/** The facts in step order - the order is the product's, so it is stated once, here. */
function orderedFacts(facts: D9StepFacts): readonly boolean[] {
  return [
    facts.captured,
    facts.parsed,
    facts.confirmed,
    facts.causes_recorded,
    facts.formal,
    facts.retrieved,
    facts.compared,
    facts.insights_generated,
    facts.hypotheses_generated,
    facts.traced,
  ];
}

/**
 * The ten step views.
 *
 * 🔴 The FIRST unfinished step becomes the current focus; every later one is `todo`. Nothing is
 *    skipped and nothing is reordered: the guided flow is one continuous line (§6).
 * 🔴 For a `Formal` record the capture phase is already settled by `stepFactsOf`, so the first
 *    unfinished step is necessarily one of ⑥–⑩ - the focus can never land back on ①–⑤.
 */
export function stepViewsOf(facts: D9StepFacts): readonly D9StepView[] {
  const ordered = orderedFacts(facts);
  const firstOpen = ordered.findIndex((done) => !done);
  const focus = firstOpen === -1 ? ordered.length - 1 : firstOpen;

  return STEP_COPY.map((copy, index) => {
    const done = ordered[index] === true;
    const status: D9StepStatus = done ? 'done' : index === focus ? 'current' : 'todo';
    return {
      index,
      number: copy.number,
      question: copy.question,
      status,
      status_label:
        status === 'done'
          ? STEP_STATUS_DONE
          : status === 'current'
            ? STEP_STATUS_CURRENT
            : STEP_STATUS_TODO,
      locked: status === 'todo',
      locked_hint: status === 'todo' ? STEP_LOCKED_HINT : null,
    };
  });
}

export function stepViewsForSnapshot(snapshot: D9WorkflowSnapshot | null): readonly D9StepView[] {
  return stepViewsOf(stepFactsOf(snapshot));
}

/** The ①…⑩ number the interface should focus, or `null` when the flow is complete. */
export function currentStepNumberOf(views: readonly D9StepView[]): string | null {
  const current = views.find((view) => view.status === 'current');
  return current?.number ?? null;
}

/** Is this step the current focus? Used to decide which card gets the emphasis. */
export function isCurrentStep(views: readonly D9StepView[], index: number): boolean {
  return views[index]?.status === 'current';
}

/** Should this card be rendered in its "already settled" look? */
export function isSettledStep(views: readonly D9StepView[], index: number): boolean {
  return views[index]?.status === 'done';
}

/**
 * Does the read model currently offer this command for the record on screen?
 *
 * 🔴 THE UI ASKS, THE READ MODEL ANSWERS (`PRE-PSA-HARDENING-01` §4). `available_actions` is derived
 *    by `M15` from the record's own state, so a Draft-only button can never be rendered for a record
 *    that no longer has a capture phase - a provider-less browse of a historical record must not look
 *    like a draft being filled in.
 * 🔴 It is a RENDER decision only: the module gates still refuse anything that is not allowed.
 */
export function actionOffered(
  snapshot: D9WorkflowSnapshot | null,
  action: WorkflowCapability,
): boolean {
  return snapshot !== null && snapshot.available_actions.includes(action);
}
