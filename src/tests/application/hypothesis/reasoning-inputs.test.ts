/**
 * S01 ｜ `M9` reasoning inputs (task §4, §24, §48 R1-R6).
 *
 * Contract: §8.1 (object boundary), §9 step ⑨ input, §12 item 10 (no fifth reference role),
 * `D-030` (⑨ does not wait for ⑧'s `E5`), `TQ21` (an un-accepted prior candidate is marked as
 * 「前序候选经验（未接受）」), §5.2 rule 2 (`accepted` cannot ground).
 *
 * 🔴 The two things these tests protect: (①) a prior `Insight` is something to THINK WITH, never
 *    something to CITE, and (②) ⑨ does not wait for the user to accept anything in step ⑧.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { at, groundedAnswer, generationAnswerOf, ID_SOURCE, seedStandardFixture } from './harness.js';

async function withPriorInsight() {
  const { harness } = await seedStandardFixture({
    generation: generationAnswerOf([groundedAnswer()]),
  });
  await harness.generateInsights('op-insight-r');
  const insights = await harness.insight_service.listInsightsBySourceAttempt(at(ID_SOURCE));
  assert.equal(insights.length, 1, 'the fixture must produce one prior candidate Insight');
  return { harness, insight: insights[0]! };
}

describe('M9 ｜ reasoning inputs', () => {
  it('[AC-33] R1 / R2: a current CANDIDATE Insight is a reasoning input and E5 is NOT awaited', async () => {
    const { harness, insight } = await withPriorInsight();
    /* 🔴 `E5` was never performed: the Insight is still a candidate. */
    assert.equal(insight.insight.state, 'candidate');

    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-r1',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const view = await harness.service.readHypothesis(outcome.hypotheses[0]!.hypothesis_id);
    const refs = view?.reasoning_input_refs ?? [];
    const prior = refs.find((ref) => ref.ref_id === insight.insight.insight_id);
    assert.ok(prior !== undefined, 'the candidate Insight must be offered as a reasoning input');
    assert.equal(prior.kind, 'candidate_insight_not_accepted');
    assert.match(prior.label, /前序候选经验（未接受）/);
    assert.equal(prior.reasoning_only, true);
  });

  it('[AC-36] R3: a candidate Insight is never an EvidenceRef', async () => {
    const { harness, insight } = await withPriorInsight();
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-r3',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const view = await harness.service.readHypothesis(outcome.hypotheses[0]!.hypothesis_id);
    for (const ref of view?.hypothesis.evidence_refs ?? []) {
      assert.notEqual(ref.target_id, insight.insight.insight_id);
      assert.notEqual(ref.owner_id, insight.insight.insight_id);
      assert.match(String(ref.target_id), /^ATT_/);
    }
  });

  it('[AC-36][AC-139] R4: an ACCEPTED Insight cannot ground either', async () => {
    const { harness, insight } = await withPriorInsight();
    const accepted = await harness.insight_service.acceptInsight({
      operation_id: 'op-e5',
      insight_id: insight.insight.insight_id,
      user_explicitly_accepted: true,
    });
    assert.equal(accepted.kind, 'applied');

    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-r4',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const view = await harness.service.readHypothesis(outcome.hypotheses[0]!.hypothesis_id);
    for (const ref of view?.hypothesis.evidence_refs ?? []) {
      assert.notEqual(ref.target_id, insight.insight.insight_id);
    }
    const prior = (view?.reasoning_input_refs ?? []).find(
      (ref) => ref.ref_id === insight.insight.insight_id,
    );
    assert.equal(prior?.kind, 'accepted_insight');
    assert.equal(prior?.reasoning_only, true);
  });

  it('[AC-38] R5: reasoning inputs are NOT counted toward N_引用', async () => {
    const with_insight = await withPriorInsight();
    const outcome = await with_insight.harness.service.generateHypotheses({
      operation_id: 'op-r5',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const view = await with_insight.harness.service.readHypothesis(
      outcome.hypotheses[0]!.hypothesis_id,
    );
    assert.ok((view?.reasoning_input_refs.length ?? 0) >= 1);
    /* Exactly one counted record: the one historical Attempt the reference points at. */
    assert.equal(view?.citation.n_citation, 1);
    assert.deepEqual(
      [...(view?.citation.counted_target_ids ?? [])].map(String),
      (view?.hypothesis.evidence_refs ?? []).map((ref) => String(ref.target_id)),
    );
  });

  it('[AC-38] R6: reasoning inputs never enter step ⑩', async () => {
    const { harness, insight } = await withPriorInsight();
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-r6',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const trace = await harness.service.traceHypothesis(outcome.hypotheses[0]!.hypothesis_id);
    assert.equal(trace?.traceability.length, 1);
    assert.equal(
      (trace?.traceability ?? []).some(
        (row) => String(row.evidence_ref_id) === insight.insight.insight_id,
      ),
      false,
    );
    assert.equal(
      (trace?.traceability ?? []).some((row) => String(row.target_id) === insight.insight.insight_id),
      false,
    );
  });

  it('[IMPLEMENTATION INVARIANT] §24: a reasoning input is structurally distinguishable from history evidence', async () => {
    const { harness } = await withPriorInsight();
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-r-structure',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const view = await harness.service.readHypothesis(outcome.hypotheses[0]!.hypothesis_id);
    for (const ref of view?.reasoning_input_refs ?? []) {
      /* 🔴 A reasoning input carries NO reference field at all - it can never become a fifth role. */
      assert.equal('target_id' in ref, false);
      assert.equal('source_field_path' in ref, false);
      assert.equal('role' in ref, false);
      assert.equal(ref.reasoning_only, true);
    }
    for (const ref of view?.hypothesis.evidence_refs ?? []) {
      assert.equal('reasoning_only' in ref, false);
    }
  });

  it('[AC-33] TQ21: a saved Model Suggestion of this record is also a reasoning input', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf(
        [groundedAnswer()],
        [
          {
            hypothesis_statement: '可以先建立一份环境记录表。',
            rationale: '通用建议，不基于历史。',
            next_change: '增加环境记录。',
            keep: null,
            observation_metric: null,
            support_criterion: null,
            refutation_criterion: null,
          },
        ],
      ),
    });
    const first = await harness.service.generateHypotheses({
      operation_id: 'op-r-tq21-first',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(first.kind, 'generated');
    if (first.kind !== 'generated') {
      return;
    }
    const model = first.model_suggestions[0];
    assert.ok(model !== undefined);
    await harness.service.saveModelSuggestion({
      operation_id: 'op-r-tq21-save',
      hypothesis_id: model.hypothesis_id,
      saved: true,
    });

    const second = await harness.service.regenerateHypotheses({
      operation_id: 'op-r-tq21-second',
      source_attempt_id: at(ID_SOURCE),
      explicit_regeneration: true,
    });
    assert.equal(second.kind, 'generated');
    if (second.kind !== 'generated') {
      return;
    }
    const view = await harness.service.readHypothesis(second.hypotheses[0]!.hypothesis_id);
    const prior = (view?.reasoning_input_refs ?? []).find(
      (ref) => ref.ref_id === model.hypothesis_id,
    );
    assert.equal(prior?.kind, 'saved_model_suggestion');
    /*
     * 🔴 AC-123: an EARLIER Hypothesis is not offered merely because it still exists. Only a SAVED
     *    Model Suggestion and the prior Insights qualify, so the earlier grounded direction is absent.
     */
    const reasoning_ids = (view?.reasoning_input_refs ?? []).map((ref) => String(ref.ref_id));
    assert.equal(
      reasoning_ids.includes(String(first.hypotheses[0]!.hypothesis_id)),
      false,
      'an earlier Hypothesis must not be auto-offered as a reasoning input',
    );
    assert.equal(prior?.reasoning_only, true);
  });

  it('[IMPLEMENTATION INVARIANT] §24: the retrieval derivation used is itself recorded as a reasoning input', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-r-derivation',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const view = await harness.service.readHypothesis(outcome.hypotheses[0]!.hypothesis_id);
    assert.ok(
      (view?.reasoning_input_refs ?? []).some((ref) => ref.kind === 'retrieval_derivation'),
    );
    /* 🔴 The derivation id is a REASONING input, never a reference target. */
    const derivation_id = (view?.reasoning_input_refs ?? []).find(
      (ref) => ref.kind === 'retrieval_derivation',
    )?.ref_id;
    for (const ref of view?.hypothesis.evidence_refs ?? []) {
      assert.notEqual(ref.target_id, derivation_id);
    }
  });
});
