/**
 * S01 ｜ `M8` single-record boundary suite (task §39 `N1`-`N3`, §10, `D-021 E4` / `D-007`).
 *
 * 🔴 With ONE recorded observation, a local experience under the recorded conditions is legitimate;
 *    a general rule is not. The boundary is enforced BOTH by the prompt and by a deterministic,
 *    enumerable structural guard, because the task explicitly forbids relying on prompt wording.
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
  insightAnswer,
  levelAPath,
  missingItem,
  seedStandardFixture,
  selection,
} from './harness.js';
import {
  findGeneralizingMarker,
  hasLocalBoundQualifier,
  singleSourceGeneralizationGuard,
} from '../../../application/insight/generalization.js';

const TWO_TARGETS = [
  selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'support'),
  selection(ID_RELATED_SECOND, levelAPath(ID_RELATED_SECOND, 'goal'), 'support'),
];

const ONE_TARGET = [selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'support')];

describe('S01 M8 N=1 boundary', () => {
  it('N1 / AC-24: a single historical record may form a locally scoped Insight', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          proposition: '在当前条件下，把热风温度降到 50 摄氏度并延长干燥时间，颜色变化仍高于目标范围。',
          scope: '条件为 C1、方案为 S1 的这一次尝试。',
          evidence_selections: ONE_TARGET,
        }),
      ]),
    });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-n1',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.equal(outcome.insights.length, 1);
    assert.equal(outcome.insights[0]?.state, 'candidate');
  });

  it('N2 / AC-25: single-record GENERAL claims are refused', async () => {
    for (const proposition of [
      '该方法无效。',
      '这种方案通常失败。',
      '调整热风参数一定导致颜色变化。',
      '普遍情况下这类做法都不会成功。',
    ]) {
      const { harness } = await seedStandardFixture({
        generation: generationAnswer([insightAnswer({ proposition, evidence_selections: ONE_TARGET })]),
      });
      const refused = expectRefused(
        await harness.service.generateCandidateInsights({
          operation_id: 'op-n2',
          source_attempt_id: ID_SOURCE as never,
        }),
      );
      assert.equal(refused.code, 'AI_PROPOSAL_REJECTED');
      assert.ok(
        refused.issues.some((issue) => issue.code === 'GENERALIZED_CLAIM_FROM_SINGLE_SOURCE'),
        `"${proposition}" must be refused as a general claim from a single record`,
      );
      assert.deepEqual(harness.insightFiles(), []);
      assert.ok(missingItem('x', 'y', 'z') !== null);
    }
  });

  it('AC-24 / N2: the guard is about the SINGLE-record case - a multi-record base is not blocked by it', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({ proposition: '该方法无效。', evidence_selections: TWO_TARGETS }),
      ]),
    });
    const outcome = await harness.service.generateCandidateInsights({
      operation_id: 'op-n2b',
      source_attempt_id: ID_SOURCE as never,
    });
    /*
     * The generalization guard derives from a single observation, so it does not fire here; the
     * content-quality decision belongs to E2 / E3 (`D-021 E4`).
     */
    assert.equal(outcome.kind, 'generated');
  });

  it('AC-25 / N3: prompt wording cannot bypass the limit - a local `scope` label does not excuse a general claim', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          proposition: '在当前条件下，该方法无效。',
          scope: '在当前条件下、本记录范围内。',
          evidence_selections: ONE_TARGET,
        }),
      ]),
    });
    const outcome = await harness.service.generateCandidateInsights({
      operation_id: 'op-n3',
      source_attempt_id: ID_SOURCE as never,
    });
    /*
     * The claim is bound to the recorded conditions, so it is admitted - and the refusal for an
     * UNBOUND general claim (below) proves the guard reads the text, not the prompt or the scope.
     */
    assert.equal(outcome.kind, 'generated');

    const unbound = await seedStandardFixture({
      generation: generationAnswer([
        insightAnswer({
          proposition: '该方法无效。',
          /* 🔴 The scope field claims locality; the proposition still states a general rule. */
          scope: '在当前条件下、本记录范围内。',
          evidence_selections: ONE_TARGET,
        }),
      ]),
    });
    const refused = expectRefused(
      await unbound.harness.service.generateCandidateInsights({
        operation_id: 'op-n3b',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    assert.ok(refused.issues.some((issue) => issue.code === 'GENERALIZED_CLAIM_FROM_SINGLE_SOURCE'));
  });

  it('AC-25 / N3: the guard is deterministic and enumerable (unit level)', () => {
    assert.equal(singleSourceGeneralizationGuard({ distinct_evidence_targets: 1, proposition: '在当前条件下，颜色变化仍高于目标范围。' }).allowed, true);
    assert.equal(singleSourceGeneralizationGuard({ distinct_evidence_targets: 1, proposition: '该方法无效。' }).allowed, false);
    assert.equal(singleSourceGeneralizationGuard({ distinct_evidence_targets: 0, proposition: '普遍情况下都会失败。' }).allowed, false);
    assert.equal(singleSourceGeneralizationGuard({ distinct_evidence_targets: 2, proposition: '该方法无效。' }).allowed, true);
    assert.equal(findGeneralizingMarker('这种方案通常失败。'), '通常');
    assert.equal(hasLocalBoundQualifier('在当前条件下，该方法无效。'), true);
    assert.equal(hasLocalBoundQualifier('该方法无效。'), false);
  });
});
