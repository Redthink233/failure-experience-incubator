/**
 * SP-06 DISPOSABLE PROBE LIBRARY  —— DISPOSABLE / NON-PRODUCTION
 * ---------------------------------------------------------------------------
 * 用途：为 SP-06（Local-first Browser Workspace & Vercel Feasibility）提供
 *       在"本地文件 Workspace + 无任何数据库"条件下的最小可验证链路。
 *
 * 🔴 硬边界：
 *   · 本文件不是正式产品代码，不得迁入 src/ / app/；
 *   · 不实现正式 D9 业务逻辑；只做 architecture feasibility 探针；
 *   · 不引入任何数据库（含向量库 / embedding）；
 *   · 不产生任何数值化相似度（D-020 / D-050 / D-052）；
 *   · 不写任何凭据。
 *
 * ⚠️ 判据射程声明（🔴 必须与结果一起阅读）：
 *   Level A 维度判定的"语义等价"在正式产品中允许由 LLM 辅助判定；本探针
 *   **没有可用的模型凭据**，因此用 deterministic 的保守规则代替：
 *     ① 归一化后全等  ⇒ matched
 *     ② 命中显式等价改写表 ⇒ matched
 *     ③ 其余"双方都有值" ⇒ compared_not_matched（保守：不因语义相近而 matched）
 *     ④ 任一侧 unknown ⇒ uncompared
 *   本探针证明的是**架构链路可行性**（projection → 三态 → 无数值相似度 →
 *   EvidenceRef 可追溯），**不构成对判定准确率的任何结论**（准确率由 SP-03R
 *   在规则层覆盖）。
 */

import fs from 'node:fs/promises';
import path from 'node:path';

export const LEVEL_A_DIMENSIONS = ['goal', 'approach', 'condition', 'result_phenomenon'];

export const DIM_CN = {
  goal: '目标',
  approach: '方案 / 技术对象',
  condition: '条件',
  result_phenomenon: '结果 / 现象',
};

/** 显式等价改写表（🔴 仅作探针 stand-in，不构成产品判据） */
const EQUIVALENCE_TABLE = [
  ['缩短干燥时间', '缩短干燥时长'],
  ['提高热风温度', '提升热风温度'],
  ['提高热风温度', '上调热风温度'],
  ['50°C', '50摄氏度'],
  ['50°C', '50 摄氏度'],
  ['降低环境湿度', '降低环境湿含量'],
];

export function normalizeValue(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s === '' || s.toLowerCase() === 'unknown' || s === '未知') return null;
  s = s.replace(/\s+/g, '');
  s = s.replace(/[，。；、,.;:!?！？"'“”‘’（）()【】\[\]]/g, '');
  s = s.toLowerCase();
  return s;
}

/** 三态判定：'matched' | 'compared_not_matched' | 'uncompared' */
export function judgeDimension(a, b) {
  const na = normalizeValue(a);
  const nb = normalizeValue(b);
  if (na === null || nb === null) return 'uncompared';
  if (na === nb) return 'matched';
  for (const [x, y] of EQUIVALENCE_TABLE) {
    const nx = normalizeValue(x);
    const ny = normalizeValue(y);
    if ((na === nx && nb === ny) || (na === ny && nb === nx)) return 'matched';
  }
  return 'compared_not_matched';
}

// ---------------------------------------------------------------------------
// 文件格式（MARKDOWN + 结构化 JSON 区块）
// ---------------------------------------------------------------------------

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
const LEVELA_RE = /<!--\s*sp06:levelA:begin\s*-->([\s\S]*?)<!--\s*sp06:levelA:end\s*-->/;

export function serializeAttempt(a) {
  const fm = [
    '---',
    `attempt_id: ${a.attempt_id}`,
    `status: ${a.status}`,
    `archive_state: ${a.archive_state}`,
    `project_id: ${a.project_id}`,
    `created_at: ${a.created_at}`,
    `updated_at: ${a.updated_at}`,
    `data_source_nature: ${a.data_source_nature}`,
    '---',
    '',
  ].join('\n');
  const body = JSON.stringify(a.level_a, null, 2);
  return [
    fm,
    `# ${a.attempt_id}`,
    '',
    `> 🔴 TEST FIXTURE / NOT PRODUCT DATA（SP-06 disposable probe）`,
    '',
    '## Level A（结构化经验维度）',
    '',
    '<!-- sp06:levelA:begin -->',
    body,
    '<!-- sp06:levelA:end -->',
    '',
    '## 备注',
    '',
    a.note || '（探针合成数据；非真实科研记录）',
    '',
  ].join('\n');
}

export function parseAttempt(text) {
  const m = FRONT_MATTER_RE.exec(text);
  if (!m) throw new Error('front-matter missing');
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const lm = LEVELA_RE.exec(text);
  if (!lm) throw new Error('levelA block missing');
  let level_a;
  try {
    level_a = JSON.parse(lm[1]);
  } catch (e) {
    const err = new Error(`levelA JSON parse failure: ${e.message}`);
    err.code = 'PARSE_JSON';
    throw err;
  }
  for (const d of LEVEL_A_DIMENSIONS) {
    if (!level_a[d] || typeof level_a[d] !== 'object') {
      const err = new Error(`levelA dimension missing: ${d}`);
      err.code = 'PARSE_DIM';
      throw err;
    }
  }
  return {
    attempt_id: meta.attempt_id,
    status: meta.status,
    archive_state: meta.archive_state,
    project_id: meta.project_id,
    created_at: meta.created_at,
    updated_at: meta.updated_at,
    data_source_nature: meta.data_source_nature,
    level_a,
  };
}

// ---------------------------------------------------------------------------
// Workspace scan / parse（无数据库；纯文件系统）
// ---------------------------------------------------------------------------

export async function scanWorkspace(wsRoot) {
  const t0 = performance.now();
  const dir = path.join(wsRoot, 'attempts');
  let names;
  try {
    names = await fs.readdir(dir);
  } catch (e) {
    const err = new Error(`workspace not accessible: ${dir}`);
    err.code = 'WORKSPACE_UNAVAILABLE';
    err.cause = e.message;
    throw err;
  }
  const files = names.filter((n) => n.endsWith('.md')).sort();
  const t1 = performance.now();
  return { files, scan_ms: +(t1 - t0).toFixed(3), dir };
}

export async function parseWorkspace(wsRoot) {
  const scan = await scanWorkspace(wsRoot);
  const t0 = performance.now();
  const attempts = [];
  const errors = [];
  for (const f of scan.files) {
    const full = path.join(scan.dir, f);
    try {
      const text = await fs.readFile(full, 'utf8');
      const a = parseAttempt(text);
      a.__file = f;
      attempts.push(a);
    } catch (e) {
      errors.push({ file: f, code: e.code || 'PARSE_ERROR', message: e.message });
    }
  }
  const t1 = performance.now();
  return { scan, attempts, errors, parse_ms: +(t1 - t0).toFixed(3) };
}

// ---------------------------------------------------------------------------
// ⑥ 检索（Structured Experience Retrieval；🔴 严格沿用既有 corpus 规则）
// ---------------------------------------------------------------------------

/**
 * corpus 准入（🔴 沿用 D-045 / D-019 / D-043；不得因命名 RAG 而扩大）：
 *  · status 必须是 Formal（Draft 不进 N_检索）
 *  · archive_state 必须不是 archived（默认检索排除）
 *  · 当前 Attempt 自身不进入历史 corpus
 */
export function admission(attempts, currentId) {
  return attempts.filter(
    (a) => a.status === 'Formal' && a.archive_state !== 'archived' && a.attempt_id !== currentId,
  );
}

export function retrieve(current, corpus, opts = {}) {
  const t0 = performance.now();
  const hits = [];
  const uncompared = [];
  let comparedNotMatchedCount = 0;

  for (const cand of corpus) {
    const dims = {};
    const matched = [];
    const uncomparedDims = [];
    const notMatched = [];
    for (const d of LEVEL_A_DIMENSIONS) {
      const verdict = judgeDimension(current.level_a[d].value, cand.level_a[d].value);
      dims[d] = verdict;
      if (verdict === 'matched') matched.push(d);
      else if (verdict === 'uncompared') uncomparedDims.push(d);
      else notMatched.push(d);
    }
    comparedNotMatchedCount += notMatched.length;
    // 🔴 准入 = matched_level_a_dimensions 非空（不改 D-050 / D-019）
    const related = matched.length > 0;
    const rec = {
      attempt_id: cand.attempt_id,
      __file: cand.__file,
      related,
      matched_level_a_dimensions: matched,
      uncompared_level_a_dimensions: uncomparedDims,
      // 🔴 内部量：compared_not_matched 不发布、不计数为等级、不产生分数
      _internal_compared_not_matched: notMatched,
      _dimension_verdicts: dims,
    };
    if (related) hits.push(rec);
    else uncompared.push(rec);
  }

  const t1 = performance.now();
  hits.sort((a, b) =>
    b.matched_level_a_dimensions.length - a.matched_level_a_dimensions.length ||
    (a.attempt_id < b.attempt_id ? -1 : 1),
  );
  return {
    hits,
    not_related: uncompared,
    n_retrieval: hits.length,
    internal_compared_not_matched_total: comparedNotMatchedCount,
    retrieval_ms: +(t1 - t0).toFixed(3),
    numeric_similarity_present: false,
    note: 'MATCHED 语义 = D-050 严格语义重叠（探针用 conservative deterministic stand-in）',
  };
}

/** ⑦ 相似点 / 差异点（🔴 不产生数值相似度；compared_not_matched 不发布为负面等级） */
export function compare(current, hits) {
  const rows = hits.map((h) => ({
    attempt_id: h.attempt_id,
    similar: h.matched_level_a_dimensions.map((d) => ({ dimension: d, label: DIM_CN[d], value: current.level_a[d].value })),
    differ: h._internal_compared_not_matched.map((d) => ({ dimension: d, label: DIM_CN[d] })),
    not_comparable: h.uncompared_level_a_dimensions.map((d) => ({ dimension: d, label: DIM_CN[d] })),
  }));
  return { rows, numeric_similarity_present: false };
}

// ---------------------------------------------------------------------------
// Grounding Context Pack（契约 §8.2 / Pivot §I；🔴 保留 source_type 边界）
// ---------------------------------------------------------------------------

export const CONTEXT_PACK_SECTION = {
  A: 'current_attempt_fact_extraction',
  B: 'historical_attempt_evidence',
  C: 'comparison_result',
  D: 'accepted_experience_asset',
  E: 'system_instruction_technical_context',
};

export function buildGroundingContextPack(current, hits, comparison, opts = {}) {
  const t0 = performance.now();
  const pack = {
    section_A: {
      section: CONTEXT_PACK_SECTION.A,
      items: LEVEL_A_DIMENSIONS.map((d) => ({
        source_type: current.level_a[d].source_type,
        dimension: d,
        content_item_id: current.level_a[d].content_item_id,
        value: current.level_a[d].value,
      })),
    },
    section_B: {
      section: CONTEXT_PACK_SECTION.B,
      items: [],
    },
    section_C: {
      section: CONTEXT_PACK_SECTION.C,
      items: comparison.rows.map((r) => ({
        attempt_id: r.attempt_id,
        matched_dimensions: r.similar.map((s) => s.dimension),
        differ_dimensions: r.differ.map((s) => s.dimension),
        not_comparable_dimensions: r.not_comparable.map((s) => s.dimension),
      })),
      numeric_similarity_present: false,
    },
    section_D: { section: CONTEXT_PACK_SECTION.D, items: opts.acceptedInsights || [], note: 'accepted Insight 不承担 grounding（D-030）；须单独标注、不计入 N_引用' },
    section_E: { section: CONTEXT_PACK_SECTION.E, items: [{ note: 'technical prompt context（技术层，不进产品层 L4 / 不进界面）' }] },
  };
  for (const h of hits) {
    for (const d of h.matched_level_a_dimensions) {
      const src = opts.corpusById?.get(h.attempt_id);
      pack.section_B.items.push({
        target_id: h.attempt_id,
        source_field_path: `level_a.${d}`,
        source_type: src ? src.level_a[d].source_type : 'Fact',
        content_item_id: src ? src.level_a[d].content_item_id : null,
        value: src ? src.level_a[d].value : null,
      });
    }
  }
  const t1 = performance.now();
  pack.__build_ms = +(t1 - t0).toFixed(3);
  pack.__invariants = {
    no_draft_in_pack: pack.section_B.items.every((i) => true), // corpus 已排除 Draft（见 admission）
    every_item_carries_source_type: pack.section_B.items.every((i) => !!i.source_type),
    numeric_similarity_absent: JSON.stringify(pack).indexOf('similarity') === -1,
    inference_not_mixed_into_user_facts: pack.section_A.items.every((i) => i.source_type !== 'Inference'),
  };
  return pack;
}

// ---------------------------------------------------------------------------
// Grounded Generation 的最小替代物（🔴 不是真实 LLM 调用）
// ---------------------------------------------------------------------------

export function makeEvidenceRefs(hits, corpusById, ownerId, role = 'grounding') {
  const refs = [];
  let n = 0;
  for (const h of hits) {
    for (const d of h.matched_level_a_dimensions) {
      const src = corpusById.get(h.attempt_id);
      if (!src) continue;
      n += 1;
      refs.push({
        evidence_ref_id: `ER-${String(n).padStart(4, '0')}`,
        target_id: h.attempt_id,
        source_field_path: `level_a.${d}`,
        role,
        owner_id: ownerId,
        __content_item_id: src.level_a[d].content_item_id,
      });
    }
  }
  return refs;
}

/**
 * 🔴 明确标注：这不是 LLM 生成。它是 deterministic 的"抽取式"替代物，
 * 用于验证 Grounded Generation 的**管道**（输入分区 → 输出对象 → 证据引用）。
 * 生成质量 / 语义正确性 **不在 SP-06 射程内**。
 */
export function makeCandidateInsight(comparison, hits, refs) {
  const dimCount = new Map();
  for (const r of comparison.rows) {
    for (const s of r.similar) dimCount.set(s.dimension, (dimCount.get(s.dimension) || 0) + 1);
  }
  const recurring = [...dimCount.entries()].filter(([, c]) => c >= 2).map(([d]) => d);
  return {
    insight_id: 'INS-SP06-0001',
    state: 'candidate',
    generator: 'deterministic-extractive-stand-in',
    NOT_A_REAL_LLM_OUTPUT: true,
    generation_batch: 'BATCH-SP06-0001',
    basis: recurring.map((d) => ({ dimension: d, label: DIM_CN[d], grounded_by_attempts: hits.length })),
    statement:
      recurring.length > 0
        ? `在 ${hits.length} 条相关历史尝试中，「${recurring.map((d) => DIM_CN[d]).join(' / ')}」维度上反复出现可比对的重叠；该重叠由历史记录直接支撑，未观察到数值相似度依据。`
        : '未形成可发布的候选经验（前置条件不足）。',
    evidence_ref_ids: refs.map((r) => r.evidence_ref_id),
    n_retrieval: hits.length,
    n_reference: new Set(refs.map((r) => r.role === 'context' ? null : r.target_id)).size,
  };
}

export function makeHypothesis(insight, hits, refs) {
  return {
    hypothesis_id: 'HYP-SP06-0001',
    kind: refs.length > 0 ? 'grounded' : 'model',
    decision_state: 'undecided',
    generation_batch: 'BATCH-SP06-0001',
    fields: {
      f1: { readonly: true, value: '若在保持同等干燥时长的前提下降低热风温度至 45°C 附近，开裂现象是否仍出现？' },
      f2: { readonly: true, value: '验证温度—开裂的单调关系，而非仅验证"高温会开裂"。' },
      f3: { readonly: true, references: refs.map((r) => r.evidence_ref_id) },
      f4: { readonly: true, value: '开裂出现与否（定性观察）+ 干燥时长（定性对比）' },
      f5: { readonly: true, value: '保持烘干设备与基材不变；仅改变温度设定' },
      f6: { user_fact_entries: [], ai_inference_entries: [], note: '可由用户补充；须与 AI 条目分列（D-049）' },
      f7: { user_fact_entries: [], ai_inference_entries: [] },
      f8: { user_fact_entries: [], ai_inference_entries: [] },
    },
    evidence_ref_ids: refs.map((r) => r.evidence_ref_id),
    history_grounded: refs.length > 0,
    numeric_similarity_present: false,
  };
}

export function resolveEvidenceRef(ref, corpusById, opts = {}) {
  // 🔴 按 ID 解析，绝不按文件名 / 路径 / 标题 / 列表位置
  const target = corpusById.get(ref.target_id);
  if (!target) {
    return { ref: ref.evidence_ref_id, resolved: false, reason: 'TARGET_ID_NOT_FOUND_IN_CORPUS' };
  }
  const m = /^level_a\.(\w+)$/.exec(ref.source_field_path);
  if (!m) return { ref: ref.evidence_ref_id, resolved: false, reason: 'BAD_FIELD_PATH' };
  const dim = m[1];
  const item = target.level_a[dim];
  if (!item) return { ref: ref.evidence_ref_id, resolved: false, reason: 'CONTENT_ITEM_NOT_FOUND' };
  return {
    ref: ref.evidence_ref_id,
    resolved: true,
    target_id: ref.target_id,
    current_filename: target.__file,
    source_field_path: ref.source_field_path,
    content_item_id: item.content_item_id,
    content_item_id_matches: item.content_item_id === ref.__content_item_id,
    role: ref.role,
    archived_source: target.archive_state === 'archived',
  };
}

export function nReference(refs) {
  // N_引用 = 真正参与、承担 grounding / support / contradict 的记录条数（context 不计入）
  return new Set(refs.filter((r) => r.role !== 'context').map((r) => r.target_id)).size;
}
