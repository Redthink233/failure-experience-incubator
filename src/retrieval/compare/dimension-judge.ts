/**
 * S01-03 ｜ `R-A` stage 3: the DISCRETE dimension judge (`D-061` / `D-050`).
 *
 * Contract basis:
 *   - `D-061` (`TQ04` FINAL): `R-A` = Structured Field Rules + a dimension-level DISCRETE judgement
 *     when the rules cannot decide reliably;
 *   - `D-050` / §9.4: `matched` requires strict semantic overlap; "same category / same topic / same
 *     parameter type / same indicator name / same phenomenon / same broad technology" is explicitly
 *     NOT sufficient;
 *   - §0.4 A: only the MINIMAL context needed for the current operation may be sent;
 *   - §0.4 D / `D-055`: the call goes through the injected `M10` `ProviderAdapter` - never a raw
 *     fetch, never a provider SDK, never the browser-direct or thin-proxy concrete implementation.
 *
 * 🔴 The answer schema offers EXACTLY two values and EXACTLY two fields. It cannot express
 *    `uncompared` (the structural `unknown` interception already happened BEFORE any AI call), and
 *    it cannot carry a numeric or levelled quantity - the reader accepts `verdict` + `reason` and
 *    refuses every other key by ALLOWLIST, so no forbidden field name has to be enumerated here.
 * 🔴 A refused or failed answer is `RETRIEVAL_RUNTIME_INCOMPLETE`. It is never turned into
 *    `matched`, never into `compared_not_matched` and never into a partial candidate list.
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
import { LEVEL_A_DIMENSION_LABELS } from '../../domain/types/level-a.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import type { RetrievalRuntimeFailure } from './types.js';

/** Caller-owned schema id. 🔴 Not a product version system (AC-122). */
export const DIMENSION_JUDGE_SCHEMA_ID = 'level-a-dimension-judge-v1';

/** The ONLY keys a judge answer may contain. Everything else is refused by allowlist. */
export const DIMENSION_JUDGE_ALLOWED_KEYS: readonly string[] = ['verdict', 'reason'];

export const dimensionJudgeJsonSchema: Readonly<Record<string, unknown>> = {
  type: 'object',
  required: ['verdict', 'reason'],
  properties: {
    verdict: { type: 'string' },
    reason: { type: 'string' },
  },
};

export const dimensionJudgeStructuredOutput: StructuredOutputRequest = {
  schema_id: DIMENSION_JUDGE_SCHEMA_ID,
  json_schema: dimensionJudgeJsonSchema,
  preferred_mode: PREFERRED_STRUCTURED_OUTPUT_MODE,
};

/**
 * The strict rule handed to the judge - a faithful restatement of `D-050` / §9.4.
 * 🔴 It is a rule statement, not a prompt trick: it tells the judge what does NOT count.
 */
export const D050_STRICT_RULE_TEXT = [
  '严格语义重叠判据（D-050）：只有当两侧表达「相同的实质内容」或「语义等价的改写」时，才允许判 matched。',
  '允许判 matched 的等价形式只有：① 同义改写；② 表述顺序不同但实质相同；③ 单位等价表达；④ 不改变实质含义的语言改写。',
  '以下情形明确不充分，不得据此判 matched：属于同一类别；属于同一主题；使用同一参数类型；使用同一指标名称；',
  '都在讨论同一种现象；都属于同一种技术大类；同一参数族 / 技术类别下的不同具体技术对象或参数对象。',
  '例如「50°C」与「70°C」、出现明显开裂与无明显开裂、含水率仍偏高与含水率达到要求、调整热风参数与调整送风参数，',
  '都属于 compared_not_matched，而不是 matched。',
].join('\n');

const JUDGE_INSTRUCTION_TEXT = [
  '你只判定一个 Level A 维度上的两个取值是否构成严格语义重叠。',
  '只允许输出 verdict = matched 或 compared_not_matched。',
  'reason 用一句话给出离散的判定理由，不得包含任何数值、百分比、等级或权重。',
].join('\n');

export interface DimensionJudgeInput {
  readonly dimension: LevelADimension;
  readonly source_value: string;
  readonly candidate_value: string;
}

/**
 * Builds the MINIMAL judge request.
 *
 * 🔴 It carries the single dimension, the two values and the strict rule - never the workspace,
 *    never the rest of the history and never content unrelated to this dimension (§0.4 A / task §13).
 * 🔴 The model comes from the adapter CONFIGURATION, never from business logic (AC-132).
 */
export function buildDimensionJudgeRequest(
  adapter: ProviderAdapter,
  input: DimensionJudgeInput,
): AiRequest {
  return {
    provider_id: adapter.provider_id,
    model: adapter.config.model,
    messages: [
      { role: 'system', content: `${D050_STRICT_RULE_TEXT}\n\n${JUDGE_INSTRUCTION_TEXT}` },
      {
        role: 'user',
        content: [
          `维度：${LEVEL_A_DIMENSION_LABELS[input.dimension]}（${input.dimension}）`,
          `本次记录的取值：${input.source_value}`,
          `历史记录的取值：${input.candidate_value}`,
        ].join('\n'),
      },
    ],
    structured_output: dimensionJudgeStructuredOutput,
  };
}

/* ------------------------------------------------------------------ *
 * Answer reading (strict allowlist)
 * ------------------------------------------------------------------ */

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** At least one letter or CJK character - an all-digit / all-punctuation "reason" is not a reason. */
function hasSubstantiveCharacter(value: string): boolean {
  return /\p{L}/u.test(value);
}

export type JudgeAnswerRead =
  | { readonly kind: 'ok'; readonly verdict: SemanticVerdict; readonly reason: string }
  | { readonly kind: 'refused'; readonly code: RetrievalRuntimeFailure['local_code']; readonly detail: string };

/**
 * Reads a judge answer.
 *
 * Refusals, in a fixed order: not an object → a key outside the allowlist (this is the single check
 * that keeps every numeric / levelled / probabilistic field out) → a missing or non-string field →
 * a verdict outside the two allowed values (an `uncompared` answer is refused here) → an empty
 * reason.
 */
export function readJudgeAnswer(value: unknown): JudgeAnswerRead {
  if (!isPlainObject(value)) {
    return {
      kind: 'refused',
      code: 'MALFORMED_STRUCTURED_RESULT',
      detail: 'A dimension judgement must be a JSON object.',
    };
  }
  for (const key of Object.keys(value)) {
    if (!DIMENSION_JUDGE_ALLOWED_KEYS.includes(key)) {
      return {
        kind: 'refused',
        code: 'NON_CANONICAL_JUDGE_FIELD',
        detail: `A dimension judgement may only carry ${DIMENSION_JUDGE_ALLOWED_KEYS.join(' / ')}.`,
      };
    }
  }

  const rawVerdict = value['verdict'];
  if (typeof rawVerdict !== 'string') {
    return {
      kind: 'refused',
      code: 'NON_CANONICAL_JUDGE_FIELD',
      detail: 'verdict must be a string.',
    };
  }
  if (!SEMANTIC_VERDICTS.includes(rawVerdict as SemanticVerdict)) {
    return {
      kind: 'refused',
      code: 'NON_CANONICAL_JUDGE_VERDICT',
      detail: `verdict must be one of ${SEMANTIC_VERDICTS.join(' / ')}; the structural rule alone may produce "uncompared".`,
    };
  }

  const rawReason = value['reason'];
  if (typeof rawReason !== 'string') {
    return {
      kind: 'refused',
      code: 'NON_CANONICAL_JUDGE_FIELD',
      detail: 'reason must be a string.',
    };
  }
  const reason = rawReason.trim();
  if (reason.length === 0 || !hasSubstantiveCharacter(reason)) {
    return {
      kind: 'refused',
      code: 'NON_CANONICAL_JUDGE_FIELD',
      detail: 'reason must be a short discrete explanation in words.',
    };
  }

  return { kind: 'ok', verdict: rawVerdict as SemanticVerdict, reason };
}

/* ------------------------------------------------------------------ *
 * Invocation
 * ------------------------------------------------------------------ */

export type DimensionJudgeOutcome =
  | { readonly kind: 'judged'; readonly verdict: SemanticVerdict; readonly reason: string }
  | RetrievalRuntimeFailure;

function failure(
  code: RetrievalRuntimeFailure['local_code'],
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

export type DimensionJudge = (input: DimensionJudgeInput) => Promise<DimensionJudgeOutcome>;

/**
 * Binds the `M10` adapter into a comparator-friendly judge.
 *
 * 🔴 The comparator therefore never sees the adapter: it receives a judge function, which keeps the
 *    comparison itself pure and lets the tests run the whole pipeline with a deterministic
 *    `NOT_A_REAL_LLM_OUTPUT` double and no network at all.
 */
export function providerDimensionJudge(
  adapter: ProviderAdapter,
  credential_ref: CredentialRef | null,
): DimensionJudge {
  return (input: DimensionJudgeInput): Promise<DimensionJudgeOutcome> =>
    judgeDimensionThroughProvider(adapter, credential_ref, input);
}

/**
 * Runs one constrained judge call.
 *
 * 🔴 This glue repeats the ordered checks of the capture path on purpose: `M6` sits BELOW
 *    `src/application/**` and must not import it. The checks themselves come from `src/ai` (the
 *    frozen `M10` contract), so no second contract is created - only a second call site.
 *
 * Order: validate the request → refuse an unsupported constrained-output capability → run the
 * adapter → report an adapter error verbatim → validate the answer. A missing, unparseable or
 * off-schema answer is a runtime failure, never a fabricated verdict.
 */
export async function judgeDimensionThroughProvider(
  adapter: ProviderAdapter,
  credential_ref: CredentialRef | null,
  input: DimensionJudgeInput,
): Promise<DimensionJudgeOutcome> {
  const request = buildDimensionJudgeRequest(adapter, input);
  const violations = validateAiRequest(request);
  if (violations.length > 0) {
    return failure(
      'REQUEST_INVALID',
      `The judge request was rejected before any network call: ${violations
        .map((violation) => violation.code)
        .join(', ')}.`,
      false,
    );
  }

  const mode = selectStructuredOutputMode(
    adapter.capability.structured_output,
    dimensionJudgeStructuredOutput.preferred_mode,
  );
  if (mode === 'none') {
    return failure(
      'NO_STRUCTURED_OUTPUT_AVAILABLE',
      'The configured provider offers no constrained-output mode, so a discrete dimension judgement cannot be guaranteed.',
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
    const evaluated = evaluateStructuredResponse(mode, result.text, dimensionJudgeStructuredOutput);
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

  const read = readJudgeAnswer(candidate);
  if (read.kind === 'refused') {
    /*
     * The request itself was well formed, so a constrained retry may plausibly produce a usable
     * answer. 🔴 Retryable never means "accept a weaker answer": nothing is stored from a refusal.
     */
    return failure(read.code, read.detail, true);
  }
  return { kind: 'judged', verdict: read.verdict, reason: read.reason };
}
