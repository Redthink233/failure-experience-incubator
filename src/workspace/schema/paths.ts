/**
 * Workspace physical layout (IMPLEMENTATION PARAMETER, NOT a product Decision).
 *
 * Contract / plan references:
 *   - contract §0.4 E.7/E.8 - `Markdown + JSON / sidecar metadata` is a TECHNICAL DEFAULT;
 *     the physical schema is converged by the implementation layer and MUST NOT be
 *     locked into an immutable product Decision;
 *   - contract D-059 (TQ02) - Local Workspace Files + no required cloud database;
 *   - Gate C Plan §J.1 - the layout below;
 *   - contract §12 item 20 / AC-122 - no versioned layout, no user-visible version system.
 *
 * ```
 * Workspace Root/
 *   workspace.json                     <- workspace metadata (schema_version / workspace_id / project index)
 *   projects/
 *     <project_id>/
 *       project.json                   <- project metadata
 *       attempts/
 *         <attempt_id>.md              <- human-readable body + stable metadata front-matter
 *         <attempt_id>.json            <- sidecar metadata (machine source of truth)
 * ```
 *
 * 🔴 `insights/` / `hypotheses/` / `events/` are part of the Gate C plan but are NOT
 *    built in S01-01 (only the Attempt vertical slice is required). `src/domain` already
 *    carries their types.
 *
 * 🔴 The file NAME is a convenience only: object identity is carried INSIDE the file
 *    content (§3.2 / AC-137). Renaming a file never breaks ID-based resolution.
 */

export const WORKSPACE_METADATA_FILE = 'workspace.json';
export const PROJECTS_DIRECTORY = 'projects';
export const PROJECT_METADATA_FILE = 'project.json';
export const ATTEMPTS_DIRECTORY = 'attempts';

export const JSON_EXTENSION = '.json';
export const MARKDOWN_EXTENSION = '.md';

/**
 * Internal PHYSICAL bucket for `Attempt`s that have no logical `Project`.
 *
 * `Project` exists but MAY BE OMITTED (contract §1.3 / D-019 / D-045). An omitted
 * project must NOT be materialised as a project the user never created, so this is
 * a storage-layout fallback only:
 *   🔴 it is NOT a logical `Project`;
 *   🔴 it is never registered in `workspace.json.projects`;
 *   🔴 it never gets a `project.json`;
 *   🔴 it is never returned by `listProjects()`;
 *   🔴 the `Attempt` itself keeps `project_id = null`.
 *
 * The literal is deliberately NOT `PRJ_`-shaped so that it can never be mistaken for
 * (or parsed as) a real project object id.
 */
export const UNASSIGNED_PROJECT_BUCKET = '_unassigned';

export function projectDirectory(projectId: string): string {
  return `${PROJECTS_DIRECTORY}/${projectId}`;
}

export function projectMetadataPath(projectId: string): string {
  return `${projectDirectory(projectId)}/${PROJECT_METADATA_FILE}`;
}

export function attemptsDirectory(projectId: string): string {
  return `${projectDirectory(projectId)}/${ATTEMPTS_DIRECTORY}`;
}

/** Conventional path of an Attempt sidecar; convenience only, never identity. */
export function attemptSidecarPath(projectId: string, attemptId: string): string {
  return `${attemptsDirectory(projectId)}/${attemptId}${JSON_EXTENSION}`;
}

/** Conventional path of an Attempt markdown body; convenience only, never identity. */
export function attemptMarkdownPath(projectId: string, attemptId: string): string {
  return `${attemptsDirectory(projectId)}/${attemptId}${MARKDOWN_EXTENSION}`;
}
