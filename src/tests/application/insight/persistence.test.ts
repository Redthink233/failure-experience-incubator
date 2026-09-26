/**
 * S01 ｜ `M8` persistence suite (task §40 `P1`-`P8`, §26, §27; `D-059` / AC-76 / AC-130 / AC-137).
 *
 * 🔴 Local Workspace FILES only - no database of any kind, no physical delete, no version system.
 * 🔴 Identity travels INSIDE the content, so a renamed file still resolves by id.
 * 🔴 No credential is ever persisted, anywhere.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  expectApplied,
  expectGenerated,
  generationAnswer,
  ID_SOURCE,
  insightAnswer,
  seedStandardFixture,
} from './harness.js';
import { findForbiddenPersistedKeys } from '../../../workspace/schema/forbidden-keys.js';
import { findForbiddenInsightDocumentKeys } from '../../../application/insight/persistence.js';

const CREDENTIAL_MARKERS = [
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'authorization',
  'bearer ',
  'secret',
  'password',
  '"credential"',
];

describe('S01 M8 persistence', () => {
  it('P1 / AC-130: a Candidate Insight lands in the Local Workspace as a file pair', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-p1',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);
    const paths = Object.keys(harness.storage.snapshot());
    assert.ok(paths.includes(`insights/${insight.insight_id}.json`));
    assert.ok(paths.includes(`insights/${insight.insight_id}.md`));
    assert.ok(paths.some((path) => path.startsWith('insights/batches/')));
  });

  it('AC-137 / IMPLEMENTATION INVARIANT / P2 / P3 / P5 / P6: everything survives a reload through brand-new objects', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const generated = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-reload',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = generated.insights[0];
    assert.ok(insight !== undefined);
    const accepted = expectApplied(
      await harness.service.acceptInsight({
        operation_id: 'op-reload-accept',
        insight_id: insight.insight_id,
        user_explicitly_accepted: true,
      }),
    );

    /* A brand-new repository AND a brand-new service over the same storage. */
    const reopened = harness.reopenInsightRepository().readById(insight.insight_id);
    const record = await reopened;
    assert.ok(record !== null);
    assert.equal(record.insight.state, 'accepted');
    assert.equal(record.insight.generation_batch, generated.batch.batch_id);
    assert.equal(record.insight.evidence_refs.length, insight.evidence_refs.length);
    assert.deepEqual(record.insight.evidence_refs, insight.evidence_refs);
    assert.deepEqual(record.insight.gate_checks, accepted.insight.gate_checks);

    const view = await harness.reopen().readInsight(insight.insight_id);
    assert.ok(view !== null);
    assert.equal(view.is_experience_asset, true);
    assert.equal(view.citation.n_citation, 1);

    /* P4: the state-event trace survives too. */
    const events = await harness.reopen().listStateEvents(insight.insight_id);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.trigger, 'user_accept');
  });

  it('P7 / AC-130 / ITC-02: no database is involved anywhere', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-p7',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);
    const paths = Object.keys(harness.storage.snapshot());
    for (const path of paths) {
      assert.equal(
        /\.(sqlite|sqlite3|db|duckdb)$/i.test(path),
        false,
        `${path} looks like a database file`,
      );
      assert.equal(/indexeddb|localstorage/i.test(path), false);
    }
    const raw = harness.rawInsightFile(insight.insight_id);
    assert.ok(typeof raw === 'string');
    assert.equal(/sqlite|indexeddb|localstorage|cloud_/i.test(raw), false);
  });

  it('P8 / AC-133 / AC-134: no credential is persisted in ANY generated file', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const generated = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-p8',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = generated.insights[0];
    assert.ok(insight !== undefined);
    await harness.service.acceptInsight({
      operation_id: 'op-p8-accept',
      insight_id: insight.insight_id,
      user_explicitly_accepted: true,
    });

    for (const [path, contents] of Object.entries(harness.storage.snapshot())) {
      for (const marker of CREDENTIAL_MARKERS) {
        assert.equal(
          contents.toLowerCase().includes(marker),
          false,
          `${path} must not carry a credential marker ("${marker}")`,
        );
      }
      if (path.endsWith('.json')) {
        /*
         * 🔴 The `Insight` document is checked with the PATH-SCOPED allowance: `evidence_refs[i].role`
         *    is the FROZEN `EvidenceRef` field (§5.2 rule 1), and every other occurrence of `role` -
         *    as well as every other forbidden key - is still refused.
         */
        const forbidden = path.startsWith('insights/')
          ? findForbiddenInsightDocumentKeys(JSON.parse(contents))
          : findForbiddenPersistedKeys(JSON.parse(contents));
        assert.deepEqual(forbidden, []);
      }
    }
  });

  it('IMPLEMENTATION INVARIANT（§12 item 10）: only the frozen `EvidenceRef.role` is exempted', () => {
    assert.deepEqual(findForbiddenInsightDocumentKeys({ evidence_refs: [{ role: 'grounding' }] }), []);
    assert.deepEqual(findForbiddenPersistedKeys({ evidence_refs: [{ role: 'grounding' }] }), [
      'evidence_refs[0].role',
    ]);
    /* Any other position, and any other forbidden key, is still caught. */
    assert.deepEqual(findForbiddenInsightDocumentKeys({ role: 'admin' }), ['role']);
    assert.deepEqual(findForbiddenInsightDocumentKeys({ gate_checks: [{ role: 'grounding' }] }), [
      'gate_checks[0].role',
    ]);
    assert.deepEqual(findForbiddenInsightDocumentKeys({ roles: ['a'] }), ['roles']);
    assert.deepEqual(findForbiddenInsightDocumentKeys({ evidence_refs: [{ secret: 'x' }] }), [
      'evidence_refs[0].secret',
    ]);
  });

  it('P1 / AC-137: a renamed document is still resolved by the id inside its content', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-rename',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);
    await harness.storage.move(
      `insights/${insight.insight_id}.json`,
      'insights/a-human-renamed-file.json',
    );

    const record = await harness.insights.readById(insight.insight_id);
    assert.ok(record !== null);
    assert.equal(record.insight.insight_id, insight.insight_id);
    /* 🔴 And an update writes back to the discovered path instead of creating a second record. */
    await harness.insights.update(insight.insight_id, { proposition: '在当前条件下，颜色变化仍高于目标范围。' });
    const json_files = harness.insightFiles();
    assert.equal(json_files.length, 1);
    assert.ok(json_files[0]?.endsWith('a-human-renamed-file.json'));
  });

  it('IMPLEMENTATION INVARIANT（§26）: the persisted document carries exactly the fields the contract requires', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    const outcome = expectGenerated(
      await harness.service.generateCandidateInsights({
        operation_id: 'op-fields',
        source_attempt_id: ID_SOURCE as never,
      }),
    );
    const insight = outcome.insights[0];
    assert.ok(insight !== undefined);
    const raw = harness.rawInsightFile(insight.insight_id);
    assert.ok(typeof raw === 'string');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of [
      'object_type',
      'schema_version',
      'insight_id',
      'attempt_id',
      'state',
      'proposition',
      'applicable_scope',
      'evidence_refs',
      'judgment_basis',
      'gate_checks',
      'generation_batch',
      'comparison_ref',
      'created_at',
      'updated_at',
    ]) {
      assert.ok(key in parsed, `the persisted document must carry "${key}"`);
    }
    /* 🔴 No physical delete and no cloud/account/team field exists. */
    assert.deepEqual(findForbiddenInsightDocumentKeys(parsed), []);
  });

  it('§27 / AC-76 / AC-122: neither the repository nor the service exposes a delete or a history capability', async () => {
    const { harness } = await seedStandardFixture({ generation: generationAnswer([insightAnswer()]) });
    for (const surface of [harness.insights, harness.service]) {
      for (const member of Object.keys(surface)) {
        assert.equal(
          /^(delete|remove|purge|clear|rollback|restore|history|revert)/i.test(member),
          false,
          `"${member}" must not exist: V1 has no physical delete and no version system`,
        );
      }
    }
  });
});
