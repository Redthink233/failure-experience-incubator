/**
 * S01 ｜ `M8` the `Insight` lifecycle: the ONLY transition point of the frozen state machine.
 *
 * Contract: §2.2 (the single migration matrix), §11.3 (`InsightStateEvent` = state transition +
 * time + trigger reason class), §12 item 2 (the matrix is Worker-forbidden-to-change).
 * Decisions: `D-015` (object / state machine), `D-039` (accept / revoke semantics), `D-040`
 * (content edit demotion + the event log), `D-043` (archiving referenced evidence is not an edit).
 *
 * 🔴 THE MATRIX IS CONSUMED, NEVER RE-STATED: every transition below is read from the frozen
 *    `insightTransitionFor` table, so a second copy of "candidate + reject -> rejected" cannot
 *    exist and drift.
 * 🔴 `accepted` is reachable ONLY through an explicit user accept (`E5`), and only after `E1`-`E4`
 *    were re-confirmed in the same call (`D-039` / `§16`): the planning function never promotes on
 *    its own, it only computes what the caller has already earned.
 * 🔴 THE EVENT TRIGGER UNION IS CLOSED (`user_accept` / `user_revoke` / `content_edit` /
 *    `re_accept`). Two consequences, both deliberate:
 *    · `candidate -> rejected` writes NO event - no canonical trigger class expresses it, so the
 *      state pair itself is the record and no second event vocabulary is opened (`§25`);
 *    · creating a `candidate` and a non-semantic meta edit write no event either (`§25`).
 * 🔴 Archiving referenced evidence is NOT a transition and MUST NOT produce an event (`D-043`).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type {
  InsightContentField,
  InsightState,
  InsightStateEvent,
  InsightStateEventTrigger,
  InsightUserAction,
} from '../../domain/types/insight.js';
import {
  INSIGHT_CONTENT_FIELDS,
  insightTransitionFor,
} from '../../domain/types/insight.js';
import { newInsightStateEventId } from './identity.js';

/* ------------------------------------------------------------------ *
 * 1. The content-field set (§2.2 / D-040)
 * ------------------------------------------------------------------ */

/**
 * The enumerable CONTENT fields of an `Insight`: changing ANY of them is a content modification.
 *
 * 🔴 The reference list counts as content (`§22`): adding / removing a reference or replacing its
 *    `role` / `source_field_path` is a semantic edit, NOT a metadata edit.
 * 🔴 `verifiability` is deliberately ABSENT as a separate member: the frozen `Insight` carries ONE
 *    fourth field (`judgment_basis` = 判断依据 / 可验证判据), so the two halves of the model's answer
 *    are composed into that single frozen field and edited as one content field.
 */
export type InsightSemanticEditField =
  | 'proposition'
  | 'applicable_scope'
  | 'evidence_refs'
  | 'judgment_basis';

export const INSIGHT_SEMANTIC_EDIT_FIELDS: readonly InsightSemanticEditField[] = [
  'proposition',
  'applicable_scope',
  'evidence_refs',
  'judgment_basis',
];

/**
 * The explicit mapping onto the frozen content-field vocabulary.
 *
 * 🔴 `INSIGHT_CONTENT_FIELDS` names the reference list `evidence_list` while its carrier on
 *    `Insight` is `evidence_refs`; this table is the single place where that equivalence is
 *    stated, so "which fields are content fields" cannot acquire a second definition.
 */
export const INSIGHT_CONTENT_FIELD_BY_EDIT_FIELD: Readonly<
  Record<InsightSemanticEditField, InsightContentField>
> = {
  proposition: 'proposition',
  applicable_scope: 'applicable_scope',
  evidence_refs: 'evidence_list',
  judgment_basis: 'judgment_basis',
};

/** Sanity guard: every semantic edit field maps onto a FROZEN content field (§2.2). */
export function semanticEditFieldsCoverContentFields(): boolean {
  const mapped = INSIGHT_SEMANTIC_EDIT_FIELDS.map(
    (field) => INSIGHT_CONTENT_FIELD_BY_EDIT_FIELD[field],
  );
  return (
    mapped.length === INSIGHT_CONTENT_FIELDS.length &&
    mapped.every((field) => (INSIGHT_CONTENT_FIELDS as readonly string[]).includes(field))
  );
}

/* ------------------------------------------------------------------ *
 * 2. Transition planning
 * ------------------------------------------------------------------ */

export type InsightTransitionPlan =
  | {
      readonly ok: true;
      readonly action: InsightUserAction;
      readonly next_state: InsightState;
      /** `null` = the action writes NO state event (see the module header). */
      readonly event_trigger: InsightStateEventTrigger | null;
      /** `true` when `E1`-`E4` must be re-run immediately in the same screen (§2.2 / `D-040`). */
      readonly recheck_gates: boolean;
    }
  | { readonly ok: false; readonly detail: string };

/**
 * Computes the transition for one user action.
 *
 * @param ever_accepted `true` when the record has ever been accepted before. 🔴 It only selects
 *        the trigger CLASS (`re_accept` vs `user_accept`) - it carries no count, no ordinal and no
 *        "how many times" semantics, and it never influences the resulting state.
 */
export function planInsightTransition(
  from: InsightState,
  action: InsightUserAction,
  ever_accepted: boolean,
): InsightTransitionPlan {
  const rule = insightTransitionFor(from, action);
  if (rule === null) {
    return { ok: false, detail: `"${action}" is not a canonical action from "${from}".` };
  }
  const next_state: InsightState = rule.to === 'unchanged' ? from : rule.to;

  let trigger: InsightStateEventTrigger | null = null;
  switch (action) {
    case 'accept':
      trigger = ever_accepted ? 're_accept' : 'user_accept';
      break;
    case 'revoke_acceptance':
      trigger = 'user_revoke';
      break;
    case 'edit_content':
      trigger = 'content_edit';
      break;
    case 'reject':
    case 'edit_meta':
      trigger = null;
      break;
  }

  return { ok: true, action, next_state, event_trigger: trigger, recheck_gates: rule.recheck_gates };
}

/** `true` when this record has ever been accepted - derived from its own event trace. */
export function everAccepted(events: readonly InsightStateEvent[]): boolean {
  return events.some(
    (event) => event.trigger === 'user_accept' || event.trigger === 're_accept',
  );
}

/* ------------------------------------------------------------------ *
 * 3. Event construction (§11.3)
 * ------------------------------------------------------------------ */

/**
 * Builds one `InsightStateEvent`.
 *
 * 🔴 Minimum content = state transition + time + trigger reason class (§11.3). No duration, no
 *    actor id, no counter, no note and no free-form reason is added: the record is a product-layer
 *    behaviour trace, not a technical log and not a value score (`D-040` / `D-044` / AC-65).
 */
export function buildInsightStateEvent(input: {
  readonly insight_id: ObjectId<'INS'>;
  readonly from_state: InsightState;
  readonly to_state: InsightState;
  readonly trigger: InsightStateEventTrigger;
  readonly occurred_at: string;
}): InsightStateEvent {
  return {
    event_id: newInsightStateEventId(),
    insight_id: input.insight_id,
    from_state: input.from_state,
    to_state: input.to_state,
    occurred_at: input.occurred_at,
    trigger: input.trigger,
  };
}
