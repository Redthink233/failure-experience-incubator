/**
 * S01-03 ｜ `RetrievalDerivationRepository` - the minimal Local Workspace persistence of the CURRENT
 *            Retrieval Derivation.
 *
 * Contract: `D-059` (Local Workspace Files, no required cloud database), §7 (V1 has no physical
 * delete - AC-76), §12 item 20 / AC-122 (no version system), §24–§26 of the S01-03 task.
 *
 * 🔴 At most ONE current derivation per source `Formal Attempt`. A rerun REPLACES it as a whole:
 *    the same fixed path is overwritten, so no delete is needed, and no earlier derivation can
 *    linger as a selectable record. There is deliberately no revision list, no rollback and no
 *    comparison between derivations.
 * 🔴 No database of any kind is involved - only a `WorkspaceStorage` (an in-memory implementation
 *    is sufficient: D-059 / AC-130).
 * 🔴 Reading is CONTENT-based: the file name is a convenience only. A derivation whose
 *    `source_attempt_id` matches but whose identity belongs to another Attempt is refused by the
 *    parser (§3.2 / AC-137).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { WorkspaceStorage } from '../../workspace/storage.js';
import { extensionOfWorkspacePath } from '../../workspace/storage.js';
import { JSON_EXTENSION } from '../../workspace/schema/paths.js';
import { WorkspaceSchemaError } from '../../workspace/schema/schema-error.js';
import {
  RETRIEVAL_DERIVATION_OBJECT_TYPE,
  RETRIEVALS_DIRECTORY,
  parseRetrievalDerivation,
  retrievalDerivationPath,
  serializeRetrievalDerivation,
} from './persistence.js';
import type { RetrievalDerivationRecord } from './types.js';

export interface RetrievalDerivationRepository {
  /** The current derivation of one source `Formal Attempt`, or `null` when none was ever stored. */
  readCurrent(source_attempt_id: ObjectId<'ATT'>): Promise<RetrievalDerivationRecord | null>;
  /** Stores the record as THE current derivation, replacing any earlier one as a whole. */
  replaceCurrent(
    source_attempt_id: ObjectId<'ATT'>,
    record: RetrievalDerivationRecord,
  ): Promise<RetrievalDerivationRecord>;
}

export interface RetrievalDerivationRepositoryDeps {
  readonly storage: WorkspaceStorage;
}

interface DiscoveredDerivation {
  readonly path: string;
  readonly record: RetrievalDerivationRecord;
}

/** `true` when the file declares itself a retrieval derivation, without committing to a full parse. */
function declaresDerivationObjectType(json: string): boolean {
  try {
    const raw = JSON.parse(json) as unknown;
    return (
      raw !== null &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      (raw as Record<string, unknown>)['object_type'] === RETRIEVAL_DERIVATION_OBJECT_TYPE
    );
  } catch {
    return false;
  }
}

export function createRetrievalDerivationRepository(
  deps: RetrievalDerivationRepositoryDeps,
): RetrievalDerivationRepository {
  const storage = deps.storage;

  /**
   * Locates every stored derivation by CONTENT.
   *
   * 🔴 A file that is not JSON, or that is JSON but not a derivation, is ignored (a foreign file may
   *    legitimately sit next to it). A file that DOES declare itself a derivation but cannot be
   *    parsed is an explicit schema error - silently skipping it would make "no current derivation"
   *    indistinguishable from "unreadable current derivation".
   */
  async function discover(): Promise<readonly DiscoveredDerivation[]> {
    if (!(await storage.exists(RETRIEVALS_DIRECTORY))) {
      return [];
    }
    const entries = await storage.list(RETRIEVALS_DIRECTORY);
    const found: DiscoveredDerivation[] = [];
    for (const entry of entries) {
      if (entry.kind !== 'file' || extensionOfWorkspacePath(entry.name) !== JSON_EXTENSION) {
        continue;
      }
      const path = `${RETRIEVALS_DIRECTORY}/${entry.name}`;
      const json = await storage.readFile(path);
      if (!declaresDerivationObjectType(json)) {
        continue;
      }
      found.push({ path, record: parseRetrievalDerivation(json, path) });
    }
    return found;
  }

  return {
    async readCurrent(
      source_attempt_id: ObjectId<'ATT'>,
    ): Promise<RetrievalDerivationRecord | null> {
      const matches = (await discover()).filter(
        (candidate) => candidate.record.source_attempt_id === source_attempt_id,
      );
      if (matches.length === 0) {
        return null;
      }
      /*
       * 🔴 Two stored derivations for one source Attempt is corruption: "the current one" would no
       *    longer be determined, and the reader would silently pick one of them.
       */
      if (matches.length > 1) {
        throw new WorkspaceSchemaError(
          'DUPLICATE_OBJECT_ID',
          matches.map((match) => match.path).join(', '),
          `Two retrieval derivations declare source_attempt_id "${source_attempt_id}": ` +
            `${matches.map((match) => `"${match.path}"`).join(' and ')}. At most one derivation may be current.`,
        );
      }
      return matches[0]?.record ?? null;
    },

    async replaceCurrent(
      source_attempt_id: ObjectId<'ATT'>,
      record: RetrievalDerivationRecord,
    ): Promise<RetrievalDerivationRecord> {
      if (record.source_attempt_id !== source_attempt_id) {
        throw new WorkspaceSchemaError(
          'INVALID_FIELD_VALUE',
          retrievalDerivationPath(source_attempt_id),
          'A derivation may only be stored under the source Attempt it belongs to.',
        );
      }
      /*
       * Overwrite in place when a derivation already exists (even if a human renamed the file, so
       * that the replacement really REPLACES instead of leaving a second current record behind).
       * Otherwise write to the conventional path - no delete primitive is required either way.
       */
      const existing = (await discover()).find(
        (candidate) => candidate.record.source_attempt_id === source_attempt_id,
      );
      const target = existing?.path ?? retrievalDerivationPath(source_attempt_id);
      await storage.writeFile(target, serializeRetrievalDerivation(record));
      return record;
    },
  };
}
