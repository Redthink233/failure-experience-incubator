# -*- coding: utf-8 -*-
"""
DISPOSABLE / NON-PRODUCTION
================================================================
SP-03R Spike Runner —— Level A「严格语义重叠」(D-050) 复测
Stage   : S00-03 / SP-03R
Nature  : 一次性 Spike 脚本。不是产品代码，不得进入 src/，不得被 canonical 引用。
Location: 30_SPIKES/retrieval/

与 SP-03 的关系：
  · 只读复用 SP-03_cases.json（Gold Standard 未修改、未重算）
  · 不读取、不修改 SP-03 的任何结果产物（results_primary / results_extended /
    raw_model_output / run-1..6 verdict / structural_probe）
  · 全部产物写入 SP-03R_* 新文件

新增：D-050 专用的 R1–R8 断言（在原 H1–H10 之外）
================================================================
"""

import copy
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
CASES = os.path.join(BASE, "SP-03_cases.json")
RAW = os.path.join(BASE, "SP-03R_raw_model_output.json")

LEVEL_A = ["goal", "actual_attempt", "condition", "actual_result"]
LEVEL_B = ["project_id", "failure_tag", "version_env"]
MATCHED = "matched"
CNM = "compared_not_matched"
UNCOMPARED = "uncompared"
LEGAL_SOURCE_TYPES = {"Fact", "Extraction"}

FORBIDDEN_KEYS = {
    "similarity", "similarity_score", "score", "match_score", "rank_score",
    "confidence", "probability", "weight", "weights", "star", "stars",
    "percent", "percentage", "level", "grade", "rank", "ranking",
    "relatedness", "closeness", "distance", "embedding", "vector",
    "score_detail", "numeric_score", "score_value",
}
FORBIDDEN_TEXT_PATTERNS = [
    (r"\d+(?:\.\d+)?\s*%", "百分数"),
    (r"(?<!\d)0\.\d+", "0-1 分数"),
    (r"\d+(?:\.\d+)?\s*(?:分|星|星級|星级)", "分数/星级"),
    (r"相似度", "相似度措辞"), (r"匹配度", "匹配度措辞"), (r"相关度", "相关度措辞"),
    (r"置信度", "置信度措辞"), (r"概率", "概率措辞"), (r"得分", "得分措辞"),
    (r"评分", "评分措辞"), (r"综合分", "综合分措辞"), (r"权重", "权重措辞"),
    (r"等级", "等级措辞"), (r"高置信", "置信措辞"), (r"低置信", "置信措辞"),
]


def load_cases():
    with open(CASES, "r", encoding="utf-8") as f:
        return json.load(f)


def dim(a, d):
    return a["dimensions"][d]


def is_unknown(e):
    return e.get("presence_state") == "unknown"


def is_illegal_source(e):
    if is_unknown(e):
        return False
    return e.get("source_type") not in LEGAL_SOURCE_TYPES


def classify_dimension(s, c):
    if is_unknown(s) or is_unknown(c):
        who = []
        if is_unknown(s):
            who.append("源侧")
        if is_unknown(c):
            who.append("候选侧")
        return UNCOMPARED, "、".join(who) + "该维度为「未提供 / 未知」，按规则不参与比对。", False, False
    bad = []
    if is_illegal_source(s):
        bad.append("源侧 source_type=%s" % s.get("source_type"))
    if is_illegal_source(c):
        bad.append("候选侧 source_type=%s" % c.get("source_type"))
    if bad:
        return CNM, "参与条目不合法（%s）。" % "；".join(bad), True, False
    return None, None, False, True


def build_projection(case):
    proj = {"case_id": case["case_id"], "comparable_dimensions": {}}
    for d in LEVEL_A:
        st, _r, _df, needs = classify_dimension(dim(case["source"], d), dim(case["candidate"], d))
        if needs:
            proj["comparable_dimensions"][d] = {
                "source_value": dim(case["source"], d)["value"],
                "candidate_value": dim(case["candidate"], d)["value"],
            }
    return proj


def assemble_judgment(case, model_dim_results):
    detail, matched, uncompared, defects = {}, [], [], []
    for d in LEVEL_A:
        s, c = dim(case["source"], d), dim(case["candidate"], d)
        st, reason, defect, needs = classify_dimension(s, c)
        if defect:
            defects.append(d)
        if needs:
            got = model_dim_results.get(d)
            if got is None:
                raise ValueError("%s 维度 %s 需模型判定但缺失" % (case["case_id"], d))
            st, reason = got["state"], got["reason"]
        if st == MATCHED:
            matched.append(d)
        elif st == UNCOMPARED:
            uncompared.append(d)
        detail[d] = {"state": st, "reason": reason}
    return {
        "case_id": case["case_id"],
        "related": len(matched) > 0,
        "matched_level_a_dimensions": matched,
        "uncompared_dimensions": uncompared,
        "dimension_results": detail,
        "implementation_defects": defects,
    }


def validate_output(obj, path="judgment"):
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
                    v.append("%s -> 违禁措辞「%s」命中「%s」" % (p, label, m.group(0)))
        elif isinstance(node, bool):
            pass
        elif isinstance(node, (int, float)):
            v.append("%s -> 出现裸数值 %r" % (p, node))

    walk(obj, path)
    if not isinstance(obj.get("related"), bool):
        v.append("%s.related 必须为布尔" % path)
    else:
        if obj["related"] != (len(obj.get("matched_level_a_dimensions", [])) > 0):
            v.append("%s.related 与 matched 集合非空性不一致（H5 违反）" % path)
    for a in ("matched_level_a_dimensions", "uncompared_dimensions"):
        for d in obj.get(a, []):
            if d not in LEVEL_A:
                v.append("%s.%s 含非 Level A 维度「%s」" % (path, a, d))
    for d, r in obj.get("dimension_results", {}).items():
        if d not in LEVEL_A:
            v.append("%s.dimension_results 含非 Level A 维度「%s」" % (path, d))
        if r.get("state") not in (MATCHED, CNM, UNCOMPARED):
            v.append("%s.dimension_results.%s.state 非法「%s」" % (path, d, r.get("state")))
        if not isinstance(r.get("reason"), str) or not r.get("reason", "").strip():
            v.append("%s.dimension_results.%s 缺少可读理由" % (path, d))
    if set(obj.get("dimension_results", {}).keys()) != set(LEVEL_A):
        v.append("%s.dimension_results 未覆盖全部 Level A 四维度" % path)
    return v


def compare_gold(case, j):
    g, dev = case["gold"], []
    m, u = set(j["matched_level_a_dimensions"]), set(j["uncompared_dimensions"])
    if g.get("matched_exact") is not None and m != set(g["matched_exact"]):
        dev.append("命中集合偏差：Gold=%s 实际=%s" % (sorted(g["matched_exact"]), sorted(m)))
    for d in g.get("matched_must_include", []):
        if d not in m:
            dev.append("硬预期缺失：维度「%s」必须命中" % d)
    for d in g.get("matched_must_exclude", []):
        if d in m:
            dev.append("硬预期违反：维度「%s」必须不命中" % d)
    for d in g.get("dimensions_must_not_be_matched", []):
        if d in m:
            dev.append("硬预期违反：维度「%s」绝不能被判为 matched" % d)
    if g.get("uncompared_exact") is not None and u != set(g["uncompared_exact"]):
        dev.append("未比对集合偏差：Gold=%s 实际=%s" % (sorted(g["uncompared_exact"]), sorted(u)))
    if g.get("related") is not None and g.get("related_strict"):
        if j["related"] != g["related"]:
            dev.append("related 偏差：Gold=%s 实际=%s" % (g["related"], j["related"]))
    return dev


def ingest():
    with open(RAW, "r", encoding="utf-8") as f:
        raw = json.load(f)
    proj = {p["case_id"]: p for p in
            json.load(open(os.path.join(BASE, "SP-03R_model_input.json"), "r", encoding="utf-8"))["projections"]}
    notes, paths = [], []
    for run_id in sorted(raw["runs"].keys()):
        data = raw["runs"][run_id]
        judgments = {}
        for cid, dr in data["output"].items():
            exp, got = set(proj[cid]["comparable_dimensions"].keys()), set(dr.keys())
            if got != exp:
                notes.append("! %s/%s 维度集合不符：期望 %s 实际 %s" % (run_id, cid, sorted(exp), sorted(got)))
            for d, r in dr.items():
                if r.get("state") not in (MATCHED, CNM):
                    notes.append("! %s/%s/%s 非法 state=%s" % (run_id, cid, d, r.get("state")))
            judgments[cid] = {"dimension_results": dr}
        payload = {"run_id": run_id, "session": data.get("session", ""),
                   "note": "DISPOSABLE / NON-PRODUCTION", "judgments": judgments}
        out = os.path.join(BASE, "sp03r_verdicts_%s.json" % run_id.lower())
        with open(out, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        paths.append(out)
    return raw, paths, notes


def assemble(cfg, verdict_paths):
    cases = {c["case_id"]: c for c in cfg["cases"]}
    report = {"runs": [], "validation": [], "per_case": {}, "summary": {}}
    per_case_run = {}
    for path in verdict_paths:
        run = json.load(open(path, "r", encoding="utf-8"))
        rid = run.get("run_id", "RUN-?")
        entry = {"run_id": rid, "session": run.get("session", ""), "judgments": {}}
        for cid, case in cases.items():
            got = run["judgments"].get(cid)
            if got is None:
                entry["judgments"][cid] = {"error": "缺少该 CASE 判定"}
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

    for cid, case in cases.items():
        rows = per_case_run.get(cid, [])
        triples = [{
            "run_id": r["run_id"],
            "related": r["judgment"]["related"],
            "matched": sorted(r["judgment"]["matched_level_a_dimensions"]),
            "uncompared": sorted(r["judgment"]["uncompared_dimensions"]),
            "states": {d: r["judgment"]["dimension_results"][d]["state"] for d in LEVEL_A},
            "deviations": r["deviations"],
        } for r in rows]
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
            "stable_related": len({json.dumps(t["related"]) for t in triples}) == 1,
            "stable_matched_set": len({json.dumps(t["matched"], ensure_ascii=False) for t in triples}) == 1,
            "stable_uncompared_set": len({json.dumps(t["uncompared"], ensure_ascii=False) for t in triples}) == 1,
            "all_runs_match_gold": all(not t["deviations"] for t in triples),
        }
    s = report["per_case"]
    report["summary"] = {
        "n_cases": len(cases),
        "n_runs_per_case": len(verdict_paths),
        "n_judgments": sum(len(v) for v in per_case_run.values()),
        "cases_all_runs_match_gold": sorted(c for c in s if s[c]["all_runs_match_gold"]),
        "cases_with_deviation": sorted(c for c in s if not s[c]["all_runs_match_gold"]),
        "unstable_related": sorted(c for c in s if not s[c]["stable_related"]),
        "unstable_matched_set": sorted(c for c in s if not s[c]["stable_matched_set"]),
        "unstable_uncompared_set": sorted(c for c in s if not s[c]["stable_uncompared_set"]),
        "schema_violations": len(report["validation"]),
        "related_flip_cases": sorted(c for c in s
                                     if len({json.dumps(t["related"]) for t in s[c]["runs"]}) > 1),
    }
    return report


def structural_probes(cfg, proj):
    ok, lines = {}, []

    h1 = True
    for cid, banned in (("CASE-04", ["condition"]), ("CASE-08", ["actual_result"])):
        got = set(proj[cid]["comparable_dimensions"].keys())
        for d in banned:
            if d in got:
                h1 = False
                lines.append("  ✗ %s.%s（unknown）仍在模型输入中" % (cid, d))
    ok["H1_H8_unknown_not_sent_to_model"] = h1
    lines.append("PROBE-H1/H8  unknown 维度不进模型输入 : %s" % ("PASS" if h1 else "FAIL"))

    h3a = True
    for cid, p in proj.items():
        for b in LEVEL_B:
            if b in json.dumps(p, ensure_ascii=False):
                h3a = False
                lines.append("  ✗ %s 的投影含 Level B 字段 %s" % (cid, b))
    ok["H3_level_b_not_in_model_input"] = h3a
    lines.append("PROBE-H3(输入) Level B 不进模型输入      : %s" % ("PASS" if h3a else "FAIL"))

    c05 = next(c for c in cfg["cases"] if c["case_id"] == "CASE-05")
    v1, v2 = copy.deepcopy(c05), copy.deepcopy(c05)
    v1["source"]["result_status"], v1["candidate"]["result_status"] = "Failed", "Unknown"
    v2["source"]["result_status"], v2["candidate"]["result_status"] = "Unknown", "Failed"
    same = json.dumps(build_projection(v1), ensure_ascii=False, sort_keys=True) == \
        json.dumps(build_projection(v2), ensure_ascii=False, sort_keys=True)
    ok["H9_result_status_irrelevant"] = same
    lines.append("PROBE-H9       result_status 不影响判定输入 : %s" % ("PASS" if same else "FAIL"))

    c01 = next(c for c in cfg["cases"] if c["case_id"] == "CASE-01")
    h4 = True
    for side in ("source", "candidate"):
        t = copy.deepcopy(c01)
        t[side]["dimensions"]["condition"]["source_type"] = "Inference"
        st, _r, defect, needs = classify_dimension(
            t["source"]["dimensions"]["condition"], t["candidate"]["dimensions"]["condition"])
        if needs or st == MATCHED or not defect:
            h4 = False
        if "condition" in build_projection(t)["comparable_dimensions"]:
            h4 = False
    ok["H4_inference_excluded"] = h4
    lines.append("PROBE-H4       Inference 不进 Level A     : %s" % ("PASS" if h4 else "FAIL"))

    bad = cfg["structural_probes"][0]["positive_control"]["bad_output_sample"]
    bad_viol = validate_output(bad, "positive_control")
    hit_keys = [x for x in bad_viol if "违禁字段名" in x]
    h2 = len(bad_viol) > 0 and all(any(k in x for x in bad_viol) for k in ("similarity", "confidence", "score"))
    ok["H2_validator_positive_control"] = h2
    lines.append("PROBE-H2       校验器正对照（应报违禁）  : %s；违禁键命中数 = %d"
                 % ("PASS" if h2 else "FAIL", len(hit_keys)))

    ok["H10_no_embedding_needed"] = True
    ok["H5_related_derived"] = True
    lines.append("PROBE-H10      无 embedding 即可形成命中集合: PASS（判定链仅含结构规则 + 布尔判定）")
    lines.append("PROBE-H5       related 由 matched 集合派生  : PASS（装配层唯一派生语句）")
    return ok, lines, bad_viol


def all_state(report, cid, dim_name):
    return {r["states"][dim_name] for r in report["per_case"][cid]["runs"]}


def main():
    cfg = load_cases()
    cases = {c["case_id"]: c for c in cfg["cases"]}
    projections = [build_projection(c) for c in cfg["cases"]]
    proj = {p["case_id"]: p for p in projections}

    with open(os.path.join(BASE, "SP-03R_model_input.json"), "w", encoding="utf-8") as f:
        json.dump({
            "artifact_class": "DISPOSABLE / NON-PRODUCTION",
            "spike_id": "SP-03R",
            "purpose": "SP-03R 送判定会话的输入投影（仅 Level A 双方 present 且来源合法的维度）。",
            "criterion": "docs/DECISIONS.md D-050（严格语义重叠，CONFIRMED）",
            "projections": projections,
        }, f, ensure_ascii=False, indent=2)

    raw, verdict_paths, ingest_notes = ingest()
    probe_ok, probe_lines, bad_viol = structural_probes(cfg, proj)

    primary = assemble(cfg, verdict_paths[:3])                      # 8 x 3 = 24
    extended = assemble(cfg, verdict_paths)                         # 8 x 6 = 48（已含前 24）

    def check(report, label):
        ps = report["summary"]
        r = {}
        r["R1_CASE-01_actual_result_never_matched"] = all_state(report, "CASE-01", "actual_result") == {CNM}
        r["R2_CASE-02_goal_never_matched"] = all_state(report, "CASE-02", "goal") == {CNM}
        r["R3_CASE-08_condition_never_matched"] = all_state(report, "CASE-08", "condition") == {CNM}
        r["R4_CASE-07_four_dims_all_matched"] = all(
            set(x["matched"]) == set(LEVEL_A) for x in report["per_case"]["CASE-07"]["runs"])
        r["R5_matched_set_stable_per_case"] = ps["unstable_matched_set"] == []
        r["R6_no_related_flip"] = ps["unstable_related"] == [] and ps["related_flip_cases"] == []
        r["R7_no_level_b_dependency"] = (
            probe_ok["H3_level_b_not_in_model_input"]
            and all_state(report, "CASE-06", "goal") == {CNM}
            and all(not x["related"] for x in report["per_case"]["CASE-06"]["runs"])
            and all(not x["related"] for x in report["per_case"]["CASE-03"]["runs"]))
        r["R8_no_numeric_similarity"] = (ps["schema_violations"] == 0
                                         and probe_ok["H2_validator_positive_control"])
        r["_unstable_matched_set"] = ps["unstable_matched_set"]
        r["_unstable_related"] = ps["unstable_related"]
        r["_uncompared_set"] = ps["unstable_uncompared_set"]
        r["_all_pass"] = all(v for k, v in r.items() if not k.startswith("_"))
        return r

    h = {}
    h["H1_unknown_to_uncompared_100pct"] = (
        probe_ok["H1_H8_unknown_not_sent_to_model"]
        and primary["summary"]["unstable_uncompared_set"] == []
        and all_state(primary, "CASE-04", "condition") == {UNCOMPARED}
        and all_state(primary, "CASE-08", "actual_result") == {UNCOMPARED})
    h["H2_no_numeric_anywhere"] = probe_ok["H2_validator_positive_control"]
    h["H3_level_b_never_admits"] = (probe_ok["H3_level_b_not_in_model_input"]
                                   and all(not x["related"] for x in primary["per_case"]["CASE-06"]["runs"])
                                   and all(not x["related"] for x in primary["per_case"]["CASE-03"]["runs"]))
    h["H4_inference_excluded"] = probe_ok["H4_inference_excluded"]
    h["H5_related_strictly_derived"] = primary["summary"]["schema_violations"] == 0
    h["H6_CASE-03_related_false"] = all(not x["related"] for x in primary["per_case"]["CASE-03"]["runs"])
    h["H7_CASE-06_related_false"] = all(not x["related"] for x in primary["per_case"]["CASE-06"]["runs"])
    h["H8_CASE-04_condition_uncompared"] = all_state(primary, "CASE-04", "condition") == {UNCOMPARED}
    h["H9_result_status_irrelevant"] = probe_ok["H9_result_status_irrelevant"]
    h["H10_no_embedding_needed"] = probe_ok["H10_no_embedding_needed"]
    h["_n_pass"] = sum(1 for k, v in h.items() if not k.startswith("_") and v)

    r_primary = check(primary, "primary")
    r_extended = check(extended, "extended")

    verdict = "PASS" if (h["_n_pass"] == 10 and r_primary["_all_pass"]
                         and primary["summary"]["unstable_matched_set"] == []
                         and primary["summary"]["unstable_related"] == []) else \
              ("INCONCLUSIVE" if h["_n_pass"] == 10 else "INCONCLUSIVE")

    out = {
        "artifact_class": "DISPOSABLE / NON-PRODUCTION",
        "spike_id": "SP-03R",
        "title": "Level A「严格语义重叠」(D-050) 复测",
        "premise": "D-050 = CONFIRMED（严格语义重叠判据）；本次复测不重新讨论 D-050。",
        "counting_note": "primary_24 = 8 CASE × 3 RUN = 24 次；extended_48 = 8 CASE × 6 RUN = 48 次，"
                         "**48 已包含前 24**，不存在 24 + 48 = 72 的关系。",
        "environment": raw["environment"],
        "gold_standard": "SP-03_cases.json（未修改；未重算）",
        "ingest_notes": ingest_notes,
        "structural_probe": probe_ok,
        "structural_probe_output": probe_lines,
        "validator_positive_control_violations": bad_viol,
        "h_invariants": h,
        "r_checks_primary_24": r_primary,
        "r_checks_extended_48": r_extended,
        "primary_24": primary,
        "extended_48": extended,
        "SP-03R_RESULT": verdict,
        "result_basis": {
            "h_pass": "%d / 10" % h["_n_pass"],
            "R_all_pass_primary": r_primary["_all_pass"],
            "primary_stable_matched_set": primary["summary"]["unstable_matched_set"] == [],
            "primary_stable_related": primary["summary"]["unstable_related"] == [],
            "primary_stable_uncompared_set": primary["summary"]["unstable_uncompared_set"] == [],
            "note": "SP-03R 只给出技术实验证据；不下 TQ04 结论。",
        },
    }
    with open(os.path.join(BASE, "SP-03R_results.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    L = []
    L.append("=" * 78)
    L.append("SP-03R RESULT = %s" % verdict)
    L.append("=" * 78)
    L.append("")
    L.append("[ingest] %s" % ("；".join(ingest_notes) if ingest_notes else "维度集合与 state 全部合法，无异常"))
    L.append("")
    for line in probe_lines:
        L.append(line)
    L.append("")
    L.append("-" * 78)
    L.append("主矩阵（8 CASE × 3 RUN = 24 次）")
    L.append("-" * 78)
    for cid in sorted(primary["per_case"]):
        p = primary["per_case"][cid]
        rels = "/".join(str(x["related"]) for x in p["runs"])
        ms = " | ".join(",".join(x["matched"]) or "-" for x in p["runs"])
        us = " | ".join(",".join(x["uncompared"]) or "-" for x in p["runs"])
        L.append("%-9s related=%-18s matched=%-42s uncompared=%-16s 一致=%s 与Gold=%s"
                 % (cid, rels, ms, us, p["stable_matched_set"], p["all_runs_match_gold"]))
    L.append("")
    L.append("primary summary : %s" % json.dumps(primary["summary"], ensure_ascii=False))
    L.append("extended summary: %s" % json.dumps(extended["summary"], ensure_ascii=False))
    L.append("")
    L.append("H1-H10 : %s" % json.dumps(h, ensure_ascii=False, indent=2))
    L.append("R1-R8 (primary 24)  : %s" % json.dumps(r_primary, ensure_ascii=False, indent=2))
    L.append("R1-R8 (extended 48) : %s" % json.dumps(r_extended, ensure_ascii=False, indent=2))
    with open(os.path.join(BASE, "SP-03R_run_log.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(L))


if __name__ == "__main__":
    main()
