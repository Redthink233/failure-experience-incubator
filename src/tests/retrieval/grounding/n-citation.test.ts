/**
 * S01 ｜ `M7` `N_引用` derivation (task §18 / §19 / §27 / §29).
 *
 * Canonical acceptance points used here: `AC-38` (the two `N` tiers are never mixed), `AC-39` (a
 * pure `context` reference is never counted), `AC-84` (`N_引用` and the ⑩ list agree), `AC-86`
 * (`N_引用` is the ONLY number allowed to present itself as an evidence count).
 *
 * 🔴 `N_引用` counts DISTINCT `target_id`s (`S03-B` §F.2 / `S03-D` §G.3): the definition is the
 *    number of RECORDS that take part, not the number of reference rows.
 * 🔴 The ⑩ trace list and `N_引用` are two VIEWS of one `EvidenceRef` set - this file asserts that
 *    they can never disagree, and that no second number is cached anywhere.
 * 🔴 This file creates NO new `AC` and no new `Decision`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ObjectId } from '../../../domain/ids/object-id.js';
import type { EvidenceOwnerId } from '../../../domain/types/evidence-ref.js';
import { deriveCitationView, deriveNCitation } from '../../../retrieval/grounding/citation.js';
import { buildGroundingContext } from '../../../retrieval/grounding/grounding-context.js';
import type { GroundingContextPack, GroundingSelection } from '../../../retrieval/grounding/types.js';
import {
  ID_RELATED,
  ID_RELATED_SECOND,
  ID_UNKNOWN,
  OWNER_HYPOTHESIS,
  OWNER_INSIGHT,
  allHistoricalOf,
  levelAPath,
  pick,
  seedFixture,
} from './harness.js';

async function packOf(selections: readonly GroundingSelection[]): Promise<GroundingContextPack> {
  const { retrieval, record, source_attempt_id } = await seedFixture();
  const outcome = buildGroundingContext({
    owner_id: OWNER_HYPOTHESIS,
    source_attempt_id,
    derivation: record,
    historical_attempts: await allHistoricalOf(retrieval),
    selections,
  });
  assert.equal(outcome.kind, 'built');
  if (outcome.kind !== 'built') {
    throw new Error('unreachable');
  }
  return outcome.pack;
}

const C_RELATED = levelAPath(ID_RELATED, 'condition');
const C_UNKNOWN = levelAPath(ID_UNKNOWN, 'condition');
const C_SECOND = levelAPath(ID_RELATED_SECOND, 'condition');

describe('S01｜M7 N_引用 derivation', () => {
  it('AC-38 / N1: one grounding target yields N_引用 = 1', async () => {
    const pack = await packOf([pick(ID_RELATED, C_RELATED, 'grounding')]);
    assert.equal(pack.citation.n_citation, 1);
    assert.deepEqual([...pack.citation.counted_target_ids], [ID_RELATED]);
  });

  it('AC-84 / N2: two references onto the SAME record still count as 1', async () => {
    const pack = await packOf([
      pick(ID_RELATED, C_RELATED, 'grounding'),
      pick(ID_RELATED, levelAPath(ID_RELATED, 'result'), 'support'),
    ]);
    assert.equal(pack.evidence_refs.length, 2, 'two reference rows exist');
    assert.equal(pack.citation.counted_ref_ids.length, 2);
    assert.equal(pack.citation.n_citation, 1, 'but the record counts once');
    assert.deepEqual([...pack.citation.counted_target_ids], [ID_RELATED]);
  });

  it('AC-38 / N3: two different targets count as 2', async () => {
    const pack = await packOf([
      pick(ID_RELATED, C_RELATED, 'grounding'),
      pick(ID_RELATED_SECOND, C_SECOND, 'grounding'),
    ]);
    assert.equal(pack.citation.n_citation, 2);
    assert.deepEqual(
      [...pack.citation.counted_target_ids],
      [ID_RELATED, ID_RELATED_SECOND],
    );
  });

  it('AC-39 / N4: context-only references yield N_引用 = 0', async () => {
    const pack = await packOf([
      pick(ID_RELATED, C_RELATED, 'context'),
      pick(ID_RELATED_SECOND, C_SECOND, 'context'),
    ]);
    assert.equal(pack.citation.n_citation, 0);
    assert.deepEqual([...pack.citation.counted_ref_ids], []);
    assert.equal(pack.citation.context_only_ref_ids.length, 2);
    assert.equal(pack.has_grounding_reference, false);
  });

  it('AC-39 / N5: grounding plus context on one record yields N_引用 = 1', async () => {
    const pack = await packOf([
      pick(ID_RELATED, C_RELATED, 'grounding'),
      pick(ID_RELATED, levelAPath(ID_RELATED, 'result'), 'context'),
    ]);
    assert.equal(pack.evidence_refs.length, 2);
    assert.equal(pack.citation.n_citation, 1);
    assert.equal(pack.citation.counted_ref_ids.length, 1);
    assert.equal(pack.citation.context_only_ref_ids.length, 1);
  });

  it('AC-38 / N6: support and contradict are counted normally', async () => {
    const pack = await packOf([
      pick(ID_RELATED, C_RELATED, 'support'),
      pick(ID_RELATED_SECOND, C_SECOND, 'contradict'),
    ]);
    assert.equal(pack.citation.n_citation, 2);
    assert.equal(pack.has_grounding_reference, false);
  });

  it('AC-84 / N7: the ⑩ trace list and N_引用 read the SAME EvidenceRef set', async () => {
    const pack = await packOf([
      pick(ID_RELATED, C_RELATED, 'grounding'),
      pick(ID_RELATED, levelAPath(ID_RELATED, 'result'), 'context'),
      pick(ID_RELATED_SECOND, C_SECOND, 'support'),
      pick(ID_UNKNOWN, C_UNKNOWN, 'context'),
    ]);

    /* Both views are projections of the SAME array, so both must cover it exactly. */
    assert.equal(pack.traceability.length, pack.evidence_refs.length);

    const countedFromTrace = pack.traceability
      .filter((row) => row.counted_toward_n_citation)
      .map((row) => row.evidence_ref_id);
    assert.deepEqual([...countedFromTrace], [...pack.citation.counted_ref_ids]);
    assert.equal(pack.citation.n_citation, deriveNCitation(OWNER_HYPOTHESIS, pack.evidence_refs));
    assert.deepEqual(
      [...deriveCitationView(OWNER_HYPOTHESIS, pack.evidence_refs).counted_ref_ids],
      [...pack.citation.counted_ref_ids],
    );
    /* Distinct-target counting really is what produced the number. */
    assert.equal(
      pack.citation.n_citation,
      new Set(pack.citation.counted_target_ids).size,
    );
  });

  it('AC-38 / N8: N_检索 is read from M6 and never recomputed, so the two tiers stay different', async () => {
    const { record, retrieval, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [pick(ID_RELATED, C_RELATED, 'grounding')],
    });
    assert.equal(outcome.kind, 'built');
    if (outcome.kind !== 'built') {
      return;
    }
    const pack = outcome.pack;
    assert.equal(record.n_retrieval, 3, 'the fixture really has 3 related records');
    assert.equal(pack.n_retrieval, record.n_retrieval);
    assert.equal(pack.n_retrieval !== pack.citation.n_citation, true);
    assert.equal(pack.derivation_id, record.derivation_id);
    assert.equal(pack.derivation_status, 'RELATED_HISTORY');
  });

  it('AC-38 / N9: no second N_引用 number is cached in the pack', async () => {
    const pack = await packOf([
      pick(ID_RELATED, C_RELATED, 'grounding'),
      pick(ID_RELATED_SECOND, C_SECOND, 'grounding'),
    ]);
    const numericKeys = Object.entries(pack)
      .filter(([, value]) => typeof value === 'number')
      .map(([key]) => key);
    assert.deepEqual([...numericKeys], ['n_retrieval']);
    assert.deepEqual([...Object.keys(pack.citation)].sort(), [
      'context_only_ref_ids',
      'counted_ref_ids',
      'counted_target_ids',
      'n_citation',
      'owner_id',
    ]);
  });

  it('IMPLEMENTATION INVARIANT（契约 §3.3 / task §18）/ N10: references of another owner are refused', () => {
    const refs = [
      {
        evidence_ref_id: 'EREF_00000000000000000000000000',
        target_id: ID_RELATED as ObjectId<'ATT'>,
        source_field_path: C_RELATED,
        role: 'grounding' as const,
        owner_id: OWNER_INSIGHT as EvidenceOwnerId,
      },
    ];
    assert.throws(
      () => deriveCitationView(OWNER_HYPOTHESIS, refs),
      /belongs to/,
    );
  });
});
