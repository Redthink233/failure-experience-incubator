/**
 * `Content Item` 的**持久化记录形态** —— 复用既有 `ContentItem<K>` 体系。
 *
 * Contract / canonical references:
 *   - docs/02 §C.4《`Content Item`（内容条目）》—— 逻辑字段 `item_id` / `field_key` /
 *     `source_type` / `confirmation_class` / `decision_state` / `origin_hint`；
 *   - docs/02 §C.4.2 C-5（`TC-15` / AC-30）—— **追问答案双层落库**：
 *     用户原话 → `Fact` 条目；AI 归纳 → `Extraction` 条目（可修改）；**禁止反向标注**；
 *   - docs/02 §C.4.3 —— `field_key` 清单（`TQ18`），含
 *     `followup_question` / `followup_user_answer` / `followup_ai_extraction`；
 *   - contract §4.2 rule 1 —— `source_type` 恒不变；
 *   - contract §13.2 `TQ02` / `CC-02` —— **物理 schema 属实现参数**，由 Integrator 收敛。
 *
 * 🔴 本模块**不新建第二套 provenance system**：它就是既有内容条目体系
 *    （`FactContentItem` / `ExtractionContentItem` / `InferenceContentItem`）加上
 *    docs/02 §C.4.1 已列出的两个逻辑字段 `field_key` 与 `origin_hint`。
 * 🔴 `presence_state = unknown` 的条目**不落库**：契约 §4.2 rule 7 要求「显式表达为未知」，
 *    该要求由字段级 `MaybeProvided` 载体承担（见 `src/domain/types/presence.ts`）；
 *    一条内容条目**按定义**携带取值，因此不存在「取值未知的内容条目」。
 * 🔴 `origin_hint` 只承载**人类可读的来源说明**（docs/02 §C.4.1：不得承载技术参数）；
 *    机器可读的归属（例如追问目标缺口）保存在 `Attempt Draft State` 中。
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ContentItem, SourceType } from './source-type.js';
import {
  decisionInferenceItem,
  displayInferenceItem,
  extractionItem,
  factItem,
} from './source-type.js';
import type { FollowUpGapKey } from './follow-up.js';

/* ------------------------------------------------------------------ *
 * 1. `field_key`（docs/02 §C.4.3 / `TQ18`）
 * ------------------------------------------------------------------ */

/**
 * 本阶段落地的 `field_key` 集合 —— **canonical 名称**（docs/02 §C.4.3 / `TQ18`）。
 *
 * 🔴 收敛口径（`TQ18` 冻结）：`PersistedContentItem.field_key` **恒为 canonical 名称**
 *    （`key_parameter` / `version_env` / `note` / `failure_tag`），**禁止**把 `Attempt` 的
 *    **物理属性名**（`key_parameters` / `environment` / `user_note` / `failure_tags`）直接当作
 *    `field_key`。物理属性名 → canonical `field_key` 的映射是显式的，见
 *    `CONTENT_ITEM_FIELD_KEY_BY_ATTEMPT_FIELD` 与 `canonicalFieldKeyForAttemptField`。
 *    🔴 物理属性名本身**仍然是合法的实现参数**（`Attempt.key_parameters` 等），只是不承担
 *       `field_key` 的语义 —— 因此本仓库**不做**物理属性名的全仓字符串禁止。
 * 🔴 该集合**不新增**与 canonical 字段框架（`D-013` 五组）冲突的项，也**不新增**
 *    任何失败类型分类法定字段（仅 optional tag，AC-12）。
 * 🔴 `Insight` / `Hypothesis` 的 `field_key`（docs/02 §C.4.3 末两行）由其对应模块实现，
 *    本阶段**不落地**，也不在此处预留别名。
 */
export const CONTENT_ITEM_FIELD_KEYS = [
  'raw_text',
  /* `Formal` 必备（P1 三例 + 结果状态，§9.4.1） */
  'goal',
  'actual_attempt',
  'actual_result',
  'result_status',
  /* 允许缺省（可记「未知 / 未提供」，`presence_state` 必须显式） */
  'condition',
  'expected_result',
  'judgment_basis',
  'key_parameter',
  'version_env',
  /* 用户内容字段 */
  'occurred_at',
  'note',
  'cost',
  'failure_tag',
  /* 第 ④ 步产物 */
  'candidate_cause',
  /* 追问产物（docs/02 §C.4.3） */
  'followup_question',
  'followup_user_answer',
  'followup_ai_extraction',
] as const;

export type ContentItemFieldKey = (typeof CONTENT_ITEM_FIELD_KEYS)[number];

export function isContentItemFieldKey(value: string): value is ContentItemFieldKey {
  return (CONTENT_ITEM_FIELD_KEYS as readonly string[]).includes(value);
}

/**
 * `Attempt` 的**物理属性名**（domain implementation property）。
 *
 * 🔴 这是**实现参数**（contract §13.2 `TQ02` / `CC-02`），可以且确实与 canonical `field_key`
 *    不同：`key_parameters` / `environment` / `user_note` / `failure_tags` 在这里合法，
 *    但**不是** canonical `field_key`。
 */
export const ATTEMPT_PHYSICAL_FIELD_KEYS = [
  'goal',
  'actual_attempt',
  'condition',
  'actual_result',
  'result_status',
  'expected_result',
  'judgment_basis',
  'key_parameters',
  'occurred_at',
  'environment',
  'cost',
  'user_note',
  'failure_tags',
] as const;

export type AttemptPhysicalFieldKey = (typeof ATTEMPT_PHYSICAL_FIELD_KEYS)[number];

/**
 * 物理属性名 → canonical `field_key` 的**显式、全量**映射（`TQ18` 口径落地）。
 *
 * 🔴 只有走这张表才可以把一个 `Attempt` 属性登记为内容条目的 `field_key`；
 *    **禁止**把物理属性名直接当作 `field_key`。
 */
export const CONTENT_ITEM_FIELD_KEY_BY_ATTEMPT_FIELD: Readonly<
  Record<AttemptPhysicalFieldKey, ContentItemFieldKey>
> = {
  goal: 'goal',
  actual_attempt: 'actual_attempt',
  condition: 'condition',
  actual_result: 'actual_result',
  result_status: 'result_status',
  expected_result: 'expected_result',
  judgment_basis: 'judgment_basis',
  key_parameters: 'key_parameter',
  occurred_at: 'occurred_at',
  environment: 'version_env',
  cost: 'cost',
  user_note: 'note',
  failure_tags: 'failure_tag',
};

/** 取某个物理属性名对应的 canonical `field_key`。 */
export function canonicalFieldKeyForAttemptField(
  field: AttemptPhysicalFieldKey,
): ContentItemFieldKey {
  return CONTENT_ITEM_FIELD_KEY_BY_ATTEMPT_FIELD[field];
}

/** canonical `field_key` 常量（避免散落的字符串字面量）。 */
export const RESULT_STATUS_FIELD_KEY: 'result_status' = 'result_status';
export const KEY_PARAMETER_FIELD_KEY: 'key_parameter' = 'key_parameter';
export const VERSION_ENV_FIELD_KEY: 'version_env' = 'version_env';
export const NOTE_FIELD_KEY: 'note' = 'note';
export const FAILURE_TAG_FIELD_KEY: 'failure_tag' = 'failure_tag';

/** canonical 追问三键。 */
export const FOLLOW_UP_QUESTION_FIELD_KEY: 'followup_question' = 'followup_question';
export const FOLLOW_UP_USER_ANSWER_FIELD_KEY: 'followup_user_answer' = 'followup_user_answer';
export const FOLLOW_UP_AI_EXTRACTION_FIELD_KEY: 'followup_ai_extraction' =
  'followup_ai_extraction';

/* ------------------------------------------------------------------ *
 * 2. 持久化内容条目
 * ------------------------------------------------------------------ */

export type PersistedContentItemOf<K extends SourceType> = ContentItem<K> & {
  readonly field_key: ContentItemFieldKey;
  /** 人类可读的值来源说明；`null` = 无额外说明（docs/02 §C.4.1，可选字段）。 */
  readonly origin_hint: string | null;
};

/**
 * 一条可持久化的内容条目。
 * 🔴 `source_type` 仍是唯一且恒不变的来源属性；本类型**不是**「用户/AI 布尔标记」，
 *    也不得被压平成单一字符串（contract §4.2 前言）。
 */
export type PersistedContentItem = PersistedContentItemOf<SourceType>;

/** 内容条目所属对象类型（docs/02 §C.4.1 `owner_type`）。本阶段只有 `Attempt`。 */
export const CONTENT_ITEM_OWNER_TYPE = 'attempt' as const;

/* ------------------------------------------------------------------ *
 * 3. 来源说明（display-only）
 * ------------------------------------------------------------------ */

export const ORIGIN_HINT_FOLLOW_UP_ANSWER = '来自追问回答';
export const ORIGIN_HINT_FOLLOW_UP_INDUCTION = 'AI 对追问回答的归纳';
export const ORIGIN_HINT_AI_PARSE = '来自第 ② 步结构化解析';

/** 追问回答的来源说明：点明它回答的是哪一个 canonical 缺口。 */
export function followUpAnswerOriginHint(target_gap: string): string {
  return `${ORIGIN_HINT_FOLLOW_UP_ANSWER}（缺口：${target_gap}）`;
}

/* ------------------------------------------------------------------ *
 * 4. 构造器
 * ------------------------------------------------------------------ */

/**
 * 给一条既有内容条目补上 docs/02 §C.4.1 的两个逻辑字段，得到可持久化形态。
 *
 * 🔴 这是一个**包装**，不是第二套 provenance 体系：`source_type`（以及
 *    `confirmation_class` / `decision_state`）原样保留，**永不**被改标。
 */
export function persistContentItem(
  item: ContentItem,
  field_key: ContentItemFieldKey,
  origin_hint: string | null,
): PersistedContentItem {
  if (item.source_type === 'Inference') {
    return item.confirmation_class === 'decision'
      ? {
          content_item_id: item.content_item_id,
          source_type: 'Inference',
          confirmation_class: 'decision',
          decision_state: item.decision_state,
          value: item.value,
          field_key,
          origin_hint,
        }
      : {
          content_item_id: item.content_item_id,
          source_type: 'Inference',
          confirmation_class: 'display',
          value: item.value,
          field_key,
          origin_hint,
        };
  }
  if (item.source_type === 'Fact') {
    return {
      content_item_id: item.content_item_id,
      source_type: 'Fact',
      value: item.value,
      field_key,
      origin_hint,
    };
  }
  return {
    content_item_id: item.content_item_id,
    source_type: 'Extraction',
    value: item.value,
    field_key,
    origin_hint,
  };
}

/**
 * 追问的**用户原话** → `Fact` 条目（docs/02 §C.4.2 C-5）。
 * 🔴 恒为 `Fact`：用户原话**禁止**标为 `Inference`，也**不因确认动作**改变来源属性。
 */
export function followUpUserAnswerItem(
  content_item_id: string,
  target_gap: string,
  userWords: string,
): PersistedContentItemOf<'Fact'> {
  return {
    ...factItem(content_item_id, userWords),
    field_key: FOLLOW_UP_USER_ANSWER_FIELD_KEY,
    origin_hint: followUpAnswerOriginHint(target_gap),
  };
}

/**
 * **AI 对回答的归纳** → 独立 `Extraction` 条目（docs/02 §C.4.2 C-5）。
 * 🔴 与用户原话是**两条**内容条目，**不得合并**；AI 归纳**禁止**标为 `Fact`，
 *    也不得被升级为 `Fact`（AC-30 / §4.2 rule 1）。
 */
export function followUpAiExtractionItem(
  content_item_id: string,
  target_gap: string,
  aiInduction: string,
): PersistedContentItemOf<'Extraction'> {
  return {
    ...extractionItem(content_item_id, aiInduction),
    field_key: FOLLOW_UP_AI_EXTRACTION_FIELD_KEY,
    origin_hint: followUpAnswerOriginHint(target_gap),
  };
}

/**
 * 第 ② 步系统生成的追问问题（docs/02 §C.4.3：`followup_question` 为 `Inference｜display`）。
 * 🔴 展示型 `Inference` **没有**「已确认」状态，它的存在不改变任何持久化业务状态
 *    （§4.2 rule 6 / AC-09）。
 */
export function followUpQuestionItem(
  content_item_id: string,
  target_gap: string,
  question_text: string,
): PersistedContentItemOf<'Inference'> {
  return {
    ...displayInferenceItem(content_item_id, question_text),
    field_key: FOLLOW_UP_QUESTION_FIELD_KEY,
    origin_hint: followUpAnswerOriginHint(target_gap),
  };
}

/**
 * 第 ② 步结构化解析产出的 AI 抽取条目（`Extraction`）。
 * 🔴 它使「当前待确认的解析结果」在浏览器刷新 / service 重建后**仍可重建**
 *    （task §10），从而内存 `Map` 只能作为 cache，不能作为唯一 Source of Truth。
 * 🔴 条目 id 由 (`attempt_id`, `field`) 决定，因此「重新解析」覆写同一条，
 *    不需要任何「提案版本」概念。
 */
export function aiParseExtractionItem(
  content_item_id: string,
  field_key: ContentItemFieldKey,
  value: string,
): PersistedContentItemOf<'Extraction'> {
  return {
    ...extractionItem(content_item_id, value),
    field_key,
    origin_hint: ORIGIN_HINT_AI_PARSE,
  };
}

/**
 * 第 ② 步的结果状态提案（`Inference｜decision`，恒以 `unresolved` 落盘）。
 * 🔴 未处理的决策型 `Inference` **不得**被复用为依据，也**不满足** Formal 门槛
 *    （§4.3 / AC-10 / AC-94）。
 */
export function aiParseResultStatusItem(
  content_item_id: string,
  value: string,
): PersistedContentItemOf<'Inference'> {
  return {
    ...decisionInferenceItem(content_item_id, value, 'unresolved'),
    field_key: RESULT_STATUS_FIELD_KEY,
    origin_hint: ORIGIN_HINT_AI_PARSE,
  };
}

/** 按 `field_key` 过滤内容条目。 */
export function contentItemsWithFieldKey(
  items: readonly PersistedContentItem[],
  field_key: ContentItemFieldKey,
): readonly PersistedContentItem[] {
  return items.filter((item) => item.field_key === field_key);
}

/**
 * 按 `content_item_id` 合并（upsert）内容条目，保持既有顺序。
 *
 * 🔴 条目标识决定身份：同一个 `content_item_id` 只会存在一条（docs/02 §C.4.1：
 *    `item_id` 是条目唯一标识，**禁止**用数组下标代替）。
 * 🔴 因此「重新解析」不会累积出第二套条目 —— 第 ② 步的抽取条目 id 由
 *    (`attempt_id`, 字段) 决定，重跑即覆写同一条，无需任何「提案版本」概念。
 * 🔴 V1 无物理删除（AC-76）：合并只做替换与追加，不提供移除。
 */
export function mergeContentItems(
  existing: readonly PersistedContentItem[],
  incoming: readonly PersistedContentItem[],
): readonly PersistedContentItem[] {
  const merged: PersistedContentItem[] = [...existing];
  const indexById = new Map<string, number>();
  merged.forEach((item, index) => indexById.set(item.content_item_id, index));
  for (const item of incoming) {
    const at = indexById.get(item.content_item_id);
    if (at === undefined) {
      indexById.set(item.content_item_id, merged.length);
      merged.push(item);
      continue;
    }
    merged[at] = item;
  }
  return merged;
}

/** 按 `content_item_id` 查找一条内容条目。 */
export function findContentItem(
  items: readonly PersistedContentItem[],
  content_item_id: string,
): PersistedContentItem | null {
  return items.find((item) => item.content_item_id === content_item_id) ?? null;
}

/** 追问回答的配对条目（用户原话 `Fact` + AI 归纳 `Extraction`）。 */
export interface FollowUpAnswerPair {
  readonly user_answer: PersistedContentItemOf<'Fact'>;
  readonly ai_extraction: PersistedContentItemOf<'Extraction'> | null;
}

/** 一条追问回答的稳定条目 id：与所属 `Attempt` 和主字段绑定，可追溯、非位置性。 */
export function followUpUserAnswerItemId(attempt_id: string, field: string): string {
  return `${attempt_id}:${field}:followup_user_answer`;
}

export function followUpAiExtractionItemId(attempt_id: string, field: string): string {
  return `${attempt_id}:${field}:followup_ai_extraction`;
}

/**
 * 一条关键追问问题的稳定条目 id。
 *
 * 🔴 身份 = (`attempt_id`, canonical `target_gap`)，**不得**由数组下标 / 展示顺序 /
 *    已问计数 / 排序位置表达（docs/02 §C.4.1：`item_id` 是条目唯一标识）。
 * 🔴 之所以能只用缺口作身份：canonical `D-017`「同一缺口只正式提问一次」保证
 *    同一 `Attempt` 内一个缺口至多对应一个问题条目（重复请求被 `GAP_ALREADY_ASKED` 拒绝）。
 */
export function followUpQuestionItemId(attempt_id: string, target_gap: FollowUpGapKey): string {
  return `${attempt_id}:followup_question:${target_gap}`;
}

/** 第 ② 步解析条目的稳定 id（与既有 `extractionItemId` 约定一致）。 */
export function aiParseExtractionItemId(attempt_id: string, field: string): string {
  return `${attempt_id}:${field}:ai`;
}

/** 类型守卫：内容条目是否为 `Inference｜display`（展示型，永不带「已确认」）。 */
export function isDisplayContentItem(
  item: PersistedContentItem,
): item is PersistedContentItemOf<'Inference'> {
  return item.source_type === 'Inference' && item.confirmation_class === 'display';
}
