/**
 * S01-06 ｜ Step ⑧ presentation: candidate insights, the E1–E4 checks and the Experience Asset area.
 *
 * 🔴 `E1`–`E4` ARE RENDERED IN HUMAN WORDS (task §31). The gates are never shown as bare codes: each
 *    one appears as 「有历史来源」 / 「结论明确」 / 「适用范围明确」 / 「可追溯到原记录」, and a FAILED gate
 *    shows 缺什么 / 为什么重要 / 如何补充 - with 如何补充 explicitly marked as an AI suggestion.
 *    A failure is never hidden.
 * 🔴 `candidate` IS NOT AN EXPERIENCE ASSET (task §30 / §33). The Experience Asset area is filled
 *    EXCLUSIVELY from `snapshot.insights.experience_assets`, which `M15` already derives from the
 *    accepted set. This module never re-decides eligibility: it does not test `state === 'accepted'`
 *    to build that list, so a second business judgement cannot appear here.
 * 🔴 `N_引用` IS READ (task §40): the number comes from `M7`'s single `CitationView`. It is never
 *    recounted from the reference list.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO I/O.
 */

import {
  EXPERIENCE_ASSETS_EMPTY,
  GATE_LABELS,
  GATE_MISSING_HOW,
  GATE_MISSING_HOW_SOURCE,
  GATE_MISSING_WHAT,
  GATE_MISSING_WHY,
  INSIGHT_BASIS,
  INSIGHT_EMPTY,
  INSIGHT_PROPOSITION,
  INSIGHT_SCOPE,
  INSIGHT_SOURCE,
  INSIGHT_STATE_ACCEPTED,
  INSIGHT_STATE_CANDIDATE,
  INSIGHT_STATE_REJECTED,
} from '../copy.js';
import { isBlank } from './fields.js';
import type { GateId } from '../../domain/types/gates.js';
import type { InsightState } from '../../domain/types/insight.js';
import type { InsightView } from '../../application/insight/types.js';
import type { D9WorkflowSnapshot } from '../../application/workflow/types.js';

export interface MissingItemView {
  readonly what: string;
  readonly why: string;
  readonly how: string | null;
  /** Present only when `how` is present: 「如何补充」 is an AI suggestion, and it says so. */
  readonly how_source_label: string | null;
}

export interface GateCheckView {
  readonly gate_id: 'E1' | 'E2' | 'E3' | 'E4';
  /** 有历史来源 / 结论明确 / 适用范围明确 / 可追溯到原记录 - never the raw code alone. */
  readonly label: string;
  readonly satisfied: boolean;
  readonly missing: readonly MissingItemView[];
  readonly missing_labels: {
    readonly what: string;
    readonly why: string;
    readonly how: string;
  };
}

export interface InsightCardView {
  readonly insight_id: string;
  readonly state: InsightState;
  readonly state_label: string;
  readonly title: string | null;
  readonly proposition: string;
  readonly applicable_scope: string;
  readonly judgment_basis: string;
  readonly content_labels: {
    readonly proposition: string;
    readonly scope: string;
    readonly basis: string;
  };
  readonly gates: readonly GateCheckView[];
  readonly n_citation: number;
  readonly is_experience_asset: boolean;
  readonly can_accept: boolean;
  /** `true` when this insight belongs to the NEWEST explicit generation batch. */
  readonly is_current_batch: boolean;
  readonly source_label: string;
}

export interface InsightsPresentation {
  readonly generated: boolean;
  readonly cards: readonly InsightCardView[];
  readonly empty_statement: string;
  readonly experience_assets: readonly InsightCardView[];
  readonly has_experience_assets: boolean;
}

const ELIGIBILITY_GATES: readonly ('E1' | 'E2' | 'E3' | 'E4')[] = ['E1', 'E2', 'E3', 'E4'];

const CONTENT_LABELS = {
  proposition: INSIGHT_PROPOSITION,
  scope: INSIGHT_SCOPE,
  basis: INSIGHT_BASIS,
} as const;

const MISSING_LABELS = {
  what: GATE_MISSING_WHAT,
  why: GATE_MISSING_WHY,
  how: GATE_MISSING_HOW,
} as const;

export function insightStateLabel(state: InsightState): string {
  if (state === 'accepted') {
    return INSIGHT_STATE_ACCEPTED;
  }
  return state === 'rejected' ? INSIGHT_STATE_REJECTED : INSIGHT_STATE_CANDIDATE;
}

/** `E5` is the user's own acceptance and is never rendered as an eligibility check. */
function gateViewsOf(view: InsightView): readonly GateCheckView[] {
  return ELIGIBILITY_GATES.map((gate_id) => {
    const check = view.insight.gate_checks.find((entry) => entry.gate_id === gate_id);
    const missing = view.missing_items_by_gate[gate_id as GateId] ?? [];
    return {
      gate_id,
      label: GATE_LABELS[gate_id],
      satisfied: check?.satisfied === true,
      missing: missing.map((item) => ({
        what: item.description,
        why: item.why_important,
        /* 🔴 Only a DISPLAY-type Inference is ever offered here (D-038); the service already enforces it. */
        how: item.how_to_supplement === null ? null : item.how_to_supplement.value,
        how_source_label: item.how_to_supplement === null ? null : GATE_MISSING_HOW_SOURCE,
      })),
      missing_labels: MISSING_LABELS,
    };
  });
}

export function insightCardOf(
  view: InsightView,
  options: { readonly current_batch_id: string | null },
): InsightCardView {
  return {
    insight_id: String(view.insight.insight_id),
    state: view.insight.state,
    state_label: insightStateLabel(view.insight.state),
    title: view.meta.title,
    proposition: view.insight.proposition,
    applicable_scope: view.insight.applicable_scope,
    judgment_basis: view.insight.judgment_basis,
    content_labels: CONTENT_LABELS,
    gates: gateViewsOf(view),
    n_citation: view.citation.n_citation,
    is_experience_asset: view.is_experience_asset,
    can_accept: view.can_accept,
    is_current_batch:
      options.current_batch_id !== null &&
      view.insight.generation_batch === options.current_batch_id,
    source_label: INSIGHT_SOURCE,
  };
}

export function insightsPresentationOf(snapshot: D9WorkflowSnapshot | null): InsightsPresentation {
  if (snapshot === null) {
    return {
      generated: false,
      cards: [],
      empty_statement: INSIGHT_EMPTY,
      experience_assets: [],
      has_experience_assets: false,
    };
  }
  const options = { current_batch_id: snapshot.insights.current_batch_id };
  const cards = snapshot.insights.views.map((view) => insightCardOf(view, options));
  /* 🔴 The asset list is taken VERBATIM from the read model - never filtered by `state` here. */
  const experience_assets = snapshot.insights.experience_assets.map((view) =>
    insightCardOf(view, options),
  );

  return {
    generated: snapshot.insights.batches.length > 0,
    cards,
    empty_statement: INSIGHT_EMPTY,
    experience_assets,
    has_experience_assets: experience_assets.length > 0,
  };
}

/** A candidate card must never be presented as a reusable asset (task §30 / U5). */
export function isPresentedAsExperienceAsset(card: InsightCardView): boolean {
  return card.is_experience_asset === true && card.state === 'accepted';
}

/** The sentence shown when the asset area is empty, so it is never confused with "not generated". */
export function experienceAssetsEmptyStatement(): string {
  return EXPERIENCE_ASSETS_EMPTY;
}

/** A blank proposition would be a schema violation upstream; the UI still refuses to render ``. */
export function propositionTextOf(card: InsightCardView): string {
  return isBlank(card.proposition) ? INSIGHT_EMPTY : card.proposition;
}
