/**
 * S01 ｜ `M8` state-event trace suite (task §37, §25, contract §11.3 / `D-040` / AC-65).
 *
 * 🔴 The trigger union is CLOSED (`user_accept` / `user_revoke` / `content_edit` / `re_accept`).
 *    Creating a candidate, a non-semantic edit and a `candidate -> rejected` transition therefore
 *    write NO event: no second event vocabulary is opened (`§25`).
 * 🔴 The trace is product-layer behaviour record-keeping - it is NOT a value score, a quality
 *    ranking or an edit counter (`D-040`).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  expectApplied,
  expectGenerated,
  generationAnswer,
  ID_SOURCE,
  insightAnswer,
  seedStandardFixture,
} from './harness.js';
import { isInsightStateEventId } from '../../../application/insight/identity.js';
import { INSIGHT_STATE_EVENT_TRIGGERS } from '../../../domain/types/insight.js';

describe('S01 M8 Insight state events', () => {
  it('AC-65 / AC-28 / §25: creating a candidate writes NO transition event', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    await harness.service.generateCandidateInsights({
      operation_id: 'op-gen',
      source_attempt_id: ID_SOURCE as never,
    });
    assert.equal(harness.eventLog(), '');
  });

  it('AC-65 / §37: user accept writes one `user_accept` event with every mandatory field', async () => {
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
      await harness.service.acceptInsight({
        operation_id: 'op-accept',
        insight_id: insight.insight_id,
        user_explicitly_accepted: true,
      }),
    );
    const event = applied.event;
    assert.ok(event !== null);
    assert.equal(isInsightStateEventId(event.event_id), true);
    assert.equal(event.insight_id, insight.insight_id);
    assert.equal(event.from_state, 'candidate');
    assert.equal(event.to_state, 'accepted');
    assert.equal(event.trigger, 'user_accept');
    assert.ok(!Number.isNaN(Date.parse(event.occurred_at)));
    assert.deepEqual(Object.keys(event).sort(), [
      'event_id',
      'from_state',
      'insight_id',
      'occurred_at',
      'to_state',
      'trigger',
    ]);
    /* 🔴 Persisted, and canonical on disk. */
    const lines = harness.eventLog().trim().split('\n');
    assert.equal(lines.length, 1);
    const parsed = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
    assert.equal(parsed['trigger'], 'user_accept');
    assert.ok(INSIGHT_STATE_EVENT_TRIGGERS.includes(parsed['trigger'] as never));
  });

  it('AC-65 / §37: user revoke and content modification each write their own event', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const generated = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-gen',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = generated.insights[0];
    assert.ok(insight !== undefined);
    await harness.service.acceptInsight({
      operation_id: 'op-accept',
      insight_id: insight.insight_id,
      user_explicitly_accepted: true,
    });
    await harness.service.revokeAcceptance({ operation_id: 'op-revoke', insight_id: insight.insight_id });
    await harness.service.editInsightContent({
      operation_id: 'op-edit',
      insight_id: insight.insight_id,
      proposition: '在当前条件下，S1 方案的颜色变化仍高于目标范围。',
    });

    const events = await harness.service.listStateEvents(insight.insight_id);
    assert.deepEqual(
      events.map((event) => event.trigger),
      ['user_accept', 'user_revoke', 'content_edit'],
    );
    assert.deepEqual(
      events.map((event) => `${event.from_state}->${event.to_state}`),
      ['candidate->accepted', 'accepted->candidate', 'candidate->candidate'],
    );
  });

  it('AC-65 / §37: a RE-accept is recorded as `re_accept`, not as a second `user_accept`', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const generated = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-gen',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = generated.insights[0];
    assert.ok(insight !== undefined);
    await harness.service.acceptInsight({
      operation_id: 'op-accept-1',
      insight_id: insight.insight_id,
      user_explicitly_accepted: true,
    });
    await harness.service.revokeAcceptance({ operation_id: 'op-revoke', insight_id: insight.insight_id });
    await harness.service.acceptInsight({
      operation_id: 'op-accept-2',
      insight_id: insight.insight_id,
      user_explicitly_accepted: true,
    });

    const events = await harness.service.listStateEvents(insight.insight_id);
    assert.deepEqual(
      events.map((event) => event.trigger),
      ['user_accept', 'user_revoke', 're_accept'],
    );
    /* 🔴 Stable, unique event ids - never a position. */
    assert.equal(new Set(events.map((event) => event.event_id)).size, events.length);
    for (const event of events) {
      assert.equal(isInsightStateEventId(event.event_id), true);
    }
  });

  it('AC-65 / §25: a rejection writes NO event - the state pair itself is the record', async () => {
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
      await harness.service.rejectInsight({ operation_id: 'op-reject', insight_id: insight.insight_id }),
    );
    assert.equal(applied.insight.state, 'rejected');
    assert.equal(applied.event, null);
    assert.equal(harness.eventLog(), '');
    /* 🔴 No non-canonical trigger value was invented for it. */
    assert.equal(
      (INSIGHT_STATE_EVENT_TRIGGERS as readonly string[]).includes('user_reject'),
      false,
    );
  });

  it('§23 / AC-65: a metadata edit writes no event, and the trace is never a score', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const generated = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-gen',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = generated.insights[0];
    assert.ok(insight !== undefined);
    const before = harness.eventLog();
    const applied = expectApplied(
      await harness.service.editInsightMeta({
        operation_id: 'op-meta',
        insight_id: insight.insight_id,
        title: '显示用标题',
      }),
    );
    assert.equal(applied.event, null);
    assert.equal(harness.eventLog(), before);

    /* 🔴 No numeric field may be added to an event, and no count may be derived from the trace. */
    const raw = harness.rawInsightFile(insight.insight_id);
    assert.ok(typeof raw === 'string');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    assert.equal('version' in parsed, false);
    assert.equal('edit_count' in parsed, false);
    assert.equal('revision' in parsed, false);
    assert.equal('history' in parsed, false);
  });
});
