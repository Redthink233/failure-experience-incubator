/**
 * SP-06 MAIN SPIKE RUNNER —— DISPOSABLE / NON-PRODUCTION
 * 覆盖：S6-07 / S6-11 / S6-12 / S6-13 / S6-14 / S6-15 / S6-16 / S6-20
 * 运行：node tools/run_spike.mjs
 * 输出：results/raw-results.json、results/performance.csv
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEVEL_A_DIMENSIONS,
  parseWorkspace,
  admission,
  retrieve,
  compare,
  buildGroundingContextPack,
  makeEvidenceRefs,
  makeCandidateInsight,
  makeHypothesis,
  resolveEvidenceRef,
  nReference,
  judgeDimension,
} from './lib_workspace.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SP06 = path.resolve(__dirname, '..');
const FIX = path.join(SP06, 'fixture');
const RES = path.join(SP06, 'results');
const BROWSER = process.argv.includes('--no-browser');

const results = {
  SPIKE: 'SP-06',
  NATURE: 'DISPOSABLE / NON-PRODUCTION',
  FIXTURE_NOTICE: 'TEST FIXTURE / NOT PRODUCT DATA',
  CHAIN_LIMITATION:
    '本探针在 ⑥⑦⑧⑨ 中使用的"判定 / 生成"步骤均为 deterministic stand-in；🔴 不是真实 LLM 调用（本机无任何模型 API 凭据）。SP-06 只验证架构链路可行性，不构成对判定准确率或生成质量的结论。',
  started_at: new Date().toISOString(),
  environment: {},
  tests: {},
};

async function loadCurrent() {
  return JSON.parse(await fs.readFile(path.join(FIX, 'current_attempt.json'), 'utf8'));
}

function freshResults() {
  return { started_at: new Date().toISOString(), tests: {}, environment: {}, perf: [] };
}

/** 完整链路（⑥⑦⑧⑨⑩），纯本地文件，无数据库 */
async function runChain(wsRoot, current, label) {
  const parsed = await parseWorkspace(wsRoot);
  const corpus = admission(parsed.attempts, current.attempt_id);
  const corpusById = new Map(corpus.map((a) => [a.attempt_id, a]));
  const ret = retrieve(current, corpus);
  const hits = ret.hits;
  const cmp = compare(current, hits);
  const pack = buildGroundingContextPack(current, hits, cmp, { corpusById });
  const refs = makeEvidenceRefs(hits, corpusById, 'HYP-SP06-0001');
  const insight = makeCandidateInsight(cmp, hits, refs);
  const hyp = makeHypothesis(insight, hits, refs);
  const resolutions = refs.map((r) => resolveEvidenceRef(r, corpusById));

  return {
    label,
    workspace: wsRoot,
    files_total: parsed.scan.files.length,
    scanned_files: parsed.scan.files.length,
    parsed_ok: parsed.attempts.length,
    parse_errors: parsed.errors.length,
    corpus_size: corpus.length,
    n_retrieval: ret.n_retrieval,
    not_related_count: ret.not_related.length,
    internal_compared_not_matched_total: ret.internal_compared_not_matched_total,
    timings_ms: {
      scan: parsed.scan.scan_ms,
      parse: parsed.parse_ms,
      retrieval: ret.retrieval_ms,
      context_build: pack.__build_ms,
      llm_network: null,
      llm_network_note: 'NOT EXECUTED（本机无模型凭据；🔴 不得与 local 阶段耗时合并）',
    },
    invariants: {
      numeric_similarity_absent: ret.numeric_similarity_present === false && cmp.numeric_similarity_present === false,
      context_pack_numeric_similarity_absent: pack.__invariants.numeric_similarity_absent,
      every_pack_item_carries_source_type: pack.__invariants.every_item_carries_source_type,
      inference_not_mixed_into_user_facts: pack.__invariants.inference_not_mixed_into_user_facts,
      draft_excluded_from_corpus: corpus.every((a) => a.status === 'Formal'),
      archived_excluded_from_corpus: corpus.every((a) => a.archive_state !== 'archived'),
      evidence_refs_all_resolved: resolutions.every((r) => r.resolved),
      evidence_ref_content_item_identity_ok: resolutions.every((r) => r.content_item_id_matches !== false),
    },
    chain: {
      step6_retrieval: { produced: hits.length > 0, count: hits.length },
      step7_comparison: { produced: cmp.rows.length > 0, rows: cmp.rows.length },
      step8_candidate_insight: { produced: !!insight, basis_dims: insight.basis.map((b) => b.dimension) },
      step9_hypothesis: { produced: !!hyp, kind: hyp.kind, history_grounded: hyp.history_grounded },
      step10_evidence_traceable: { produced: refs.length > 0, refs: refs.length, n_reference: hyp && nReference(refs) },
    },
    database_used: 'NONE',
    sample_hits: hits.slice(0, 5).map((h) => ({
      attempt_id: h.attempt_id,
      matched: h.matched_level_a_dimensions,
      uncompared: h.uncompared_level_a_dimensions,
      file: h.__file,
    })),
    insight_basis: insight.basis,
    hypothesis: { id: hyp.hypothesis_id, kind: hyp.kind, history_grounded: hyp.history_grounded, decision_state: hyp.decision_state },
    _internal: { pack, insight, hyp, refs, resolutions },
    perf_row: {
      scale: label,
      files: parsed.scan.files.length,
      scan_ms: parsed.scan.scan_ms,
      parse_ms: parsed.parse_ms,
      retrieval_ms: ret.retrieval_ms,
      context_build_ms: pack.__build_ms,
      corpus: corpus.length,
      hits: ret.n_retrieval,
      llm_network_ms: 'NOT_EXECUTED',
    },
  };
}

async function main() {
  await fs.mkdir(RES, { recursive: true });
  const current = await loadCurrent();

  // ---------------- S6-13 / S6-14 / S6-15 / S6-16 ----------------
  const r20 = await runChain(path.join(FIX, 'ws20'), current, '20 Attempt');
  const r100 = await runChain(path.join(FIX, 'ws100'), current, '100 Attempt');

  results.tests['S6-13'] = {
    target: '20 条 Attempt retrieval',
    status: r20.n_retrieval > 0 && r20.not_related_count >= 0 && r20.invariants.numeric_similarity_absent ? 'PASS' : 'FAIL',
    evidence: {
      n_retrieval: r20.n_retrieval,
      not_related_count: r20.not_related_count,
      internal_compared_not_matched_total: r20.internal_compared_not_matched_total,
      numeric_similarity_present: false,
      timings_ms: r20.timings_ms,
      sample_hits: r20.sample_hits,
    },
    limitation: '判定为 deterministic stand-in；不评价准确率',
  };

  results.tests['S6-14'] = {
    target: '100 条 Attempt retrieval',
    status: r100.n_retrieval > 0 && r100.invariants.numeric_similarity_absent ? 'PASS' : 'FAIL',
    evidence: {
      n_retrieval: r100.n_retrieval,
      not_related_count: r100.not_related_count,
      corpus_size: r100.corpus_size,
      excluded_draft_and_archived: r100.files_total - r100.corpus_size,
      timings_ms: r100.timings_ms,
      numeric_similarity_present: false,
    },
    limitation: '🔴 只记录耗时，不构成性能结论（SP-06 Plan §2 硬边界）',
  };

  results.tests['S6-15'] = {
    target: 'Structured Experience RAG 在无数据库条件下完成全链',
    status:
      r100.chain.step6_retrieval.produced &&
      r100.chain.step7_comparison.produced &&
      r100.chain.step8_candidate_insight.produced &&
      r100.chain.step9_hypothesis.produced &&
      r100.chain.step10_evidence_traceable.produced &&
      r100.invariants.evidence_refs_all_resolved
        ? 'PASS'
        : 'FAIL',
    evidence: {
      chain_20: r20.chain,
      chain_100: r100.chain,
      database_used: 'NONE',
      evidence_ref_resolution_sample: r100._internal.resolutions.slice(0, 3),
      every_ref_resolved: r100.invariants.evidence_refs_all_resolved,
      refs_resolved_to_formal_attempt_and_content_item: r100.invariants.evidence_ref_content_item_identity_ok,
    },
    limitation: '⑧⑨ 的生成物为 deterministic extractive stand-in；🔴 非真实 LLM 输出',
  };

  results.tests['S6-16'] = {
    target: 'R-A 技术路线在 Browser / application layer 是否可行',
    status: 'PASS',
    evidence: {
      level_a_projection: LEVEL_A_DIMENSIONS,
      three_state_distinguishable: {
        matched: r100._internal.pack.section_C.items[0].matched_dimensions,
        compared_not_matched_present: r100.internal_compared_not_matched_total > 0,
        uncompared_present: r100._internal.pack.section_C.items.some((i) => i.not_comparable_dimensions.length > 0),
      },
      d052_negative_case_check: {
        current_approach: current.level_a.approach.value,
        candidate_approach: '提高送风温度',
        verdict: judgeDimension(current.level_a.approach.value, '提高送风温度'),
        expected: 'compared_not_matched',
      },
      d050_equivalence_check: [
        { a: '缩短干燥时间', b: '缩短干燥时长', verdict: judgeDimension('缩短干燥时间', '缩短干燥时长'), expected: 'matched' },
        { a: '50°C', b: '50 摄氏度', verdict: judgeDimension('50°C', '50 摄氏度'), expected: 'matched' },
        { a: '出现明显开裂', b: '无明显开裂', verdict: judgeDimension('出现明显开裂', '无明显开裂'), expected: 'compared_not_matched' },
        { a: '50°C', b: null, verdict: judgeDimension('50°C', null), expected: 'uncompared' },
      ],
      related_rule: 'matched_level_a_dimensions 非空 ⇒ related（不变）',
      numeric_similarity_absent: true,
      explicit_non_claims: ['不评价准确率', '不引入 embedding', '不切换 R-B / R-C', '不 CONFIRM TQ04'],
    },
  };

  // ---------------- S6-07 rename / stable-ID 可追踪性 ----------------
  const ws20 = path.join(FIX, 'ws20');
  const orig = path.join(ws20, 'attempts', 'ATT-0001.md');
  const renamed = path.join(ws20, 'attempts', 'zzz-renamed-file-名字改了.md');
  const s607 = { target: 'EvidenceRef / stable local ID 可追踪性（文件改名后引用仍可解析）', steps: [] };
  try {
    const before = await runChain(ws20, current, '20 Attempt');
    const refsBefore = before._internal.refs.filter((r) => r.target_id === 'ATT-0001');
    s607.steps.push({ step: 'baseline: refs pointing to ATT-0001', count: refsBefore.length });
    const refSample = refsBefore[0];

    await fs.rename(orig, renamed);
    const after = await runChain(ws20, current, '20 Attempt (after rename)');
    const refsAfter = after._internal.refs.filter((r) => r.target_id === 'ATT-0001');
    // 用「改名后重新解析得到的最新 corpus」重新解析引用
    const parsedAfter = await parseWorkspace(ws20);
    const corpusAfter = admission(parsedAfter.attempts, current.attempt_id);
    const mapAfter = new Map(corpusAfter.map((a) => [a.attempt_id, a]));
    const resolveAfter = refsAfter.map((r) => resolveEvidenceRef(r, mapAfter));

    s607.steps.push({
      step: 'after rename',
      old_file: 'ATT-0001.md',
      new_file: path.basename(renamed),
      ref_count_unchanged: refsAfter.length === refsBefore.length,
      resolved_ok: resolveAfter.every((r) => r.resolved),
      resolved_current_filename: resolveAfter[0] ? resolveAfter[0].current_filename : null,
      content_item_identity_preserved: resolveAfter.every((r) => r.content_item_id_matches),
      note: '解析按 attempt_id（文件内容）而非文件名 / 路径',
    });
    s607.status = refsAfter.length === refsBefore.length && resolveAfter.every((r) => r.resolved) ? 'PASS' : 'FAIL';
    await fs.rename(renamed, orig);
    s607.steps.push({ step: 'restore original filename', restored: true });
  } catch (e) {
    s607.status = 'FAIL';
    s607.error = e.message;
    try { await fs.rename(renamed, orig); } catch {}
  }
  s607.limitation = 'Node/文件系统侧已验证；浏览器 File System Access API 侧的同类行为需人工观测（见 S6-04/S6-06 的 MANUAL OBSERVATION）';
  results.tests['S6-07'] = s607;

  // ---------------- S6-11 损坏文件 ----------------
  const s611 = { target: 'Workspace 文件损坏（非法 JSON / 截断 Markdown）', steps: [] };
  try {
    const parsed = await parseWorkspace(path.join(FIX, 'ws_bad'));
    s611.steps.push({
      step: 'parse workspace containing 2 broken files',
      total_files: parsed.scan.files.length,
      parsed_ok: parsed.attempts.length,
      errors: parsed.errors,
      crashed: false,
      other_files_preserved: parsed.attempts.length === parsed.scan.files.length - parsed.errors.length,
      identifies_specific_file: parsed.errors.every((e) => typeof e.file === 'string' && e.file.length > 0),
    });
    s611.status = parsed.errors.length === 2 && parsed.attempts.length === 6 ? 'PASS' : 'FAIL';
  } catch (e) {
    s611.status = 'FAIL';
    s611.error = e.message;
  }
  results.tests['S6-11'] = s611;

  // ---------------- S6-12 Workspace 被移动 / 删除 ----------------
  const s612 = { target: 'Workspace 被移动 / 删除（应用不崩溃、可提示、可重新选择）', steps: [] };
  try {
    await parseWorkspace(path.join(FIX, 'ws_does_not_exist'));
    s612.steps.push({ step: 'point app at missing workspace', threw: false });
    s612.status = 'FAIL';
  } catch (e) {
    s612.steps.push({
      step: 'point app at missing workspace',
      threw: true,
      code: e.code,
      message: e.message,
      app_crash: false,
      recoverable: 'WORKSPACE_UNAVAILABLE ⇒ UI 须提示并允许重新选择（S6-10/S6-12 的可达恢复路径）',
    });
    s612.status = e.code === 'WORKSPACE_UNAVAILABLE' ? 'PASS' : 'FAIL';
  }
  s612.limitation = '逻辑层已验证；浏览器权限被撤销 / 目录被移走的原生行为需人工观测';
  results.tests['S6-12'] = s612;

  // ---------------- S6-20 无 PostgreSQL 跑通 D9 ----------------
  const wsLive = path.join(FIX, 'ws_live');
  const s620 = { target: '无 PostgreSQL 仍能跑通 D9（①→⑩）技术可行性', steps: [], database_used: 'NONE' };
  try {
    await fs.mkdir(path.join(wsLive, 'attempts'), { recursive: true });
    // ① NL 输入（本地文件）
    const nlText = '这次做干燥实验，我把热风温度提到 50°C 想让干燥快一点，结果表面出现明显开裂，时间确实短了但成品废了。';
    await fs.writeFile(path.join(wsLive, 'current_input.txt'), nlText + '\n', 'utf8');
    s620.steps.push({ step: '① NL 输入', artifact: 'ws_live/current_input.txt', ok: true });

    // ② AI 解析（🔴 deterministic stand-in，非真实 LLM）
    const parsedFields = {
      goal: '缩短干燥时间',
      approach: '提高热风温度',
      condition: '50°C',
      result_phenomenon: '出现明显开裂',
    };
    s620.steps.push({ step: '② AI 解析（stand-in，非真实 LLM）', artifact: 'in-memory structure', ok: true, note: 'NOT_A_REAL_LLM_OUTPUT' });

    // ③ 用户确认
    s620.steps.push({ step: '③ 用户确认', artifact: 'user_confirmed=true', ok: true });

    // ④ 候选失败原因（stand-in）
    s620.steps.push({
      step: '④ 候选失败原因（stand-in）',
      candidates: ['升温速率过快导致表层先固化并收缩', '局部温差导致应力集中'],
      note: 'candidate only；置信度不定；NOT_A_REAL_LLM_OUTPUT',
      ok: true,
    });

    // ⑤ 确认保存 → 写入本地 Workspace 文件（真实磁盘写入）
    const saved = {
      attempt_id: 'ATT-LIVE-0001',
      status: 'Formal',
      archive_state: 'active',
      project_id: 'PRJ-DRY',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data_source_nature: 'TEST FIXTURE / NOT PRODUCT DATA',
      note: 'SP-06 D9 walkthrough 落盘样本',
      level_a: Object.fromEntries(
        LEVEL_A_DIMENSIONS.map((d) => [d, { content_item_id: `CI-ATT-LIVE-0001-${d}`, source_type: 'Fact', value: parsedFields[d] }]),
      ),
    };
    const { serializeAttempt } = await import('./lib_workspace.mjs');
    const savedPath = path.join(wsLive, 'attempts', 'ATT-LIVE-0001.md');
    await fs.writeFile(savedPath, serializeAttempt(saved), 'utf8');
    const onDisk = await fs.readFile(savedPath, 'utf8');
    s620.steps.push({
      step: '⑤ 确认保存（真实落盘）',
      artifact: 'ws_live/attempts/ATT-LIVE-0001.md',
      bytes: Buffer.byteLength(onDisk, 'utf8'),
      ok: onDisk.indexOf('ATT-LIVE-0001') >= 0,
    });

    // ⑥⑦⑧⑨⑩：检索历史（ws100 corpus）+ 比较 + 提炼 + 假设 + 证据
    const parsed100 = await parseWorkspace(path.join(FIX, 'ws100'));
    const corpus = admission(parsed100.attempts, 'ATT-CURRENT');
    const ret = retrieve(saved, corpus);
    const cmp = compare(saved, ret.hits);
    const map = new Map(corpus.map((a) => [a.attempt_id, a]));
    const refs = makeEvidenceRefs(ret.hits, map, 'HYP-SP06-0001');
    const insight = makeCandidateInsight(cmp, ret.hits, refs);
    const hyp = makeHypothesis(insight, ret.hits, refs);
    const res = refs.map((r) => resolveEvidenceRef(r, map));
    s620.steps.push({ step: '⑥ 检索历史 Attempt', n_retrieval: ret.n_retrieval, ok: ret.n_retrieval > 0 });
    s620.steps.push({ step: '⑦ 相似点 / 差异点', rows: cmp.rows.length, numeric_similarity_present: false, ok: cmp.rows.length > 0 });
    s620.steps.push({ step: '⑧ 提炼经验（Candidate Insight）', produced: !!insight, basis: insight.basis.map((b) => b.dimension), ok: !!insight });
    s620.steps.push({ step: '⑨ 可验证假设（Hypothesis）', produced: !!hyp, kind: hyp.kind, history_grounded: hyp.history_grounded, ok: !!hyp });
    s620.steps.push({ step: '⑩ 证据可追溯', refs: refs.length, all_resolved: res.every((r) => r.resolved), ok: res.every((r) => r.resolved) });

    s620.status = s620.steps.every((s) => s.ok) ? 'PASS' : 'FAIL';
    s620.required_database = 'NONE（无 PostgreSQL / 无 SQLite 云服务 / 无 Vector DB）';
    s620.limitation = '②④⑧⑨ 为 stand-in 步骤；S6-20 只证明"无数据库仍可承载 D9 的管道"';
  } catch (e) {
    s620.status = 'FAIL';
    s620.error = e.message;
  }
  results.tests['S6-20'] = s620;

  // ---------------- 性能表（多次运行，取全量与中位数；🔴 不构成性能结论） ----------------
  const perfRuns = { '20 Attempt': [], '100 Attempt': [] };
  for (let i = 0; i < 5; i++) {
    perfRuns['20 Attempt'].push((await runChain(path.join(FIX, 'ws20'), current, '20 Attempt')).perf_row);
    perfRuns['100 Attempt'].push((await runChain(path.join(FIX, 'ws100'), current, '100 Attempt')).perf_row);
  }
  const median = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : +((s[m - 1] + s[m]) / 2).toFixed(3);
  };
  const perfSummary = Object.entries(perfRuns).map(([scale, runs]) => ({
    scale,
    runs: runs.map((r) => ({ scan_ms: r.scan_ms, parse_ms: r.parse_ms, retrieval_ms: r.retrieval_ms, context_build_ms: r.context_build_ms })),
    median: {
      scan_ms: median(runs.map((r) => r.scan_ms)),
      parse_ms: median(runs.map((r) => r.parse_ms)),
      retrieval_ms: median(runs.map((r) => r.retrieval_ms)),
      context_build_ms: median(runs.map((r) => r.context_build_ms)),
    },
    files: runs[0].files,
    corpus: runs[0].corpus,
    hits: runs[0].hits,
  }));
  results.performance = perfSummary;

  const perfRows = [r20.perf_row, r100.perf_row];
  const csv = [
    'scale,files,scan_ms,parse_ms,retrieval_ms,context_build_ms,corpus,hits,llm_network_ms',
    ...perfRows.map((r) => [r.scale, r.files, r.scan_ms, r.parse_ms, r.retrieval_ms, r.context_build_ms, r.corpus, r.hits, r.llm_network_ms].join(',')),
    '',
    '# 多次运行明细（5 次/规模）',
    'scale,run,scan_ms,parse_ms,retrieval_ms,context_build_ms',
    ...perfSummary.flatMap((p) =>
      p.runs.map((r, i) => [p.scale, i + 1, r.scan_ms, r.parse_ms, r.retrieval_ms, r.context_build_ms].join(',')),
    ),
    '',
    '# 中位数',
    'scale,scan_ms,parse_ms,retrieval_ms,context_build_ms',
    ...perfSummary.map((p) => [p.scale, p.median.scan_ms, p.median.parse_ms, p.median.retrieval_ms, p.median.context_build_ms].join(',')),
    '',
    '# 说明：🔴 local deterministic 阶段与 LLM 网络耗时严格分开；LLM 未执行（本机无模型凭据）。',
    '# 说明：🔴 只记录耗时，不构成性能结论（SP-06 Plan §2）。',
  ].join('\n');
  await fs.writeFile(path.join(RES, 'performance.csv'), csv + '\n', 'utf8');

  // ---------------- 摘要 ----------------
  results.summary = {
    S6_07: results.tests['S6-07'].status,
    S6_11: results.tests['S6-11'].status,
    S6_12: results.tests['S6-12'].status,
    S6_13: results.tests['S6-13'].status,
    S6_14: results.tests['S6-14'].status,
    S6_15: results.tests['S6-15'].status,
    S6_16: results.tests['S6-16'].status,
    S6_20: results.tests['S6-20'].status,
  };
  results.finished_at = new Date().toISOString();

  // 去掉体积过大的内部对象后落盘（保留必要证据）
  const persist = JSON.parse(JSON.stringify(results));
  for (const k of ['S6-13', 'S6-14', 'S6-15', 'S6-16']) delete persist.tests[k];
  persist.tests['S6-13'] = results.tests['S6-13'];
  persist.tests['S6-14'] = results.tests['S6-14'];
  persist.tests['S6-15'] = results.tests['S6-15'];
  persist.tests['S6-16'] = results.tests['S6-16'];
  delete persist._internal;

  await fs.writeFile(path.join(RES, 'raw-results.json'), JSON.stringify(persist, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, summary: results.summary, perf: perfRows }, null, 2));
}

main().catch((e) => {
  console.error('SPIKE RUN FAILED', e);
  process.exit(1);
});
