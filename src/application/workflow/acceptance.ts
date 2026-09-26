/**
 * S01 ｜ `M15` - the ACCEPTANCE layer (task §15).
 *
 * ── WHY THIS IS A SEPARATE FILE ─────────────────────────────────────────────────────
 * 🔴 `ACCEPTANCE` is NOT a third kind of command failure. It answers a DIFFERENT question: "does the
 *    main chain `① → ⑩` really pass end-to-end?" - which is meaningful only while TESTING or while
 *    preparing a submission.
 * 🔴 Keeping it in its own vocabulary is what makes the two forbidden confusions unrepresentable:
 *      · a `GATE` cannot be displayed as a system error, because a gate is a `WorkflowNotice` and this
 *        report is not;
 *      · a recoverable `RUNTIME` failure cannot be recorded as "验收可跳过", because a command result's
 *        layer type EXCLUDES `ACCEPTANCE` (`WorkflowFailureLayer`).
 * 🔴 No step here is a product acceptance criterion. This file creates NO `AC`: it reports whether the
 *    chain ran, and the canonical acceptance points stay `AC-01`–`AC-162` + `AC-Q06-1`–`6`.
 *
 * 🔴 It also carries the ONE fact a run must state about its own evidence: how many REAL provider
 *    calls it made. The end-to-end fixture makes none, and a report that claimed otherwise would be a
 *    fabricated verification.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { D9WorkflowSnapshot } from './types.js';

/** The `D9` steps, in order. Never a persisted counter - a label for a report. */
export const D9_STEP_LABELS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'] as const;

export type D9StepLabel = (typeof D9_STEP_LABELS)[number];

/** 🔴 The only layer an acceptance record may carry. */
export const ACCEPTANCE_LAYER = 'ACCEPTANCE' as const;

export interface D9AcceptanceStepRecord {
  readonly step: D9StepLabel;
  readonly label: string;
  readonly layer: typeof ACCEPTANCE_LAYER;
  readonly passed: boolean;
  /** What was actually observed. 🔴 Never a substitute for a product `AC`. */
  readonly detail: string;
}

export interface D9AcceptanceReport {
  readonly layer: typeof ACCEPTANCE_LAYER;
  readonly steps: readonly D9AcceptanceStepRecord[];
  readonly all_passed: boolean;
  /**
   * 🔴 How many REAL provider calls the run made. The end-to-end fixture answers this with `0`:
   *    every model reply in it is a hand-written `NOT_A_REAL_LLM_OUTPUT` fixture.
   */
  readonly real_provider_calls: number;
  /** The steps that did not pass, in order. Empty when the chain is complete. */
  readonly failed_steps: readonly D9StepLabel[];
}

export function acceptanceStep(
  step: D9StepLabel,
  label: string,
  passed: boolean,
  detail: string,
): D9AcceptanceStepRecord {
  return { step, label, layer: ACCEPTANCE_LAYER, passed, detail };
}

export function acceptanceReportOf(
  steps: readonly D9AcceptanceStepRecord[],
  real_provider_calls: number,
): D9AcceptanceReport {
  const failed = steps.filter((record) => !record.passed).map((record) => record.step);
  return {
    layer: ACCEPTANCE_LAYER,
    steps,
    all_passed: steps.length > 0 && failed.length === 0,
    real_provider_calls,
    failed_steps: failed,
  };
}

/**
 * 🔴 What a report must be able to say about its own environment. None of these is a product feature:
 *    they are the honest caveats that stop a repository-level run from being reported as a real
 *    browser / real provider verification (`PSA-*` stay `PENDING`).
 */
export const ACCEPTANCE_CAVEATS: readonly string[] = [
  'Real provider calls = 0: every model reply in the end-to-end fixture is hand-written (NOT_A_REAL_LLM_OUTPUT).',
  'The workspace is an in-memory WorkspaceStorage: no real browser File System Access directory was opened.',
  'No deployment was performed and no Vercel / proxy reachability was verified.',
  'PSA-01–13 and X1–X11 remain PENDING.',
];

/** The chain is complete exactly when every step passed. */
export function acceptanceIsComplete(report: D9AcceptanceReport): boolean {
  return report.all_passed;
}

/** Convenience for a report line: the `N_检索` a snapshot reports, distinguishing `null` from `0`. */
export function retrievalCountLabel(snapshot: D9WorkflowSnapshot): string {
  const n = snapshot.retrieval.n_retrieval;
  if (n === null) {
    return `not_available(${snapshot.retrieval.state})`;
  }
  return String(n);
}
