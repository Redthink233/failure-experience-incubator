/**
 * `projects/<project_id>/project.json` - project metadata.
 *
 * Contract / plan references:
 *   - contract §1.3 / §1.2 - `Project` exists and may be omitted; it acts only as a
 *     Level B explanation dimension and MUST NOT become a retrieval admission filter
 *     (D-019 / D-045);
 *   - Gate C Plan §J.1 - `project.json` per project directory.
 *
 * 🔴 Project metadata carries no membership, role or permission concept (D3: V1 does
 *    not model team members / roles / permissions).
 */

import { findForbiddenPersistedKeys } from './forbidden-keys.js';
import { projectMetadataPath } from './paths.js';
import { WorkspaceSchemaError } from './schema-error.js';
import { WORKSPACE_SCHEMA_VERSION } from './workspace-metadata.js';
import type { WorkspaceStorage } from '../storage.js';

export interface ProjectMetadata {
  readonly schema_version: string;
  readonly project_id: string;
  readonly name: string | null;
  readonly created_at: string;
}

export function serializeProjectMetadata(metadata: ProjectMetadata): string {
  const payload = {
    schema_version: metadata.schema_version,
    project_id: metadata.project_id,
    name: metadata.name,
    created_at: metadata.created_at,
  };
  const forbidden = findForbiddenPersistedKeys(payload);
  if (forbidden.length > 0) {
    throw new WorkspaceSchemaError(
      'FORBIDDEN_KEY',
      projectMetadataPath(metadata.project_id),
      `project.json would persist forbidden keys: ${forbidden.join(', ')}.`,
    );
  }
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseProjectMetadata(json: string, sourcePath = ''): ProjectMetadata {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new WorkspaceSchemaError('INVALID_JSON', sourcePath);
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new WorkspaceSchemaError('INVALID_JSON', sourcePath);
  }
  const record = raw as Record<string, unknown>;

  const forbidden = findForbiddenPersistedKeys(record);
  if (forbidden.length > 0) {
    throw new WorkspaceSchemaError(
      'FORBIDDEN_KEY',
      sourcePath,
      `Forbidden keys present: ${forbidden.join(', ')}.`,
    );
  }

  const projectId = record['project_id'];
  if (typeof projectId !== 'string' || projectId.length === 0) {
    throw new WorkspaceSchemaError('MISSING_REQUIRED_FIELD', sourcePath, 'project_id');
  }
  const schemaVersion = record['schema_version'];
  if (typeof schemaVersion !== 'string') {
    throw new WorkspaceSchemaError('MISSING_REQUIRED_FIELD', sourcePath, 'schema_version');
  }
  if (schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
    throw new WorkspaceSchemaError(
      'UNSUPPORTED_SCHEMA_VERSION',
      sourcePath,
      `Unsupported schema_version "${schemaVersion}".`,
    );
  }
  const name = record['name'];
  const createdAt = record['created_at'];

  return {
    schema_version: schemaVersion,
    project_id: projectId,
    name: typeof name === 'string' ? name : null,
    created_at: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
  };
}

export async function readProjectMetadata(
  storage: WorkspaceStorage,
  projectId: string,
): Promise<ProjectMetadata | null> {
  const path = projectMetadataPath(projectId);
  if (!(await storage.exists(path))) {
    return null;
  }
  return parseProjectMetadata(await storage.readFile(path), path);
}

/** Idempotently creates `project.json` for the project directory. */
export async function ensureProject(
  storage: WorkspaceStorage,
  projectId: string,
  options: { readonly name?: string | null; readonly created_at?: string } = {},
): Promise<ProjectMetadata> {
  const existing = await readProjectMetadata(storage, projectId);
  if (existing !== null) {
    return existing;
  }
  const metadata: ProjectMetadata = {
    schema_version: WORKSPACE_SCHEMA_VERSION,
    project_id: projectId,
    name: options.name ?? null,
    created_at: options.created_at ?? new Date().toISOString(),
  };
  await storage.writeFile(projectMetadataPath(projectId), serializeProjectMetadata(metadata));
  return metadata;
}
