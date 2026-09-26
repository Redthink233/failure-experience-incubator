/**
 * S01-06 ｜ PRESENTATION SPEC - the App Shell's derived view models (task §9 - §43).
 *
 * 🔴 These are `IMPLEMENTATION INVARIANT` cases, not new product `AC`. They pin the properties the
 *    S01-06 task fixes and that a future edit could silently break:
 *      U5  a `candidate` Insight is never presented as a reusable experience;
 *      U6  an `accepted` Insight (i.e. an Experience Asset) can be;
 *      U7  a `Hypothesis` is never an experience, in any state;
 *      U8  a `Model Suggestion` always carries its non-historical notice;
 *      U9  the three 0-like retrieval states keep three DIFFERENT sentences;
 *      U10 a runtime notice is rendered as a RUNTIME statement and carries no raw error field;
 *      U13 a folded first screen shows 3 rows AND the true total;
 *      U14 no numeric similarity / score / grade can be produced at all.
 * 🔴 The snapshot fixtures below are INPUT SHAPES for pure functions - they are not written into a
 *    workspace and never stand in for a real record (`S01-06` §61 forbids fabricating page state by
 *    writing domain files; nothing here touches a file).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { D9WorkflowSnapshot, WorkflowNotice } from '../../application/workflow/types.js';
import { WORKFLOW_ERROR_MESSAGES, workflowNotice } from '../../application/workflow/errors.js';
import type { WorkflowAttemptSummary } from '../../application/workflow/attempt-summaries.js';
import { EXPERIENCE_ASSETS_EMPTY, GATE_LABELS, HYPOTHESIS_MODEL_NOTICE, STEP_LOCKED_HINT } from '../../ui/copy.js';
import { stepFactsOf, stepViewsOf, currentStepNumberOf } from '../../ui/presenters/steps.js';
import { retrievalPresentationOf, retrievalStartIsOffered, staleRerunIsOffered } from '../../ui/presenters/retrieval.js';
import { insightCardOf, insightsPresentationOf, isPresentedAsExperienceAsset } from '../../ui/presenters/insights.js';
import { hypothesesPresentationOf, tracePanelOf } from '../../ui/presenters/hypotheses.js';
import { noticeViewOf } from '../../ui/presenters/notices.js';
import { railItemsOf, natureBadgeOf } from '../../ui/presenters/rail.js';
import { captureFieldsOf, formalGateViewOf } from '../../ui/presenters/capture.js';

/* ------------------------------------------------------------------ *
 * Snapshot fixtures (pure-function inputs)
 * ------------------------------------------------------------------ */

type Snapshot = D9WorkflowSnapshot;

function baseSnapshot(): Record<string, unknown> {
  return {
    attempt_id: 'ATT_source',
    attempt_state: 'Draft',
    archive_state: 'active',
    attempt: {
      attempt_id: 'ATT_source',
      project_id: null,
      state: 'Draft',
      archive_state: 'active',
      raw_text: { content_item_id: 'ATT_source:raw:user', source_type: 'Fact', value: '一次尝试' },
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
      created_at: '2026-09-25T10:00:00.000Z',
      updated_at: '2026-09-25T10:00:00.000Z',
      data_source_nature: 'field_record',
    },
    capture: {
      attempt: {},
      draft_state: {
        attempt_id: 'ATT_source',
        parse_state: 'not_parsed',
        asked_key_question_count: 0,
        abandoned_gap_set: [],
        asked_gap_set: [],
        gap_priority_hint: null,
      },
      content_items: [],
      follow_up: {
        budget: { rule: 'max-3-key-questions-total', max_total: 3, asked: [], skipped_gaps: [] },
        remaining: 3,
        exhausted: false,
        next_gap: null,
        missing_gaps: [],
      },
    },
    retrieval: {
      state: 'not_available',
      derivation: null,
      view: null,
      n_retrieval: null,
      zero_like_state: null,
      freshness: {
        stale: false,
        notice: null,
        attempt_updated_at: '2026-09-25T10:00:00.000Z',
        comparison_generated_at: null,
      },
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

function candidateEntry(attempt_id: string, dimension = 'goal'): Record<string, unknown> {
  return {
    candidate_attempt_id: attempt_id,
    matched_level_a_dimensions: [dimension],
    similar_points: [
      { dimension, source_value: 'G', candidate_value: 'G', text: '目标一致' },
    ],
    difference_points: [
      { dimension: 'approach', source_value: 'S1', candidate_value: 'S2', text: '做法不同' },
    ],
    uncompared_dimensions: ['result'],
    uncompared_notes: ['结果未比对'],
    relevance_reasons: [{ dimension, text: '目标相同' }],
    auxiliary_context: { same_project: true, shared_failure_tags: [], environment: null },
  };
}

function retrievalPatch(options: {
  readonly zero_like_state?: string | null;
  readonly total?: number;
  readonly visible?: number;
  readonly n_retrieval?: number;
  readonly stale?: boolean;
}): Record<string, unknown> {
  const total = options.total ?? 0;
  const entries = Array.from({ length: options.visible ?? 0 }, (_value, index) =>
    candidateEntry(`ATT_related_${index}`),
  );
  return {
    state: 'ready',
    n_retrieval: options.n_retrieval ?? total,
    zero_like_state: options.zero_like_state ?? null,
    freshness: {
      stale: options.stale === true,
      notice: options.stale === true ? '当前记录已被修改，先前的历史比较可能不再适用。' : null,
      attempt_updated_at: '2026-09-25T11:00:00.000Z',
      comparison_generated_at: '2026-09-25T10:00:00.000Z',
    },
    view: {
      source_attempt_id: 'ATT_source',
      status: total === 0 ? 'NO_RELATED_HISTORY' : 'RELATED_HISTORY',
      n_retrieval: options.n_retrieval ?? total,
      retrieval_tier: '1',
      hit_level_a_dimensions: ['goal'],
      uncompared_dimensions: ['result'],
      uncompared_notes: ['结果未比对'],
      candidates: entries,
      first_screen_size: Math.min(3, total),
      total_candidate_count: total,
      remaining_beyond_first_screen: Math.max(0, total - (options.visible ?? 0)),
      expandable: total > (options.visible ?? 0),
      expanded: false,
    },
  };
}

function insightViewPatch(
  insight_id: string,
  state: string,
  options: { readonly gate_failed?: boolean } = {},
): Record<string, unknown> {
  const gateChecks = ['E1', 'E2', 'E3', 'E4'].map((gate_id) => ({
    gate_id,
    satisfied: !(options.gate_failed === true && gate_id === 'E2'),
    missing_items:
      options.gate_failed === true && gate_id === 'E2'
        ? [{ description: '结论不够明确', why_important: '无法复用', how_to_supplement: null }]
        : [],
  }));
  return {
    insight: {
      insight_id,
      attempt_id: 'ATT_source',
      state,
      proposition: '在同等条件下，先固定温度再复核，可以避免配比波动带来的干扰。',
      applicable_scope: '仅适用于高温配比场景',
      evidence_refs: [],
      judgment_basis: '两条历史记录的相同点',
      gate_checks: gateChecks,
      generation_batch: 'BATCH_1',
      created_at: '2026-09-25T10:00:00.000Z',
      updated_at: '2026-09-25T10:00:00.000Z',
    },
    meta: { title: null, display_order: null },
    comparison_ref: null,
    citation: { owner_id: insight_id, n_citation: 1, counted_target_ids: ['ATT_related_0'], counted_ref_ids: [], context_only_ref_ids: [] },
    traceability: [],
    is_experience_asset: state === 'accepted',
    unsatisfied_gate_ids: options.gate_failed === true ? ['E2'] : [],
    can_accept: options.gate_failed !== true,
    missing_items_by_gate:
      options.gate_failed === true
        ? { E2: [{ description: '结论不够明确', why_important: '无法复用', how_to_supplement: null }] }
        : {},
  };
}

function hypothesisViewPatch(
  hypothesis_id: string,
  kind: 'grounded' | 'model',
  decision_state: 'undecided' | 'accepted' | 'rejected',
  options: { readonly saved?: boolean | null } = {},
): Record<string, unknown> {
  return {
    hypothesis: {
      hypothesis_id,
      attempt_id: 'ATT_source',
      kind,
      decision_state,
      saved: options.saved ?? (kind === 'model' ? false : null),
      core: {
        hypothesis_statement: '先固定温度再复核，配比波动会明显减小。',
        rationale: '两条历史记录在目标上相同、在条件上不同。',
        referenced_attempt_ids: ['ATT_related_0'],
        next_change: '下一轮先固定温度。',
        kept_conditions: [{ attempt_id: 'ATT_related_0', source_field_path: 'condition' }],
      },
      editable_items: {
        user_facts: [],
        ai_inferences: [
          {
            slot: 'observation_metric',
            item: {
              content_item_id: `${hypothesis_id}:observation_metric:ai`,
              source_type: 'Inference',
              value: '配比波动幅度',
              confirmation_class: 'decision',
              decision_state: 'unresolved',
            },
          },
        ],
      },
      evidence_refs: [],
      source_partitions: kind === 'model' ? ['model_prior'] : ['historical_evidence'],
      generation_batch: 'BATCH_H1',
      created_at: '2026-09-25T10:00:00.000Z',
      updated_at: '2026-09-25T10:00:00.000Z',
    },
    item_presence: {
      hypothesis_statement: 'present',
      rationale: 'present',
      referenced_attempts: 'present',
      next_change: 'present',
      kept_conditions: 'present',
      observation_metric: 'present',
      support_criterion: 'missing',
      refutation_criterion: 'missing',
    },
    read_only_field_keys: ['hypothesis_statement'],
    editable_field_keys: ['observation_metric'],
    kept_condition_recommendations: [
      {
        content_item_id: `${hypothesis_id}:kept:ai`,
        source_type: 'Inference',
        value: '温度条件建议保持不变',
        confirmation_class: 'display',
      },
    ],
    reasoning_input_refs: [],
    model_prior_notice: kind === 'model' ? '非你的历史经验依据' : null,
    citation: { owner_id: hypothesis_id, n_citation: kind === 'model' ? 0 : 1, counted_target_ids: [], counted_ref_ids: [], context_only_ref_ids: [] },
    traceability: [],
    evidence_overview: {
      n_citation: kind === 'model' ? 0 : 1,
      distinct_record_count: kind === 'model' ? 0 : 1,
      single_source: kind !== 'model',
      has_conflict: false,
      conflict_note: null,
      missing_condition_note: null,
    },
    save_meaning: null,
    is_saved_but_undecided: false,
    source_partitions: [kind === 'model' ? 'model_prior' : 'historical_evidence'],
    can_accept: true,
    can_reject: true,
    is_experience_asset: false,
  };
}

/* ------------------------------------------------------------------ *
 * U9 - the three 0-like states
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜the retrieval 0-like states (U9)', () => {
  it('IMPLEMENTATION INVARIANT (U9): the three 0-like states produce three DIFFERENT sentences', () => {
    const history_empty = retrievalPresentationOf(
      snapshotWith({ retrieval: retrievalPatch({ zero_like_state: 'HISTORY_EMPTY' }) }),
      false,
    );
    const no_related = retrievalPresentationOf(
      snapshotWith({ retrieval: retrievalPatch({ zero_like_state: 'NO_RELATED_HISTORY' }) }),
      false,
    );
    const runtime = retrievalPresentationOf(
      snapshotWith({ retrieval: { ...retrievalPatch({}), state: 'runtime_incomplete' } }),
      false,
    );
    const none_yet = retrievalPresentationOf(snapshotWith({}), false);

    const sentences = [history_empty.headline, no_related.headline, runtime.headline, none_yet.headline];
    assert.equal(new Set(sentences).size, 4, `expected four distinct statements, got ${sentences.join(' | ')}`);
    assert.equal(history_empty.phase, 'history_empty');
    assert.equal(no_related.phase, 'no_related_history');
    assert.equal(runtime.phase, 'runtime_incomplete');
    assert.equal(none_yet.phase, 'not_available');
    for (const statement of sentences) {
      assert.ok(!statement.includes('暂无数据'), 'the four states must not collapse into one word');
    }
  });

  it('IMPLEMENTATION INVARIANT (U9): a completed retrieval reports the true `N_检索` in its headline', () => {
    const related = retrievalPresentationOf(
      snapshotWith({ retrieval: retrievalPatch({ total: 2, visible: 2, n_retrieval: 2 }) }),
      false,
    );
    assert.equal(related.phase, 'related');
    assert.equal(related.n_retrieval, 2);
    assert.ok(related.headline.includes('2'), related.headline);
  });

  it('IMPLEMENTATION INVARIANT (U11): a stale comparison is flagged and the rerun is OFFERED, not taken', () => {
    const stale = retrievalPresentationOf(
      snapshotWith({ retrieval: retrievalPatch({ total: 1, visible: 1, n_retrieval: 1, stale: true }) }),
      false,
    );
    assert.equal(stale.stale, true);
    assert.ok((stale.stale_notice ?? '').length > 0);
    /* The presentation layer can only say "the button is meaningful" - it triggers nothing. */
    assert.equal(staleRerunIsOffered(stale), true);
    assert.equal(staleRerunIsOffered(retrievalPresentationOf(snapshotWith({}), false)), false);
  });
});

/* ------------------------------------------------------------------ *
 * U13 / U14 - the fold and the absence of numbers
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜the reading fold and numeric red lines (U13, U14)', () => {
  it('IMPLEMENTATION INVARIANT (U13): a first screen shows at most 3 rows but the TRUE total', () => {
    const view = retrievalPresentationOf(
      snapshotWith({ retrieval: retrievalPatch({ total: 7, visible: 3, n_retrieval: 7 }) }),
      false,
    );
    assert.equal(view.candidates.length, 3);
    assert.equal(view.n_retrieval, 7);
    assert.equal(view.remaining, 4);
    assert.equal(view.expandable, true);
    assert.ok(view.more_label.includes('4'), view.more_label);
  });

  it('IMPLEMENTATION INVARIANT (U14): the comparison view model contains no percentage, score or grade', () => {
    const view = retrievalPresentationOf(
      snapshotWith({ retrieval: retrievalPatch({ total: 3, visible: 3, n_retrieval: 3 }) }),
      false,
    );
    const serialized = JSON.stringify(view);
    assert.ok(!/\d+\s*%/u.test(serialized), 'no percentage may appear');
    assert.ok(!/\d+(\.\d+)?\s*\/\s*10/u.test(serialized), 'no /10 score may appear');
    for (const banned of ['相似度', '相关性评分', '置信度', '综合评分', '经验等级', '高相似', '低相似', '★']) {
      assert.ok(!serialized.includes(banned), `"${banned}" must not appear in the comparison view`);
    }
    /* Every candidate card must expose the neutral uncompared marker. */
    for (const candidate of view.candidates) {
      assert.deepEqual(candidate.uncompared, ['结果 / 现象 / 结论方向']);
      assert.ok(view.section_titles.uncompared_item.length > 0);
    }
  });

  it('IMPLEMENTATION INVARIANT (U14): the step view model carries no progress percentage or score', () => {
    const views = stepViewsOf(stepFactsOf(snapshotWith({ attempt_state: 'Formal' })));
    const serialized = JSON.stringify(views);
    assert.ok(!/\d+\s*%/u.test(serialized));
    assert.ok(!serialized.includes('progress'));
    assert.ok(!serialized.includes('score'));
  });
});

/* ------------------------------------------------------------------ *
 * Steps §7 / §54 / §55
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜step derivation (task §7 / §55)', () => {
  it('IMPLEMENTATION INVARIANT: the first unfinished step becomes the focus and every later step is locked', () => {
    const views = stepViewsOf({
      captured: true,
      parsed: true,
      confirmed: true,
      causes_recorded: true,
      formal: false,
      retrieved: false,
      compared: false,
      insights_generated: false,
      hypotheses_generated: false,
      traced: false,
    });
    assert.equal(views.length, 10);
    assert.deepEqual(
      views.map((view) => view.status),
      ['done', 'done', 'done', 'done', 'current', 'todo', 'todo', 'todo', 'todo', 'todo'],
    );
    assert.equal(currentStepNumberOf(views), '⑤');
    for (const view of views.slice(5)) {
      assert.equal(view.locked, true);
      assert.equal(view.locked_hint, STEP_LOCKED_HINT);
    }
    /* The step numbers are the product's own ①②③…, never a module name. */
    assert.deepEqual(
      views.map((view) => view.number),
      ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'],
    );
  });

  it('IMPLEMENTATION INVARIANT: the facts are read off the persisted record, not off a stored counter', () => {
    const facts = stepFactsOf(
      snapshotWith({
        attempt_state: 'Formal',
        capture: {
          ...(baseSnapshot()['capture'] as Record<string, unknown>),
          draft_state: {
            attempt_id: 'ATT_source',
            parse_state: 'extracted',
            asked_key_question_count: 1,
            abandoned_gap_set: [],
            asked_gap_set: [],
            gap_priority_hint: null,
          },
        },
        retrieval: retrievalPatch({ total: 1, visible: 1, n_retrieval: 1 }),
        insights: {
          batches: [{ batch_id: 'B1' }],
          current_batch_id: 'B1',
          views: [],
          experience_assets: [],
          state_events: {},
        },
        hypotheses: {
          batches: [{ batch_id: 'H1' }],
          current_batch_id: 'H1',
          views: [hypothesisViewPatch('HYP_1', 'grounded', 'undecided')],
          model_suggestions: [],
        },
      }),
    );
    assert.deepEqual(facts, {
      captured: true,
      parsed: true,
      confirmed: true,
      /* 🔴 `Formal` settles the whole capture phase - see the assertion below and the file header. */
      causes_recorded: true,
      formal: true,
      retrieved: true,
      compared: true,
      insights_generated: true,
      hypotheses_generated: true,
      traced: true,
    });
    const views = stepViewsOf(facts);
    /*
     * 🔴 Nothing is unfinished, so nothing is the current focus: a completed flow does not hand the
     *    badge to a step that is already `done` (the ①–⑤ settling rule belongs to
     *    `historical-formal-view.test.ts`, which pins the `Formal` + no-retrieval shape).
     */
    assert.deepEqual(
      views.map((view) => view.status),
      ['done', 'done', 'done', 'done', 'done', 'done', 'done', 'done', 'done', 'done'],
    );
    assert.equal(currentStepNumberOf(views), null);
    /* No serialized counter of any kind exists in the derived view. */
    assert.ok(!JSON.stringify(views).includes('percent'));
  });

  it('IMPLEMENTATION INVARIANT: a record with no persisted counterpart has no completed step', () => {
    const facts = stepFactsOf(null);
    assert.equal(facts.captured, false);
    const views = stepViewsOf(facts);
    assert.equal(views.filter((view) => view.status === 'done').length, 0);
    assert.equal(currentStepNumberOf(views), '①');
  });
});

/* ------------------------------------------------------------------ *
 * U5 / U6 - the Experience Asset boundary
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜the Experience Asset boundary (U5, U6)', () => {
  const candidate = insightViewPatch('INS_candidate', 'candidate');
  const accepted = insightViewPatch('INS_accepted', 'accepted');

  it('IMPLEMENTATION INVARIANT (U5): a `candidate` Insight is never presented as a reusable experience', () => {
    const view = insightsPresentationOf(
      snapshotWith({
        attempt_state: 'Formal',
        insights: {
          batches: [{ batch_id: 'BATCH_1' }],
          current_batch_id: 'BATCH_1',
          views: [candidate],
          experience_assets: [],
          state_events: {},
        },
      }),
    );
    assert.equal(view.cards.length, 1);
    assert.equal(view.has_experience_assets, false);
    assert.equal(isPresentedAsExperienceAsset(view.cards[0]!), false);
    assert.ok(view.experience_assets.length === 0);
  });

  it('IMPLEMENTATION INVARIANT (U6): an `accepted` Insight reaches the asset area through the read model', () => {
    const view = insightsPresentationOf(
      snapshotWith({
        attempt_state: 'Formal',
        insights: {
          batches: [{ batch_id: 'BATCH_1' }],
          current_batch_id: 'BATCH_1',
          views: [accepted],
          experience_assets: [accepted],
          state_events: {},
        },
      }),
    );
    assert.equal(view.has_experience_assets, true);
    assert.equal(view.experience_assets.length, 1);
    assert.equal(isPresentedAsExperienceAsset(view.experience_assets[0]!), true);
  });

  it('IMPLEMENTATION INVARIANT (task §31): a failed gate is rendered in human words with what / why / how', () => {
    const card = insightCardOf(
      insightViewPatch('INS_weak', 'candidate', { gate_failed: true }) as unknown as Parameters<
        typeof insightCardOf
      >[0],
      { current_batch_id: 'BATCH_1' },
    );
    const failed = card.gates.find((gate) => gate.gate_id === 'E2');
    assert.ok(failed !== undefined);
    assert.equal(failed.satisfied, false);
    assert.equal(failed.label, GATE_LABELS.E2);
    assert.equal(failed.missing.length, 1);
    assert.equal(failed.missing[0]?.what, '结论不够明确');
    assert.equal(failed.missing[0]?.why, '无法复用');
    assert.equal(failed.missing[0]?.how, null);
    for (const gate of card.gates) {
      assert.notEqual(gate.label, gate.gate_id, 'a gate must never be rendered as its bare code');
    }
  });

  it('IMPLEMENTATION INVARIANT (§33): the empty asset sentence is not the empty candidate sentence', () => {
    assert.ok(EXPERIENCE_ASSETS_EMPTY.length > 0);
  });
});

/* ------------------------------------------------------------------ *
 * U7 / U8 - hypotheses and model suggestions
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜hypotheses and model suggestions (U7, U8)', () => {
  it('IMPLEMENTATION INVARIANT (U7): no Hypothesis is ever presented as an experience, in any state', () => {
    const view = hypothesesPresentationOf(
      snapshotWith({
        attempt_state: 'Formal',
        hypotheses: {
          batches: [{ batch_id: 'H1', is_current: true, exit_route: null, absence_statement: null }],
          current_batch_id: 'H1',
          views: [
            hypothesisViewPatch('HYP_a', 'grounded', 'undecided'),
            hypothesisViewPatch('HYP_b', 'grounded', 'accepted'),
            hypothesisViewPatch('HYP_c', 'grounded', 'rejected'),
          ],
          model_suggestions: [],
        },
      }),
    );
    for (const card of view.grounded) {
      assert.equal(card.is_experience_asset, false);
      assert.equal(card.title, '待验证方向');
    }
    assert.equal(JSON.stringify(view).includes('experience_asset":true'), false);
  });

  it('IMPLEMENTATION INVARIANT (U8): every Model Suggestion carries its non-historical notice', () => {
    const view = hypothesesPresentationOf(
      snapshotWith({
        attempt_state: 'Formal',
        hypotheses: {
          batches: [{ batch_id: 'H1', is_current: true, exit_route: null, absence_statement: null }],
          current_batch_id: 'H1',
          views: [hypothesisViewPatch('HYP_g', 'grounded', 'undecided')],
          model_suggestions: [hypothesisViewPatch('HYP_m', 'model', 'undecided', { saved: true })],
        },
      }),
    );
    assert.equal(view.model_suggestions.length, 1);
    const suggestion = view.model_suggestions[0]!;
    assert.equal(suggestion.non_historical_notice, HYPOTHESIS_MODEL_NOTICE);
    assert.ok(suggestion.non_historical_notice.includes('不是由你的历史经验直接支持'));
    assert.equal(suggestion.n_citation, 0);
    assert.equal(suggestion.saved, true);
    /* The save slot and the decision slot stay independent. */
    assert.equal(suggestion.decision_state, 'undecided');
  });

  it('IMPLEMENTATION INVARIANT (§39): `EXIT-B` / `EXIT-C` never blame the history', () => {
    const exitB = hypothesesPresentationOf(
      snapshotWith({
        attempt_state: 'Formal',
        hypotheses: {
          batches: [{ batch_id: 'H1', is_current: true, exit_route: 'EXIT-B', absence_statement: null }],
          current_batch_id: 'H1',
          views: [],
          model_suggestions: [],
        },
      }),
    );
    const exitC = hypothesesPresentationOf(
      snapshotWith({
        attempt_state: 'Formal',
        hypotheses: {
          batches: [{ batch_id: 'H2', is_current: true, exit_route: 'EXIT-C', absence_statement: null }],
          current_batch_id: 'H2',
          views: [],
          model_suggestions: [],
        },
      }),
    );
    assert.equal(exitB.exit?.route, 'EXIT-B');
    assert.equal(exitC.exit?.route, 'EXIT-C');
    for (const statement of [exitB.exit?.statement ?? '', exitC.exit?.statement ?? '']) {
      assert.ok(!statement.includes('历史依据不足'), statement);
      assert.ok(!statement.includes('历史数据不足'), statement);
    }
    assert.notEqual(exitB.exit?.statement, exitC.exit?.statement);
  });

  it('IMPLEMENTATION INVARIANT (§35): the eight items are named in human words, never as property names', () => {
    const view = hypothesesPresentationOf(
      snapshotWith({
        attempt_state: 'Formal',
        hypotheses: {
          batches: [{ batch_id: 'H1', is_current: true, exit_route: null, absence_statement: null }],
          current_batch_id: 'H1',
          views: [hypothesisViewPatch('HYP_g', 'grounded', 'undecided')],
          model_suggestions: [],
        },
      }),
    );
    const items = view.grounded[0]!.items;
    assert.equal(items.length, 8);
    assert.deepEqual(
      items.map((item) => item.label),
      ['待验证假设', '为什么提出', '历史依据', '下一轮改变什么', '哪些条件保持不变', '观察什么', '什么结果支持它', '什么结果反驳它'],
    );
    for (const item of items) {
      assert.ok(!item.label.includes('_'), `"${item.label}" must not be a property name`);
    }
    /* ⑥⑦⑧ AI proposals are separated from anything the user supplied. */
    const metric = items.find((item) => item.key === 'observation_metric');
    assert.equal(metric?.entries.length, 1);
    assert.equal(metric?.entries[0]?.source, 'ai');
    assert.equal(metric?.entries[0]?.is_decidable, true);
  });
});

/* ------------------------------------------------------------------ *
 * U10 - notices
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜notice presentation (U10)', () => {
  it('IMPLEMENTATION INVARIANT (U10): a runtime notice is a RUNTIME statement and has no raw-error field', () => {
    const notice: WorkflowNotice = workflowNotice('PROVIDER_FAILURE');
    const view = noticeViewOf(notice);
    assert.equal(view.tone, 'runtime');
    assert.equal(view.message, WORKFLOW_ERROR_MESSAGES.PROVIDER_FAILURE);
    assert.deepEqual(Object.keys(view).sort(), [
      'code',
      'heading',
      'hint',
      'message',
      'recovery',
      'retryable',
      'tone',
    ]);
    const serialized = JSON.stringify(view);
    for (const banned of ['original_error', 'DOMException', 'stack', 'Error:', 'http://', 'https://']) {
      assert.ok(!serialized.includes(banned), `"${banned}" must never reach the DOM`);
    }
  });

  it('IMPLEMENTATION INVARIANT (U10/§44): a gate notice and a runtime notice never share a heading', () => {
    const gate = noticeViewOf(workflowNotice('GATE_NOT_SATISFIED'));
    const runtime = noticeViewOf(workflowNotice('WORKSPACE_FAILURE_UNCLASSIFIED'));
    assert.equal(gate.tone, 'gate');
    assert.equal(runtime.tone, 'runtime');
    assert.notEqual(gate.heading, runtime.heading);
    assert.notEqual(gate.hint, runtime.hint);
  });
});

/* ------------------------------------------------------------------ *
 * The rail and the capture grid
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜the rail and the structured grid (task §15 / §19)', () => {
  const summaries: readonly WorkflowAttemptSummary[] = [
    {
      attempt_id: 'ATT_active_demo',
      state: 'Formal',
      archive_state: 'active',
      data_source_nature: 'demo_sample',
      title: '目标 A',
      excerpt: '一次尝试',
      created_at: '2026-09-25T09:00:00.000Z',
      updated_at: '2026-09-25T10:00:00.000Z',
    },
    {
      attempt_id: 'ATT_archived',
      state: 'Draft',
      archive_state: 'archived',
      data_source_nature: 'field_record',
      title: '目标 B',
      excerpt: '另一次尝试',
      created_at: '2026-09-24T09:00:00.000Z',
      updated_at: '2026-09-24T10:00:00.000Z',
    },
  ];

  it('IMPLEMENTATION INVARIANT (§41): a `demo_sample` record carries a visibly different badge from real data', () => {
    const demo = natureBadgeOf('demo_sample');
    const live = natureBadgeOf('field_record');
    assert.equal(demo.is_demo, true);
    assert.equal(live.is_demo, false);
    assert.notEqual(demo.label, live.label);
  });

  it('IMPLEMENTATION INVARIANT (§42): archiving is a state - the line stays, marked and de-emphasised', () => {
    const items = railItemsOf(summaries, 'ATT_archived');
    assert.equal(items.length, 2);
    assert.equal(items[0]?.archived, false);
    assert.equal(items[1]?.archived, true);
    assert.ok((items[1]?.archived_label ?? '').length > 0);
    assert.equal(items[1]?.selected, true);
  });

  it('IMPLEMENTATION INVARIANT (§19): an unprovided field says so instead of rendering an empty box', () => {
    const fields = captureFieldsOf(snapshotWith({}));
    assert.ok(fields.length > 0);
    for (const field of fields) {
      assert.equal(field.value, null);
      assert.equal(field.source, 'unknown');
      assert.ok(field.unknown_label.length > 0);
    }
  });

  it('IMPLEMENTATION INVARIANT (§23): the Formal gate gap is read from the domain predicate', () => {
    const gate = formalGateViewOf(snapshotWith({}));
    assert.equal(gate.ready, false);
    assert.ok(gate.missing.length > 0);
    for (const item of gate.missing) {
      assert.ok(!item.includes('_'), `"${item}" must be a human label, not a field key`);
    }
  });
});

/* ------------------------------------------------------------------ *
 * ⑩ - the trace
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜the evidence trace (task §29 / §40)', () => {
  it('IMPLEMENTATION INVARIANT: `N_引用` is read from the citation view and the landing point is humanised', () => {
    const panel = tracePanelOf({
      owner_id: 'HYP_1',
      kind: 'grounded',
      citation: {
        owner_id: 'HYP_1',
        n_citation: 2,
        counted_target_ids: ['ATT_a', 'ATT_b'],
        counted_ref_ids: ['EREF_1', 'EREF_2'],
        context_only_ref_ids: [],
      },
      traceability: [
        {
          evidence_ref_id: 'EREF_1',
          owner_id: 'HYP_1',
          role: 'grounding',
          target_id: 'ATT_a',
          source_field_path: 'actual_attempt#ATT_a:approach',
          counted_toward_n_citation: true,
          resolvable: true,
          attempt_field_path: 'actual_attempt',
          content_item_id: 'CI_1',
          content_source_type: 'Fact',
          content_value: 'S2 方案',
          source_archived: true,
          matched_level_a_dimensions: ['approach'],
        } as never,
      ],
      model_suggestion_has_no_trace: false,
    });

    assert.equal(panel.n_citation, 2);
    assert.ok(panel.citation_label.includes('2'));
    assert.equal(panel.rows.length, 1);
    const row = panel.rows[0]!;
    assert.equal(row.field_label, '实际尝试');
    assert.equal(row.archived, true);
    assert.equal(row.role_label, '依据');
    assert.equal(row.field_path, 'actual_attempt#ATT_a:approach');
  });
});

/* ------------------------------------------------------------------ *
 * CORRECTION-04 - the empty ⑥ state offers to START the first retrieval
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜the empty ⑥ state offers to start the first retrieval (CORRECTION-04)', () => {
  it('IMPLEMENTATION INVARIANT: a Formal record with no stored comparison is STARTABLE, a record without the command is not', () => {
    const formal = retrievalPresentationOf(
      snapshotWith({ available_actions: ['begin_capture', 'rerun_retrieval'] }),
      false,
    );
    /* The empty state keeps its OWN sentence AND gains the missing entry point. */
    assert.equal(formal.phase, 'not_available');
    assert.equal(formal.n_retrieval, null);
    assert.equal(formal.start_offered, true);
    assert.equal(retrievalStartIsOffered(formal), true);

    /* `available_actions` is the authority: a record not offered the command draws nothing. */
    const without_command = retrievalPresentationOf(snapshotWith({}), false);
    assert.equal(without_command.phase, 'not_available');
    assert.equal(without_command.start_offered, false);
    assert.equal(retrievalStartIsOffered(without_command), false);

    /* No snapshot at all (provider-less browse) ⇒ nothing to offer either. */
    assert.equal(retrievalPresentationOf(null, false).start_offered, false);
  });

  it('IMPLEMENTATION INVARIANT: a stored comparison never offers 「开始检索」 - it stays the rerun / stale path', () => {
    const related = retrievalPresentationOf(
      snapshotWith({
        available_actions: ['begin_capture', 'rerun_retrieval'],
        retrieval: retrievalPatch({ total: 2, visible: 2, n_retrieval: 2 }),
      }),
      false,
    );
    assert.equal(related.phase, 'related');
    assert.equal(related.start_offered, false);

    /* The completed-but-empty states keep their own sentences and offer no start control. */
    const none_found = retrievalPresentationOf(
      snapshotWith({
        available_actions: ['begin_capture', 'rerun_retrieval'],
        retrieval: retrievalPatch({
          total: 0,
          visible: 0,
          n_retrieval: 0,
          zero_like_state: 'NO_RELATED_HISTORY',
        }),
      }),
      false,
    );
    assert.equal(none_found.start_offered, false);

    /* A stale comparison still offers the RERUN, and never the start control. */
    const stale = retrievalPresentationOf(
      snapshotWith({
        available_actions: ['begin_capture', 'rerun_retrieval'],
        retrieval: retrievalPatch({ total: 1, visible: 1, n_retrieval: 1, stale: true }),
      }),
      false,
    );
    assert.equal(stale.start_offered, false);
    assert.equal(staleRerunIsOffered(stale), true);
  });
});
