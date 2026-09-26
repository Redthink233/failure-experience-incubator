/**
 * S01-05 ｜ Product prompts for step ② (structured parse) and step ④ (candidate causes).
 *
 * Contract: §9 ② / §9 ④; docs/06 §《S00-03 决策同步》§2 (`D-058`–`D-062`).
 *
 * 🔴 PROMPTS ARE IMPLEMENTATION PARAMETERS. They live here, are never written into the canonical
 *    docs, and create no Decision and no AC.
 *
 * 🔴 MINIMAL CONTEXT (contract §0.4 A): the parse prompt carries the user's own text and nothing
 *    else; the cause prompt carries the already-confirmed content values and nothing else. No
 *    workspace dump, no other Attempt, no history, no file name ever enters a prompt.
 *
 * 🔴 The parse prompt produces EXTRACTION ONLY. It is explicitly forbidden to (A) add facts the
 *    user did not state, (B) guess a value to fill a gap, (C) treat an extraction as a fact,
 *    (D) invent experimental conditions / parameters / numbers, (E) grade the failure, or
 *    (F) produce failure causes, `Insight` or `Hypothesis` before step ④.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { AiMessage } from '../../ai/provider/request.js';

/** Caller-owned prompt identity. 🔴 Not a product version system (AC-122). */
export const ATTEMPT_PARSE_PROMPT_ID = 'attempt-structured-parse/step-2';
export const CANDIDATE_CAUSE_PROMPT_ID = 'candidate-cause-analysis/step-4';

/** The exact JSON keys the parse step expects back. Kept next to the schema it describes. */
export const PARSE_PAYLOAD_KEYS = [
  'parse_status',
  'goal',
  'actual_attempt',
  'condition',
  'actual_result',
  'expected_result',
  'judgment_basis',
  'key_parameters',
  'environment',
  'user_note',
  'result_status_proposal',
] as const;

export const PARSE_STATUS_VALUES: readonly string[] = [
  'extracted',
  'partially_extracted',
  'failed_to_extract',
  'pending_user_confirmation',
];

const PARSE_SYSTEM_RULES = [
  '你在一个“失败经验记录助手”的第 ② 步工作：只把用户自己写下的这段文字整理成结构化字段。',
  '',
  'A. 只抽取用户文字里能支持的信息。用户没写的，就不要写。',
  'B. 不确定就留空（直接省略该字段），不要猜。',
  'C. 你产出的是 Extraction（抽取），不是 Fact（事实）。用户确认也不会把它变成事实。',
  'D. 不得创造实验条件、参数或数值。用户没说温度，你就不许出现任何温度数字；',
  '   用户给的原文里有数字才可以原样保留，不得换算、不得补充、不得推导新数字。',
  'E. 不得做“失败价值”判断：不要评价这次失败值不值得记、有多严重、有没有意义。',
  'F. 只做第 ② 步。不要推断失败原因，不要产出经验（Insight），不要产出下一步假设（Hypothesis）。',
  '',
  '字段说明（只写你能支持的，其余整条省略）：',
  '- parse_status：只能是 extracted / partially_extracted / failed_to_extract / pending_user_confirmation',
  '- goal：目标 / 想解决的问题',
  '- actual_attempt：实际尝试了什么（方案、行动、技术对象）',
  '- condition：进行这次尝试时的具体条件',
  '- actual_result：实际观察到的结果 / 现象 / 结论方向',
  '- expected_result：用户原本期待的结果（用户说了才写）',
  '- judgment_basis：用户给出的判定依据（用户说了才写）',
  '- key_parameters：用户原文中明确提到的关键参数，字符串数组，逐条原样摘录',
  '- environment：版本 / 环境（用户说了才写）',
  '- user_note：用户额外想记下的话（用户说了才写）',
  '- result_status_proposal：你提出的结果状态候选，写成一句话；它只是候选，必须由用户显式接受才算数',
  '',
  '输出要求：只输出一个 JSON 对象；不要输出 Markdown 代码块；不要输出解释文字。',
  '不要输出任何评分、置信度、概率、权重、相似度或等级字段。',
].join('\n');

/** Step ② messages. `rawText` is the user`s own wording, passed through unchanged. */
export function attemptParsePromptMessages(rawText: string): readonly AiMessage[] {
  return [
    { role: 'system', content: PARSE_SYSTEM_RULES },
    {
      role: 'user',
      content: ['下面是用户的原始记录，请只做结构化抽取：', '', '<<<USER_TEXT', rawText, 'USER_TEXT>>>'].join(
        '\n',
      ),
    },
  ];
}

const CAUSE_SYSTEM_RULES = [
  '你在一个“失败经验记录助手”的第 ④ 步工作：只提出这次尝试失败的候选原因。',
  '',
  '1. 你的输出是 Inference（推断），不是 Fact，也不是 Extraction。',
  '   写法必须是“失败可能与……有关”“一个可能的原因是……”，不得写成“失败原因就是……”。',
  '2. 允许 0 条候选原因。依据不足时请返回空数组，并在 cause_absence_note 里写',
  '   「当前依据不足，暂不推断原因」。绝对不要为了凑数编一条原因。',
  '3. 每条原因只依据下面给出的已确认内容。不要引入没有出现过的变量、条件或数值。',
  '4. 不得输出任何评分 / 概率 / 置信度 / 贡献度 / 重要度，也不得输出数字权重。',
  '5. 不要提出经验（Insight），不要提出下一步假设（Hypothesis），不要比较历史记录。',
  '',
  '输出要求：只输出一个 JSON 对象；不要输出 Markdown 代码块；不要输出解释文字。',
  '结构：{"causes":[{"statement":"...","supporting_source_paths":["字段名"]}],"cause_absence_note":"..."}',
  '- causes：候选原因数组，可以为空数组。',
  '- supporting_source_paths：该条原因依据的字段名（例如 goal / condition / actual_result）。',
  '- cause_absence_note：当 causes 为空时写「当前依据不足，暂不推断原因」；causes 非空时给空字符串。',
].join('\n');

export interface CausePromptField {
  readonly field: string;
  readonly value: string;
}

/** Step ④ messages. Only the already-confirmed content values are sent. */
export function candidateCausePromptMessages(
  fields: readonly CausePromptField[],
): readonly AiMessage[] {
  const body =
    fields.length === 0
      ? '（当前没有任何已确认的内容字段）'
      : fields.map((entry) => `- ${entry.field}：${entry.value}`).join('\n');
  return [
    { role: 'system', content: CAUSE_SYSTEM_RULES },
    { role: 'user', content: ['下面是这次尝试已经确认的内容：', '', body].join('\n') },
  ];
}
