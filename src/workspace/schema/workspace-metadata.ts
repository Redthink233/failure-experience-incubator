/**
 * `workspace.json` - workspace metadata.
 *
 * Contract / plan references:
 *   - contract §0.4 A - the workspace is canonical in a user-chosen local directory;
 *   - Gate C Plan §J.1 row 1 (workspace metadata location) and row 11
 *     (`schema_version` lives in `workspace.json`);
 *   - `schema_version` is a TECHNICAL COMPATIBILITY field only. It MUST NOT be
 *     presented as a user-visible version system (contract §12 item 18 note / AC-122).
 *
 * 🔴 MUST NOT contain: a cloud account, a user account, a team, a role, or any
 *    cloud database reference (D-053 §0.4 A / AC-131).
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import { isObjectIdOfKind, newObjectId, toObjectId } from '../../domain/ids/object-id.js';
import { findForbiddenPersistedKeys } from './forbidden-keys.js';
import { WORKSPACE_METADATA_FILE } from './paths.js';
import { WorkspaceSchemaError } from './schema-error.js';
import type { WorkspaceStorage } from '../storage.js';

/** Technical compatibility version of the workspace file schema. NOT a product version. */
export const WORKSPACE_SCHEMA_VERSION = '1';

/** Minimal project index entry. `Project` is optional and never a retrieval filter. */
export interface WorkspaceProjectIndexEntry {
  readonly project_id: string;
  readonly name: string | null;
}

export interface WorkspaceMetadata {
  readonly schema_version: string;
  readonly workspace_id: ObjectId<'WS'>;
  readonly name: string | null;
  readonly created_at: string;
  readonly projects: readonly WorkspaceProjectIndexEntry[];
}

/** The minimum required content of `workspace.json`. */
export const WORKSPACE_METADATA_REQUIRED_FIELDS = [
  'schema_version',
  'workspace_id',
  'projects',
] as const;

export function serializeWorkspaceMetadata(metadata: WorkspaceMetadata): string {
  const payload = {
    schema_version: metadata.schema_version,
    workspace_id: metadata.workspace_id,
    name: metadata.name,
    created_at: metadata.created_at,
    projects: metadata.projects.map((entry) => ({
      project_id: entry.project_id,
      name: entry.name,
    })),
  };
  const forbidden = findForbiddenPersistedKeys(payload);
  if (forbidden.length > 0) {
    throw new WorkspaceSchemaError(
      'FORBIDDEN_KEY',
      WORKSPACE_METADATA_FILE,
      `workspace.json would persist forbidden keys: ${forbidden.join(', ')}.`,
    );
  }
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseWorkspaceMetadata(json: string, sourcePath = ''): WorkspaceMetadata {
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

  const schemaVersion = record['schema_version'];
  if (typeof schemaVersion !== 'string') {
    throw new WorkspaceSchemaError('MISSING_REQUIRED_FIELD', sourcePath, 'schema_version');
  }
  if (schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
    throw new WorkspaceSchemaError(
      'UNSUPPORTED_SCHEMA_VERSION',
      sourcePath,
      `Unsupported schema_version "${schemaVersion}" (expected "${WORKSPACE_SCHEMA_VERSION}").`,
    );
  }

  const workspaceIdRaw = record['workspace_id'];
  const workspaceId =
    typeof workspaceIdRaw === 'string' ? toObjectId(workspaceIdRaw, 'workspace') : null;
  if (workspaceId === null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'workspace_id must be a WS_ prefixed object id.',
    );
  }

  const projectsRaw = record['projects'];
  if (!Array.isArray(projectsRaw)) {
    throw new WorkspaceSchemaError('MISSING_REQUIRED_FIELD', sourcePath, 'projects');
  }
  const projects: WorkspaceProjectIndexEntry[] = projectsRaw.map((entry) => {
    if (entry === null || typeof entry !== 'object') {
      throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', sourcePath, 'projects[]');
    }
    const row = entry as Record<string, unknown>;
    const projectId = row['project_id'];
    if (typeof projectId !== 'string' || projectId.length === 0) {
      throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', sourcePath, 'projects[].project_id');
    }
    const name = row['name'];
    return {
      project_id: projectId,
      name: typeof name === 'string' ? name : null,
    };
  });

  const name = record['name'];
  const createdAt = record['created_at'];

  return {
    schema_version: schemaVersion,
    workspace_id: workspaceId,
    name: typeof name === 'string' ? name : null,
    created_at: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
    projects,
  };
}

export async function readWorkspaceMetadata(
  storage: WorkspaceStorage,
): Promise<WorkspaceMetadata | null> {
  if (!(await storage.exists(WORKSPACE_METADATA_FILE))) {
    return null;
  }
  const json = await storage.readFile(WORKSPACE_METADATA_FILE);
  return parseWorkspaceMetadata(json, WORKSPACE_METADATA_FILE);
}

export async function writeWorkspaceMetadata(
  storage: WorkspaceStorage,
  metadata: WorkspaceMetadata,
): Promise<void> {
  validateWorkspaceMetadata(metadata);
  await storage.writeFile(WORKSPACE_METADATA_FILE, serializeWorkspaceMetadata(metadata));
}

export function validateWorkspaceMetadata(metadata: WorkspaceMetadata): void {
  if (!isObjectIdOfKind(metadata.workspace_id, 'workspace')) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      WORKSPACE_METADATA_FILE,
      'workspace_id must be a WS_ prefixed object id.',
    );
  }
  if (metadata.schema_version !== WORKSPACE_SCHEMA_VERSION) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', WORKSPACE_METADATA_FILE, 'schema_version');
  }
}

export interface InitializeWorkspaceOptions {
  readonly workspace_id?: ObjectId<'WS'>;
  readonly name?: string | null;
  readonly created_at?: string;
}

/** Writes `workspace.json` unconditionally (overwrites an existing one). */
export async function initializeWorkspace(
  storage: WorkspaceStorage,
  options: InitializeWorkspaceOptions = {},
): Promise<WorkspaceMetadata> {
  const existing = await readWorkspaceMetadata(storage);
  const metadata: WorkspaceMetadata = {
    schema_version: WORKSPACE_SCHEMA_VERSION,
    workspace_id: options.workspace_id ?? existing?.workspace_id ?? newObjectId('workspace'),
    name: options.name ?? existing?.name ?? null,
    created_at: options.created_at ?? existing?.created_at ?? new Date().toISOString(),
    projects: existing?.projects ?? [],
  };
  await writeWorkspaceMetadata(storage, metadata);
  return metadata;
}

/**
 * Creates `workspace.json` only when it does not exist yet (idempotent).
 * 🔴 No directory is ever read without the caller having supplied an authorized storage
 * (D-053 principle 7 / AC-127 / AC-128): the storage instance itself IS the authorization.
 */
export async function ensureWorkspace(
  storage: WorkspaceStorage,
  options: InitializeWorkspaceOptions = {},
): Promise<WorkspaceMetadata> {
  const existing = await readWorkspaceMetadata(storage);
  return existing ?? initializeWorkspace(storage, options);
}

/** Idempotently adds a project to the workspace index. */
export async function registerProjectInIndex(
  storage: WorkspaceStorage,
  entry: WorkspaceProjectIndexEntry,
): Promise<WorkspaceMetadata> {
  const metadata = await ensureWorkspace(storage);
  if (metadata.projects.some((current) => current.project_id === entry.project_id)) {
    return metadata;
  }
  const next: WorkspaceMetadata = {
    ...metadata,
    projects: [...metadata.projects, entry],
  };
  await writeWorkspaceMetadata(storage, next);
  return next;
}
