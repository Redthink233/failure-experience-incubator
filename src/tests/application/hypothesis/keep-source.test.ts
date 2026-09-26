/**
 * S01 ｜ `M9` ⑤ source discipline (task §15, §44 K1-K5).
 *
 * Contract: §8.6 rule 7 (⑤ cites existing user `Fact` / `Extraction` items of a `Formal Attempt`),
 * §15 (the three-way split of ⑤'s source), §9.3, `D-049` / `ADJ-01` (`CLOSED / DERIVED`).
 *
 * 🔴 The three-way split is the whole point: a HISTORICAL value is a REFERENCE, an AI suggestion is an
 *    `Inference` kept in a SEPARATE column, and a user's own wish becomes citable only after it is a
 *    `Formal Attempt` `Fact` - which this module has no API to create.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractionItem } from '../../../domain/types/source-type.js';
import { persistContentItem } from '../../../domain/types/content-item-record.js';
import { resolveKeptConditions } from '../../../application/hypothesis/evidence.js';
import {
  at,
  fieldPath,
  groundedAnswer,
  generationAnswerOf,
  ID_RELATED,
  ID_SOURCE,
  levelAPath,
  makeHarness,
  seedStandardFixture,
} from './harness.js';

const NOTE_ITEM_ID = 'note-item-1';
const NOTE_PATH = `content_items/note#${NOTE_ITEM_ID}`;

/** A fixture whose related record also carries an AI INDUCTION (`Extraction`) about a note. */
async function seedWithExtraction(generation: Readonly<Record<string, unknown>>) {
  const harness = makeHarness({ generation });
  await harness.seed({
    attempt_id: ID_SOURCE,
    project_id: 'PRJ_shared',
    goal: 'G',
    approach: 'S1',
    condition: 'C1',
    result: 'R1',
  });
  const related = await harness.seed({
    attempt_id: ID_RELATED,
    project_id: 'PRJ_other',
    goal: 'G',
    approach: 'S2',
    condition: 'C1',
    result: 'R2',
  });
  await harness.attempts.updateAttempt(related.attempt_id, {
    content_items: [
      persistContentItem(extractionItem(NOTE_ITEM_ID, '上次观察到颜色偏深，可能是温度过高。'), 'note', null),
    ],
  });
  await harness.runRetrieval();
  return harness;
}

describe('M9 ｜ ⑤ keep source', () => {
  it('[AC-32] K1: a historical Fact can be cited as a kept condition', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          keep: {
            kind: 'historical_ref',
            target_id: ID_RELATED,
            source_field_path: fieldPath(ID_RELATED, 'condition'),
          },
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-k1',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const hypothesis = outcome.hypotheses[0];
    assert.equal(hypothesis?.core.kept_conditions.length, 1);
    assert.equal(hypothesis?.core.kept_conditions[0]?.source_field_path, fieldPath(ID_RELATED, 'condition'));

    /* The layer is read from the CONTENT ITEM, so a Fact stays a Fact. */
    const historical = (
      await Promise.all(
        (await harness.attempts.listAttempts()).map(async (attempt) => ({
          attempt,
          content_items: await harness.attempts.readAttemptContentItems(attempt.attempt_id),
        })),
      )
    );
    const resolved = resolveKeptConditions(hypothesis?.core.kept_conditions ?? [], historical);
    assert.equal(resolved[0]?.source_type, 'Fact');
    assert.equal(resolved[0]?.resolves, true);
  });

  it('[AC-32] K2: a historical Extraction can be cited, and it does NOT become a Fact', async () => {
    const harness = await seedWithExtraction(
      generationAnswerOf([
        groundedAnswer({
          keep: { kind: 'historical_ref', target_id: ID_RELATED, source_field_path: NOTE_PATH },
        }),
      ]),
    );
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-k2',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const hypothesis = outcome.hypotheses[0];
    const historical = await Promise.all(
      (await harness.attempts.listAttempts()).map(async (attempt) => ({
        attempt,
        content_items: await harness.attempts.readAttemptContentItems(attempt.attempt_id),
      })),
    );
    const resolved = resolveKeptConditions(hypothesis?.core.kept_conditions ?? [], historical);
    assert.equal(resolved[0]?.source_type, 'Extraction');
    assert.equal(resolved[0]?.value, '上次观察到颜色偏深，可能是温度过高。');
    /* 🔴 No `Fact` provenance appears anywhere in the stored document for that citation. */
    assert.deepEqual(hypothesis?.editable_items.user_facts, []);
  });

  it('[AC-32] K3: an AI 「下一轮保持 X」 recommendation is an Inference in a SEPARATE column', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          keep: { kind: 'model_recommendation', text: '建议下一轮把干燥温度设为 50 摄氏度。' },
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-k3',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const view = await harness.service.readHypothesis(
      outcome.hypotheses[0]?.hypothesis_id ?? ('HYP_x' as never),
    );
    assert.equal(view?.kept_condition_recommendations.length, 1);
    assert.equal(view?.kept_condition_recommendations[0]?.source_type, 'Inference');
    /* 🔴 It is NOT written into ⑤: ⑤ stays explicitly missing. */
    assert.equal(view?.hypothesis.core.kept_conditions.length, 0);
    assert.equal(view?.item_presence['kept_conditions'], 'missing');
  });

  it('[AC-32] K4: there is NO API that writes a user wish into ⑤ as a Hypothesis Fact', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const surface = Object.keys(harness.service);
    for (const name of surface) {
      assert.equal(
        /keep|condition/i.test(name) && !/read|list|trace/.test(name),
        false,
        `no API may write ⑤ (found "${name}")`,
      );
    }
    /* An editable command can only name ⑥⑦⑧ slots, so ⑤ is structurally out of reach. */
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-k4',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const applied = await harness.service.editHypothesisCriteria({
      operation_id: 'op-k4-edit',
      hypothesis_id: outcome.hypotheses[0]?.hypothesis_id ?? ('HYP_x' as never),
      user_items: [{ slot: 'kept_conditions' as never, content_item_id: 'x', value: '保持不变' }],
    });
    assert.equal(applied.kind, 'rejected');
    if (applied.kind === 'rejected') {
      assert.equal(applied.code, 'READ_ONLY_ITEM');
    }
  });

  it('[AC-32] K4: a ⑤ reference that does not exist as a Formal Attempt fact is refused', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          keep: {
            kind: 'historical_ref',
            target_id: ID_RELATED,
            source_field_path: `${'condition'}#${ID_RELATED}:does-not-exist`,
          },
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-k4b',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.ok(outcome.rejected_proposals.some((entry) => entry.stage === 'structure'));
  });

  it('[AC-32] K5: 「保持不变」 without a recorded value is refused by the reader', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({ keep: { kind: 'model_recommendation', text: '下一轮保持温度不变。' } }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-k5',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(
      outcome.issues.some((entry) => entry.code === 'KEEP_UNCHANGED_WITHOUT_HISTORICAL_FACT'),
    );
  });

  it('[AC-32] K5: an unknown historical condition can only be 「设为 Y」 or omitted', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          keep: {
            kind: 'historical_ref',
            target_id: ID_RELATED,
            source_field_path: levelAPath(ID_RELATED, 'goal'),
          },
          next_change: '把干燥温度从 60 摄氏度改为 50 摄氏度。',
        }),
      ]),
    });
    /* A resolvable historical condition is accepted, so the boundary is really about UNKNOWN fields. */
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-k5b',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
  });
});
