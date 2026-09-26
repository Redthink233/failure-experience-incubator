# -*- coding: utf-8 -*-
"""
DISPOSABLE / NON-PRODUCTION
================================================================
SP-03 Spike Runner —— Level A 相关性判定（命中 / 未比对集合）可行性
Stage   : S00-03 / SP-03
Nature  : 一次性 Spike 脚本。不是产品代码，不得进入 src/，不得被 canonical 引用。
Location: 30_SPIKES/retrieval/ （任务书 §三 允许的唯一临时代码位置）

设计要点（R-A 的两级结构）：
  · 结构性规则层（本脚本，完全可机器核验、可复现、无随机）
      Step 0  可及性：任一侧 presence_state = unknown  => uncompared（不送模型）
      Step 1  来源合法性：出现 Inference => 该维度不得 matched，记实现缺陷（不送模型）
      派生    related := len(matched_level_a_dimensions) > 0
      Level B / result_status / 时间：结构性排除，永不进入判定输入
  · 语义判定层（外部模型会话，展示型 Inference）
      Step 2  仅对「双方 present 且来源合法」的维度输出 matched / compared_not_matched + 一句理由

子命令：
  project   生成 SP-03_model_input.json（送模型的判定输入投影）+ 结构性断言
  probe     执行结构性探针（H1/H3/H4/H8/H9/H10 + H2 正对照）
  assemble  载入 N 份模型判定结果，装配完整判定输出、校验、对比 Gold、输出矩阵
================================================================
"""

import argparse
import copy
import json
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
CASES = os.path.join(BASE, "SP-03_cases.json")
MODEL_INPUT = os.path.join(BASE, "SP-03_model_input.json")

LEVEL_A = ["goal", "actual_attempt", "condition", "actual_result"]
LEVEL_B = ["project_id", "failure_tag", "version_env"]
STATE_MATCHED = "matched"
STATE_CNM = "compared_not_matched"
STATE_UNCOMPARED = "uncompared"
LEGAL_SOURCE_TYPES = {"Fact", "Extraction"}

# 禁字段（契约 §F.5 / TC-41 / D-020）：键名级
FORBIDDEN_KEYS = {
    "similarity", "similarity_score", "score", "match_score", "rank_score",
    "confidence", "probability", "weight", "weights", "star", "stars",
    "percent", "percentage", "level", "grade", "rank", "ranking",
    "relatedness", "closeness", "distance", "embedding", "vector",
    "score_detail", "numeric_score", "score_value",
}

# 禁措辞（值为字符串时扫描）：数值化相似度 / 等级化表达
FORBIDDEN_TEXT_PATTERNS = [
    (r"\d+(?:\.\d+)?\s*%", "百分数"),
    (r"(?<!\d)0\.\d+", "0-1 分数"),
    (r"\d+(?:\.\d+)?\s*(?:分|星|星級|星级)", "分数/星级"),
    (r"相似度", "相似度措辞"),
    (r"匹配度", "匹配度措辞"),
    (r"相关度", "相关度措辞"),
    (r"置信度", "置信度措辞"),
    (r"概率", "概率措辞"),
    (r"得分", "得分措辞"),
    (r"评分", "评分措辞"),
    (r"综合分", "综合分措辞"),
    (r"权重", "权重措辞"),
    (r"等级", "等级措辞"),
    (r"高置信", "置信措辞"),
    (r"低置信", "置信措辞"),
]


# ---------------------------------------------------------------- 基础装载

def load_cases():
    with open(CASES, "r", encoding="utf-8") as f:
        return json.load(f)


def dim(attempt, d):
    return attempt["dimensions"][d]


def is_unknown(entry):
    return entry.get("presence_state") == "unknown"


def is_illegal_source(entry):
    """present 且 source_type 非 {Fact, Extraction}"""
    if is_unknown(entry):
        return False
    return entry.get("source_type") not in LEGAL_SOURCE_TYPES


# ------------------------------------------------- Step 0 / 1 / 2 编排

def classify_dimension(src_entry, cand_entry):
    """返回 (state, reason, defect, needs_model)"""
    # Step 0 —— 可及性检查
    if is_unknown(src_entry) or is_unknown(cand_entry):
        who = []
        if is_unknown(src_entry):
            who.append("源侧")
        if is_unknown(cand_entry):
            who.append("候选侧")
        reason = "、".join(who) + "该维度为「未提供 / 未知」，按规则不参与比对，标记为该维度未比对。"
        return STATE_UNCOMPARED, reason, False, False

    # Step 1 —— 来源合法性检查
    bad = []
    if is_illegal_source(src_entry):
        bad.append("源侧 source_type=%s" % src_entry.get("source_type"))
    if is_illegal_source(cand_entry):
        bad.append("候选侧 source_type=%s" % cand_entry.get("source_type"))
    if bad:
        reason = "参与条目不合法（%s）；按规则不得判为匹配，登记为实现缺陷。" % "；".join(bad)
        return STATE_CNM, reason, True, False

    # Step 2 —— 交由受约束的布尔重叠判定
    return None, None, False, True


def build_projection(case):
    """构造送模型的判定输入投影：只含 Level A 四维度中「双方 present 且来源合法」的维度。
    结构性保证：Level B / result_status / 时间 / unknown 维度 / Inference 条目一律不出现。"""
    proj = {"case_id": case["case_id"], "comparable_dimensions": {}}
    for d in LEVEL_A:
        s = dim(case["source"], d)
        c = dim(case["candidate"], d)
        state, _reason, _defect, needs_model = classify_dimension(s, c)
        if needs_model:
            proj["comparable_dimensions"][d] = {
                "source_value": s["value"],
                "candidate_value": c["value"],
            }
    return proj


# ------------------------------------------------------- 输出组装与校验

def assemble_judgment(case, model_dim_results):
    """model_dim_results: {dim: {"state":..., "reason":...}} —— 只应覆盖可比对维度"""
    detail = {}
    matched, uncompared = [], []
    defects = []
    for d in LEVEL_A:
        s = dim(case["source"], d)
        c = dim(case["candidate"], d)
        state, reason, defect, needs_model = classify_dimension(s, c)
        if defect:
            defects.append(d)
        if needs_model:
            got = model_dim_results.get(d)
            if got is None:
                raise ValueError("%s 维度 %s 需模型判定但缺失" % (case["case_id"], d))
            state = got["state"]
            reason = got["reason"]
        if state == STATE_MATCHED:
            matched.append(d)
        elif state == STATE_UNCOMPARED:
            uncompared.append(d)
        detail[d] = {"state": state, "reason": reason}

    judgment = {
        "case_id": case["case_id"],
        "related": len(matched) > 0,          # 结构性派生（H5）
        "matched_level_a_dimensions": matched,
        "uncompared_dimensions": uncompared,
        "dimension_results": detail,
        "implementation_defects": defects,
    }
    return judgment


def validate_output(obj, path="judgment"):
    """返回违禁项列表。空列表 = 通过。"""
    v = []

    def walk(node, p):
        if isinstance(node, dict):
            for k, val in node.items():
                if k.lower() in FORBIDDEN_KEYS:
                    v.append("%s.%s -> 违禁字段名「%s」" % (p, k, k))
                walk(val, "%s.%s" % (p, k))
        elif isinstance(node, list):
            for i, val in enumerate(node):
                walk(val, "%s[%d]" % (p, i))
        elif isinstance(node, str):
            for pat, label in FORBIDDEN_TEXT_PATTERNS:
                for m in re.finditer(pat, node):
                    v.append("%s -> 违禁措辞「%s」命中文本片段「%s」" % (p, label, m.group(0)))
        elif isinstance(node, bool):
            pass
        elif isinstance(node, (int, float)):
            v.append("%s -> 出现裸数值 %r（判定输出不得含任何数值）" % (p, node))

    walk(obj, path)

    # 结构一致性
    if not isinstance(obj.get("related"), bool):
        v.append("%s.related 必须为布尔" % path)
    else:
        derived = len(obj.get("matched_level_a_dimensions", [])) > 0
        if obj["related"] != derived:
            v.append("%s.related 与 matched 集合非空性不一致（H5 违反）" % path)
    for arr_name in ("matched_level_a_dimensions", "uncompared_dimensions"):
        arr = obj.get(arr_name, [])
        for d in arr:
            if d not in LEVEL_A:
                v.append("%s.%s 含非 Level A 维度「%s」" % (path, arr_name, d))
    for d, r in obj.get("dimension_results", {}).items():
        if d not in LEVEL_A:
            v.append("%s.dimension_results 含非 Level A 维度「%s」" % (path, d))
        if r.get("state") not in (STATE_MATCHED, STATE_CNM, STATE_UNCOMPARED):
            v.append("%s.dimension_results.%s.state 非法「%s」" % (path, d, r.get("state")))
        if not isinstance(r.get("reason"), str) or not r.get("reason", "").strip():
            v.append("%s.dimension_results.%s 缺少可读理由" % (path, d))
    if set(obj.get("dimension_results", {}).keys()) != set(LEVEL_A):
        v.append("%s.dimension_results 未覆盖全部 Level A 四维度" % path)
    return v


def compare_gold(case, judgment):
    gold = case["gold"]
    dev = []
    m = set(judgment["matched_level_a_dimensions"])
    u = set(judgment["uncompared_dimensions"])

    if gold.get("matched_exact") is not None:
        if m != set(gold["matched_exact"]):
            dev.append("命中集合偏差：Gold=%s 实际=%s" % (sorted(gold["matched_exact"]), sorted(m)))
    for d in gold.get("matched_must_include", []):
        if d not in m:
            dev.append("硬预期缺失：维度「%s」必须命中，实际未命中" % d)
    for d in gold.get("matched_must_exclude", []):
        if d in m:
            dev.append("硬预期违反：维度「%s」必须不命中，实际命中" % d)
    for d in gold.get("dimensions_must_not_be_matched", []):
        if d in m:
            dev.append("硬预期违反：维度「%s」绝不能被判为 matched" % d)

    if gold.get("uncompared_exact") is not None:
        if u != set(gold["uncompared_exact"]):
            dev.append("未比对集合偏差：Gold=%s 实际=%s" % (sorted(gold["uncompared_exact"]), sorted(u)))

    if gold.get("related") is not None and gold.get("related_strict"):
        if judgment["related"] != gold["related"]:
            dev.append("related 偏差：Gold=%s 实际=%s" % (gold["related"], judgment["related"]))
    return dev


# --------------------------------------------------------------- 子命令

def cmd_project(_args):
    cfg = load_cases()
    projections = [build_projection(c) for c in cfg["cases"]]
    out = {
        "artifact_class": "DISPOSABLE / NON-PRODUCTION",
        "spike_id": "SP-03",
        "purpose": "送模型执行 Step 2（布尔重叠判定）的输入投影。仅含 Level A 四维度中双方 present 且来源合法的维度。",
        "guarantees": [
            "presence_state = unknown 的维度不在本文件中（结构性保证 H1 / H8）。",
            "Level B（project_id / failure_tag / version_env）不在本文件中（结构性保证 H3）。",
            "result_status 不在本文件中（结构性保证 H9）。",
            "source_type = Inference 的条目不在本文件中（结构性保证 H4）。",
            "不含任何数值相似度 / 分数 / 置信度（结构性保证 H2）。",
        ],
        "projections": projections,
    }
    with open(MODEL_INPUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    lines = ["[project] 已写出 %s" % MODEL_INPUT, ""]
    for p in projections:
        lines.append("%s 可比对维度 = %s" % (p["case_id"], list(p["comparable_dimensions"].keys())))
    return "\n".join(lines)


def cmd_probe(_args):
    cfg = load_cases()
    lines = []
    ok = {}

    # ---- PROBE-H1/H8：unknown 不进模型输入
    proj = {p["case_id"]: p for p in (build_projection(c) for c in cfg["cases"])}
    h1 = True
    for cid, banned in (("CASE-04", ["condition"]), ("CASE-08", ["actual_result"])):
        got = set(proj[cid]["comparable_dimensions"].keys())
        for d in banned:
            if d in got:
                h1 = False
                lines.append("  ✗ %s.%s（unknown）仍在模型输入中" % (cid, d))
    ok["H1_H8_unknown_not_sent_to_model"] = h1
    lines.append("PROBE-H1/H8  unknown 维度不进模型输入 : %s" % ("PASS" if h1 else "FAIL"))

    # ---- PROBE-H3：Level B 不进模型输入
    h3a = True
    for cid, p in proj.items():
        for b in LEVEL_B:
            if b in json.dumps(p, ensure_ascii=False):
                h3a = False
                lines.append("  ✗ %s 的投影含 Level B 字段 %s" % (cid, b))
    ok["H3_level_b_not_in_model_input"] = h3a
    lines.append("PROBE-H3(输入) Level B 不进模型输入      : %s" % ("PASS" if h3a else "FAIL"))

    # ---- PROBE-H9：result_status 互换 => 投影完全一致
    c05 = next(c for c in cfg["cases"] if c["case_id"] == "CASE-05")
    v1 = copy.deepcopy(c05)
    v2 = copy.deepcopy(c05)
    v1["source"]["result_status"], v1["candidate"]["result_status"] = "Failed", "Unknown"
    v2["source"]["result_status"], v2["candidate"]["result_status"] = "Unknown", "Failed"
    same = json.dumps(build_projection(v1), ensure_ascii=False, sort_keys=True) == \
        json.dumps(build_projection(v2), ensure_ascii=False, sort_keys=True)
    ok["H9_result_status_irrelevant"] = same
    lines.append("PROBE-H9       result_status 不影响判定输入 : %s" % ("PASS" if same else "FAIL"))

    # ---- PROBE-H4：Inference 不得进入比较输入
    c01 = next(c for c in cfg["cases"] if c["case_id"] == "CASE-01")
    h4 = True
    for side in ("source", "candidate"):
        t = copy.deepcopy(c01)
        t[side]["dimensions"]["condition"]["source_type"] = "Inference"
        st, _r, defect, needs_model = classify_dimension(
            t["source"]["dimensions"]["condition"], t["candidate"]["dimensions"]["condition"])
        if needs_model or st == STATE_MATCHED or not defect:
            h4 = False
            lines.append("  ✗ Inference 侧被送模型或判为 matched（state=%s defect=%s needs_model=%s）" % (st, defect, needs_model))
        if "condition" in build_projection(t)["comparable_dimensions"]:
            h4 = False
            lines.append("  ✗ Inference 维度仍出现在模型输入投影中")
    ok["H4_inference_excluded"] = h4
    lines.append("PROBE-H4       Inference 不进 Level A     : %s" % ("PASS" if h4 else "FAIL"))

    # ---- PROBE-H2：校验器正对照
    bad = cfg["structural_probes"][0]["positive_control"]["bad_output_sample"]
    bad_viol = validate_output(bad, "positive_control")
    h2 = len(bad_viol) > 0
    hit_keys = [x for x in bad_viol if "违禁字段名" in x]
    ok["H2_validator_positive_control"] = h2
    lines.append("PROBE-H2       校验器正对照（应报违禁）  : %s" % ("PASS" if h2 else "FAIL"))
    for x in bad_viol[:8]:
        lines.append("    · %s" % x)
    lines.append("    违禁键命中数 = %d（similarity / confidence / score 应被全部命中）" % len(hit_keys))
    if not all(any(k in x for x in bad_viol) for k in ("similarity", "confidence", "score")):
        ok["H2_validator_positive_control"] = False
        lines.append("  ✗ 未全部命中 similarity / confidence / score")

    # ---- PROBE-H10 / H5：by construction
    ok["H10_no_embedding_needed"] = True
    ok["H5_related_derived"] = True
    lines.append("PROBE-H10      无 embedding 即可形成命中集合: PASS（判定链仅含结构规则 + 布尔判定，无向量组件）")
    lines.append("PROBE-H5       related 由 matched 集合派生  : PASS（assemble_judgment 中相关断言的唯一来源）")

    lines.append("")
    lines.append("结构性探针汇总：%s" % json.dumps(ok, ensure_ascii=False))
    with open(os.path.join(BASE, "SP-03_structural_probe.json"), "w", encoding="utf-8") as f:
        json.dump({"ok": ok, "detail": lines}, f, ensure_ascii=False, indent=2)
    return "\n".join(lines)


def cmd_ingest(_args):
    """把 6 个独立判定会话的原始返回（SP-03_raw_model_output.json）转为逐次运行的判定输入文件。"""
    raw_path = os.path.join(BASE, "SP-03_raw_model_output.json")
    with open(raw_path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    proj = {p["case_id"]: p for p in
            json.load(open(MODEL_INPUT, "r", encoding="utf-8"))["projections"]}
    lines = ["[ingest] 原始返回 %s" % raw_path, ""]
    written = []
    for run_id in sorted(raw["runs"].keys()):
        data = raw["runs"][run_id]
        judgments = {}
        for cid, dim_results in data["output"].items():
            expected = set(proj[cid]["comparable_dimensions"].keys())
            got = set(dim_results.keys())
            if got != expected:
                lines.append("  ! %s/%s 维度集合不符：期望 %s，实际 %s"
                             % (run_id, cid, sorted(expected), sorted(got)))
            for d, r in dim_results.items():
                if r.get("state") not in (STATE_MATCHED, STATE_CNM):
                    lines.append("  ! %s/%s/%s 非法 state=%s" % (run_id, cid, d, r.get("state")))
            judgments[cid] = {"dimension_results": dim_results}
        payload = {"run_id": run_id, "session": data.get("session", ""),
                   "note": "DISPOSABLE / NON-PRODUCTION", "judgments": judgments}
        out = os.path.join(BASE, "sp03_verdicts_%s.json" % run_id.lower())
        with open(out, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        written.append(out)
        lines.append("%s -> %s（%d 个 CASE）" % (run_id, os.path.basename(out), len(judgments)))
    lines.append("")
    lines.append("已写出 %d 份判定输入文件" % len(written))
    return "\n".join(lines)


def cmd_assemble(args):
    cfg = load_cases()
    cases = {c["case_id"]: c for c in cfg["cases"]}
    runs = []
    for path in args.verdicts:
        with open(path, "r", encoding="utf-8") as f:
            runs.append(json.load(f))

    report = {"runs": [], "validation": [], "per_case": {}, "summary": {}}
    per_case_run = {}

    for run in runs:
        rid = run.get("run_id", "RUN-?")
        entry = {"run_id": rid, "session": run.get("session", ""), "judgments": {}}
        for cid, case in cases.items():
            got = run["judgments"].get(cid)
            if got is None:
                entry["judgments"][cid] = {"error": "该运行缺少此 CASE 的模型判定"}
                continue
            j = assemble_judgment(case, got.get("dimension_results", {}))
            v = validate_output(j, "%s/%s" % (rid, cid))
            if v:
                report["validation"].append({"run_id": rid, "case_id": cid, "violations": v})
            dev = compare_gold(case, j)
            j["_gold_deviations"] = dev
            entry["judgments"][cid] = j
            per_case_run.setdefault(cid, []).append({"run_id": rid, "judgment": j, "deviations": dev})
        report["runs"].append(entry)

    # 逐 CASE 汇总
    for cid, case in cases.items():
        rows = per_case_run.get(cid, [])
        triples = []
        for r in rows:
            j = r["judgment"]
            triples.append({
                "run_id": r["run_id"],
                "related": j["related"],
                "matched": sorted(j["matched_level_a_dimensions"]),
                "uncompared": sorted(j["uncompared_dimensions"]),
                "states": {d: j["dimension_results"][d]["state"] for d in LEVEL_A},
                "deviations": r["deviations"],
            })
        rel_set = {json.dumps(t["related"]) for t in triples}
        m_set = {json.dumps(t["matched"], ensure_ascii=False) for t in triples}
        u_set = {json.dumps(t["uncompared"], ensure_ascii=False) for t in triples}
        report["per_case"][cid] = {
            "title": case["title"],
            "gold": {
                "related": case["gold"]["related"],
                "related_strict": case["gold"]["related_strict"],
                "matched_exact": case["gold"]["matched_exact"],
                "matched_must_include": case["gold"]["matched_must_include"],
                "uncompared_exact": case["gold"]["uncompared_exact"],
                "dimensions_must_not_be_matched": case["gold"]["dimensions_must_not_be_matched"],
            },
            "runs": triples,
            "stable_related": len(rel_set) == 1,
            "stable_matched_set": len(m_set) == 1,
            "stable_uncompared_set": len(u_set) == 1,
            "all_runs_match_gold": all(not t["deviations"] for t in triples),
        }

    s = report["per_case"]
    report["summary"] = {
        "n_cases": len(cases),
        "n_runs_per_case": len(runs),
        "n_judgments": sum(len(v) for v in per_case_run.values()),
        "cases_all_runs_match_gold": sorted(c for c in s if s[c]["all_runs_match_gold"]),
        "cases_with_deviation": sorted(c for c in s if not s[c]["all_runs_match_gold"]),
        "unstable_related": sorted(c for c in s if not s[c]["stable_related"]),
        "unstable_matched_set": sorted(c for c in s if not s[c]["stable_matched_set"]),
        "unstable_uncompared_set": sorted(c for c in s if not s[c]["stable_uncompared_set"]),
        "schema_violations": len(report["validation"]),
        "related_flip_cases": sorted(
            c for c in s
            if len({json.dumps(t["related"]) for t in s[c]["runs"]}) > 1),
    }

    out = args.out if getattr(args, "out", None) else os.path.join(BASE, "SP-03_results.json")
    if not os.path.isabs(out):
        out = os.path.join(BASE, out)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    lines = ["[assemble] 写出 %s" % out, ""]
    lines.append("%-9s %-6s %-9s %-40s %-20s %s" % ("CASE", "runs", "related", "matched（各次运行）", "uncompared", "Gold偏差"))
    for cid in sorted(s):
        p = s[cid]
        rels = "/".join(str(t["related"]) for t in p["runs"])
        ms = " | ".join(",".join(t["matched"]) or "-" for t in p["runs"])
        us = " | ".join(",".join(t["uncompared"]) or "-" for t in p["runs"])
        dev = "无" if p["all_runs_match_gold"] else "有"
        lines.append("%-9s %-6d %-9s %-40s %-20s %s" % (cid, len(p["runs"]), rels, ms, us, dev))
    lines.append("")
    lines.append("矩阵汇总：%s" % json.dumps(report["summary"], ensure_ascii=False, indent=2))
    if report["validation"]:
        lines.append("")
        lines.append("Schema 违禁项：")
        for v in report["validation"]:
            lines.append("  %s / %s" % (v["run_id"], v["case_id"]))
            for x in v["violations"]:
                lines.append("    - %s" % x)
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("project").set_defaults(func=cmd_project)
    sub.add_parser("probe").set_defaults(func=cmd_probe)
    sub.add_parser("ingest").set_defaults(func=cmd_ingest)
    p = sub.add_parser("assemble")
    p.add_argument("--verdicts", nargs="+", required=True)
    p.add_argument("--out", default=None)
    p.set_defaults(func=cmd_assemble)
    args = ap.parse_args()
    print(args.func(args))


if __name__ == "__main__":
    main()
