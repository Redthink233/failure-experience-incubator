/**
 * S01 ｜ `M8` `InsightRepository` - the minimal Local Workspace persistence of `Insight`s, their
 *            generation batches and their state-event trace.
 *
 * Contract: `D-059` (Local Workspace Files, no required cloud database), §3.2 (resolution is BY ID
 * and archiving never invalidates an id), §7 (V1 has no physical delete - AC-76),
 * §11.3 (the state-event trace), §12 item 20 / AC-122 (no version system).
 *
 * 🔴 NO DATABASE OF ANY KIND: only a `WorkspaceStorage` (an in-memory implementation is sufficient -
 *    D-059 / AC-130 / ITC-02).
 * 🔴 READING IS CONTENT-BASED: the file name is a convenience only, so a renamed or moved document
 *    is still resolved (§3.2 / AC-137).
 * 🔴 THIS LAYER DECIDES NO SEMANTICS: it stores what it is given. The state machine, the gates and
 *    the transition rules live in the service (`M3` doctrine: the repository only persists and
 *    reads back).
 * 🔴 NO PHYSICAL DELETE MEMBER EXISTS (AC-76). There is deliberately no `delete`, no
 *    `remove` and no `clear`.
 * 🔴 `createIfAbsent` / `recordBatchIfAbsent` ARE THE RECOVERY WRITES (`M8-HARDENING-01`). They are
 *    NOT create-or-overwrite: when a record with the same id already exists, the incoming plan must
 *    be IDENTICAL to what is stored. That keeps §3.2 rule 1 (an id is globally unique and never
 *    reused) intact while letting a replay finish an interrupted write without minting a second
 *    identity.
 * 🔴 The repository stores NO counter, NO version, NO ordinal and NO "how many times" value: the
 *    current / earlier generation relation is derived from the batch records' own timestamps, not
 *    from a stored index.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond `WorkspaceStorage`.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { InsightStateEvent } from '../../domain/types/insight.js';
import type { WorkspaceStorage } from '../../workspace/storage.js';
import { extensionOfWorkspacePath } from '../../workspace/storage.js';
import { WorkspaceSchemaError } from '../../workspace/schema/schema-error.js';
import {
  INSIGHT_BATCHES_DIRECTORY,
  INSIGHT_GENERATION_BATCH_OBJECT_TYPE,
  INSIGHT_OBJECT_TYPE,
  INSIGHT_OPERATION_ANCHOR_OBJECT_TYPE,
  INSIGHT_STATE_EVENTS_FILE,
  INSIGHTS_DIRECTORY,
  insightBatchPath,
  insightMarkdownPath,
  insightOperationAnchorPath,
  insightSidecarPath,
  parseInsight,
  parseInsightBatch,
  parseInsightMarkdownFrontMatter,
  parseInsightOperationAnchor,
  parseInsightStateEvent,
  serializeInsight,
  serializeInsightBatch,
  serializeInsightMarkdown,
  serializeInsightOperationAnchor,
  serializeInsightStateEvent,
  stateEventLinesOf,
} from './persistence.js';
import type {
  InsightGenerationBatch,
  InsightOperationAnchor,
  InsightPatch,
  InsightRecord,
} from './types.js';

export type InsightRepositoryErrorCode =
  | 'INSIGHT_NOT_FOUND'
  /** §3.2 rule 1: ids are globally unique and never reused, so a create must fail, not overwrite. */
  | 'DUPLICATE_OBJECT_ID'
  /** The recovery plan disagrees with what is already stored for the same identity (`M8-HARDENING-01`). */
  | 'PLAN_MISMATCH';

export class InsightRepositoryError extends Error {
  readonly code: InsightRepositoryErrorCode;
  readonly insight_id: string;

  constructor(code: InsightRepositoryErrorCode, insight_id: string, message?: string) {
    super(message ?? `Insight repository error [${code}] for "${insight_id}".`);
    this.name = 'InsightRepositoryError';
    this.code = code;
    this.insight_id = insight_id;
  }
}

export interface InsightRepository {
  /**
   * Stores a NEW `Insight`. Idempotent for a REPLAY of the same plan, fatal for a different one.
   *
   * 🔴 `M8-HARDENING-01`: a replay write is how an interrupted generation completes. Seeing the SAME
   *    document already stored is a no-op, so no duplicate insight and no second reference set can
   *    appear. A DIFFERENT document under the same id is an identity collision
   *    (`PLAN_MISMATCH`), never an overwrite (`§3.2` rule 1).
   */
  createIfAbsent(
    record: InsightRecord,
  ): Promise<{ readonly record: InsightRecord; readonly replayed: boolean }>;
  readById(insight_id: ObjectId<'INS'>): Promise<InsightRecord | null>;
  /** Applies a patch. Identity, provenance and the generation batch are immutable. */
  update(insight_id: ObjectId<'INS'>, patch: InsightPatch): Promise<InsightRecord>;
  listBySourceAttempt(source_attempt_id: ObjectId<'ATT'>): Promise<readonly InsightRecord[]>;
  listAll(): Promise<readonly InsightRecord[]>;

  /** Stores the record of ONE explicit generation. Idempotent for the same planned batch. */
  recordBatchIfAbsent(
    batch: InsightGenerationBatch,
  ): Promise<{ readonly batch: InsightGenerationBatch; readonly replayed: boolean }>;
  readBatch(batch_id: string): Promise<InsightGenerationBatch | null>;
  /** The batch a given generation operation produced, if any (the idempotency lookup, `§32`). */
  findBatchByOperationId(operation_id: string): Promise<InsightGenerationBatch | null>;
  listBatchesBySourceAttempt(
    source_attempt_id: ObjectId<'ATT'>,
  ): Promise<readonly InsightGenerationBatch[]>;

  /** The durable recovery anchor of one operation, or `null` (`M8-HARDENING-01`). */
  readOperationAnchor(operation_key: string): Promise<InsightOperationAnchor | null>;
  /** Writes the anchor in ONE storage write - the recovery boundary of this module. */
  writeOperationAnchor(anchor: InsightOperationAnchor): Promise<void>;

  /** Appends ONE state event. Append-only: nothing is ever rewritten or removed. */
  appendStateEvent(event: InsightStateEvent): Promise<void>;
  listStateEventsByInsight(insight_id: ObjectId<'INS'>): Promise<readonly InsightStateEvent[]>;
}

export interface InsightRepositoryDeps {
  readonly storage: WorkspaceStorage;
  /** Injectable clock returning an ISO-8601 timestamp. */
  readonly now?: () => string;
}

interface DiscoveredInsight {
  readonly path: string;
  readonly record: InsightRecord;
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
  insight_id: string,
  kind: 'sidecar' | 'markdown',
): void {
  if (existingPath === null || existingPath === path) {
    return;
  }
  throw new WorkspaceSchemaError(
    'DUPLICATE_OBJECT_ID',
    path,
    `Two different Insight ${kind} objects declare the same internal insight_id "${insight_id}": ` +
      `"${existingPath}" and "${path}". Ids are globally unique and never reused (§3.2 rule 1), ` +
      'so this workspace cannot be resolved deterministically. No record was modified.',
  );
}

export function createInsightRepository(deps: InsightRepositoryDeps): InsightRepository {
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
   * Locates every stored `Insight` by CONTENT.
   *
   * 🔴 A foreign `.json` file is ignored (a user may legitimately drop one next to the records), but
   *    a file that DOES declare itself an `Insight` and cannot be parsed is an explicit schema
   *    error - skipping it would make "no insight" indistinguishable from "unreadable insight".
   */
  async function discover(): Promise<readonly DiscoveredInsight[]> {
    const markdown_by_id = new Map<string, string>();
    for (const name of await listFiles(INSIGHTS_DIRECTORY)) {
      if (extensionOfWorkspacePath(name) !== '.md') {
        continue;
      }
      const path = `${INSIGHTS_DIRECTORY}/${name}`;
      const frontMatter = parseInsightMarkdownFrontMatter(await storage.readFile(path));
      if (frontMatter === null) {
        continue;
      }
      assertNoDuplicateObjectId(
        markdown_by_id.get(frontMatter.insight_id) ?? null,
        path,
        frontMatter.insight_id,
        'markdown',
      );
      markdown_by_id.set(frontMatter.insight_id, path);
    }

    const by_id = new Map<string, DiscoveredInsight>();
    for (const name of await listFiles(INSIGHTS_DIRECTORY)) {
      if (extensionOfWorkspacePath(name) !== '.json') {
        continue;
      }
      const path = `${INSIGHTS_DIRECTORY}/${name}`;
      const json = await storage.readFile(path);
      if (!declaresObjectType(json, INSIGHT_OBJECT_TYPE)) {
        continue;
      }
      const record = parseInsight(json, path);
      const existing = by_id.get(record.insight.insight_id);
      assertNoDuplicateObjectId(existing?.path ?? null, path, record.insight.insight_id, 'sidecar');
      by_id.set(record.insight.insight_id, {
        path,
        record,
        markdown_path: markdown_by_id.get(record.insight.insight_id) ?? null,
      });
    }
    return [...by_id.values()];
  }

  async function resolveById(insight_id: ObjectId<'INS'>): Promise<DiscoveredInsight> {
    const found = (await discover()).find((entry) => entry.record.insight.insight_id === insight_id);
    if (found === undefined) {
      throw new InsightRepositoryError('INSIGHT_NOT_FOUND', insight_id);
    }
    return found;
  }

  async function persist(record: InsightRecord, discovered: DiscoveredInsight | null): Promise<void> {
    const sidecar = discovered?.path ?? insightSidecarPath(record.insight.insight_id);
    await storage.writeFile(sidecar, serializeInsight(record));
    const markdown = discovered?.markdown_path ?? insightMarkdownPath(record.insight.insight_id);
    await storage.writeFile(markdown, serializeInsightMarkdown(record));
  }

  async function readEventLog(): Promise<string> {
    return (await storage.exists(INSIGHT_STATE_EVENTS_FILE))
      ? storage.readFile(INSIGHT_STATE_EVENTS_FILE)
      : '';
  }

  async function discoverBatches(): Promise<readonly InsightGenerationBatch[]> {
    const batches: InsightGenerationBatch[] = [];
    for (const name of await listFiles(INSIGHT_BATCHES_DIRECTORY)) {
      if (extensionOfWorkspacePath(name) !== '.json') {
        continue;
      }
      const path = `${INSIGHT_BATCHES_DIRECTORY}/${name}`;
      const json = await storage.readFile(path);
      if (!declaresObjectType(json, INSIGHT_GENERATION_BATCH_OBJECT_TYPE)) {
        continue;
      }
      batches.push(parseInsightBatch(json, path));
    }
    return batches;
  }

  return {
    async createIfAbsent(
      record: InsightRecord,
    ): Promise<{ readonly record: InsightRecord; readonly replayed: boolean }> {
      const insight_id = record.insight.insight_id;
      const existing = (await discover()).find((entry) => entry.record.insight.insight_id === insight_id);
      if (existing === undefined) {
        await persist(record, null);
        return { record, replayed: false };
      }
      /*
       * 🔴 THE REPLAY CHECK. Only a BYTE-IDENTICAL plan may be re-applied; anything else is an
       *    identity collision, not a recovery (`§3.2` rule 1).
       */
      if (serializeInsight(existing.record) !== serializeInsight(record)) {
        throw new InsightRepositoryError(
          'PLAN_MISMATCH',
          insight_id,
          'The same Insight identity already exists with DIFFERENT content. A replay may only ' +
            're-apply the identical plan; ids are globally unique and never reused (§3.2 rule 1).',
        );
      }
      return { record: existing.record, replayed: true };
    },

    async readById(insight_id: ObjectId<'INS'>): Promise<InsightRecord | null> {
      const found = (await discover()).find((entry) => entry.record.insight.insight_id === insight_id);
      return found?.record ?? null;
    },

    async update(insight_id: ObjectId<'INS'>, patch: InsightPatch): Promise<InsightRecord> {
      const discovered = await resolveById(insight_id);
      const current = discovered.record;
      const merged: InsightRecord = {
        insight: {
          ...current.insight,
          ...(patch.state === undefined ? {} : { state: patch.state }),
          ...(patch.proposition === undefined ? {} : { proposition: patch.proposition }),
          ...(patch.applicable_scope === undefined
            ? {}
            : { applicable_scope: patch.applicable_scope }),
          ...(patch.evidence_refs === undefined ? {} : { evidence_refs: patch.evidence_refs }),
          ...(patch.judgment_basis === undefined
            ? {}
            : { judgment_basis: patch.judgment_basis }),
          ...(patch.gate_checks === undefined ? {} : { gate_checks: patch.gate_checks }),
          updated_at: patch.updated_at ?? now(),
        },
        comparison_ref:
          patch.comparison_ref === undefined ? current.comparison_ref : patch.comparison_ref,
        meta: patch.meta ?? current.meta,
      };
      await persist(merged, discovered);
      return merged;
    },

    async listBySourceAttempt(
      source_attempt_id: ObjectId<'ATT'>,
    ): Promise<readonly InsightRecord[]> {
      return (await discover())
        .map((entry) => entry.record)
        .filter((record) => record.insight.attempt_id === source_attempt_id)
        .sort((left, right) => {
          if (left.insight.created_at !== right.insight.created_at) {
            return left.insight.created_at < right.insight.created_at ? -1 : 1;
          }
          return left.insight.insight_id < right.insight.insight_id ? -1 : 1;
        });
    },

    async listAll(): Promise<readonly InsightRecord[]> {
      return (await discover())
        .map((entry) => entry.record)
        .sort((left, right) => {
          if (left.insight.created_at !== right.insight.created_at) {
            return left.insight.created_at < right.insight.created_at ? -1 : 1;
          }
          return left.insight.insight_id < right.insight.insight_id ? -1 : 1;
        });
    },

    async recordBatchIfAbsent(
      batch: InsightGenerationBatch,
    ): Promise<{ readonly batch: InsightGenerationBatch; readonly replayed: boolean }> {
      const existing = (await discoverBatches()).find(
        (candidate) => candidate.batch_id === batch.batch_id,
      );
      if (existing === undefined) {
        await storage.writeFile(insightBatchPath(batch.batch_id), serializeInsightBatch(batch));
        return { batch, replayed: false };
      }
      if (serializeInsightBatch(existing) !== serializeInsightBatch(batch)) {
        throw new InsightRepositoryError(
          'PLAN_MISMATCH',
          batch.batch_id,
          'The same batch identity already exists with DIFFERENT content; a replay may only re-apply the identical plan (M8-HARDENING-01).',
        );
      }
      return { batch: existing, replayed: true };
    },

    async readBatch(batch_id: string): Promise<InsightGenerationBatch | null> {
      return (await discoverBatches()).find((batch) => batch.batch_id === batch_id) ?? null;
    },

    async findBatchByOperationId(operation_id: string): Promise<InsightGenerationBatch | null> {
      return (await discoverBatches()).find((batch) => batch.operation_id === operation_id) ?? null;
    },

    /**
     * The batches of one source record.
     *
     * 🔴 Ordered by `created_at` only so a caller can tell which explicit generation happened most
     *    recently. 🔴 This is NOT a version comparison: no batch is "higher", and the order carries
     *    no correctness, strength or reliability claim (§2.4 / `D-051`).
     */
    async listBatchesBySourceAttempt(
      source_attempt_id: ObjectId<'ATT'>,
    ): Promise<readonly InsightGenerationBatch[]> {
      return (await discoverBatches())
        .filter((batch) => batch.source_attempt_id === source_attempt_id)
        .sort((left, right) => {
          if (left.created_at !== right.created_at) {
            return left.created_at < right.created_at ? -1 : 1;
          }
          return left.batch_id < right.batch_id ? -1 : 1;
        });
    },

    async readOperationAnchor(operation_key: string): Promise<InsightOperationAnchor | null> {
      const path = insightOperationAnchorPath(operation_key);
      if (!(await storage.exists(path))) {
        return null;
      }
      const json = await storage.readFile(path);
      if (!declaresObjectType(json, INSIGHT_OPERATION_ANCHOR_OBJECT_TYPE)) {
        return null;
      }
      return parseInsightOperationAnchor(json, path);
    },

    async writeOperationAnchor(anchor: InsightOperationAnchor): Promise<void> {
      await storage.writeFile(
        insightOperationAnchorPath(anchor.operation_key),
        serializeInsightOperationAnchor(anchor),
      );
    },

    /**
     * Appends one state event.
     *
     * 🔴 The log is APPEND-ONLY: an existing line is never rewritten. Nothing here counts the
     *    events, orders them by a stored ordinal or derives a score from them (`D-040` / AC-65).
     */
    async appendStateEvent(event: InsightStateEvent): Promise<void> {
      const existing = await readEventLog();
      const prefix = existing.length === 0 || existing.endsWith('\n') ? existing : `${existing}\n`;
      await storage.writeFile(
        INSIGHT_STATE_EVENTS_FILE,
        `${prefix}${serializeInsightStateEvent(event)}\n`,
      );
    },

    async listStateEventsByInsight(
      insight_id: ObjectId<'INS'>,
    ): Promise<readonly InsightStateEvent[]> {
      const log = await readEventLog();
      const events: InsightStateEvent[] = [];
      let index = 0;
      for (const line of stateEventLinesOf(log)) {
        const event = parseInsightStateEvent(line, `${INSIGHT_STATE_EVENTS_FILE}#${index}`);
        index += 1;
        if (event.insight_id === insight_id) {
          events.push(event);
        }
      }
      return events;
    },
  };
}
