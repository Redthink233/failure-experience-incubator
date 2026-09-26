/**
 * S01 ｜ `M8` evidence suite (task §38 `V1`-`V6`, §7, contract §3.3 / §5 / §6).
 *
 * 🔴 `M7` is the ONLY evidence validator and the ONLY `EvidenceRef` constructor. `M8` hands over
 *    selections and persists what comes back; it never mints a reference and never recounts.
 * 🔴 `N_引用` and the ⑩ trace list are DERIVED from the SAME stored set, by `M7`'s single
 *    derivation pair - there is no second counting helper anywhere in `M8`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  expectGenerated,
  expectRefused,
  generationAnswer,
  ID_RELATED,
  ID_RELATED_SECOND,
  ID_SOURCE,
  ID_UNRELATED_SECOND,
  insightAnswer,
  levelAPath,
  seedStandardFixture,
  selection,
} from './harness.js';
import { deriveCitationView } from '../../../retrieval/grounding/citation.js';

describe('S01 M8 evidence', () => {
  it('IMPLEMENTATION INVARIANT / V1 / V3: an invalid M7 selection refuses the whole generation and persists nothing', async () => {
    const bogus = [
      /* A real Attempt that is NOT in the consumed derivation (re-introduction is forbidden). */
      selection(ID_UNRELATED_SECOND, levelAPath(ID_UNRELATED_SECOND, 'goal'), 'support'),
      /* A fabricated landing point inside a related record. */
      selection(ID_RELATED, 'goal#does-not-exist', 'support'),
      /* A malformed `source_field_path`. */
      selection(ID_RELATED, 'no-separator-at-all', 'support'),
      /* A fabricated target record. */
      selection('ATT_0000000000000000000000000Z', levelAPath(ID_RELATED, 'goal'), 'support'),
      /* A non-Attempt id can never be a reference target. */
      selection('INS_00000000000000000000000001', levelAPath(ID_RELATED, 'goal'), 'support'),
      /* The control: `grounding` on a `Fact` IS legal - so the reader is not vacuous. */
      selection(ID_RELATED, levelAPath(ID_RELATED, 'condition'), 'grounding'),
    ];

    for (const [index, bad] of bogus.entries()) {
      const selections =
        index === bogus.length - 1
          ? [bad]
          : [selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'support'), bad];
      const { harness } = await seedStandardFixture({
        generation: generationAnswer([insightAnswer({ evidence_selections: selections })]),
      });
      const outcome = await harness.service.generateCandidateInsights({
        operation_id: 'op-evidence',
        source_attempt_id: ID_SOURCE as never,
      });
      if (index === bogus.length - 1) {
        /* The control: `grounding` on a Fact is accepted. */
        assert.equal(outcome.kind, 'generated');
        continue;
      }
      const refused = expectRefused(outcome);
      assert.equal(refused.code, 'EVIDENCE_SELECTION_REFUSED');
      assert.ok(refused.rejections.length > 0);
      assert.deepEqual(harness.insightFiles(), [], 'nothing may be persisted after a refusal');
      assert.deepEqual(harness.batchFiles(), []);
    }
  });

  it('IMPLEMENTATION INVARIANT / V2: every reference is owned by the Insight that proposed it', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer(),
        insightAnswer({
          proposition: '在当前条件下，S2 方案的目标与本次一致，但结果方向不同。',
          evidence_selections: [selection(ID_RELATED_SECOND, levelAPath(ID_RELATED_SECOND, 'goal'), 'support')],
        }),
      ]),
    });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-owners',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const [first, second] = outcome.insights;
    assert.ok(first !== undefined && second !== undefined);
    for (const insight of outcome.insights) {
      assert.ok(insight.evidence_refs.length > 0);
      for (const ref of insight.evidence_refs) {
        assert.equal(ref.owner_id, insight.insight_id);
      }
    }
    assert.notEqual(first.insight_id, second.insight_id);
    assert.notEqual(
      first.evidence_refs[0]?.evidence_ref_id,
      second.evidence_refs[0]?.evidence_ref_id,
    );
  });

  it('IMPLEMENTATION INVARIANT / V4: references are persisted INLINE with their owner and no evidence store exists', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-inline',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);
    const raw = harness.rawInsightFile(insight.insight_id);
    assert.ok(typeof raw === 'string');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const refs = parsed['evidence_refs'];
    assert.ok(Array.isArray(refs));
    assert.equal((refs as readonly unknown[]).length, insight.evidence_refs.length);

    /* 🔴 No global evidence DB / second file: the ONLY workspace paths are insights + events. */
    const paths = Object.keys(harness.storage.snapshot());
    assert.ok(paths.length > 0);
    for (const path of paths) {
      assert.equal(/evidence|eref|reference/i.test(path), false, `${path} must not exist`);
    }
  });

  it('AC-84 / IMPLEMENTATION INVARIANT / V5: `N_引用` equals M7\'s single derivation over the SAME stored set', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          evidence_selections: [
            selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'support'),
            /* A second reference to the SAME record - it must still count once. */
            selection(ID_RELATED, levelAPath(ID_RELATED, 'condition'), 'context'),
          ],
        }),
      ]),
    });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-count',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);
    assert.equal(insight.evidence_refs.length, 2);

    const view = await harness.service.readInsight(insight.insight_id);
    assert.ok(view !== null);
    const reference = deriveCitationView(insight.insight_id, insight.evidence_refs);
    assert.equal(view.citation.n_citation, reference.n_citation);
    assert.equal(view.citation.n_citation, 1, 'one record referenced twice counts once');
    assert.equal(view.citation.counted_ref_ids.length, 1);
    assert.equal(view.citation.context_only_ref_ids.length, 1);
  });

  it('IMPLEMENTATION INVARIANT / V6: a pure `context` reference is displayable but never counted', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          evidence_selections: [selection(ID_RELATED, levelAPath(ID_RELATED, 'condition'), 'context')],
        }),
      ]),
    });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-context',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);
    const view = await harness.service.readInsight(insight.insight_id);
    assert.ok(view !== null);
    assert.equal(view.citation.n_citation, 0);
    assert.equal(view.citation.context_only_ref_ids.length, 1);
    /* It is still traceable and still represented in the ⑩ list. */
    assert.equal(view.traceability.length, 1);
    assert.equal(view.traceability[0]?.role, 'context');
    assert.equal(view.traceability[0]?.counted_toward_n_citation, false);
    assert.equal(view.traceability[0]?.resolvable, true);
  });

  it('AC-84 / IMPLEMENTATION INVARIANT（§3.3）: the ⑩ list and `N_引用` come from one set, so they can never disagree', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          evidence_selections: [
            selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'support'),
            selection(ID_RELATED_SECOND, levelAPath(ID_RELATED_SECOND, 'goal'), 'support'),
            selection(ID_RELATED_SECOND, levelAPath(ID_RELATED_SECOND, 'condition'), 'context'),
          ],
        }),
      ]),
    });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-trace',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);
    const view = await harness.service.readInsight(insight.insight_id);
    assert.ok(view !== null);
    assert.equal(view.citation.n_citation, 2);
    assert.equal(view.traceability.length, insight.evidence_refs.length);
  });
});
