/**
 * S01-03 ｜ The Level A three-state comparator (`M6`).
 *
 * Contract: §9 step ⑥ ("逐候选 × 逐 Level A 维度做三态判定"), §9.4, §9.4.1, `D-050`, `D-052`.
 *
 * 🔴 The pipeline per dimension is fixed and ordered:
 *     ① `unknown` gate      - either side unknown ⇒ `uncompared`; the judge is NOT called;
 *     ② deterministic rule  - only a provable sameness or a provable difference;
 *     ③ dimension judge      - only when the rule returned `undecided`.
 *    The judge can therefore never see an unknown dimension, and it can never express
 *    `uncompared` (AC-114).
 * 🔴 `related` is derived EXACTLY as "the matched dimension set is non-empty" (`D-061`). No
 *    threshold, no 「≥2 个维度命中」, no mandatory `goal` hit, no 加权, no ordered category.
 * 🔴 A judge failure aborts the WHOLE comparison: the caller receives a runtime failure and NOT a
 *    partially decided candidate. "Return what we managed to compare" would fabricate `N_检索`.
 * 🔴 The source `Attempt` is read only. Normalization is a comparison-time temporary; nothing is
 *    written back to the record, to a `Fact` or to an `Extraction` (§31).
 *
 * 🔴 FINAL-RAPID-A 就地补注（不改写上文；`M6` 的既有三态语义一字未改）：
 *    Step ⑥ could need up to `candidates × 4` judgements, and the pairwise protocol issued one
 *    provider request per `candidate × dimension` pair (8 × 4 = 32 round trips for the largest
 *    retrieval; the PSA run was stopped at the 25th). The pipeline above is now expressed as two
 *    explicit phases so the SAME decision procedure can be asked for in ONE request:
 *      ① `planComparisons` - the structural gate and the deterministic rules for EVERY
 *         candidate × dimension, with no model call at all;
 *      ② the remaining `undecided` slots only - either one judge call per slot (the unchanged
 *         single-pair path, `compareAttempts`) or ONE batch call for the whole retrieval
 *         (`compareAttemptsInOneBatch`).
 *    Batching changes the CALL GRANULARITY only. Which pair reaches the judge, which state a pair
 *    gets, and how `related` is derived are untouched.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { Attempt } from '../../domain/types/attempt.js';
import type {
  DerivedComparison,
  DerivedDimensionComparison,
} from '../../domain/types/comparison.js';
import { LEVEL_A_DIMENSIONS } from '../../domain/types/level-a.js';
import type { LevelAAttemptFieldPath, LevelADimension } from '../../domain/types/level-a.js';
import { projectAttemptToLevelA, projectedFieldPathOf } from '../../domain/projection/level-a.js';
import type { LevelAProjection } from '../../domain/projection/level-a.js';
import type { BatchDimensionJudge, BatchJudgePair } from './batch-judge.js';
import { batchPairKeyOf } from './batch-judge.js';
import type { DimensionJudge } from './dimension-judge.js';
import { deterministicDimensionVerdict } from './field-rules.js';
import type { JudgedDimensionState, RetrievalRuntimeFailure } from './types.js';

/* ------------------------------------------------------------------ *
 * Availability of a dimension value
 * ------------------------------------------------------------------ */

/**
 * The value of one Level A dimension, or `null` when the dimension is explicitly unknown.
 *
 * 🔴 `null` is the ONLY representation of "not provided" here: an `unknown` dimension is never
 *    replaced by an empty string, a sentinel such as "N/A" / 「无」 or a default (§4.2 rule 7 /
 *    AC-04). It is the input of the structural gate below.
 */
export function projectedValueOf(
  projection: LevelAProjection,
  dimension: LevelADimension,
): string | null {
  const projected = projection[dimension];
  if (projected.presence_state !== 'present') {
    return null;
  }
  // A `present` carrier always carries an item; the `??` is an unreachable defence, and an absent
  // item is treated as unknown rather than silently compared as an empty value.
  return projected.item?.value ?? null;
}

export interface DimensionStateLookup {
  readonly source: LevelAProjection;
  readonly candidate: LevelAProjection;
}

export type ComparisonOutcome =
  | {
      readonly kind: 'compared';
      readonly comparison: DerivedComparison;
      readonly states: readonly JudgedDimensionState[];
    }
  | RetrievalRuntimeFailure;

/* ------------------------------------------------------------------ *
 * Phase ① - the model-free plan of one retrieval
 * ------------------------------------------------------------------ */

/** One dimension already decided without any model call (structural gate or deterministic rule). */
interface ResolvedDimension {
  readonly dimension: LevelADimension;
  readonly field_path: LevelAAttemptFieldPath;
  readonly state: JudgedDimensionState;
}

/**
 * One `candidate × dimension` slot that the deterministic rules could NOT decide.
 *
 * 🔴 Both values are non-`null` by construction: an `unknown` side was intercepted before this slot
 *    could exist, so the slot that reaches the model can never be an unknown dimension (§9.4).
 */
interface UndecidedSlot {
  readonly dimension: LevelADimension;
  readonly field_path: LevelAAttemptFieldPath;
  readonly source_value: string;
  readonly candidate_value: string;
}

/** Everything phase ① could work out about ONE candidate, with no model contact. */
export interface CandidatePlan {
  readonly candidate: Attempt;
  /** Dimensions decided by the structural gate / the deterministic rules, in canonical order. */
  readonly resolved: readonly ResolvedDimension[];
  /** Dimensions handed to the judge, in canonical order. */
  readonly undecided: readonly UndecidedSlot[];
}

function planCandidate(source_projection: LevelAProjection, candidate: Attempt): CandidatePlan {
  const candidate_projection = projectAttemptToLevelA(candidate);
  const resolved: ResolvedDimension[] = [];
  const undecided: UndecidedSlot[] = [];

  for (const dimension of LEVEL_A_DIMENSIONS) {
    const field_path = projectedFieldPathOf(source_projection, dimension);
    const sourceValue = projectedValueOf(source_projection, dimension);
    const candidateValue = projectedValueOf(candidate_projection, dimension);

    /* ① `unknown` gate - structural, BEFORE any judge call (AC-114 / AC-22 / D-025). */
    if (sourceValue === null || candidateValue === null) {
      resolved.push({
        dimension,
        field_path,
        state: {
          dimension,
          tri_state: 'uncompared',
          basis: 'structural_unknown',
          reason: null,
        },
      });
      continue;
    }

    /* ② Deterministic rule. */
    const rule = deterministicDimensionVerdict(sourceValue, candidateValue);
    if (rule.verdict !== 'undecided') {
      resolved.push({
        dimension,
        field_path,
        state: {
          dimension,
          tri_state: rule.verdict,
          basis: 'deterministic_rule',
          reason: rule.reason,
        },
      });
      continue;
    }

    undecided.push({ dimension, field_path, source_value: sourceValue, candidate_value: candidateValue });
  }

  return { candidate, resolved, undecided };
}

/**
 * Phase ① for a whole retrieval: every candidate is planned WITHOUT calling anything.
 *
 * 🔴 Candidates are planned in the order the caller passes them (the fixed COMPARISON order), and
 *    dimensions inside a candidate follow the canonical Level A order, so the resulting pair list
 *    is a deterministic function of the input alone.
 */
export function planComparisons(
  source: Attempt,
  candidates: readonly Attempt[],
): readonly CandidatePlan[] {
  const source_projection = projectAttemptToLevelA(source);
  return candidates.map((candidate) => planCandidate(source_projection, candidate));
}

/**
 * Phase ① output for the judge: EVERY undecided pair of the retrieval, in plan order.
 *
 * 🔴 This is the exact expected set of the one batch call. It is also what makes `0` undecided
 *    pairs a first-class outcome: an empty list means "there is nothing to ask", and no request is
 *    built at all.
 */
export function undecidedPairsOf(plans: readonly CandidatePlan[]): readonly BatchJudgePair[] {
  const pairs: BatchJudgePair[] = [];
  for (const plan of plans) {
    for (const slot of plan.undecided) {
      pairs.push({
        candidate_id: plan.candidate.attempt_id,
        dimension: slot.dimension,
        source_value: slot.source_value,
        candidate_value: slot.candidate_value,
      });
    }
  }
  return pairs;
}

/* ------------------------------------------------------------------ *
 * Phase ② - assembling one comparison from decided states
 * ------------------------------------------------------------------ */

/** Reads one comparison out of the record by canonical dimension; throws only if a build is broken. */
function requireDimension(
  built: ReadonlyMap<LevelADimension, DerivedDimensionComparison>,
  dimension: LevelADimension,
): DerivedDimensionComparison {
  const found = built.get(dimension);
  if (found === undefined) {
    throw new Error(`Level A dimension "${dimension}" was not compared.`);
  }
  return found;
}

function fieldPathsOf(plan: CandidatePlan): ReadonlyMap<LevelADimension, LevelAAttemptFieldPath> {
  const paths = new Map<LevelADimension, LevelAAttemptFieldPath>();
  for (const entry of plan.resolved) {
    paths.set(entry.dimension, entry.field_path);
  }
  for (const slot of plan.undecided) {
    paths.set(slot.dimension, slot.field_path);
  }
  return paths;
}

/**
 * The four dimensions of one candidate in canonical order: the phase ① states plus the judged
 * answers. A dimension that is still unresolved is a broken build, never a silent default.
 */
function statesOf(
  plan: CandidatePlan,
  judged: ReadonlyMap<LevelADimension, JudgedDimensionState>,
): readonly JudgedDimensionState[] {
  const decided = new Map(plan.resolved.map((entry) => [entry.dimension, entry.state]));
  return LEVEL_A_DIMENSIONS.map((dimension) => {
    const state = decided.get(dimension) ?? judged.get(dimension);
    if (state === undefined) {
      throw new Error(`Level A dimension "${dimension}" was neither decided nor judged.`);
    }
    return state;
  });
}

/**
 * Builds the `DerivedComparison` for one candidate.
 *
 * 🔴 This is the ONLY place in the repository that derives `related` (`D-061`), and it is shared by
 *    the single-pair path and the one-batch path so the two can never disagree.
 */
function buildDerivedComparison(
  candidate: Attempt,
  plan: CandidatePlan,
  states: readonly JudgedDimensionState[],
): DerivedComparison {
  const paths = fieldPathsOf(plan);
  const built = new Map<LevelADimension, DerivedDimensionComparison>();
  for (const state of states) {
    built.set(state.dimension, {
      dimension: state.dimension,
      field_path: requireFieldPath(paths, state.dimension),
      tri_state: state.tri_state,
      unknown_intercepted: state.basis === 'structural_unknown',
    });
  }

  /*
   * The record is assembled from the canonical dimension set explicitly, so "exactly four
   * dimensions, no more, no fewer" is a property of the construction and not of a convention.
   */
  const dimensions = {
    goal: requireDimension(built, 'goal'),
    approach: requireDimension(built, 'approach'),
    condition: requireDimension(built, 'condition'),
    result: requireDimension(built, 'result'),
  };

  const matched = LEVEL_A_DIMENSIONS.filter(
    (dimension) => dimensions[dimension].tri_state === 'matched',
  );
  const comparedNotMatched = LEVEL_A_DIMENSIONS.filter(
    (dimension) => dimensions[dimension].tri_state === 'compared_not_matched',
  );
  const uncompared = LEVEL_A_DIMENSIONS.filter(
    (dimension) => dimensions[dimension].tri_state === 'uncompared',
  );

  return {
    candidate_attempt_id: candidate.attempt_id,
    dimensions,
    matched_level_a_dimensions: matched,
    compared_not_matched_dimensions: comparedNotMatched,
    uncompared_dimensions: uncompared,
    // 🔴 `D-061`: related ⇔ the matched set is non-empty. Nothing else may enter this expression.
    related: matched.length > 0,
  };
}

function requireFieldPath(
  paths: ReadonlyMap<LevelADimension, LevelAAttemptFieldPath>,
  dimension: LevelADimension,
): LevelAAttemptFieldPath {
  const found = paths.get(dimension);
  if (found === undefined) {
    throw new Error(`Level A dimension "${dimension}" has no primary field path.`);
  }
  return found;
}

/**
 * Compares one source `Attempt` against one candidate `Attempt` over the four Level A dimensions.
 *
 * Pure with respect to storage: the only side effect possible is the injected judge call.
 */
export async function compareAttempts(
  judge: DimensionJudge,
  source: Attempt,
  candidate: Attempt,
): Promise<ComparisonOutcome> {
  const plan = planCandidate(projectAttemptToLevelA(source), candidate);
  const judged = new Map<LevelADimension, JudgedDimensionState>();

  for (const slot of plan.undecided) {
    /* ③ Discrete dimension judgement - the ONLY AI entry point of step ⑥. */
    const outcome = await judge({
      dimension: slot.dimension,
      source_value: slot.source_value,
      candidate_value: slot.candidate_value,
    });
    if (outcome.kind === 'runtime_incomplete') {
      return outcome;
    }
    judged.set(slot.dimension, {
      dimension: slot.dimension,
      tri_state: outcome.verdict,
      basis: 'dimension_judge',
      reason: outcome.reason,
    });
  }

  const states = statesOf(plan, judged);
  return { kind: 'compared', comparison: buildDerivedComparison(candidate, plan, states), states };
}

/* ------------------------------------------------------------------ *
 * The one-call path (FINAL-RAPID-A)
 * ------------------------------------------------------------------ */

/** One candidate that went through the three-state comparison (structurally a `ComparedCandidate`). */
export interface ComparedCandidateResult {
  readonly attempt: Attempt;
  readonly comparison: DerivedComparison;
  readonly states: readonly JudgedDimensionState[];
}

export type BatchComparisonOutcome =
  | { readonly kind: 'compared'; readonly candidates: readonly ComparedCandidateResult[] }
  | RetrievalRuntimeFailure;

/**
 * Compares the source `Attempt` against EVERY candidate with at most ONE judge call.
 *
 * 🔴 `0` undecided pairs ⇒ `0` provider calls: the judge is not invoked at all (`pairs.length === 0`
 *    returns before the call), so a fully deterministic retrieval never touches the network.
 * 🔴 Any other count ⇒ EXACTLY ONE call carrying every undecided pair. The judge is responsible for
 *    answering the exact set; a refusal anywhere fails the WHOLE retrieval, and nothing is
 *    partially decided.
 * 🔴 Candidates whose plan has no undecided slot are assembled without touching the answer, so the
 *    deterministic half of a mixed retrieval is unaffected by the batch outcome.
 */
export async function compareAttemptsInOneBatch(
  judge: BatchDimensionJudge,
  source: Attempt,
  candidates: readonly Attempt[],
): Promise<BatchComparisonOutcome> {
  const plans = planComparisons(source, candidates);
  const pairs = undecidedPairsOf(plans);
  const judged = new Map<string, JudgedDimensionState>();

  if (pairs.length > 0) {
    const outcome = await judge(pairs);
    if (outcome.kind === 'runtime_incomplete') {
      return outcome;
    }
    for (const judgment of outcome.judgments) {
      judged.set(batchPairKeyOf(judgment.candidate_id, judgment.dimension), {
        dimension: judgment.dimension,
        tri_state: judgment.verdict,
        basis: 'dimension_judge',
        reason: judgment.reason,
      });
    }
  }

  const compared: ComparedCandidateResult[] = plans.map((plan) => {
    const answers = new Map<LevelADimension, JudgedDimensionState>();
    for (const slot of plan.undecided) {
      const found = judged.get(batchPairKeyOf(plan.candidate.attempt_id, slot.dimension));
      if (found === undefined) {
        /*
         * Unreachable with a strict batch reader, and deliberately fatal rather than defaulted: a
         * missing pair must never become `compared_not_matched`, `matched` or `uncompared`.
         */
        throw new Error(
          `The batch judge did not answer ${plan.candidate.attempt_id} / ${slot.dimension}.`,
        );
      }
      answers.set(slot.dimension, found);
    }
    const states = statesOf(plan, answers);
    return {
      attempt: plan.candidate,
      comparison: buildDerivedComparison(plan.candidate, plan, states),
      states,
    };
  });

  return { kind: 'compared', candidates: compared };
}

/** The source Attempt's own unknown Level A dimensions - the single global computation point. */
export function globalUncomparedDimensionsOf(source: Attempt): readonly LevelADimension[] {
  const projection = projectAttemptToLevelA(source);
  return LEVEL_A_DIMENSIONS.filter((dimension) => projectedValueOf(projection, dimension) === null);
}
