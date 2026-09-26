/**
 * S01-06 ｜ The centre column: the guided ①→⑩ flow (task §6 / §54).
 *
 * 🔴 ONE CONTINUOUS LINE, NOT TEN MODULES. The cards are the product's own questions in the product's
 *    own order; no `M4`/`M5`/…/`M15` name is ever rendered, and the numbering shown is ①–⑩.
 * 🔴 THE UI DOES NOT AUTHORISE ANYTHING (task §54 / §49). A card shows a button when the READ MODEL
 *    offers the corresponding action; if the user clicks something the module then refuses, the refusal
 *    is displayed as a GATE notice. The interface never decides that a step "is allowed".
 * 🔴 `PRE-PSA-HARDENING-01` §4 - NO DRAFT AFFORDANCE ON A SAVED RECORD. ①–⑤ are the capture phase,
 *    and every command in them is offered by the read model ONLY for a `Draft` (`capabilitiesOf`).
 *    The cards therefore ask `actionOffered(...)` before drawing a control, so browsing a `Formal`
 *    record with no provider reads as a RECORD rather than as a half-filled draft (§4: 「不得让 UI
 *    看起来像可以继续 Capture Draft 流程」). The persisted fields keep being displayed - that is
 *    the read-only browse `S01-06-D1` promises.
 * 🔴 NOTHING IS GENERATED WITHOUT A CLICK (tasks §30 / §34). ⑧ and ⑨ each have exactly one entry
 *    point - the button below - and neither is reachable from a snapshot arriving, from a step
 *    finishing, or from another card's button.
 *
 * DOM scope only.
 */

import { badge, button, el, note, row } from '../dom.js';
import {
  CAPTURE_CARD_HINT,
  CAPTURE_CARD_TITLE,
  CAPTURE_START,
  CAPTURE_STARTING,
  CAPTURE_TEXTAREA_LABEL,
  CAUSES_ACCEPT,
  CAUSES_ACTION,
  CAUSES_ANALYSING,
  CAUSES_EMPTY,
  CAUSES_LEAVE,
  CAUSES_NONE_RECORDED,
  CAUSES_NOTE,
  CAUSES_REJECT,
  CAUSES_SOURCE,
  CAPTURE_HISTORY_READONLY,
  COMPARISON_NO_POINTS,
  CONFIRM_EXPLAIN,
  CONFIRM_HEADING,
  CONFIRM_SUBMIT,
  EXPERIENCE_ASSETS_HEADING,
  FOLLOWUP_ANSWER_LABEL,
  FOLLOWUP_ANSWER_SUBMIT,
  FOLLOWUP_ASK,
  FOLLOWUP_ASKING,
  FOLLOWUP_BUDGET_EXHAUSTED,
  FOLLOWUP_DONT_KNOW,
  FOLLOWUP_DOUBLE_LAYER_EXPLAIN,
  FOLLOWUP_NOTHING_TO_ASK,
  FOLLOWUP_PERSISTED_HEADING,
  FOLLOWUP_QUESTION_SOURCE,
  FOLLOWUP_RECORDED,
  FOLLOWUP_REMAINING,
  FOLLOWUP_SKIP,
  FOLLOWUP_SKIPPED_NOTE,
  FORMAL_ALREADY_SAVED,
  FORMAL_GATE_HINT,
  FORMAL_GATE_HEADING,
  FORMAL_RETRIEVING,
  FORMAL_SAVE,
  FORMAL_SAVED,
  FORMAL_SAVING,
  HYPOTHESIS_ACCEPT,
  HYPOTHESIS_ACCEPT_HINT,
  HYPOTHESIS_ACTION,
  HYPOTHESIS_CRITERIA_ACCEPT,
  HYPOTHESIS_CRITERIA_ADD,
  HYPOTHESIS_CRITERIA_ADD_SAVE,
  HYPOTHESIS_CRITERIA_REJECT,
  HYPOTHESIS_CRITERIA_SKIP,
  HYPOTHESIS_EMPTY,
  HYPOTHESIS_GENERATING,
  HYPOTHESIS_GROUNDED_HEADING,
  HYPOTHESIS_MODEL_ACCEPT,
  HYPOTHESIS_MODEL_NOTICE,
  HYPOTHESIS_MODEL_REJECT,
  HYPOTHESIS_MODEL_SAVE,
  HYPOTHESIS_MODEL_SAVED,
  HYPOTHESIS_MODEL_HEADING,
  INSIGHT_ACCEPT,
  INSIGHT_ACTION,
  INSIGHT_EDIT,
  INSIGHT_EDIT_SAVE,
  INSIGHT_EDITED_NEEDS_REACCEPT,
  INSIGHT_GENERATING,
  INSIGHT_REJECT,
  INSIGHT_REVOKE,
  PARSE_HEADING,
  PARSE_NOT_EXTRACTED,
  PARSE_SOURCE_AI,
  PARSE_UNKNOWN,
  RETRIEVAL_FAILED_AFTER_SAVE,
  RETRIEVAL_RERUN,
  RETRIEVAL_RERUNNING,
  STEP_LOCKED_HINT,
  TRACE_ACTION,
  citationCount,
} from '../copy.js';
import { causesViewOf, captureFieldsOf, followUpAnswersOf, followUpViewOf, formalGateViewOf, keyParameterViewsOf, persistedCausesOf, rawTextOf, resultStatusViewOf } from '../presenters/capture.js';
import { insightsPresentationOf, experienceAssetsEmptyStatement } from '../presenters/insights.js';
import { hypothesesPresentationOf } from '../presenters/hypotheses.js';
import { retrievalPresentationOf, saveAndRetrievalAreSplit } from '../presenters/retrieval.js';
import { actionOffered, stepViewsForSnapshot } from '../presenters/steps.js';
import type { D9StepView } from '../presenters/steps.js';
import type { CauseDecision } from '../../application/capture/types.js';
import type { ViewContext } from './shell.js';

/* ------------------------------------------------------------------ *
 * Layout primitives
 * ------------------------------------------------------------------ */

function stepCard(step: D9StepView, body: readonly (Node | null)[], extraClass = ''): HTMLElement {
  const classes = ['card', 'step-card', `step-${step.status}`];
  if (extraClass.length > 0) {
    classes.push(extraClass);
  }
  return el(
    'section',
    { class: classes.join(' '), attrs: { 'data-step': step.number } },
    el(
      'header',
      { class: 'step-head' },
      el('span', { class: 'step-number', text: step.number }),
      el('h2', { class: 'step-question', text: step.question }),
      badge(step.status_label, `step-${step.status}`),
    ),
    ...body.filter((node): node is Node => node !== null),
    step.locked_hint === null ? null : el('p', { class: 'hint', text: STEP_LOCKED_HINT }),
  );
}

function actions(...children: (Node | null)[]): HTMLElement {
  return el('div', { class: 'action-row' }, ...children);
}

/* ------------------------------------------------------------------ *
 * Entry
 * ------------------------------------------------------------------ */

export function workbench(context: ViewContext): HTMLElement {
  const { state } = context;
  const column = el('main', { class: 'workbench' });

  if (state.new_attempt_open || state.snapshot === null) {
    /* 🔴 The full step list is NOT shown before there is a record: ten empty steps would only
     *    describe an absence (task §56). */
    column.appendChild(captureEntryCard(context));
    return column;
  }

  const snapshot = state.snapshot;
  const steps = stepViewsForSnapshot(snapshot);
  column.appendChild(stepCard(steps[0] ?? emptyStep(), [rawTextBlock(context)], 'step-done'));
  column.appendChild(parseCard(context, steps[1] ?? emptyStep()));
  column.appendChild(confirmCard(context, steps[2] ?? emptyStep()));
  column.appendChild(causesCard(context, steps[3] ?? emptyStep()));
  column.appendChild(formalCard(context, steps[4] ?? emptyStep()));
  column.appendChild(retrievalCard(context, steps[5] ?? emptyStep()));
  column.appendChild(comparisonCard(context, steps[6] ?? emptyStep()));
  column.appendChild(insightCard(context, steps[7] ?? emptyStep()));
  column.appendChild(hypothesisCard(context, steps[8] ?? emptyStep()));
  column.appendChild(traceCard(context, steps[9] ?? emptyStep()));
  return column;
}

function emptyStep(): D9StepView {
  return {
    index: 0,
    number: '①',
    question: '',
    status: 'current',
    status_label: '',
    locked: false,
    locked_hint: null,
  };
}

/* ------------------------------------------------------------------ *
 * ① the natural-language entry
 * ------------------------------------------------------------------ */

function captureEntryCard(context: ViewContext): HTMLElement {
  const { state, session } = context;
  const pending = state.pending['capture'] === true;
  const textarea = el('textarea', {
    class: 'input input-area input-hero',
    attrs: {
      id: 'new-attempt-raw-text',
      rows: '6',
      'aria-label': CAPTURE_TEXTAREA_LABEL,
      placeholder: CAPTURE_CARD_HINT,
    },
    props: { value: state.raw_input },
    on: { input: (event) => session.setRawInput((event.target as HTMLTextAreaElement).value) },
  });

  return el(
    'section',
    { class: 'card card-entry', attrs: { 'data-step': '①' } },
    el('h1', { class: 'entry-title', text: CAPTURE_CARD_TITLE }),
    el('p', { class: 'note', text: CAPTURE_CARD_HINT }),
    el(
      'div',
      { class: 'form-row' },
      el('label', { class: 'form-label', attrs: { for: 'new-attempt-raw-text' }, text: CAPTURE_TEXTAREA_LABEL }),
      textarea,
    ),
    actions(
      button(pending ? CAPTURE_STARTING : CAPTURE_START, () => void session.beginCapture(), {
        class: 'btn btn-primary',
        disabled: pending,
        attrs: { 'aria-busy': pending ? 'true' : 'false', 'data-action': 'begin-capture' },
      }),
    ),
  );
}

function rawTextBlock(context: ViewContext): Node {
  const raw = rawTextOf(context.state.snapshot);
  return raw === null
    ? note(CAPTURE_CARD_HINT)
    : el('blockquote', { class: 'raw-text', text: raw });
}

/* ------------------------------------------------------------------ *
 * ② the structure and the follow-up questions
 * ------------------------------------------------------------------ */

function parseCard(context: ViewContext, step: D9StepView): HTMLElement {
  const { state, session } = context;
  const snapshot = state.snapshot;
  const fields = captureFieldsOf(snapshot);
  const parameters = keyParameterViewsOf(snapshot);
  const follow_up = followUpViewOf(snapshot);
  const answers = followUpAnswersOf(snapshot);
  const pending = state.pending['followup-ask'] === true;
  /*
   * 🔴 A saved record cannot be asked another follow-up question: `ask_follow_up_question` is offered
   *    by the read model for a `Draft` only, so 「继续追问」 is not a reachable action here.
   */
  const can_ask = actionOffered(snapshot, 'ask_follow_up_question');
  const skipped = follow_up.skipped.join('、');

  const grid = el(
    'div',
    { class: 'field-grid' },
    ...fields.map((field) =>
      el(
        'div',
        { class: `field-cell source-${field.source}` },
        el('div', { class: 'field-label', text: field.label }),
        el('div', { class: 'field-value', text: field.value ?? field.unknown_label }),
        /* 🔴 The provenance is always visible: an AI extraction never looks like a user fact. */
        el('div', { class: 'field-source', text: field.source_label }),
        field.origin_hint === null ? null : el('div', { class: 'field-origin', text: field.origin_hint }),
      ),
    ),
    ...parameters.map((parameter) =>
      el(
        'div',
        { class: `field-cell source-${parameter.source}` },
        el('div', { class: 'field-label', text: parameter.label }),
        el('div', { class: 'field-value', text: parameter.value ?? parameter.unknown_label }),
        el('div', { class: 'field-source', text: parameter.source_label }),
      ),
    ),
  );

  const followUpBlock = el('div', { class: 'followup' });
  if (can_ask) {
    followUpBlock.appendChild(el('h3', { class: 'sub-title', text: '关键追问' }));
    followUpBlock.appendChild(note(FOLLOWUP_REMAINING(follow_up.remaining)));
    if (follow_up.exhausted) {
      followUpBlock.appendChild(note(FOLLOWUP_BUDGET_EXHAUSTED));
    }
    if (follow_up.skipped.length > 0) {
      followUpBlock.appendChild(note(`${FOLLOWUP_SKIPPED_NOTE}（${skipped}）`));
    }

    if (state.pending_question !== null) {
      const question = state.pending_question;
      followUpBlock.appendChild(
        el(
          'div',
          { class: 'question-box' },
          el('div', { class: 'question-source', text: FOLLOWUP_QUESTION_SOURCE }),
          el('div', { class: 'question-text', text: question.text }),
        ),
      );
      const answerId = `followup-answer-${question.gap}`;
      followUpBlock.appendChild(
        el(
          'div',
          { class: 'form-row' },
          el('label', { class: 'form-label', attrs: { for: answerId }, text: FOLLOWUP_ANSWER_LABEL }),
          el('textarea', {
            class: 'input input-area',
            attrs: { id: answerId, rows: '3' },
            props: { value: state.followup_answers[question.gap] ?? '' },
            on: {
              input: (event) =>
                session.setFollowUpAnswer(question.gap, (event.target as HTMLTextAreaElement).value),
            },
          }),
        ),
      );
      followUpBlock.appendChild(note(FOLLOWUP_RECORDED));
      followUpBlock.appendChild(
        actions(
          button(FOLLOWUP_ANSWER_SUBMIT, () => session.flashMessage('followup-recorded'), {
            class: 'btn',
          }),
          button(FOLLOWUP_DONT_KNOW, () => void session.abandonFollowUp(question.gap), {
            class: 'btn btn-ghost',
          }),
          button(FOLLOWUP_SKIP, () => void session.abandonFollowUp(question.gap), {
            class: 'btn btn-ghost',
          }),
        ),
      );
    } else if (follow_up.next !== null) {
      followUpBlock.appendChild(
        actions(
          button(pending ? FOLLOWUP_ASKING : FOLLOWUP_ASK, () => void session.askNextFollowUp(), {
            class: 'btn',
            disabled: pending,
          }),
        ),
      );
    } else {
      followUpBlock.appendChild(note(FOLLOWUP_NOTHING_TO_ASK));
    }
  }

  if (answers.user.length > 0 || answers.ai.length > 0) {
    const persisted = el('div', { class: 'followup-persisted' });
    persisted.appendChild(el('h3', { class: 'sub-title', text: FOLLOWUP_PERSISTED_HEADING }));
    persisted.appendChild(note(FOLLOWUP_DOUBLE_LAYER_EXPLAIN));
    for (const layer of answers.user) {
      persisted.appendChild(
        el(
          'div',
          { class: 'layer layer-user' },
          el('div', { class: 'layer-source', text: layer.source_label }),
          el('div', { class: 'layer-value', text: layer.value }),
        ),
      );
    }
    for (const layer of answers.ai) {
      persisted.appendChild(
        el(
          'div',
          { class: 'layer layer-ai' },
          el('div', { class: 'layer-source', text: layer.source_label }),
          el('div', { class: 'layer-value', text: layer.value }),
        ),
      );
    }
    followUpBlock.appendChild(persisted);
  }

  const notExtracted = snapshot?.capture.draft_state.parse_state === 'not_extracted';
  return stepCard(
    step,
    [
      el('h3', { class: 'sub-title', text: PARSE_HEADING }),
      grid,
      notExtracted ? note(PARSE_NOT_EXTRACTED) : null,
      followUpBlock,
      /* 🔴 Say WHY the controls are gone: this is a saved record being read, not a broken draft. */
      can_ask ? null : note(CAPTURE_HISTORY_READONLY),
    ],
  );
}

/* ------------------------------------------------------------------ *
 * ③ the confirmation
 * ------------------------------------------------------------------ */

function confirmCard(context: ViewContext, step: D9StepView): HTMLElement {
  const { state, session } = context;
  const snapshot = state.snapshot;
  const fields = captureFieldsOf(snapshot);
  const status = resultStatusViewOf(snapshot);
  const pending = state.pending['confirmation'] === true;
  /* 🔴 Confirmation is a `Draft`-only command; a saved record shows its settled content instead. */
  const can_confirm = actionOffered(snapshot, 'apply_structured_confirmation');

  const editable = el(
    'div',
    { class: `field-grid${can_confirm ? ' editable' : ''}` },
    ...fields.map((field) => {
      const id = `confirm-${field.field}`;
      return el(
        'div',
        { class: `field-cell source-${field.source}` },
        can_confirm
          ? el('label', { class: 'field-label', attrs: { for: id }, text: field.label })
          : el('div', { class: 'field-label', text: field.label }),
        can_confirm
          ? el('textarea', {
              class: 'input input-area',
              attrs: { id, rows: '2', placeholder: field.value ?? field.unknown_label },
              props: { value: state.confirmation_edits[field.field] ?? field.value ?? '' },
              on: {
                input: (event) =>
                  session.setConfirmationEdit(field.field, (event.target as HTMLTextAreaElement).value),
              },
            })
          : el('div', { class: 'field-value', text: field.value ?? field.unknown_label }),
        el('div', { class: 'field-source', text: field.source_label }),
      );
    }),
  );

  const statusBlock = el(
    'div',
    { class: 'result-status' },
    el('h3', { class: 'sub-title', text: status.label }),
    el('div', { class: 'field-value', text: status.proposed_value ?? PARSE_UNKNOWN }),
    el('div', { class: 'field-source', text: PARSE_SOURCE_AI }),
    can_confirm
      ? actions(
          button(
            '接受这个结果状态',
            () => session.setResultStatusDecision('accepted'),
            { class: `btn ${state.result_status_decision === 'accepted' ? 'btn-primary' : ''}` },
          ),
          button('拒绝这个结果状态', () => session.setResultStatusDecision('rejected'), {
            class: `btn ${state.result_status_decision === 'rejected' ? 'btn-primary' : ''}`,
          }),
          button('暂不处理', () => session.setResultStatusDecision('unresolved'), {
            class: `btn ${state.result_status_decision === 'unresolved' ? 'btn-primary' : ''}`,
          }),
        )
      : null,
  );

  return stepCard(step, [
    el('h3', { class: 'sub-title', text: CONFIRM_HEADING }),
    can_confirm ? note(CONFIRM_EXPLAIN) : null,
    editable,
    statusBlock,
    can_confirm
      ? actions(
          button(pending ? FORMAL_SAVING : CONFIRM_SUBMIT, () => void session.confirmStructured(), {
            class: 'btn btn-primary',
            disabled: pending,
            attrs: { 'data-action': 'confirm-structured' },
          }),
        )
      : null,
  ]);
}

/* ------------------------------------------------------------------ *
 * ④ candidate causes
 * ------------------------------------------------------------------ */

function causesCard(context: ViewContext, step: D9StepView): HTMLElement {
  const { state, session } = context;
  const view = causesViewOf(state.cause_proposal, state.cause_decisions);
  const pending = state.pending['cause-analysis'] === true;
  /* 🔴 ④ is a `Draft`-only command as well; a saved record shows what it actually carries. */
  const can_analyse = actionOffered(state.snapshot, 'persist_candidate_causes');

  const body: (Node | null)[] = [];
  if (can_analyse) {
    body.push(
      actions(
        button(pending ? CAUSES_ANALYSING : CAUSES_ACTION, () => void session.analyseCauses(), {
          class: 'btn',
          disabled: pending,
          attrs: { 'data-action': 'analyse-causes' },
        }),
      ),
    );
  }

  if (view.analysed) {
    body.push(note(CAUSES_NOTE));
    if (view.candidates.length === 0) {
      /* 🔴 Zero candidates is legal and states its own reason (AC-92). */
      body.push(note(view.empty_statement ?? CAUSES_EMPTY));
    }
    for (const candidate of view.candidates) {
      body.push(
        causeCardOf(candidate, (content_item_id, decision) =>
          session.decideCause(content_item_id, decision),
        ),
      );
    }
  } else if (!can_analyse) {
    /*
     * 🔴 READ-ONLY ④: the causes the RECORD ITSELF carries, and nothing else. An empty list says so
     *    instead of leaving the card blank, and it is NOT the 「依据不足」 sentence - no analysis was
     *    declined here, the analysis simply is not part of a saved record's browse.
     */
    const recorded = persistedCausesOf(state.snapshot);
    body.push(note(recorded.length === 0 ? CAUSES_NONE_RECORDED : CAUSES_SOURCE));
    for (const cause of recorded) {
      body.push(causeCardOf(cause, null));
    }
  }
  return stepCard(step, body);
}

/**
 * One candidate-cause card. Shared by the live analysis (④, with its three decisions) and the
 * read-only browse of a saved record (`decide === null` - 🔴 no decision is offered there).
 */
function causeCardOf(
  candidate: {
    readonly content_item_id: string;
    readonly statement: string;
    readonly decision_state: string;
    readonly decision_label: string;
    readonly source_label: string;
  },
  decide: ((content_item_id: string, decision: CauseDecision) => void) | null,
): HTMLElement {
  return el(
    'article',
    { class: `cause-card state-${candidate.decision_state}` },
    el('div', { class: 'cause-source', text: candidate.source_label }),
    el('div', { class: 'cause-statement', text: candidate.statement }),
    el('div', { class: 'cause-meta' }, badge(candidate.decision_label, `cause-${candidate.decision_state}`)),
    decide === null
      ? null
      : actions(
          button(CAUSES_ACCEPT, () => decide(candidate.content_item_id, 'accepted'), {
            class: `btn btn-tiny ${candidate.decision_state === 'accepted' ? 'btn-primary' : ''}`,
          }),
          button(CAUSES_REJECT, () => decide(candidate.content_item_id, 'rejected'), {
            class: `btn btn-tiny ${candidate.decision_state === 'rejected' ? 'btn-primary' : ''}`,
          }),
          button(CAUSES_LEAVE, () => decide(candidate.content_item_id, 'unresolved'), {
            class: `btn btn-tiny ${candidate.decision_state === 'unresolved' ? 'btn-primary' : ''}`,
          }),
        ),
  );
}

/* ------------------------------------------------------------------ *
 * ⑤ the Formal save (and the ONE automatic ⑥)
 * ------------------------------------------------------------------ */

function formalCard(context: ViewContext, step: D9StepView): HTMLElement {
  const { state, session } = context;
  const gate = formalGateViewOf(state.snapshot);
  const pending = state.pending['formal-save'] === true;
  const saved = state.flash === 'saved';
  const split = saveAndRetrievalAreSplit(state.snapshot);
  /*
   * 🔴 THE SAVE BUTTON EXISTS ONLY WHILE THERE IS SOMETHING TO SAVE. `save_formal_attempt` is offered
   *    for a `Draft` only, so an already-saved record shows its own settled statement instead of a
   *    control that could only be refused. 🔴 The runtime statement below is NOT part of that: a real
   *    ⑥ failure after a save keeps its own sentence and its rerun button (§6).
   */
  const can_save = actionOffered(state.snapshot, 'save_formal_attempt');

  const body: (Node | null)[] = [];
  if (can_save && !gate.ready) {
    body.push(el('h3', { class: 'sub-title', text: FORMAL_GATE_HEADING }));
    body.push(note(FORMAL_GATE_HINT));
    body.push(el('ul', { class: 'plain-list' }, ...gate.missing.map((item) => el('li', { text: item }))));
  }
  if (can_save) {
    body.push(
      actions(
        button(pending ? FORMAL_SAVING : FORMAL_SAVE, () => void session.saveFormal(), {
          class: 'btn btn-primary',
          disabled: pending,
          attrs: { 'data-action': 'save-formal' },
        }),
      ),
    );
  } else {
    body.push(el('p', { class: 'success', text: FORMAL_ALREADY_SAVED }));
  }
  if (pending) {
    /* 🔴 ⑤ ⇒ ⑥ is automatic: the interface says so instead of offering a second click (§23 / §24). */
    body.push(el('p', { class: 'progress', attrs: { 'aria-busy': 'true' }, text: FORMAL_RETRIEVING }));
  }
  if (saved) {
    body.push(el('p', { class: 'success', text: FORMAL_SAVED }));
  }
  if (split) {
    body.push(
      el(
        'div',
        { class: 'notice notice-runtime', attrs: { role: 'alert' } },
        el('div', { class: 'notice-message', text: RETRIEVAL_FAILED_AFTER_SAVE }),
        button(RETRIEVAL_RERUN, () => void session.rerunRetrieval(), { class: 'btn btn-ghost' }),
      ),
    );
  }
  return stepCard(step, body);
}

/* ------------------------------------------------------------------ *
 * ⑥ the retrieval result
 * ------------------------------------------------------------------ */

function retrievalCard(context: ViewContext, step: D9StepView): HTMLElement {
  const { state, session } = context;
  const view = retrievalPresentationOf(state.snapshot, state.retrieval_expanded);
  const pending = state.pending['retrieval-rerun'] === true;
  const body: (Node | null)[] = [el('h3', { class: 'sub-title', text: view.headline })];

  if (view.phase === 'related') {
    body.push(el('div', { class: 'field-source', text: citationCount(view.n_retrieval ?? 0) }));
  }
  if (view.stale) {
    /* 🔴 Stale is a提示 + an opt-in button. The rerun NEVER happens by itself (§26). */
    body.push(
      el(
        'div',
        { class: 'notice notice-runtime', attrs: { role: 'status' } },
        el('div', { class: 'notice-message', text: view.stale_notice ?? '' }),
        button(pending ? RETRIEVAL_RERUNNING : RETRIEVAL_RERUN, () => void session.rerunRetrieval(), {
          class: 'btn btn-ghost',
          disabled: pending,
        }),
      ),
    );
  }
  return stepCard(step, body);
}

/* ------------------------------------------------------------------ *
 * ⑦ same / different
 * ------------------------------------------------------------------ */

function comparisonCard(context: ViewContext, step: D9StepView): HTMLElement {
  const { state, session } = context;
  const view = retrievalPresentationOf(state.snapshot, state.retrieval_expanded);
  const body: (Node | null)[] = [];

  if (view.phase !== 'related' || view.candidates.length === 0) {
    body.push(note(COMPARISON_NO_POINTS));
  }

  for (const candidate of view.candidates) {
    const card = el('article', { class: 'comparison-card' });
    card.appendChild(el('div', { class: 'comparison-head', text: candidate.attempt_id }));
    card.appendChild(pointBlock(view.section_titles.same, candidate.same_points, 'same'));
    card.appendChild(pointBlock(view.section_titles.different, candidate.different_points, 'different'));
    if (candidate.uncompared.length > 0) {
      card.appendChild(
        el(
          'div',
          { class: 'point-block uncompared' },
          el('div', { class: 'point-title', text: view.section_titles.uncompared }),
          el(
            'ul',
            { class: 'plain-list' },
            ...candidate.uncompared.map((dimension) =>
              el('li', {
                /* 🔴 A neutral marker: 「该维度未比对」 - never a negative judgement. */
                text: `${dimension}：${view.section_titles.uncompared_item}`,
              }),
            ),
          ),
        ),
      );
    }
    if (candidate.reasons.length > 0) {
      card.appendChild(
        el(
          'div',
          { class: 'point-block reason' },
          el('div', { class: 'point-title', text: view.section_titles.reason }),
          el('ul', { class: 'plain-list' }, ...candidate.reasons.map((reason) => el('li', { text: reason }))),
        ),
      );
    }
    card.addEventListener('click', () =>
      session.selectComparisonPoint({
        attempt_id: candidate.attempt_id,
        dimension_label: view.section_titles.same,
        text: candidate.same_points.map((point) => point.text).join(' / '),
        role: '依据',
      }),
    );
    body.push(card);
  }

  if (view.expandable) {
    body.push(
      actions(
        el('span', { class: 'hint', text: view.more_label }),
        button(view.expand_label, () => session.toggleRetrievalExpanded(), { class: 'btn btn-ghost' }),
      ),
    );
  }
  return stepCard(step, body);
}

function pointBlock(
  title: string,
  points: readonly { readonly dimension_label: string; readonly text: string }[],
  variant: string,
): HTMLElement {
  return el(
    'div',
    { class: `point-block ${variant}` },
    el('div', { class: 'point-title', text: title }),
    points.length === 0
      ? note('—')
      : el(
          'ul',
          { class: 'plain-list' },
          ...points.map((point) =>
            el('li', {}, el('span', { class: 'point-dim', text: point.dimension_label }), el('span', { text: point.text })),
          ),
        ),
  );
}

/* ------------------------------------------------------------------ *
 * ⑧ candidate insights and the Experience Asset area
 * ------------------------------------------------------------------ */

function insightCard(context: ViewContext, step: D9StepView): HTMLElement {
  const { state, session } = context;
  const view = insightsPresentationOf(state.snapshot);
  const pending = state.pending['insight-generation'] === true;
  const body: (Node | null)[] = [
    actions(
      button(pending ? INSIGHT_GENERATING : INSIGHT_ACTION, () => void session.generateInsights(), {
        class: 'btn',
        disabled: pending,
        attrs: { 'data-action': 'generate-insights' },
      }),
    ),
  ];

  if (view.generated && view.cards.length === 0) {
    body.push(note(view.empty_statement));
  }

  for (const card of view.cards) {
    const article = el('article', { class: `insight-card state-${card.state}` });
    article.appendChild(
      el(
        'div',
        { class: 'insight-head' },
        el('span', { class: 'insight-source', text: card.source_label }),
        badge(card.state_label, `insight-${card.state}`),
        el('span', { class: 'hint', text: citationCount(card.n_citation) }),
      ),
    );
    /* 🔴 A candidate is never captioned as a reusable asset (§30). */
    article.appendChild(el('div', { class: 'insight-proposition', text: card.proposition }));
    article.appendChild(row(card.content_labels.scope, card.applicable_scope));
    article.appendChild(row(card.content_labels.basis, card.judgment_basis));
    article.appendChild(
      el(
        'div',
        { class: 'gate-list' },
        ...card.gates.map((gate) =>
          el(
            'div',
            { class: `gate ${gate.satisfied ? 'gate-ok' : 'gate-missing'}` },
            el('div', { class: 'gate-head', text: `${gate.satisfied ? '✓' : '✗'} ${gate.label}` }),
            ...gate.missing.map((item) =>
              el(
                'div',
                { class: 'gate-missing-item' },
                row(gate.missing_labels.what, item.what),
                row(gate.missing_labels.why, item.why),
                item.how === null
                  ? null
                  : row(`${gate.missing_labels.how}（${item.how_source_label ?? ''}）`, item.how),
              ),
            ),
          ),
        ),
      ),
    );
    const editId = `insight-edit-${card.insight_id}`;
    article.appendChild(
      el(
        'div',
        { class: 'form-row' },
        el('label', { class: 'form-label', attrs: { for: editId }, text: INSIGHT_EDIT }),
        el('textarea', {
          class: 'input input-area',
          attrs: { id: editId, rows: '2' },
          props: { value: state.insight_edits[card.insight_id] ?? '' },
          on: {
            input: (event) =>
              session.setInsightEdit(card.insight_id, (event.target as HTMLTextAreaElement).value),
          },
        }),
      ),
    );
    article.appendChild(note(INSIGHT_EDITED_NEEDS_REACCEPT));
    article.appendChild(
      actions(
        card.state === 'accepted'
          ? button(INSIGHT_REVOKE, () => void session.revokeInsightAcceptance(card.insight_id), {
              class: 'btn btn-tiny',
            })
          : null,
        card.state === 'candidate' || card.state === 'rejected'
          ? button(INSIGHT_ACCEPT, () => void session.acceptInsight(card.insight_id), {
              class: 'btn btn-tiny btn-primary',
              disabled: !card.can_accept,
            })
          : null,
        card.state === 'candidate'
          ? button(INSIGHT_REJECT, () => void session.rejectInsight(card.insight_id), {
              class: 'btn btn-tiny',
            })
          : null,
        button(INSIGHT_EDIT_SAVE, () => void session.saveInsightEdit(card.insight_id), {
          class: 'btn btn-tiny btn-ghost',
        }),
      ),
    );
    body.push(article);
  }

  const assets = el('div', { class: 'experience-assets' });
  assets.appendChild(el('h3', { class: 'sub-title', text: EXPERIENCE_ASSETS_HEADING }));
  if (!view.has_experience_assets) {
    assets.appendChild(note(experienceAssetsEmptyStatement()));
  }
  for (const asset of view.experience_assets) {
    assets.appendChild(
      el(
        'article',
        { class: 'insight-card is-asset' },
        el(
          'div',
          { class: 'insight-head' },
          badge(asset.state_label, 'insight-accepted'),
          el('span', { class: 'hint', text: citationCount(asset.n_citation) }),
        ),
        el('div', { class: 'insight-proposition', text: asset.proposition }),
      ),
    );
  }
  body.push(assets);
  return stepCard(step, body);
}

/* ------------------------------------------------------------------ *
 * ⑨ hypotheses and model suggestions
 * ------------------------------------------------------------------ */

function hypothesisCard(context: ViewContext, step: D9StepView): HTMLElement {
  const { state, session } = context;
  const view = hypothesesPresentationOf(state.snapshot);
  const pending = state.pending['hypothesis-generation'] === true;
  const body: (Node | null)[] = [
    actions(
      button(pending ? HYPOTHESIS_GENERATING : HYPOTHESIS_ACTION, () => void session.generateHypotheses(), {
        class: 'btn',
        disabled: pending,
        attrs: { 'data-action': 'generate-hypotheses' },
      }),
    ),
  ];

  body.push(el('h3', { class: 'sub-title', text: HYPOTHESIS_GROUNDED_HEADING }));
  if (view.exit !== null) {
    /* 🔴 `EXIT-A/B/C` keep their own canonical meaning - B and C never say "history insufficient". */
    body.push(note(view.exit.statement));
  }
  if (view.generated && view.grounded.length === 0 && view.exit === null) {
    body.push(note(HYPOTHESIS_EMPTY));
  }
  for (const card of view.grounded) {
    body.push(hypothesisBody(context, card, false));
  }

  if (view.model_suggestions.length > 0) {
    /* 🔴 A separate area, with a permanent non-historical notice (§38). */
    body.push(el('h3', { class: 'sub-title', text: HYPOTHESIS_MODEL_HEADING }));
    body.push(note(HYPOTHESIS_MODEL_NOTICE));
    for (const card of view.model_suggestions) {
      body.push(hypothesisBody(context, card, true));
    }
  }
  return stepCard(step, body);
}

function hypothesisBody(
  context: ViewContext,
  card: ReturnType<typeof hypothesesPresentationOf>['grounded'][number],
  is_model_suggestion: boolean,
): HTMLElement {
  const { session } = context;
  const article = el('article', { class: `hypothesis-card ${is_model_suggestion ? 'is-model' : 'is-grounded'}` });
  article.appendChild(
    el(
      'div',
      { class: 'hypothesis-head' },
      el('span', { class: 'hypothesis-title', text: card.title }),
      badge(card.decision_label, `decision-${card.decision_state}`),
      is_model_suggestion
        ? badge('模型补充建议', 'model')
        : badge('基于历史的待验证方向', 'grounded'),
      el('span', { class: 'hint', text: citationCount(card.n_citation) }),
    ),
  );
  if (is_model_suggestion || card.model_prior_notice !== null) {
    article.appendChild(note(card.non_historical_notice));
  }
  article.appendChild(
    el(
      'div',
      { class: 'item-list' },
      ...card.items.map((item) =>
        el(
          'div',
          { class: `item ${item.present ? 'present' : 'missing'}` },
          el(
            'div',
            { class: 'item-head' },
            el('span', { class: 'item-label', text: item.label }),
            item.read_only ? badge('系统整理', 'readonly') : null,
          ),
          item.summary === null
            ? el('div', { class: 'item-missing', text: item.missing_label })
            : el('div', { class: 'item-value', text: item.summary }),
          ...item.entries.map((entry) =>
            el(
              'div',
              { class: `criterion source-${entry.source}` },
              el('div', { class: 'layer-source', text: entry.source_label }),
              el('div', { class: 'layer-value', text: entry.value }),
              entry.is_decidable
                ? actions(
                    button(
                      HYPOTHESIS_CRITERIA_ACCEPT,
                      () => void session.decideHypothesisCriterion(card.hypothesis_id, entry.content_item_id, 'accepted'),
                      { class: `btn btn-tiny ${entry.decision_state === 'accepted' ? 'btn-primary' : ''}` },
                    ),
                    button(
                      HYPOTHESIS_CRITERIA_REJECT,
                      () => void session.decideHypothesisCriterion(card.hypothesis_id, entry.content_item_id, 'rejected'),
                      { class: `btn btn-tiny ${entry.decision_state === 'rejected' ? 'btn-primary' : ''}` },
                    ),
                    button(
                      HYPOTHESIS_CRITERIA_SKIP,
                      () => void session.decideHypothesisCriterion(card.hypothesis_id, entry.content_item_id, 'unresolved'),
                      { class: `btn btn-tiny btn-ghost` },
                    ),
                  )
                : null,
            ),
          ),
          /* 🔴 A user may ADD their own ⑥⑦⑧ content. It is stored as the user's own `Fact` and is
           *    labelled 「你提供的信息」 - never as something the model confirmed (§36). */
          item.read_only ? null : userCriterionInput(context, card.hypothesis_id, item.key),
        ),
      ),
    ),
  );
  if (card.kept_condition_recommendations.length > 0) {
    article.appendChild(
      el(
        'div',
        { class: 'recommendations' },
        el('div', { class: 'point-title', text: 'AI 建议保持不变的条件' }),
        el(
          'ul',
          { class: 'plain-list' },
          ...card.kept_condition_recommendations.map((value) => el('li', { text: value })),
        ),
      ),
    );
  }
  article.appendChild(note(HYPOTHESIS_ACCEPT_HINT));
  article.appendChild(
    actions(
      button(HYPOTHESIS_ACCEPT, () => void session.acceptHypothesis(card.hypothesis_id), {
        class: 'btn btn-tiny btn-primary',
        disabled: !card.can_accept,
      }),
      card.can_reject
        ? button('拒绝这个方向', () => void session.rejectHypothesis(card.hypothesis_id), {
            class: 'btn btn-tiny',
          })
        : null,
      is_model_suggestion
        ? button(HYPOTHESIS_MODEL_SAVE, () => void session.saveModelSuggestion(card.hypothesis_id, true), {
            class: 'btn btn-tiny',
          })
        : null,
      is_model_suggestion
        ? button(
            card.saved === true ? HYPOTHESIS_MODEL_SAVED : HYPOTHESIS_MODEL_REJECT,
            () => void session.saveModelSuggestion(card.hypothesis_id, false),
            { class: 'btn btn-tiny btn-ghost' },
          )
        : null,
      is_model_suggestion
        ? button(HYPOTHESIS_MODEL_ACCEPT, () => void session.acceptHypothesis(card.hypothesis_id), {
            class: 'btn btn-tiny',
            disabled: !card.can_accept,
          })
        : null,
    ),
  );
  return article;
}

/** The additive control for one editable ⑥⑦⑧ slot (an uncontrolled input plus one explicit save). */
function userCriterionInput(
  context: ViewContext,
  hypothesis_id: string,
  slot: string,
): HTMLElement {
  const { session } = context;
  const input = el('input', {
    class: 'input',
    attrs: {
      type: 'text',
      'aria-label': HYPOTHESIS_CRITERIA_ADD,
      placeholder: HYPOTHESIS_CRITERIA_ADD,
    },
  });
  return actions(
    input,
    button(
      HYPOTHESIS_CRITERIA_ADD_SAVE,
      () => {
        const value = input.value;
        if (value.trim().length === 0) {
          return;
        }
        void session.addHypothesisCriterion(
          hypothesis_id,
          slot as Parameters<typeof session.addHypothesisCriterion>[1],
          value,
        );
        input.value = '';
      },
      { class: 'btn btn-tiny' },
    ),
  );
}

/* ------------------------------------------------------------------ *
 * ⑩ evidence traceability
 * ------------------------------------------------------------------ */

function traceCard(context: ViewContext, step: D9StepView): HTMLElement {
  const { state, session } = context;
  const view = hypothesesPresentationOf(state.snapshot);
  const body: (Node | null)[] = [];

  for (const card of view.grounded) {
    body.push(
      el(
        'div',
        { class: 'trace-row' },
        el('span', { class: 'trace-title', text: card.items[0]?.summary ?? card.title }),
        el('span', { class: 'hint', text: citationCount(card.n_citation) }),
        button(TRACE_ACTION, () => void session.traceHypothesis(card.hypothesis_id), {
          class: 'btn btn-tiny',
          attrs: { 'data-action': 'trace-hypothesis' },
        }),
      ),
    );
  }
  if (view.grounded.length === 0) {
    body.push(note('还没有可追溯的待验证方向。'));
  }
  if (state.evidence !== null) {
    body.push(note(`右侧显示：${state.evidence.citation_label ?? state.evidence.title}`));
  }
  return stepCard(step, body);
}
