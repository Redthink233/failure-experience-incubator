/**
 * S01-06 ｜ The App Shell copy deck - EVERY user-visible product string, in one auditable file.
 *
 * 🔴 WHY ONE FILE: the S01-06 task fixes a set of sentences (the three 0-like states, the stale
 *    notice, the `MODEL SUGGESTION` disclaimer, `EXIT-A/B/C`) that MUST NOT be paraphrased, and a
 *    set of expressions that must NEVER appear anywhere in the product UI (task §57). Keeping the
 *    whole deck here makes both properties checkable by grep instead of by reading every component.
 *
 * 🔴 WHAT IS DELIBERATELY ABSENT (task §57), and why each one is absent rather than merely unused:
 *    - any similarity / relevance / confidence / strength / grade / score wording: the product has
 *      no such number (AC-97 family) and a string that does not exist cannot be rendered;
 *    - any 「已证明 / 已证实 / 已验证」 wording: a `Hypothesis` is a direction to test later, never a
 *      verified claim (§37);
 *    - any 「记住 API Key」 / persistence wording: the credential store is session-only (§12);
 *    - any 「后台正在分析」 / 「自动继续生成」 wording: every generation is an explicit user action
 *      (`D-022`), so a background-progress sentence would describe a mechanism that does not exist;
 *    - any 「版本 1 / 版本 2」 wording: batches are batches, not versions (`D-051`).
 *
 * 🔴 SOURCE LABELS ARE PART OF THE COPY. `AI 推断` / `AI 解析结果` / `你提供的信息` are product
 *    vocabulary: the UI must never present a model inference as a user fact (§19 / §36).
 *
 * 🔴 THE USER-SIDE LABEL HAS THREE STATES, AND THE THIRD ONE NEEDS EVIDENCE
 *    (`RECOVERY-POLISH-01` §6–§9). A `Fact` is the user layer of the record, but WHICH user-layer
 *    sentence is true depends on the record itself - never on the mere presence of `source_type`:
 *
 *      · `demo_sample` record  → `CONFIRM_SOURCE_DEMO` 「示例记录」. Seeded example data is not the
 *        current user's doing; claiming 「你修改过」 over it would be a fabricated edit history.
 *      · ordinary Live record  → `CONFIRM_SOURCE_USER_PROVIDED` 「你提供的信息」. This is the
 *        DEFAULT, and it is also the fail-safe answer: when nothing proves an edit, say this.
 *      · a REAL, provable user edit → `CONFIRM_SOURCE_USER` 「你修改过」. Emitted ONLY against
 *        evidence that exists in the read model / session today (see `sourceLabelOf`). There is no
 *        edit history and no version history in V1 (AC-122) - so 「你修改过」 is never a guess.
 */

/* ------------------------------------------------------------------ *
 * 0. Product identity
 * ------------------------------------------------------------------ */

export const PRODUCT_NAME = '失败经验累积及孵化助手';
export const PRODUCT_TAGLINE = '让失败成为下一次验证的起点';

/* ------------------------------------------------------------------ *
 * 1. Empty state (task §56)
 * ------------------------------------------------------------------ */

export const HERO_TITLE = '把一次失败，变成下一次可验证的方向';
export const HERO_SUBTITLE =
  '记录你实际做过什么，系统会从历史尝试中寻找可复用线索，并说明下一步建议来自哪里。';
export const HERO_PRIMARY_CTA = '新建一次尝试';
export const HERO_LOCAL_NOTE = '你的数据保存在你选择的本地工作区。';
export const HERO_TRANSMISSION_NOTE =
  '模型分析所需内容可能发送到你配置的模型服务。';
export const HERO_STEPS: readonly string[] = ['记录失败', '找到历史', '生成下一步可验证方向'];

/* ------------------------------------------------------------------ *
 * 2. Workspace entry (task §9 / §10)
 * ------------------------------------------------------------------ */

export const WORKSPACE_UNSELECTED = '未选择工作区';
export const WORKSPACE_CONNECTED = '已连接本地工作区';
export const WORKSPACE_NEEDS_AUTHORIZATION = '需要重新授权';
export const WORKSPACE_ENTRY_TITLE = '选择本地工作区';
export const WORKSPACE_ENTRY_EXPLAIN =
  '这条记录会以普通文件的形式保存在你选择的目录里。系统只在你主动授权后访问该目录。';
export const WORKSPACE_PICK_BUTTON = '选择本地工作区';
export const WORKSPACE_REGANT_BUTTON = '重新授权';
export const WORKSPACE_PICKER_UNSUPPORTED =
  '当前浏览器没有提供文件系统访问能力，无法选择本地工作区（V1 面向 Chromium 系浏览器）。没有打开任何目录，也没有读取任何文件。';
export const WORKSPACE_PICKER_CANCELLED = '你取消了目录选择，当前仍没有工作区。';

/* ------------------------------------------------------------------ *
 * 3. Settings Center (task §11 / §12 / §13 / §14 ｜ PRE-PSA-BLOCKER-01)
 * ------------------------------------------------------------------ */

/**
 * The ONE settings entry point, in the top bar.
 *
 * 🔴 IT IS 「设置」, NOT 「模型设置」. The panel is a general Settings Center whose first section is
 *    「模型服务」; a top-bar button that names one section of it would misdescribe the page and leave
 *    a second-looking entry behind (`PRE-PSA-BLOCKER-01` §4).
 */
export const SETTINGS_OPEN = '设置';
/** The panel's own title - the same word as the entry that opens it, so the two read as one place. */
export const SETTINGS_TITLE = '设置';
export const SETTINGS_EXPLAIN =
  '配置这次会话可用的模型服务。连接方式由服务本身的能力决定，你不需要选择网络路径。';
export const SETTINGS_SECTION_MODEL = '模型服务';
export const SETTINGS_PROVIDER = 'Provider';
export const SETTINGS_MODEL = 'Model';
export const SETTINGS_API_KEY = 'API Key';
export const SETTINGS_API_KEY_NOTE = '仅当前会话使用。刷新页面后需要重新填写。';
export const SETTINGS_CUSTOM_BASE_URL = 'Custom Base URL';
export const SETTINGS_CUSTOM_BASE_URL_NOTE =
  '仅在你主动填写时使用，且只会用于浏览器直连的模型服务。';
export const SETTINGS_SAVE = '保存配置';
export const SETTINGS_CLEAR_KEY = '清除本次会话的 API Key';
/** The top-right 「×」. Rendered as an icon, so this string is its accessible name. */
export const SETTINGS_CLOSE = '关闭';
export const SETTINGS_CANCEL = '取消';
export const SETTINGS_CONNECTION_ROW = '连接方式';
export const SETTINGS_UNSUPPORTED = '当前配置无法建立受支持的模型连接。';

/**
 * The inline 「what is still missing」 block (task §7 A).
 *
 * 🔴 IT IS PART OF THE PANEL, NOT A NOTICE BEHIND IT. The panel is a full-height overlay, so a
 *    statement rendered anywhere else is invisible while the user is looking at the form - which is
 *    exactly the feedback gap the task fixes.
 */
export const SETTINGS_ERRORS_HEADING = '还不能保存';
/**
 * The inline 「the configuration could not be composed」 block (task §7 C).
 *
 * 🔴 A DIFFERENT STATEMENT FROM THE ONE ABOVE. "Please fill this in" and "this configuration has no
 *    supported connection" are two different outcomes with two different remedies, so they never
 *    share a heading.
 */
export const SETTINGS_UNSUPPORTED_HEADING = '模型连接未能建立';
export const SETTINGS_UNSUPPORTED_HINT = '配置未保存；工作区与已有记录不受影响。';

export const SETTINGS_CONNECTION_DIRECT = '连接方式：浏览器直连';
export const SETTINGS_CONNECTION_PROXY = '连接方式：受支持的代理连接';
export const SETTINGS_STATUS_UNCONFIGURED = '模型服务未配置';
export const SETTINGS_BASE_URL_REQUIRED = '这个 Provider 需要填写 Custom Base URL。';
/**
 * Shown instead of the custom-URL field, for a preset whose address the page does not accept.
 *
 * 🔴 IT MUST BE TRUE FOR EVERY PRESET THAT USES IT (`PRE-PSA-BLOCKER-01` §10). Two very different
 *    presets render it: a `thin_proxy` provider (whose target the server registry decides) and
 *    `DeepSeek`, which is BROWSER-DIRECT with a product-registered fixed endpoint. The earlier
 *    wording - 「只能通过受支持的代理连接访问」 - was accurate for the first and FALSE for the
 *    second, and a false statement is worse than a vague one. The wording below is the common truth:
 *    the address comes from the product, so the page does not offer a field for it.
 */
export const SETTINGS_BASE_URL_FORBIDDEN =
  '这个 Provider 的访问地址由产品提供，不能填写 Custom Base URL。';
export const SETTINGS_KEY_REQUIRED = '请填写 API Key（仅当前会话使用）。';
export const SETTINGS_MODEL_REQUIRED = '请填写 Model。';

/* ------------------------------------------------------------------ *
 * 3b. AI action blocked because no model is configured (S01-06B §8)
 * ------------------------------------------------------------------ */

/**
 * Shown when a `D9` COMMAND was requested while no model composition exists.
 *
 * 🔴 IT IS NOT AN ERROR SENTENCE AND MUST NOT BE REPLACED BY ONE. Browsing a workspace is fully
 *    available in this state; only the actions that need a model are unavailable, and the user
 *    reaches them by configuring the model - which the button next to it opens.
 * 🔴 It therefore carries no code, no layer, no 「系统错误」 wording: it is guidance, not a failure.
 */
export const MODEL_REQUIRED_NOTICE = '此操作需要模型服务，请先完成模型设置。';
export const MODEL_REQUIRED_ACTION = '打开模型设置';

/* ------------------------------------------------------------------ *
 * 4. Left rail (task §15 / §42)
 * ------------------------------------------------------------------ */

export const RAIL_NEW_ATTEMPT = '＋ 新建一次尝试';
export const RAIL_HEADING = '历史尝试';
export const RAIL_EMPTY = '这个工作区里还没有尝试记录。';
export const RAIL_ARCHIVED_BADGE = '已归档';
export const RAIL_STATE_DRAFT = '草稿';
export const RAIL_STATE_FORMAL = '已正式保存';
export const ATTEMPT_ARCHIVE_ACTION = '归档';
export const ATTEMPT_UNARCHIVE_ACTION = '取消归档';
export const ATTEMPT_ARCHIVED_READONLY = '已归档的记录只读。';

/* ------------------------------------------------------------------ *
 * 5. Demo / Live badge (task §41) - prepared here, seeded by M16 later
 * ------------------------------------------------------------------ */

export const BADGE_DEMO = 'Demo 示例数据';
export const BADGE_LIVE = 'Live 用户数据';

/* ------------------------------------------------------------------ *
 * 6. The ten steps (task §6) - the guided question language
 * ------------------------------------------------------------------ */

export interface StepCopy {
  readonly number: string;
  readonly question: string;
}

export const STEP_COPY: readonly StepCopy[] = [
  { number: '①', question: '发生了什么？' },
  { number: '②', question: '我先帮你整理' },
  { number: '③', question: '你确认一下' },
  { number: '④', question: '可能为什么没有达到预期？' },
  { number: '⑤', question: '保存这次尝试' },
  { number: '⑥', question: '看看以前有没有类似经历' },
  { number: '⑦', question: '哪里相同？哪里不同？' },
  { number: '⑧', question: '能沉淀出什么经验？' },
  { number: '⑨', question: '下一步值得验证什么？' },
  { number: '⑩', question: '这个方向为什么值得验证？' },
];

export const STEP_STATUS_DONE = '完成';
export const STEP_STATUS_CURRENT = '当前';
export const STEP_STATUS_TODO = '尚未开始';
export const STEP_LOCKED_HINT = '完成前一步后可继续';

/* ------------------------------------------------------------------ *
 * 7. Step ① - the natural-language entry (task §18)
 * ------------------------------------------------------------------ */

export const CAPTURE_CARD_TITLE = '记录一次没有达到预期的尝试';
export const CAPTURE_CARD_HINT =
  '用你自己的话写下来就好：你想做什么、实际怎么做、最后发生了什么。一句话也可以。';
export const CAPTURE_TEXTAREA_LABEL = '这次尝试大致发生了什么？';
export const CAPTURE_START = '开始整理';
export const CAPTURE_STARTING = '正在整理…';

/* ------------------------------------------------------------------ *
 * 8. Step ② - structured parse and follow-up questions (task §19 / §20)
 * ------------------------------------------------------------------ */

export const PARSE_HEADING = '我先帮你整理成这样';
export const PARSE_SOURCE_AI = 'AI 解析结果';
export const PARSE_UNKNOWN = '未知 / 未提供';
export const PARSE_NOT_EXTRACTED =
  '这次没能从你的描述里整理出结构化内容。原文保留不变，你可以补充后重新整理，或直接进入确认。';
export const FOLLOWUP_HEADING = '为了把这次尝试说清楚，我还想确认';
export const FOLLOWUP_REMAINING = (remaining: number): string =>
  `还可以追问 ${remaining} 个关键问题。`;
export const FOLLOWUP_BUDGET_EXHAUSTED = '3 个关键追问问题已经用完。';
export const FOLLOWUP_ANSWER_LABEL = '你的回答';
export const FOLLOWUP_ANSWER_SUBMIT = '回答';
export const FOLLOWUP_DONT_KNOW = '不知道';
export const FOLLOWUP_SKIP = '跳过 / 就这样继续';
export const FOLLOWUP_ANSWER_SOURCE_USER = '你提供的信息';
export const FOLLOWUP_ANSWER_SOURCE_AI = 'AI 对这次回答的归纳';
export const FOLLOWUP_QUESTION_SOURCE = '系统提出的问题';
export const FOLLOWUP_ASK = '继续追问';
export const FOLLOWUP_ASKING = '正在记录问题…';
export const FOLLOWUP_RECORDED = '已记录，会一起在「你确认一下」里保存。';
export const FOLLOWUP_NOTHING_TO_ASK = '没有需要继续追问的关键信息了。';
export const FOLLOWUP_SKIPPED_NOTE = '已记录为「就这样继续」，不会再问同一个问题。';
export const FOLLOWUP_PERSISTED_HEADING = '追问问答的落库结果';
export const FOLLOWUP_DOUBLE_LAYER_EXPLAIN =
  '用户原话与 AI 归纳是两条独立内容，来源属性各自保留。';

/* ------------------------------------------------------------------ *
 * 9. Step ③ - the confirmation (task §21)
 * ------------------------------------------------------------------ */

export const CONFIRM_HEADING = '确认一下这次实际发生了什么';
export const CONFIRM_EXPLAIN = '你可以修改任何一条，改完保存的就是你确认过的记录。';
export const CONFIRM_SUBMIT = '确认这些内容';
export const CONFIRM_SAVED = '已确认。';
/**
 * `Fact` on a `demo_sample` record - seeded example data, authored by nobody in this session.
 *
 * 🔴 IT REPLACES 「你修改过」 FOR DEMO DATA, and it is not a weaker claim: it says exactly what the
 *    record is. A seeded value was never edited by the current user, so no edit may be displayed
 *    over it (`RECOVERY-POLISH-01` §8).
 */
export const CONFIRM_SOURCE_DEMO = '示例记录';

/**
 * `Fact` on an ordinary record: the user's own wording, as supplied / confirmed.
 *
 * 🔴 THIS IS THE DEFAULT FOR EVERY USER-LAYER VALUE, and the fail-safe whenever an edit cannot be
 *    proven (`RECOVERY-POLISH-01` §7). It never overstates: it claims provenance, not an edit.
 */
export const CONFIRM_SOURCE_USER_PROVIDED = '你提供的信息';

/**
 * A user edit the record / session can actually prove happened.
 *
 * 🔴 NOT DERIVABLE FROM `source_type = 'Fact'` ALONE. V1 stores no edit history and no version
 *    history (AC-122) and `source_type` is invariant (§4.2 rule 1), so this sentence is only ever
 *    emitted against evidence that exists today - see `sourceLabelOf` and its one current source:
 *    the step ③ in-session edit buffer.
 */
export const CONFIRM_SOURCE_USER = '你修改过';
export const CONFIRM_SOURCE_AI = 'AI 整理';

/* ------------------------------------------------------------------ *
 * 10. Step ④ - candidate causes (task §22)
 * ------------------------------------------------------------------ */

export const CAUSES_HEADING = '可能为什么没有达到预期？';
export const CAUSES_ACTION = '分析可能原因';
export const CAUSES_ANALYSING = '正在分析…';
export const CAUSES_EMPTY = '当前依据不足，暂不推断原因。';
export const CAUSES_SOURCE = 'AI 推断 · 候选原因';
export const CAUSES_ACCEPT = '接受';
export const CAUSES_REJECT = '拒绝';
export const CAUSES_LEAVE = '暂不处理';
export const CAUSES_STATE_ACCEPTED = '已接受';
export const CAUSES_STATE_REJECTED = '已拒绝';
export const CAUSES_STATE_UNRESOLVED = '暂不处理';
export const CAUSES_NOTE =
  '这些只是候选解释，不是已经成立的结论。未处理的原因不会写成已接受。';

/**
 * Shown in ④ when a SAVED record carries no candidate cause.
 *
 * 🔴 IT IS NOT `CAUSES_EMPTY`. 「当前依据不足，暂不推断原因」 is an outcome of a RUN analysis; this
 *    sentence only reports what the record itself holds, and it must not imply that an analysis was
 *    declined or that any evidence judgement was made.
 */
export const CAUSES_NONE_RECORDED = '这条记录里没有候选原因。';

/* ------------------------------------------------------------------ *
 * 11. Step ⑤ - the Formal save and the ONE automatic step ⑥ (task §23 / §24)
 * ------------------------------------------------------------------ */

export const FORMAL_SAVE = '确认并保存这次尝试';
export const FORMAL_SAVING = '保存中…';
export const FORMAL_RETRIEVING = '正在查找历史经验…';
export const FORMAL_SAVED = '✓ 这次尝试已经保存';
export const FORMAL_GATE_HEADING = '还差这些内容才能正式保存';
export const FORMAL_GATE_HINT = '当前条件未满足，已有内容全部保留。';
export const RETRIEVAL_FAILED_AFTER_SAVE = '历史检索这次没有完成';
export const RETRIEVAL_RERUN = '重新检索';
export const RETRIEVAL_RERUNNING = '正在重新检索…';

/**
 * Shown in ⑤ when the record ON SCREEN is already saved (`PRE-PSA-HARDENING-01` §4).
 *
 * 🔴 WHY IT REPLACES A BUTTON: 「确认并保存这次尝试」 is a `Draft` command. Rendering it for a saved
 *    record would draw a control the record can no longer honour, and would make a historical record
 *    look like a draft still being filled in. The statement says where the record stands instead.
 */
export const FORMAL_ALREADY_SAVED = '这条记录已经正式保存。';

/**
 * Shown in ② when the record ON SCREEN is a saved one, so no capture control is drawn.
 *
 * 🔴 It explains an ABSENCE, it does not describe a failure: ①–⑤ have already happened for this
 *    record, and everything below ⑥ stays reachable.
 */
export const CAPTURE_HISTORY_READONLY =
  '这是一条已保存的历史记录：以上内容按原样展示，不会在这里重新走一遍记录流程。';

/* ------------------------------------------------------------------ *
 * 12. Step ⑥ - the retrieval result and its THREE 0-like states (task §25)
 * ------------------------------------------------------------------ */

export const RETRIEVAL_HEADING = '看看以前有没有类似经历';
export const retrievalFound = (n: number): string => `找到 ${n} 条相关历史记录`;
export const RETRIEVAL_HISTORY_EMPTY = '当前工作区还没有可用于比较的历史记录。';
export const RETRIEVAL_NO_RELATED_HISTORY = '已有历史记录，但这次暂未找到相关记录。';
export const RETRIEVAL_RUNTIME_INCOMPLETE = '历史检索这次没有完成。';
export const RETRIEVAL_NOT_AVAILABLE = '这条记录还没有做过历史检索。';
export const RETRIEVAL_STALE = '当前记录已被修改，先前的历史比较可能不再适用。';

/* ------------------------------------------------------------------ *
 * 13. Step ⑦ - same / different (task §27 / §28)
 * ------------------------------------------------------------------ */

export const COMPARISON_HEADING = '哪里相同？哪里不同？';
export const COMPARISON_SAME = '相同点';
export const COMPARISON_DIFFERENT = '差异点';
export const COMPARISON_UNCOMPARED = '未比对维度';
export const COMPARISON_REASON = '为什么相关';
export const COMPARISON_UNCOMPARED_ITEM = '该维度未比对';
export const COMPARISON_NO_POINTS = '这次没有可展示的相同点 / 差异点。';
export const COMPARISON_SOURCE_ARCHIVED = '来源已归档';
export const comparisonMore = (n: number): string => `还有 ${n} 条`;
export const COMPARISON_EXPAND = '展开全部';
export const COMPARISON_COLLAPSE = '收起';

/* ------------------------------------------------------------------ *
 * 14. Step ⑧ - candidate insights and the E1-E4 checks (task §30 / §31 / §32 / §33)
 * ------------------------------------------------------------------ */

export const INSIGHT_HEADING = '能沉淀出什么经验？';
export const INSIGHT_ACTION = '提炼可复用经验';
export const INSIGHT_GENERATING = '正在提炼…';
export const INSIGHT_EMPTY = '这次没有形成候选经验。';
export const INSIGHT_SOURCE = 'AI 推断 · 候选经验';
export const INSIGHT_STATE_CANDIDATE = '待确认';
export const INSIGHT_STATE_ACCEPTED = '已接受';
export const INSIGHT_STATE_REJECTED = '已拒绝';
export const INSIGHT_ACCEPT = '接受';
export const INSIGHT_REJECT = '拒绝';
export const INSIGHT_REVOKE = '撤销接受';
export const INSIGHT_EDIT = '修改内容';
export const INSIGHT_EDIT_SAVE = '保存修改';
export const INSIGHT_EDITED_NEEDS_REACCEPT = '内容已修改，需要重新接受。';
export const EXPERIENCE_ASSETS_HEADING = '可复用经验';
export const EXPERIENCE_ASSETS_EMPTY = '还没有已接受的可复用经验。';
export const INSIGHT_PROPOSITION = '内容';
export const INSIGHT_SCOPE = '适用范围';
export const INSIGHT_BASIS = '判断依据';

/** The four eligibility checks, in human words (task §31 - never `E1`/`E2`/`E3`/`E4` alone). */
export const GATE_LABELS: Readonly<Record<'E1' | 'E2' | 'E3' | 'E4', string>> = {
  E1: '有历史来源',
  E2: '结论明确',
  E3: '适用范围明确',
  E4: '可追溯到原记录',
};

export const GATE_MISSING_WHAT = '缺什么';
export const GATE_MISSING_WHY = '为什么重要';
export const GATE_MISSING_HOW = '如何补充';
export const GATE_MISSING_HOW_SOURCE = 'AI 建议';

/* ------------------------------------------------------------------ *
 * 15. Step ⑨ - hypotheses and model suggestions (task §34 - §39)
 * ------------------------------------------------------------------ */

export const HYPOTHESIS_HEADING = '下一步值得验证什么？';
export const HYPOTHESIS_ACTION = '生成下一步验证方向';
export const HYPOTHESIS_GENERATING = '正在生成…';
export const HYPOTHESIS_GROUNDED_HEADING = '基于历史的待验证方向';
export const HYPOTHESIS_MODEL_HEADING = '模型补充建议';
export const HYPOTHESIS_MODEL_NOTICE = '这不是由你的历史经验直接支持的方向。';
export const HYPOTHESIS_MODEL_SAVE = '保存';
export const HYPOTHESIS_MODEL_SAVED = '已保存';
export const HYPOTHESIS_MODEL_ACCEPT = '接受';
export const HYPOTHESIS_MODEL_REJECT = '拒绝';
export const HYPOTHESIS_CARD_TITLE = '待验证方向';
export const HYPOTHESIS_ACCEPT = '接受这个验证方向';
export const HYPOTHESIS_ACCEPT_HINT = '接受表示「我认为它值得下一步验证」，不是确认结论成立。';
export const HYPOTHESIS_STATE_ACCEPTED = '已接受（值得下一步验证）';
export const HYPOTHESIS_STATE_REJECTED = '已拒绝';
export const HYPOTHESIS_STATE_UNDECIDED = '未决定';
export const HYPOTHESIS_EMPTY = '这次没有生成待验证方向。';
export const HYPOTHESIS_CRITERIA_AI = 'AI 提议';
export const HYPOTHESIS_CRITERIA_USER = '你提供的信息';
export const HYPOTHESIS_CRITERIA_ACCEPT = '接受';
export const HYPOTHESIS_CRITERIA_REJECT = '拒绝';
export const HYPOTHESIS_CRITERIA_SKIP = '跳过';
export const HYPOTHESIS_CRITERIA_ADD = '补充你自己的内容';
export const HYPOTHESIS_CRITERIA_ADD_SAVE = '保存补充';

/** The eight items, in human words (task §35 - never a TypeScript property name). */
export const HYPOTHESIS_ITEM_LABELS = {
  hypothesis_statement: '待验证假设',
  rationale: '为什么提出',
  referenced_attempts: '历史依据',
  next_change: '下一轮改变什么',
  kept_conditions: '哪些条件保持不变',
  observation_metric: '观察什么',
  support_criterion: '什么结果支持它',
  refutation_criterion: '什么结果反驳它',
} as const;

export type HypothesisItemKey = keyof typeof HYPOTHESIS_ITEM_LABELS;

export const HYPOTHESIS_ITEM_MISSING = '未提供';

/** `EXIT-A/B/C` (task §39). 🔴 `B`/`C` never say the history was insufficient. */
export const EXIT_STATEMENTS: Readonly<Record<'EXIT-A' | 'EXIT-B' | 'EXIT-C', string>> = {
  'EXIT-A': '历史依据不足，这次没有形成基于历史的待验证方向。',
  'EXIT-B': '目前无法形成可验证的判据，这次没有形成基于历史的待验证方向。',
  'EXIT-C': '目前无法形成明确假设，这次没有形成基于历史的待验证方向。',
};

export const MODEL_SUGGESTION_IS_NOT_GROUNDED =
  '模型补充建议不是你的历史经验依据，也不计入引用数量。';

/* ------------------------------------------------------------------ *
 * 16. Step ⑩ - evidence traceability and the Evidence Rail (task §29 / §40)
 * ------------------------------------------------------------------ */

export const TRACE_ACTION = '查看依据';
export const TRACE_ACTION_LONG = '为什么提出这个方向？';
export const TRACE_HEADING = '这一步的判断来自哪里';
export const TRACE_EMPTY = '这个方向没有引用历史记录。';
export const citationCount = (n: number): string => `引用了 ${n} 条历史记录`;
export const EVIDENCE_RAIL_TITLE = '当前证据 / 来源';
export const EVIDENCE_RAIL_EMPTY = '点击左侧的相同点、差异点或引用依据，这里会显示它的来源。';
export const EVIDENCE_SOURCE_ATTEMPT = '来源的尝试记录';
export const EVIDENCE_SOURCE_FIELD = '来自哪个部分';
export const EVIDENCE_CONTENT = '内容';
export const EVIDENCE_ROLE = '角色';
export const EVIDENCE_ARCHIVED = '来源已归档';
export const EVIDENCE_CLOSE = '关闭';
export const EVIDENCE_ROLE_LABELS: Readonly<Record<string, string>> = {
  grounding: '依据',
  support: '支持',
  contradict: '反驳',
  context: '上下文',
};

/* ------------------------------------------------------------------ *
 * 16b. Follow-up question wording
 * ------------------------------------------------------------------ */

/**
 * The question asked for each canonical gap.
 *
 * 🔴 WHY THE UI OWNS THIS STRING: `AskFollowUpQuestionCommand.question_text` is supplied by the
 *    caller - the capture layer has no gap→question table (it validates the gap, the budget and the
 *    single-gap rule, and stores whatever text it was given). The wording is therefore App Shell
 *    copy, and it is kept here so it can be reviewed in one place.
 * 🔴 The UI does NOT decide WHICH gap to ask about: `capture.follow_up.next_gap` does, and
 *    `askFollowUpQuestion` re-validates it. A gap the user dismissed is never asked again.
 */
export const FOLLOWUP_QUESTION_TEXT: Readonly<Record<string, string>> = {
  goal: '这次尝试原本想达到什么目标？',
  actual_attempt: '你实际动手做的是什么？',
  actual_result: '最后实际发生了什么结果？',
  condition: '当时有哪些前提条件或环境限制？',
  judgment_basis: '你根据什么判断它没有达到预期？',
  key_parameter: '有没有关键参数或配置值可以记下来？',
};

export function followUpQuestionFor(gap: string): string {
  return FOLLOWUP_QUESTION_TEXT[gap] ?? '这条信息能补充一下吗？';
}

/* ------------------------------------------------------------------ *
 * 16c. Source partitions (⑨)
 * ------------------------------------------------------------------ */

export const SOURCE_PARTITION_LABELS: Readonly<Record<string, string>> = {
  historical_evidence: '来自历史经验',
  model_prior: '来自模型通用知识',
};

export const REASONING_ONLY_NOTE = '仅作为推理输入，不是历史证据。';

/* ------------------------------------------------------------------ *
 * 17. Notices: GATE vs RUNTIME (task §44 / §45)
 * ------------------------------------------------------------------ */

export const NOTICE_GATE_HEADING = '需要补充';
export const NOTICE_GATE_HINT = '当前条件未满足，记录保持不变。';
export const NOTICE_RUNTIME_HEADING = '系统本次没有完成';
export const NOTICE_RUNTIME_HINT = '已有内容保持不变，可以重试。';
export const NOTICE_RECOVERY_RERUN_RETRIEVAL = '重新检索';
export const NOTICE_RECOVERY_REGENERATE_INSIGHTS = '重新提炼经验';
export const NOTICE_RECOVERY_REGENERATE_HYPOTHESES = '重新生成方向';
export const NOTICE_RECOVERY_SELECT_WORKSPACE = '选择本地工作区';
export const NOTICE_RECOVERY_GRANT_ACCESS = '重新授权';
export const NOTICE_RETRY = '重试';

/* ------------------------------------------------------------------ *
 * 18. Field labels (never a schema key, never a TS property name)
 * ------------------------------------------------------------------ */

export const FIELD_LABELS: Readonly<Record<string, string>> = {
  goal: '目标',
  actual_attempt: '实际尝试',
  condition: '条件',
  actual_result: '实际结果',
  result_status: '结果状态',
  expected_result: '期望结果',
  judgment_basis: '判断依据',
  key_parameters: '关键参数',
  environment: '版本 / 环境',
  user_note: '备注',
  cost: '成本',
  occurred_at: '发生时间',
  failure_tags: '失败标签',
};

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

/** A date shown in the product layer (task §43). It is never a raw ISO string. */
export function formatTimestamp(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/u.exec(iso);
  if (match === null) {
    return iso;
  }
  const [, year, month, day, hour, minute] = match;
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export const FIELD_EMPTY = '未提供';
