/**
 * M7-INTEGRATE ｜ Cross-consistency between the shared `N_引用` derivation and `M7`.
 *
 * Covers task §7 `N9`: for ONE `EvidenceRef[]` input, `deriveNCitationSnapshot(...).n_citation`
 * must equal `deriveCitationView(...).n_citation` - and it must hold both on a hand-built set and
 * on a REAL `M7` pack.
 *
 * Canonical acceptance points used here: `AC-38` (`N_检索` / `N_引用` two-tier口径), `AC-84`
 * (`N_引用` and the ⑩ list agree).
 *
 * 🔴 DIRECTION DISCIPLINE: this file lives in the TEST layer, which is the only place allowed to
 *    import both sides. `src/domain/**` must never import `src/retrieval/**` - the last case
 *    asserts that structurally, so the consistency above can never be turned into a production
 *    dependency by a later edit.
 * 🔴 This file creates NO new `AC` and no new `Decision`, and changes no `M7` behaviour.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ObjectId } from '../../../domain/ids/object-id.js';
import type { EvidenceOwnerId, EvidenceRef, RefRole } from '../../../domain/types/evidence-ref.js';
import { deriveNCitationSnapshot } from '../../../domain/types/counts.js';
import { deriveCitationView, deriveNCitation } from '../../../retrieval/grounding/citation.js';
import {
  ID_RELATED,
  ID_RELATED_SECOND,
  ID_UNKNOWN,
  allHistoricalOf,
  levelAPath,
  pick,
  seedFixture,
} from './harness.js';
import { buildGroundingContext } from '../../../retrieval/grounding/index.js';

const OWNER = 'HYP_00000000000000000000000001' as EvidenceOwnerId;
const ATT_A = 'ATT_0000000000000000000000000A';
const ATT_B = 'ATT_0000000000000000000000000B';

function ref(
  evidence_ref_id: string,
  target_id: string,
  role: RefRole,
  source_field_path: string,
): EvidenceRef {
  return {
    evidence_ref_id,
    target_id: target_id as ObjectId<'ATT'>,
    source_field_path,
    role,
    owner_id: OWNER,
  };
}

/**
 * A deliberately awkward set: one record referenced twice with two different roles, a second
 * record, a duplicate-target contradiction and two pure context rows.
 */
const REFS: readonly EvidenceRef[] = [
  ref('r1', ATT_A, 'grounding', `condition#${ATT_A}:condition`),
  ref('r2', ATT_A, 'support', `content_items/note#${ATT_A}:induction`),
  ref('r3', ATT_B, 'contradict', `actual_result#${ATT_B}:result`),
  ref('r4', ATT_B, 'context', `goal#${ATT_B}:goal`),
  ref('r5', ATT_A, 'context', `goal#${ATT_A}:goal`),
];

describe('M7-INTEGRATE｜shared helper and M7 derive the same N_引用', () => {
  it('AC-38 / AL1: on a hand-built set both derivations agree', () => {
    const shared = deriveNCitationSnapshot(OWNER, REFS);
    const m7 = deriveCitationView(OWNER, REFS);

    assert.equal(shared.n_citation, 2);
    assert.equal(m7.n_citation, 2);
    assert.equal(shared.n_citation, m7.n_citation);
    assert.equal(deriveNCitation(OWNER, REFS), shared.n_citation);
    /* Both views list ALL counted reference ROWS … */
    assert.deepEqual([...shared.counted_ref_ids], [...m7.counted_ref_ids]);
    assert.equal(shared.counted_ref_ids.length, 3);
    /* … and both exclude every pure context row. */
    assert.deepEqual([...shared.context_only_ref_ids], [...m7.context_only_ref_ids]);
    assert.equal(shared.context_only_ref_ids.length, 2);
  });

  it('AC-84 / AL2: agreement survives an order change and a per-record duplication', () => {
    const reversed = [...REFS].reverse();
    assert.equal(
      deriveNCitationSnapshot(OWNER, reversed).n_citation,
      deriveCitationView(OWNER, reversed).n_citation,
    );
    /* One record, four counted rows in four different roles ⇒ still 1. */
    const oneRecord: readonly EvidenceRef[] = [
      ref('r1', ATT_A, 'grounding', `condition#${ATT_A}:condition`),
      ref('r2', ATT_A, 'support', `actual_result#${ATT_A}:result`),
      ref('r3', ATT_A, 'contradict', `actual_attempt#${ATT_A}:approach`),
      ref('r4', ATT_A, 'context', `goal#${ATT_A}:goal`),
    ];
    assert.equal(deriveNCitationSnapshot(OWNER, oneRecord).n_citation, 1);
    assert.equal(deriveCitationView(OWNER, oneRecord).n_citation, 1);
  });

  it('AC-38 / AC-84 / AL3: agreement holds on a REAL M7 pack built from an M6 derivation', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [
        pick(ID_RELATED, levelAPath(ID_RELATED, 'condition'), 'grounding'),
        pick(ID_RELATED, levelAPath(ID_RELATED, 'result'), 'support'),
        pick(ID_RELATED_SECOND, levelAPath(ID_RELATED_SECOND, 'goal'), 'contradict'),
        pick(ID_UNKNOWN, levelAPath(ID_UNKNOWN, 'goal'), 'context'),
      ],
    });
    assert.equal(outcome.kind, 'built');
    if (outcome.kind !== 'built') {
      return;
    }
    const { pack } = outcome;

    /* The pack really exercises the dedup path: 4 rows, but only 3 counted rows … */
    assert.equal(pack.evidence_refs.length, 4);
    assert.equal(pack.citation.counted_ref_ids.length, 3);
    assert.equal(pack.citation.context_only_ref_ids.length, 1);
    /* … and exactly 2 distinct records behind them, because ID_RELATED owns two of the rows. */
    assert.equal(pack.citation.n_citation, 2);

    const shared = deriveNCitationSnapshot(pack.owner_id, pack.evidence_refs);
    assert.equal(shared.n_citation, pack.citation.n_citation);
    assert.equal(shared.n_citation, deriveNCitation(pack.owner_id, pack.evidence_refs));
    assert.deepEqual([...shared.counted_ref_ids], [...pack.citation.counted_ref_ids]);
    assert.deepEqual(
      [...shared.context_only_ref_ids],
      [...pack.citation.context_only_ref_ids],
    );
    /* And the shared number equals the DISTINCT target count, not the row count. */
    assert.equal(
      shared.n_citation,
      new Set(pack.evidence_refs.filter((row) => row.role !== 'context').map((row) => row.target_id))
        .size,
    );
    assert.notEqual(shared.n_citation, shared.counted_ref_ids.length);
  });

  it('IMPLEMENTATION INVARIANT（migration head rule / Gate C Plan §I.1）/ AL4: the domain layer still imports no retrieval module', () => {
    const repo_root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
    const domain_dir = join(repo_root, 'src', 'domain');

    const listFiles = (directory: string): readonly string[] => {
      const files: string[] = [];
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          files.push(...listFiles(path));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(path);
        }
      }
      return files;
    };

    const files = listFiles(domain_dir);
    assert.ok(files.length >= 10, `expected domain files, found ${files.length}`);
    for (const path of files) {
      const source = readFileSync(path, 'utf8');
      for (const specifier of [...source.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1] ?? '')) {
        assert.equal(
          specifier.includes('retrieval'),
          false,
          `${relative(repo_root, path)} must not depend on the retrieval layer ("${specifier}")`,
        );
        assert.equal(
          specifier.includes('grounding'),
          false,
          `${relative(repo_root, path)} must not depend on M7 ("${specifier}")`,
        );
      }
    }
  });

  it('IMPLEMENTATION INVARIANT（task §5）/ AL5: the shared helper stays free of a second snapshot vocabulary', () => {
    const repo_root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
    const raw = readFileSync(join(repo_root, 'src', 'domain', 'types', 'counts.ts'), 'utf8');
    /* Comments are stripped first: a docstring may EXPLAIN that a field was not added. */
    const counts = raw
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n')
      .map((line) => {
        const index = line.indexOf('//');
        return index < 0 ? line : line.slice(0, index);
      })
      .join('\n');

    assert.ok(raw.includes('counted_target_ids'), 'the prohibition is documented, not silent');
    /* No rival object and no extra field were introduced to express the dedup. */
    for (const forbidden of ['counted_target_ids', 'CitationRef', 'GroundingRef', 'EvidenceLink']) {
      assert.equal(counts.includes(forbidden), false, `counts.ts must not contain "${forbidden}"`);
    }
    /* The derivation still reuses the frozen role rule instead of restating it. */
    assert.ok(counts.includes('countsTowardNCitation('));
    assert.equal(counts.includes("'grounding'"), false, 'the role vocabulary is not re-spelled');
    /* The snapshot type really has the frozen field set and nothing more. */
    const fields = /interface NCitationSnapshot \{([\s\S]*?)\n\}/.exec(counts);
    assert.ok(fields !== null, 'NCitationSnapshot must be declared');
    const declared = [...(fields[1] ?? '').matchAll(/readonly\s+(\w+)\s*:/g)].map((m) => m[1]);
    assert.deepEqual([...declared], [
      'owner_id',
      'n_citation',
      'counted_ref_ids',
      'context_only_ref_ids',
    ]);
  });
});
