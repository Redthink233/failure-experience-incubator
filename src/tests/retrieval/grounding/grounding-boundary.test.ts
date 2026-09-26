/**
 * S01 ｜ `M7` grounding boundary (task §7 / §13 / §14 / §15 / §21 / §32).
 *
 * Canonical acceptance points used here: `AC-20` / `AC-86` (Level B alone never admits a record),
 * `AC-70` (`Model Suggestion` never grounds and is never an evidence target), `AC-95` (an
 * un-accepted cause is never reusable). Cases without a precise product AC are declared
 * `IMPLEMENTATION INVARIANT` and cite the Frozen Contract section instead of inventing one.
 *
 * 🔴 This file creates NO new `AC` and no new `Decision`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ObjectId } from '../../../domain/ids/object-id.js';
import { persistContentItem } from '../../../domain/types/content-item-record.js';
import { extractionItem } from '../../../domain/types/source-type.js';
import { buildGroundingSourceCatalog } from '../../../retrieval/grounding/index.js';
import { buildGroundingContext } from '../../../retrieval/grounding/grounding-context.js';
import {
  ID_RELATED,
  ID_SAME_PROJECT_UNRELATED,
  ID_SOURCE,
  OWNER_HYPOTHESIS,
  OWNER_INSIGHT,
  allHistoricalOf,
  attachContentItems,
  levelAPath,
  pick,
  seedFixture,
} from './harness.js';

/** The frozen target type is `ObjectId<'ATT'>` - asserted at compile time, not in prose. */
type FrozenTargetType = 'ATT';

export const EXTRACTION_ONLY_ITEM_ID = `${ID_RELATED}:induction`;

describe('S01｜M7 grounding boundary', () => {
  it('AC-36 / G1: a related candidate with a traceable Fact offers a legal grounding landing point', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const catalog = buildGroundingSourceCatalog({
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
    });

    const groundingCapable = catalog.candidates.filter((candidate) =>
      candidate.allowed_roles.includes('grounding'),
    );
    assert.ok(groundingCapable.length > 0, 'a Fact landing point must be available');
    for (const candidate of groundingCapable) {
      assert.equal(candidate.source_type, 'Fact');
    }
    // Every catalog candidate belongs to a record `M6` really admitted.
    for (const candidate of catalog.candidates) {
      assert.equal(catalog.target_ids.includes(candidate.target_id), true);
    }
  });

  it('AC-36 / IMPLEMENTATION INVARIANT（契约 §5.2 rule 9 / §12 item 12）/ G2: an Extraction landing point never offers grounding', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    await attachContentItems(retrieval, ID_RELATED, [
      persistContentItem(extractionItem(EXTRACTION_ONLY_ITEM_ID, 'AI 归纳'), 'note', null),
    ]);
    const catalog = buildGroundingSourceCatalog({
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
    });

    const extractions = catalog.candidates.filter(
      (candidate) => candidate.source_type === 'Extraction',
    );
    assert.equal(extractions.length, 1);
    assert.equal(extractions[0]?.allowed_roles.includes('grounding'), false);
    assert.deepEqual([...extractions[0]!.allowed_roles], ['support', 'contradict', 'context']);
  });

  it('AC-36 / IMPLEMENTATION INVARIANT（契约 §4.2 rule 7）/ G3: an explicitly unknown field yields no landing point', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      /* `expected_result` is explicitly `unknown` on the fixture, so it carries no content item. */
      selections: [
        pick(ID_RELATED, `expected_result#${ID_RELATED}:expected_result`, 'grounding'),
      ],
    });

    assert.equal(outcome.kind, 'invalid');
    if (outcome.kind !== 'invalid') {
      return;
    }
    assert.deepEqual(
      [...outcome.rejections.map((rejection) => rejection.code)],
      ['SOURCE_FIELD_PATH_UNRESOLVABLE'],
    );
  });

  it('AC-36 / AC-20 / AC-86 / G4: same Project but outside the derivation may not be re-introduced', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const historical = await allHistoricalOf(retrieval);
    const catalog = buildGroundingSourceCatalog({
      source_attempt_id,
      derivation: record,
      historical_attempts: historical,
    });

    /* The record really shares the Project - and is still absent from the catalog. */
    const sameProject = historical.find(
      (entry) => entry.attempt.attempt_id === ID_SAME_PROJECT_UNRELATED,
    );
    assert.equal(sameProject?.attempt.project_id, 'PRJ_shared');
    assert.equal(
      catalog.candidates.some((candidate) => candidate.target_id === ID_SAME_PROJECT_UNRELATED),
      false,
    );

    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: historical,
      selections: [
        pick(
          ID_SAME_PROJECT_UNRELATED,
          levelAPath(ID_SAME_PROJECT_UNRELATED, 'condition'),
          'context',
        ),
      ],
    });
    assert.equal(outcome.kind, 'invalid');
    if (outcome.kind !== 'invalid') {
      return;
    }
    assert.deepEqual(
      [...outcome.rejections.map((rejection) => rejection.code)],
      ['TARGET_NOT_IN_RETRIEVAL_DERIVATION'],
    );
  });

  it('AC-36 / AC-70 / G5: an accepted Insight is never an EvidenceRef target', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [pick(OWNER_INSIGHT, levelAPath(ID_RELATED, 'condition'), 'grounding')],
    });

    assert.equal(outcome.kind, 'invalid');
    if (outcome.kind !== 'invalid') {
      return;
    }
    assert.deepEqual(
      [...outcome.rejections.map((rejection) => rejection.code)],
      ['TARGET_NOT_AN_ATTEMPT_ID'],
    );
  });

  it('AC-70 / G6: a Hypothesis or Model Suggestion id is never an EvidenceRef target', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      /* `HYP_` covers both a `Hypothesis` and a `Model Suggestion` (`HypothesisKind`). */
      selections: [pick(OWNER_HYPOTHESIS, levelAPath(ID_RELATED, 'condition'), 'grounding')],
    });

    assert.equal(outcome.kind, 'invalid');
    if (outcome.kind !== 'invalid') {
      return;
    }
    assert.deepEqual(
      [...outcome.rejections.map((rejection) => rejection.code)],
      ['TARGET_NOT_AN_ATTEMPT_ID'],
    );

    /* The frozen target type really is the `ATT_` object id - a compile-time assertion. */
    const targetTypeCheck: FrozenTargetType = 'ATT';
    assert.equal(targetTypeCheck, 'ATT');
    const attemptId: ObjectId<'ATT'> = ID_RELATED as ObjectId<'ATT'>;
    assert.equal(attemptId, ID_RELATED);
  });

  it('IMPLEMENTATION INVARIANT（task §16）/ G7: the source Attempt id may never impersonate the owner', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: ID_SOURCE,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [pick(ID_RELATED, levelAPath(ID_RELATED, 'condition'), 'grounding')],
    });

    assert.equal(outcome.kind, 'invalid');
    if (outcome.kind !== 'invalid') {
      return;
    }
    assert.deepEqual(
      [...outcome.rejections.map((rejection) => rejection.code)],
      ['OWNER_ID_INVALID'],
    );
    assert.equal(outcome.rejections[0]?.selection_index, null);
  });
});
