# -*- coding: utf-8 -*-
"""DISPOSABLE / NON-PRODUCTION —— SP-03R 维度级稳定性统计（只读 SP-03R_results.json）"""
import json, os

BASE = os.path.dirname(os.path.abspath(__file__))
res = json.load(open(os.path.join(BASE, "SP-03R_results.json"), "r", encoding="utf-8"))
LEVEL_A = ["goal", "actual_attempt", "condition", "actual_result"]

lines = []
unstable = []
for scope in ("primary_24", "extended_48"):
    rep = res[scope]
    runs = rep["summary"]["n_runs_per_case"]
    n_pairs = 0
    lines.append("=" * 72)
    lines.append("%s  —— 8 CASE x %d RUN = %d 次判定" % (scope, runs, rep["summary"]["n_judgments"]))
    lines.append("=" * 72)
    for cid in sorted(rep["per_case"]):
        rows = rep["per_case"][cid]["runs"]
        comp = [d for d in LEVEL_A if d in rows[0]["states"]]
        n_pairs += len(comp)
        for d in comp:
            states = sorted({r["states"][d] for r in rows})
            if len(states) != 1:
                unstable.append((scope, cid, d, states))
            lines.append("  %-9s %-15s states(%d RUN) = %-19s %s"
                         % (cid, d, runs, "/".join(states), "稳定" if len(states) == 1 else "★不稳定"))
    lines.append("")
    lines.append("  → Level A 维度槽位 = %d（8 CASE x 4 维度，含由 Step 0 规则写定的 uncompared）" % n_pairs)
    lines.append("     · 交给判定会话的可比对维度对 = %d（= SP-03 的同一集合；等值维度 pairs 未变）"
                 % (n_pairs - 2))
    lines.append("     · 由结构性规则写定的 uncompared 槽位 = 2（CASE-04.condition / CASE-08.actual_result）")
    lines.append("     · 判定会话产出的维度判定条数 = %d x %d = %d" % (n_pairs - 2, runs, (n_pairs - 2) * runs))
    lines.append("")
lines.append("维度级不稳定项 = %d %s" % (len(unstable), unstable if unstable else "（无）"))
lines.append("注：纳入统计的 32 个维度槽位 = 8 CASE x 4 Level A 维度；其中交给判定会话的 30 个与 SP-03 完全同一集合")
open(os.path.join(BASE, "SP-03R_dim_stability.txt"), "w", encoding="utf-8").write("\n".join(lines))
