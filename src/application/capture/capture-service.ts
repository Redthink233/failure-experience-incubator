/**
 * S01-05 ｜ The capture service - orchestration of `D9` steps ①–⑤.
 *
 * Contract: §9 ①–⑤; §9.1 (idempotency of a save); §10.1 layers 1 / 2;
 *           §4.2 rule 3 (`D-024` / AC-30 - follow-up answers are stored in TWO layers);
 *           docs/02 §C.4 (`Content Item`) and §C.5 (`Attempt Draft State`, 1:1 attached record).
 *
 * 🔴 Application layer only: it depends on the `AttemptRepository` (workspace) and on the `M10`
 *    `ProviderAdapter` INTERFACE (AI). It builds no adapter, selects no network path and reads no
 *    environment variable - the composition root (`M15`) injects both.
 * 🔴 Every write is a command with an `operation_id` handed in by `M15`. Replaying the SAME
 *    operation returns the recorded result instead of creating a second object or a second write
 *    (§9.1: 重复保存幂等). No version system is involved (AC-122).
 * 🔴 A runtime failure never deletes or replaces the user's record: the Draft, the raw text and
 *    every already-saved value survive and a retry is always allowed (§10.1 layer 2 / AC-89).
 *
 * 🔴 S01-05-INTEGRATE additions - all of them are PERSISTENCE wiring of already-frozen semantics,
 *    not new product mechanisms:
 *    ① the step ② AI extractions are persisted as `ContentItem`s, so the "pending parse proposal"
 *       can be REBUILT after a browser reload / service recreation. The in-memory `Map` is only a
 *       cache, never the only source of truth (task §10).
 *    ② the key follow-up question counter, the abandoned-gap set, the asked-gap set and
 *       `parse_state` live in the persisted `Attempt Draft State`, so the 4th question stays
 *       impossible and a dismissed gap is never asked again after a reload (AC-16 / AC-17).
 *    ③ a follow-up answer is persisted in TWO layers - the user's own words (`Fact`) and the AI's
 *       induction (`Extraction`) - and the targeted main field is updated in the SAME patch, so the
 *       answer is never an island content item (task §6 / §9 ③).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { Attempt, DataSourceNature } from '../../domain/types/attempt.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import type { PersistedContentItem } from '../../domain/types/content-item-record.js';
import {
  KEY_PARAMETER_FIELD_KEY,
  aiParseExtractionItem,
  aiParseExtractionItemId,
  aiParseResultStatusItem,
  canonicalFieldKeyForAttemptField,
  findContentItem,
  followUpQuestionItem,
  followUpQuestionItemId,
  mergeContentItems,
} from '../../domain/types/content-item-record.js';
import type { AttemptDraftState, AttemptParseState } from '../../domain/types/follow-up.js';
import {
  applyDraftStatePatch,
  createInitialDraftState,
  gapPriorityHintOf,
  replaceDraftState,
} from '../../domain/types/follow-up.js';
import type { AttemptRepository } from '../../workspace/repository/attempt-repository.js';
import {
  createCaptureStateReader,
  missingFollowUpGaps,
  recoverParseProposal,
} from './capture-state-reader.js';
import type { CaptureStateSnapshot, FollowUpQuestionState } from './capture-state-reader.js';
import {
  analyseCandidateCauses as analyseCauses,
  candidateCausesPatch,
  decideCandidateCauses as decideCauses,
} from './cause-analysis.js';
import type { CauseDecisionRequest, CauseDecisionResult } from './cause-analysis.js';
import { confirmStructuredAttempt } from './confirmation.js';
import type { ConfirmationResult } from './confirmation.js';
import type { FollowUpQuestionBudget, FollowUpRequestRejectionCode } from './follow-up-budget.js';
import {
  createFollowUpQuestionBudget,
  isFollowUpBudgetExhausted,
  nextFollowUpGap,
  remainingFollowUpQuestions,
  requestFollowUpQuestion,
} from './follow-up-budget.js';
import type { FollowUpGapKey } from './types.js';
import { evaluateFormalization } from './formalization.js';
import type { FormalizationResult } from './formalization.js';
import { validateAttemptCaptureInput } from './input-validation.js';
import { parseAttemptText } from './structured-parse.js';
import type {
  CaptureInputValidation,
  CaptureProviderContext,
  CauseAnalysisOutcome,
  StructuredConfirmationRequest,
  StructuredParseOutcome,
  StructuredParseProposal,
} from './types.js';

/* ------------------------------------------------------------------ *
 * Idempotency ledger
 * ------------------------------------------------------------------ */

/**
 * Remembers the result of a write operation by `operation_id`.
 *
 * 🔴 Deliberately NOT a version system: it stores no history, keeps no versions, exposes no
 *    "current / earlier" notion and lives and dies with the service instance (AC-122).
 * 🔴 It is also NOT a source of truth: everything it remembers is recoverable from the persisted
 *    record, so recreating the service loses no business state (task §7 / §10).
 */
class OperationLedger {
  private readonly entries = new Map<string, unknown>();

  read<T>(operation_id: string): T | null {
    return this.entries.has(operation_id) ? (this.entries.get(operation_id) as T) : null;
  }

  write(operation_id: string, value: unknown): void {
    this.entries.set(operation_id, value);
  }
}

/* ------------------------------------------------------------------ *
 * The provider-independent READ half (S01-06B)
 * ------------------------------------------------------------------ */

/**
 * 🔴 `missingFollowUpGaps` / `recoverParseProposal` and the read assembly now live in
 *    `capture-state-reader.ts`, so the AI service and the provider-less browse path share ONE
 *    implementation of the gap rules. They are re-exported here so every existing import path keeps
 *    working unchanged.
 */
export { missingFollowUpGaps, recoverParseProposal } from './capture-state-reader.js';
export type { CaptureStateSnapshot, FollowUpQuestionState } from './capture-state-reader.js';

/* ------------------------------------------------------------------ *
 * Commands / outcomes
 * ------------------------------------------------------------------ */

export interface BeginCaptureCommand {
  readonly operation_id: string;
  readonly raw_text: string;
  readonly project_id?: string;
  readonly data_source_nature?: DataSourceNature;
  /** Injectable clock (ISO-8601) - keeps fixtures deterministic. */
  readonly created_at?: string;
}

export interface BeginCaptureOutcome {
  readonly kind: 'input_rejected' | 'captured';
  readonly validation: CaptureInputValidation;
  readonly attempt: Attempt | null;
  readonly parse: StructuredParseOutcome | null;
  readonly follow_up: FollowUpQuestionState | null;
  /** The `Attempt Draft State` as persisted by this call (`null` for a rejected input). */
  readonly draft_state: AttemptDraftState | null;
  /** `true` when this call replayed an earlier `operation_id` instead of writing again. */
  readonly idempotent_replay: boolean;
}

export interface ApplyConfirmationOutcome {
  readonly result: ConfirmationResult;
  /** The persisted Draft (only for `kind: 'applied'`); `null` when nothing was written. */
  readonly persisted: Attempt | null;
  readonly idempotent_replay: boolean;
}

export interface PersistCandidateCausesCommand {
  readonly operation_id: string;
  readonly decision: CauseDecisionResult;
}

export interface PersistCandidateCausesOutcome {
  readonly persisted: Attempt | null;
  readonly ignored_content_item_ids: readonly string[];
  readonly idempotent_replay: boolean;
}

export interface SaveFormalAttemptCommand {
  readonly operation_id: string;
  readonly attempt_id: ObjectId<'ATT'>;
  readonly user_explicitly_confirmed: boolean;
  readonly follow_up_budget?: FollowUpQuestionBudget;
  /** Candidate causes persisted together with the promotion (unresolved ones included). */
  readonly candidate_causes?: CauseDecisionResult;
}

export interface SaveFormalAttemptOutcome {
  readonly formalization: FormalizationResult;
  /** The stored `Formal Attempt`, or the unchanged record when the promotion was blocked. */
  readonly attempt: Attempt | null;
  readonly idempotent_replay: boolean;
}

export interface AskFollowUpQuestionCommand {
  readonly operation_id: string;
  readonly attempt_id: ObjectId<'ATT'>;
  readonly question_text: string;
  /** Exactly ONE gap - a bundled question is structurally refused (AC-Q06-3). */
  readonly target_gap: FollowUpGapKey;
}

export interface RegisteredFollowUpQuestion {
  readonly content_item_id: string;
  readonly target_gap: FollowUpGapKey;
  readonly question_text: string;
}

export interface AskFollowUpQuestionOutcome {
  readonly kind: 'asked' | 'rejected' | 'attempt_not_found';
  readonly rejection_code: FollowUpRequestRejectionCode | null;
  readonly rejection_detail: string | null;
  readonly question: RegisteredFollowUpQuestion | null;
  readonly draft_state: AttemptDraftState | null;
  readonly follow_up: FollowUpQuestionState | null;
  readonly idempotent_replay: boolean;
}

export interface AbandonFollowUpGapCommand {
  readonly operation_id: string;
  readonly attempt_id: ObjectId<'ATT'>;
  /** The gap the user dismissed with 「不知道 / 跳过 / 就这样继续」 (AC-17). */
  readonly gap: FollowUpGapKey;
}

export interface AbandonFollowUpGapOutcome {
  readonly kind: 'abandoned' | 'attempt_not_found';
  readonly draft_state: AttemptDraftState | null;
  readonly follow_up: FollowUpQuestionState | null;
  readonly idempotent_replay: boolean;
}

export interface AttemptCaptureService {
  beginCapture(command: BeginCaptureCommand): Promise<BeginCaptureOutcome>;
  applyStructuredConfirmation(
    command: StructuredConfirmationRequest,
  ): Promise<ApplyConfirmationOutcome>;
  analyseCandidateCauses(attempt_id: ObjectId<'ATT'>): Promise<CauseAnalysisOutcome | null>;
  decideCandidateCauses(request: CauseDecisionRequest): CauseDecisionResult;
  persistCandidateCauses(
    command: PersistCandidateCausesCommand,
  ): Promise<PersistCandidateCausesOutcome>;
  saveFormalAttempt(command: SaveFormalAttemptCommand): Promise<SaveFormalAttemptOutcome>;
  /** Reads the PERSISTED capture state - never the in-memory cache (§7 / §10). */
  readCaptureState(attempt_id: ObjectId<'ATT'>): Promise<CaptureStateSnapshot | null>;
  /** Registers ONE key follow-up question. This is the ONLY place the counter grows. */
  askFollowUpQuestion(command: AskFollowUpQuestionCommand): Promise<AskFollowUpQuestionOutcome>;
  /** Records a 「不知道 / 跳过 / 就这样继续」 dismissal for one canonical gap (AC-17). */
  abandonFollowUpGap(command: AbandonFollowUpGapCommand): Promise<AbandonFollowUpGapOutcome>;
}

export interface AttemptCaptureServiceDeps {
  readonly repository: AttemptRepository;
  readonly provider: CaptureProviderContext;
}

/* ------------------------------------------------------------------ *
 * Persistence helpers
 * ------------------------------------------------------------------ */

/**
 * `parse_state` after a step ② outcome - strictly within the canonical non-graded value set.
 * 🔴 No confidence, no completeness, no quality grade (AC-88 / AC-93).
 */
export function parseStateAfterParse(outcome: StructuredParseOutcome): AttemptParseState {
  if (outcome.kind === 'runtime_failure') {
    return 'extract_failed';
  }
  const proposal = outcome.proposal;
  const hasContent =
    proposal.extractions.length > 0 ||
    proposal.key_parameters.length > 0 ||
    proposal.result_status_proposal !== null;
  return hasContent ? 'pending_user_confirm' : 'not_extracted';
}

/**
 * The `ContentItem`s a step ② proposal is persisted as.
 *
 * 🔴 Every item is registered under its **canonical** `field_key`
 *    (`environment → version_env`, `user_note → note`), never under the `Attempt` physical
 *    property name: the mapping is `canonicalFieldKeyForAttemptField` (`TQ18`, task §2 of S01-05B).
 * 🔴 A key parameter carries the identity minted for it at parse time - the item list position
 *    is never promoted to an id (contract §3.2).
 */
export function parseProposalContentItems(
  attempt_id: string,
  proposal: StructuredParseProposal,
): readonly PersistedContentItem[] {
  const items: PersistedContentItem[] = [];
  for (const extraction of proposal.extractions) {
    const field_key = canonicalFieldKeyForAttemptField(extraction.field);
    items.push(
      aiParseExtractionItem(
        aiParseExtractionItemId(attempt_id, field_key),
        field_key,
        extraction.value,
      ),
    );
  }
  proposal.key_parameters.forEach((parameter) => {
    items.push(
      aiParseExtractionItem(
        parameter.content_item_id,
        KEY_PARAMETER_FIELD_KEY,
        parameter.value,
      ),
    );
  });
  if (proposal.result_status_proposal !== null) {
    items.push(
      aiParseResultStatusItem(
        aiParseExtractionItemId(attempt_id, 'result_status'),
        proposal.result_status_proposal,
      ),
    );
  }
  return items;
}

/** The gaps that are still open AND still worth asking about (not asked, not dismissed). */
function openAskableGaps(
  proposal: StructuredParseProposal | null,
  attempt: Attempt,
  draft_state: AttemptDraftState,
): readonly FollowUpGapKey[] {
  return missingFollowUpGaps(proposal, attempt).filter(
    (gap) =>
      !draft_state.asked_gap_set.includes(gap) && !draft_state.abandoned_gap_set.includes(gap),
  );
}

/* ------------------------------------------------------------------ *
 * Service
 * ------------------------------------------------------------------ */

export function createAttemptCaptureService(deps: AttemptCaptureServiceDeps): AttemptCaptureService {
  const { repository, provider } = deps;
  const ledger = new OperationLedger();
  /** Cache of the current pending parse proposal. 🔴 Never the only source of truth. */
  const pending_proposals = new Map<string, StructuredParseProposal>();

  /*
   * 🔴 S01-06B: the READ route is the shared, provider-independent reader. The service passes its
   *    in-memory proposal cache IN as an optimisation only, so the snapshot it returns and the one a
   *    provider-less browse returns are computed by the SAME code over the SAME persisted record.
   */
  const reader = createCaptureStateReader({
    repository,
    pending_proposal_of: (attempt_id) => pending_proposals.get(attempt_id) ?? null,
  });

  /** The persisted state of one record, read from the workspace (never from a cache). */
  const readState = (attempt_id: ObjectId<'ATT'>) => reader.readCaptureState(attempt_id);

  function notFoundFormalization(attempt_id: string): FormalizationResult {
    return {
      decision: {
        outcome: 'draft_retained',
        attempt_id,
        missing_fields: [],
        block_reasons: ['ATTEMPT_NOT_FOUND'],
      },
      gate_report: { results: [], all_satisfied: false, unsatisfied_gate_ids: [] },
      formal_gate: { satisfied: false, missing_fields: [], result_status_confirmed: false },
      missing_fields: [],
      follow_up_budget_exhausted: false,
      retention_note: `No Attempt exists for "${attempt_id}".`,
      promotion_patch: null,
    };
  }

  return {
    /**
     * Steps ① and ②.
     *
     * 🔴 An empty / whitespace-only input is an ENTRY HINT, not an error and not a record: no
     *    Draft is created and nothing else changes (AC-87).
     * 🔴 The step ② proposal is PERSISTED (as `Extraction` content items) together with the
     *    `Attempt Draft State`, so a reload can resume step ③ without the in-memory cache.
     */
    async beginCapture(command: BeginCaptureCommand): Promise<BeginCaptureOutcome> {
      const validation = validateAttemptCaptureInput(command.raw_text);
      if (validation.kind === 'rejected') {
        return {
          kind: 'input_rejected',
          validation,
          attempt: null,
          parse: null,
          follow_up: null,
          draft_state: null,
          idempotent_replay: false,
        };
      }

      const replay = ledger.read<BeginCaptureOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true };
      }

      const attempt = await repository.createAttempt({
        raw_text: command.raw_text,
        ...(command.project_id === undefined ? {} : { project_id: command.project_id }),
        ...(command.data_source_nature === undefined
          ? {}
          : { data_source_nature: command.data_source_nature }),
        ...(command.created_at === undefined ? {} : { created_at: command.created_at }),
      });

      /*
       * Step ②. A runtime failure leaves the Draft EXACTLY as created - it is never rescued by a
       * fabricated result and never re-created.
       */
      const parse = await parseAttemptText(provider.adapter, provider.credential_ref, {
        attempt_id: attempt.attempt_id,
        raw_text: attempt.raw_text.value,
      });

      const previous_state = createInitialDraftState(attempt.attempt_id);
      const parse_state = parseStateAfterParse(parse);
      const persisted_items =
        parse.kind === 'parsed' ? parseProposalContentItems(attempt.attempt_id, parse.proposal) : [];
      const proposal = parse.kind === 'parsed' ? parse.proposal : null;
      if (proposal !== null) {
        pending_proposals.set(attempt.attempt_id, proposal);
      }

      const draft_state = applyDraftStatePatch(previous_state, {
        parse_state,
        gap_priority_hint: gapPriorityHintOf(
          openAskableGaps(proposal, attempt, previous_state),
        ),
      });

      /*
       * The step ② outcome is persisted in ONE patch: the AI extraction content items and the
       * attached draft state. 🔴 For a runtime failure nothing is invented here - the item list is
       * empty and only `parse_state = extract_failed` is recorded, leaving the Draft intact.
       */
      const stored = await repository.updateAttempt(attempt.attempt_id, {
        content_items: mergeContentItems([], persisted_items),
        draft_state,
      });

      const budget = createFollowUpQuestionBudget();
      const missing_gaps = missingFollowUpGaps(proposal, stored);
      const follow_up: FollowUpQuestionState = {
        budget,
        remaining: remainingFollowUpQuestions(budget),
        exhausted: isFollowUpBudgetExhausted(budget),
        next_gap: nextFollowUpGap(budget, missing_gaps),
        missing_gaps,
      };

      const outcome: BeginCaptureOutcome = {
        kind: 'captured',
        validation,
        attempt: stored,
        parse,
        follow_up,
        draft_state,
        idempotent_replay: false,
      };
      ledger.write(command.operation_id, outcome);
      return outcome;
    },

    /**
     * Step ③. Only an explicit confirmation writes.
     * 🔴 The patch carries field content only; it can never promote the record (§2.1).
     * 🔴 When the in-memory proposal cache is empty (a browser reload / a recreated service) the
     *    proposal is REBUILT from the persisted content items before the confirmation is applied.
     */
    async applyStructuredConfirmation(
      command: StructuredConfirmationRequest,
    ): Promise<ApplyConfirmationOutcome> {
      const attempt = await repository.readAttempt(command.attempt_id as ObjectId<'ATT'>);
      if (attempt === null) {
        return {
          result: {
            kind: 'invalid_command',
            code: 'ATTEMPT_NOT_FOUND',
            detail: `No Attempt exists for "${command.attempt_id}".`,
          },
          persisted: null,
          idempotent_replay: false,
        };
      }

      const draft_state =
        (await repository.readAttemptDraftState(attempt.attempt_id)) ??
        createInitialDraftState(attempt.attempt_id);
      const existing_items = await repository.readAttemptContentItems(attempt.attempt_id);
      const proposal =
        pending_proposals.get(attempt.attempt_id) ??
        recoverParseProposal(attempt.attempt_id, existing_items, draft_state);

      const result = confirmStructuredAttempt({ attempt, proposal, request: command });
      if (result.kind !== 'applied') {
        return { result, persisted: null, idempotent_replay: false };
      }

      const replay = ledger.read<Attempt>(command.operation_id);
      if (replay !== null) {
        return { result, persisted: replay, idempotent_replay: true };
      }

      /*
       * 🔴 The persisted content items carry the follow-up provenance pair AND the settled result
       *    status. The LATTER matters for consistency: the step ② proposal was persisted as
       *    `unresolved`, and accepting / rejecting it at step ③ must not leave a stale copy behind.
       */
      const status_record =
        result.result_status_content_item === null
          ? []
          : [{ item: result.result_status_content_item, field_key: 'result_status' as const }];
      const incoming: PersistedContentItem[] = [
        ...result.content_items,
        ...status_record.map((entry) => ({
          ...entry.item,
          field_key: entry.field_key,
          origin_hint: existingOriginHintFor(existing_items, entry.item.content_item_id),
        })),
      ];

      const persisted = await repository.updateAttempt(attempt.attempt_id, {
        ...result.patch,
        ...(incoming.length === 0
          ? {}
          : { content_items: mergeContentItems(existing_items, incoming) }),
        draft_state: applyDraftStatePatch(draft_state, { parse_state: 'extracted' }),
      });
      ledger.write(command.operation_id, persisted);
      return { result, persisted, idempotent_replay: false };
    },

    /** Step ④. Read-only: it returns a proposal and never writes (§9 ④). */
    async analyseCandidateCauses(
      attempt_id: ObjectId<'ATT'>,
    ): Promise<CauseAnalysisOutcome | null> {
      const attempt = await repository.readAttempt(attempt_id);
      if (attempt === null) {
        return null;
      }
      return analyseCauses(provider.adapter, provider.credential_ref, attempt);
    },

    /** Step ⑤ decisions. Pure: the caller persists what it accepts. */
    decideCandidateCauses(request: CauseDecisionRequest): CauseDecisionResult {
      return decideCauses(request);
    },

    /**
     * Persists the candidate set with its current decision states.
     * 🔴 Unresolved candidates are written as `unresolved` - visible and durable, never
     *    "recorded = confirmed" (AC-94).
     */
    async persistCandidateCauses(
      command: PersistCandidateCausesCommand,
    ): Promise<PersistCandidateCausesOutcome> {
      const replay_outcome = ledger.read<PersistCandidateCausesOutcome>(command.operation_id);
      if (replay_outcome !== null) {
        return { ...replay_outcome, idempotent_replay: true };
      }
      const attempt = await repository.readAttempt(
        command.decision.outcome.attempt_id as ObjectId<'ATT'>,
      );
      const ignored = command.decision.ignored_content_item_ids;
      if (attempt === null) {
        return { persisted: null, ignored_content_item_ids: ignored, idempotent_replay: false };
      }
      const persisted = await repository.updateAttempt(
        attempt.attempt_id,
        candidateCausesPatch(command.decision.outcome),
      );
      const outcome: PersistCandidateCausesOutcome = {
        persisted,
        ignored_content_item_ids: ignored,
        idempotent_replay: false,
      };
      ledger.write(command.operation_id, outcome);
      return outcome;
    },

    /**
     * Step ⑤ save.
     *
     * 🔴 The promotion is denied unless the user explicitly confirmed AND the Formal gate is
     *    satisfied; a denial leaves the record untouched (§10.1 layer 1).
     * 🔴 Candidate causes may be persisted in the SAME patch, so "not every cause was handled" is
     *    never a save precondition (AC-94).
     * 🔴 The `Attempt Draft State` is NOT cleared by a promotion: docs/02 §C.5 硬规则 2 keeps it
     *    as a read-only archive, and it never carries a threshold effect afterwards.
     */
    async saveFormalAttempt(command: SaveFormalAttemptCommand): Promise<SaveFormalAttemptOutcome> {
      const attempt = await repository.readAttempt(command.attempt_id);
      if (attempt === null) {
        return {
          formalization: notFoundFormalization(command.attempt_id),
          attempt: null,
          idempotent_replay: false,
        };
      }

      const replay = ledger.read<SaveFormalAttemptOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true };
      }

      const formalization = evaluateFormalization({
        operation_id: command.operation_id,
        attempt,
        user_explicitly_confirmed: command.user_explicitly_confirmed,
        ...(command.follow_up_budget === undefined
          ? {}
          : { follow_up_budget: command.follow_up_budget }),
      });

      if (formalization.decision.outcome !== 'ready' || formalization.promotion_patch === null) {
        const blocked: SaveFormalAttemptOutcome = {
          formalization,
          attempt,
          idempotent_replay: false,
        };
        ledger.write(command.operation_id, blocked);
        return blocked;
      }

      const causes_patch =
        command.candidate_causes === undefined
          ? {}
          : candidateCausesPatch(command.candidate_causes.outcome);
      const persisted = await repository.updateAttempt(attempt.attempt_id, {
        ...formalization.promotion_patch,
        ...causes_patch,
      });
      const outcome: SaveFormalAttemptOutcome = {
        formalization,
        attempt: persisted,
        idempotent_replay: false,
      };
      ledger.write(command.operation_id, outcome);
      return outcome;
    },

    readCaptureState: readState,

    /**
     * Registers ONE key follow-up question.
     *
     * 🔴 The counter grows HERE and only here: presenting the same question again, re-reading it,
     *    re-parsing, or recreating the service never adds budget (task §11 / AC-Q06-1).
     * 🔴 The 4th question is refused by the EXISTING budget function, and because the budget is
     *    rebuilt from the PERSISTED state the refusal survives a service recreation (AC-16).
     * 🔴 A value the user volunteers on their own is NOT a question and never reaches this path
     *    (AC-Q06-4).
     */
    async askFollowUpQuestion(
      command: AskFollowUpQuestionCommand,
    ): Promise<AskFollowUpQuestionOutcome> {
      const replay = ledger.read<AskFollowUpQuestionOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true };
      }

      const snapshot = await readState(command.attempt_id);
      if (snapshot === null) {
        return {
          kind: 'attempt_not_found',
          rejection_code: null,
          rejection_detail: `No Attempt exists for "${command.attempt_id}".`,
          question: null,
          draft_state: null,
          follow_up: null,
          idempotent_replay: false,
        };
      }

      const requested = requestFollowUpQuestion(snapshot.follow_up.budget, {
        question_text: command.question_text,
        target_gaps: [command.target_gap],
      });
      if (!requested.allowed) {
        const rejected: AskFollowUpQuestionOutcome = {
          kind: 'rejected',
          rejection_code: requested.code,
          rejection_detail: requested.detail,
          question: null,
          draft_state: snapshot.draft_state,
          follow_up: snapshot.follow_up,
          idempotent_replay: false,
        };
        ledger.write(command.operation_id, rejected);
        return rejected;
      }

      const attempt = snapshot.attempt;
      const asked_gap_set = [...snapshot.draft_state.asked_gap_set, command.target_gap];
      /*
       * 🔴 The content item identity is (`attempt_id`, canonical `target_gap`) - NEVER the array
       *    position or the asked count. The same gap therefore always resolves to the same item,
       *    no matter how many questions preceded it and after any reload (docs/02 §C.4.1, task §4).
       */
      const question_item_id = followUpQuestionItemId(attempt.attempt_id, command.target_gap);
      const next_state = replaceDraftState(snapshot.draft_state, {
        parse_state: snapshot.draft_state.parse_state,
        asked_gap_set,
        abandoned_gap_set: snapshot.draft_state.abandoned_gap_set,
        gap_priority_hint: gapPriorityHintOf(
          openAskableGaps(
            recoverParseProposal(attempt.attempt_id, snapshot.content_items, snapshot.draft_state),
            attempt,
            { ...snapshot.draft_state, asked_gap_set },
          ),
        ),
      });

      /*
       * 🔴 ONE atomic write: the question content item and the counter always land together, so
       *    the persisted counter can never claim a question that does not exist (AC-Q06-1).
       */
      await repository.updateAttempt(attempt.attempt_id, {
        content_items: mergeContentItems(snapshot.content_items, [
          followUpQuestionItem(question_item_id, command.target_gap, command.question_text),
        ]),
        draft_state: next_state,
      });

      const after = await readState(attempt.attempt_id);
      const outcome: AskFollowUpQuestionOutcome = {
        kind: 'asked',
        rejection_code: null,
        rejection_detail: null,
        question: {
          content_item_id: question_item_id,
          target_gap: command.target_gap,
          question_text: command.question_text,
        },
        draft_state: next_state,
        follow_up: after?.follow_up ?? snapshot.follow_up,
        idempotent_replay: false,
      };
      ledger.write(command.operation_id, outcome);
      return outcome;
    },

    /**
     * Records a 「不知道 / 跳过 / 就这样继续」 dismissal.
     *
     * 🔴 No budget is consumed: the user's answer ends the追问 for that gap, it is not a question
     *    (§11 / AC-Q06-4).
     * 🔴 No content item is written either: 「跳过」 is a UI action, not user content, and the
     *    canonical `field_key` list has no slot for it - inventing one would be a new product field.
     * 🔴 The gap lands in the PERSISTED `abandoned_gap_set`, so a reload cannot ask it again
     *    (AC-17 / docs/02 §C.5).
     */
    async abandonFollowUpGap(
      command: AbandonFollowUpGapCommand,
    ): Promise<AbandonFollowUpGapOutcome> {
      const replay = ledger.read<AbandonFollowUpGapOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true };
      }

      const snapshot = await readState(command.attempt_id);
      if (snapshot === null) {
        return {
          kind: 'attempt_not_found',
          draft_state: null,
          follow_up: null,
          idempotent_replay: false,
        };
      }

      const abandoned_gap_set = snapshot.draft_state.abandoned_gap_set.includes(command.gap)
        ? snapshot.draft_state.abandoned_gap_set
        : [...snapshot.draft_state.abandoned_gap_set, command.gap];
      const next_state = await repository.updateAttemptDraftState(command.attempt_id, {
        abandoned_gap_set,
        gap_priority_hint: gapPriorityHintOf(
          openAskableGaps(
            recoverParseProposal(
              snapshot.attempt.attempt_id,
              snapshot.content_items,
              snapshot.draft_state,
            ),
            snapshot.attempt,
            { ...snapshot.draft_state, abandoned_gap_set },
          ),
        ),
      });

      const after = await readState(command.attempt_id);
      const outcome: AbandonFollowUpGapOutcome = {
        kind: 'abandoned',
        draft_state: next_state,
        follow_up: after?.follow_up ?? snapshot.follow_up,
        idempotent_replay: false,
      };
      ledger.write(command.operation_id, outcome);
      return outcome;
    },
  };
}

/** Keeps the origin description of an already persisted item when the same id is re-written. */
function existingOriginHintFor(
  items: readonly PersistedContentItem[],
  content_item_id: string,
): string | null {
  return findContentItem(items, content_item_id)?.origin_hint ?? null;
}
