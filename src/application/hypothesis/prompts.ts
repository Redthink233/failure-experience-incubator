/**
 * S01 ｜ `M9` prompts and MINIMAL-CONTEXT builders for step ⑨.
 *
 * Contract: §0.4 A ("🔴 只发送完成当前 AI 操作所需的最小必要上下文；🔴 不得默认上传整个 Workspace"),
 * §8 (the two kinds, the grounding bases and conditions, the count, the exits), §9 step ⑨,
 * §12 item 8 (`Fact` / `Extraction` / `Inference` are never flattened).
 *
 * 🔴 PROMPTS ARE IMPLEMENTATION PARAMETERS. They live here, are never written into the canonical
 *    docs, and create no Decision and no AC.
 * 🔴 MINIMAL CONTEXT: the step ⑨ prompt carries (①) the CURRENT source `Formal Attempt`'s necessary
 *    content, (②) the `M6` comparison output, (③) the `M7` traceable source catalog, (④) the
 *    reasoning-only inputs (an accepted `Insight`, an un-accepted prior candidate, a retained
 *    `Model Suggestion`), and (⑤) `N_检索`. It never carries the whole workspace, an unrelated
 *    `Attempt`, a technical log, a credential or an API key.
 * 🔴 THE PROMPT STATES THE BOUNDARY; IT DOES NOT ENFORCE IT. `schemas.ts`, `grounding.ts` and
 *    `verifiability.ts` enforce the same boundary deterministically, and `M7` re-validates every
 *    reference. Relying on prompt wording for the grounding boundary is exactly what §8 forbids.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { AiMessage } from '../../ai/provider/request.js';
import type { Attempt } from '../../domain/types/attempt.js';
import type { MaybeProvided } from '../../domain/types/presence.js';
import type { ContentItem } from '../../domain/types/source-type.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import { LEVEL_A_DIMENSION_LABELS } from '../../domain/types/level-a.js';
import type { RetrievalDerivationRecord } from '../../retrieval/compare/types.js';
import type { GroundingSourceCatalog } from '../../retrieval/grounding/types.js';
import type { ReasoningInputRef } from './types.js';
import { GROUNDING_BASIS_LABELS } from './types.js';

/** Caller-owned prompt identity. 🔴 Not a product version system (AC-122). */
export const HYPOTHESIS_GENERATION_PROMPT_ID = 'hypothesis-generation/step-9';
export const HYPOTHESIS_GROUNDING_CHECK_PROMPT_ID = 'hypothesis-grounding-check/step-9';

/** The exact JSON keys step ⑨ expects back. Kept next to the schema it describes. */
export const HYPOTHESIS_PAYLOAD_KEYS = [
  'grounded',
  'model_suggestions',
  'hypothesis_statement',
  'rationale',
  'next_change',
  'keep',
  'observation_metric',
  'support_criterion',
  'refutation_criterion',
  'evidence_selections',
  'grounding_bases',
  'exit_route',
  'absence_statement',
] as const;

/* ------------------------------------------------------------------ *
 * 1. Minimal-context builders
 * ------------------------------------------------------------------ */

function valueOf(carrier: MaybeProvided<ContentItem>): string | null {
  return carrier.presence_state === 'present' ? carrier.item.value : null;
}

/** The CURRENT source `Formal Attempt`'s necessary content. */
export interface HypothesisPromptSourceAttempt {
  readonly attempt_id: string;
  readonly goal: string | null;
  readonly actual_attempt: string | null;
  readonly condition: string | null;
  readonly actual_result: string | null;
  readonly result_status: string | null;
  readonly expected_result: string | null;
  readonly judgment_basis: string | null;
  readonly key_parameters: readonly string[];
}

export function promptSourceAttemptOf(attempt: Attempt): HypothesisPromptSourceAttempt {
  return {
    attempt_id: attempt.attempt_id,
    goal: valueOf(attempt.goal),
    actual_attempt: valueOf(attempt.actual_attempt),
    condition: valueOf(attempt.condition),
    actual_result: valueOf(attempt.actual_result),
    result_status: valueOf(attempt.result_status),
    expected_result: valueOf(attempt.expected_result),
    judgment_basis: valueOf(attempt.judgment_basis),
    key_parameters: attempt.key_parameters.map((item) => item.value),
  };
}

/** One `M6` related record's comparison output - the same shape step ⑧ consumed. */
export interface HypothesisPromptComparisonEntry {
  readonly candidate_attempt_id: string;
  readonly similar_points: readonly string[];
  readonly difference_points: readonly string[];
  readonly uncompared_dimensions: readonly string[];
  readonly relevance_reasons: readonly string[];
}

export function promptComparisonsOf(
  derivation: RetrievalDerivationRecord,
): readonly HypothesisPromptComparisonEntry[] {
  return derivation.candidate_entries.map((entry) => ({
    candidate_attempt_id: entry.candidate_attempt_id,
    similar_points: entry.similar_points.map((point) => point.text),
    difference_points: entry.difference_points.map((point) => point.text),
    uncompared_dimensions: entry.dimension_states
      .filter((state) => state.tri_state === 'uncompared')
      .map((state) => LEVEL_A_DIMENSION_LABELS[state.dimension]),
    relevance_reasons: entry.relevance_reasons.map((reason) => reason.text),
  }));
}

/** One traceable historical content candidate the model may select. */
export interface HypothesisPromptSourceCandidate {
  readonly target_id: string;
  readonly source_field_path: string;
  readonly source_type: string;
  readonly allowed_roles: readonly string[];
  readonly value: string;
}

export function promptSourceCandidatesOf(
  catalog: GroundingSourceCatalog,
): readonly HypothesisPromptSourceCandidate[] {
  return catalog.candidates.map((candidate) => ({
    target_id: candidate.target_id,
    source_field_path: candidate.source_field_path,
    source_type: candidate.source_type,
    allowed_roles: candidate.allowed_roles,
    value: candidate.value,
  }));
}

/** One reasoning-only input: information the model may THINK WITH but never ground on. */
export interface HypothesisPromptReasoningInput {
  readonly kind: string;
  readonly label: string;
  readonly ref_id: string;
  readonly text: string | null;
}

export function promptReasoningInputsOf(
  refs: readonly ReasoningInputRef[],
  text_by_ref_id: Readonly<Record<string, string>>,
): readonly HypothesisPromptReasoningInput[] {
  return refs.map((ref) => ({
    kind: ref.kind,
    label: ref.label,
    ref_id: ref.ref_id,
    text: text_by_ref_id[ref.ref_id] ?? null,
  }));
}

/* ------------------------------------------------------------------ *
 * 2. Step ⑨ messages
 * ------------------------------------------------------------------ */

export interface HypothesisGenerationPromptInput {
  readonly source_attempt: HypothesisPromptSourceAttempt;
  readonly n_retrieval: number;
  readonly grounding_possible: boolean;
  readonly uncompared_dimensions: readonly LevelADimension[];
  readonly comparisons: readonly HypothesisPromptComparisonEntry[];
  readonly source_catalog: readonly HypothesisPromptSourceCandidate[];
  readonly reasoning_inputs: readonly HypothesisPromptReasoningInput[];
}

const UNKNOWN_LABEL = '（未知 / 未提供）';

function line(label: string, value: string | null): string {
  return `- ${label}：${value === null ? UNKNOWN_LABEL : value}`;
}

const generationSystemRules = (): string =>
  [
    '你在一个“失败经验孵化助手”的第 ⑨ 步工作：基于这次尝试和它的历史对照，提出**下一步可以验证什么**。',
    '',
    '【一、你只能产生两种东西】',
    '1. grounded[]：有历史依据的待验证假设（History-grounded Hypothesis）；',
    '2. model_suggestions[]：与本次历史无关的通用建议（Model Suggestion）。',
    '不得把它们叫“候选经验 / 经验资产”，不得写成“已经证明的结论”。',
    '',
    '【二、每条假设必须严格写满 8 项】',
    '① hypothesis_statement 待验证假设（必填，不得为空字符串）',
    '② rationale 假设依据（必填）',
    '③ 引用的历史记录 —— 由 evidence_selections 表达（必填）',
    '④ next_change 下一轮改变什么（必填）',
    '⑤ keep 哪些条件保持不变（可缺省：写 null）',
    '⑥ observation_metric 观察什么指标（可缺省：写 null）',
    '⑦ support_criterion 什么结果支持（可缺省：写 null）',
    '⑧ refutation_criterion 什么结果反驳（可缺省：写 null）',
    '不要新增第 9 个字段，不要输出“已尝试失败列表”，不要输出成本字段。',
    '缺失一律用 null 或省略表示，**不要用空字符串冒充缺失**。',
    '',
    '【三、grounding 只有“成立 / 不成立”，没有中间等级】',
    '你要在 grounding_bases 里声明这条假设靠哪一个依据成立：',
    `- G1 ${GROUNDING_BASIS_LABELS.G1}`,
    `- G2 ${GROUNDING_BASIS_LABELS.G2}`,
    `- G3 ${GROUNDING_BASIS_LABELS.G3}`,
    `- G4 ${GROUNDING_BASIS_LABELS.G4}`,
    '每条 evidence_selections 用 grounding_basis 指出它支撑哪一个依据。',
    '声明会被逐条核对：说 G2 却指向结果字段，就会被判为“只有措辞相似”而拒绝。',
    '禁止输出 grounded / is_grounded 这类布尔自评，禁止输出任何评分、置信度、百分比、等级、证据强度。',
    '',
    '【四、数量：1–2 条，自适应】',
    '- 真实存在几个**独立**可验证方向，就写几条，最多 2 条；',
    '- 不得默认写 2 条，不得用近义改写凑第 2 条，不得写 3 条及以上；',
    '- 数量由“存在几个独立方向”决定，**不由历史记录条数决定**；',
    '- 只有一条历史记录时，仍然可以写 1 条；',
    '- 单条历史不得写成“普遍规律”：不得出现“普遍 / 通常 / 总是 / 一定会 / 必然 / 方法 X 无效”。',
    '',
    '【五、⑦⑧ 必须可观察、可区分】',
    '- 优先使用用户历史里已有的阈值（直接写进文字里即可，不要另造数字字段）；',
    '- 没有阈值时，定性但可观察、可区分的判据同样合法；',
    '- 禁止“效果更好 / 性能提升 / 看起来改善 / 结果不错”这类说法；',
    '- 若确实无法形成可区分判据，grounded 写空数组，exit_route 写 "EXIT-B"。',
    '',
    '【六、0 条时的出口必须分清】',
    '- "EXIT-A"：没有可对照的历史，或相关历史支撑不了这条方向（证据不足）；',
    '- "EXIT-B"：历史依据成立，但形不成可观察、可区分的验证判据；',
    '- "EXIT-C"：连明确的待验证假设都形成不了；',
    '- 三种都要在 absence_statement 里说明原因，**不得把 B / C 写成“历史证据不足”**；',
    '- 只要 grounded 至少有 1 条，exit_route 必须写 "NONE"。',
    '',
    '【七、⑤ 的写法】',
    '- 想保持某个历史已记录的条件：keep 写 {"kind":"historical_ref","target_id":"...","source_field_path":"..."}，路径逐字复制清单里的值；',
    '- 只是你的建议：keep 写 {"kind":"model_recommendation","text":"..."}；',
    '- 历史里“未知 / 未提供”的条件**不得写成“保持不变”**，只能写成“设为 Y”或省略。',
    '',
    '【八、model_suggestions】',
    '- 与本次历史无关的通用建议放这里，数量另计，**不得拿它填 grounded 的位置**；',
    '- 它不得引用任何历史记录、不得写 evidence_selections、不得声明 grounding_bases；',
    '- 它整条都会标注“模型通用建议 / 非你的历史经验依据”。',
    '',
    '【九、引用只能从清单里选】',
    '- evidence_selections 的 target_id 与 source_field_path 必须逐字复制清单中的值；',
    '- role 只能取该条清单里 allowed_roles 列出的值；',
    '- rationale 里如果点名了某条历史记录，该记录必须出现在 evidence_selections 中。',
    '',
    '【十、推理输入不是证据】',
    '- “前序候选经验（未接受）”“前序已接受经验”“此前的模型建议”只能当作思考素材；',
    '- 它们不是历史证据，不得写进 evidence_selections。',
    '',
    '【十一、禁止】',
    '- 禁止输出任何数字字段（阈值只能写在文字里）；',
    '- 禁止输出 status / state / decision_state / kind / saved / candidate 这类字段；',
    '- 禁止输出 source_partition / 混合来源 之类的来源标签；',
    '- 禁止出现“已证实 / 已验证为事实 / 证明了 / 方法 X 已被证明无效”。',
    '',
    '输出要求：只输出一个 JSON 对象；不要输出 Markdown 代码块；不要输出解释文字。',
    '结构：{"grounded":[{"hypothesis_statement":"...","rationale":"...","next_change":"...",' +
      '"keep":null,"observation_metric":null,"support_criterion":"...","refutation_criterion":"...",' +
      '"evidence_selections":[{"target_id":"...","source_field_path":"...","role":"...","grounding_basis":"G1"}],' +
      '"grounding_bases":["G1"]}],"model_suggestions":[' +
      '{"hypothesis_statement":"...","rationale":"...","next_change":"...","keep":null,' +
      '"observation_metric":null,"support_criterion":null,"refutation_criterion":null}],' +
      '"exit_route":"NONE|EXIT-A|EXIT-B|EXIT-C","absence_statement":"..."}',
  ].join('\n');

function renderSourceAttempt(source: HypothesisPromptSourceAttempt): string {
  return [
    `本次 Formal Attempt：${source.attempt_id}`,
    line('目标', source.goal),
    line('实际尝试', source.actual_attempt),
    line('条件', source.condition),
    line('实际结果', source.actual_result),
    line('结果状态', source.result_status),
    line('期望结果', source.expected_result),
    line('判断依据', source.judgment_basis),
    `- 关键参数：${source.key_parameters.length === 0 ? UNKNOWN_LABEL : source.key_parameters.join('；')}`,
  ].join('\n');
}

function renderComparisons(
  comparisons: readonly HypothesisPromptComparisonEntry[],
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

function renderSourceCatalog(candidates: readonly HypothesisPromptSourceCandidate[]): string {
  if (candidates.length === 0) {
    return '（当前没有任何可引用的历史内容：grounded 必须为空数组）';
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

function renderReasoningInputs(inputs: readonly HypothesisPromptReasoningInput[]): string {
  if (inputs.length === 0) {
    return '（没有推理输入）';
  }
  return inputs
    .map(
      (entry) =>
        `- [${entry.kind}] ${entry.label}${entry.ref_id.length > 0 ? `（${entry.ref_id}）` : ''}：${
          entry.text === null ? '（无可用文本）' : entry.text
        }`,
    )
    .join('\n');
}

/** Step ⑨ messages. 🔴 Minimal context only - see the module header. */
export function hypothesisGenerationPromptMessages(
  input: HypothesisGenerationPromptInput,
): readonly AiMessage[] {
  return [
    { role: 'system', content: generationSystemRules() },
    {
      role: 'user',
      content: [
        '【本次尝试】',
        renderSourceAttempt(input.source_attempt),
        '',
        `【N_检索】${String(input.n_retrieval)}${input.grounding_possible ? '' : '（没有可引用的历史内容，grounded 必须为空数组）'}`,
        '',
        '【⑥⑦ 对照结果】',
        renderComparisons(input.comparisons, input.uncompared_dimensions),
        '',
        '【可引用历史内容（只能从这里选）】',
        renderSourceCatalog(input.source_catalog),
        '',
        '【推理输入（不是历史证据，不得作为引用）】',
        renderReasoningInputs(input.reasoning_inputs),
      ].join('\n'),
    },
  ];
}

/* ------------------------------------------------------------------ *
 * 3. The independent grounding / criteria check
 * ------------------------------------------------------------------ */

export interface HypothesisCheckEntryInput {
  readonly hypothesis_id: string;
  readonly hypothesis_statement: string;
  readonly rationale: string;
  readonly next_change: string;
  readonly support_criterion: string | null;
  readonly refutation_criterion: string | null;
  /** The evidence lines this candidate stands on: role + landing point + content value. */
  readonly evidence: readonly string[];
}

const CHECK_SYSTEM_RULES = [
  '你在一个“失败经验孵化助手”的第 ⑨ 步做一次独立的核查。你不生成任何新内容，只做两个二值判断。',
  '',
  '【判断一｜grounding 是否成立】只能回答 "grounded" 或 "not_grounded"。',
  '成立的标准：这条假设至少有一个组成部分（问题对象/变量、条件、目标指标、排除项）确实来自给出的历史内容，',
  '并且给出的引用确实指向那段历史内容的对应字段。',
  '只要出现下面任一种情形，就回答 "not_grounded"，并用 condition 说明是哪一种：',
  '- "N3"：只有措辞相似，历史内容其实没有支撑这条假设；',
  '- "N4"：关键变量完全来自模型自己的先验，历史里没有对应内容。',
  '不允许回答“部分成立”“大致成立”“可信度较高”或任何分数、等级、百分比。',
  '',
  '【判断二｜⑦⑧ 是否可观察、可区分】只能回答 "observable_and_exclusive" 或 "not_observable_or_not_exclusive"。',
  '可观察 = 判据描述的是可以实际看到的、可以记录的结果；',
  '可区分 = 支持与反驳不可能同时成立；',
  '“效果更好 / 性能提升 / 看起来改善 / 结果不错”这类说法一律判 "not_observable_or_not_exclusive"。',
  '',
  '规则：',
  '- 只输出下面给出的 hypothesis_id，不要新增、不要改写；',
  '- 两个判断都必须各给一个 reason；',
  '- 不得输出任何数字、评分、置信度、等级、证据强度。',
  '',
  '输出要求：只输出一个 JSON 对象；不要输出 Markdown 代码块；不要输出解释文字。',
  '结构：{"checks":[{"hypothesis_id":"HYP_...","grounding_check":"grounded|not_grounded",' +
    '"condition":null,"grounding_reason":"...","criteria_check":' +
    '"observable_and_exclusive|not_observable_or_not_exclusive","criteria_reason":"..."}]}',
].join('\n');

function renderCandidates(entries: readonly HypothesisCheckEntryInput[]): string {
  return entries
    .map((entry) =>
      [
        `- hypothesis_id: ${entry.hypothesis_id}`,
        `  ① 待验证假设：${entry.hypothesis_statement}`,
        `  ② 假设依据：${entry.rationale}`,
        `  ④ 下一轮改变：${entry.next_change}`,
        `  ⑦ 什么结果支持：${entry.support_criterion === null ? '（明确缺失）' : entry.support_criterion}`,
        `  ⑧ 什么结果反驳：${entry.refutation_criterion === null ? '（明确缺失）' : entry.refutation_criterion}`,
        '  引用：',
        entry.evidence.length === 0 ? '    （没有任何引用）' : entry.evidence.map((line_) => `    ${line_}`).join('\n'),
      ].join('\n'),
    )
    .join('\n\n');
}

/** Step ⑨'s independent check messages. 🔴 Minimal context: the candidates and their own evidence. */
export function hypothesisGroundingCheckPromptMessages(
  entries: readonly HypothesisCheckEntryInput[],
): readonly AiMessage[] {
  return [
    { role: 'system', content: CHECK_SYSTEM_RULES },
    {
      role: 'user',
      content: ['【需要核查的假设】', renderCandidates(entries)].join('\n'),
    },
  ];
}
