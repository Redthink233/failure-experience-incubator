/**
 * S01 ｜ `M7` reference rules (task §6–§11 / §28).
 *
 * Canonical acceptance points used here: `AC-31` (the ⑩ list resolves back to a real `Fact` entry
 * of the referenced `Formal Attempt`), `AC-39` (a pure `context` reference is displayable, labelled
 * 「上下文」 and never counted), `AC-95` (an un-accepted decision `Inference` is never reusable as a
 * confirmed basis). Cases without a precise product AC are declared `IMPLEMENTATION INVARIANT` and
 * cite the Frozen Contract section instead of inventing one (task §36).
 *
 * 🔴 This file creates NO new `AC` and no new `Decision`.
 * 🔴 Every fixture is a hand-written record driven through the real repository. No model is called
 *    and no model behaviour is claimed (`NOT_A_REAL_LLM_OUTPUT`).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { persistContentItem } from '../../../domain/types/content-item-record.js';
import { decisionInferenceItem, extractionItem } from '../../../domain/types/source-type.js';
import {
  attachedContentItemsPath,
  buildGroundingSourceCatalog,
  resolveSourceFieldPath,
} from '../../../retrieval/grounding/index.js';
import { buildGroundingContext } from '../../../retrieval/grounding/grounding-context.js';
import {
  ID_DRAFT,
  ID_RELATED,
  ID_RELATED_SECOND,
  ID_UNRELATED,
  OWNER_HYPOTHESIS,
  allHistoricalOf,
  attachContentItems,
  levelAPath,
  pick as selection,
  seedFixture,
} from './harness.js';

const INFERENCE_ITEM_ID = `${ID_RELATED}:cause:1`;
const INFERENCE_PATH = `${attachedContentItemsPath('candidate_cause')}#${INFERENCE_ITEM_ID}`;
const EXTRACTION_ITEM_ID = `${ID_RELATED}:induction`;
const EXTRACTION_PATH = `${attachedContentItemsPath('note')}#${EXTRACTION_ITEM_ID}`;

/**
 * Attaches a step ④ candidate failure cause: an `Inference|decision`, `unresolved` by default
 * (docs/02 §C.4.3 / `D-048`).
 */
async function attachInference(): Promise<ReturnType<typeof seedFixture>> {
  const fixture = await seedFixture();
  await attachContentItems(fixture.retrieval, ID_RELATED, [
    persistContentItem(
      decisionInferenceItem(INFERENCE_ITEM_ID, '候选失败原因：条件可能不足', 'unresolved'),
      'candidate_cause',
      null,
    ),
  ]);
  return fixture;
}

async function attachExtraction(): Promise<ReturnType<typeof seedFixture>> {
  const fixture = await seedFixture();
  await attachContentItems(fixture.retrieval, ID_RELATED, [
    persistContentItem(extractionItem(EXTRACTION_ITEM_ID, 'AI 归纳：条件可能不足'), 'note', null),
  ]);
  return fixture;
}

describe('S01｜M7 EvidenceRef construction rules', () => {
  it('AC-31 / E1: a Formal Attempt inside the derivation with a Fact landing point is referenceable', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [selection(ID_RELATED, levelAPath(ID_RELATED, 'condition'), 'grounding')],
    });

    assert.equal(outcome.kind, 'built');
    if (outcome.kind !== 'built') {
      return;
    }
    assert.equal(outcome.pack.evidence_refs.length, 1);
    const ref = outcome.pack.evidence_refs[0];
    assert.equal(ref?.target_id, ID_RELATED);
    assert.equal(ref?.role, 'grounding');
    assert.equal(ref?.owner_id, OWNER_HYPOTHESIS);
    assert.equal(outcome.pack.has_grounding_reference, true);
    assert.deepEqual([...outcome.pack.grounding_target_ids], [ID_RELATED]);
  });

  it('AC-36 / IMPLEMENTATION INVARIANT（契约 §5.2 rule 4 / §7.2）/ E2: a Draft is never an EvidenceRef target', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [selection(ID_DRAFT, levelAPath(ID_DRAFT, 'condition'), 'grounding')],
    });

    assert.equal(outcome.kind, 'invalid');
    if (outcome.kind !== 'invalid') {
      return;
    }
    assert.deepEqual(
      [...outcome.rejections.map((rejection) => rejection.code)],
      ['TARGET_NOT_FORMAL'],
    );
  });

  it('AC-36 / AC-20 / AC-86 / E3: a Formal record outside the M6 related set may not be referenced', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [selection(ID_UNRELATED, levelAPath(ID_UNRELATED, 'condition'), 'context')],
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

  it('IMPLEMENTATION INVARIANT（契约 §5.1 / TQ17 round-trip）/ E4: every catalog path resolves back to its own content item', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const historical = await allHistoricalOf(retrieval);
    const catalog = buildGroundingSourceCatalog({
      source_attempt_id,
      derivation: record,
      historical_attempts: historical,
    });

    assert.ok(catalog.candidates.length > 0, 'the fixture must expose addressable content');
    const byTarget = new Map(historical.map((entry) => [entry.attempt.attempt_id, entry]));
    for (const candidate of catalog.candidates) {
      const entry = byTarget.get(candidate.target_id);
      assert.ok(entry !== undefined);
      const resolved = resolveSourceFieldPath(
        entry.attempt,
        entry.content_items ?? [],
        candidate.source_field_path,
      );
      assert.ok(resolved !== null, `${candidate.source_field_path} must round-trip`);
      assert.equal(resolved.content_item_id, candidate.content_item_id);
      assert.equal(resolved.source_type, candidate.source_type);
      assert.equal(resolved.value, candidate.value);
    }
  });

  it('IMPLEMENTATION INVARIANT（契约 §5.1）/ E5: a non-existent landing point is refused, never guessed', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [selection(ID_RELATED, `goal#${ID_RELATED}:no_such_item`, 'grounding')],
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

  it('AC-95 / E6: an Inference landing point is refused whatever its confirmation state', async () => {
    const { retrieval, record, source_attempt_id } = await attachInference();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [selection(ID_RELATED, INFERENCE_PATH, 'context')],
    });

    assert.equal(outcome.kind, 'invalid');
    if (outcome.kind !== 'invalid') {
      return;
    }
    assert.deepEqual(
      [...outcome.rejections.map((rejection) => rejection.code)],
      ['SOURCE_CONTENT_IS_INFERENCE'],
    );

    // The same Inference item is also absent from the catalog candidate list (reported as excluded).
    const catalog = buildGroundingSourceCatalog({
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
    });
    assert.equal(
      catalog.candidates.some((candidate) => candidate.content_item_id === INFERENCE_ITEM_ID),
      false,
    );
    assert.ok(
      catalog.excluded.some((entry) => entry.content_item_id === INFERENCE_ITEM_ID),
      'an excluded Inference must be reported instead of silently dropped',
    );
  });

  it('AC-31 / E7: role = grounding on a Fact landing point is accepted', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [
        selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding'),
        selection(ID_RELATED_SECOND, levelAPath(ID_RELATED_SECOND, 'goal'), 'grounding'),
      ],
    });

    assert.equal(outcome.kind, 'built');
    if (outcome.kind !== 'built') {
      return;
    }
    assert.equal(outcome.pack.citation.n_citation, 2);
  });

  it('IMPLEMENTATION INVARIANT（契约 §5.2 rule 9）/ E8: role = grounding on an Extraction is refused', async () => {
    const { retrieval, record, source_attempt_id } = await attachExtraction();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [selection(ID_RELATED, EXTRACTION_PATH, 'grounding')],
    });

    assert.equal(outcome.kind, 'invalid');
    if (outcome.kind !== 'invalid') {
      return;
    }
    assert.deepEqual(
      [...outcome.rejections.map((rejection) => rejection.code)],
      ['GROUNDING_REQUIRES_FACT'],
    );
  });

  it('IMPLEMENTATION INVARIANT（契约 §5.2 rule 10）/ E9: an Extraction may carry support', async () => {
    const { retrieval, record, source_attempt_id } = await attachExtraction();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [selection(ID_RELATED, EXTRACTION_PATH, 'support')],
    });

    assert.equal(outcome.kind, 'built');
    if (outcome.kind !== 'built') {
      return;
    }
    const row = outcome.pack.traceability[0];
    assert.equal(row?.resolvable, true);
    if (row?.resolvable !== true) {
      return;
    }
    assert.equal(row.content_source_type, 'Extraction');
    assert.equal(row.counted_toward_n_citation, true);
    assert.equal(outcome.pack.citation.n_citation, 1);
  });

  it('AC-39 / E10: an Extraction may carry context, is labelled 「上下文」 by role and is never counted', async () => {
    const { retrieval, record, source_attempt_id } = await attachExtraction();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [selection(ID_RELATED, EXTRACTION_PATH, 'context')],
    });

    assert.equal(outcome.kind, 'built');
    if (outcome.kind !== 'built') {
      return;
    }
    assert.equal(outcome.pack.citation.n_citation, 0);
    assert.equal(outcome.pack.citation.context_only_ref_ids.length, 1);
    assert.equal(outcome.pack.traceability[0]?.counted_toward_n_citation, false);
    assert.equal(outcome.pack.traceability[0]?.role, 'context');
  });
});
