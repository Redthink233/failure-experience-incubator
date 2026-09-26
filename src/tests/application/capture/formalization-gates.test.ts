/**
 * S01-05 ｜ E1 – E5 and the `Draft` / `Formal` boundary (table-driven).
 *
 * Canonical AC references used by this file:
 *   AC-02 / AC-03 / AC-26 / AC-29 / AC-73 / AC-79 / AC-89 / AC-Q06-5.
 * 🔴 This file creates NO new AC and redefines no gate.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  GATE_DEFINITION_REFERENCES,
  STEP_1_TO_5_GATE_IDS,
  evaluateCaptureGates,
  evaluateGateE1SourceEligibility,
  evaluateGateE5UserExplicitAcceptance,
} from '../../../application/capture/gates.js';
import { CAPTURE_THRESHOLDS } from '../../../application/capture/formalization.js';
import { createDraftAttempt } from '../../../domain/types/attempt.js';
import type { Attempt, AttemptState } from '../../../domain/types/attempt.js';
import type { ArchiveState } from '../../../domain/types/archive.js';
import {
  ALL_GATE_IDS,
  canAcceptInsight,
  gateSatisfied,
  gateUnsatisfied,
} from '../../../domain/types/gates.js';
import type { GateCheckResult, GateId } from '../../../domain/types/gates.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';
import { makeHarness, parsePayload } from './capture-test-harness.js';

/** A pure fixture for the gate functions - no persistence involved. */
function attemptFixture(state: AttemptState, archive_state: ArchiveState): Attempt {
  return {
    ...createDraftAttempt({
      attempt_id: 'ATT_00000000000000000000000001' as ObjectId<'ATT'>,
      raw_text: '把热风温度调到 70 度后表面开裂',
      created_at: '2026-09-25T00:00:00.000Z',
    }),
    state,
    archive_state,
  };
}

describe('S01-05｜E1 – E5 reuse (no gate is renamed, none is redefined)', () => {
  it('AC-26｜E1–E5: the citation index covers exactly the frozen five gates', () => {
    assert.deepEqual([...ALL_GATE_IDS], ['E1', 'E2', 'E3', 'E4', 'E5']);
    assert.deepEqual(Object.keys(GATE_DEFINITION_REFERENCES).sort(), ['E1', 'E2', 'E3', 'E4', 'E5']);
    assert.deepEqual([...STEP_1_TO_5_GATE_IDS], ['E1', 'E5']);

    for (const gate_id of ALL_GATE_IDS) {
      const reference = GATE_DEFINITION_REFERENCES[gate_id];
      assert.equal(reference.gate_id, gate_id);
      assert.ok(reference.canonical_meaning.startsWith(`${gate_id}｜`));
      assert.ok(reference.cited_sources.length > 0);
      if (reference.evaluated_at_steps_1_to_5) {
        assert.equal(reference.not_evaluated_reason, null);
      } else {
        assert.ok(
          (reference.not_evaluated_reason ?? '').length > 0,
          `${gate_id} must say why it is not evaluated here`,
        );
      }
    }
    /* `E1` / `E4` are the machine-verifiable structural checks; `E2` / `E3` are content judgements. */
    assert.equal(GATE_DEFINITION_REFERENCES.E1.machine_checkable, true);
    assert.equal(GATE_DEFINITION_REFERENCES.E4.machine_checkable, true);
    assert.equal(GATE_DEFINITION_REFERENCES.E2.machine_checkable, false);
    assert.equal(GATE_DEFINITION_REFERENCES.E3.machine_checkable, false);
    assert.equal(GATE_DEFINITION_REFERENCES.E5.machine_checkable, true);
  });

  it('AC-26｜E1 table: only an active Formal Attempt can serve as a NEW Insight source', () => {
    const rows: readonly {
      readonly label: string;
      readonly state: AttemptState;
      readonly archive_state: ArchiveState;
      readonly satisfied: boolean;
    }[] = [
      { label: 'Draft / active', state: 'Draft', archive_state: 'active', satisfied: false },
      { label: 'Formal / active', state: 'Formal', archive_state: 'active', satisfied: true },
      { label: 'Formal / archived', state: 'Formal', archive_state: 'archived', satisfied: false },
    ];

    for (const row of rows) {
      const result = evaluateGateE1SourceEligibility(attemptFixture(row.state, row.archive_state));
      assert.equal(result.gate_id, 'E1');
      assert.equal(result.satisfied, row.satisfied, row.label);
      if (row.satisfied) {
        assert.deepEqual(result.missing_items, []);
        continue;
      }
      assert.equal(result.missing_items.length, 1, row.label);
      const item = result.missing_items[0];
      assert.ok((item?.description ?? '').length > 0);
      assert.ok((item?.why_important ?? '').length > 0);
      assert.equal(item?.how_to_supplement?.source_type, 'Inference');
      assert.equal(item?.how_to_supplement?.confirmation_class, 'display');
    }
  });

  it('AC-26｜E5 table: only an explicit user acceptance satisfies E5, and no AI suggestion substitutes for it', () => {
    const explicit = evaluateGateE5UserExplicitAcceptance(true);
    assert.equal(explicit.gate_id, 'E5');
    assert.equal(explicit.satisfied, true);
    assert.deepEqual(explicit.missing_items, []);

    const missing = evaluateGateE5UserExplicitAcceptance(false);
    assert.equal(missing.gate_id, 'E5');
    assert.equal(missing.satisfied, false);
    assert.equal(missing.missing_items.length, 1);
    /* 🔴 D-038 “如何补充” is an AI suggestion; offering one here would be a route around E5. */
    assert.equal(missing.missing_items[0]?.how_to_supplement, null);
  });

  it('AC-26｜the aggregate report reuses the existing gate helpers instead of forking them', () => {
    const draft = attemptFixture('Draft', 'active');
    const pending = evaluateCaptureGates(draft, { user_explicitly_accepted: false });
    assert.equal(pending.all_satisfied, false);
    assert.deepEqual([...pending.unsatisfied_gate_ids], ['E1', 'E5']);
    assert.deepEqual(
      pending.results.map((result) => result.gate_id),
      ['E1', 'E5'],
    );

    const formal = attemptFixture('Formal', 'active');
    const accepted = evaluateCaptureGates(formal, { user_explicitly_accepted: true });
    assert.equal(accepted.all_satisfied, true);
    assert.deepEqual([...accepted.unsatisfied_gate_ids], []);

    /* The domain's own eligibility helper is unchanged and still the authority. */
    const all_four: readonly GateCheckResult[] = ['E1', 'E2', 'E3', 'E4'].map((gate_id) =>
      gateSatisfied(gate_id as GateId),
    );
    assert.equal(canAcceptInsight(all_four), true);
    assert.equal(
      canAcceptInsight([
        ...all_four.filter((result) => result.gate_id !== 'E3'),
        gateUnsatisfied('E3', [
          { description: '结论含混', why_important: '无法说明这条经验说的是什么', how_to_supplement: null },
        ]),
      ]),
      false,
    );
  });

  it('AC-29｜the four capture thresholds are stated separately and none replaces another', () => {
    assert.deepEqual(Object.keys(CAPTURE_THRESHOLDS).sort(), [
      'experience_promotion',
      'formal_save',
      'object_creatable',
      'runtime_continuable',
    ]);
    assert.ok(CAPTURE_THRESHOLDS.experience_promotion.includes('E1–E5'));
    assert.ok(CAPTURE_THRESHOLDS.formal_save.includes('实际结果'));
    assert.ok(CAPTURE_THRESHOLDS.object_creatable.includes('非空'));
  });
});

describe('S01-05｜Draft / Formal save boundary', () => {
  it('AC-02｜a Draft without the Formal prerequisites is refused and left untouched', async () => {
    const harness = makeHarness({ kind: 'structured', value: parsePayload() });
    const started = await harness.service.beginCapture({ operation_id: 'f1', raw_text: '原始输入' });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    const saved = await harness.service.saveFormalAttempt({
      operation_id: 'f1-save',
      attempt_id: attempt.attempt_id,
      user_explicitly_confirmed: true,
    });
    assert.equal(saved.formalization.decision.outcome, 'draft_retained');
    assert.deepEqual([...saved.formalization.decision.block_reasons], ['FORMAL_GATE_UNSATISFIED']);
    assert.equal(saved.attempt?.state, 'Draft');

    const stored = await harness.repository.readAttempt(attempt.attempt_id);
    assert.equal(stored?.state, 'Draft');
    assert.equal(stored?.goal.presence_state, 'unknown');
    assert.equal(stored?.updated_at, attempt.updated_at, 'a denial must cost nothing');
  });

  it('AC-03｜once the four prerequisites exist the explicit user confirmation promotes the record', async () => {
    const harness = makeHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started = await harness.service.beginCapture({ operation_id: 'f2', raw_text: '原始输入' });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    await harness.service.applyStructuredConfirmation({
      operation_id: 'f2-confirm',
      attempt_id: attempt.attempt_id,
      result_status: { decision: 'accepted', value: '未达到预期' },
      user_confirmed: true,
    });

    const saved = await harness.service.saveFormalAttempt({
      operation_id: 'f2-save',
      attempt_id: attempt.attempt_id,
      user_explicitly_confirmed: true,
    });
    assert.equal(saved.formalization.decision.outcome, 'ready');
    assert.equal(saved.attempt?.state, 'Formal');
    assert.deepEqual(saved.formalization.promotion_patch, { state: 'Formal' });
    assert.equal(saved.formalization.formal_gate.result_status_confirmed, true);

    /* The gate was evaluated on the record AS READ - still a Draft at that instant. */
    assert.equal(saved.formalization.gate_report.results[0]?.satisfied, false);
    assert.deepEqual([...saved.formalization.gate_report.unsatisfied_gate_ids], ['E1']);

    /* After the save the record really IS an active Formal, so E1 now holds. */
    const stored = saved.attempt;
    assert.ok(stored !== null);
    if (stored === null) {
      return;
    }
    assert.equal(evaluateGateE1SourceEligibility(stored).satisfied, true);
  });

  it('AC-79｜replaying the same operation never duplicates a record or a write', async () => {
    const harness = makeHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const first = await harness.service.beginCapture({ operation_id: 'f3', raw_text: '原始输入' });
    const replay = await harness.service.beginCapture({ operation_id: 'f3', raw_text: '原始输入' });
    assert.equal(replay.idempotent_replay, true);
    assert.equal(replay.attempt?.attempt_id, first.attempt?.attempt_id);
    assert.equal((await harness.repository.listAttempts()).length, 1);

    const attempt = first.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    await harness.service.applyStructuredConfirmation({
      operation_id: 'f3-confirm',
      attempt_id: attempt.attempt_id,
      result_status: { decision: 'accepted', value: '未达到预期' },
      user_confirmed: true,
    });
    const saved = await harness.service.saveFormalAttempt({
      operation_id: 'f3-save',
      attempt_id: attempt.attempt_id,
      user_explicitly_confirmed: true,
    });
    const saved_again = await harness.service.saveFormalAttempt({
      operation_id: 'f3-save',
      attempt_id: attempt.attempt_id,
      user_explicitly_confirmed: true,
    });
    assert.equal(saved_again.idempotent_replay, true);
    assert.equal(saved_again.attempt?.attempt_id, saved.attempt?.attempt_id);
    assert.equal(saved_again.attempt?.updated_at, saved.attempt?.updated_at);
    assert.equal((await harness.repository.listAttempts()).length, 1);
  });
});
