/**
 * S01 ｜ `M15` - the retrieval freshness (stale) derivation (task §9).
 *
 * Contract: §9 step ⑥ + `D-045` (a `Formal` save triggers ⑥) and `D-051` (an explicit rerun replaces
 * the comparison). `docs/03_V1_SCOPE.md` excludes a version system, so freshness must be DERIVED.
 *
 * ── THE ONE RULE ────────────────────────────────────────────────────────────────────
 * A stored comparison is STALE exactly when the source record was modified AFTER the comparison was
 * generated: `Attempt.updated_at > RetrievalDerivation.created_at`.
 *
 * 🔴 Both sides are EXISTING sources of truth, read as they are. There is deliberately NO
 *    `has_been_retrieved`, NO `retrieval_freshness_score` and NO `retrieval_version`: each of those
 *    would be a second source of truth that can drift away from the record it claims to describe.
 * 🔴 Stale is a WARNING, never an action. Nothing here re-runs retrieval; the user does that
 *    explicitly (`rerunRetrieval`), because an automatic rerun on every edit is exactly the
 *    background behaviour `D-022` forbids.
 * 🔴 The comparison is NOT invalidated: the previous result stays readable and stays correct FOR THE
 *    CONTENT IT WAS COMPUTED FROM. The sentence says 「可能不再适用」 - a possibility, not a verdict.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { RetrievalDerivationRecord } from '../../retrieval/compare/types.js';
import type { WorkflowFreshnessView } from './types.js';

/**
 * The exact user-facing sentence for a stale comparison.
 *
 * 🔴 It states the CAUSE (the record was modified) and a POSSIBILITY (the earlier comparison may no
 *    longer apply). It never says the comparison is wrong, and it never asks the user to rerun.
 */
export const RETRIEVAL_STALE_NOTICE =
  '该记录在生成历史比较结果之后被修改过，先前的历史比较结果可能不再适用；如果你需要，可以重新检索。';

/** ISO-8601 strings of the same format compare correctly as strings. */
function isAfter(candidate: string, reference: string): boolean {
  return candidate > reference;
}

/**
 * Derives the freshness view.
 *
 * 🔴 With no stored comparison the answer is `stale: false` / `notice: null`: there is nothing to be
 *    out of date, and the read model reports `not_available` separately. Reporting "stale" for a
 *    comparison that does not exist would be a fabricated warning.
 */
export function retrievalFreshnessOf(
  attempt_updated_at: string,
  derivation: RetrievalDerivationRecord | null,
): WorkflowFreshnessView {
  if (derivation === null) {
    return {
      stale: false,
      notice: null,
      attempt_updated_at,
      comparison_generated_at: null,
    };
  }
  const stale = isAfter(attempt_updated_at, derivation.created_at);
  return {
    stale,
    notice: stale ? RETRIEVAL_STALE_NOTICE : null,
    attempt_updated_at,
    comparison_generated_at: derivation.created_at,
  };
}
