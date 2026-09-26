/**
 * FINAL-RAPID-A ｜ The ONE-CALL batch dimension judge (`D-050` / `D-052` / `D-061`).
 *
 * WHY THIS MODULE EXISTS (measured root cause, not a hypothesis):
 *   Step ⑥ could require up to `candidates × 4 Level A dimensions` model judgements (8 × 4 = 32).
 *   The single-pair judge issued ONE provider request per `candidate × dimension` pair, so a
 *   retrieval of 8 candidates needed up to 32 sequential round trips. The observed PSA run was
 *   stopped at the 25th of those - i.e. the retrieval never COMPLETED, which is why no derivation
 *   was ever stored. The defect was the CALL GRANULARITY, not the persistence of a successful
 *   derivation (that part already worked).
 *
 * WHAT THIS MODULE IS:
 *   the same discrete judgement (`D-050` strict semantic overlap, `D-052` negative case), asked for
 *   EVERY genuinely undecided pair at once, in ONE structured request, and read back with an
 *   exact-set reader. It is a NEW protocol next to the already-fixed single-pair judge; that judge
 *   and its `json_object` prompt requirement are NOT rewritten or replaced here.
 *
 * WHAT IT IS NOT:
 *   - it never decides a pair that the deterministic rules could decide (the caller only sends
 *     genuinely undecided pairs);
 *   - it never reduces the candidate set and never drops a Level A dimension;
 *   - it introduces NO numeric or levelled quantity of any kind: the answer carries `verdict` +
 *     `reason`, exactly like the single-pair judge (AC-23 / AC-115);
 *   - it never accepts a PARTIAL answer. A missing pair, an extra pair, a duplicated pair, a pair
 *     the caller never asked about, an off-vocabulary verdict or an empty reason fails the WHOLE
 *     batch, and a failed batch stores nothing.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { AiInvocation, ProviderAdapter } from '../../ai/provider/adapter.js';
import type { CredentialRef } from '../../ai/provider/credential.js';
import type { AiRequest } from '../../ai/provider/request.js';
import { validateAiRequest } from '../../ai/provider/request.js';
import type { AiResult } from '../../ai/provider/result.js';
import type { StructuredOutputRequest } from '../../ai/provider/structured-output.js';
import {
  PREFERRED_STRUCTURED_OUTPUT_MODE,
  evaluateStructuredResponse,
  selectStructuredOutputMode,
} from '../../ai/provider/structured-output.js';
import type { SemanticVerdict } from '../../domain/types/comparison.js';
import { SEMANTIC_VERDICTS } from '../../domain/types/comparison.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import { D050_STRICT_RULE_TEXT, isSubstantiveReason } from './dimension-judge.js';
import type { RetrievalLocalFailureCode, RetrievalRuntimeFailure } from './types.js';

/** Caller-owned schema id. 🔴 Not a product version system (AC-122); it is not `DIMENSION_JUDGE_SCHEMA_ID`. */
export const BATCH_DIMENSION_JUDGE_SCHEMA_ID = 'level-a-dimension-judge-batch-v1';

/** The single key a batch answer may carry at the root. Everything else is refused by allowlist. */
export const BATCH_JUDGE_ALLOWED_KEYS: readonly string[] = ['judgments'];

/** The ONLY keys one batch judgement item may carry. Everything else is refused by allowlist. */
export const BATCH_JUDGMENT_ALLOWED_KEYS: readonly string[] = [
  'candidate_id',
  'dimension',
  'verdict',
  'reason',
];

/**
 * 🔴 Machine-readable delimiters around the requested pair list.
 *
 * The list is JSON and the values are free user text, so it is NOT safe to locate it by "the first
 * `[` / the last `]`" - a value may itself contain a bracket. These markers are the single
 * definition of where the machine-readable block begins and ends, and the test doubles read the
 * request back through them.
 */
export const BATCH_JUDGE_PAIRS_OPEN = '---BEGIN-JUDGMENT-PAIRS---';
export const BATCH_JUDGE_PAIRS_CLOSE = '---END-JUDGMENT-PAIRS---';

export const batchDimensionJudgeJsonSchema: Readonly<Record<string, unknown>> = {
  type: 'object',
  required: ['judgments'],
  properties: {
    judgments: {
      type: 'array',
      items: {
        type: 'object',
        required: [...BATCH_JUDGMENT_ALLOWED_KEYS],
        properties: {
          candidate_id: { type: 'string' },
          dimension: { type: 'string' },
          verdict: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  },
};

export const batchDimensionJudgeStructuredOutput: StructuredOutputRequest = {
  schema_id: BATCH_DIMENSION_JUDGE_SCHEMA_ID,
  json_schema: batchDimensionJudgeJsonSchema,
  preferred_mode: PREFERRED_STRUCTURED_OUTPUT_MODE,
};

/* ------------------------------------------------------------------ *
 * The requested pair
 * ------------------------------------------------------------------ */

/**
 * ONE pair the caller wants judged.
 *
 * 🔴 `candidate_id` + `dimension` is the pair's identity; the two values are the ONLY content
 *    uploaded for it. The whole workspace, the other candidates' unrelated content and any file
 *    path are deliberately absent from this shape.
 */
export interface BatchJudgePair {
  /** The historical record this pair belongs to (`Attempt` id). */
  readonly candidate_id: string;
  readonly dimension: LevelADimension;
  /** The CURRENT record's value on this dimension (「本次记录的取值」). */
  readonly source_value: string;
  /** The HISTORICAL record's value on this dimension (「历史记录的取值」). */
  readonly candidate_value: string;
}

/** One accepted judgement of the batch. */
export interface BatchJudgment {
  readonly candidate_id: string;
  readonly dimension: LevelADimension;
  readonly verdict: SemanticVerdict;
  readonly reason: string;
}

/** Unambiguous identity of a pair; the separator cannot appear in an `Attempt` id. */
export function batchPairKeyOf(candidate_id: string, dimension: string): string {
  return `${candidate_id}\u0000${dimension}`;
}

/** The identity key of one REQUESTED pair - the expected set is built from these. */
export function requestedPairKeyOf(pair: BatchJudgePair): string {
  return batchPairKeyOf(pair.candidate_id, pair.dimension);
}

/* ------------------------------------------------------------------ *
 * Request
 * ------------------------------------------------------------------ */

/**
 * The batch instruction.
 *
 * 🔴 CORRECTION-02 (`json_object`): the provider is registered with `structured_output:
 *    'json_object'`, and `request.ts` turns that into `response_format: { type: 'json_object' }`.
 *    That mode has a documented PRECONDITION - the prompt must contain the word "json" - which is
 *    why the single-pair judge prompt was already corrected to say it out loud. This new prompt
 *    states it for exactly the same reason; nothing about the single-pair prompt is changed.
 * 🔴 Each pair must be judged on its own: copying one verdict across the batch, or letting one pair
 *    influence another, would fabricate the matched set.
 */
const BATCH_INSTRUCTION_TEXT = [
  '下面给出一次检索中需要判定的若干组「候选记录 × Level A 维度」取值对。',
  '每一组独立判定，互不影响；不得因为属于同一条候选记录而复制结论，也不得整批使用同一个结论。',
  '每一组只允许输出 verdict = matched 或 compared_not_matched。',
  'reason 用一句话给出该组自己的离散判定理由，不得包含任何数值、百分比、等级或权重。',
  'candidate_id 与 dimension 必须原样回抄，不得改写、不得替换成别的候选记录或别的维度。',
  '输出必须覆盖上面给出的每一组，一组不得遗漏，也不得新增上面没有给出的组。',
  '以 JSON 对象输出，并且只输出这个 JSON 对象本身，不要输出任何其它文字或代码块标记。',
].join('\n');

function pairLineOf(pair: BatchJudgePair): string {
  return JSON.stringify({
    candidate_id: pair.candidate_id,
    dimension: pair.dimension,
    current_value: pair.source_value,
    historical_value: pair.candidate_value,
  });
}

/** The machine-readable pair block of a batch request, exactly as it is uploaded. */
export function batchJudgePairsBlockOf(pairs: readonly BatchJudgePair[]): string {
  return [
    BATCH_JUDGE_PAIRS_OPEN,
    '[',
    pairs.map(pairLineOf).join(',\n'),
    ']',
    BATCH_JUDGE_PAIRS_CLOSE,
  ].join('\n');
}

/**
 * Builds the MINIMAL batch request.
 *
 * 🔴 The uploaded content is exactly: the strict `D-050` rule, the batch instruction, and one
 *    `{candidate_id, dimension, current_value, historical_value}` object per undecided pair.
 *    No workspace, no unrelated `Attempt`, no credential, no file path (§0.4 A / AC-145).
 * 🔴 The model comes from the adapter CONFIGURATION, never from business logic (AC-132).
 */
export function buildBatchDimensionJudgeRequest(
  adapter: ProviderAdapter,
  pairs: readonly BatchJudgePair[],
): AiRequest {
  return {
    provider_id: adapter.provider_id,
    model: adapter.config.model,
    messages: [
      { role: 'system', content: `${D050_STRICT_RULE_TEXT}\n\n${BATCH_INSTRUCTION_TEXT}` },
      {
        role: 'user',
        content: [
          `待判定清单（共 ${pairs.length} 项）：`,
          batchJudgePairsBlockOf(pairs),
        ].join('\n'),
      },
    ],
    structured_output: batchDimensionJudgeStructuredOutput,
  };
}

/* ------------------------------------------------------------------ *
 * Answer reading (strict allowlist + exact expected set)
 * ------------------------------------------------------------------ */

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export type BatchJudgeAnswerRead =
  | { readonly kind: 'ok'; readonly judgments: readonly BatchJudgment[] }
  | { readonly kind: 'refused'; readonly code: RetrievalLocalFailureCode; readonly detail: string };

function refuse(code: RetrievalLocalFailureCode, detail: string): BatchJudgeAnswerRead {
  return { kind: 'refused', code, detail };
}

/**
 * Reads a batch answer against the EXACT set of pairs the caller asked about.
 *
 * The checks, in a fixed order (every one of them fails the WHOLE batch - nothing is ever
 * partially accepted, and a missing pair is never defaulted to `compared_not_matched`):
 *   ① the root is a JSON object and carries no key outside the allowlist;
 *   ② `judgments` is an array;
 *   ③ every item is an object carrying exactly `candidate_id` / `dimension` / `verdict` / `reason`;
 *   ④ `candidate_id` and `dimension` are strings and the pair they denote was really REQUESTED
 *      (this single check rejects an extra pair, an unknown candidate, an unknown dimension and a
 *      pair the model silently rewrote);
 *   ⑤ no pair appears twice;
 *   ⑥ `verdict` is one of the two canonical semantic verdicts (`uncompared` is refused - only the
 *      structural rule may produce it);
 *   ⑦ `reason` is a short discrete explanation in words;
 *   ⑧ the accepted set covers every requested pair - a missing pair fails the batch.
 */
export function readBatchJudgeAnswer(
  value: unknown,
  expected: readonly BatchJudgePair[],
): BatchJudgeAnswerRead {
  if (!isPlainObject(value)) {
    return refuse('MALFORMED_STRUCTURED_RESULT', 'A batch dimension judgement must be a JSON object.');
  }
  for (const key of Object.keys(value)) {
    if (!BATCH_JUDGE_ALLOWED_KEYS.includes(key)) {
      return refuse(
        'NON_CANONICAL_JUDGE_FIELD',
        `A batch dimension judgement may only carry ${BATCH_JUDGE_ALLOWED_KEYS.join(' / ')}.`,
      );
    }
  }

  const rawJudgments = value['judgments'];
  if (!Array.isArray(rawJudgments)) {
    return refuse(
      'NON_CANONICAL_JUDGE_FIELD',
      `${BATCH_JUDGE_ALLOWED_KEYS[0] ?? 'judgments'} must be an array of judgements.`,
    );
  }

  const expectedKeys = new Set(expected.map(requestedPairKeyOf));
  const seen = new Set<string>();
  const judgments: BatchJudgment[] = [];

  for (const item of rawJudgments as readonly unknown[]) {
    if (!isPlainObject(item)) {
      return refuse('MALFORMED_STRUCTURED_RESULT', 'Every batch judgement must be a JSON object.');
    }
    for (const key of Object.keys(item)) {
      if (!BATCH_JUDGMENT_ALLOWED_KEYS.includes(key)) {
        return refuse(
          'NON_CANONICAL_JUDGE_FIELD',
          `A batch judgement may only carry ${BATCH_JUDGMENT_ALLOWED_KEYS.join(' / ')}.`,
        );
      }
    }

    const rawCandidateId = item['candidate_id'];
    const rawDimension = item['dimension'];
    if (typeof rawCandidateId !== 'string' || rawCandidateId.length === 0) {
      return refuse(
        'NON_CANONICAL_JUDGE_FIELD',
        'candidate_id must be the non-empty id of the candidate the pair was asked about.',
      );
    }
    if (typeof rawDimension !== 'string' || rawDimension.length === 0) {
      return refuse(
        'NON_CANONICAL_JUDGE_FIELD',
        'dimension must be the canonical dimension key of the pair that was asked about.',
      );
    }

    const key = batchPairKeyOf(rawCandidateId, rawDimension);
    if (seen.has(key)) {
      return refuse(
        'BATCH_JUDGMENT_SET_MISMATCH',
        `The pair ${rawCandidateId} / ${rawDimension} was judged more than once; a batch is a set.`,
      );
    }
    if (!expectedKeys.has(key)) {
      return refuse(
        'BATCH_JUDGMENT_SET_MISMATCH',
        `The batch answered a pair that was never requested (${rawCandidateId} / ${rawDimension}); candidate_id and dimension must be copied verbatim.`,
      );
    }

    const rawVerdict = item['verdict'];
    if (typeof rawVerdict !== 'string' || !SEMANTIC_VERDICTS.includes(rawVerdict as SemanticVerdict)) {
      return refuse(
        'NON_CANONICAL_JUDGE_VERDICT',
        `verdict must be one of ${SEMANTIC_VERDICTS.join(' / ')}; the structural rule alone may produce "uncompared".`,
      );
    }

    const rawReason = item['reason'];
    if (typeof rawReason !== 'string' || !isSubstantiveReason(rawReason)) {
      return refuse(
        'NON_CANONICAL_JUDGE_FIELD',
        'reason must be a short discrete explanation in words.',
      );
    }

    seen.add(key);
    judgments.push({
      candidate_id: rawCandidateId,
      dimension: rawDimension as LevelADimension,
      verdict: rawVerdict as SemanticVerdict,
      reason: rawReason.trim(),
    });
  }

  if (seen.size !== expectedKeys.size) {
    const missing = [...expectedKeys].filter((key) => !seen.has(key)).length;
    return refuse(
      'BATCH_JUDGMENT_SET_MISMATCH',
      `The batch must answer every requested pair exactly once; ${missing} of ${expectedKeys.size} are missing.`,
    );
  }

  return { kind: 'ok', judgments };
}

/* ------------------------------------------------------------------ *
 * Invocation
 * ------------------------------------------------------------------ */

export type BatchDimensionJudgeOutcome =
  | { readonly kind: 'judged'; readonly judgments: readonly BatchJudgment[] }
  | RetrievalRuntimeFailure;

export type BatchDimensionJudge = (
  pairs: readonly BatchJudgePair[],
) => Promise<BatchDimensionJudgeOutcome>;

function failure(
  code: RetrievalLocalFailureCode,
  detail: string,
  retryable: boolean,
): RetrievalRuntimeFailure {
  return {
    kind: 'runtime_incomplete',
    ai_error: null,
    local_code: code,
    detail,
    retryable,
    source_preserved: true,
  };
}

/**
 * Binds the `M10` adapter into a batch judge.
 *
 * 🔴 The caller therefore never sees the adapter: the comparison pipeline receives a function, which
 *    keeps the comparison itself pure and lets the tests run the whole retrieval with a
 *    deterministic `NOT_A_REAL_LLM_OUTPUT` double and no network at all.
 */
export function providerBatchDimensionJudge(
  adapter: ProviderAdapter,
  credential_ref: CredentialRef | null,
): BatchDimensionJudge {
  return (pairs: readonly BatchJudgePair[]): Promise<BatchDimensionJudgeOutcome> =>
    judgeBatchThroughProvider(adapter, credential_ref, pairs);
}

/**
 * Runs the one constrained batch call.
 *
 * 🔴 An EMPTY batch is refused locally and never reaches the network: with nothing undecided there
 *    is nothing to ask, and a call would only invite the model to invent a judgement.
 * 🔴 The ordered checks repeat the single-pair glue on purpose (`M6` sits BELOW
 *    `src/application/**` and must not import it); the checks themselves come from `src/ai`, so no
 *    second contract is created - only a second call site.
 * Order: validate the request -> refuse an unsupported constrained-output capability -> run the
 * adapter -> report an adapter error verbatim -> validate the answer against the exact pair set.
 * A missing, unparseable or off-schema answer is a runtime failure, never a fabricated verdict.
 */
export async function judgeBatchThroughProvider(
  adapter: ProviderAdapter,
  credential_ref: CredentialRef | null,
  pairs: readonly BatchJudgePair[],
): Promise<BatchDimensionJudgeOutcome> {
  if (pairs.length === 0) {
    return failure(
      'REQUEST_INVALID',
      'A batch dimension judgement needs at least one undecided pair; an empty batch is never sent.',
      false,
    );
  }

  const request = buildBatchDimensionJudgeRequest(adapter, pairs);
  const violations = validateAiRequest(request);
  if (violations.length > 0) {
    return failure(
      'REQUEST_INVALID',
      `The batch judge request was rejected before any network call: ${violations
        .map((violation) => violation.code)
        .join(', ')}.`,
      false,
    );
  }

  const mode = selectStructuredOutputMode(
    adapter.capability.structured_output,
    batchDimensionJudgeStructuredOutput.preferred_mode,
  );
  if (mode === 'none') {
    return failure(
      'NO_STRUCTURED_OUTPUT_AVAILABLE',
      'The configured provider offers no constrained-output mode, so discrete dimension judgements cannot be guaranteed.',
      false,
    );
  }

  const invocation: AiInvocation = {
    provider_id: adapter.provider_id,
    request,
    credential_ref,
  };
  const result: AiResult = await adapter.execute(invocation);

  if (result.kind === 'error') {
    return {
      kind: 'runtime_incomplete',
      ai_error: result.error,
      local_code: null,
      detail: result.error.message,
      retryable: result.error.retryable,
      source_preserved: true,
    };
  }

  let candidate: unknown = result.structured;
  if (candidate === null) {
    const evaluated = evaluateStructuredResponse(mode, result.text, batchDimensionJudgeStructuredOutput);
    if (evaluated.kind === 'no_structured_output_available') {
      return failure(
        'NO_STRUCTURED_OUTPUT_AVAILABLE',
        'The provider answer carried no constrained structure to validate.',
        false,
      );
    }
    if (evaluated.kind !== 'valid') {
      return failure(
        'MALFORMED_STRUCTURED_RESULT',
        `The provider answer did not match the requested structure (${evaluated.kind}).`,
        true,
      );
    }
    candidate = evaluated.value;
  }

  const read = readBatchJudgeAnswer(candidate, pairs);
  if (read.kind === 'refused') {
    /*
     * The request itself was well formed, so a constrained retry may plausibly produce a usable
     * answer. 🔴 Retryable never means "accept a weaker answer": nothing is stored from a refusal.
     */
    return failure(read.code, read.detail, true);
  }
  return { kind: 'judged', judgments: read.judgments };
}
