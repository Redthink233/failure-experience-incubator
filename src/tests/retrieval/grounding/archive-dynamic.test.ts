/**
 * S01 ｜ `M7` archive behaviour (task §20 / §21 / §30).
 *
 * Canonical acceptance points used here: `AC-74` / `AC-100` - an archived target keeps its existing
 * references, the ⑩ list still resolves, 「来源已归档」 is derived from the CURRENT state and the
 * existing `N_引用` is not retro-reduced. `AC-76` - archiving is a state bit, never a delete.
 *
 * 🔴 The `EvidenceRef` carries NO archive information at all: the annotation is computed on every
 *    read from the target's current `archive_state` (契约 §7.4). Therefore archiving cannot reduce a
 *    count and un-archiving cannot require a write.
 * 🔴 This file creates NO new `AC` and no new `Decision`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ObjectId } from '../../../domain/ids/object-id.js';
import type { RetrievalDerivationRecord } from '../../../retrieval/compare/types.js';
import type { RetrievalHarness } from '../compare/harness.js';
import { deriveCitationView, deriveTraceabilityView } from '../../../retrieval/grounding/citation.js';
import { buildGroundingContext } from '../../../retrieval/grounding/grounding-context.js';
import { buildGroundingSourceCatalog } from '../../../retrieval/grounding/index.js';
import type { GroundingContextPack } from '../../../retrieval/grounding/types.js';
import {
  ID_RELATED,
  OWNER_HYPOTHESIS,
  allHistoricalOf,
  archiveAttempt,
  at,
  levelAPath,
  pick,
  seedFixture,
} from './harness.js';

const C_RELATED = levelAPath(ID_RELATED, 'condition');

interface ActiveFixture {
  readonly pack: GroundingContextPack;
  readonly retrieval: RetrievalHarness;
  readonly record: RetrievalDerivationRecord;
  readonly source_attempt_id: ObjectId<'ATT'>;
}

/** A1: builds one pack while every target is still ACTIVE. */
async function packWhileActive(): Promise<ActiveFixture> {
  const { retrieval, record, source_attempt_id } = await seedFixture();
  const outcome = buildGroundingContext({
    owner_id: OWNER_HYPOTHESIS,
    source_attempt_id,
    derivation: record,
    historical_attempts: await allHistoricalOf(retrieval),
    selections: [
      pick(ID_RELATED, C_RELATED, 'grounding'),
      pick(ID_RELATED, levelAPath(ID_RELATED, 'result'), 'support'),
    ],
  });
  assert.equal(outcome.kind, 'built');
  if (outcome.kind !== 'built') {
    throw new Error('unreachable');
  }
  return { pack: outcome.pack, retrieval, record, source_attempt_id };
}

/** The ⑩ rows re-derived against the CURRENT workspace state. */
async function traceabilityNow(
  retrieval: RetrievalHarness,
  pack: GroundingContextPack,
): Promise<ReturnType<typeof deriveTraceabilityView>> {
  const historical = await allHistoricalOf(retrieval);
  const byId = new Map(historical.map((entry) => [entry.attempt.attempt_id, entry]));
  return deriveTraceabilityView(pack.evidence_refs, {
    resolveTarget: (target_id) => byId.get(target_id)?.attempt ?? null,
    resolveAttachedContentItems: (target_id) => byId.get(target_id)?.content_items ?? [],
  });
}

describe('S01｜M7 archive dynamic derivation', () => {
  it('AC-100 / A1: a reference built while the target is active resolves and is not annotated', async () => {
    const { pack, retrieval, record } = await packWhileActive();
    const attempts = await retrieval.repository.listAttempts();
    const target = attempts.find((attempt) => attempt.attempt_id === ID_RELATED);
    assert.equal(target?.archive_state, 'active');
    assert.equal(pack.citation.n_citation, 1);
    /* `N_检索` was copied from the retrieval derivation, never recomputed here. */
    assert.equal(pack.n_retrieval, record.n_retrieval);
    for (const row of pack.traceability) {
      assert.equal(row.resolvable, true);
      if (row.resolvable) {
        assert.equal(row.source_archived, false);
      }
    }
  });

  it('AC-74 / A2–A5: archiving keeps the reference, marks it dynamically and never reduces N_引用', async () => {
    const { pack, retrieval } = await packWhileActive();
    const before = pack.citation.n_citation;
    assert.equal(before, 1);

    await archiveAttempt(retrieval, ID_RELATED);

    const after = await traceabilityNow(retrieval, pack);
    assert.equal(after.length, pack.evidence_refs.length);
    for (const row of after) {
      /* A3: the reference still resolves. */
      assert.equal(row.resolvable, true);
      if (row.resolvable) {
        /* A4: the annotation is derived from the current state, and it is now true. */
        assert.equal(row.source_archived, true);
      }
    }
    /* A5: `N_引用` is a read of the unchanged set, so archiving cannot reduce it. */
    assert.equal(deriveCitationView(OWNER_HYPOTHESIS, pack.evidence_refs).n_citation, before);
    assert.equal(pack.citation.n_citation, before);
  });

  it('AC-74 / A6: the EvidenceRef body carries exactly the five frozen fields, with no archive snapshot', async () => {
    const { pack } = await packWhileActive();
    for (const ref of pack.evidence_refs) {
      assert.deepEqual([...Object.keys(ref)].sort(), [
        'evidence_ref_id',
        'owner_id',
        'role',
        'source_field_path',
        'target_id',
      ]);
      for (const forbidden of ['archived_at_ref', 'was_archived', 'archive_snapshot']) {
        assert.equal(Object.hasOwn(ref, forbidden), false, `${forbidden} must not exist`);
      }
    }
  });

  it('AC-76 / A7: un-archiving removes the annotation with no extra write', async () => {
    const { pack, retrieval } = await packWhileActive();
    const pathsBefore = pack.evidence_refs.map((ref) => ref.source_field_path).join('|');

    await archiveAttempt(retrieval, ID_RELATED);
    const archived = await traceabilityNow(retrieval, pack);
    assert.equal(archived.every((row) => row.resolvable && row.source_archived), true);

    await retrieval.repository.updateAttempt(at(ID_RELATED), { archive_state: 'active' });
    const restored = await traceabilityNow(retrieval, pack);
    for (const row of restored) {
      assert.equal(row.resolvable, true);
      if (row.resolvable) {
        assert.equal(row.source_archived, false);
      }
    }
    /* Neither transition wrote anything into a reference (§7.4 rule 4). */
    assert.equal(pack.evidence_refs.map((ref) => ref.source_field_path).join('|'), pathsBefore);
  });

  it('AC-100 / A8: an unresolvable reference is still listed instead of silently vanishing', async () => {
    const { pack } = await packWhileActive();
    const rows = deriveTraceabilityView(pack.evidence_refs, { resolveTarget: () => null });
    assert.equal(rows.length, pack.evidence_refs.length);
    for (const row of rows) {
      assert.equal(row.resolvable, false);
      assert.equal(row.counted_toward_n_citation, row.role !== 'context');
    }
  });

  it('IMPLEMENTATION INVARIANT（契约 §7.2 / §6.2）/ A9: an archived record is not a NEW grounding source', async () => {
    const { retrieval, source_attempt_id } = await packWhileActive();
    await archiveAttempt(retrieval, ID_RELATED);

    /* Re-run step ⑥: an archived record never joins a NEW retrieval (§6.2 / AC-85). */
    const outcome = await retrieval.service.runRetrievalForFormalAttempt({ source_attempt_id });
    assert.equal(outcome.kind, 'completed');
    if (outcome.kind !== 'completed') {
      return;
    }
    assert.equal(
      outcome.derivation.candidate_entries.some(
        (entry) => entry.candidate_attempt_id === ID_RELATED,
      ),
      false,
    );

    const historical = await allHistoricalOf(retrieval);
    const catalog = buildGroundingSourceCatalog({
      source_attempt_id,
      derivation: outcome.derivation,
      historical_attempts: historical,
    });
    assert.equal(
      catalog.candidates.some((candidate) => candidate.target_id === ID_RELATED),
      false,
    );

    const built = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: outcome.derivation,
      historical_attempts: historical,
      selections: [pick(ID_RELATED, C_RELATED, 'grounding')],
    });
    assert.equal(built.kind, 'invalid');
    if (built.kind !== 'invalid') {
      return;
    }
    assert.deepEqual(
      [...built.rejections.map((rejection) => rejection.code)],
      ['TARGET_NOT_IN_RETRIEVAL_DERIVATION'],
    );
  });
});
