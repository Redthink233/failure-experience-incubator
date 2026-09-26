/**
 * S01 ｜ `M9` `HypothesisRepository` - the minimal Local Workspace persistence of `Hypothesis`
 *            records, their generation batches and the durable recovery anchors.
 *
 * Contract: `D-059` (Local Workspace Files, no required cloud database), §3.2 (resolution is BY ID
 * and archiving never invalidates an id), §7 (V1 has no physical delete - AC-76), §12 item 20 /
 * AC-122 (no version system).
 *
 * 🔴 NO DATABASE OF ANY KIND: only a `WorkspaceStorage` (an in-memory implementation is sufficient -
 *    `D-059` / AC-130 / ITC-02).
 * 🔴 READING IS CONTENT-BASED: the file name is a convenience only, so a renamed or moved document is
 *    still resolved (§3.2 / AC-137).
 * 🔴 THIS LAYER DECIDES NO SEMANTICS: it stores what it is given. The decision matrix, the grounding
 *    judgement and the count derivation live in the service and in `M7`.
 * 🔴 NO PHYSICAL DELETE MEMBER EXISTS (AC-76). There is deliberately no `delete`, no `remove` and no
 *    `clear`.
 * 🔴 `createIfAbsent` IS THE RECOVERY WRITE (§36). It is NOT a create-or-overwrite: when a record with
 *    the same id already exists, the incoming plan must be IDENTICAL to what is stored. That keeps
 *    §3.2 rule 1 (an id is globally unique and never reused) intact while letting a replay finish an
 *    interrupted write without minting a second identity.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond `WorkspaceStorage`.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { WorkspaceStorage } from '../../workspace/storage.js';
import { extensionOfWorkspacePath } from '../../workspace/storage.js';
import { WorkspaceSchemaError } from '../../workspace/schema/schema-error.js';
import {
  HYPOTHESIS_BATCHES_DIRECTORY,
  HYPOTHESIS_GENERATION_BATCH_OBJECT_TYPE,
  HYPOTHESIS_OBJECT_TYPE,
  HYPOTHESIS_OPERATION_ANCHOR_OBJECT_TYPE,
  HYPOTHESES_DIRECTORY,
  hypothesisBatchPath,
  hypothesisMarkdownPath,
  hypothesisOperationAnchorPath,
  hypothesisSidecarPath,
  parseHypothesis,
  parseHypothesisBatch,
  parseHypothesisMarkdownFrontMatter,
  parseHypothesisOperationAnchor,
  serializeHypothesis,
  serializeHypothesisBatch,
  serializeHypothesisMarkdown,
  serializeHypothesisOperationAnchor,
} from './persistence.js';
import type {
  HypothesisGenerationBatch,
  HypothesisOperationAnchor,
  HypothesisPatch,
  HypothesisRecord,
} from './types.js';

export type HypothesisRepositoryErrorCode =
  | 'HYPOTHESIS_NOT_FOUND'
  /** §3.2 rule 1: ids are globally unique and never reused, so a create must fail, not overwrite. */
  | 'DUPLICATE_OBJECT_ID'
  /** The recovery plan disagrees with what is already stored for the same identity (§36). */
  | 'PLAN_MISMATCH';

export class HypothesisRepositoryError extends Error {
  readonly code: HypothesisRepositoryErrorCode;
  readonly hypothesis_id: string;

  constructor(code: HypothesisRepositoryErrorCode, hypothesis_id: string, message?: string) {
    super(message ?? `Hypothesis repository error [${code}] for "${hypothesis_id}".`);
    this.name = 'HypothesisRepositoryError';
    this.code = code;
    this.hypothesis_id = hypothesis_id;
  }
}

export interface HypothesisRepository {
  /**
   * Stores a `Hypothesis`. Idempotent for a REPLAY of the same plan, fatal for a different one.
   *
   * 🔴 A replay write is how an interrupted generation completes (§36): seeing the SAME document
   *    already stored is a no-op, so no duplicate hypothesis and no second reference set can appear.
   */
  createIfAbsent(record: HypothesisRecord): Promise<{ readonly record: HypothesisRecord; readonly replayed: boolean }>;
  readById(hypothesis_id: ObjectId<'HYP'>): Promise<HypothesisRecord | null>;
  /** Applies a patch. Identity, provenance, ①②③④⑤ and the generation batch are immutable. */
  update(hypothesis_id: ObjectId<'HYP'>, patch: HypothesisPatch): Promise<HypothesisRecord>;
  listBySourceAttempt(source_attempt_id: ObjectId<'ATT'>): Promise<readonly HypothesisRecord[]>;
  listAll(): Promise<readonly HypothesisRecord[]>;

  /** Stores the record of ONE explicit generation. Idempotent for the same planned batch. */
  recordBatchIfAbsent(
    batch: HypothesisGenerationBatch,
  ): Promise<{ readonly batch: HypothesisGenerationBatch; readonly replayed: boolean }>;
  readBatch(batch_id: string): Promise<HypothesisGenerationBatch | null>;
  /** The batch a given generation operation produced, if any (the idempotency lookup). */
  findBatchByOperationId(operation_id: string): Promise<HypothesisGenerationBatch | null>;
  listBatchesBySourceAttempt(
    source_attempt_id: ObjectId<'ATT'>,
  ): Promise<readonly HypothesisGenerationBatch[]>;

  /** The durable recovery anchor of one operation, or `null` (§36). */
  readOperationAnchor(operation_key: string): Promise<HypothesisOperationAnchor | null>;
  /** Writes the anchor in ONE storage write - the recovery boundary of this module. */
  writeOperationAnchor(anchor: HypothesisOperationAnchor): Promise<void>;
}

export interface HypothesisRepositoryDeps {
  readonly storage: WorkspaceStorage;
  /** Injectable clock returning an ISO-8601 timestamp. */
  readonly now?: () => string;
}

interface DiscoveredHypothesis {
  readonly path: string;
  readonly record: HypothesisRecord;
  readonly markdown_path: string | null;
}

function declaresObjectType(json: string, object_type: string): boolean {
  try {
    const raw = JSON.parse(json) as unknown;
    return (
      raw !== null &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      (raw as Record<string, unknown>)['object_type'] === object_type
    );
  } catch {
    return false;
  }
}

/**
 * §3.2 rule 1: an object id is globally unique. Two DIFFERENT physical objects declaring the same
 * internal id is workspace corruption and must fail explicitly rather than let one win a `Map` slot.
 */
function assertNoDuplicateObjectId(
  existingPath: string | null,
  path: string,
  hypothesis_id: string,
  kind: 'sidecar' | 'markdown',
): void {
  if (existingPath === null || existingPath === path) {
    return;
  }
  throw new WorkspaceSchemaError(
    'DUPLICATE_OBJECT_ID',
    path,
    `Two different Hypothesis ${kind} objects declare the same internal hypothesis_id "${hypothesis_id}": ` +
      `"${existingPath}" and "${path}". Ids are globally unique and never reused (§3.2 rule 1), ` +
      'so this workspace cannot be resolved deterministically. No record was modified.',
  );
}

export function createHypothesisRepository(deps: HypothesisRepositoryDeps): HypothesisRepository {
  const storage = deps.storage;
  const now = deps.now ?? ((): string => new Date().toISOString());

  async function listFiles(directory: string): Promise<readonly string[]> {
    if (!(await storage.exists(directory))) {
      return [];
    }
    const entries = await storage.list(directory);
    return entries.filter((entry) => entry.kind === 'file').map((entry) => entry.name);
  }

  /**
   * Locates every stored `Hypothesis` by CONTENT.
   *
   * 🔴 A foreign `.json` file is ignored (a user may legitimately drop one next to the records), but a
   *    file that DOES declare itself a `Hypothesis` and cannot be parsed is an explicit schema error -
   *    skipping it would make "no hypothesis" indistinguishable from "unreadable hypothesis".
   */
  async function discover(): Promise<readonly DiscoveredHypothesis[]> {
    const markdown_by_id = new Map<string, string>();
    for (const name of await listFiles(HYPOTHESES_DIRECTORY)) {
      if (extensionOfWorkspacePath(name) !== '.md') {
        continue;
      }
      const path = `${HYPOTHESES_DIRECTORY}/${name}`;
      const frontMatter = parseHypothesisMarkdownFrontMatter(await storage.readFile(path));
      if (frontMatter === null) {
        continue;
      }
      assertNoDuplicateObjectId(
        markdown_by_id.get(frontMatter.hypothesis_id) ?? null,
        path,
        frontMatter.hypothesis_id,
        'markdown',
      );
      markdown_by_id.set(frontMatter.hypothesis_id, path);
    }

    const by_id = new Map<string, DiscoveredHypothesis>();
    for (const name of await listFiles(HYPOTHESES_DIRECTORY)) {
      if (extensionOfWorkspacePath(name) !== '.json') {
        continue;
      }
      const path = `${HYPOTHESES_DIRECTORY}/${name}`;
      const json = await storage.readFile(path);
      if (!declaresObjectType(json, HYPOTHESIS_OBJECT_TYPE)) {
        continue;
      }
      const record = parseHypothesis(json, path);
      const existing = by_id.get(record.hypothesis.hypothesis_id);
      assertNoDuplicateObjectId(existing?.path ?? null, path, record.hypothesis.hypothesis_id, 'sidecar');
      by_id.set(record.hypothesis.hypothesis_id, {
        path,
        record,
        markdown_path: markdown_by_id.get(record.hypothesis.hypothesis_id) ?? null,
      });
    }
    return [...by_id.values()];
  }

  async function persist(
    record: HypothesisRecord,
    discovered: DiscoveredHypothesis | null,
  ): Promise<void> {
    const sidecar = discovered?.path ?? hypothesisSidecarPath(record.hypothesis.hypothesis_id);
    await storage.writeFile(sidecar, serializeHypothesis(record));
    const markdown = discovered?.markdown_path ?? hypothesisMarkdownPath(record.hypothesis.hypothesis_id);
    await storage.writeFile(markdown, serializeHypothesisMarkdown(record));
  }

  async function discoverBatches(): Promise<readonly HypothesisGenerationBatch[]> {
    const batches: HypothesisGenerationBatch[] = [];
    for (const name of await listFiles(HYPOTHESIS_BATCHES_DIRECTORY)) {
      if (extensionOfWorkspacePath(name) !== '.json') {
        continue;
      }
      const path = `${HYPOTHESIS_BATCHES_DIRECTORY}/${name}`;
      const json = await storage.readFile(path);
      if (!declaresObjectType(json, HYPOTHESIS_GENERATION_BATCH_OBJECT_TYPE)) {
        continue;
      }
      batches.push(parseHypothesisBatch(json, path));
    }
    return batches;
  }

  return {
    async createIfAbsent(record: HypothesisRecord) {
      const hypothesis_id = record.hypothesis.hypothesis_id;
      const existing = (await discover()).find(
        (entry) => entry.record.hypothesis.hypothesis_id === hypothesis_id,
      );
      if (existing === undefined) {
        await persist(record, null);
        return { record, replayed: false };
      }
      /*
       * 🔴 THE REPLAY CHECK. Only a BYTE-IDENTICAL plan may be re-applied; anything else is an
       *    identity collision, not a recovery.
       */
      if (serializeHypothesis(existing.record) !== serializeHypothesis(record)) {
        throw new HypothesisRepositoryError(
          'PLAN_MISMATCH',
          hypothesis_id,
          'The same Hypothesis identity already exists with DIFFERENT content. A replay may only ' +
            're-apply the identical plan; ids are globally unique and never reused (§3.2 rule 1).',
        );
      }
      return { record: existing.record, replayed: true };
    },

    async readById(hypothesis_id: ObjectId<'HYP'>): Promise<HypothesisRecord | null> {
      const found = (await discover()).find(
        (entry) => entry.record.hypothesis.hypothesis_id === hypothesis_id,
      );
      return found?.record ?? null;
    },

    async update(hypothesis_id: ObjectId<'HYP'>, patch: HypothesisPatch): Promise<HypothesisRecord> {
      const found = (await discover()).find(
        (entry) => entry.record.hypothesis.hypothesis_id === hypothesis_id,
      );
      if (found === undefined) {
        throw new HypothesisRepositoryError('HYPOTHESIS_NOT_FOUND', hypothesis_id);
      }
      const current = found.record;
      /*
       * 🔴 THE READ-ONLY BOUNDARY IS STRUCTURAL HERE: the patch type carries no field for ①②③④⑤ and
       *    no field for the references, so no call site can even express such an edit (§8.6 rule 1).
       */
      const merged: HypothesisRecord = {
        hypothesis: {
          ...current.hypothesis,
          ...(patch.decision_state === undefined ? {} : { decision_state: patch.decision_state }),
          ...(patch.saved === undefined ? {} : { saved: patch.saved }),
          ...(patch.editable_items === undefined ? {} : { editable_items: patch.editable_items }),
          updated_at: patch.updated_at ?? now(),
        },
        kept_condition_recommendations: current.kept_condition_recommendations,
        reasoning_input_refs: current.reasoning_input_refs,
        model_prior_notice: current.model_prior_notice,
      };
      await persist(merged, found);
      return merged;
    },

    async listBySourceAttempt(
      source_attempt_id: ObjectId<'ATT'>,
    ): Promise<readonly HypothesisRecord[]> {
      return (await discover())
        .map((entry) => entry.record)
        .filter((record) => record.hypothesis.attempt_id === source_attempt_id)
        .sort((left, right) => {
          if (left.hypothesis.created_at !== right.hypothesis.created_at) {
            return left.hypothesis.created_at < right.hypothesis.created_at ? -1 : 1;
          }
          return left.hypothesis.hypothesis_id < right.hypothesis.hypothesis_id ? -1 : 1;
        });
    },

    async listAll(): Promise<readonly HypothesisRecord[]> {
      return (await discover())
        .map((entry) => entry.record)
        .sort((left, right) => {
          if (left.hypothesis.created_at !== right.hypothesis.created_at) {
            return left.hypothesis.created_at < right.hypothesis.created_at ? -1 : 1;
          }
          return left.hypothesis.hypothesis_id < right.hypothesis.hypothesis_id ? -1 : 1;
        });
    },

    async recordBatchIfAbsent(batch: HypothesisGenerationBatch) {
      const existing = (await discoverBatches()).find(
        (candidate) => candidate.batch_id === batch.batch_id,
      );
      if (existing === undefined) {
        await storage.writeFile(hypothesisBatchPath(batch.batch_id), serializeHypothesisBatch(batch));
        return { batch, replayed: false };
      }
      if (serializeHypothesisBatch(existing) !== serializeHypothesisBatch(batch)) {
        throw new HypothesisRepositoryError(
          'PLAN_MISMATCH',
          batch.batch_id,
          'The same batch identity already exists with DIFFERENT content; a replay may only re-apply the identical plan (§36).',
        );
      }
      return { batch: existing, replayed: true };
    },

    async readBatch(batch_id: string): Promise<HypothesisGenerationBatch | null> {
      return (await discoverBatches()).find((batch) => batch.batch_id === batch_id) ?? null;
    },

    async findBatchByOperationId(operation_id: string): Promise<HypothesisGenerationBatch | null> {
      return (await discoverBatches()).find((batch) => batch.operation_id === operation_id) ?? null;
    },

    /**
     * The batches of one source record.
     *
     * 🔴 Ordered by `created_at` only so a caller can tell which explicit generation happened most
     *    recently. 🔴 This is NOT a version comparison: no batch is "higher", and the order carries no
     *    correctness, strength or reliability claim (§2.4 / `D-051`).
     */
    async listBatchesBySourceAttempt(
      source_attempt_id: ObjectId<'ATT'>,
    ): Promise<readonly HypothesisGenerationBatch[]> {
      return (await discoverBatches())
        .filter((batch) => batch.source_attempt_id === source_attempt_id)
        .sort((left, right) => {
          if (left.created_at !== right.created_at) {
            return left.created_at < right.created_at ? -1 : 1;
          }
          return left.batch_id < right.batch_id ? -1 : 1;
        });
    },

    async readOperationAnchor(operation_key: string): Promise<HypothesisOperationAnchor | null> {
      const path = hypothesisOperationAnchorPath(operation_key);
      if (!(await storage.exists(path))) {
        return null;
      }
      const json = await storage.readFile(path);
      if (!declaresObjectType(json, HYPOTHESIS_OPERATION_ANCHOR_OBJECT_TYPE)) {
        return null;
      }
      return parseHypothesisOperationAnchor(json, path);
    },

    async writeOperationAnchor(anchor: HypothesisOperationAnchor): Promise<void> {
      await storage.writeFile(
        hypothesisOperationAnchorPath(anchor.operation_key),
        serializeHypothesisOperationAnchor(anchor),
      );
    },
  };
}
