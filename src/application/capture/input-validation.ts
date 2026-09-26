/**
 * S01-05 ｜ Step ① input validation (the ONE entry gate).
 *
 * Contract: §9 step ① / `D-047` / AC-87 / AC-88
 *   - the only gate is "the input is non-empty and not pure whitespace";
 *   - 🔴 NO character-count threshold (「≥ 8 字符」is formally repealed, AC-88);
 *   - 🔴 NO sentence count, NO form filling, NO failure category, NO AI pre-check;
 *   - a rejected input is an ENTRY HINT, never a system error and never a reason to refuse
 *     creating a Draft.
 *
 * The domain helper `isNonBlankAttemptInput` is the single source of truth for the gate; this
 * file adds only the application-facing result shape (a hint the UI can render) and the
 * whitespace-preserving "accepted" payload.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import { isNonBlankAttemptInput } from '../../domain/types/attempt.js';
import type { CaptureInputValidation } from './types.js';

/** What the entry surface shows for an empty / whitespace-only input (AC-87). */
export const EMPTY_INPUT_ENTRY_HINT =
  '请先把这次尝试用你自己的话写下来，哪怕只有一句；这里有内容才能开始记录。';

/**
 * Validates the user's natural-language input for step ①.
 *
 * 🔴 The raw text is returned UNCHANGED when accepted: the user's wording is the `Fact` and
 *    must never be trimmed, normalized or rewritten by the application (§4.2 rule 3).
 * 🔴 A single non-blank character is accepted - there is no minimum length (AC-88).
 */
export function validateAttemptCaptureInput(rawText: string): CaptureInputValidation {
  if (!isNonBlankAttemptInput(rawText)) {
    return {
      kind: 'rejected',
      code: 'EMPTY_OR_WHITESPACE_ONLY',
      entry_hint: EMPTY_INPUT_ENTRY_HINT,
    };
  }
  return { kind: 'accepted', raw_text: rawText };
}
