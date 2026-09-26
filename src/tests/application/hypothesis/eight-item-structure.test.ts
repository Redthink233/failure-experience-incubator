/**
 * S01 ｜ `M9` the 8-item structure (task §12, §13, §43 H1-H7).
 *
 * Contract: §8.1 (object boundary), §9 step ⑨ I/O (the fixed 8-item structure), §8.6 rules 1-2,
 * `D-027`, `D-049` / `ADJ-01`.
 *
 * 🔴 The two things these tests protect: (①) there are EXACTLY eight items and no ninth, and (②) an
 *    explicitly missing item is never expressed by a blank string.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FORBIDDEN_NINTH_FIELD_KEYS,
  HYPOTHESIS_EDITABLE_FIELD_KEYS,
  HYPOTHESIS_FIELD_KEYS,
  HYPOTHESIS_OPTIONAL_FIELD_KEYS,
  HYPOTHESIS_READ_ONLY_FIELD_KEYS,
  HYPOTHESIS_REQUIRED_FIELD_KEYS,
} from '../../../application/hypothesis/structure.js';
import { parseHypothesis, serializeHypothesis } from '../../../application/hypothesis/persistence.js';
import {
  at,
  groundedAnswer,
  generationAnswerOf,
  ID_RELATED,
  ID_SOURCE,
  levelAPath,
  seedStandardFixture,
} from './harness.js';

describe('M9 ｜ the 8-item structure', () => {
  it('[AC-31] H1: the canonical key set has exactly eight items, in canonical order', () => {
    assert.equal(HYPOTHESIS_FIELD_KEYS.length, 8);
    assert.deepEqual([...HYPOTHESIS_FIELD_KEYS], [
      'hypothesis_statement',
      'rationale',
      'referenced_attempts',
      'next_change',
      'kept_conditions',
      'observation_metric',
      'support_criterion',
      'refutation_criterion',
    ]);
    assert.equal(HYPOTHESIS_READ_ONLY_FIELD_KEYS.length, 5);
    assert.equal(HYPOTHESIS_EDITABLE_FIELD_KEYS.length, 3);
    assert.deepEqual(
      [...HYPOTHESIS_REQUIRED_FIELD_KEYS],
      ['hypothesis_statement', 'rationale', 'referenced_attempts', 'next_change'],
    );
    assert.deepEqual(
      [...HYPOTHESIS_OPTIONAL_FIELD_KEYS],
      ['kept_conditions', 'observation_metric', 'support_criterion', 'refutation_criterion'],
    );
  });

  it('[AC-31] H2: ①-④ are present on a grounded hypothesis, ③ included', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-h2',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const view = await harness.service.readHypothesis(
      outcome.hypotheses[0]?.hypothesis_id ?? ('HYP_x' as never),
    );
    for (const key of HYPOTHESIS_REQUIRED_FIELD_KEYS) {
      assert.equal(view?.item_presence[key], 'present', `${key} must be present`);
    }
    assert.deepEqual([...view!.read_only_field_keys], [...HYPOTHESIS_READ_ONLY_FIELD_KEYS]);
    assert.deepEqual([...view!.editable_field_keys], [...HYPOTHESIS_EDITABLE_FIELD_KEYS]);
  });

  it('[AC-31] H3: ⑤-⑧ may be explicitly missing and the hypothesis is still formed', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          keep: null,
          observation_metric: null,
          /* ⑦⑧ must stay observable, so they are supplied; ⑤ and ⑥ stay explicitly missing. */
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-h3',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const view = await harness.service.readHypothesis(
      outcome.hypotheses[0]?.hypothesis_id ?? ('HYP_x' as never),
    );
    assert.equal(view?.item_presence['kept_conditions'], 'missing');
    assert.equal(view?.item_presence['observation_metric'], 'missing');
    assert.equal(view?.item_presence['support_criterion'], 'present');
    assert.equal(view?.item_presence['refutation_criterion'], 'present');
  });

  it('[AC-31] H4: a blank string may never stand in for an explicitly missing item', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer({ observation_metric: '   ' })]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-h4',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((issue) => issue.path.endsWith('observation_metric')));
  });

  it('[AC-31] H4: no blank string is ever written to disk', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    await harness.service.generateHypotheses({ operation_id: 'op-h4b', source_attempt_id: at(ID_SOURCE) });
    for (const path of harness.hypothesisFiles()) {
      const raw = harness.storage.peek(path) ?? '';
      assert.equal(/":\s*""/.test(raw), false, `${path} carries a blank string value`);
    }
  });

  it('[AC-32] H5: a historically unknown condition can never be kept unchanged (the K5 boundary)', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          /* `expected_result` is explicitly UNKNOWN on the standard fixture. */
          keep: {
            kind: 'historical_ref',
            target_id: ID_RELATED,
            source_field_path: `${'expected_result'}#${ID_RELATED}:expected_result`,
          },
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-h5',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'zero_output');
    if (outcome.kind !== 'zero_output') {
      return;
    }
    assert.ok(outcome.rejected_proposals.some((entry) => entry.conditions.includes('N6')));
  });

  it('[AC-31] H6: a historical fact named in ② must be findable among the references', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({
          rationale: `依据来自 ${ID_SOURCE} 这条记录。`,
          evidence_selections: [
            {
              target_id: ID_RELATED,
              source_field_path: levelAPath(ID_RELATED, 'goal'),
              role: 'grounding',
              grounding_basis: 'G1',
            },
          ],
        }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-h6',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind !== 'refused') {
      return;
    }
    assert.ok(outcome.issues.some((issue) => issue.path.endsWith('rationale')));
  });

  it('[AC-31] H6: a reference that IS selected may be named in ②', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([
        groundedAnswer({ rationale: `依据来自 ${ID_RELATED} 这条记录。` }),
      ]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-h6b',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
  });

  it('[AC-52] H7: there is no ninth field, and a document carrying one is refused', async () => {
    assert.equal(FORBIDDEN_NINTH_FIELD_KEYS.includes('hypothesis_cost'), true);
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-h7',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const hypothesis_id = outcome.hypotheses[0]?.hypothesis_id ?? ('HYP_x' as never);
    const raw = harness.rawHypothesisFile(hypothesis_id) ?? '{}';
    const document = JSON.parse(raw) as Record<string, unknown>;
    for (const forbidden of FORBIDDEN_NINTH_FIELD_KEYS) {
      assert.equal(forbidden in document, false, `${forbidden} must not be a top-level field`);
    }

    /* A hand-authored document that adds a ninth item is refused, not read leniently. */
    const broken = { ...document, hypothesis_cost: '很贵' };
    assert.throws(() => parseHypothesis(JSON.stringify(broken), 'broken.json'), /FORBIDDEN_KEY|cost/);

    /* And a cost field anywhere is refused by the round-trip serializer too. */
    const record = {
      hypothesis: {
        ...outcome.hypotheses[0]!,
        core: { ...outcome.hypotheses[0]!.core, cost: '1' },
      },
      kept_condition_recommendations: [],
      reasoning_input_refs: [],
      model_prior_notice: null,
    };
    assert.throws(() => serializeHypothesis(record as never), /cost/);
  });

  it('[AC-31] H7: the 8 items are the ONLY top-level keys of the hypothesis object', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-h7b',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const hypothesis = outcome.hypotheses[0];
    assert.ok(hypothesis !== undefined);
    const core_keys = Object.keys(hypothesis.core).sort();
    assert.deepEqual(core_keys, ['hypothesis_statement', 'kept_conditions', 'next_change', 'rationale', 'referenced_attempt_ids']);
    const editable_keys = Object.keys(hypothesis.editable_items).sort();
    assert.deepEqual(editable_keys, ['ai_inferences', 'user_facts']);
  });
});
