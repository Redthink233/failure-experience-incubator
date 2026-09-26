/**
 * Deterministic fixtures for the S01-01 test suite.
 *
 * These are test doubles only. They are NOT Demo seed data and are NOT product data
 * (`D8` / `TQ10` Demo rules are untouched by S01-01).
 *
 * IDs are hand-written valid `ATT_` / `INS_` / `HYP_` values so the assertions stay
 * deterministic; they are parsed by the same `parseObjectId` used in production.
 */

import { provided } from '../../domain/types/presence.js';
import type { Attempt } from '../../domain/types/attempt.js';
import { createDraftAttempt } from '../../domain/types/attempt.js';
import { decisionInferenceItem, factItem } from '../../domain/types/source-type.js';
import type { ObjectId } from '../../domain/ids/object-id.js';

export const FIXED_TIME = '2026-09-24T00:00:00.000Z';
export const LATER_TIME = '2026-09-24T01:00:00.000Z';

/** 26 Crockford Base32 characters after the prefix. */
export const FIXED_ATTEMPT_ID = 'ATT_00000000000000000000000000' as ObjectId<'ATT'>;
export const SECOND_ATTEMPT_ID = 'ATT_0000000000000000000000000A' as ObjectId<'ATT'>;
export const FIXED_INSIGHT_ID = 'INS_00000000000000000000000001' as ObjectId<'INS'>;
export const FIXED_HYPOTHESIS_ID = 'HYP_00000000000000000000000002' as ObjectId<'HYP'>;

export function makeDraft(overrides: Partial<Attempt> = {}): Attempt {
  const base = createDraftAttempt({
    attempt_id: FIXED_ATTEMPT_ID,
    raw_text: '我把热风温度提到 70 度想缩短干燥时间，结果开裂更严重了。',
    created_at: FIXED_TIME,
  });
  return { ...base, ...overrides };
}

/** A gate-satisfying `Formal Attempt`: goal + attempt + result + confirmed status. */
export function makeFormal(overrides: Partial<Attempt> = {}): Attempt {
  const base = makeDraft({
    state: 'Formal',
    updated_at: LATER_TIME,
    goal: provided(factItem('CI-goal', '缩短干燥时长')),
    actual_attempt: provided(factItem('CI-approach', '提升热风温度')),
    condition: provided(factItem('CI-condition', '50 摄氏度')),
    actual_result: provided(factItem('CI-result', '出现明显开裂')),
    result_status: provided(
      decisionInferenceItem('CI-status', 'Failed', 'accepted'),
    ),
  });
  return { ...base, ...overrides };
}
