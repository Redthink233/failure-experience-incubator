/**
 * S01 ｜ `M8` prompts and MINIMAL-CONTEXT builders for step ⑧.
 *
 * Contract: §0.4 A ("🔴 只发送完成当前 AI 操作所需的最小必要上下文；🔴 不得默认上传整个 Workspace"),
 * §9 step ⑧, §9.2, §12 item 8 (`Fact` / `Extraction` / `Inference` are never flattened).
 *
 * 🔴 PROMPTS ARE IMPLEMENTATION PARAMETERS. They live here, are never written into the canonical
 *    docs, and create no Decision and no AC.
 * 🔴 MINIMAL CONTEXT (task §6): the step ⑧ prompt carries (①) the CURRENT source `Formal Attempt`'s
 *    necessary content, (②) the `M6` comparison output (similar points / difference points /
 *    uncompared information / relevance reasons), (③) the `M7` traceable source catalog, and
 *    (④) the decision-type `Inference`s the user has EXPLICITLY accepted. It never carries the
 *    whole workspace, an unrelated `Attempt`, a technical log, a credential or an API key, and it
 *    never carries an `unresolved` / `rejected` candidate cause as if it were a confirmed basis
 *    (§4.3 / AC-95).
 * 🔴 The prompt states the boundary; it does NOT enforce it. `schemas.ts` and the service enforce
 *    the same boundary deterministically, because §10 `N3` of the M8 task forbids relying on
 *    prompt wording for the single-record generalization limit.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { AiMessage } from '../../ai/provider/request.js';
import type { Attempt } from '../../domain/types/attempt.js';
import type { MaybeProvided } from '../../domain/types/presence.js';
import { isReusableAsConfirmedDecision } from '../../domain/types/source-type.js';
import type { ContentItem } from '../../domain/types/source-type.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import { LEVEL_A_DIMENSION_LABELS } from '../../domain/types/level-a.js';
import type { RetrievalDerivationRecord } from '../../retrieval/compare/types.js';
import type { GroundingSourceCatalog } from '../../retrieval/grounding/types.js';

/** Caller-owned prompt identity. 🔴 Not a product version system (AC-122). */
export const INSIGHT_GENERATION_PROMPT_ID = 'candidate-insight-generation/step-8';
export const INSIGHT_GATE_RECHECK_PROMPT_ID = 'insight-gate-recheck/step-8';

/** The exact JSON keys step ⑧ expects back. Kept next to the schema it describes. */
export const INSIGHT_PAYLOAD_KEYS = [
  'insights',
  'proposition',
  'scope',
  'basis',
  'verifiability',
  'evidence_selections',
  'e2_check',
  'e2_reason',
  'e3_check',
  'e3_reason',
  'missing_items',
  'exit_route',
  'absence_statement',
] as const;

/* ------------------------------------------------------------------ *
 * 1. Minimal-context builders
 * ------------------------------------------------------------------ */

/** The value of a `MaybeProvided` carrier, or `null` when it is explicitly unknown (AC-04). */
function valueOf(carrier: MaybeProvided<ContentItem>): string | null {
  return carrier.presence_state === 'present' ? carrier.item.value : null;
}

/** The CURRENT source `Formal Attempt`'s necessary content (§6 ①). */
export interface InsightPromptSourceAttempt {
  readonly attempt_id: string;
  readonly goal: string | null;
  readonly actual_attempt: string | null;
  readonly condition: string | null;
  readonly actual_result: string | null;
  readonly result_status: string | null;
  readonly expected_result: string | null;
  readonly judgment_basis: string | null;
}

export function promptSourceAttemptOf(attempt: Attempt): InsightPromptSourceAttempt {
  return {
    attempt_id: attempt.attempt_id,
    goal: valueOf(attempt.goal),
    actual_attempt: valueOf(attempt.actual_attempt),
    condition: valueOf(attempt.condition),
    actual_result: valueOf(attempt.actual_result),
    result_status: valueOf(attempt.result_status),
    expected_result: valueOf(attempt.expected_result),
    judgment_basis: valueOf(attempt.judgment_basis),
  };
}

/** One `M6` related record's comparison output (§6 ②). */
export interface InsightPromptComparisonEntry {
  readonly candidate_attempt_id: string;
  readonly similar_points: readonly string[];
  readonly difference_points: readonly string[];
  readonly uncompared_dimensions: readonly string[];
  readonly relevance_reasons: readonly string[];
}

export function promptComparisonsOf(
  derivation: RetrievalDerivationRecord,
): readonly InsightPromptComparisonEntry[] {
  return derivation.candidate_entries.map((entry) => ({
    candidate_attempt_id: entry.candidate_attempt_id,
    similar_points: entry.similar_points.map((point) => point.text),
    difference_points: entry.difference_points.map((point) => point.text),
    /*
     * 🔴 An `uncompared` dimension is information the comparison COULD NOT settle. It is carried
     *    as-is so the model does not silently treat an unknown dimension as a match
     *    (`D-025` / AC-22 / AC-114).
     */
    uncompared_dimensions: entry.dimension_states
      .filter((state) => state.tri_state === 'uncompared')
      .map((state) => LEVEL_A_DIMENSION_LABELS[state.dimension]),
    relevance_reasons: entry.relevance_reasons.map((reason) => reason.text),
  }));
}

/** The source record's own unknown Level A dimensions - the single global `uncompared` computation. */
export function promptUncomparedDimensionsOf(
  derivation: RetrievalDerivationRecord,
): readonly LevelADimension[] {
  return derivation.uncompared_dimensions;
}

/** One traceable historical content candidate the model may select (§6 ③). */
export interface InsightPromptSourceCandidate {
  readonly target_id: string;
  readonly source_field_path: string;
  readonly source_type: string;
  readonly allowed_roles: readonly string[];
  readonly value: string;
}

export function promptSourceCandidatesOf(
  catalog: GroundingSourceCatalog,
): readonly InsightPromptSourceCandidate[] {
  return catalog.candidates.map((candidate) => ({
    target_id: candidate.target_id,
    source_field_path: candidate.source_field_path,
    source_type: candidate.source_type,
    allowed_roles: candidate.allowed_roles,
    value: candidate.value,
  }));
}

/** One decision-type `Inference` the user has EXPLICITLY accepted (§6 ④ / §4.3). */
export interface InsightPromptAcceptedInference {
  readonly origin: string;
  readonly statement: string;
}

/**
 * The accepted decision inferences of the source record.
 *
 * 🔴 ONLY `decision_state = accepted` items qualify (`§4.3` / AC-95). An `unresolved` or
 *    `rejected` candidate cause is NOT a confirmed basis and MUST NOT be offered here - offering
 *    it would let step ⑧ reason from something the user never agreed to.
 */
export function acceptedDecisionInferencesOf(
  attempt: Attempt,
): readonly InsightPromptAcceptedInference[] {
  return attempt.candidate_causes
    .filter((item) => isReusableAsConfirmedDecision(item))
    .map((item) => ({ origin: '候选失败原因（用户已接受）', statement: item.value }));
}

/* ------------------------------------------------------------------ *
 * 2. Step ⑧ messages
 * ------------------------------------------------------------------ */

export interface InsightGenerationPromptInput {
  readonly source_attempt: InsightPromptSourceAttempt;
  readonly uncompared_dimensions: readonly LevelADimension[];
  readonly comparisons: readonly InsightPromptComparisonEntry[];
  readonly source_catalog: readonly InsightPromptSourceCandidate[];
  readonly accepted_inferences: readonly InsightPromptAcceptedInference[];
}

const UNKNOWN_LABEL = '（未知 / 未提供）';

function line(label: string, value: string | null): string {
  return `- ${label}：${value === null ? UNKNOWN_LABEL : value}`;
}

const GENERATION_SYSTEM_RULES = [
  '你在一个“失败经验孵化助手”的第 ⑧ 步工作：把这次尝试的对照结果，提炼成可积累的经验命题。',
  '',
  '【一、你只能依据下面给出的材料】',
  '1. 本次 Formal Attempt 的内容；',
  '2. ⑥⑦ 步的对照结果（相似点 / 差异点 / 未比对维度 / 为什么相关）；',
  '3. 给出的“可引用历史内容”清单；',
  '4. 给出的“用户已接受的 AI 判断”。',
  '不得使用清单以外的任何信息，不得引入没有出现过的记录、条件、参数或数值。',
  '',
  '【二、必须区分来源性质】',
  '- 历史事实（Fact）可以引用；抽取（Extraction）可以引用但不能当事实；',
  '- 你的产出是推断（Inference），永远不是事实，也不是“已经证明”的结论；',
  '- 只有“用户已接受的 AI 判断”才能当作已确认依据；未接受 / 被拒绝的判断一律不得当作依据。',
  '',
  '【三、必须限定适用范围】',
  '- scope 要写清“在哪些已知条件下观察到该经验”；',
  '- 不能因为一条历史记录就写出一般规律：不得出现“普遍”“通常”“总是”“一定会”“必然”',
  '  “方法 X 无效”这类说法；如果只有一条记录，只能写成“在当前条件下……”这种局部经验。',
  '',
  '【四、引用只能从清单里选】',
  '- evidence_selections 的 target_id 与 source_field_path 必须逐字复制清单中的值，不得改写、不得虚构；',
  '- role 只能取该条清单里 allowed_roles 列出的值；',
  '- 不得虚构记录、字段路径、实验条件或数值；没有可引用的内容时，evidence_selections 写空数组。',
  '',
  '【五、E2 / E3 是离散判断】',
  '- e2_check（结论是否明确）只能是 "pass" 或 "fail"，必须同时给出 e2_reason；',
  '- e3_check（适用范围是否明确）只能是 "pass" 或 "fail"，必须同时给出 e3_reason；',
  '- 结论含混（例如“感觉可能有问题”）时 e2_check = "fail"；关键条件完全缺失时 e3_check = "fail"；',
  '- 判断不通过时，用 missing_items 说明：① 缺什么（description）② 为什么重要（why_important）',
  '  ③ 如何补充（how_to_supplement，一条 AI 建议）；不得因为不通过就不输出该条。',
  '',
  '【六、数量没有门槛】',
  '- 0 到 n 条都可以。只有真正独立的经验命题才输出，不得近义改写凑数；',
  '- 一条都形不成时，insights 写空数组，exit_route 写 "EXIT-A"（证据不足）或 "EXIT-C"（命题无法形成），',
  '  并在 absence_statement 里说明原因；',
  '- 只要输出了至少一条，exit_route 必须写 "NONE"。',
  '',
  '【七、禁止】',
  '- 禁止输出任何评分 / 置信度 / 概率 / 百分比 / 权重 / 等级 / 证据强度 / 排名 / 分值，禁止输出任何数字字段；',
  '- 禁止输出 status / state / accepted：状态只能由用户显式接受来改变；',
  '- 禁止出现“已证实 / 已验证为事实 / 证明了 / 方法 X 已被证明无效”这类措辞；',
  '- 禁止输出下一轮假设（Hypothesis，第 ⑨ 步的事）；不得把“下一步实验方案”当作本文的产出；',
  '- 禁止评价这次失败“值不值得记”“有多严重”。',
  '',
  '输出要求：只输出一个 JSON 对象；不要输出 Markdown 代码块；不要输出解释文字。',
  '结构：{"insights":[{"proposition":"...","scope":"...","basis":"...","verifiability":"...",' +
    '"evidence_selections":[{"target_id":"...","source_field_path":"...","role":"..."}],' +
    '"e2_check":"pass|fail","e2_reason":"...","e3_check":"pass|fail","e3_reason":"...",' +
    '"missing_items":[{"description":"...","why_important":"...","how_to_supplement":"..."}]}],' +
    '"exit_route":"NONE|EXIT-A|EXIT-C","absence_statement":"..."}',
].join('\n');

function renderSourceAttempt(source: InsightPromptSourceAttempt): string {
  return [
    `本次 Formal Attempt：${source.attempt_id}`,
    line('目标', source.goal),
    line('实际尝试', source.actual_attempt),
    line('条件', source.condition),
    line('实际结果', source.actual_result),
    line('结果状态', source.result_status),
    line('期望结果', source.expected_result),
    line('判断依据', source.judgment_basis),
  ].join('\n');
}

function renderComparisons(
  comparisons: readonly InsightPromptComparisonEntry[],
  uncompared: readonly LevelADimension[],
): string {
  const blocks = comparisons.map((entry) =>
    [
      `历史记录 ${entry.candidate_attempt_id}`,
      `  - 为什么相关：${entry.relevance_reasons.join('；') || UNKNOWN_LABEL}`,
      `  - 相似点：${entry.similar_points.join('；') || '（无）'}`,
      `  - 差异点：${entry.difference_points.join('；') || '（无）'}`,
      `  - 该记录未比对维度：${entry.uncompared_dimensions.join('、') || '（无）'}`,
    ].join('\n'),
  );
  const globalUncompared =
    uncompared.length === 0
      ? '（无）'
      : uncompared.map((dimension) => LEVEL_A_DIMENSION_LABELS[dimension]).join('、');
  return [
    `本次记录自身未比对的维度：${globalUncompared}`,
    '',
    blocks.length === 0 ? '（本次没有任何相关历史记录）' : blocks.join('\n\n'),
  ].join('\n');
}

function renderSourceCatalog(candidates: readonly InsightPromptSourceCandidate[]): string {
  if (candidates.length === 0) {
    return '（当前没有任何可引用的历史内容）';
  }
  return candidates
    .map((candidate) =>
      [
        `- target_id: ${candidate.target_id}`,
        `  source_field_path: ${candidate.source_field_path}`,
        `  来源性质: ${candidate.source_type}`,
        `  可选 role: ${candidate.allowed_roles.join(' / ')}`,
        `  内容: ${candidate.value}`,
      ].join('\n'),
    )
    .join('\n');
}

function renderAcceptedInferences(
  inferences: readonly InsightPromptAcceptedInference[],
): string {
  if (inferences.length === 0) {
    return '（没有用户已接受的 AI 判断）';
  }
  return inferences.map((entry) => `- ${entry.origin}：${entry.statement}`).join('\n');
}

/** Step ⑧ messages. 🔴 Minimal context only - see the module header. */
export function insightGenerationPromptMessages(
  input: InsightGenerationPromptInput,
): readonly AiMessage[] {
  return [
    { role: 'system', content: GENERATION_SYSTEM_RULES },
    {
      role: 'user',
      content: [
        '【本次尝试】',
        renderSourceAttempt(input.source_attempt),
        '',
        '【⑥⑦ 对照结果】',
        renderComparisons(input.comparisons, input.uncompared_dimensions),
        '',
        '【可引用历史内容（只能从这里选）】',
        renderSourceCatalog(input.source_catalog),
        '',
        '【用户已接受的 AI 判断】',
        renderAcceptedInferences(input.accepted_inferences),
      ].join('\n'),
    },
  ];
}

/* ------------------------------------------------------------------ *
 * 3. Re-check messages (`§24`)
 * ------------------------------------------------------------------ */

/** One evidence line of the re-check: what the proposition is standing on. */
export interface InsightRecheckEvidenceLine {
  readonly role: string;
  readonly target_id: string;
  readonly source_field_path: string;
  readonly value: string | null;
}

export interface InsightGateRecheckPromptInput {
  readonly insight_id: string;
  readonly source_attempt: InsightPromptSourceAttempt;
  readonly proposition: string;
  readonly scope: string;
  readonly judgment_basis: string;
  readonly evidence: readonly InsightRecheckEvidenceLine[];
}

const RECHECK_SYSTEM_RULES = [
  '你在一个“失败经验孵化助手”的第 ⑧ 步工作：对一条已有的候选经验做 E2 / E3 复检。',
  '',
  'E2｜结论明确：这条经验命题是否是一个明确、可理解的经验命题？',
  '  含混表达（例如“感觉可能有问题”“似乎效果不好”“好像失败了”）判 "fail"。',
  'E3｜适用范围明确：是否至少说明了“在当前已知哪些条件下观察到了该经验”？',
  '  关键条件完全缺失判 "fail"；不得为凑成 pass 而去猜条件。',
  '',
  '规则：',
  '- e2_check / e3_check 只能是 "pass" 或 "fail"，且必须各给一个 reason；',
  '- 判断为 fail 时，用 missing_items 给出：① 缺什么 ② 为什么重要 ③ 如何补充（AI 建议）；',
  '- 不得输出任何评分 / 置信度 / 概率 / 百分比 / 等级 / 证据强度，不得输出任何数字；',
  '- 不得输出 status / state / accepted：状态只能由用户显式接受来改变；',
  '- 不得出现“已证实 / 已验证为事实 / 证明了”这类措辞。',
  '',
  '输出要求：只输出一个 JSON 对象；不要输出 Markdown 代码块；不要输出解释文字。',
  '结构：{"e2_check":"pass|fail","e2_reason":"...","e3_check":"pass|fail","e3_reason":"...",' +
    '"missing_items":[{"description":"...","why_important":"...","how_to_supplement":"..."}]}',
].join('\n');

/** `E2` / `E3` re-check messages. 🔴 Minimal context: the insight content + its own evidence. */
export function insightGateRecheckPromptMessages(
  input: InsightGateRecheckPromptInput,
): readonly AiMessage[] {
  const evidence =
    input.evidence.length === 0
      ? '（这条经验当前没有引用任何历史内容）'
      : input.evidence
          .map(
            (line_) =>
              `- [${line_.role}] ${line_.target_id} :: ${line_.source_field_path} → ${
                line_.value === null ? UNKNOWN_LABEL : line_.value
              }`,
          )
          .join('\n');
  return [
    { role: 'system', content: RECHECK_SYSTEM_RULES },
    {
      role: 'user',
      content: [
        `候选经验：${input.insight_id}`,
        '',
        '【来源记录】',
        renderSourceAttempt(input.source_attempt),
        '',
        '【经验命题】',
        input.proposition,
        '',
        '【适用范围】',
        input.scope,
        '',
        '【判断依据 / 可验证判据】',
        input.judgment_basis,
        '',
        '【当前引用的历史内容】',
        evidence,
      ].join('\n'),
    },
  ];
}
