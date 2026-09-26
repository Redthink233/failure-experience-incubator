/**
 * SP-06 DISPOSABLE FIXTURE GENERATOR —— DISPOSABLE / NON-PRODUCTION
 * 生成 sp06_fixture/ws20 与 ws100（synthetic Attempt；🔴 TEST FIXTURE / NOT PRODUCT DATA）
 * 运行：node tools/gen_fixture.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeAttempt, LEVEL_A_DIMENSIONS } from './lib_workspace.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SP06 = path.resolve(__dirname, '..');
const FIX = path.join(SP06, 'fixture');

const FIXTURE_TAG = 'TEST FIXTURE / NOT PRODUCT DATA';

// 当前要被处理的 Attempt（不进入历史 corpus）
const CURRENT = {
  attempt_id: 'ATT-CURRENT',
  status: 'Formal',
  archive_state: 'active',
  project_id: 'PRJ-DRY',
  created_at: '2026-09-24T09:00:00+08:00',
  updated_at: '2026-09-24T09:00:00+08:00',
  data_source_nature: FIXTURE_TAG,
  note: 'SP-06 当前 Attempt（探针输入）',
  level_a: {
    goal: { content_item_id: 'CI-ATT-CURRENT-goal', source_type: 'Fact', value: '缩短干燥时间' },
    approach: { content_item_id: 'CI-ATT-CURRENT-approach', source_type: 'Fact', value: '提高热风温度' },
    condition: { content_item_id: 'CI-ATT-CURRENT-condition', source_type: 'Fact', value: '50°C' },
    result_phenomenon: { content_item_id: 'CI-ATT-CURRENT-result', source_type: 'Fact', value: '出现明显开裂' },
  },
};

const GOALS = ['缩短干燥时间', '缩短干燥时长', '降低颜色变化', '减少能耗'];
const APPROACHES = ['提高热风温度', '提升热风温度', '提高送风温度', '降低环境湿度', '延长干燥时长'];
const CONDITIONS = ['50°C', '50 摄氏度', '70°C', null];
const RESULTS = ['出现明显开裂', '无明显开裂', '出现开裂', '颜色均匀'];

function pick(arr, i) {
  return arr[i % arr.length];
}

/** 生成 100 条确定性的合成历史 Attempt（前 20 条即 ws20 的子集） */
function gen100() {
  const out = [];
  for (let i = 0; i < 100; i++) {
    const n = i + 1;
    const id = `ATT-${String(n).padStart(4, '0')}`;
    let bucket;
    if (i < 12) bucket = 'full-match';
    else if (i < 16) bucket = 'three-of-four';
    else if (i < 20) bucket = 'unrelated';
    else if (i < 32) bucket = 'condition-unknown';
    else if (i < 47) bucket = 'one-or-two';
    else if (i < 69) bucket = 'unrelated';
    else if (i < 75) bucket = 'draft';
    else if (i < 80) bucket = 'archived';
    else bucket = 'filler';

    let status = 'Formal';
    let archive_state = 'active';
    let goal = '缩短干燥时间';
    let approach = '提高热风温度';
    let condition = '50°C';
    let result = '出现明显开裂';

    switch (bucket) {
      case 'full-match':
        goal = i % 3 === 0 ? '缩短干燥时长' : '缩短干燥时间';
        approach = i % 4 === 0 ? '提升热风温度' : '提高热风温度';
        condition = i % 3 === 0 ? '50 摄氏度' : '50°C';
        result = '出现明显开裂';
        break;
      case 'three-of-four':
        approach = '提高送风温度'; // 🔴 D-052 边界负例：compared_not_matched
        break;
      case 'condition-unknown':
        condition = null; // ⇒ uncompared（其余 3 维 matched ⇒ 仍 related）
        break;
      case 'one-or-two':
        goal = pick(['缩短干燥时长', '缩短干燥时间', '降低颜色变化'], i);
        approach = pick(['提高送风温度', '延长干燥时长'], i);
        condition = pick(['70°C', null, '50 摄氏度'], i);
        result = pick(['无明显开裂', '颜色均匀', '出现明显开裂'], i);
        break;
      case 'unrelated':
        goal = '降低颜色变化';
        approach = '降低环境湿度';
        // 🔴 刻意避免任何维度与 current 命中（含避免 "50 摄氏度" 等价改写）⇒ 真正的"未比对/不相关"负例
        condition = pick(['70°C', null], i);
        result = '颜色均匀';
        break;
      case 'draft':
        status = 'Draft'; // 🔴 不进入 N_检索（即使内容完全一致）
        break;
      case 'archived':
        archive_state = 'archived'; // 🔴 默认检索排除
        break;
      default:
        goal = pick(GOALS, i);
        approach = pick(APPROACHES, i);
        condition = pick(CONDITIONS, i);
        result = pick(RESULTS, i);
    }

    const iso = new Date(Date.UTC(2026, 7, 1 + (i % 27), 3, 0, 0)).toISOString();
    const a = {
      attempt_id: id,
      status,
      archive_state,
      project_id: i % 5 === 0 ? 'PRJ-DRY' : 'PRJ-GEN',
      created_at: iso,
      updated_at: iso,
      data_source_nature: FIXTURE_TAG,
      note: `bucket=${bucket}`,
      level_a: {},
    };
    const vals = { goal, approach, condition, result_phenomenon: result };
    for (const d of LEVEL_A_DIMENSIONS) {
      a.level_a[d] = {
        content_item_id: `CI-${id}-${d}`,
        source_type: 'Fact',
        value: vals[d],
      };
    }
    out.push(a);
  }
  return out;
}

async function writeWorkspace(root, attempts) {
  await fs.mkdir(path.join(root, 'attempts'), { recursive: true });
  await fs.mkdir(path.join(root, 'insights'), { recursive: true });
  await fs.mkdir(path.join(root, 'hypotheses'), { recursive: true });
  await fs.mkdir(path.join(root, 'evidence'), { recursive: true });
  await fs.mkdir(path.join(root, 'system'), { recursive: true });

  await fs.writeFile(
    path.join(root, 'workspace.json'),
    JSON.stringify(
      {
        workspace_id: 'WS-SP06-' + path.basename(root).toUpperCase(),
        name: 'SP-06 disposable fixture (' + path.basename(root) + ')',
        schema_version: 'sp06-probe-1',
        created_at: '2026-09-24T09:00:00+08:00',
        DATA_NATURE: FIXTURE_TAG,
        DISPOSABLE: true,
        note: '🔴 DISPOSABLE / NON-PRODUCTION。非 Demo Workspace、非产品数据；不满足也不代表 D8 / TQ10 的 Demo seed 规则。',
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  for (const a of attempts) {
    await fs.writeFile(path.join(root, 'attempts', `${a.attempt_id}.md`), serializeAttempt(a), 'utf8');
  }

  // 少量 Insight / Hypothesis / EvidenceRef fixture（🔴 仅探针用，不当 Demo seed）
  await fs.writeFile(
    path.join(root, 'insights', 'INS-SP06-0001.md'),
    `---\ninsight_id: INS-SP06-0001\nstate: accepted\ngeneration_batch: BATCH-SP06-0000\n---\n\n> 🔴 ${FIXTURE_TAG}\n\n候选经验（探针合成）：高温干燥条件下开裂现象反复出现。\n`,
    'utf8',
  );
  await fs.writeFile(
    path.join(root, 'insights', 'INS-SP06-0002.md'),
    `---\ninsight_id: INS-SP06-0002\nstate: rejected\ngeneration_batch: BATCH-SP06-0000\n---\n\n> 🔴 ${FIXTURE_TAG}\n\n被拒绝的候选经验（探针合成）。\n`,
    'utf8',
  );
  await fs.writeFile(
    path.join(root, 'hypotheses', 'HYP-SP06-0000.md'),
    `---\nhypothesis_id: HYP-SP06-0000\nkind: grounded\ndecision_state: accepted\ngeneration_batch: BATCH-SP06-0000\n---\n\n> 🔴 ${FIXTURE_TAG}\n\n（探针合成 Hypothesis；不是真实 AI 输出）\n`,
    'utf8',
  );
  await fs.writeFile(
    path.join(root, 'evidence', 'ER-0001.json'),
    JSON.stringify(
      { evidence_ref_id: 'ER-0001', target_id: 'ATT-0001', source_field_path: 'level_a.condition', role: 'grounding', owner_id: 'HYP-SP06-0000', NOTE: FIXTURE_TAG },
      null,
      2,
    ) + '\n',
    'utf8',
  );
}

async function main() {
  const all = gen100();
  await fs.mkdir(FIX, { recursive: true });
  await writeWorkspace(path.join(FIX, 'ws20'), all.slice(0, 20));
  await writeWorkspace(path.join(FIX, 'ws100'), all);

  // 当前 Attempt 单独存放（不属于历史 corpus）
  await fs.writeFile(path.join(FIX, 'current_attempt.json'), JSON.stringify(CURRENT, null, 2) + '\n', 'utf8');

  // S6-11 / S6-12 用异常样本目录
  const bad = path.join(FIX, 'ws_bad');
  await writeWorkspace(bad, all.slice(0, 6));
  await fs.writeFile(path.join(bad, 'attempts', 'ATT-BAD-json.md'), '---\nattempt_id: ATT-BAD-json\nstatus: Formal\ndata_source_nature: ' + FIXTURE_TAG + '\n---\n\n<!-- sp06:levelA:begin -->\n{ "goal": { "content_item_id": "x", } BROKEN JSON\n<!-- sp06:levelA:end -->\n', 'utf8');
  await fs.writeFile(path.join(bad, 'attempts', 'ATT-BAD-truncated.md'), '---\nattempt_id: ATT-BAD-truncated\nstatus: Formal\n---\n\n# 截断的 Markdown（无 levelA 区块）\n', 'utf8');

  const counts = { ws20: 20, ws100: 100, ws_bad: 8 };
  console.log(JSON.stringify({ ok: true, fixture: FIX, counts }));
}

main().catch((e) => {
  console.error('FIXTURE GENERATION FAILED', e);
  process.exit(1);
});
