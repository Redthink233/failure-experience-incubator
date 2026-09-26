/**
 * T10 (schema face) ｜ Workspace physical schema minimum + persistence red lines.
 *
 * ITC-02 / ITC-08 (persistence) and the persisted-schema red lines.
 * Canonical AC references used by this file:
 *   AC-04 / AC-122 / AC-129 / AC-130 / AC-131 / AC-133 / AC-134 / AC-137 / AC-138.
 * 🔴 This file creates NO new AC.
 *
 * Gate C Plan §J.1 / D-059: `workspace.json` + `projects/<id>/project.json` +
 * `attempts/<id>.md` + `<id>.json`. `Markdown + JSON / sidecar metadata` is a TECHNICAL
 * DEFAULT and MUST NOT become an immutable product Decision.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import {
  assertValidWorkspacePath,
  isValidWorkspacePath,
  joinWorkspacePath,
  extensionOfWorkspacePath,
  baseNameOfWorkspacePath,
} from '../../workspace/storage.js';
import {
  ensureWorkspace,
  initializeWorkspace,
  parseWorkspaceMetadata,
  registerProjectInIndex,
  serializeWorkspaceMetadata,
  WORKSPACE_SCHEMA_VERSION,
} from '../../workspace/schema/workspace-metadata.js';
import { WORKSPACE_METADATA_FILE } from '../../workspace/schema/paths.js';
import {
  parseProjectMetadata,
  serializeProjectMetadata,
} from '../../workspace/schema/project-metadata.js';
import {
  FORBIDDEN_PERSISTED_KEYS,
  findForbiddenPersistedKeys,
  findForbiddenPersistedKeysInJson,
} from '../../workspace/schema/forbidden-keys.js';
import { WorkspaceSchemaError } from '../../workspace/schema/schema-error.js';
import {
  parseAttemptMarkdownFrontMatter,
  parseAttemptSidecar,
  serializeAttemptMarkdown,
  serializeAttemptSidecar,
} from '../../workspace/schema/attempt-record.js';
import { makeFormal } from '../domain/fixtures.js';

describe('Workspace physical schema｜workspace.json / project.json / attempt pair', () => {
  it('[AC-129] workspace.json carries schema_version + workspace_id + a minimal project index', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const metadata = await initializeWorkspace(storage, {
      workspace_id: 'WS_00000000000000000000000009',
      name: 'S01-01 test workspace',
      created_at: '2026-09-24T00:00:00.000Z',
    });

    assert.equal(metadata.schema_version, WORKSPACE_SCHEMA_VERSION);
    assert.ok(await storage.exists(WORKSPACE_METADATA_FILE));

    const raw = await storage.readFile(WORKSPACE_METADATA_FILE);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    assert.deepEqual(Object.keys(parsed).sort(), [
      'created_at',
      'name',
      'projects',
      'schema_version',
      'workspace_id',
    ]);
    assert.deepEqual(parsed['projects'], []);
    assert.equal(parsed['workspace_id'], 'WS_00000000000000000000000009');

    // Round-trips exactly.
    assert.deepEqual(parseWorkspaceMetadata(raw), metadata);
  });

  it('[AC-131] no cloud / user account / team / role reference may be persisted', async () => {
    const storage = new InMemoryWorkspaceStorage();
    await ensureWorkspace(storage);
    await registerProjectInIndex(storage, { project_id: 'PRJ_ALPHA', name: 'Alpha' });

    const workspaceJson = await storage.readFile(WORKSPACE_METADATA_FILE);
    assert.deepEqual(findForbiddenPersistedKeysInJson(workspaceJson), []);

    for (const key of ['cloud_account', 'user_id', 'team', 'role', 'permission', 'tenant']) {
      assert.ok(FORBIDDEN_PERSISTED_KEYS.includes(key));
    }
    // `cloud` never appears as a value either.
    assert.ok(!workspaceJson.includes('cloud'));
    assert.ok(!workspaceJson.includes('postgres'));
  });

  it('[AC-133][AC-134] no credential material may ever be persisted', () => {
    for (const key of ['api_key', 'credential', 'access_token', 'secret', 'password']) {
      assert.ok(FORBIDDEN_PERSISTED_KEYS.includes(key));
    }
    const workspaceJson = serializeWorkspaceMetadata({
      schema_version: WORKSPACE_SCHEMA_VERSION,
      workspace_id: 'WS_00000000000000000000000009',
      name: null,
      created_at: '2026-09-24T00:00:00.000Z',
      projects: [],
    });
    for (const key of ['api_key', 'credential', 'secret', 'password', 'token']) {
      assert.ok(!workspaceJson.includes(key));
    }
  });

  it('[AC-122] the only version-ish persisted key is the technical schema_version', () => {
    const workspaceJson = serializeWorkspaceMetadata({
      schema_version: WORKSPACE_SCHEMA_VERSION,
      workspace_id: 'WS_00000000000000000000000009',
      name: null,
      created_at: '2026-09-24T00:00:00.000Z',
      projects: [],
    });
    const keysWithVersion = Object.keys(JSON.parse(workspaceJson) as Record<string, unknown>).filter(
      (key) => /version|revision/i.test(key),
    );
    assert.deepEqual(keysWithVersion, ['schema_version']);
    // 🔴 The product version-system vocabulary does not exist in the schema.
    for (const key of ['version', 'version_number', 'revision', 'rollback', 'diff', 'edit_count']) {
      assert.ok(!workspaceJson.includes(`"${key}"`));
    }
  });

  it('[AC-138] the Attempt pair stores archive_state / source_type / decision_state / data_source_nature', () => {
    const sidecar = serializeAttemptSidecar(makeFormal({ archive_state: 'archived' }));
    const parsed = JSON.parse(sidecar) as Record<string, unknown>;

    assert.equal(parsed['object_type'], 'Attempt');
    assert.equal(parsed['schema_version'], WORKSPACE_SCHEMA_VERSION);
    assert.equal(parsed['archive_state'], 'archived');
    assert.equal(parsed['state'], 'Formal');
    assert.equal(parsed['data_source_nature'], 'field_record');

    // Per-item provenance survives serialization: Fact stays Fact, decision Inference keeps its state.
    const goal = parsed['goal'] as { item: { source_type: string } };
    assert.equal(goal.item.source_type, 'Fact');
    const resultStatus = parsed['result_status'] as {
      item: { source_type: string; confirmation_class: string; decision_state: string };
    };
    assert.equal(resultStatus.item.source_type, 'Inference');
    assert.equal(resultStatus.item.confirmation_class, 'decision');
    assert.equal(resultStatus.item.decision_state, 'accepted');

    // Round-trip preserves both the state bit and the orthogonal state.
    const roundTripped = parseAttemptSidecar(sidecar);
    assert.equal(roundTripped.archive_state, 'archived');
    assert.equal(roundTripped.state, 'Formal');
    assert.deepEqual(findForbiddenPersistedKeys(parsed), []);
  });

  it('[AC-04] a missing carrier is read back as an EXPLICIT unknown, never as a default', () => {
    const attempt = makeFormal();
    const sidecar = JSON.parse(serializeAttemptSidecar(attempt)) as Record<string, unknown>;

    // Simulate a record written before the optional field existed.
    delete sidecar['expected_result'];
    const parsed = parseAttemptSidecar(JSON.stringify(sidecar));

    assert.equal(parsed.expected_result.presence_state, 'unknown');
    assert.ok(!('item' in parsed.expected_result));
    // 🔴 Explicitly unknown, never an empty string or a silently invented value.
    assert.notEqual(parsed.expected_result.presence_state, 'present');
  });

  it('[AC-130] schema failures are explicit: bad JSON / missing field / unsupported version', () => {
    assert.throws(
      () => parseWorkspaceMetadata('{not json'),
      (error: unknown) => error instanceof WorkspaceSchemaError && error.code === 'INVALID_JSON',
    );
    assert.throws(
      () => parseWorkspaceMetadata('{"schema_version":"1"}'),
      (error: unknown) => error instanceof WorkspaceSchemaError && error.code === 'INVALID_FIELD_VALUE',
    );
    assert.throws(
      () =>
        parseWorkspaceMetadata(
          JSON.stringify({
            schema_version: '999',
            workspace_id: 'WS_00000000000000000000000009',
            projects: [],
          }),
        ),
      (error: unknown) =>
        error instanceof WorkspaceSchemaError && error.code === 'UNSUPPORTED_SCHEMA_VERSION',
    );
    assert.throws(
      () =>
        parseWorkspaceMetadata(
          JSON.stringify({
            schema_version: WORKSPACE_SCHEMA_VERSION,
            workspace_id: 'NOT_A_WORKSPACE_ID',
            projects: [],
          }),
        ),
      (error: unknown) => error instanceof WorkspaceSchemaError && error.code === 'INVALID_FIELD_VALUE',
    );
    // A forbidden key is refused loudly rather than silently persisted.
    assert.throws(
      () =>
        parseWorkspaceMetadata(
          JSON.stringify({
            schema_version: WORKSPACE_SCHEMA_VERSION,
            workspace_id: 'WS_00000000000000000000000009',
            projects: [],
            version_number: 3,
          }),
        ),
      (error: unknown) => error instanceof WorkspaceSchemaError && error.code === 'FORBIDDEN_KEY',
    );
  });

  it('IMPLEMENTATION INVARIANT: project metadata is minimal and round-trips', () => {
    const serialized = serializeProjectMetadata({
      schema_version: WORKSPACE_SCHEMA_VERSION,
      project_id: 'PRJ_ALPHA',
      name: 'Alpha',
      created_at: '2026-09-24T00:00:00.000Z',
    });
    assert.deepEqual(Object.keys(JSON.parse(serialized) as Record<string, unknown>).sort(), [
      'created_at',
      'name',
      'project_id',
      'schema_version',
    ]);
    assert.equal(parseProjectMetadata(serialized).project_id, 'PRJ_ALPHA');
    assert.deepEqual(findForbiddenPersistedKeysInJson(serialized), []);
    // No membership / role concept exists (D3).
    assert.ok(!serialized.includes('member'));
    assert.ok(!serialized.includes('role'));
  });

  it('IMPLEMENTATION INVARIANT: workspace paths are relative and cannot escape the root', () => {
    assert.equal(isValidWorkspacePath('projects/PRJ_ALPHA/attempts/a.json'), true);
    assert.equal(isValidWorkspacePath('workspace.json'), true);
    assert.equal(isValidWorkspacePath('/etc/passwd'), false);
    assert.equal(isValidWorkspacePath('../secrets.json'), false);
    assert.equal(isValidWorkspacePath('projects/../../escape.json'), false);
    assert.equal(isValidWorkspacePath('projects\\PRJ_ALPHA'), false);
    assert.throws(() => assertValidWorkspacePath('/absolute'));

    assert.equal(joinWorkspacePath('projects', 'PRJ_ALPHA', 'attempts'), 'projects/PRJ_ALPHA/attempts');
    assert.equal(joinWorkspacePath('projects', '/leading'), 'projects/leading');
    assert.equal(baseNameOfWorkspacePath('projects/PRJ_ALPHA/a.json'), 'a.json');
    assert.equal(extensionOfWorkspacePath('projects/PRJ_ALPHA/a.json'), '.json');
    assert.equal(extensionOfWorkspacePath('workspace.json'), '.json');
  });

  it('IMPLEMENTATION INVARIANT: the abstract storage exposes no delete operation', () => {
    const storage = new InMemoryWorkspaceStorage();
    for (const forbiddenMember of ['delete', 'remove', 'unlink', 'purge', 'erase', 'trash']) {
      assert.ok(!(forbiddenMember in storage), `storage must not expose "${forbiddenMember}"`);
    }
  });

  it('[AC-130] IMPLEMENTATION INVARIANT (contract §3.2 rule 1 / F06): a persisted Attempt id must be a legal ATT_ object id', () => {
    const attempt = makeFormal();
    const sidecar = JSON.parse(serializeAttemptSidecar(attempt)) as Record<string, unknown>;

    // A well-formed id round-trips.
    assert.equal(parseAttemptSidecar(JSON.stringify(sidecar)).attempt_id, attempt.attempt_id);

    // 🔴 Every malformed id is refused EXPLICITLY - never silently accepted, never coerced.
    for (const malformed of [
      'not-an-attempt-id',
      'INS_00000000000000000000000001',
      'HYP_00000000000000000000000002',
      'ATT_',
      'ATT',
    ]) {
      assert.throws(
        () => parseAttemptSidecar(JSON.stringify({ ...sidecar, attempt_id: malformed })),
        (error: unknown) =>
          error instanceof WorkspaceSchemaError && error.code === 'INVALID_FIELD_VALUE',
        `attempt_id ${JSON.stringify(malformed)} must be refused`,
      );
    }

    // A non-string id is a missing required field, not a silently invented one.
    for (const notAString of [null, 42, {}]) {
      assert.throws(
        () => parseAttemptSidecar(JSON.stringify({ ...sidecar, attempt_id: notAString })),
        (error: unknown) =>
          error instanceof WorkspaceSchemaError && error.code === 'MISSING_REQUIRED_FIELD',
      );
    }

    // The markdown front-matter carries the same contract: identity is validated on read.
    const markdown = serializeAttemptMarkdown(attempt);
    assert.equal(parseAttemptMarkdownFrontMatter(markdown)?.attempt_id, attempt.attempt_id);

    const brokenMarkdown = markdown.replace(
      `attempt_id: ${attempt.attempt_id}`,
      'attempt_id: notes.md',
    );
    assert.notEqual(brokenMarkdown, markdown);
    assert.throws(
      () => parseAttemptMarkdownFrontMatter(brokenMarkdown),
      (error: unknown) =>
        error instanceof WorkspaceSchemaError && error.code === 'INVALID_FIELD_VALUE',
    );

    // A file that is not an Attempt document is still simply ignored (never an error).
    assert.equal(parseAttemptMarkdownFrontMatter('# notes\n'), null);
  });
});
