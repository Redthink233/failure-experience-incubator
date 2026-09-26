/**
 * M7-INTEGRATE ｜ Shared `N_引用` derivation: `distinct target_id` semantics.
 *
 * Canonical acceptance points used here: `AC-38` (the `N_检索` / `N_引用` two-tier口径, never
 * mixed), `AC-39` (a pure `context` reference is displayable and never counted), `AC-74`
 * (archiving never retro-reduces an existing `N_引用`), `AC-84` (`N_引用` and the ⑩ list agree).
 * Cases without a precise product AC are declared `IMPLEMENTATION INVARIANT` and cite the Frozen
 * Contract section instead of inventing one.
 *
 * 🔴 `N_引用` = `distinct target_id` over the references whose role is
 *    `grounding` / `support` / `contradict` (契约 §6.1 「记录条数」; `S03-B` §V-4 / §F.2;
 *    `S03-C` §G.3). It is NOT the number of reference rows, and the landing layer
 *    (`Fact` vs `Extraction`) never changes it (§6.3 rule 7).
 * 🔴 This file creates NO new `AC` and no new `Decision`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { EvidenceOwnerId, EvidenceRef, RefRole } from '../../domain/types/evidence-ref.js';
import { deriveNCitationSnapshot } from '../../domain/types/counts.js';

const OWNER = 'HYP_00000000000000000000000001' as EvidenceOwnerId;
const OWNER_OTHER = 'INS_00000000000000000000000001' as EvidenceOwnerId;
const ATT_A = 'ATT_0000000000000000000000000A';
const ATT_B = 'ATT_0000000000000000000000000B';

/** A grounding landing point on a `Fact` content item. */
const FACT_PATH_A = `condition#${ATT_A}:condition`;
/** A support landing point on an `Extraction` content item (attached content-item collection). */
const EXTRACTION_PATH_A = `content_items/note#${ATT_A}:induction`;

function ref(
  evidence_ref_id: string,
  target_id: string,
  role: RefRole,
  source_field_path: string,
  owner_id: EvidenceOwnerId = OWNER,
): EvidenceRef {
  return {
    evidence_ref_id,
    target_id: target_id as ObjectId<'ATT'>,
    source_field_path,
    role,
    owner_id,
  };
}

describe('M7-INTEGRATE｜shared N_引用 derivation counts distinct evidence targets', () => {
  it('AC-38 / N1: a single grounding reference counts as 1', () => {
    const snapshot = deriveNCitationSnapshot(OWNER, [ref('r1', ATT_A, 'grounding', FACT_PATH_A)]);
    assert.equal(snapshot.n_citation, 1);
    assert.deepEqual([...snapshot.counted_ref_ids], ['r1']);
    assert.deepEqual([...snapshot.context_only_ref_ids], []);
    assert.equal(snapshot.owner_id, OWNER);
  });

  it('AC-38 / AC-84 / N2: two references onto ONE record keep 2 counted rows but N_引用 = 1', () => {
    const snapshot = deriveNCitationSnapshot(OWNER, [
      ref('r1', ATT_A, 'grounding', FACT_PATH_A),
      ref('r2', ATT_A, 'support', EXTRACTION_PATH_A),
    ]);
    assert.equal(snapshot.counted_ref_ids.length, 2, 'both rows are counted rows');
    assert.equal(snapshot.n_citation, 1, 'but the RECORD counts once');
    assert.notEqual(snapshot.n_citation, snapshot.counted_ref_ids.length);
  });

  it('AC-38 / N3: two different records count as 2', () => {
    const snapshot = deriveNCitationSnapshot(OWNER, [
      ref('r1', ATT_A, 'grounding', FACT_PATH_A),
      ref('r2', ATT_B, 'grounding', FACT_PATH_A.replace(ATT_A, ATT_B)),
    ]);
    assert.equal(snapshot.n_citation, 2);
  });

  it('AC-39 / N4: pure context references count as 0 and stay displayable', () => {
    const snapshot = deriveNCitationSnapshot(OWNER, [
      ref('r1', ATT_A, 'context', FACT_PATH_A),
      ref('r2', ATT_B, 'context', FACT_PATH_A),
    ]);
    assert.equal(snapshot.n_citation, 0);
    assert.deepEqual([...snapshot.counted_ref_ids], []);
    assert.deepEqual([...snapshot.context_only_ref_ids], ['r1', 'r2']);
  });

  it('AC-39 / N5: grounding plus context on one record yields N_引用 = 1', () => {
    const snapshot = deriveNCitationSnapshot(OWNER, [
      ref('r1', ATT_A, 'grounding', FACT_PATH_A),
      ref('r2', ATT_A, 'context', EXTRACTION_PATH_A),
    ]);
    assert.equal(snapshot.n_citation, 1);
    assert.deepEqual([...snapshot.counted_ref_ids], ['r1']);
    assert.deepEqual([...snapshot.context_only_ref_ids], ['r2']);
  });

  it('AC-38 / N6: support and contradict are counted normally', () => {
    const snapshot = deriveNCitationSnapshot(OWNER, [
      ref('r1', ATT_A, 'support', FACT_PATH_A),
      ref('r2', ATT_B, 'contradict', EXTRACTION_PATH_A),
    ]);
    assert.equal(snapshot.n_citation, 2);
    assert.deepEqual([...snapshot.counted_ref_ids], ['r1', 'r2']);
  });

  it('AC-38 / N7: the landing layer (Fact / Extraction) never changes the count', () => {
    const factOnly = deriveNCitationSnapshot(OWNER, [
      ref('r1', ATT_A, 'grounding', FACT_PATH_A),
      ref('r2', ATT_B, 'support', `condition#${ATT_B}:condition`),
    ]);
    const extractionMixed = deriveNCitationSnapshot(OWNER, [
      ref('r1', ATT_A, 'grounding', EXTRACTION_PATH_A),
      ref('r2', ATT_B, 'support', `content_items/note#${ATT_B}:induction`),
    ]);
    /* Two DIFFERENT landing layers, same roles and targets ⇒ identical derivation. */
    assert.equal(factOnly.n_citation, extractionMixed.n_citation);
    assert.equal(factOnly.n_citation, 2);
    assert.deepEqual([...factOnly.counted_ref_ids], [...extractionMixed.counted_ref_ids]);
    /* And changing ONLY the path of a single reference cannot move the number either. */
    const swapped = deriveNCitationSnapshot(OWNER, [
      ref('r1', ATT_A, 'support', EXTRACTION_PATH_A),
    ]);
    assert.equal(swapped.n_citation, 1);
  });

  it('IMPLEMENTATION INVARIANT（契约 §3.3 / §6.3 rule 8）/ N8: reference ORDER never changes N_引用', () => {
    const rows: readonly EvidenceRef[] = [
      ref('r1', ATT_A, 'grounding', FACT_PATH_A),
      ref('r2', ATT_B, 'support', EXTRACTION_PATH_A),
      ref('r3', ATT_A, 'context', EXTRACTION_PATH_A),
      ref('r4', ATT_B, 'contradict', FACT_PATH_A),
    ];
    const forward = deriveNCitationSnapshot(OWNER, rows);
    const backward = deriveNCitationSnapshot(OWNER, [...rows].reverse());
    assert.equal(forward.n_citation, 2);
    assert.equal(backward.n_citation, forward.n_citation);
    assert.deepEqual(
      [...forward.counted_ref_ids].sort(),
      [...backward.counted_ref_ids].sort(),
    );
    assert.deepEqual(
      [...forward.context_only_ref_ids].sort(),
      [...backward.context_only_ref_ids].sort(),
    );
  });

  it('AC-74 / N9: the derivation reads ONLY the references, so no archive state can move it', () => {
    const rows: readonly EvidenceRef[] = [
      ref('r1', ATT_A, 'grounding', FACT_PATH_A),
      ref('r2', ATT_A, 'support', EXTRACTION_PATH_A),
    ];
    /* The reference body carries exactly the five frozen fields - there is no archive member
       to read, so archiving the target cannot retro-reduce the number (§7.4). */
    for (const row of rows) {
      assert.deepEqual([...Object.keys(row)].sort(), [
        'evidence_ref_id',
        'owner_id',
        'role',
        'source_field_path',
        'target_id',
      ]);
    }
    const before = deriveNCitationSnapshot(OWNER, rows).n_citation;
    const again = deriveNCitationSnapshot(OWNER, rows).n_citation;
    assert.equal(before, 1);
    assert.equal(again, before);
    /* The derivation is nullary in everything but its two declared inputs. */
    assert.equal(deriveNCitationSnapshot.length, 2);
  });

  it('IMPLEMENTATION INVARIANT（契约 §5 冻结形态）/ N10: the snapshot keeps its frozen three fields', () => {
    const snapshot = deriveNCitationSnapshot(OWNER, [ref('r1', ATT_A, 'grounding', FACT_PATH_A)]);
    assert.deepEqual([...Object.keys(snapshot)].sort(), [
      'context_only_ref_ids',
      'counted_ref_ids',
      'n_citation',
      'owner_id',
    ]);
    /* 🔴 No `counted_target_ids` was added to the shared vocabulary (task §5). */
    assert.equal(Object.hasOwn(snapshot, 'counted_target_ids'), false);
    /* The owner id is reported verbatim and the derivation is owner-agnostic in VALUE only by
       construction of the input set - here it must echo whatever it was given. */
    assert.equal(deriveNCitationSnapshot(OWNER_OTHER, []).owner_id, OWNER_OTHER);
    assert.equal(deriveNCitationSnapshot(OWNER_OTHER, []).n_citation, 0);
  });
});
