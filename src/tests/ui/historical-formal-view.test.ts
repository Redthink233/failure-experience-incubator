/**
 * `PRE-PSA-HARDENING-01` ｜ **HISTORICAL FORMAL VIEW + DEMO COPY CLOSURE** —— P1–P12。
 *
 * 🔴 WHAT THIS SUITE PROVES, AND WHY IT EXISTS: the first real look at the Demo workspace through a
 *    browser exposed four USER-VISIBLE semantic defects that no earlier suite could see, because all
 *    of them need a `Formal` record opened as HISTORY rather than walked through as a live flow:
 *      P1 ② was still drawn as 「当前」 on a record whose capture phase ended long ago;
 *      P2/P3 ⑥ said 「这条记录还没有做过历史检索」 while ⑤ simultaneously said 「历史检索这次没有完成」;
 *      P4 that fix must NOT swallow a REAL ⑥ runtime failure;
 *      P5 `N_检索 = 0` (a COMPLETED retrieval) must stay a third, separate statement;
 *      P6/P7 a provider-less browse of a saved record must not offer Draft capture controls;
 *      P8–P11 the Demo fixture wording change must not touch any structured semantics or identity;
 *      P12 the live rehearsal script is untouched.
 *
 * 🔴 SCOPE OF EVIDENCE, STATED HONESTLY: P6/P7 are asserted at the DECISION seam the components use
 *    (`actionOffered`) plus a static check that the components really consult it for each capture
 *    control; the rendered DOM itself is verified by the `PRE-PSA-HARDENING-01` visual smoke, not by
 *    a unit test (the Node test build has no `document`). Nothing here claims a browser was driven.
 *
 * These are `IMPLEMENTATION INVARIANT` cases, not new product `AC`. No `AC`, `Decision` or `CCR` is
 * created; the frozen contract is not modified.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { D9WorkflowSnapshot } from '../../application/workflow/types.js';
import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import {
  RETRIEVAL_NOT_AVAILABLE,
  RETRIEVAL_RUNTIME_INCOMPLETE,
  RETRIEVAL_NO_RELATED_HISTORY,
  RETRIEVAL_HISTORY_EMPTY,
} from '../../ui/copy.js';
import { retrievalPresentationOf, saveAndRetrievalAreSplit } from '../../ui/presenters/retrieval.js';
import {
  actionOffered,
  currentStepNumberOf,
  stepFactsOf,
  stepViewsForSnapshot,
} from '../../ui/presenters/steps.js';
import {
  DEMO_ATTEMPTS,
  DEMO_PROJECTS,
  TE_DEMO_LIVE_01,
  demoAttemptByKey,
  readDemoBaseline,
  seedDemoBaseline,
} from '../../demo/index.js';
import { readRepoFile, stripComments } from '../ai/source-scan.js';

/* ------------------------------------------------------------------ *
 * Snapshot fixtures - the DEMO SHAPE, not a hand-walked draft
 * ------------------------------------------------------------------ */

type Snapshot = D9WorkflowSnapshot;

/**
 * A record in the exact shape the Demo baseline produces: `Formal`, and its capture phase performed
 * by the SEED rather than by steps ①–⑤, so the capture artifacts a live flow would leave behind are
 * simply absent (`parse_state: 'not_parsed'`, no content items, no follow-up history).
 */
function formalSnapshot(patch: Record<string, unknown> = {}): Snapshot {
  const attempt_id = 'ATT_DEM0A010000000000000000000';
  return {
    attempt_id,
    attempt_state: 'Formal',
    archive_state: 'active',
    attempt: {
      attempt_id,
      project_id: 'PRJ_DEM0PRA0000000000000000000',
      state: 'Formal',
      archive_state: 'active',
      raw_text: { content_item_id: `${attempt_id}:raw_text`, source_type: 'Fact', value: '一次尝试' },
      goal: {
        presence_state: 'present',
        item: { content_item_id: `${attempt_id}:goal`, source_type: 'Fact', value: '降低颜色变化' },
      },
      actual_attempt: {
        presence_state: 'present',
        item: { content_item_id: `${attempt_id}:actual_attempt`, source_type: 'Fact', value: '热风干燥' },
      },
      condition: { presence_state: 'unknown' },
      actual_result: {
        presence_state: 'present',
        item: { content_item_id: `${attempt_id}:actual_result`, source_type: 'Fact', value: '颜色变化明显' },
      },
      result_status: {
        presence_state: 'present',
        item: {
          content_item_id: `${attempt_id}:result_status`,
          source_type: 'Inference',
          value: 'Failed',
          confirmation_class: 'decision',
          decision_state: 'accepted',
        },
      },
      expected_result: { presence_state: 'unknown' },
      judgment_basis: { presence_state: 'unknown' },
      key_parameters: [],
      candidate_causes: [],
      occurred_at: { presence_state: 'unknown' },
      environment: { presence_state: 'unknown' },
      cost: { presence_state: 'unknown' },
      user_note: { presence_state: 'unknown' },
      failure_tags: [],
      created_at: '2026-08-08T10:00:00.000Z',
      updated_at: '2026-08-08T10:00:00.000Z',
      data_source_nature: 'demo_sample',
    },
    capture: {
      attempt: {},
      draft_state: {
        attempt_id,
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
        next_gap: 'condition',
        missing_gaps: ['condition'],
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
        attempt_updated_at: '2026-08-08T10:00:00.000Z',
        comparison_generated_at: null,
      },
      runtime_failure: null,
    },
    insights: { batches: [], current_batch_id: null, views: [], experience_assets: [], state_events: {} },
    hypotheses: { batches: [], current_batch_id: null, views: [], model_suggestions: [] },
    notices: [],
    /* 🔴 What `M15` really derives for a `Formal` record: no capture command is offered at all. */
    available_actions: ['begin_capture', 'rerun_retrieval', 'generate_insights', 'generate_hypotheses', 'set_attempt_archived'],
    ...patch,
  } as unknown as Snapshot;
}

/** The same record as a live `Draft`: the capture phase is OPEN, so its commands are offered. */
function draftSnapshot(patch: Record<string, unknown> = {}): Snapshot {
  const base = formalSnapshot();
  return {
    ...base,
    attempt_state: 'Draft',
    attempt: { ...base.attempt, state: 'Draft' },
    available_actions: [
      'begin_capture',
      'apply_structured_confirmation',
      'ask_follow_up_question',
      'abandon_follow_up_gap',
      'persist_candidate_causes',
      'save_formal_attempt',
      'set_attempt_archived',
    ],
    ...patch,
  } as unknown as Snapshot;
}

const CAPTURE_PHASE_ACTIONS = [
  'ask_follow_up_question',
  'abandon_follow_up_gap',
  'apply_structured_confirmation',
  'persist_candidate_causes',
  'save_formal_attempt',
] as const;

/* ------------------------------------------------------------------ *
 * P1 - the capture phase of a saved record is closed
 * ------------------------------------------------------------------ */

describe('PRE-PSA-HARDENING-01 ｜ P1: a historical `Formal` record has no current capture step', () => {
  it('P1 / IMPLEMENTATION INVARIANT: the missing DraftState does NOT make ② the current step', () => {
    const snapshot = formalSnapshot();
    /* Preconditions of the defect: the capture artifacts a live flow would leave are absent. */
    assert.equal(snapshot.capture.draft_state.parse_state, 'not_parsed');
    assert.equal(snapshot.capture.content_items.length, 0);

    const facts = stepFactsOf(snapshot);
    assert.equal(facts.formal, true);
    assert.equal(facts.parsed, true, 'a saved record has no parse left to run');
    assert.equal(facts.confirmed, true);

    const views = stepViewsForSnapshot(snapshot);
    assert.equal(views.length, 10);
    /* ①–⑤ describe a phase that ended; none of them may be drawn as 「当前」. */
    assert.deepEqual(
      views.slice(0, 5).map((view) => view.status),
      ['done', 'done', 'done', 'done', 'done'],
    );
    assert.notEqual(views[1]?.status, 'current', '② must never be the current step of a saved record');
    assert.equal(currentStepNumberOf(views), '⑥', 'the focus lands on the post-save chain');
    assert.equal(views[0]?.status_label, '完成');
  });

  it('P1 / IMPLEMENTATION INVARIANT: the focus never lands before ⑥, whatever the missing artifacts', () => {
    /*
     * Every shape a saved record can really take: no draft state at all, a draft state left behind by
     * a flow that used follow-up questions, and a record whose candidate causes were recorded.
     */
    for (const patch of [
      {},
      {
        capture: {
          ...formalSnapshot().capture,
          draft_state: { ...formalSnapshot().capture.draft_state, parse_state: 'pending_user_confirm' },
        },
      },
      { attempt: { ...formalSnapshot().attempt, candidate_causes: [{ content_item_id: 'c1', source_type: 'Inference', value: '温度过高', confirmation_class: 'decision', decision_state: 'accepted' }] } },
    ]) {
      const views = stepViewsForSnapshot(formalSnapshot(patch));
      const first_five = views.slice(0, 5).map((view) => view.status);
      assert.deepEqual(first_five, ['done', 'done', 'done', 'done', 'done'], JSON.stringify(first_five));
      assert.equal(currentStepNumberOf(views), '⑥');
    }
  });

  it('P1 / IMPLEMENTATION INVARIANT: a `Draft` keeps the per-step derivation (the fix is not a blanket one)', () => {
    const draft = stepViewsForSnapshot(draftSnapshot());
    /* 🔴 For a `Draft` whose parse has not run, ② IS the focus - that behaviour is unchanged. */
    assert.equal(currentStepNumberOf(draft), '②');
    assert.equal(draft[1]?.status, 'current');
    assert.equal(draft[0]?.status, 'done');

    const parsed = stepViewsForSnapshot(
      draftSnapshot({
        capture: {
          ...draftSnapshot().capture,
          draft_state: { ...draftSnapshot().capture.draft_state, parse_state: 'extracted' },
        },
      }),
    );
    assert.equal(currentStepNumberOf(parsed), '④', 'a confirmed draft continues at ④');
  });
});

/* ------------------------------------------------------------------ *
 * P2 / P3 - never-run is not a failure
 * ------------------------------------------------------------------ */

describe('PRE-PSA-HARDENING-01 ｜ P2 / P3: 「从未检索」 is not 「检索这次没有完成」', () => {
  it('P2 / IMPLEMENTATION INVARIANT: a saved record with no derivation says it has not retrieved yet', () => {
    const snapshot = formalSnapshot();
    assert.equal(snapshot.retrieval.state, 'not_available');

    const view = retrievalPresentationOf(snapshot, false);
    assert.equal(view.phase, 'not_available');
    assert.equal(view.headline, RETRIEVAL_NOT_AVAILABLE);
    assert.equal(view.n_retrieval, null, 'nothing stored is `null` - NEVER `0`');
    assert.equal(view.runtime_notice, null);
  });

  it('P3 / IMPLEMENTATION INVARIANT: ⑤ does not claim a failure that never happened', () => {
    const snapshot = formalSnapshot();
    /* 🔴 The combined 「保存成功 + 检索没完成」 statement belongs to a RUNTIME failure only. */
    assert.equal(saveAndRetrievalAreSplit(snapshot), false);

    const screen = [
      retrievalPresentationOf(snapshot, false).headline,
      saveAndRetrievalAreSplit(snapshot) ? RETRIEVAL_RUNTIME_INCOMPLETE : '',
    ].join('\n');
    assert.equal(
      screen.includes(RETRIEVAL_RUNTIME_INCOMPLETE),
      false,
      '⑥ and ⑤ must not contradict each other on the same screen',
    );
    assert.equal(screen.includes('暂无数据'), false);
  });

  it('P3 / IMPLEMENTATION INVARIANT: an archived-but-unretrieved saved record behaves the same way', () => {
    const archived = formalSnapshot({ archive_state: 'archived' });
    assert.equal(saveAndRetrievalAreSplit(archived), false);
    assert.equal(retrievalPresentationOf(archived, false).phase, 'not_available');
  });
});

/* ------------------------------------------------------------------ *
 * P4 / P5 - the two states that MUST survive the fix
 * ------------------------------------------------------------------ */

describe('PRE-PSA-HARDENING-01 ｜ P4 / P5: a real runtime failure and `N_检索 = 0` keep their own words', () => {
  it('P4 / IMPLEMENTATION INVARIANT: `Formal` + a real ⑥ runtime failure keeps the failure statement', () => {
    const failed = formalSnapshot({
      retrieval: {
        ...formalSnapshot().retrieval,
        state: 'runtime_incomplete',
        runtime_failure: { stage: 'dimension-judge', reason: 'the provider did not answer' },
      },
      notices: [{ layer: 'RUNTIME', code: 'RETRIEVAL_RUNTIME_INCOMPLETE', message: RETRIEVAL_RUNTIME_INCOMPLETE, retryable: true, recovery: { kind: 'rerun_retrieval', attempt_id: 'ATT_DEM0A010000000000000000000' } }],
    });

    const view = retrievalPresentationOf(failed, false);
    assert.equal(view.phase, 'runtime_incomplete');
    assert.equal(view.headline, RETRIEVAL_RUNTIME_INCOMPLETE);
    assert.ok(view.runtime_notice !== null, 'the recovery notice must still reach the screen');
    assert.equal(view.runtime_notice?.recovery?.kind, 'rerun_retrieval');

    /* The record STAYS `Formal`, and ⑤ keeps its combined, retryable statement. */
    assert.equal(failed.attempt_state, 'Formal');
    assert.equal(saveAndRetrievalAreSplit(failed), true);
    assert.equal(failed.retrieval.n_retrieval, null, 'a failure is not `N_检索 = 0` either');
  });

  it('P5 / IMPLEMENTATION INVARIANT: a COMPLETED retrieval with N = 0 is a third, different state', () => {
    const zero = formalSnapshot({
      retrieval: {
        state: 'ready',
        derivation: { derivation_id: 'DER_1' },
        view: {
          source_attempt_id: 'ATT_DEM0A010000000000000000000',
          status: 'NO_RELATED_HISTORY',
          n_retrieval: 0,
          retrieval_tier: '1',
          hit_level_a_dimensions: [],
          uncompared_dimensions: [],
          uncompared_notes: [],
          candidates: [],
          first_screen_size: 0,
          total_candidate_count: 0,
          remaining_beyond_first_screen: 0,
          expandable: false,
          expanded: false,
        },
        n_retrieval: 0,
        zero_like_state: 'NO_RELATED_HISTORY',
        freshness: {
          stale: false,
          notice: null,
          attempt_updated_at: '2026-08-08T10:00:00.000Z',
          comparison_generated_at: '2026-08-08T11:00:00.000Z',
        },
        runtime_failure: null,
      },
    });

    const view = retrievalPresentationOf(zero, false);
    assert.equal(view.phase, 'no_related_history');
    assert.equal(view.headline, RETRIEVAL_NO_RELATED_HISTORY);
    /*
     * 🔴 THE READ MODEL KEEPS THE THREE STATES APART (that is what §5 protects):
     *    a COMPLETED retrieval really reports `N_检索 = 0`; a run that never happened and a run that
     *    failed both report `null` - they are absences, not zero results.
     */
    assert.equal(zero.retrieval.state, 'ready');
    assert.equal(zero.retrieval.zero_like_state, 'NO_RELATED_HISTORY');
    assert.equal(zero.retrieval.n_retrieval, 0, 'a completed retrieval really reports zero');
    assert.equal(formalSnapshot().retrieval.n_retrieval, null, 'never-run is `null`, never `0`');
    assert.equal(
      formalSnapshot({ retrieval: { ...formalSnapshot().retrieval, state: 'runtime_incomplete' } }).retrieval
        .n_retrieval,
      null,
      'a runtime failure is `null` too - and it is not an empty history either',
    );

    /* 🔴 Four distinct statements, never merged. */
    const never_run = retrievalPresentationOf(formalSnapshot(), false).headline;
    const runtime = retrievalPresentationOf(
      formalSnapshot({ retrieval: { ...formalSnapshot().retrieval, state: 'runtime_incomplete' } }),
      false,
    ).headline;
    const sentences = [never_run, runtime, view.headline, RETRIEVAL_HISTORY_EMPTY];
    assert.equal(new Set(sentences).size, 4, `expected four distinct statements, got ${sentences.join(' | ')}`);
    /* A completed empty retrieval is not a save-with-failed-retrieval either. */
    assert.equal(saveAndRetrievalAreSplit(zero), false);
  });
});

/* ------------------------------------------------------------------ *
 * P6 / P7 - the read-only affordance
 * ------------------------------------------------------------------ */

describe('PRE-PSA-HARDENING-01 ｜ P6 / P7: a saved record offers no Draft capture control', () => {
  it('P6 / IMPLEMENTATION INVARIANT: provider-less browsing of a saved record offers no capture command', () => {
    const snapshot = formalSnapshot();
    /* The predicate the workbench asks before drawing each ①–⑤ control. */
    for (const action of CAPTURE_PHASE_ACTIONS) {
      assert.equal(
        actionOffered(snapshot, action),
        false,
        `「${action}」 must not be offered for a Formal record - there is no Draft to act on`,
      );
    }
    assert.equal(actionOffered(null, 'ask_follow_up_question'), false);
    /* The post-save chain stays reachable: this is a browse, not a lock-out. */
    assert.equal(actionOffered(snapshot, 'generate_insights'), true);
    assert.equal(actionOffered(snapshot, 'rerun_retrieval'), true);
  });

  it('P7 / IMPLEMENTATION INVARIANT: a live `Draft` still offers every capture command, 追问 included', () => {
    const draft = draftSnapshot();
    for (const action of CAPTURE_PHASE_ACTIONS) {
      assert.equal(actionOffered(draft, action), true, `「${action}」 must stay available on a Draft`);
    }
  });

  it('P6 / IMPLEMENTATION INVARIANT (static): every ①–⑤ control is really gated on the read model', () => {
    const source = stripComments(readRepoFile('src/ui/components/steps.ts'));
    for (const [action, marker] of [
      ['ask_follow_up_question', "actionOffered(snapshot, 'ask_follow_up_question')"],
      ['apply_structured_confirmation', "actionOffered(snapshot, 'apply_structured_confirmation')"],
      ['persist_candidate_causes', "actionOffered(state.snapshot, 'persist_candidate_causes')"],
      ['save_formal_attempt', "actionOffered(state.snapshot, 'save_formal_attempt')"],
    ] as const) {
      assert.ok(
        source.includes(marker),
        `the 「${action}」 affordance must be decided by the read model (${marker} is missing)`,
      );
    }
    /* And the two sentences that replace the missing controls are wired in, not merely defined. */
    assert.ok(source.includes('CAPTURE_HISTORY_READONLY'));
    assert.ok(source.includes('FORMAL_ALREADY_SAVED'));
  });
});

/* ------------------------------------------------------------------ *
 * P8 - P11 - the Demo fixture wording change touches nothing structural
 * ------------------------------------------------------------------ */

const FROZEN_ATTEMPT_IDS = [
  'ATT_DEM0A010000000000000000000',
  'ATT_DEM0A020000000000000000000',
  'ATT_DEM0A030000000000000000000',
  'ATT_DEM0A040000000000000000000',
  'ATT_DEM0A050000000000000000000',
  'ATT_DEM0A060000000000000000000',
  'ATT_DEM0A070000000000000000000',
  'ATT_DEM0A080000000000000000000',
];

const FROZEN_PROJECT_IDS = [
  'PRJ_DEM0PRA0000000000000000000',
  'PRJ_DEM0PRB0000000000000000000',
  'PRJ_DEM0PRC0000000000000000000',
];

describe('PRE-PSA-HARDENING-01 ｜ P8 - P11: the Demo baseline is unchanged apart from wording', () => {
  it('P8 / IMPLEMENTATION INVARIANT: DEMO-05 / DEMO-06 still declare `condition` as unknown', () => {
    for (const key of ['DEMO-05', 'DEMO-06']) {
      const fixture = demoAttemptByKey(key);
      assert.ok(fixture !== null);
      /* `null` IS the explicit 「未知 / 未提供」 - it must not become an empty string or a value. */
      assert.equal(fixture.condition, null, `${key} must keep its unknown condition`);
    }
  });

  it('P9 / IMPLEMENTATION INVARIANT: the awkward cross-domain phrase is gone from those two fixtures', () => {
    for (const key of ['DEMO-05', 'DEMO-06']) {
      const text = demoAttemptByKey(key)?.raw_text ?? '';
      assert.ok(!text.includes('干燥温度'), `${key} must not mention a drying temperature`);
      assert.equal(text.includes('不适用'), false, `${key} must not say 「不适用」 about a drying field`);
      assert.ok(text.includes('没有'), `${key} must still state that nothing else was recorded`);
    }
    /* No other fixture's real drying records lost their own, domain-appropriate wording. */
    assert.ok((demoAttemptByKey('DEMO-03')?.raw_text ?? '').includes('干燥温度'));
    assert.ok((demoAttemptByKey('DEMO-01')?.raw_text ?? '').includes('烘干温度'));
  });

  it('P10 / IMPLEMENTATION INVARIANT: the eight Attempt ids and the three Project ids are unchanged', () => {
    assert.equal(DEMO_ATTEMPTS.length, 8);
    assert.deepEqual(
      DEMO_ATTEMPTS.map((fixture) => String(fixture.attempt_id)),
      FROZEN_ATTEMPT_IDS,
    );
    assert.deepEqual(
      DEMO_PROJECTS.map((project) => project.project_id),
      FROZEN_PROJECT_IDS,
    );
  });

  it('P10 / P11 / IMPLEMENTATION INVARIANT: a re-seed is idempotent and writes no derived object', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const first = await seedDemoBaseline({ storage });
    assert.equal(first.kind, 'seeded');
    if (first.kind !== 'seeded') {
      return;
    }
    assert.equal(first.result.created, 8);
    assert.equal(first.result.reused, 0);

    const second = await seedDemoBaseline({ storage });
    assert.equal(second.kind, 'seeded');
    if (second.kind !== 'seeded') {
      return;
    }
    assert.equal(second.result.created, 0, 'a repeated seed creates nothing');
    assert.equal(second.result.reused, 8, 'the eight records are recognised and preserved');
    assert.deepEqual(
      second.result.attempts.map((attempt) => String(attempt.attempt_id)),
      FROZEN_ATTEMPT_IDS,
    );

    const stored = await readDemoBaseline(storage);
    assert.equal(stored.length, 8);
    for (const attempt of stored) {
      assert.equal(attempt.state, 'Formal');
      assert.equal(attempt.data_source_nature, 'demo_sample');
      assert.equal(attempt.candidate_causes.length, 0);
    }

    /*
     * 🔴 NO DERIVED OBJECT IS PRE-SEEDED (doc §J.1): the persisted files are the three projects, the
     *    eight Attempt sidecars, the workspace metadata and the operator marker - thirteen JSON files,
     *    and not one path naming a retrieval / insight / hypothesis / evidence family.
     */
    const json_paths = storage.filePathsWithExtension('.json');
    assert.equal(json_paths.length, 13);
    for (const path of json_paths) {
      assert.equal(
        /retrieval|derivation|insight|hypothes|evidence/i.test(path),
        false,
        `${path} must not be a pre-seeded derived artifact`,
      );
    }
  });
});

/* ------------------------------------------------------------------ *
 * P12 - the live rehearsal script, and the retired backup
 * ------------------------------------------------------------------ */

describe('PRE-PSA-HARDENING-01 ｜ P12: TE-DEMO-LIVE-01 is untouched and K.5 -03 is retired', () => {
  const deploy_doc = readRepoFile('docs/architecture/05_TEST_DEMO_DEPLOY.md');

  it('P12 / IMPLEMENTATION INVARIANT: the live rehearsal input is byte-identical to its frozen text', () => {
    assert.equal(
      TE_DEMO_LIVE_01.step_a_input,
      '这次干燥还是没成功。我想降低竹片干燥后的颜色变化，用的还是热风干燥、调整送风参数那条路线，' +
        '烘干温度设的是 50 摄氏度，一开始含水率就偏高，干燥结束以后含水率还是偏高，板面出现明显开裂。' +
        '设备还是同一台热风循环干燥箱。',
    );
    assert.equal(TE_DEMO_LIVE_01.te_id, 'TE-DEMO-LIVE-01');
    /* The document still carries the same script, so the two halves cannot drift apart. */
    assert.ok(deploy_doc.includes('烘干温度设的是 **50 摄氏度**'));
    assert.ok(deploy_doc.includes('设备还是同一台热风循环干燥箱'));
  });

  it('K.5 / IMPLEMENTATION INVARIANT: the -03 backup is RETIRED, with the collision stated', () => {
    assert.ok(deploy_doc.includes('TE-DEMO-LIVE-03'), 'the retired script id must stay on record');
    assert.ok(deploy_doc.includes('RETIRED'), '-03 must be marked retired, not silently deleted');
    /* 🔴 The collision is REAL and provable from the fixtures: the retired input re-used DEMO-03. */
    assert.equal(demoAttemptByKey('DEMO-03')?.goal, '缩短干燥周期');
    assert.ok(
      deploy_doc.includes('缩短干燥周期'),
      'the document must keep the retired input visible so the collision can be checked',
    );
    /* The document no longer offers it as a working 「0 hit」 script. */
    assert.ok(deploy_doc.includes('不得再作为「0 hit 备用脚本」使用'));
  });

  it('K.5 / IMPLEMENTATION INVARIANT: no Demo fixture was reshaped to accommodate the old script', () => {
    /* 🔴 The remedy was a DOCUMENT fix. The record the script collided with is exactly as frozen. */
    const demo03 = demoAttemptByKey('DEMO-03');
    assert.ok(demo03 !== null);
    assert.equal(demo03.actual_attempt, '热风干燥 + 提高风量');
    assert.equal(demo03.condition, null);
    assert.equal(demo03.result_status, 'Failed');
    assert.equal(String(demo03.attempt_id), 'ATT_DEM0A030000000000000000000');
  });
});
