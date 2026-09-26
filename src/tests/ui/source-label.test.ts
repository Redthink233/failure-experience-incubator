/**
 * `RECOVERY-POLISH-01` ｜ **POLISH-B —— 字段来源标签的用户可见语义**（P5–P10）。
 *
 * 🔴 WHAT WAS WRONG, AND WHY NO EARLIER SUITE COULD SEE IT: every `Fact` in the grid was labelled
 *    「你修改过」 purely because `source_type === 'Fact'` (`sourceLabelOf` had no other input). On a
 *    seeded Demo record that sentence is a FABRICATED EDIT HISTORY: nobody edited `DEMO-01`, and V1
 *    stores no edit history to consult anyway (AC-122 / `source_type` is invariant, §4.2 rule 1).
 *
 * 🔴 WHAT THIS SUITE PINS:
 *      P5  a `demo_sample` record's `Fact` reads 「示例记录」;
 *      P6  and never 「你修改过」;
 *      P7  an ordinary Live `Fact` reads 「你提供的信息」 by default;
 *      P8  「你修改过」 is UNREACHABLE without real edit evidence - and IS reachable with it;
 *      P9  `Extraction` keeps its AI-side wording;
 *      P10 `Inference` is never presented as a user fact.
 *
 * 🔴 SCOPE OF EVIDENCE, STATED HONESTLY: these are `IMPLEMENTATION INVARIANT` cases over the PURE
 *    presenters plus (for P5/P6) a real provider-less browse of the seeded Demo baseline. The
 *    rendered DOM is verified by the `RECOVERY-POLISH-01` visual smoke, not here - the Node test
 *    build has no `document`. No `AC` / `Decision` / `CCR` is created and the contract is untouched.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { D9WorkflowSnapshot } from '../../application/workflow/types.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import {
  CONFIRM_SOURCE_AI,
  CONFIRM_SOURCE_DEMO,
  CONFIRM_SOURCE_USER,
  CONFIRM_SOURCE_USER_PROVIDED,
  PARSE_SOURCE_AI,
  PARSE_UNKNOWN,
} from '../../ui/copy.js';
import {
  captureFieldsOf,
  keyParameterViewsOf,
  sourceLabelOf,
  sourceRoleOf,
} from '../../ui/presenters/capture.js';
import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import { composeBrowserWorkspaceReader } from '../../browser/application/workspace-reader-composition.js';
import { DEMO_ATTEMPTS, seedDemoBaseline } from '../../demo/index.js';
import { readRepoFile, stripComments } from '../ai/source-scan.js';

/* ------------------------------------------------------------------ *
 * Snapshot fixtures - pure-function inputs, never written to a workspace
 * ------------------------------------------------------------------ */

type Snapshot = D9WorkflowSnapshot;

/**
 * A LIVE record (`field_record`) whose `goal` / `actual_attempt` / `actual_result` are the user's
 * own confirmed `Fact`s - the shape an ordinary non-Demo record has after ③.
 */
function liveSnapshot(patch: Record<string, unknown> = {}): Snapshot {
  const attempt_id = 'ATT_LIVE0000000000000000000000';
  return {
    attempt_id,
    attempt_state: 'Formal',
    archive_state: 'active',
    attempt: {
      attempt_id,
      project_id: null,
      state: 'Formal',
      archive_state: 'active',
      raw_text: { content_item_id: `${attempt_id}:raw_text`, source_type: 'Fact', value: '一次尝试' },
      goal: {
        presence_state: 'present',
        item: { content_item_id: `${attempt_id}:goal:user`, source_type: 'Fact', value: '降低颜色变化' },
      },
      actual_attempt: {
        presence_state: 'present',
        item: {
          content_item_id: `${attempt_id}:actual_attempt:user`,
          source_type: 'Fact',
          value: '热风干燥',
        },
      },
      condition: { presence_state: 'unknown' },
      actual_result: {
        presence_state: 'present',
        item: {
          content_item_id: `${attempt_id}:actual_result:user`,
          source_type: 'Fact',
          value: '颜色变化明显',
        },
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
      created_at: '2026-09-25T10:00:00.000Z',
      updated_at: '2026-09-25T10:00:00.000Z',
      data_source_nature: 'field_record',
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
    available_actions: ['begin_capture', 'rerun_retrieval', 'generate_insights', 'generate_hypotheses'],
    ...patch,
  } as unknown as Snapshot;
}

/** The same LIVE record still open as a `Draft`, with an unsettled AI parse proposal on `goal`. */
function liveDraftWithProposal(): Snapshot {
  const base = liveSnapshot();
  const attempt_id = 'ATT_LIVE0000000000000000000000';
  return {
    ...base,
    attempt_state: 'Draft',
    attempt: {
      ...base.attempt,
      state: 'Draft',
      goal: { presence_state: 'unknown' },
    },
    capture: {
      ...base.capture,
      draft_state: { ...base.capture.draft_state, parse_state: 'parsed' },
      content_items: [
        {
          content_item_id: `${attempt_id}:goal:ai`,
          source_type: 'Extraction',
          value: '降低颜色变化',
          field_key: 'goal',
          origin_hint: '来自第 ② 步结构化解析',
        },
      ],
    },
  } as unknown as Snapshot;
}

async function demoSnapshotOf(fixture_key: string): Promise<Snapshot> {
  const storage = new InMemoryWorkspaceStorage();
  const seeded = await seedDemoBaseline({ storage });
  assert.equal(seeded.kind, 'seeded');
  const fixture = DEMO_ATTEMPTS.find((entry) => entry.fixture_key === fixture_key);
  assert.ok(fixture !== undefined, `${fixture_key} must exist`);
  const reader = composeBrowserWorkspaceReader({ storage });
  const browsed = await reader.reads.readWorkflow(fixture.attempt_id as ObjectId<'ATT'>);
  assert.equal(browsed.kind, 'snapshot', `${fixture_key} must open without a model`);
  if (browsed.kind !== 'snapshot') {
    throw new Error('unreachable');
  }
  return browsed.snapshot as unknown as Snapshot;
}

/* ------------------------------------------------------------------ *
 * P5 / P6 - the Demo record's own Fact is example data, not an edit
 * ------------------------------------------------------------------ */

describe('RECOVERY-POLISH-01 ｜ POLISH-B - P5 / P6: Demo Facts read 「示例记录」, never 「你修改过」', () => {
  it('P5 / IMPLEMENTATION INVARIANT: `sourceLabelOf` maps a `demo_sample` Fact to 「示例记录」', () => {
    assert.equal(CONFIRM_SOURCE_DEMO, '示例记录');
    assert.equal(
      sourceLabelOf('Fact', { data_source_nature: 'demo_sample' }),
      CONFIRM_SOURCE_DEMO,
    );
  });

  it('P6 / IMPLEMENTATION INVARIANT: no field of DEMO-01 / DEMO-05 / DEMO-08 claims an edit', async () => {
    for (const key of ['DEMO-01', 'DEMO-05', 'DEMO-08']) {
      const snapshot = await demoSnapshotOf(key);
      assert.equal(snapshot.attempt.data_source_nature, 'demo_sample', `${key} must be seeded data`);

      const fields = captureFieldsOf(snapshot);
      const settled = fields.filter((field) => field.source === 'user');
      assert.ok(settled.length > 0, `${key} must expose user-layer Facts to label`);

      for (const field of settled) {
        /* 🔴 Each of goal / actual_attempt / condition / actual_result is read off the record. */
        assert.equal(field.source_label, CONFIRM_SOURCE_DEMO, `${key}.${field.field}`);
        assert.notEqual(field.source_label, CONFIRM_SOURCE_USER, `${key}.${field.field}`);
      }
      assert.equal(
        fields.some((field) => field.source_label === CONFIRM_SOURCE_USER),
        false,
        `${key} must not claim a user edit anywhere in the grid`,
      );

      /* 🔴 unknown stays unknown: the Demo label never smuggles in a value. */
      const condition = fields.find((field) => field.field === 'condition');
      assert.ok(condition !== undefined);
      if (key === 'DEMO-01') {
        assert.equal(condition?.value, '50°C');
      } else {
        assert.equal(condition?.value, null);
        assert.equal(condition?.unknown_label, PARSE_UNKNOWN);
      }
    }
  });

  it('P6 / IMPLEMENTATION INVARIANT: even WITH an edit signal, a `demo_sample` record says 「示例记录」', () => {
    /*
     * 🔴 The Demo nature is checked FIRST and cannot be overridden by a session edit signal. A
     *    seeded record cannot be edited through the ③ controls at all (it is `Formal`, so the
     *    controls are not drawn), but the precedence is pinned here so a future change cannot make
     *    the label depend on ordering by accident.
     */
    const snapshot = liveSnapshot();
    const asDemo = {
      ...snapshot,
      attempt: { ...snapshot.attempt, data_source_nature: 'demo_sample' },
    } as unknown as Snapshot;
    for (const field of captureFieldsOf(asDemo, { edited_fields: ['goal', 'actual_attempt'] })) {
      if (field.source === 'user') {
        assert.equal(field.source_label, CONFIRM_SOURCE_DEMO);
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * P7 / P8 - the Live default, and what it takes to say 「你修改过」
 * ------------------------------------------------------------------ */

describe('RECOVERY-POLISH-01 ｜ POLISH-B - P7 / P8: the Live default and the edit-evidence gate', () => {
  it('P7 / IMPLEMENTATION INVARIANT: an ordinary Live Fact defaults to 「你提供的信息」', () => {
    assert.equal(CONFIRM_SOURCE_USER_PROVIDED, '你提供的信息');
    assert.equal(sourceLabelOf('Fact'), CONFIRM_SOURCE_USER_PROVIDED);
    assert.equal(sourceLabelOf('Fact', { data_source_nature: 'field_record' }), CONFIRM_SOURCE_USER_PROVIDED);
    assert.equal(
      sourceLabelOf('Fact', { data_source_nature: 'retrospective_entry' }),
      CONFIRM_SOURCE_USER_PROVIDED,
      'the other Live nature is not a Demo record either',
    );

    const fields = captureFieldsOf(liveSnapshot());
    const settled = fields.filter((field) => field.source === 'user');
    assert.equal(settled.length, 3, 'goal / actual_attempt / actual_result are the user Facts');
    for (const field of settled) {
      assert.equal(field.source_label, CONFIRM_SOURCE_USER_PROVIDED, field.field);
    }
  });

  it('P8 / IMPLEMENTATION INVARIANT: no edit evidence ⇒ 「你修改过」 appears NOWHERE', () => {
    const snapshot = liveSnapshot();
    for (const context of [undefined, {}, { edited_fields: [] }, { edited_fields: ['condition'] }]) {
      const fields = context === undefined ? captureFieldsOf(snapshot) : captureFieldsOf(snapshot, context);
      assert.equal(
        fields.some((field) => field.source_label === CONFIRM_SOURCE_USER),
        false,
        'a Fact alone must never produce an edit claim',
      );
    }
    /* `condition` is unknown on this record, so naming it as edited changes nothing at all. */
    assert.equal(
      captureFieldsOf(snapshot, { edited_fields: ['condition'] }).find(
        (field) => field.field === 'condition',
      )?.source_label,
      PARSE_UNKNOWN,
    );
    /* And the presenter-level function refuses the claim on its own, with no context at all. */
    assert.notEqual(sourceLabelOf('Fact'), CONFIRM_SOURCE_USER);
    assert.notEqual(sourceLabelOf('Fact', { user_edited: false }), CONFIRM_SOURCE_USER);
  });

  it('P8 / IMPLEMENTATION INVARIANT: a REAL edit signal IS honoured (the gate is not dead code)', () => {
    const fields = captureFieldsOf(liveSnapshot(), { edited_fields: ['goal'] });
    assert.equal(
      fields.find((field) => field.field === 'goal')?.source_label,
      CONFIRM_SOURCE_USER,
    );
    /* Only the edited field changes - the neighbours keep the default. */
    assert.equal(
      fields.find((field) => field.field === 'actual_attempt')?.source_label,
      CONFIRM_SOURCE_USER_PROVIDED,
    );
    /* And the AI proposal branch honours it too, while `source_role` stays `ai`. */
    const proposed = captureFieldsOf(liveDraftWithProposal(), { edited_fields: ['goal'] });
    const goal = proposed.find((field) => field.field === 'goal');
    assert.equal(goal?.source, 'ai');
    assert.equal(goal?.source_label, CONFIRM_SOURCE_USER);
  });

  it('P8 / IMPLEMENTATION INVARIANT (static): the shell derives the signal from ③ and drops blanks', () => {
    const source = stripComments(readRepoFile('src/ui/components/steps.ts'));
    assert.ok(
      source.includes('editedFieldKeys(state.confirmation_edits)'),
      'the ③ grid must pass the in-session edit buffer, not a constant',
    );
    assert.ok(
      source.includes('edited_fields: editedFieldKeys(state.confirmation_edits)'),
      'the edit signal must be wired as `edited_fields`',
    );
    /* 🔴 A field the user typed into and then cleared is NOT an edit - the filter must survive. */
    assert.ok(
      /value\.trim\(\)\.length > 0/u.test(source),
      'a blank buffer entry must be dropped rather than counted as an edit',
    );
  });
});

/* ------------------------------------------------------------------ *
 * P9 / P10 - the AI side is unchanged, and `Inference` is not a user fact
 * ------------------------------------------------------------------ */

describe('RECOVERY-POLISH-01 ｜ POLISH-B - P9 / P10: the AI-side labels and the Inference boundary', () => {
  it('P9 / IMPLEMENTATION INVARIANT: an `Extraction` keeps its AI-side wording', () => {
    assert.equal(CONFIRM_SOURCE_AI, 'AI 整理');
    assert.equal(sourceLabelOf('Extraction'), CONFIRM_SOURCE_AI);
    assert.equal(sourceLabelOf('Extraction', { data_source_nature: 'field_record' }), CONFIRM_SOURCE_AI);
    assert.equal(sourceLabelOf('Extraction', { user_edited: true }), CONFIRM_SOURCE_AI);
    assert.equal(sourceLabelOf('Extraction', { data_source_nature: 'demo_sample' }), CONFIRM_SOURCE_AI);
    /* The ② proposal sentence is untouched: an unsettled AI parse still reads 「AI 解析结果」. */
    const goal = captureFieldsOf(liveDraftWithProposal()).find((field) => field.field === 'goal');
    assert.equal(goal?.source, 'ai');
    assert.equal(goal?.source_label, PARSE_SOURCE_AI);
    assert.equal(goal?.origin_hint, '来自第 ② 步结构化解析');
  });

  it('P10 / IMPLEMENTATION INVARIANT: an `Inference` is never presented as a user fact', () => {
    const inference = sourceLabelOf('Inference');
    assert.equal(inference, CONFIRM_SOURCE_AI);
    assert.notEqual(inference, CONFIRM_SOURCE_USER);
    assert.notEqual(inference, CONFIRM_SOURCE_USER_PROVIDED);
    assert.notEqual(inference, CONFIRM_SOURCE_DEMO);
    assert.equal(sourceRoleOf('Inference'), 'ai');
    assert.notEqual(sourceRoleOf('Inference'), 'user');

    /*
     * 🔴 The AI half is decided BEFORE the Demo / edit overrides, so a `demo_sample` record's
     *    `result_status` (`Inference|decision`) keeps its AI wording instead of inheriting 「示例记录」.
     */
    assert.equal(sourceLabelOf('Inference', { data_source_nature: 'demo_sample' }), CONFIRM_SOURCE_AI);
    assert.notEqual(sourceLabelOf('Inference', { data_source_nature: 'demo_sample' }), CONFIRM_SOURCE_DEMO);
    assert.equal(sourceRoleOf('Fact'), 'user');
    assert.equal(sourceRoleOf('Extraction'), 'ai');
  });

  it('P10 / IMPLEMENTATION INVARIANT: `source_type` itself is never rewritten by the label logic', () => {
    const snapshot = liveSnapshot();
    const before = JSON.stringify(snapshot.attempt);
    captureFieldsOf(snapshot, { edited_fields: ['goal'] });
    keyParameterViewsOf(snapshot, { edited_fields: ['key_parameters'] });
    assert.equal(JSON.stringify(snapshot.attempt), before, 'labelling must be read-only');
    /* No new provenance field was introduced anywhere in the record. */
    for (const banned of ['source_label_state', 'demo_source_type', 'edited_source_type']) {
      assert.equal(banned in snapshot.attempt, false);
    }
  });
});
