/**
 * S01 ｜ `M8` the `E1`-`E4` eligibility checks of step ⑧.
 *
 * Contract: §2.2 / §9 step ⑧; `D-021` (`E1`-`E5` hard conditions); `D-039` (`E1`-`E4` can never be
 * replaced by a user action; `E2` / `E3` are AI judgements with a reason and no score);
 * `D-038` (an unsatisfied `E2` / `E3` keeps the `Insight` as `candidate` and requires the
 * three-part presentation 缺什么 / 为什么重要 / 如何补充).
 *
 * 🔴 `E1` AND `E4` ARE STRUCTURAL AND ARE MACHINE-DERIVED. Neither is ever taken from the model's
 *    word: `E1` is derived from the resolved source / target records, and `E4` from the `M7`
 *    validated reference set. The model's answer may only report `E2` / `E3`.
 * 🔴 `E2` / `E3` ARE DISCRETE (`pass` / `fail`) WITH A MANDATORY REASON. There is no score, no
 *    confidence, no low / medium / high band and no threshold anywhere in this file (AC-93).
 * 🔴 `E5` IS NOT HERE. It is the user's explicit accept action and lives in the lifecycle
 *    (`D-039` / `§16`); a new `Insight` is `candidate` and can never start `accepted`.
 * 🔴 An unsatisfied gate NEVER discards, hides or auto-repairs an `Insight` (`D-038` / AC-99).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no LLM.
 */

import { newContentItemId } from '../../domain/ids/content-item-id.js';
import type { Attempt } from '../../domain/types/attempt.js';
import type { EvidenceRef } from '../../domain/types/evidence-ref.js';
import type { GateCheckResult, GateId, GateMissingItem } from '../../domain/types/gates.js';
import { gateSatisfied, gateUnsatisfied } from '../../domain/types/gates.js';
import { displayInferenceItem } from '../../domain/types/source-type.js';
import type { InsightMissingItemProposal } from './types.js';

/* ------------------------------------------------------------------ *
 * 1. Structural input
 * ------------------------------------------------------------------ */

/** One reference together with its FRESH resolution result (never a cached build result). */
export interface ResolvedEvidenceTarget {
  readonly ref: EvidenceRef;
  /** The referenced record, or `null` when it can no longer be resolved. */
  readonly target_attempt: Attempt | null;
  /** `true` when `source_field_path` still resolves to a content item inside the target. */
  readonly landing_resolves: boolean;
  /** Why the landing point does not resolve; `null` when it does. */
  readonly unresolved_reason: string | null;
}

/**
 * Everything the structural gates need - all of it read FRESH.
 *
 * 🔴 `E1` / `E4` are re-evaluated on every read, accept and content edit (§16 / §21 / `§24`), so a
 *    reference that stopped resolving is reported instead of being remembered as fine.
 */
export interface InsightStructuralGateInput {
  /** The record step ⑧ ran on, re-read from the workspace. `null` when it disappeared. */
  readonly source_attempt: Attempt | null;
  readonly evidence_targets: readonly ResolvedEvidenceTarget[];
  /** The `M6` derivation the cross-record comparison came from; `null` when none was used. */
  readonly comparison_ref: string | null;
}

/* ------------------------------------------------------------------ *
 * 2. `E1` — 有效来源 (structural)
 * ------------------------------------------------------------------ */

function e1MissingItem(description: string, why_important: string): GateMissingItem {
  /* 🔴 Structural check: no AI suggestion is offered here, and none may be claimed as one. */
  return { description, why_important, how_to_supplement: null };
}

/**
 * `E1`｜有效来源: the `Insight` is associated with at least one LEGAL `Formal Attempt`, and no
 * associated record is a `Draft`.
 *
 * 🔴 `Draft` never participates in `E1` (contract §2.1 / §7.2): a `Draft` may not be the source of
 *    an `Experience Asset` and may not be a new evidence source.
 * 🔴 The ARCHIVE bit is deliberately NOT consulted: `D-043` / §7.2 keep an existing Insight's
 *    traceability intact after a referenced record is archived, so archiving can never retro-fail
 *    `E1` (nor reduce `N_引用`).
 */
export function evaluateE1(input: InsightStructuralGateInput): GateCheckResult {
  if (input.source_attempt === null) {
    return gateUnsatisfied('E1', [
      e1MissingItem(
        '生成这条经验的来源记录已无法解析',
        'E1 要求至少关联一条合法的 Formal Attempt；找不到来源记录就无法核对经验从何而来（D-021 E1）',
      ),
    ]);
  }
  if (input.source_attempt.state !== 'Formal') {
    return gateUnsatisfied('E1', [
      e1MissingItem(
        `来源记录 ${input.source_attempt.attempt_id} 仍是 Draft，不是 Formal`,
        'Draft 不得直接成为经验来源；只有正式记录才能成为 E1 的有效来源（D-021 E1 / 契约 §2.1）',
      ),
    ]);
  }

  const illegal_targets = input.evidence_targets.filter(
    (target) => target.target_attempt === null || target.target_attempt.state !== 'Formal',
  );
  if (illegal_targets.length > 0) {
    return gateUnsatisfied(
      'E1',
      illegal_targets.map((target) =>
        e1MissingItem(
          `引用目标 ${target.ref.target_id} 不是一条可解析的 Formal Attempt`,
          '引用的每一条记录都必须是正式记录；Draft 或不存在的记录不能作为经验来源（D-021 E1）',
        ),
      ),
    );
  }

  return gateSatisfied('E1');
}

/* ------------------------------------------------------------------ *
 * 3. `E4` — 证据可追溯 (structural)
 * ------------------------------------------------------------------ */

/**
 * `E4`｜证据可追溯: ① which `Formal Attempt`s ② which concrete content items, and ③ — when a
 * cross-record comparison was actually used — which comparison / Retrieval Derivation it came from.
 *
 * 🔴 A cross-record comparison is NOT a quantity threshold: `N = 1` can still pass `E4`
 *    (`D-021 E4` 特别确认).
 * 🔴 `E4` DOES require at least one reference: "which Formal Attempt / which content item" has no
 *    answer at all without one, and the model may never declare `E4` itself (`§15`).
 * 🔴 Every reference is re-resolved here, so a reference whose target or landing point no longer
 *    resolves fails `E4` instead of being silently trusted (`§15` `E4-B`).
 */
export function evaluateE4(input: InsightStructuralGateInput): GateCheckResult {
  if (input.evidence_targets.length === 0) {
    return gateUnsatisfied('E4', [
      e1MissingItem(
        '这条经验当前没有引用任何历史记录的具体内容条目',
        'E4 要求能追溯「哪些 Formal Attempt」与「哪些具体内容条目」；没有引用就无法核对（D-021 E4）',
      ),
    ]);
  }

  const broken = input.evidence_targets.filter(
    (target) => target.target_attempt === null || !target.landing_resolves,
  );
  if (broken.length > 0) {
    return gateUnsatisfied(
      'E4',
      broken.map((target) =>
        e1MissingItem(
          `引用 ${target.ref.target_id} :: ${target.ref.source_field_path} 当前无法解析：${
            target.unresolved_reason ?? '目标或落点已不存在'
          }`,
          'E4 要求每条引用都能定位到具体记录中的具体内容条目；无法解析的引用不能算作可追溯证据（D-021 E4）',
        ),
      ),
    );
  }

  if (input.comparison_ref === null) {
    return gateUnsatisfied('E4', [
      e1MissingItem(
        '这条经验使用了跨记录比较，但没有记录对应的比较来源',
        'E4 第 ③ 项要求在使用跨记录比较时说明用了哪一次比较结果（D-021 E4）',
      ),
    ]);
  }

  return gateSatisfied('E4');
}

/* ------------------------------------------------------------------ *
 * 4. `E2` / `E3` — the AI content-quality judgements
 * ------------------------------------------------------------------ */

export interface InsightAiGateInput {
  readonly e2_check: 'pass' | 'fail';
  readonly e2_reason: string;
  readonly e3_check: 'pass' | 'fail';
  readonly e3_reason: string;
  /**
   * The model's description of what is missing. 🔴 The list is attached to EVERY unsatisfied gate,
   *    so an `E2` + `E3` failure presents both gaps explicitly (`§35`).
   */
  readonly missing_items: readonly InsightMissingItemProposal[];
  /** Owner used to mint the display-type `Inference` identities of the AI suggestions. */
  readonly insight_id: string;
}

/**
 * Builds the `E2` / `E3` result pair.
 *
 * 🔴 `how_to_supplement` is ALWAYS built as a display-type `Inference` (`D-038`: 「如何补充」属 AI
 *    建议 / 展示型 `Inference`）: it changes no persisted business state and is never reused as a
 *    decision basis. Its identity is minted fresh and is NEVER derived from the item's position.
 * 🔴 The AI's own reason is kept verbatim as 缺什么, so the presented gap is the model's statement
 *    rather than a system paraphrase that could distort it.
 */
export function buildAiGateChecks(input: InsightAiGateInput): readonly GateCheckResult[] {
  const missing = (): readonly GateMissingItem[] =>
    input.missing_items.map((item) => ({
      description: item.description,
      why_important: item.why_important,
      how_to_supplement:
        item.how_to_supplement === null
          ? null
          : displayInferenceItem(newContentItemId(input.insight_id), item.how_to_supplement),
    }));

  const e2: GateCheckResult =
    input.e2_check === 'pass' ? gateSatisfied('E2') : gateUnsatisfied('E2', missing());
  const e3: GateCheckResult =
    input.e3_check === 'pass' ? gateSatisfied('E3') : gateUnsatisfied('E3', missing());
  return [e2, e3];
}

/* ------------------------------------------------------------------ *
 * 5. Assembly
 * ------------------------------------------------------------------ */

/**
 * The `E1`-`E4` presentation, always in canonical order.
 *
 * 🔴 `E5` is deliberately absent: the frozen `Insight.gate_checks` field describes `E1`-`E4`
 *    (contract `src/domain/types/insight.ts`), and `E5` is an action rather than a check.
 */
export function insightGateChecks(params: {
  readonly structural: InsightStructuralGateInput;
  readonly ai: InsightAiGateInput;
}): readonly GateCheckResult[] {
  const [e2, e3] = buildAiGateChecks(params.ai);
  return [evaluateE1(params.structural), e2 as GateCheckResult, e3 as GateCheckResult, evaluateE4(params.structural)];
}

/** The unsatisfied gate ids of a check set, in canonical `E1`..`E5` order. */
export function unsatisfiedOf(results: readonly GateCheckResult[]): readonly GateId[] {
  return results.filter((result) => !result.satisfied).map((result) => result.gate_id);
}

/** The three-part presentation, grouped by gate - the read-only view the product renders. */
export function missingItemsByGate(
  results: readonly GateCheckResult[],
): Readonly<Partial<Record<GateId, readonly GateMissingItem[]>>> {
  const grouped: Partial<Record<GateId, readonly GateMissingItem[]>> = {};
  for (const result of results) {
    if (!result.satisfied && result.missing_items.length > 0) {
      grouped[result.gate_id] = result.missing_items;
    }
  }
  return grouped;
}
