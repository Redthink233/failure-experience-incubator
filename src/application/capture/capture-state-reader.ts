/**
 * S01-06B ｜ `M4` PROVIDER-INDEPENDENT capture READ port.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────────────
 * Steps ①–⑤ have a WRITE half (the AI parse, the candidate-cause inference) and a READ half
 * (「这一个记录现在是什么状态」). The read half never calls a model: it reads the persisted `Attempt`,
 * its attached `Attempt Draft State` and its `ContentItem`s and rebuilds the SAME
 * `CaptureStateSnapshot` the service returns.
 *
 * 🔴 IT IS A MOVE, NOT A SECOND IMPLEMENTATION. The gap derivation (`missingFollowUpGaps`), the
 *    reload reconstruction (`recoverParseProposal`) and the read assembly were EXTRACTED from
 *    `capture-service.ts` and are consumed by it from here - there is exactly ONE implementation of
 *    each, so a provider-less browse and the full workflow can never disagree about a record.
 * 🔴 IT DEPENDS ON NO PROVIDER, NO CREDENTIAL AND NO NETWORK. That is what lets the App Shell list
 *    and open an existing workspace BEFORE any model is configured (S01-06-D1).
 * 🔴 THE AI COMMAND BOUNDARY IS UNTOUCHED: `analyseCandidateCauses` and the step ② parse still live
 *    in `capture-service.ts` behind the injected `M10` adapter, and this file adds no way to reach
 *    them. Splitting the READ route does not lower the `M4`/`M5` provider boundary.
 * 🔴 NO PRODUCT SEMANTICS CHANGE: the same fields, the same canonical gaps, the same
 *    `parse_state`-driven proposal recovery, the same follow-up budget derivation.
 *
 * The snapshot types (`CaptureStateSnapshot` / `FollowUpQuestionState`) live here because they are
 * the READ contract; `capture-service.ts` re-exports them, so every existing import path is stable.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond `AttemptRepository`.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { Attempt } from '../../domain/types/attempt.js';
import type { PersistedContentItem } from '../../domain/types/content-item-record.js';
import {
  KEY_PARAMETER_FIELD_KEY,
  aiParseExtractionItemId,
  canonicalFieldKeyForAttemptField,
  findContentItem,
} from '../../domain/types/content-item-record.js';
import type { AttemptDraftState } from '../../domain/types/follow-up.js';
import {
  FOLLOW_UP_GAP_ATTEMPT_FIELD,
  FOLLOW_UP_GAP_KEYS,
  createInitialDraftState,
} from '../../domain/types/follow-up.js';
import type { AttemptRepository } from '../../workspace/repository/attempt-repository.js';
import type { FollowUpQuestionBudget } from './follow-up-budget.js';
import {
  budgetFromPersistedState,
  followUpQuestionTexts,
  isFollowUpBudgetExhausted,
  nextFollowUpGap,
  remainingFollowUpQuestions,
} from './follow-up-budget.js';
import type {
  FollowUpGapKey,
  ParsedFieldExtraction,
  ParsedKeyParameter,
  ParseRuntimeStatus,
  StructuredParseProposal,
} from './types.js';
import { CAPTURE_FIELD_KEYS } from './types.js';

/* ------------------------------------------------------------------ *
 * 1. The read contract
 * ------------------------------------------------------------------ */

export interface FollowUpQuestionState {
  readonly budget: FollowUpQuestionBudget;
  readonly remaining: number;
  readonly exhausted: boolean;
  /** `null` means "nothing worth asking" - go straight to the structured confirmation. */
  readonly next_gap: FollowUpGapKey | null;
  readonly missing_gaps: readonly FollowUpGapKey[];
}

/** Everything `M15` / the UI needs to render steps ②–③ without holding any state of its own. */
export interface CaptureStateSnapshot {
  readonly attempt: Attempt;
  readonly draft_state: AttemptDraftState;
  readonly content_items: readonly PersistedContentItem[];
  readonly follow_up: FollowUpQuestionState;
}

/* ------------------------------------------------------------------ *
 * 2. Gap derivation
 * ------------------------------------------------------------------ */

/**
 * True when the record already carries a value for this canonical gap.
 *
 * 🔴 The canonical gap name and the `Attempt` property name are NOT always identical
 *    (`key_parameter` vs `key_parameters`), so the read goes through the explicit table
 *    `FOLLOW_UP_GAP_ATTEMPT_FIELD`. No physical property name is ever treated as a gap name
 *    (or as a `field_key`) directly.
 */
function gapIsSatisfied(attempt: Attempt, gap: FollowUpGapKey): boolean {
  const attempt_field = FOLLOW_UP_GAP_ATTEMPT_FIELD[gap];
  if (attempt_field === 'key_parameters') {
    return attempt.key_parameters.length > 0;
  }
  return attempt[attempt_field].presence_state === 'present';
}

/**
 * The gaps that are still open, restricted to the canonical `P1`/`P2`/`P3` dimensions.
 *
 * 🔴 A gap the record ALREADY carries is no longer a gap: asking again what the user has already
 *    supplied would spend the budget on nothing (AC-Q06-4 / task §11).
 * 🔴 `proposal === null` (no parse outcome yet, or a runtime failure) is not "no gaps": the
 *    record's own explicit `unknown` dimensions are then the gaps, so the mechanism keeps working
 *    without a parse result. Nothing is ever invented here - the gaps are read, not guessed.
 */
export function missingFollowUpGaps(
  proposal: StructuredParseProposal | null,
  attempt?: Attempt,
): readonly FollowUpGapKey[] {
  if (proposal === null && attempt === undefined) {
    return [];
  }
  return FOLLOW_UP_GAP_KEYS.filter((gap) => {
    if (attempt !== undefined && gapIsSatisfied(attempt, gap)) {
      return false;
    }
    if (proposal === null) {
      return true;
    }
    if (gap === 'key_parameter') {
      return proposal.key_parameters.length === 0;
    }
    return (proposal.missing_fields as readonly string[]).includes(gap);
  });
}

/**
 * Rebuilds the "pending parse proposal" from the PERSISTED content items + `parse_state`.
 *
 * 🔴 This is what makes step ③ survive a reload (task §10): the same information the in-memory
 *    `Map` holds is recoverable from the record itself.
 * 🔴 `parse_status` is DERIVED from the recovered content instead of being stored: it is a
 *    per-call provider report, not a product field, and inventing a persisted slot for it would
 *    put a provider self-report into the product record.
 */
export function recoverParseProposal(
  attempt_id: string,
  items: readonly PersistedContentItem[],
  draft_state: AttemptDraftState,
): StructuredParseProposal | null {
  if (draft_state.parse_state === 'not_parsed' || draft_state.parse_state === 'extract_failed') {
    return null;
  }
  const extractions: ParsedFieldExtraction[] = [];
  for (const field of CAPTURE_FIELD_KEYS) {
    const field_key = canonicalFieldKeyForAttemptField(field);
    const item = findContentItem(items, aiParseExtractionItemId(attempt_id, field_key));
    if (item !== null && item.field_key === field_key && item.source_type === 'Extraction') {
      extractions.push({ field, value: item.value });
    }
  }
  /*
   * 🔴 The identity is READ BACK from the persisted item - never re-derived from a position. A
   *    reload therefore resolves every parameter to the SAME object it was created as, and a new
   *    parse never reuses an old id for different content (contract §3.2 / task §8).
   */
  const key_parameters: ParsedKeyParameter[] = items
    .filter(
      (item) => item.field_key === KEY_PARAMETER_FIELD_KEY && item.source_type === 'Extraction',
    )
    .map((item) => ({ content_item_id: item.content_item_id, value: item.value }));
  const missing_fields = CAPTURE_FIELD_KEYS.filter(
    (field) => !extractions.some((entry) => entry.field === field),
  );
  const statusItem = findContentItem(items, aiParseExtractionItemId(attempt_id, 'result_status'));
  const result_status_proposal =
    statusItem !== null &&
    statusItem.source_type === 'Inference' &&
    statusItem.confirmation_class === 'decision' &&
    statusItem.decision_state === 'unresolved'
      ? statusItem.value
      : null;

  const parse_status: ParseRuntimeStatus =
    extractions.length === 0 && key_parameters.length === 0
      ? 'failed_to_extract'
      : missing_fields.length === 0
        ? 'extracted'
        : 'partially_extracted';

  return {
    attempt_id,
    parse_status,
    extractions,
    key_parameters,
    missing_fields,
    result_status_proposal,
  };
}

/* ------------------------------------------------------------------ *
 * 3. The reader
 * ------------------------------------------------------------------ */

export interface CaptureStateReaderDeps {
  readonly repository: AttemptRepository;
  /**
   * The OWNING service's in-memory pending-proposal cache, when there is one.
   *
   * 🔴 It is an optimisation, never a source of truth: the answer is fully recoverable from the
   *    persisted content items, which is exactly why a reader without a cache (a browser reload, or
   *    the provider-less read composition) returns the SAME snapshot.
   */
  readonly pending_proposal_of?: (attempt_id: ObjectId<'ATT'>) => StructuredParseProposal | null;
}

export interface CaptureStateReader {
  /** The PERSISTED state of one record - never an in-memory cache, never a fabricated default. */
  readCaptureState(attempt_id: ObjectId<'ATT'>): Promise<CaptureStateSnapshot | null>;
}

export function createCaptureStateReader(deps: CaptureStateReaderDeps): CaptureStateReader {
  const { repository } = deps;
  const pending_proposal_of =
    deps.pending_proposal_of ?? ((): StructuredParseProposal | null => null);

  return {
    async readCaptureState(attempt_id: ObjectId<'ATT'>): Promise<CaptureStateSnapshot | null> {
      const attempt = await repository.readAttempt(attempt_id);
      if (attempt === null) {
        return null;
      }
      const draft_state =
        (await repository.readAttemptDraftState(attempt_id)) ??
        createInitialDraftState(attempt.attempt_id);
      const content_items = await repository.readAttemptContentItems(attempt_id);
      const proposal =
        pending_proposal_of(attempt.attempt_id) ??
        recoverParseProposal(attempt.attempt_id, content_items, draft_state);
      const budget = budgetFromPersistedState(draft_state, followUpQuestionTexts(content_items));
      const missing_gaps = missingFollowUpGaps(proposal, attempt);
      return {
        attempt,
        draft_state,
        content_items,
        follow_up: {
          budget,
          remaining: remainingFollowUpQuestions(budget),
          exhausted: isFollowUpBudgetExhausted(budget),
          next_gap: nextFollowUpGap(budget, missing_gaps),
          missing_gaps,
        },
      };
    },
  };
}
