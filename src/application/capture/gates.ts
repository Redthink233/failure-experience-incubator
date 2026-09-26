/**
 * S01-05 ｜ The eligibility gates that steps ①–⑤ are allowed to evaluate.
 *
 * Contract: §2.2 / §4.1 / §4.3 / §7.2 / §9 step ⑧; docs/04 §2.5 (`D-021`); AC-26 / AC-73 / AC-95.
 *
 * 🔴 THE MEANING OF `E1`–`E5` IS FROZEN AND IS NOT REDEFINED HERE. `GATE_DEFINITION_REFERENCES`
 *    is a CITATION INDEX: every entry quotes the canonical definition and names its source clause
 *    and Decision. The authority remains docs/04 §2.5 and the contract. No gate is renamed, none
 *    is renumbered and no meaning is attached that the contract does not state.
 * 🔴 The result type is the EXISTING `GateCheckResult` (domain `gates.ts`), and the aggregate
 *    helpers (`allGatesSatisfied` / `unsatisfiedGateIds`) are the existing ones - this module
 *    builds no second gate vocabulary and no second state machine.
 * 🔴 Only `E1` and `E5` are evaluated at steps ①–⑤:
 *      - `E1` - 有效来源: may this Attempt serve as an `Insight` source? It follows directly from
 *        §2.1 / §7.2 (a `Draft` never can, an archived `Formal` cannot for a NEW source);
 *      - `E5` - 用户显式接受: is this an EXPLICIT user acceptance? Never auto-satisfied.
 *    `E2` / `E3` / `E4` are step ⑧ conditions about an `Insight`'s content and its evidence, so
 *    they are deliberately NOT evaluated here (`D-038` three-part presentation is step ⑧ work).
 *
 * 🔴 No confidence / score / grade wording is introduced anywhere in this file (AC-93).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { Attempt } from '../../domain/types/attempt.js';
import type { GateCheckResult, GateId, GateMissingItem } from '../../domain/types/gates.js';
import {
  ALL_GATE_IDS,
  allGatesSatisfied,
  gateSatisfied,
  gateUnsatisfied,
  unsatisfiedGateIds,
} from '../../domain/types/gates.js';
import { displayInferenceItem } from '../../domain/types/source-type.js';

export interface GateDefinitionReference {
  readonly gate_id: GateId;
  /** Canonical wording, quoted from docs/04 §2.5 (`D-021`). Not a new definition. */
  readonly canonical_meaning: string;
  readonly cited_sources: readonly string[];
  /** `E1` / `E4` are machine-verifiable structural checks; `E2` / `E3` are content judgements. */
  readonly machine_checkable: boolean;
  /** `true` only for the gates steps ①–⑤ actually evaluate. */
  readonly evaluated_at_steps_1_to_5: boolean;
  readonly not_evaluated_reason: string | null;
}

/** Citation index of the frozen gates. 🔴 A citation index - NOT a second definition. */
export const GATE_DEFINITION_REFERENCES: Readonly<Record<GateId, GateDefinitionReference>> = {
  E1: {
    gate_id: 'E1',
    canonical_meaning:
      'E1｜有效来源：至少关联 ≥ 1 条 `Formal Attempt`；`Draft` 不得直接成为 Experience Asset 的来源',
    cited_sources: ['docs/04 §2.5 (D-021)', 'contract §2.1', 'contract §7.2', 'AC-26 / AC-73'],
    machine_checkable: true,
    evaluated_at_steps_1_to_5: true,
    not_evaluated_reason: null,
  },
  E2: {
    gate_id: 'E2',
    canonical_meaning: 'E2｜结论明确：必须能形成明确、可理解的经验命题',
    cited_sources: ['docs/04 §2.5 (D-021)', 'contract §2.2', 'D-038', 'AC-26'],
    machine_checkable: false,
    evaluated_at_steps_1_to_5: false,
    not_evaluated_reason:
      'E2 judges the content of an Insight at step ⑧; no Insight exists during steps ①–⑤.',
  },
  E3: {
    gate_id: 'E3',
    canonical_meaning:
      'E3｜适用范围明确：至少说明“在当前已知哪些条件下观察到了该经验”；关键条件完全缺失时保持 `candidate`',
    cited_sources: ['docs/04 §2.5 (D-021)', 'D-026 / AC-29', 'D-038', 'AC-26'],
    machine_checkable: false,
    evaluated_at_steps_1_to_5: false,
    not_evaluated_reason:
      'E3 judges an Insight’s scope at step ⑧. Step ⑤ saving is a DIFFERENT threshold: a missing optional condition never blocks a Formal Attempt (D-026 / AC-29).',
  },
  E4: {
    gate_id: 'E4',
    canonical_meaning:
      'E4｜证据可追溯：① 哪些 `Formal Attempt`；② 哪些事实字段；③ 若存在跨记录比较，则使用了哪些比较结果（跨记录比较不是硬门槛）',
    cited_sources: ['docs/04 §2.5 (D-021)', 'contract §3.2 rule 2', 'AC-26'],
    machine_checkable: true,
    evaluated_at_steps_1_to_5: false,
    not_evaluated_reason:
      'E4 checks an Insight’s reference list by ID; the reference list is produced at step ⑧.',
  },
  E5: {
    gate_id: 'E5',
    canonical_meaning: 'E5｜用户显式接受：必须 `Insight.status = accepted`',
    cited_sources: ['docs/04 §2.5 (D-021)', 'contract §2.2', 'contract §4.1', 'AC-26 / AC-10'],
    machine_checkable: true,
    evaluated_at_steps_1_to_5: true,
    not_evaluated_reason: null,
  },
};

/** The gates steps ①–⑤ evaluate. Derived from the citation index - not a second gate list. */
export const STEP_1_TO_5_GATE_IDS: readonly GateId[] = ALL_GATE_IDS.filter(
  (gate_id) => GATE_DEFINITION_REFERENCES[gate_id].evaluated_at_steps_1_to_5,
);

/* ------------------------------------------------------------------ *
 * E1
 * ------------------------------------------------------------------ */

function draftAsSourceMissingItem(): GateMissingItem {
  return {
    description: '该记录仍是 `Draft`，不能作为新 `Insight` 的 `E1` 来源。',
    why_important:
      '`Draft` 不参与检索 / 比较 / grounding / `N_检索`，若把它当作来源，经验就会建在不完整记录之上（§2.1 / §7.2）。',
    how_to_supplement: displayInferenceItem(
      'gate-e1-supplement',
      '补全目标 / 实际尝试 / 实际结果，并在结果状态上完成你的显式确认，再把这条记录保存为 `Formal`。',
    ),
  };
}

function archivedAsSourceMissingItem(): GateMissingItem {
  return {
    description: '该记录已归档，不能作为“新” `Insight` 的 `E1` 来源。',
    why_important:
      '归档记录不参与新的检索 / grounding / `N_检索`；新建立的 `E1` 来源不成立（§7.2 / §7.3 rule 4）。',
    how_to_supplement: displayInferenceItem(
      'gate-e1-unarchive-supplement',
      '如果这条经验确实需要用到它，请先取消归档，再重新建立引用；已有引用不会因为归档而失效。',
    ),
  };
}

/**
 * `E1` - 有效来源, evaluated on THIS Attempt.
 *
 * Satisfied only for an `active` `Formal` Attempt, because that is exactly the cell §7.2 marks ✅
 * for "可作新 `Insight` 的 `E1` 来源". `Draft` and archived records are ❌ in that same row.
 *
 * 🔴 The denial is a `GATE` outcome: the record is preserved, nothing is presented as a system
 *    error and the user may keep working (§10.1 layer 1).
 */
export function evaluateGateE1SourceEligibility(attempt: Attempt): GateCheckResult {
  if (attempt.state === 'Draft') {
    return gateUnsatisfied('E1', [draftAsSourceMissingItem()]);
  }
  if (attempt.archive_state === 'archived') {
    return gateUnsatisfied('E1', [archivedAsSourceMissingItem()]);
  }
  return gateSatisfied('E1');
}

/* ------------------------------------------------------------------ *
 * E5
 * ------------------------------------------------------------------ */

/**
 * `E5` - 用户显式接受, evaluated on an explicit acceptance flag.
 *
 * 🔴 Satisfied ONLY by an explicit user action. Nothing in this module - and nothing in steps
 *    ①–⑤ - may derive it: the contract states that `candidate -> accepted` requires `E5` and
 *    that there is no manual / forced promotion path (§2.2 / `D-039` / AC-26).
 * 🔴 `how_to_supplement` is deliberately `null`: D-038 classifies “如何补充” as an AI suggestion,
 *    and offering an AI suggestion for E5 would be a route around the user's own acceptance
 *    (§8.2 rule 3).
 */
export function evaluateGateE5UserExplicitAcceptance(
  user_explicitly_accepted: boolean,
): GateCheckResult {
  if (user_explicitly_accepted) {
    return gateSatisfied('E5');
  }
  return gateUnsatisfied('E5', [
    {
      description: '尚未由用户显式接受。',
      why_important:
        '`E5` 就是“用户显式接受”本身；系统不得自动接受，也不得替用户接受（§2.2 / D-039）。',
      how_to_supplement: null,
    },
  ]);
}

/* ------------------------------------------------------------------ *
 * Aggregate report
 * ------------------------------------------------------------------ */

export interface CaptureGateReport {
  readonly results: readonly GateCheckResult[];
  readonly all_satisfied: boolean;
  readonly unsatisfied_gate_ids: readonly GateId[];
}

/**
 * Evaluates every gate steps ①–⑤ own, reusing the EXISTING aggregate helpers.
 *
 * 🔴 `all_satisfied` here means "the gates evaluated at this step are satisfied" - it is NOT a
 *    statement that an `Insight` may be promoted (that is step ⑧ with `E1`–`E5` complete).
 */
export function evaluateCaptureGates(
  attempt: Attempt,
  options: { readonly user_explicitly_accepted: boolean },
): CaptureGateReport {
  const results: readonly GateCheckResult[] = [
    evaluateGateE1SourceEligibility(attempt),
    evaluateGateE5UserExplicitAcceptance(options.user_explicitly_accepted),
  ];
  return {
    results,
    all_satisfied: allGatesSatisfied(results),
    unsatisfied_gate_ids: unsatisfiedGateIds(results),
  };
}
