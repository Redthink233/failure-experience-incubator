/**
 * 关键追问缺口词汇 + `Attempt Draft State`（附属状态记录，1:1）。
 *
 * Contract / canonical references:
 *   - docs/02 §C.5《`Attempt Draft State`（附属状态记录，1:1）》—— `parse_state` /
 *     `asked_key_question_count` / `abandoned_gap_set` / `gap_priority_hint`；
 *   - docs/04 §2.2 + `D-016` / `D-017` / `D-018` / `D-023` —— 关键追问问题总量 ≤ 3
 *     （`max-3-key-questions-total`）、`P1`/`P2`/`P3` 缺口优先级、「1 问题 ↔ 1 缺口」；
 *   - contract §4.2 rule 3（`D-024` / AC-30）—— 追问答案双层落库；
 *   - contract §9 ② / `TC-64` / AC-88 —— `parse_state` 是**非等级化**状态；
 *   - docs/02 §C.5 硬规则 1（`TC-29` / AC-Q06-1）—— 追问计数**必须持久化**，
 *     不得用「对话回合数」替代。
 *
 * 🔴 本模块只把**已在别处冻结的语义**翻译成类型与纯函数；不改写任何产品机制、
 *    不新增 `AC`、不改 `DECISIONS`。
 * 🔴 `Attempt Draft State` 是**附属状态记录**（docs/02 §C.5 硬规则 3）：
 *    不可被引用 / 不进第 ⑩ 步 / 不计入 `N_*` / 不构成事实或经验对象 /
 *    **不是** Level A 的一部分，也**不是** `EvidenceRef` 的来源。
 * 🔴 计数单位 = **问题数**，不是对话轮次，不是解析次数（`D-017` / AC-Q06-1）。
 *
 * 🔴 本文件不得出现 `MOVE` / 版本号 / 相似度 / 置信度 / 等级等被禁语义（AC-122 / AC-93）。
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

/* ------------------------------------------------------------------ *
 * 1. 关键追问缺口（canonical `P1` / `P2` / `P3`）
 * ------------------------------------------------------------------ */

/**
 * 关键追问问题可以瞄准的缺口 —— 恰为 canonical 的 `P1` / `P2` / `P3` 维度
 * （docs/04 §2.2，`D-018` / `D-023`）：
 *   `P1` = goal / actual attempt / actual result；`P2` = condition / judgment basis；
 *   `P3` = key parameter（**canonical `field_key`**，docs/03 §P3 / docs/02 §C.4.3）。
 *
 * 🔴 该词汇使用 **canonical 名称**，因此 P3 是 `key_parameter`（不是 `Attempt` 的物理属性名
 *    `key_parameters`）。二者之间的显式映射见 `FOLLOW_UP_GAP_ATTEMPT_FIELD`。
 * 🔴 结果状态**不是**追问目标：它的确认永不委托给追问机制（AC-Q06-6）。
 * 🔴 记录质量类元数据（`expected_result` / `version_env` / `note`）也**不是**追问目标
 *    —— 把问题预算花在「更漂亮的元数据」上是被禁止的（task §15）。
 */
export const FOLLOW_UP_GAP_KEYS = [
  'goal',
  'actual_attempt',
  'actual_result',
  'condition',
  'judgment_basis',
  'key_parameter',
] as const;

export type FollowUpGapKey = (typeof FOLLOW_UP_GAP_KEYS)[number];

/**
 * canonical 追问缺口 → `Attempt` **物理属性名** 的显式映射（IMPLEMENTATION PARAMETER）。
 *
 * 🔴 只有 P3 两侧名称不同：canonical 缺口是 `key_parameter`，而 `Attempt` 的物理属性
 *    仍是 `key_parameters`（一个可容纳多条参数的集合）。🔴 因此消费方**必须**经过本表
 *    读写该字段，**禁止**把物理属性名当成 canonical 缺口名（或反之）。
 */
export const FOLLOW_UP_GAP_ATTEMPT_FIELD: Readonly<
  Record<
    FollowUpGapKey,
    | 'goal'
    | 'actual_attempt'
    | 'actual_result'
    | 'condition'
    | 'judgment_basis'
    | 'key_parameters'
  >
> = {
  goal: 'goal',
  actual_attempt: 'actual_attempt',
  actual_result: 'actual_result',
  condition: 'condition',
  judgment_basis: 'judgment_basis',
  key_parameter: 'key_parameters',
};

export type GapPriority = 'P1' | 'P2' | 'P3';

/** canonical `P1` / `P2` / `P3` 优先级的实现编码（`D-018` / `D-023`）。 */
export const GAP_PRIORITY: Readonly<Record<FollowUpGapKey, GapPriority>> = {
  goal: 'P1',
  actual_attempt: 'P1',
  actual_result: 'P1',
  condition: 'P2',
  judgment_basis: 'P2',
  key_parameter: 'P3',
};

/** 优先级顺序，供排序使用（先 `P1`，再 `P2`，最后 `P3`）。 */
export const GAP_PRIORITY_ORDER: readonly GapPriority[] = ['P1', 'P2', 'P3'];

/** `P1` 子集 —— contract §2.1 / AC-Q06-5 显式点名的 Formal 核心。 */
export const P1_GAP_KEYS: readonly FollowUpGapKey[] = ['goal', 'actual_attempt', 'actual_result'];

/**
 * canonical 上限：关键追问问题**总量** ≤ 3。
 * 🔴 这是**天花板，不是配额**：0 个问题是合法且预期的结果（AC-14 / AC-15）。
 */
export const MAX_KEY_FOLLOW_UP_QUESTIONS = 3;

export function isFollowUpGapKey(value: string): value is FollowUpGapKey {
  return (FOLLOW_UP_GAP_KEYS as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ *
 * 2. `parse_state` —— 非等级化状态（AC-88 / TC-64）
 * ------------------------------------------------------------------ */

/**
 * 第 ② 步解析 / 确认子流程的**当前位置**（docs/02 §C.5，canonical 五值）。
 *
 * 🔴 这是**非等级化**状态：不得出现 `good` / `poor` / `high_quality` / `low_confidence` /
 *    `completion_percent` 等任何分级或完成度表达（AC-88 / AC-93）。
 *
 * 实现口径（IMPLEMENTATION PARAMETER，落在 canonical 五值之内）：
 *   - `not_parsed`          —— `Draft` 已创建，第 ② 步尚未产出结果（初始值）；
 *   - `extract_failed`      —— 第 ② 步以运行时失败结束；`Draft` 与用户原文全部保留（AC-89）；
 *   - `not_extracted`       —— 第 ② 步成功，但用户文本中**没有可抽取内容**（合法结果，AC-88）；
 *   - `pending_user_confirm`—— 第 ② 步成功且产出了内容，或已登记追问回答；
 *                              解析结果**正在等待用户在 ③ 做整体确认**；
 *   - `extracted`           —— 用户已完成显式整体确认（③ 已应用），本条记录的解析结果已定稿。
 *
 * 🔴 `extracted` **不等于**「已确认」「已验证」（§4.2 rule 2）；它只描述解析子流程的位置。
 */
export type AttemptParseState =
  | 'not_parsed'
  | 'extracted'
  | 'not_extracted'
  | 'extract_failed'
  | 'pending_user_confirm';

export const ATTEMPT_PARSE_STATES: readonly AttemptParseState[] = [
  'not_parsed',
  'extracted',
  'not_extracted',
  'extract_failed',
  'pending_user_confirm',
];

export function isAttemptParseState(value: string): value is AttemptParseState {
  return (ATTEMPT_PARSE_STATES as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ *
 * 3. `gap_priority_hint`（可选字段）
 * ------------------------------------------------------------------ */

export interface GapPriorityHintEntry {
  readonly gap: FollowUpGapKey;
  readonly priority: GapPriority;
}

/**
 * 「当前剩余缺口及其优先级」提示，供第 ② 步续写（docs/02 §C.5）。
 * 🔴 `remaining_gaps` 为空数组时用 `null` 表达「没有剩余缺口」，不写空对象。
 */
export interface GapPriorityHint {
  readonly remaining_gaps: readonly GapPriorityHintEntry[];
}

/** 按 `P1` → `P2` → `P3` 排序构造提示；空集合返回 `null`。 */
export function gapPriorityHintOf(gaps: readonly FollowUpGapKey[]): GapPriorityHint | null {
  if (gaps.length === 0) {
    return null;
  }
  const ordered = [...gaps].sort(
    (left, right) =>
      GAP_PRIORITY_ORDER.indexOf(GAP_PRIORITY[left]) -
      GAP_PRIORITY_ORDER.indexOf(GAP_PRIORITY[right]),
  );
  return {
    remaining_gaps: ordered.map((gap) => ({ gap, priority: GAP_PRIORITY[gap] })),
  };
}

/* ------------------------------------------------------------------ *
 * 4. `Attempt Draft State`（1:1 附属状态记录）
 * ------------------------------------------------------------------ */

/**
 * 附属状态记录。🔴 逻辑上**独立于** `Attempt` 的 Fact / Experience 内容：
 *    它不是 Level A 维度、不是内容条目、不是证据、不参与检索与引用计数。
 */
export interface AttemptDraftState {
  /** 1:1 指向 `Attempt`（docs/02 §C.5）。 */
  readonly attempt_id: string;
  readonly parse_state: AttemptParseState;
  /**
   * 关键追问问题计数器（**持久化**，`TC-29` / AC-Q06-1）。
   * 🔴 由 `asked_gap_set.length` 派生后落盘 —— 一次问题 = 1，达到 3 后第 4 个问题不存在。
   */
  readonly asked_key_question_count: number;
  /** 已被用户选择「不知道 / 跳过 / 就这样继续」的缺口 —— **不得再次追问同一缺口**（AC-17）。 */
  readonly abandoned_gap_set: readonly FollowUpGapKey[];
  /**
   * 🔴 IMPLEMENTATION PARAMETER（`TQ02` 物理 schema）。
   * 已提问过的缺口，**注册顺序**保留。它不新增任何产品机制：它就是既有
   * `FollowUpQuestionBudget.asked` 列表的持久化形式（`D-017`「同一缺口只问一次」），
   * 使浏览器刷新 / service 重建后不会重复追问同一个缺口（AC-Q06-1）。
   */
  readonly asked_gap_set: readonly FollowUpGapKey[];
  readonly gap_priority_hint: GapPriorityHint | null;
}

/** 第 ① 步创建 `Draft` 时的附属状态：尚未解析、尚未提问、无已放弃缺口。 */
export function createInitialDraftState(attempt_id: string): AttemptDraftState {
  return {
    attempt_id,
    parse_state: 'not_parsed',
    asked_key_question_count: 0,
    abandoned_gap_set: [],
    asked_gap_set: [],
    gap_priority_hint: null,
  };
}

/**
 * 可写入的附属状态补丁。
 *
 * 🔴 **计数器刻意不可写**：`asked_key_question_count` 恒由 `asked_gap_set` 派生，而
 *    `asked_gap_set` **不在此补丁内** —— 追加已问缺口只有一条合法路径，
 *    即「真正生成并成功登记一个追问问题」（`askFollowUpQuestion`），它会在**同一次写**里
 *    同时落下问题条目与计数（task §11 / AC-Q06-1）。因此「计数涨了但问题不存在」
 *    在结构上不可能发生。
 */
export interface AttemptDraftStatePatch {
  readonly parse_state?: AttemptParseState;
  readonly abandoned_gap_set?: readonly FollowUpGapKey[];
  readonly gap_priority_hint?: GapPriorityHint | null;
}

/** 附属状态记录的可替换字段（含已问缺口集合）。 */
export interface AttemptDraftStateReplacement {
  readonly parse_state: AttemptParseState;
  readonly asked_gap_set: readonly FollowUpGapKey[];
  readonly abandoned_gap_set: readonly FollowUpGapKey[];
  readonly gap_priority_hint: GapPriorityHint | null;
}

function dedupeGaps(gaps: readonly FollowUpGapKey[]): readonly FollowUpGapKey[] {
  const seen = new Set<FollowUpGapKey>();
  const ordered: FollowUpGapKey[] = [];
  for (const gap of gaps) {
    if (!seen.has(gap)) {
      seen.add(gap);
      ordered.push(gap);
    }
  }
  return ordered;
}

/** 应用补丁并重新派生计数器 —— 计数与缺口集合**永远不会漂移**。 */
export function applyDraftStatePatch(
  state: AttemptDraftState,
  patch: AttemptDraftStatePatch,
): AttemptDraftState {
  return replaceDraftState(state, {
    parse_state: patch.parse_state ?? state.parse_state,
    asked_gap_set: state.asked_gap_set,
    abandoned_gap_set:
      patch.abandoned_gap_set === undefined ? state.abandoned_gap_set : patch.abandoned_gap_set,
    gap_priority_hint:
      patch.gap_priority_hint === undefined ? state.gap_priority_hint : patch.gap_priority_hint,
  });
}

/**
 * 全量替换写（供「内容条目 + 附属状态」在同一次写里落盘的原子补丁使用）。
 * 🔴 计数器仍然不是输入，而是由 `asked_gap_set` 重新派生；两个集合都会去重并保留顺序。
 */
export function replaceDraftState(
  state: AttemptDraftState,
  next: AttemptDraftStateReplacement,
): AttemptDraftState {
  const asked_gap_set = dedupeGaps(next.asked_gap_set);
  return {
    attempt_id: state.attempt_id,
    parse_state: next.parse_state,
    asked_key_question_count: asked_gap_set.length,
    abandoned_gap_set: dedupeGaps(next.abandoned_gap_set),
    asked_gap_set,
    gap_priority_hint: next.gap_priority_hint,
  };
}

/** 剩余可问问题数：`3 - asked_key_question_count`，下限 0。 */
export function remainingKeyFollowUpQuestions(state: AttemptDraftState): number {
  return Math.max(0, MAX_KEY_FOLLOW_UP_QUESTIONS - state.asked_key_question_count);
}

/** 追问预算是否已耗尽（**天花板**，不是配额）。 */
export function isKeyFollowUpBudgetExhausted(state: AttemptDraftState): boolean {
  return remainingKeyFollowUpQuestions(state) === 0;
}

/**
 * 结构校验：`attempt_id` 必须与所属 `Attempt` 一致，计数器必须等于已问缺口数，
 * 且计数不得超过 canonical 上限。
 * 🔴 不修不猜：不一致即显式失败，绝不静默修补。
 * 🔴 已问集合与已放弃集合**允许重叠**：一个缺口被问过之后，用户仍可以回答「不知道 / 跳过」。
 */
export function draftStateIsConsistent(state: AttemptDraftState, attempt_id: string): boolean {
  return (
    state.attempt_id === attempt_id &&
    state.asked_key_question_count === state.asked_gap_set.length &&
    state.asked_key_question_count <= MAX_KEY_FOLLOW_UP_QUESTIONS
  );
}
