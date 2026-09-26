/**
 * S01 ｜ `M9` `M9-HYGIENE-01` - the step ⑨ operation id TOKEN codec (`encode` ↔ `decode`).
 *
 * Contract: §2.4 / `D-051` (a batch relation is NEVER a version number), §3.2 rules 1-3 (an identity is
 * globally unique, stable, non-reusable and NEVER derived from a file name, a title, a text similarity
 * or a list position), `AC-122` (no version system), §36 (the durable operation anchor of one step ⑨
 * generation).
 *
 * 🔴 WHAT THIS SUITE PROTECTS: `hypothesisOperationKey` places the encoded `operation_id` into a PATH
 *    SEGMENT, so the token must be (①) PATH-SAFE and (②) INJECTIVE. A lossy encoding - dropping unsafe
 *    characters, or hashing - would map two DIFFERENT operation ids onto ONE anchor path and turn
 *    「两次不同的 operation」 into 「同一次 operation 重放」: a legitimate second generation would then
 *    silently return the FIRST one's batch.
 * 🔴 THE DEFECT THIS SUITE WAS WRITTEN FOR (`M9-HYGIENE-01`): a decoder that greedily collects EVERY
 *    consecutive `~HH` group into one byte run cannot read a token holding two or more ADJACENT
 *    multi-byte characters - it merges two valid UTF-8 sequences into one impossible run and rejects a
 *    perfectly valid token. An `operation_id` is free text, so 「操作一」 is a legal input.
 * 🔴 `encode` IS NOT TOUCHED BY THIS TASK: the golden table below pins the EXISTING token format, so a
 *    future edit to the encoder is caught here rather than silently changing persisted anchor paths.
 * 🔴 This is an `IMPLEMENTATION INVARIANT` suite: it references no product AC and adds none.
 *
 * Framework-neutral test: NO DOM, NO network, NO application runtime API - the Node built-in test
 * runner only.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  decodeOperationIdToken,
  encodeOperationIdToken,
  hypothesisOperationKey,
} from '../../../application/hypothesis/identity.js';

/** The alphabet the token must stay inside: `[A-Za-z0-9_-]` plus the `~` escape lead. */
const PATH_SAFE_TOKEN = /^[A-Za-z0-9_~-]*$/;

describe('M9 ｜ IMPLEMENTATION INVARIANT｜operation id token codec (M9-HYGIENE-01)', () => {
  /* ------------------------------------------------------------------ *
   * C1-C8 - the required roundtrip cases
   * ------------------------------------------------------------------ */

  /**
   * 🔴 C2, C3, C4 and C8 are precisely the cases a GREEDY decoder cannot read (two or more ADJACENT
   *    multi-byte characters). C1 / C5 / C6 / C7 pin the cases that never went through the multi-byte
   *    path, so a "fix" that breaks plain ASCII is caught too.
   */
  const ROUNDTRIP_CASES: readonly (readonly [string, string, string])[] = [
    ['C1', 'a plain ASCII operation id', 'op-abc_123'],
    ['C2', 'two ADJACENT Chinese characters', '操作'],
    ['C3', 'three ADJACENT Chinese characters', '操作一'],
    ['C4', 'Chinese followed by ASCII', '操作一#a'],
    ['C5', 'the escape character itself', '~'],
    ['C6', 'a path separator', '/'],
    ['C7', 'a space', ' '],
    ['C8', 'Chinese + ASCII + `~` + `/` combined', '操作一#a~b/c'],
  ];

  for (const [label, description, value] of ROUNDTRIP_CASES) {
    it(`IMPLEMENTATION INVARIANT (${label}): decode(encode(x)) === x for ${description}`, () => {
      const token = encodeOperationIdToken(value);
      assert.equal(PATH_SAFE_TOKEN.test(token), true, `the token must be path-safe: ${token}`);
      assert.equal(decodeOperationIdToken(token), value);
    });
  }

  /* ------------------------------------------------------------------ *
   * The encoder format is FROZEN by this task - pin it with golden values
   * ------------------------------------------------------------------ */

  it('IMPLEMENTATION INVARIANT: the encoder format is unchanged - golden tokens for every case', () => {
    /*
     * 🔴 These are hand-computed UTF-8 percent-encodings, not values read back from the implementation,
     *    so they really do constrain the format. `~HH` is always UPPERCASE and always two digits.
     */
    const golden: readonly (readonly [string, string])[] = [
      ['op-abc_123', 'op-abc_123'],
      ['操作', '~E6~93~8D~E4~BD~9C'],
      ['操作一', '~E6~93~8D~E4~BD~9C~E4~B8~80'],
      ['~', '~7E'],
      ['/', '~2F'],
      [' ', '~20'],
      ['操作一#a~b/c', '~E6~93~8D~E4~BD~9C~E4~B8~80~23a~7Eb~2Fc'],
    ];
    for (const [value, token] of golden) {
      assert.equal(encodeOperationIdToken(value), token, `encode(${value}) must be stable`);
    }
  });

  /* ------------------------------------------------------------------ *
   * Collision guard - injectivity
   * ------------------------------------------------------------------ */

  it('IMPLEMENTATION INVARIANT: different operation ids never collide, and the escape cannot be forged', () => {
    /*
     * 🔴 The pairs the anchor identity must keep apart. The last three are the "looks like an escape"
     *    traps: an operation id that literally CONTAINS `~2F` must not reach the same anchor as the
     *    operation id that contains a real `/`.
     */
    const distinct_pairs: readonly (readonly [string, string])[] = [
      ['操作一', '操作二'],
      ['x~79', 'xy'],
      ['a/b', 'a~2Fb'],
      ['op a#b', 'op a'],
    ];
    for (const [left, right] of distinct_pairs) {
      assert.notEqual(
        encodeOperationIdToken(left),
        encodeOperationIdToken(right),
        `encode("${left}") and encode("${right}") must differ`,
      );
    }

    /* And the whole sample set stays injective as a set, not only pairwise. */
    const sample = [
      'op-abc_123',
      '操作一',
      '操作二',
      '~',
      '/',
      ' ',
      'x~79',
      'xy',
      'a/b',
      'a~2Fb',
      'op a',
      'op a#b',
      '操作一#a~b/c',
    ];
    assert.equal(new Set(sample).size, sample.length, 'the sample itself must be distinct');
    assert.equal(
      new Set(sample.map((value) => encodeOperationIdToken(value))).size,
      sample.length,
      'two different operation ids encoded onto one token',
    );
  });

  /* ------------------------------------------------------------------ *
   * A malformed token is refused, never partially decoded
   * ------------------------------------------------------------------ */

  it('IMPLEMENTATION INVARIANT: a malformed token is refused instead of being partially decoded', () => {
    const malformed = [
      '~', /* an escape with no pair at all */
      '~2', /* a truncated pair */
      '~2G', /* not hexadecimal */
      '~e6', /* the canonical format is uppercase */
      '~E6', /* a lead byte with no continuation */
      '~E6~93', /* an incomplete three-byte run */
      '~E6~93~8D~', /* a trailing escape */
      '~FF', /* an impossible lead byte */
      '~80', /* a bare continuation byte */
      'a b', /* a raw, unencoded space */
      'a/b', /* a raw, unencoded separator */
    ];
    for (const token of malformed) {
      assert.equal(decodeOperationIdToken(token), null, `"${token}" must be refused`);
    }
  });

  /* ------------------------------------------------------------------ *
   * The real consumer of the codec
   * ------------------------------------------------------------------ */

  it('IMPLEMENTATION INVARIANT: the anchor key binds the encoded token to its source record', () => {
    assert.equal(hypothesisOperationKey('ATT_A', 'op-1'), 'ATT_A__op-1');
    assert.equal(
      hypothesisOperationKey('ATT_A', '操作一'),
      'ATT_A__~E6~93~8D~E4~BD~9C~E4~B8~80',
    );
    /* The same operation on a DIFFERENT record, and a different operation on the SAME record, both
       receive a different anchor path - which is what makes `OPERATION_ID_CONFLICT` reportable. */
    assert.notEqual(
      hypothesisOperationKey('ATT_A', 'op-1'),
      hypothesisOperationKey('ATT_B', 'op-1'),
    );
    assert.notEqual(
      hypothesisOperationKey('ATT_A', 'op-1'),
      hypothesisOperationKey('ATT_A', 'op-2'),
    );
    assert.equal(
      PATH_SAFE_TOKEN.test(hypothesisOperationKey('ATT_A', '操作一#a~b/c')),
      true,
      'the anchored key must stay a single path-safe segment',
    );
  });
});
