/**
 * S01 ｜ Deterministic fixture harness for the `M7` grounding suite.
 *
 * 🔴 NOT_A_REAL_LLM_OUTPUT: the retrieval driving this harness uses the `M6` fake `M10` adapter with
 *    ONE hand-written verdict (`compared_not_matched`). A suite that passes here proves the
 *    APPLICATION's behaviour - it verifies no model, no provider and makes no network call
 *    (Real Provider Calls = NOT EXECUTED).
 * 🔴 Relatedness in every fixture comes from a DETERMINISTICALLY matched Level A dimension (two
 *    byte-identical values), never from a judge answer, so the fixtures do not depend on the
 *    test double's verdict at all.
 * 🔴 Attempts are seeded through the REAL repository, so the grounding targets are real persisted
 *    records and not a parallel in-memory model.
 */

import type { Attempt } from '../../../domain/types/attempt.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';
import type { LevelADimension } from '../../../domain/types/level-a.js';
import { fieldPathForLevelADimension } from '../../../domain/types/level-a.js';
import type { PersistedContentItem } from '../../../domain/types/content-item-record.js';
import type { RefRole } from '../../../domain/types/evidence-ref.js';
import type { RetrievalDerivationRecord } from '../../../retrieval/compare/types.js';
import type { GroundingHistoricalAttempt } from '../../../retrieval/grounding/catalog.js';
import type { GroundingSelection } from '../../../retrieval/grounding/types.js';
import { NOT_A_REAL_LLM_OUTPUT, makeHarness } from '../compare/harness.js';
import type { RetrievalHarness } from '../compare/harness.js';

/* ------------------------------------------------------------------ *
 * Identities
 * ------------------------------------------------------------------ */

export const ID_SOURCE = 'ATT_0000000000000000000000000S';
/** Related via `goal` + `condition`; result status `Failed`. */
export const ID_RELATED = 'ATT_0000000000000000000000000C';
/** Related via `goal`; result status `Unknown` - the `AC-40` boundary record. */
export const ID_UNKNOWN = 'ATT_0000000000000000000000000U';
/** Related via `goal`. */
export const ID_RELATED_SECOND = 'ATT_0000000000000000000000000E';
/** A `Draft` - never referenceable. */
export const ID_DRAFT = 'ATT_0000000000000000000000000D';
/** `Formal` and in the SAME project, but no matched Level A dimension. */
export const ID_SAME_PROJECT_UNRELATED = 'ATT_0000000000000000000000000P';
/** `Formal`, another project, no matched Level A dimension. */
export const ID_UNRELATED = 'ATT_0000000000000000000000000N';

export const PROJECT_SHARED = 'PRJ_shared';

/**
 * The owner of a reference.
 * 🔴 `M7` never creates an `Insight` / `Hypothesis`; these ids stand in for the owner objects
 *    `M8` / `M9` will create.
 */
export const OWNER_INSIGHT = 'INS_00000000000000000000000001';
export const OWNER_HYPOTHESIS = 'HYP_00000000000000000000000001';

export function at(value: string): ObjectId<'ATT'> {
  return value as ObjectId<'ATT'>;
}

/* ------------------------------------------------------------------ *
 * Path helpers (the frozen, index-free `<field>#<content_item_id>` form)
 * ------------------------------------------------------------------ */

export type LevelACarrier = LevelADimension;

/**
 * The `source_field_path` of one Level A dimension of an Attempt seeded by this harness.
 *
 * 🔴 The carrier field path is read from the FROZEN §9.4.1 mapping
 *    (`fieldPathForLevelADimension`), never re-spelled here: the dimension is `result` while its
 *    single primary carrier is `actual_result`, and a second copy of that table is exactly how the
 *    two would drift apart.
 * 🔴 Identity is the CONTENT ITEM, never a position: lookups scan for the item's own id.
 */
export function levelAPath(attempt_id: string, dimension: LevelADimension): string {
  return `${fieldPathForLevelADimension(dimension)}#${attempt_id}:${dimension}`;
}

/** A `Fact` content item's path on a bare carrier that this harness seeds directly. */
export function factPath(attempt_id: string, carrier: string): string {
  return `${carrier}#${attempt_id}:${carrier}`;
}

/** One requested reference; `M8` / `M9` choose, `M7` validates. */
export function pick(
  target_id: string,
  source_field_path: string,
  role: RefRole,
): GroundingSelection {
  return { target_id, source_field_path, role };
}

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

export function makeRetrievalHarness(): RetrievalHarness {
  return makeHarness(() => ({
    kind: 'structured',
    value: { verdict: 'compared_not_matched', reason: NOT_A_REAL_LLM_OUTPUT },
  }));
}

/**
 * Seeds the standard fixture and runs step ⑥ once.
 *
 * Source: goal `G` / approach `S1` / condition `C1` / result `R1`.
 *   - `ID_RELATED`      : goal `G` + condition `C1`   ⇒ related (deterministic)
 *   - `ID_UNKNOWN`      : goal `G`, result status `Unknown` ⇒ related
 *   - `ID_RELATED_SECOND`: goal `G`                   ⇒ related
 *   - `ID_DRAFT`        : a `Draft` ⇒ excluded from the corpus
 *   - `ID_SAME_PROJECT_UNRELATED` / `ID_UNRELATED`: nothing matched ⇒ NOT related
 * ⇒ `N_检索 = 3`.
 */
export async function seedFixture(): Promise<{
  readonly retrieval: RetrievalHarness;
  readonly source_attempt_id: ObjectId<'ATT'>;
  readonly record: RetrievalDerivationRecord;
}> {
  const retrieval = makeRetrievalHarness();
  const source_attempt_id = at(ID_SOURCE);

  await retrieval.seed({
    attempt_id: ID_SOURCE,
    project_id: PROJECT_SHARED,
    goal: 'G',
    approach: 'S1',
    condition: 'C1',
    result: 'R1',
  });
  await retrieval.seed({
    attempt_id: ID_RELATED,
    project_id: 'PRJ_other',
    goal: 'G',
    approach: 'S2',
    condition: 'C1',
    result: 'R2',
  });
  await retrieval.seed({
    attempt_id: ID_UNKNOWN,
    project_id: 'PRJ_other',
    goal: 'G',
    approach: 'S3',
    condition: 'C3',
    result: 'R3',
    result_status_value: 'Unknown',
  });
  await retrieval.seed({
    attempt_id: ID_RELATED_SECOND,
    project_id: PROJECT_SHARED,
    goal: 'G',
    approach: 'S4',
    condition: 'C2',
    result: 'R4',
  });
  await retrieval.seed({
    attempt_id: ID_DRAFT,
    state: 'Draft',
    goal: 'G',
    approach: 'S5',
    condition: 'C5',
    result: 'R5',
  });
  await retrieval.seed({
    attempt_id: ID_SAME_PROJECT_UNRELATED,
    project_id: PROJECT_SHARED,
    goal: 'X1',
    approach: 'S6',
    condition: 'C6',
    result: 'R6',
  });
  await retrieval.seed({
    attempt_id: ID_UNRELATED,
    project_id: 'PRJ_third',
    goal: 'X2',
    approach: 'S7',
    condition: 'C7',
    result: 'R7',
  });

  const outcome = await retrieval.service.runRetrievalForFormalAttempt({
    source_attempt_id,
  });
  if (outcome.kind !== 'completed') {
    throw new Error(`the fixture retrieval did not complete: ${outcome.kind}`);
  }
  return { retrieval, source_attempt_id, record: outcome.derivation };
}

/** Every record of the workspace with its attached content items, read FRESH from the repository. */
export async function allHistoricalOf(
  retrieval: RetrievalHarness,
): Promise<readonly GroundingHistoricalAttempt[]> {
  const attempts = await retrieval.repository.listAttempts();
  const out: GroundingHistoricalAttempt[] = [];
  for (const attempt of attempts) {
    out.push({
      attempt,
      content_items: await retrieval.repository.readAttemptContentItems(attempt.attempt_id),
    });
  }
  return out;
}

/** The same, for a chosen subset of ids. */
export async function historicalOf(
  retrieval: RetrievalHarness,
  attempt_ids: readonly string[],
): Promise<readonly GroundingHistoricalAttempt[]> {
  const out: GroundingHistoricalAttempt[] = [];
  for (const id of attempt_ids) {
    const attempt: Attempt | null = await retrieval.repository.readAttempt(at(id));
    if (attempt === null) {
      continue;
    }
    out.push({
      attempt,
      content_items: await retrieval.repository.readAttemptContentItems(at(id)),
    });
  }
  return out;
}

/** Attaches content items to an already-seeded record (docs/02 §C.4). */
export async function attachContentItems(
  retrieval: RetrievalHarness,
  attempt_id: string,
  items: readonly PersistedContentItem[],
): Promise<void> {
  await retrieval.repository.updateAttempt(at(attempt_id), { content_items: items });
}

/** Archives a target through the real repository (a state change, never a delete). */
export async function archiveAttempt(
  retrieval: RetrievalHarness,
  attempt_id: string,
): Promise<void> {
  await retrieval.repository.updateAttempt(at(attempt_id), { archive_state: 'archived' });
}
