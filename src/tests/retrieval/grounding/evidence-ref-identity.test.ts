/**
 * S01 ｜ `M7` reference identity (task §17 / §33).
 *
 * Canonical acceptance points used here: `AC-137` (identity is carried in the CONTENT, so renaming
 * or moving a file never breaks resolution), `AC-122` (no user-visible version / revision number).
 * Cases without a precise product AC are declared `IMPLEMENTATION INVARIANT` and cite the Frozen
 * Contract section instead of inventing one.
 *
 * 🔴 `evidence_ref_id` must be unique, stable, never reused and NEVER positional: no array index,
 *    no reference sequence number, no current reference count, no sorting position.
 * 🔴 This file creates NO new `AC` and no new `Decision`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { persistContentItem } from '../../../domain/types/content-item-record.js';
import { factItem } from '../../../domain/types/source-type.js';
import { resolveSourceFieldPath } from '../../../retrieval/grounding/addressable.js';
import { buildGroundingContext } from '../../../retrieval/grounding/grounding-context.js';
import {
  EVIDENCE_REF_ID_PREFIX,
  isEvidenceRefId,
  newEvidenceRefId,
  toEvidenceOwnerId,
} from '../../../retrieval/grounding/identity.js';
import {
  ID_RELATED,
  ID_SOURCE,
  OWNER_HYPOTHESIS,
  OWNER_INSIGHT,
  allHistoricalOf,
  at,
  attachContentItems,
  levelAPath,
  pick,
  seedFixture,
} from './harness.js';
import { attemptsDirectory } from '../../../workspace/schema/paths.js';

describe('S01｜M7 EvidenceRef identity', () => {
  it('IMPLEMENTATION INVARIANT（契约 §3.2 rule 1 / task §33 ID1）/ ID1: ids are unique and well formed', () => {
    const ids = new Set<string>();
    for (let index = 0; index < 500; index += 1) {
      const id = newEvidenceRefId();
      assert.equal(isEvidenceRefId(id), true, `${id} must be well formed`);
      assert.equal(id.startsWith(`${EVIDENCE_REF_ID_PREFIX}_`), true);
      ids.add(id);
    }
    assert.equal(ids.size, 500, 'every minted id must be unique');
    assert.equal(isEvidenceRefId('ATT_0000000000000000000000000S'), false);
    assert.equal(isEvidenceRefId('EREF_'), false);
  });

  it('IMPLEMENTATION INVARIANT（契约 §3.2 rule 2 / task §33 ID2）/ ID2: identity can never read a position', () => {
    /* The factory is NULLARY: identity structurally cannot depend on an index or a count. */
    assert.equal(newEvidenceRefId.length, 0);
    /* And two different landing points always obtain different ids, even built back to back. */
    const first = newEvidenceRefId();
    const second = newEvidenceRefId();
    assert.notEqual(first, second);
  });

  it('IMPLEMENTATION INVARIANT（task §33 ID3 / §25 of the pack）/ ID3: neither the landing point nor its id depends on order', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const historical = await allHistoricalOf(retrieval);
    const forward = [
      pick(ID_RELATED, levelAPath(ID_RELATED, 'condition'), 'grounding'),
      pick(ID_RELATED, levelAPath(ID_RELATED, 'result'), 'context'),
    ];
    const build = (selections: typeof forward): ReturnType<typeof buildGroundingContext> =>
      buildGroundingContext({
        owner_id: OWNER_HYPOTHESIS,
        source_attempt_id,
        derivation: record,
        historical_attempts: historical,
        selections,
      });

    const first = build(forward);
    const second = build([...forward].reverse());
    assert.equal(first.kind, 'built');
    assert.equal(second.kind, 'built');
    if (first.kind !== 'built' || second.kind !== 'built') {
      return;
    }

    /* The landing points are the same SET in both builds - order changes presentation, not identity. */
    assert.deepEqual(
      [...first.pack.evidence_refs.map((ref) => ref.source_field_path)].sort(),
      [...second.pack.evidence_refs.map((ref) => ref.source_field_path)].sort(),
    );
    /* But no id is a reusable positional token: the two builds share no id at all. */
    const firstIds = new Set(first.pack.evidence_refs.map((ref) => ref.evidence_ref_id));
    for (const ref of second.pack.evidence_refs) {
      assert.equal(firstIds.has(ref.evidence_ref_id), false);
    }
    /* The reported order follows the REQUEST order, which is a presentation concern only. */
    assert.deepEqual(
      [...second.pack.evidence_refs.map((ref) => ref.source_field_path)],
      [...forward].reverse().map((selection) => selection.source_field_path),
    );
  });

  it('IMPLEMENTATION INVARIANT（task §33 ID4）/ ID4: identical text on different landing points yields different identities', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    /* Two Fact items carrying byte-identical text, under different canonical field keys. */
    await attachContentItems(retrieval, ID_RELATED, [
      persistContentItem(factItem(`${ID_RELATED}:dupA`, '同一段文字'), 'note', null),
      persistContentItem(factItem(`${ID_RELATED}:dupB`, '同一段文字'), 'failure_tag', null),
    ]);
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [
        pick(ID_RELATED, `content_items/note#${ID_RELATED}:dupA`, 'context'),
        pick(ID_RELATED, `content_items/failure_tag#${ID_RELATED}:dupB`, 'context'),
      ],
    });
    assert.equal(outcome.kind, 'built');
    if (outcome.kind !== 'built') {
      return;
    }
    const [first, second] = outcome.pack.evidence_refs;
    assert.ok(first !== undefined && second !== undefined);
    assert.notEqual(first.evidence_ref_id, second.evidence_ref_id);
    /* One record, two references: the record is still counted once. */
    assert.equal(outcome.pack.citation.n_citation, 0);
    assert.equal(outcome.pack.citation.context_only_ref_ids.length, 2);
  });

  it('AC-137 / ID5: renaming and MOVING the target files never breaks reference resolution', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const before = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [pick(ID_RELATED, levelAPath(ID_RELATED, 'condition'), 'grounding')],
    });
    assert.equal(before.kind, 'built');
    if (before.kind !== 'built') {
      return;
    }
    const ref = before.pack.evidence_refs[0];
    assert.ok(ref !== undefined);

    /* Move BOTH members of the pair to another bucket under arbitrary names. */
    const pair = await retrieval.repository.resolveAttemptPaths(at(ID_RELATED));
    assert.ok(pair !== null);
    const targetBucket = attemptsDirectory('PRJ_relocated');
    await retrieval.storage.move(pair.sidecar_path, `${targetBucket}/some-other-name.json`);
    assert.ok(pair.markdown_path !== null);
    await retrieval.storage.move(pair.markdown_path, `${targetBucket}/some-other-name.md`);

    /* Resolution is by CONTENT, so the reference still resolves - and to the same content item. */
    const after = await retrieval.repository.readAttempt(at(ID_RELATED));
    assert.ok(after !== null);
    assert.equal(after.attempt_id, ID_RELATED);
    const landing = resolveSourceFieldPath(
      after,
      await retrieval.repository.readAttemptContentItems(at(ID_RELATED)),
      ref.source_field_path,
    );
    assert.ok(landing !== null);
    assert.equal(landing.content_item_id, `${ID_RELATED}:condition`);
    assert.equal(ref.target_id, ID_RELATED);
  });

  it('IMPLEMENTATION INVARIANT（task §16 / task §17）/ ID6: the owner is an INS_ / HYP_ id and the prefix stays M7-local', () => {
    assert.equal(toEvidenceOwnerId(OWNER_INSIGHT), OWNER_INSIGHT);
    assert.equal(toEvidenceOwnerId(OWNER_HYPOTHESIS), OWNER_HYPOTHESIS);
    assert.equal(toEvidenceOwnerId(ID_SOURCE), null);
    assert.equal(toEvidenceOwnerId('EREF_00000000000000000000000000'), null);
    /* The global object-id prefix table is untouched: `EREF` is not a member of it. */
    assert.equal(EVIDENCE_REF_ID_PREFIX, 'EREF');
  });
});
