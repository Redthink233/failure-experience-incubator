/**
 * FINAL-RAPID-C ｜ UI button semantics + presenter integrity.
 *
 * 🔴 These are `IMPLEMENTATION INVARIANT` cases, not new product `AC`. Each one pins a property a
 *    later edit could silently break, and each was chosen because the property is INVISIBLE from a
 *    happy-path walkthrough:
 *      · an empty ⑥ state that offers no way to start the retrieval it says it has none of;
 *      · a step badged 「尚未开始」 that still offers its action;
 *      · a button that looks like a commit and commits nothing;
 *      · a click on 「差异点」 that quietly delivers the similarities;
 *      · a second click that the session swallows without telling anyone;
 *      · a provider switch that carries the previous provider's model AND secret;
 *      · a preset that saves into a `ready` provider nothing can reach;
 *      · a locked ⑤ that announces a save which never happened.
 * 🔴 `src/ui/components/**` IS DOM SCOPE and cannot be imported here (`tsconfig.test.json` carries no
 *    DOM lib). The render-side properties are therefore asserted the way the repository already does
 *    it - by reading the source and pinning the STRUCTURE (which guard precedes which button) - while
 *    everything that can be a pure function is tested as one. The behavioural halves live in
 *    `presenters/retrieval.ts` (`comparisonSelectionOf`) and `presenters/busy.ts` precisely so that
 *    the interesting part of this file is not a text match.
 * 🔴 NOTHING HERE TOUCHES A FILE, A WORKSPACE OR A NETWORK. Every key is a fake fixture value.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { D9WorkflowSnapshot } from '../../application/workflow/types.js';
import {
  ACTION_PENDING,
  COMPARISON_DIFFERENT,
  COMPARISON_EVIDENCE_ROLE_BASIS,
  COMPARISON_EVIDENCE_ROLE_CONTEXT,
  COMPARISON_SAME,
  COMPARISON_UNCOMPARED_ITEM,
  RETRIEVAL_FAILED_AFTER_SAVE,
  RETRIEVAL_HISTORY_EMPTY,
  RETRIEVAL_NO_RELATED_HISTORY,
  RETRIEVAL_NOT_AVAILABLE,
  RETRIEVAL_RUNTIME_INCOMPLETE,
  SETTINGS_PRESET_NOT_ENABLED,
  SETTINGS_PRESET_OPTION_DISABLED,
  STEP_LOCKED_HINT,
} from '../../ui/copy.js';
import {
  comparisonSelectionOf,
  retrievalPresentationOf,
  retrievalStartIsOffered,
} from '../../ui/presenters/retrieval.js';
import { actionOffered, stepViewsForSnapshot } from '../../ui/presenters/steps.js';
import { hypothesisActionKey, insightActionKey, isPendingKey } from '../../ui/presenters/busy.js';
import {
  PROVIDER_PRESETS,
  draftForPreset,
  findPreset,
  providerConfigOf,
  validateSettingsDraft,
} from '../../ui/settings/provider-presets.js';
import type { SettingsDraft } from '../../ui/settings/provider-presets.js';
import { readRepoFile, stripComments } from '../ai/source-scan.js';

type Snapshot = D9WorkflowSnapshot;

/* ================================================================== *
 * Source helpers - the DOM scope is audited by reading it
 * ================================================================== */

const STEPS = 'src/ui/components/steps.ts';
const SHELL = 'src/ui/components/shell.ts';
const SESSION = 'src/ui/session/app-session.ts';
const COPY = 'src/ui/copy.ts';
const PRESETS = 'src/ui/settings/provider-presets.ts';

/**
 * 🔴 LINE ENDINGS ARE NORMALISED BEFORE ANY STRUCTURAL MATCH, AND THAT IS NOT COSMETIC.
 *
 * This worktree is checked out with CRLF: Git for Windows defaults `core.autocrlf` to `true` and the
 * repository carries no `.gitattributes`. A slice written as `indexOf('\n}\n')` therefore NEVER fires
 * (`stripComments` splits on `\n` and keeps the `\r`), so the slice silently runs to the end of the
 * file - and an assertion about what the function does NOT contain quietly stops meaning anything.
 * Normalising makes these cases independent of how the tree was checked out, which is the only way a
 * structural invariant can be trusted.
 */
function normalise(source: string): string {
  return source.replace(/\r\n?/gu, '\n');
}

/** A repository source file, comment-free and line-ending-independent. */
function repositoryFile(path: string): string {
  return normalise(stripComments(readRepoFile(path)));
}

/** `steps.ts` - the DOM-scope file every render assertion below reads. */
function stepsSource(): string {
  return repositoryFile(STEPS);
}

/** A top-level `function <name>(…) { … }` body, up to its closing brace at column 0. */
function functionBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist in the source`);
  const rest = source.slice(start);
  const end = rest.indexOf('\n}\n');
  assert.ok(end >= 0, `${name} must be a top-level function with a closing brace at column 0`);
  return rest.slice(0, end);
}

/** A method of the object literal `createAppSession` returns. */
function methodBody(source: string, name: string): string {
  for (const prefix of ['\n    async ', '\n    ']) {
    const start = source.indexOf(`${prefix}${name}(`);
    if (start >= 0) {
      const rest = source.slice(start + 1);
      const end = rest.indexOf('\n    },');
      assert.ok(end >= 0, `${name} must be an object-literal method`);
      return rest.slice(0, end);
    }
  }
  throw new Error(`${name} must exist in ${SESSION}`);
}

/** How many `disabled:` expressions in a chunk are decided by `busy`. */
function busyDisabledCount(code: string): number {
  return (code.match(/disabled:[^,\n}]*busy/gu) ?? []).length;
}

/* ================================================================== *
 * Snapshot fixtures (pure-function inputs - never written to a workspace)
 * ================================================================== */

/** What `M15` really derives for a saved record: post-save commands, and no capture command. */
const FORMAL_ACTIONS: readonly string[] = [
  'begin_capture',
  'rerun_retrieval',
  'generate_insights',
  'generate_hypotheses',
  'set_attempt_archived',
];

/** …and for a draft that has not finished its capture phase. */
const DRAFT_ACTIONS: readonly string[] = [
  'begin_capture',
  'apply_structured_confirmation',
  'ask_follow_up_question',
  'abandon_follow_up_gap',
  'persist_candidate_causes',
  'save_formal_attempt',
];

function baseSnapshot(): Record<string, unknown> {
  return {
    attempt_id: 'ATT_fixture',
    attempt_state: 'Draft',
    archive_state: 'active',
    attempt: {
      attempt_id: 'ATT_fixture',
      state: 'Draft',
      candidate_causes: [],
    },
    capture: {
      draft_state: { parse_state: 'not_parsed' },
      content_items: [],
      follow_up: { remaining: 3, exhausted: false, next_gap: null, skipped_gaps: [] },
    },
    retrieval: {
      state: 'not_available',
      derivation: null,
      view: null,
      n_retrieval: null,
      zero_like_state: null,
      freshness: { stale: false, notice: null },
      runtime_failure: null,
    },
    insights: { batches: [], current_batch_id: null, views: [], experience_assets: [], state_events: {} },
    hypotheses: { batches: [], current_batch_id: null, views: [], model_suggestions: [] },
    notices: [],
    available_actions: ['begin_capture'],
  };
}

function snapshotWith(patch: Record<string, unknown>): Snapshot {
  return { ...baseSnapshot(), ...patch } as unknown as Snapshot;
}

/** One related candidate, with a similarity, a difference and an uncompared dimension. */
function candidateEntry(attempt_id: string): Record<string, unknown> {
  return {
    candidate_attempt_id: attempt_id,
    matched_level_a_dimensions: ['goal'],
    similar_points: [{ dimension: 'goal', source_value: 'G', candidate_value: 'G', text: '目标一致' }],
    difference_points: [
      { dimension: 'approach', source_value: 'S1', candidate_value: 'S2', text: '做法不同' },
    ],
    uncompared_dimensions: ['result'],
    uncompared_notes: ['结果未比对'],
    relevance_reasons: [{ dimension: 'goal', text: '目标相同' }],
    auxiliary_context: { same_project: true, shared_failure_tags: [], environment: null },
  };
}

function relatedRetrieval(): Record<string, unknown> {
  return {
    state: 'ready',
    n_retrieval: 1,
    zero_like_state: null,
    freshness: { stale: false, notice: null },
    runtime_failure: null,
    derivation: null,
    view: {
      source_attempt_id: 'ATT_fixture',
      status: 'RELATED_HISTORY',
      n_retrieval: 1,
      uncompared_dimensions: ['result'],
      uncompared_notes: ['结果未比对'],
      candidates: [candidateEntry('ATT_related_0')],
      first_screen_size: 1,
      total_candidate_count: 1,
      remaining_beyond_first_screen: 0,
      expandable: false,
      expanded: false,
    },
  };
}

/* ================================================================== *
 * UI-RET - the ⑥ recovery entry point and its sentence
 * ================================================================== */

describe('FINAL-RAPID-C ｜ UI-RET: the empty ⑥ state is startable and claims no history', () => {
  it('UI-RET-01 / IMPLEMENTATION INVARIANT: a Formal record with nothing stored still offers the retrieval', () => {
    const formal = snapshotWith({ attempt_state: 'Formal', available_actions: FORMAL_ACTIONS });
    const view = retrievalPresentationOf(formal, false);

    assert.equal(view.phase, 'not_available');
    assert.equal(view.n_retrieval, null, 'nothing stored is `null`, never `0`');
    assert.equal(view.start_offered, true, 'the empty state must be STARTABLE or ⑦–⑩ stay unreachable');
    assert.equal(retrievalStartIsOffered(view), true);

    /*
     * 🔴 The render side: the control is really wired, and it is wired to the RETRIEVAL command.
     *    Read as structure, because `steps.ts` cannot be imported here.
     */
    const retrieval = functionBody(stepsSource(), 'retrievalCard');
    assert.ok(retrieval.includes('if (view.start_offered)'), 'the card must consult the flag');
    assert.ok(
      retrieval.includes('RETRIEVAL_START, () => void session.rerunRetrieval()'),
      'the control must call the existing explicit retrieval command',
    );
    /* 🔴 It must not re-save the record, and it must not reach a generation. */
    assert.equal(retrieval.includes('saveFormal'), false, 'a retrieval must never re-save a Formal');
    assert.equal(retrieval.includes('generateInsights'), false);
    assert.equal(retrieval.includes('generateHypotheses'), false);
  });

  it('UI-RET-01b / IMPLEMENTATION INVARIANT: the entry point is asked of the read model, never assumed', () => {
    /* A record whose read model offers no retrieval command gets no control. */
    const without = snapshotWith({ attempt_state: 'Formal', available_actions: ['begin_capture'] });
    assert.equal(retrievalStartIsOffered(retrievalPresentationOf(without, false)), false);

    /* A stored comparison is the rerun / stale path's business, never the start control's. */
    const related = snapshotWith({
      attempt_state: 'Formal',
      available_actions: FORMAL_ACTIONS,
      retrieval: relatedRetrieval(),
    });
    const related_view = retrievalPresentationOf(related, false);
    assert.equal(related_view.phase, 'related');
    assert.equal(related_view.start_offered, false);

    /* No snapshot at all: nothing is offered. */
    assert.equal(retrievalStartIsOffered(retrievalPresentationOf(null, false)), false);

    /* And the shell does not start anything on its own. */
    const session = repositoryFile(SESSION);
    assert.equal(
      /rerunRetrieval\(\)/u.test(methodBody(session, 'attachWorkspace')),
      false,
      'a read must never trigger a retrieval',
    );
  });

  it('UI-RET-02 / IMPLEMENTATION INVARIANT: the empty ⑥ sentence states the present, not a history', () => {
    /*
     * 🔴 The wording this replaced asserted what the record's PAST contained. A reload cannot support
     *    that claim, and neither can the screen: the same state is reached by a record that was never
     *    retrieved and by one that was simply reopened.
     */
    for (const claim of ['还没有做过', '从未', '从没', '没做过']) {
      assert.equal(
        RETRIEVAL_NOT_AVAILABLE.includes(claim),
        false,
        `「${claim}」 claims a history the screen cannot support`,
      );
    }
    assert.equal(RETRIEVAL_NOT_AVAILABLE, '当前没有可用的历史检索结果。');

    /* 🔴 The four 0-like states stay four DIFFERENT sentences (task §25). */
    const four = [
      RETRIEVAL_NOT_AVAILABLE,
      RETRIEVAL_HISTORY_EMPTY,
      RETRIEVAL_NO_RELATED_HISTORY,
      RETRIEVAL_RUNTIME_INCOMPLETE,
    ];
    assert.equal(new Set(four).size, 4, 'no two of the four states may share a sentence');
    for (const sentence of four) {
      assert.equal(sentence.includes('暂无数据'), false);
    }
  });

  it('UI-RET-02b / IMPLEMENTATION INVARIANT: a real ⑥ failure keeps its own sentence and its rerun', () => {
    /* 🔴 `runtime_incomplete` is a DIFFERENT state and must not be re-worded by the fix above. */
    const failed = snapshotWith({
      attempt_state: 'Formal',
      available_actions: FORMAL_ACTIONS,
      retrieval: {
        ...(baseSnapshot().retrieval as Record<string, unknown>),
        state: 'runtime_incomplete',
      },
    });
    const view = retrievalPresentationOf(failed, false);
    assert.equal(view.phase, 'runtime_incomplete');
    assert.equal(view.headline, RETRIEVAL_RUNTIME_INCOMPLETE);
    assert.equal(view.start_offered, false, 'a failure is reported, not "started"');

    /* The combined 「saved + retrieval did not finish」 statement and its rerun stay wired in ⑤. */
    const formal = functionBody(stepsSource(), 'formalCard');
    assert.ok(formal.includes('saveAndRetrievalAreSplit(state.snapshot)'));
    const branch = formal.indexOf('if (split) {');
    const sentence = formal.indexOf('RETRIEVAL_FAILED_AFTER_SAVE');
    const rerun = formal.indexOf('RETRIEVAL_RERUN, () => void session.rerunRetrieval()');
    assert.ok(branch >= 0, 'the split case must have its own branch');
    assert.ok(
      sentence > branch && rerun > sentence,
      'the failure statement and its rerun must render together, inside that branch',
    );
    /* 🔴 The sentence states a RUNTIME outcome, and it is only reached for a real failure. */
    assert.equal(RETRIEVAL_FAILED_AFTER_SAVE.includes('没有完成'), true);
  });
});

/* ================================================================== *
 * UI-LOCK - a locked step offers no action
 * ================================================================== */

describe('FINAL-RAPID-C ｜ UI-LOCK: a step the flow model marks `todo` offers no action', () => {
  it('UI-LOCK-01 / IMPLEMENTATION INVARIANT: ⑧ offers no generation while ⑦ is unfinished', () => {
    /* A saved record with nothing compared ⇒ the focus is ⑥, so ⑧ is `todo`. */
    const awaiting = snapshotWith({ attempt_state: 'Formal', available_actions: FORMAL_ACTIONS });
    const views = stepViewsForSnapshot(awaiting);
    assert.equal(views[7]?.locked, true, '⑧ must be locked while ⑦ has no comparison');
    assert.equal(views[8]?.locked, true);
    assert.equal(views[7]?.locked_hint, STEP_LOCKED_HINT);

    const insight = functionBody(stepsSource(), 'insightCard');
    const guard = insight.indexOf('if (!step.locked)');
    const control = insight.indexOf("'generate-insights'");
    assert.ok(guard >= 0, '⑧ must consult the step lock');
    assert.ok(control > guard, 'the generation control must sit INSIDE the lock guard');
  });

  it('UI-LOCK-02 / IMPLEMENTATION INVARIANT: ⑨ offers no generation while ⑧ has produced nothing', () => {
    /* A comparison exists, so the focus is ⑧ and ⑨ is `todo`. */
    const compared = snapshotWith({
      attempt_state: 'Formal',
      available_actions: FORMAL_ACTIONS,
      retrieval: relatedRetrieval(),
    });
    const views = stepViewsForSnapshot(compared);
    assert.equal(views[6]?.locked, false, '⑦ really is reachable in this fixture');
    assert.equal(views[8]?.locked, true, '⑨ must be locked while ⑧ has no batch');

    const hypothesis = functionBody(stepsSource(), 'hypothesisCard');
    const guard = hypothesis.indexOf('if (!step.locked)');
    const control = hypothesis.indexOf("'generate-hypotheses'");
    assert.ok(guard >= 0, '⑨ must consult the step lock');
    assert.ok(control > guard, 'the generation control must sit INSIDE the lock guard');
  });

  it('UI-LOCK-03 / IMPLEMENTATION INVARIANT: every ①–⑩ step action respects the same lock', () => {
    /*
     * 🔴 The same defect the ⑧/⑨ cases cover was present on ③ and ④: `actionOffered` answers "is
     *    this command available for the record as it stands?" - `true` for any `Draft` - so a card
     *    badged 「尚未开始」 could still offer its action. The step's own lock is the stronger
     *    statement, and it is applied uniformly.
     */
    const steps = stepsSource();
    for (const [card, expression] of [
      ['confirmCard', "actionOffered(snapshot, 'apply_structured_confirmation') && !step.locked"],
      ['causesCard', "actionOffered(state.snapshot, 'persist_candidate_causes') && !step.locked"],
      ['formalCard', "actionOffered(state.snapshot, 'save_formal_attempt') && !step.locked"],
    ] as const) {
      assert.ok(
        functionBody(steps, card).includes(expression),
        `${card} must gate its action on the step lock`,
      );
    }

    /* And a fixture that really is locked proves the lock is not vacuous. */
    const fresh = snapshotWith({ available_actions: DRAFT_ACTIONS });
    const views = stepViewsForSnapshot(fresh);
    assert.equal(views[4]?.locked, true, '⑤ is locked for a Draft whose ② has not run');
    assert.equal(views[2]?.locked, true, '③ is locked in the same state');
    /* 🔴 …while the read model genuinely does offer the command - which is why the lock must decide. */
    assert.equal(actionOffered(fresh, 'save_formal_attempt'), true);
    assert.equal(actionOffered(fresh, 'apply_structured_confirmation'), true);
  });
});

/* ================================================================== *
 * UI-FOLLOWUP - no button that commits nothing
 * ================================================================== */

describe('FINAL-RAPID-C ｜ UI-FOLLOWUP: ② has no fake commit control', () => {
  it('UI-FOLLOWUP-01 / IMPLEMENTATION INVARIANT: the 「回答」 control is gone, its replacement is a statement', () => {
    const steps = stepsSource();

    /* 🔴 The control itself, and the flash message it produced, are both absent. */
    assert.equal(steps.includes('FOLLOWUP_ANSWER_SUBMIT'), false, 'the fake action label must be gone');
    assert.equal(
      /flashMessage\(\s*'followup-recorded'\s*\)/u.test(steps),
      false,
      'nothing may flash a "recorded" message without recording anything',
    );
    assert.equal(
      repositoryFile(COPY).includes('FOLLOWUP_ANSWER_SUBMIT'),
      false,
      'the copy deck must not keep the label either',
    );
    /* 🔴 And the replacement is rendered as a NON-INTERACTIVE note, not a button. */
    assert.ok(
      /appendChild\(note\(FOLLOWUP_ANSWER_DEFERRED\)\)/u.test(steps),
      'the deferred-save hint must be a note',
    );
    assert.equal(
      /button\(\s*FOLLOWUP_ANSWER_DEFERRED/u.test(steps),
      false,
      'the hint must not be rendered as a control',
    );
    /* 🔴 「不知道」/「跳过」 stay real actions - they abandon a gap and are not being removed. */
    assert.ok(steps.includes('FOLLOWUP_DONT_KNOW'));
    assert.ok(steps.includes('FOLLOWUP_SKIP'));
  });

  it('UI-FOLLOWUP-02 / IMPLEMENTATION INVARIANT: the 3-question budget is untouched', () => {
    /* 🔴 `D-017` is not re-opened by this patch: no new persistence path, and the budget is unchanged. */
    const copy = repositoryFile(COPY);
    assert.ok(copy.includes('FOLLOWUP_BUDGET_EXHAUSTED'));

    /*
     * 🔴 THE DEFERRED SAVE REALLY HAPPENS AT ③. Typing still goes into the session's answer buffer,
     *    and that buffer is the thing `confirmStructured` sends - so the hint on screen describes an
     *    existing mechanism rather than promising a new one.
     */
    const steps = stepsSource();
    assert.ok(functionBody(steps, 'parseCard').includes('session.setFollowUpAnswer'));
    const confirmation = methodBody(repositoryFile(SESSION), 'confirmStructured');
    assert.ok(confirmation.includes('followup_answers'));
    assert.ok(confirmation.includes('answer_to_gap'));
    /* 🔴 And the answer reaches the record through the EXISTING confirmation command, not a new one. */
    assert.ok(confirmation.includes('applyStructuredConfirmation'));
  });
});

/* ================================================================== *
 * UI-EVIDENCE - what a click on ⑦ actually means
 * ================================================================== */

describe('FINAL-RAPID-C ｜ UI-EVIDENCE: the clicked item decides the evidence', () => {
  const view = retrievalPresentationOf(
    snapshotWith({
      attempt_state: 'Formal',
      available_actions: FORMAL_ACTIONS,
      retrieval: relatedRetrieval(),
    }),
    false,
  );
  const candidate = view.candidates[0];

  it('UI-EVIDENCE-01 / IMPLEMENTATION INVARIANT: clicking a 相同点 row yields THAT row', () => {
    assert.ok(candidate !== undefined, 'the fixture must produce one candidate');
    const row = candidate.same_points[0];
    assert.ok(row !== undefined);

    const selection = comparisonSelectionOf(candidate, 'same', row.dimension_label);
    assert.ok(selection !== null);
    assert.equal(selection.text, row.text);
    assert.equal(selection.dimension_label, row.dimension_label);
    assert.equal(selection.role_label, COMPARISON_EVIDENCE_ROLE_BASIS);

    /* The heading sends the whole section, under the section's own name. */
    const heading = comparisonSelectionOf(candidate, 'same', null);
    assert.ok(heading !== null);
    assert.equal(heading.dimension_label, COMPARISON_SAME);
  });

  it('UI-EVIDENCE-02 / IMPLEMENTATION INVARIANT: clicking a 差异点 row yields the difference, never the similarity', () => {
    assert.ok(candidate !== undefined);
    const row = candidate.different_points[0];
    assert.ok(row !== undefined);

    const selection = comparisonSelectionOf(candidate, 'different', row.dimension_label);
    assert.ok(selection !== null);
    assert.equal(selection.text, row.text);
    assert.equal(selection.dimension_label, row.dimension_label);

    /* 🔴 THE REGRESSION THIS FILE EXISTS FOR: no click may deliver the same points by accident. */
    const same_text = candidate.same_points.map((point) => point.text).join(' / ');
    assert.notEqual(selection.text, same_text);
    assert.notEqual(selection.dimension_label, COMPARISON_SAME);

    const heading = comparisonSelectionOf(candidate, 'different', null);
    assert.ok(heading !== null);
    assert.equal(heading.dimension_label, COMPARISON_DIFFERENT);
    assert.notEqual(heading.text, same_text);
  });

  it('UI-EVIDENCE-03 / IMPLEMENTATION INVARIANT: clicking an 未比对 dimension yields the neutral statement', () => {
    assert.ok(candidate !== undefined);
    const dimension = candidate.uncompared[0];
    assert.ok(dimension !== undefined);

    const selection = comparisonSelectionOf(candidate, 'uncompared', dimension);
    assert.ok(selection !== null);
    assert.equal(selection.dimension_label, dimension);
    assert.equal(selection.text, COMPARISON_UNCOMPARED_ITEM);
    assert.equal(selection.role_label, COMPARISON_EVIDENCE_ROLE_CONTEXT);

    /* 🔴 An uncompared dimension is context, never 「依据」 and never 「反驳」. */
    assert.notEqual(selection.role_label, COMPARISON_EVIDENCE_ROLE_BASIS);
    assert.notEqual(selection.role_label, '反驳');
    assert.notEqual(selection.text, candidate.same_points[0]?.text);

    /* An unknown dimension produces no payload at all rather than a fabricated one. */
    assert.equal(comparisonSelectionOf(candidate, 'uncompared', 'not-a-dimension'), null);
    assert.equal(comparisonSelectionOf(candidate, 'same', 'not-a-dimension'), null);
  });

  it('UI-EVIDENCE-04 / IMPLEMENTATION INVARIANT: ⑦ has one handler per item, and no card-wide one', () => {
    /*
     * 🔴 STRUCTURE IS THE GUARANTEE. A single container-level listener is what allowed every click to
     *    be answered with the same payload; with one `<button>` per item there is no code path left
     *    that can ignore which item was clicked, so the defect is unrepresentable rather than fixed.
     */
    const card = functionBody(stepsSource(), 'comparisonCard');
    assert.equal(
      card.includes('addEventListener'),
      false,
      'the card must carry no container-level handler',
    );
    assert.ok(card.includes('comparisonSelectionOf'), 'the payload must come from the presenter');
    assert.ok(card.includes("reveal(candidate, 'same', null)"));
    assert.ok(card.includes("reveal(candidate, 'different', null)"));
    assert.ok(card.includes("reveal(candidate, 'uncompared', null)"));
    /* 🔴 The old hard-coded payload is gone: no click may name 「相同点」 as its own dimension. */
    assert.equal(
      card.includes('dimension_label: view.section_titles.same'),
      false,
      'the dimension label is the clicked row`s, never a constant',
    );
    assert.equal(card.includes("role: '依据'"), false, 'the role is decided by the presenter');
    assert.equal(card.includes('candidate.same_points.map((point) => point.text)'), false);
  });
});

/* ================================================================== *
 * UI-PENDING - a click that cannot land must not be offered
 * ================================================================== */

describe('FINAL-RAPID-C ｜ UI-PENDING: an item already in flight disables its own controls', () => {
  it('UI-PENDING-01 / IMPLEMENTATION INVARIANT: one item, one key, and the UI honours it', () => {
    /* The pure half. */
    const insight_key = insightActionKey('INS_fixture');
    assert.equal(insight_key, 'insight-action:INS_fixture');
    assert.equal(hypothesisActionKey('HYP_fixture'), 'hypothesis-action:HYP_fixture');
    assert.equal(isPendingKey({}, insight_key), false);
    assert.equal(isPendingKey({ [insight_key]: true }, insight_key), true);
    assert.equal(isPendingKey({ [insight_key]: false }, insight_key), false);
    assert.equal(
      isPendingKey({ [insight_key]: true }, insightActionKey('INS_other')),
      false,
      'one insight being busy must never disable another',
    );

    /*
     * 🔴 THE MIRROR IS CHECKED, NOT ASSUMED. `presenters/busy.ts` restates a key format that
     *    `app-session.ts` owns; if that file ever changes the shape, this fails instead of the UI
     *    quietly disabling the wrong thing.
     */
    const session = repositoryFile(SESSION);
    for (const [method, template] of [
      ['acceptInsight', 'insight-action:${insight_id}'],
      ['rejectInsight', 'insight-action:${insight_id}'],
      ['revokeInsightAcceptance', 'insight-action:${insight_id}'],
      ['saveInsightEdit', 'insight-action:${insight_id}'],
      ['acceptHypothesis', 'hypothesis-action:${hypothesis_id}'],
      ['rejectHypothesis', 'hypothesis-action:${hypothesis_id}'],
      ['saveModelSuggestion', 'hypothesis-action:${hypothesis_id}'],
      ['decideHypothesisCriterion', 'hypothesis-action:${hypothesis_id}'],
      ['addHypothesisCriterion', 'hypothesis-action:${hypothesis_id}'],
    ] as const) {
      assert.ok(
        methodBody(session, method).includes(template),
        `${method} must run under \`${template}\` - the key this module mirrors`,
      );
    }

    /* 🔴 The render half: every conflicting control on a busy item is disabled, and the card says so. */
    const steps = stepsSource();
    const insight = functionBody(steps, 'insightCard');
    assert.ok(insight.includes('insightIsBusy(state.pending, card.insight_id)'));
    assert.ok(
      busyDisabledCount(insight) >= 4,
      'accept / reject / revoke / save-edit must all yield to the same pending key',
    );
    assert.ok(insight.includes('ACTION_PENDING'), 'the card must explain the disabled controls');

    /*
     * 🔴 ⑨ keeps its per-hypothesis state on the CARD BODY (that is where every ⑨ control lives), so
     *    the busy flag is read there - one lookup that covers the criterion rows and the footer alike.
     */
    const body = functionBody(steps, 'hypothesisBody');
    assert.ok(body.includes('hypothesisIsBusy(state.pending, card.hypothesis_id)'));
    assert.ok(
      busyDisabledCount(body) >= 6,
      'accept / reject / save / reject-save / criterion decisions / edit save must all yield',
    );
    /* 🔴 The criterion three-button row is the most likely second click, and it is guarded too. */
    assert.equal(
      /HYPOTHESIS_CRITERIA_ACCEPT,[\s\S]{0,400}?disabled:\s*busy/gu.test(body),
      true,
      'a criterion decision must be disabled while the hypothesis is busy',
    );
    assert.ok(body.includes('ACTION_PENDING'));
  });
});

/* ================================================================== *
 * PROVIDER - a switch must not carry the previous provider with it
 * ================================================================== */

describe('FINAL-RAPID-C ｜ PROVIDER: a switch resets the form to the target', () => {
  /** A fake value. It must never be a real-looking key, and it is never sent anywhere. */
  const KEY_A = 'sk-fixture-UI-PROVIDER-SWITCH-A';

  function deepseekTyped(): SettingsDraft {
    return { provider_id: 'deepseek', model: 'deepseek-flash', api_key: KEY_A, custom_base_url: '' };
  }

  it('PROVIDER-01 / IMPLEMENTATION INVARIANT: leaving a provider empties the key field', () => {
    for (const target of ['openai', 'moonshot', 'zhipu', 'browser-direct-custom']) {
      const preset = findPreset(target);
      assert.ok(preset !== null, `${target} must be a preset`);
      const next = draftForPreset(preset, deepseekTyped());
      assert.equal(next.api_key, '', `${target} must open with an empty key field`);
      assert.equal(next.provider_id, target);
    }
    /* 🔴 And the same provider keeps the user's own typing - a no-op re-selection is not a switch. */
    const deepseek = findPreset('deepseek');
    assert.ok(deepseek !== null);
    const same = deepseekTyped();
    assert.equal(draftForPreset(deepseek, same), same);
  });

  it('PROVIDER-02 / IMPLEMENTATION INVARIANT: a switch takes the target default model, and coming back takes DeepSeek`s', () => {
    const openai = findPreset('openai');
    assert.ok(openai !== null);
    const next = draftForPreset(openai, deepseekTyped());
    assert.equal(next.model, openai.default_model);
    assert.notEqual(next.model, 'deepseek-flash', 'the previous provider`s model must not survive');

    /* 🔴 Coming back must land on the CONFIRMED default, never on whatever the form held. */
    const deepseek = findPreset('deepseek');
    assert.ok(deepseek !== null);
    assert.equal(deepseek.default_model, 'deepseek-flash');
    const back = draftForPreset(deepseek, { provider_id: 'openai', model: 'gpt-4o-mini', api_key: KEY_A, custom_base_url: '' });
    assert.equal(back.model, 'deepseek-flash');
    assert.equal(back.api_key, '', 'the field is empty after switching back too');
  });

  it('PROVIDER-03 / IMPLEMENTATION INVARIANT: a typed secret never appears in another provider`s draft', () => {
    for (const preset of PROVIDER_PRESETS) {
      if (String(preset.provider_id) === 'deepseek') {
        continue;
      }
      const next = draftForPreset(preset, deepseekTyped());
      assert.equal(
        JSON.stringify(next).includes(KEY_A),
        false,
        `${String(preset.provider_id)} must not receive the previous provider's secret`,
      );
    }
    /* 🔴 The custom URL follows the NEW preset's own rules, and no secret travels with it. */
    const custom = findPreset('browser-direct-custom');
    assert.ok(custom !== null);
    const carried = draftForPreset(custom, {
      provider_id: 'browser-direct-custom',
      model: 'fixture-model',
      api_key: KEY_A,
      custom_base_url: 'https://fixture.example/v1/chat',
    });
    assert.equal(carried.custom_base_url, 'https://fixture.example/v1/chat');
    assert.equal(carried.api_key, KEY_A, 'the same provider keeps its own value');

    /* 🔴 No configuration is ever built with the model name of a different provider. */
    const config = providerConfigOf({
      provider_id: 'deepseek',
      model: 'deepseek-flash',
      api_key: KEY_A,
      custom_base_url: '',
    });
    assert.ok(config !== null);
    assert.equal(config.model, 'deepseek-flash');
  });
});

/* ================================================================== *
 * PROXY - a preset nobody can reach must never look ready
 * ================================================================== */

describe('FINAL-RAPID-C ｜ PROXY: a proxy-only preset cannot become a ready provider', () => {
  const KEY_A = 'sk-fixture-UI-PROXY-ONLY-A';

  it('PROXY-01 / IMPLEMENTATION INVARIANT: the proxy presets are listed, refused, and say why', () => {
    const disabled = PROVIDER_PRESETS.filter((preset) => !preset.deployment_enabled).map((preset) =>
      String(preset.provider_id),
    );
    /* 🔴 LISTED, not hidden. A documented provider that silently vanished is its own defect. */
    assert.deepEqual([...disabled].sort(), ['moonshot', 'openai', 'zhipu']);

    for (const id of disabled) {
      const preset = findPreset(id);
      assert.ok(preset !== null);
      const draft: SettingsDraft = {
        provider_id: id,
        model: preset.default_model,
        api_key: KEY_A,
        custom_base_url: '',
      };
      /* 🔴 Even with a key the session already holds, the save is refused. */
      const reasons = validateSettingsDraft(draft, { session_credential_present: true });
      assert.deepEqual([...reasons], [SETTINGS_PRESET_NOT_ENABLED]);
      assert.equal(
        providerConfigOf(draft, { session_credential_present: true }),
        null,
        `${id} must compose nothing, so the provider can never reach ready`,
      );
      /* 🔴 The reason is visible in the preset's own note, next to the connection row. */
      assert.ok(preset.note.includes('当前部署未启用'), `${id}'s note must state the deployment fact`);
      /* 🔴 No unverified endpoint was filled in to make it work. */
      assert.equal(preset.fixed_base_url, null);
      assert.equal(preset.allows_custom_base_url, false);
      /* 🔴 And the picker marks it before it is selected. */
      assert.ok(SETTINGS_PRESET_OPTION_DISABLED.includes('当前部署未启用'));
      assert.ok(
        repositoryFile(SHELL).includes('SETTINGS_PRESET_OPTION_DISABLED'),
        'the picker must mark a disabled preset in the list',
      );
    }

    /* 🔴 The two reachable presets are unchanged: browser-direct, and still saveable. */
    for (const id of ['deepseek', 'browser-direct-custom']) {
      const preset = findPreset(id);
      assert.ok(preset !== null);
      assert.equal(preset.deployment_enabled, true);
      assert.equal(preset.capability.browser_direct, true);
      assert.equal(preset.capability.thin_proxy, false);
    }
    const deepseek = findPreset('deepseek');
    assert.ok(deepseek !== null);
    assert.equal(
      validateSettingsDraft(
        { provider_id: 'deepseek', model: 'deepseek-flash', api_key: KEY_A, custom_base_url: '' },
        {},
      ).length,
      0,
      'DeepSeek must still be saveable',
    );
  });

  it('PROXY-02 / IMPLEMENTATION INVARIANT: no proxy was implemented and no endpoint was invented', () => {
    const presets = repositoryFile(PRESETS);
    /* 🔴 No proxy route, no proxy client and no fabricated vendor URL in the settings layer. */
    for (const forbidden of ['/api/proxy', 'api.anthropic.com', 'api.openai.com', 'api.moonshot.cn', 'open.bigmodel.cn']) {
      assert.equal(presets.includes(forbidden), false, `"${forbidden}" must not appear`);
    }
    /* 🔴 And the deployment flag is a stated field, not something derived at render time. */
    assert.ok(presets.includes('deployment_enabled: false'));
    assert.ok(presets.includes('deployment_enabled: true'));
  });
});

/* ================================================================== *
 * FORMAL - a locked ⑤ must not announce a save
 * ================================================================== */

describe('FINAL-RAPID-C ｜ FORMAL: 「已经正式保存」 belongs to a really saved record', () => {
  it('FORMAL-01 / IMPLEMENTATION INVARIANT: a LOCKED ⑤ states nothing about saving', () => {
    const fresh = snapshotWith({ available_actions: DRAFT_ACTIONS });
    const views = stepViewsForSnapshot(fresh);
    assert.equal(views[4]?.locked, true, '⑤ is locked while ② has not run');

    /*
     * 🔴 STRUCTURE: the already-saved sentence lives in the `!locked` branch, so a locked ⑤ falls
     *    through to the step's own 「完成前一步后可继续」 hint instead of claiming a save.
     */
    const formal = functionBody(stepsSource(), 'formalCard');
    const guard = formal.indexOf('} else if (!step.locked) {');
    const sentence = formal.indexOf('FORMAL_ALREADY_SAVED');
    assert.ok(guard >= 0, 'the already-saved branch must be reachable only when the step is unlocked');
    assert.ok(sentence > guard, 'the sentence must sit INSIDE that branch');
  });

  it('FORMAL-02 / IMPLEMENTATION INVARIANT: only a saved record can show the already-saved statement', () => {
    const saved = snapshotWith({ attempt_state: 'Formal', available_actions: FORMAL_ACTIONS });
    /* The read model offers no Draft command for it… */
    assert.equal(actionOffered(saved, 'save_formal_attempt'), false);
    /* …and ⑤ is settled rather than locked, which is what makes the statement reachable. */
    assert.equal(stepViewsForSnapshot(saved)[4]?.locked, false);
    assert.equal(stepViewsForSnapshot(saved)[4]?.status, 'done');

    /* A record with no save command AND a locked step is the case that used to lie. */
    const both = snapshotWith({ available_actions: ['begin_capture'] });
    assert.equal(actionOffered(both, 'save_formal_attempt'), false);
    assert.equal(stepViewsForSnapshot(both)[4]?.locked, true);
    assert.ok(
      functionBody(stepsSource(), 'formalCard').includes('if (can_save)'),
      'the save control and the already-saved sentence must be mutually exclusive',
    );
  });
});

/* ================================================================== *
 * The DOM-scope entry points stay wired
 * ================================================================== */

describe('FINAL-RAPID-C ｜ the workbench still renders every step', () => {
  it('IMPLEMENTATION INVARIANT: the ten cards are still mounted, and ② still renders its hint', () => {
    const steps = stepsSource();
    const workbench = functionBody(steps, 'workbench');
    for (const card of [
      'captureEntryCard',
      'parseCard',
      'confirmCard',
      'causesCard',
      'formalCard',
      'retrievalCard',
      'comparisonCard',
      'insightCard',
      'hypothesisCard',
      'traceCard',
    ]) {
      assert.ok(workbench.includes(`${card}(context`), `${card} must still be mounted`);
    }
    /* 🔴 ⑩ is a READ, so it keeps its control: 「查看旧依据」 must survive with no model configured. */
    assert.ok(functionBody(steps, 'traceCard').includes('session.traceHypothesis'));
    /* 🔴 The busy sentence is a new deck entry and must be defined once, in `copy.ts`. */
    assert.ok(ACTION_PENDING.length > 0);
  });
});
