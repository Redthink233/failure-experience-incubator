/**
 * Shared schema error type for the workspace physical layer.
 */

export type WorkspaceSchemaErrorCode =
  | 'INVALID_JSON'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_FIELD_VALUE'
  | 'FORBIDDEN_KEY'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  /**
   * Two DIFFERENT physical objects declare the SAME internal object id.
   * §3.2 rule 1 freezes "all ids are globally unique", so this is workspace
   * corruption and must never be resolved by silently picking one of them.
   * 🔴 A technical / implementation-layer error - NOT a product state and NOT a
   *    new product Decision.
   */
  | 'DUPLICATE_OBJECT_ID';

export class WorkspaceSchemaError extends Error {
  readonly code: WorkspaceSchemaErrorCode;
  readonly path: string;

  constructor(code: WorkspaceSchemaErrorCode, path: string, message?: string) {
    super(message ?? `Workspace schema error [${code}]${path === '' ? '' : ` at "${path}"`}.`);
    this.name = 'WorkspaceSchemaError';
    this.code = code;
    this.path = path;
  }
}
