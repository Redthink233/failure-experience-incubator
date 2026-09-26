/**
 * S01 ｜ `M8` `Insight` lifecycle suite (task §36 `L1`-`L10`, §20-§23).
 *
 * 🔴 The frozen migration matrix is the ONLY state machine (`D-039` / `D-040` / `§2.2`). Every
 *    assertion here reads a state that the matrix can actually produce.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  at,
  expectApplied,
  expectGenerated,
  expectRejected,
  generationAnswer,
  ID_RELATED,
  ID_SOURCE,
  insightAnswer,
  missingItem,
  seedStandardFixture,
} from './harness.js';
import type { InsightHarness } from './harness.js';
import { factItem } from '../../../domain/types/source-type.js';
import { provided } from '../../../domain/types/presence.js';
import type { InsightActionOutcome } from '../../../application/insight/types.js';

async function acceptedInsight(harness: InsightHarness) {
  const generated = expectGenerated(
    await harness.service.generateCandidateInsights({
      operation_id: 'op-gen',
      source_attempt_id: ID_SOURCE as never,
    }),
  );
  const insight = generated.insights[0];
  assert.ok(insight !== undefined);
  const applied = expectApplied(
    await harness.service.acceptInsight({
      operation_id: 'op-accept',
      insight_id: insight.insight_id,
      user_explicitly_accepted: true,
    }),
  );
  return { insight: applied.insight, insight_id: insight.insight_id };
}

describe('S01 M8 lifecycle', () => {
  it('L1 / AC-26: candidate -> accepted', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insight } = await acceptedInsight(harness);
    assert.equal(insight.state, 'accepted');
  });

  it('L2 / IMPLEMENTATION INVARIANT（D-015）: candidate -> rejected, without requiring E1-E4', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([insightAnswer({ evidence_selections: [] })]),
    });
    const generated = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-gen',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = generated.insights[0];
    assert.ok(insight !== undefined);
    const applied = expectApplied(
      await harness.service.rejectInsight({ operation_id: 'op-reject', insight_id: insight.insight_id }),
    );
    assert.equal(applied.insight.state, 'rejected');
    assert.equal(applied.view.is_experience_asset, false);
  });

  it('L3 / AC-61: accepted -> candidate via revoke (never rejected, never deleted)', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insight_id } = await acceptedInsight(harness);
    const applied = expectApplied(
      await harness.service.revokeAcceptance({ operation_id: 'op-revoke', insight_id }),
    );
    assert.equal(applied.insight.state, 'candidate');
    assert.equal(applied.event?.trigger, 'user_revoke');
    /* 🔴 Not a delete: the record, its content and its references are all still there. */
    const stored = await harness.insights.readById(insight_id);
    assert.ok(stored !== null);
    assert.equal(stored.insight.evidence_refs.length, 1);
    assert.equal((await harness.service.listExperienceAssets()).length, 0);
  });

  it('L4 / AC-62: an accepted Insight demotes to candidate when its content is modified', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insight_id } = await acceptedInsight(harness);
    const applied = expectApplied(
      await harness.service.editInsightContent({
        operation_id: 'op-edit-content',
        insight_id,
        proposition: '在当前条件下，把温度降到 50 摄氏度后颜色变化仍未降到目标范围。',
      }),
    );
    assert.equal(applied.insight.state, 'candidate');
    assert.equal(applied.event?.trigger, 'content_edit');
    assert.equal((await harness.service.listExperienceAssets()).length, 0);
  });

  it('L5 / AC-64: a rejected Insight returns to candidate when its content is modified', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const generated = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-gen',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = generated.insights[0];
    assert.ok(insight !== undefined);
    await harness.service.rejectInsight({ operation_id: 'op-reject', insight_id: insight.insight_id });
    const applied = expectApplied(
      await harness.service.editInsightContent({
        operation_id: 'op-edit-rejected',
        insight_id: insight.insight_id,
        applicable_scope: '条件为 C1、方案为 S1，温度 50 摄氏度、时长 30 分钟。',
      }),
    );
    assert.equal(applied.insight.state, 'candidate');
  });

  it('L6 / AC-64: a candidate stays candidate when its content is modified', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const generated = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-gen',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = generated.insights[0];
    assert.ok(insight !== undefined);
    const applied = expectApplied(
      await harness.service.editInsightContent({
        operation_id: 'op-edit-candidate',
        insight_id: insight.insight_id,
        proposition: '在当前条件下，S1 方案的颜色变化仍高于目标范围。',
      }),
    );
    assert.equal(applied.insight.state, 'candidate');
  });

  it('L7 / AC-64: a metadata edit changes no state and writes no event', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insight_id } = await acceptedInsight(harness);
    const events_before = harness.eventLog();

    const applied = expectApplied(
      await harness.service.editInsightMeta({
        operation_id: 'op-meta',
        insight_id,
        title: '显示用标题',
        display_order: 2,
      }),
    );
    assert.equal(applied.insight.state, 'accepted', 'a display-only edit never demotes an accepted Insight');
    assert.equal(applied.event, null);
    assert.equal(harness.eventLog(), events_before);
    assert.equal(applied.view.meta.title, '显示用标题');
    assert.equal((await harness.service.listExperienceAssets()).length, 1);
  });

  it('L8 / AC-27: after acceptance the Insight is still an Inference, never a proven fact', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          e3_check: 'fail',
          e3_reason: '关键条件缺失。',
          missing_items: [missingItem('条件缺失', '缺条件无法复用。', '补充温度与时长。')],
        }),
      ]),
    });
    const generated = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-gen',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = generated.insights[0];
    assert.ok(insight !== undefined);
    const applied = expectApplied(
      await harness.service.editInsightContent({
        operation_id: 'op-fix',
        insight_id: insight.insight_id,
        applicable_scope: '条件为 C1、方案为 S1；温度 50 摄氏度、时长 30 分钟。',
      }),
    );
    assert.equal(applied.insight.state, 'candidate');
    const accepted = expectApplied(
      await harness.service.acceptInsight({
        operation_id: 'op-accept-after-fix',
        insight_id: insight.insight_id,
        user_explicitly_accepted: true,
      }),
    );
    assert.equal(accepted.insight.state, 'accepted');

    const raw = harness.rawInsightFile(insight.insight_id);
    assert.ok(typeof raw === 'string');
    /* 🔴 The persisted document never labels the accepted Insight as a Fact. */
    assert.equal(raw.includes('"Fact"'), false);
    assert.equal(raw.includes('"Extraction"'), false);
    /* 🔴 And it carries no "proven / verified" wording. */
    for (const wording of ['已证实', '已验证为事实', '证明了', 'proven']) {
      assert.equal(raw.includes(wording), false);
    }
  });

  it('L9 / AC-74 / AC-75: archiving referenced evidence moves no state', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insight_id } = await acceptedInsight(harness);
    await harness.attempts.updateAttempt(at(ID_RELATED), { archive_state: 'archived' });

    const view = await harness.service.readInsight(insight_id);
    assert.equal(view?.insight.state, 'accepted');
    assert.equal(view?.is_experience_asset, true);
    /* 🔴 The count is not reduced by archiving, and the traceability row says 「来源已归档」. */
    assert.equal(view?.citation.n_citation, 1);
    assert.equal(view?.traceability[0]?.resolvable, true);
    assert.equal((await harness.service.listExperienceAssets()).length, 1);
    const events = await harness.service.listStateEvents(insight_id);
    assert.equal(
      events.some((event) => event.trigger === ('archive' as never)),
      false,
      'archiving referenced evidence never produces a state event (D-043)',
    );
  });

  it('L10 / AC-63: re-accepting re-checks E1-E4 instead of trusting the earlier acceptance', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insight_id } = await acceptedInsight(harness);
    await harness.service.revokeAcceptance({ operation_id: 'op-revoke', insight_id });

    /* Break the reference, then try to re-accept: the fresh check must refuse the migration. */
    await harness.attempts.updateAttempt(at(ID_RELATED), {
      goal: provided(factItem(`${ID_RELATED}:goal-replaced`, 'G')),
    });
    const refused = expectRejected(
      await harness.service.acceptInsight({
        operation_id: 'op-reaccept-blocked',
        insight_id,
        user_explicitly_accepted: true,
      }),
    );
    assert.equal(refused.code, 'GATES_NOT_SATISFIED');
    assert.equal((await harness.service.readInsight(insight_id))?.insight.state, 'candidate');
  });

  it('IMPLEMENTATION INVARIANT（§16）: repeating the same accept operation is idempotent, and a second accept is not canonical', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const { insight_id } = await acceptedInsight(harness);
    const replay = expectApplied(
      await harness.service.acceptInsight({
        operation_id: 'op-accept',
        insight_id,
        user_explicitly_accepted: true,
      }),
    );
    assert.equal(replay.idempotent_replay, true);

    /* A NEW operation on an already-accepted Insight has no canonical transition. */
    const refused = expectRejected(
      await harness.service.acceptInsight({
        operation_id: 'op-accept-again',
        insight_id,
        user_explicitly_accepted: true,
      }),
    );
    assert.equal(refused.code, 'NOT_A_CANONICAL_TRANSITION');
  });

  it('IMPLEMENTATION INVARIANT（§20）: no non-canonical state can be reached', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const generated = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-gen',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = generated.insights[0];
    assert.ok(insight !== undefined);
    /* A rejected Insight cannot be accepted directly (the matrix has no such row). */
    await harness.service.rejectInsight({ operation_id: 'op-reject', insight_id: insight.insight_id });
    const refused: InsightActionOutcome = await harness.service.acceptInsight({
      operation_id: 'op-accept-from-rejected',
      insight_id: insight.insight_id,
      user_explicitly_accepted: true,
    });
    assert.equal(refused.kind, 'rejected');
    assert.equal((await harness.service.readInsight(insight.insight_id))?.insight.state, 'rejected');
  });
});
