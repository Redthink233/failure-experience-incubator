/**
 * S01 ｜ `M9` step ⑩ traceability (task §25, §26, §27, §47 T1-T6).
 *
 * Contract: §3.3 (the ⑩ list and `N_引用` come from the SAME set), §5.2 rules 5 / 10, §7.4 (the archive
 * marker is DYNAMIC), §9 step ⑩ (「旧引用不得静默消失」), §6.1 (`N_引用` = distinct `target_id`).
 *
 * 🔴 These are the tests that keep a reference HONEST: the count and the list can never disagree, an
 *    archived source stays traceable, and an unresolvable old reference is still SHOWN.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createHypothesisRepository } from '../../../application/hypothesis/hypothesis-repository.js';
import {
  at,
  fieldPath,
  groundedAnswer,
  generationAnswerOf,
  hypothesisIdOf,
  ID_RELATED,
  ID_SOURCE,
  levelAPath,
  seedStandardFixture,
  selection,
} from './harness.js';

async function generatedWith(overrides: Readonly<Record<string, unknown>>) {
  const { harness } = await seedStandardFixture({
    generation: generationAnswerOf([groundedAnswer(overrides)]),
  });
  const outcome = await harness.service.generateHypotheses({
    operation_id: `op-${String(Math.random())}`,
    source_attempt_id: at(ID_SOURCE),
  });
  assert.equal(outcome.kind, 'generated');
  if (outcome.kind !== 'generated') {
    throw new Error('unreachable');
  }
  return { harness, hypothesis_id: outcome.hypotheses[0]!.hypothesis_id };
}

describe('M9 ｜ step ⑩ traceability', () => {
  it('[AC-84] T1: a grounded reference resolves back to the Formal Attempt and the content path', async () => {
    const { harness, hypothesis_id } = await generatedWith({});
    const trace = await harness.service.traceHypothesis(hypothesis_id);
    assert.equal(trace?.traceability.length, 1);
    const row = trace?.traceability[0];
    assert.equal(row?.resolvable, true);
    if (row !== undefined && row.resolvable) {
      assert.equal(row.target_id, ID_RELATED);
      assert.equal(row.attempt_field_path, 'goal');
      assert.equal(row.content_source_type, 'Fact');
      assert.equal(row.content_value, 'G');
      assert.equal(row.role, 'grounding');
      assert.equal(row.counted_toward_n_citation, true);
      assert.equal(row.source_archived, false);
    }
  });

  it('[AC-38] T2: N_引用 counts DISTINCT targets, not reference rows', async () => {
    const { harness, hypothesis_id } = await generatedWith({
      evidence_selections: [
        selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1'),
        selection(ID_RELATED, fieldPath(ID_RELATED, 'condition'), 'support', 'G2'),
      ],
      grounding_bases: ['G1', 'G2'],
    });
    const view = await harness.service.readHypothesis(hypothesis_id);
    assert.equal(view?.hypothesis.evidence_refs.length, 2);
    assert.equal(view?.citation.n_citation, 1, 'one record referenced twice still counts once');
    assert.equal(view?.citation.counted_ref_ids.length, 2, 'both ROWS are counted refs');
    assert.deepEqual([...view!.citation.counted_target_ids], [ID_RELATED]);
  });

  it('[AC-38] T3: the trace list and N_引用 come from the SAME set', async () => {
    const { harness, hypothesis_id } = await generatedWith({
      evidence_selections: [
        selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1'),
        selection(ID_RELATED, fieldPath(ID_RELATED, 'condition'), 'support', 'G2'),
      ],
      grounding_bases: ['G1', 'G2'],
    });
    const view = await harness.service.readHypothesis(hypothesis_id);
    assert.equal(view?.traceability.length, view?.hypothesis.evidence_refs.length);
    const counted_rows = (view?.traceability ?? []).filter((row) => row.counted_toward_n_citation);
    assert.deepEqual(
      counted_rows.map((row) => row.evidence_ref_id).sort(),
      [...(view?.citation.counted_ref_ids ?? [])].sort(),
    );
  });

  it('[AC-39] T4: a pure `context` reference is displayable and counted by nobody', async () => {
    const { harness, hypothesis_id } = await generatedWith({
      evidence_selections: [
        selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1'),
        selection(ID_RELATED, fieldPath(ID_RELATED, 'condition'), 'context', null),
      ],
      grounding_bases: ['G1'],
    });
    const view = await harness.service.readHypothesis(hypothesis_id);
    assert.equal(view?.citation.n_citation, 1);
    assert.equal(view?.citation.context_only_ref_ids.length, 1);
    const context_rows = (view?.traceability ?? []).filter((row) => !row.counted_toward_n_citation);
    assert.equal(context_rows.length, 1);
    assert.equal(context_rows[0]?.role, 'context');
  });

  it('[AC-100] T5: a target archived afterwards stays traceable, with a DYNAMIC marker', async () => {
    const { harness, hypothesis_id } = await generatedWith({});
    const before = await harness.service.traceHypothesis(hypothesis_id);
    const before_row = before?.traceability[0];
    assert.equal(before_row?.resolvable === true ? before_row.source_archived : null, false);

    await harness.attempts.updateAttempt(at(ID_RELATED), { archive_state: 'archived' });
    const after = await harness.service.traceHypothesis(hypothesis_id);
    const after_row = after?.traceability[0];
    assert.equal(after_row?.resolvable, true, 'an archived source still resolves');
    assert.equal(
      after_row?.resolvable === true ? after_row.source_archived : null,
      true,
      '「来源已归档」 is derived from the CURRENT state',
    );
    /* 🔴 Archiving never reduces an existing N_引用 (§7.3 rule 4). */
    assert.equal(after?.citation.n_citation, before?.citation.n_citation);

    /* 🔴 And nothing was rewritten on disk: no archive snapshot field exists. */
    const raw = harness.rawHypothesisFile(hypothesis_id) ?? '';
    assert.equal(/archived_at_ref|archive_snapshot/.test(raw), false);
  });

  it('[AC-74] T6: an unresolvable old reference is STILL LISTED, never silently dropped', async () => {
    const { harness, hypothesis_id } = await generatedWith({});
    const stored = await harness.hypotheses.readById(hypothesis_id);
    assert.ok(stored !== null);

    /* Rewrite the record with a legacy reference whose landing point no longer resolves. */
    const legacy_id = hypothesisIdOf('HYP_0000000000000000000000000A');
    const repository = createHypothesisRepository({ storage: harness.storage });
    await repository.createIfAbsent({
      hypothesis: {
        ...stored!.hypothesis,
        hypothesis_id: legacy_id,
        evidence_refs: [
          {
            evidence_ref_id: 'EREF_0000000000000000000000000A',
            target_id: at(ID_RELATED),
            source_field_path: `${'goal'}#${ID_RELATED}:a-suffix-that-no-longer-exists`,
            role: 'grounding',
            owner_id: legacy_id,
          },
        ],
      },
      kept_condition_recommendations: [],
      reasoning_input_refs: [],
      model_prior_notice: null,
    });

    const trace = await harness.service.traceHypothesis(legacy_id);
    assert.equal(trace?.traceability.length, 1);
    assert.equal(trace?.traceability[0]?.resolvable, false);
    /* 🔴 It still counts toward N_引用: the number is derived from the ROLE, not from resolvability. */
    assert.equal(trace?.citation.n_citation, 1);
  });

  it('[AC-42] §27: conflicting evidence is juxtaposed and never decided for the user', async () => {
    const { harness, hypothesis_id } = await generatedWith({
      evidence_selections: [
        selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1'),
        selection(ID_RELATED, fieldPath(ID_RELATED, 'condition'), 'support', 'G2'),
        selection(ID_RELATED, fieldPath(ID_RELATED, 'actual_result'), 'contradict', 'G4'),
      ],
      grounding_bases: ['G1', 'G2', 'G4'],
    });
    const view = await harness.service.readHypothesis(hypothesis_id);
    assert.equal(view?.evidence_overview.has_conflict, true);
    assert.match(String(view?.evidence_overview.conflict_note), /并列呈现/);
    /* 🔴 No majority / vote / strength conclusion is produced. */
    const note = String(view?.evidence_overview.conflict_note);
    assert.equal(/多数|少数|更强|积分|评分|投票/.test(note), false);
    const serialized = JSON.stringify(view?.evidence_overview);
    assert.equal(/strength|score|confidence|grade|high|medium|low/.test(serialized), false);
  });

  it('[AC-53][AC-54] §26: the evidence overview is DERIVED, never stored a second time', async () => {
    const { harness, hypothesis_id } = await generatedWith({});
    const raw = harness.rawHypothesisFile(hypothesis_id) ?? '';
    assert.equal(/evidence_overview|n_citation/.test(raw), false);
    const view = await harness.service.readHypothesis(hypothesis_id);
    assert.equal(view?.evidence_overview.n_citation, view?.citation.n_citation);
    assert.equal(
      view?.evidence_overview.distinct_record_count,
      view?.citation.counted_target_ids.length,
    );
  });

  it('[AC-53] §26: a missing historical condition is reported without inventing a value', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    /* Leave one Level A dimension of the SOURCE record explicitly unknown. */
    await harness.attempts.updateAttempt(at(ID_SOURCE), { condition: { presence_state: 'unknown' } });
    await harness.runRetrieval();
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-missing-condition',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }
    const view = await harness.service.readHypothesis(outcome.hypotheses[0]!.hypothesis_id);
    assert.match(String(view?.evidence_overview.missing_condition_note), /未知 \/ 未提供/);
    assert.match(String(view?.evidence_overview.missing_condition_note), /条件/);
    /* 🔴 The note explains an ABSENCE; it never substitutes a value. */
    assert.equal(/推断|估计|大约是/.test(String(view?.evidence_overview.missing_condition_note)), false);
  });
});
