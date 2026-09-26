/**
 * S01 ｜ `M8` `E1`-`E5` suite (task §34, §12-§16).
 *
 * 🔴 `E1` / `E4` are STRUCTURAL and machine-derived; `E2` / `E3` are DISCRETE AI judgements with a
 *    reason and no score; `E5` is the user's explicit accept action. Every answer here is
 *    `NOT_A_REAL_LLM_OUTPUT`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  at,
  expectApplied,
  expectGenerated,
  expectRejected,
  generationAnswer,
  ID_DRAFT,
  ID_RELATED,
  ID_SOURCE,
  insightAnswer,
  missingItem,
  seedStandardFixture,
} from './harness.js';
import { newRetrievalDerivationId } from '../../../retrieval/compare/derivation-id.js';
import { factItem } from '../../../domain/types/source-type.js';
import { provided } from '../../../domain/types/presence.js';
import type { GateCheckResult } from '../../../domain/types/gates.js';
import type { Insight } from '../../../domain/types/insight.js';
import type { InsightHarness } from './harness.js';

function gateOf(checks: readonly GateCheckResult[], gate_id: string): GateCheckResult {
  const found = checks.find((check) => check.gate_id === gate_id);
  if (found === undefined) {
    throw new Error(`gate ${gate_id} is missing from the presentation`);
  }
  return found;
}

/** Generates the standard fixture's insights and returns the first one. */
async function generate(
  harness: InsightHarness,
  operation_id = 'op-e',
): Promise<{ readonly batch_id: string; readonly insights: readonly Insight[] }> {
  const outcome = expectGenerated(
    await harness.service.generateCandidateInsights({
      operation_id,
      source_attempt_id: ID_SOURCE as never,
    }),
  );
  return { batch_id: outcome.batch.batch_id, insights: outcome.insights };
}

describe('S01 M8 E1-E5', () => {
  it('E1-A / AC-26: a Formal source satisfies E1', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insights } = await generate(harness);
    assert.equal(gateOf(insights[0]?.gate_checks ?? [], 'E1').satisfied, true);
  });

  it('E1-B / AC-26: a Draft source fails E1', async () => {
    const { harness, derivation } = await seedStandardFixture({
      generation: generationAnswer([insightAnswer()]),
    });
    /*
     * Seed the Draft source's own current derivation. Step ⑥ never runs for a Draft (contract
     * §2.1), so the fixture writes one directly - which is exactly the state E1 must refuse.
     */
    await harness.derivations.replaceCurrent(at(ID_DRAFT), {
      ...derivation,
      derivation_id: newRetrievalDerivationId(ID_DRAFT),
      source_attempt_id: at(ID_DRAFT),
    });

    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-draft',
        source_attempt_id: ID_DRAFT as never,
      }),
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);
    const e1 = gateOf(insight.gate_checks, 'E1');
    assert.equal(e1.satisfied, false);
    assert.ok((e1.missing_items[0]?.description ?? '').includes('Draft'));
    /* 🔴 The Insight is still stored as a candidate - a failing gate never discards it (D-038). */
    assert.equal(insight.state, 'candidate');
  });

  it('E2-A / AC-26: a clear proposition satisfies E2', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insights } = await generate(harness);
    assert.equal(gateOf(insights[0]?.gate_checks ?? [], 'E2').satisfied, true);
  });

  it('E2-B / AC-26 / AC-99: a vague proposition fails E2 and carries a discrete reason', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          proposition: '感觉这个方法可能有点问题。',
          e2_check: 'fail',
          e2_reason: '表述属于「感觉可能有问题」这类含混表达，不构成明确命题。',
          missing_items: [
            missingItem(
              '命题仍然含混',
              '含混的结论无法被复用，也无法被验证。',
              '把「可能有点问题」改写为可观察到的结果描述。',
            ),
          ],
        }),
      ]),
    });
    const { insights } = await generate(harness);
    const insight = insights[0];
    assert.ok(insight !== undefined);
    const e2 = gateOf(insight.gate_checks, 'E2');
    assert.equal(e2.satisfied, false);
    assert.ok((e2.missing_items[0]?.description ?? '').includes('含混'));
    assert.equal(insight.state, 'candidate');
  });

  it('E3-A / AC-26: an explicit scope satisfies E3', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insights } = await generate(harness);
    assert.equal(gateOf(insights[0]?.gate_checks ?? [], 'E3').satisfied, true);
  });

  it('E3-B / AC-26 / AC-99: a missing scope fails E3 and never guesses the conditions', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          scope: '（未说明条件）',
          e3_check: 'fail',
          e3_reason: '关键条件完全缺失，无法说明该经验是在哪些条件下观察到的。',
          missing_items: [
            missingItem(
              '适用条件缺失',
              '适用范围不明确时，该经验无法被安全复用。',
              '补充这次尝试的温度、时长与设备条件。',
            ),
          ],
        }),
      ]),
    });
    const { insights } = await generate(harness);
    const insight = insights[0];
    assert.ok(insight !== undefined);
    assert.equal(gateOf(insight.gate_checks, 'E3').satisfied, false);
    assert.equal(insight.state, 'candidate');
  });

  it('E4-A / AC-26: M7-validated references satisfy E4 and are owned by the Insight', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insights } = await generate(harness);
    const insight = insights[0];
    assert.ok(insight !== undefined);
    assert.equal(gateOf(insight.gate_checks, 'E4').satisfied, true);
    assert.equal(insight.evidence_refs.length, 1);
    assert.equal(insight.evidence_refs[0]?.owner_id, insight.insight_id);
  });

  it('E4-B / AC-26: an unresolvable reference fails E4, and an empty reference set does too', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer(),
        insightAnswer({
          proposition: '在当前条件下，S2 方案与历史记录的目标一致，但结果方向不同。',
          evidence_selections: [],
        }),
      ]),
    });
    const { insights } = await generate(harness);
    const with_ref = insights[0];
    const without_ref = insights[1];
    assert.ok(with_ref !== undefined && without_ref !== undefined);
    assert.equal(gateOf(without_ref.gate_checks, 'E4').satisfied, false);

    const stored_with_ref = await harness.insights.readById(with_ref.insight_id);
    assert.ok(stored_with_ref !== null);
    assert.ok(stored_with_ref.comparison_ref !== null, 'a used comparison is recorded (E4 ③)');
    const stored_without_ref = await harness.insights.readById(without_ref.insight_id);
    assert.equal(stored_without_ref?.comparison_ref, null);

    /*
     * Now break the landing point: the referenced content item is replaced by a NEW content item,
     * so the stored `source_field_path` no longer resolves inside the target.
     */
    await harness.attempts.updateAttempt(at(ID_RELATED), {
      goal: provided(factItem(`${ID_RELATED}:goal-replaced`, 'G')),
    });
    const rechecked = await harness.service.recheckInsightGates({
      operation_id: 'op-recheck-e4',
      insight_id: with_ref.insight_id,
    });
    assert.equal(rechecked.kind, 'rechecked');
    if (rechecked.kind !== 'rechecked') {
      throw new Error('unreachable');
    }
    assert.equal(gateOf(rechecked.gate_checks, 'E4').satisfied, false);
    assert.equal(gateOf(rechecked.gate_checks, 'E1').satisfied, true);
  });

  it('E5-A / AC-26: a freshly generated Insight is never `accepted`, and no accept happens without the flag', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insights } = await generate(harness);
    const insight = insights[0];
    assert.ok(insight !== undefined);
    assert.equal(insight.state, 'candidate');
    assert.equal(
      insight.gate_checks.some((check) => check.gate_id === 'E5'),
      false,
      'E5 is an action, not a check result - the presentation describes E1-E4',
    );

    const refused = expectRejected(
      await harness.service.acceptInsight({
        operation_id: 'op-e5a',
        insight_id: insight.insight_id,
        user_explicitly_accepted: false,
      }),
    );
    assert.equal(refused.code, 'INVALID_COMMAND');
    const still = await harness.service.readInsight(insight.insight_id);
    assert.equal(still?.insight.state, 'candidate');
  });

  it('E5-B / IMPLEMENTATION INVARIANT（D-039 / E5）: an explicit user accept with E1-E4 satisfied reaches `accepted`', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insights } = await generate(harness);
    const insight = insights[0];
    assert.ok(insight !== undefined);
    const applied = expectApplied(
      await harness.service.acceptInsight({
        operation_id: 'op-e5b',
        insight_id: insight.insight_id,
        user_explicitly_accepted: true,
      }),
    );
    assert.equal(applied.insight.state, 'accepted');
    assert.equal(applied.view.is_experience_asset, true);
    assert.equal(applied.event?.trigger, 'user_accept');
  });

  it('E5-C / AC-26: an accept is refused when any of E1-E4 is unsatisfied', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([insightAnswer({ evidence_selections: [] })]),
    });
    const { insights } = await generate(harness);
    const insight = insights[0];
    assert.ok(insight !== undefined);
    assert.equal(gateOf(insight.gate_checks, 'E4').satisfied, false);

    const refused = expectRejected(
      await harness.service.acceptInsight({
        operation_id: 'op-e5c',
        insight_id: insight.insight_id,
        user_explicitly_accepted: true,
      }),
    );
    assert.equal(refused.code, 'GATES_NOT_SATISFIED');
    assert.equal(gateOf(refused.gate_checks, 'E4').satisfied, false);
    const stored = await harness.service.readInsight(insight.insight_id);
    assert.equal(stored?.insight.state, 'candidate', 'a refused accept leaves the record untouched');
    assert.equal(harness.eventLog().includes('user_accept'), false);
  });

  it('AC-63 / D-039: the user can NEVER edit an E1-E4 verdict; the only remedy is a content edit', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          e3_check: 'fail',
          e3_reason: '关键条件仍然缺失。',
          missing_items: [missingItem('条件缺失', '缺少条件就无法复用。', '补上温度与时长。')],
        }),
      ]),
    });
    const { insights } = await generate(harness);
    const insight = insights[0];
    assert.ok(insight !== undefined);
    assert.equal(gateOf(insight.gate_checks, 'E3').satisfied, false);

    const refused = expectRejected(
      await harness.service.acceptInsight({
        operation_id: 'op-e3-block',
        insight_id: insight.insight_id,
        user_explicitly_accepted: true,
      }),
    );
    assert.equal(refused.code, 'GATES_NOT_SATISFIED');
    assert.equal((await harness.service.readInsight(insight.insight_id))?.insight.state, 'candidate');

    /* The remedy is a CONTENT edit followed by a fresh check - never an override action. */
    const applied = expectApplied(
      await harness.service.editInsightContent({
        operation_id: 'op-e3-fix',
        insight_id: insight.insight_id,
        applicable_scope: '条件为 C1、方案为 S1；温度 50 摄氏度、时长 30 分钟。',
      }),
    );
    assert.equal(gateOf(applied.insight.gate_checks, 'E3').satisfied, true);
    assert.equal(gateOf(applied.insight.gate_checks, 'E1').satisfied, true);
    assert.equal(applied.insight.state, 'candidate', 'a content edit always falls back to candidate');
  });
});
