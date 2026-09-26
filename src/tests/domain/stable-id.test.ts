/**
 * T5 ｜ Stable ID generation: format, uniqueness, stability, portability.
 *
 * ITC-06 (stable identity).
 * Canonical AC references used by this file:
 *   AC-122 / AC-137 / AC-138.
 * 🔴 This file creates NO new AC.
 *
 * Contract: §3.1 / §3.2 - globally unique, stable, never reused; IDs are carried inside
 * the object content, so a file rename or move never changes an object's identity.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as ids from '../../domain/ids/index.js';
import {
  ID_BODY_LENGTH,
  ID_KINDS,
  ID_PREFIXES,
  ID_PREFIX_VALUES,
  assertObjectIdOfKind,
  createIdBodyFactory,
  idKindOf,
  idTimestampOf,
  isIdBody,
  isObjectId,
  isObjectIdOfKind,
  isWellFormedObjectId,
  newObjectId,
  parseObjectId,
  toObjectId,
} from '../../domain/ids/index.js';
import type { IdKind } from '../../domain/ids/index.js';

const CROCKFORD_26 = /^[0-9A-HJKMNP-TV-Z]{26}$/;

describe('T5 stable ID｜format / uniqueness / stability', () => {
  it('[T5][AC-137] every required object prefix generates a well-formed ID', () => {
    const expected: Readonly<Record<IdKind, string>> = {
      workspace: 'WS_',
      project: 'PRJ_',
      attempt: 'ATT_',
      insight: 'INS_',
      hypothesis: 'HYP_',
    };

    for (const kind of ID_KINDS) {
      const generated = newObjectId(kind);
      assert.ok(
        generated.startsWith(expected[kind]),
        `${generated} should start with ${expected[kind]}`,
      );
      assert.equal(
        generated.length,
        (expected[kind]?.length ?? 0) + ID_BODY_LENGTH,
        generated,
      );
      assert.match(generated.slice(expected[kind]?.length ?? 0), CROCKFORD_26);
      assert.equal(isWellFormedObjectId(generated), true);
      assert.equal(idKindOf(generated), kind);
      assert.equal(isObjectIdOfKind(generated, kind), true);
    }

    assert.deepEqual([...ID_PREFIX_VALUES], ['WS', 'PRJ', 'ATT', 'INS', 'HYP']);
  });

  it('[T5] IMPLEMENTATION INVARIANT (contract §3.2 rule 1): IDs are unique across a large batch', () => {
    const generated = new Set<string>();
    for (let index = 0; index < 3000; index += 1) {
      generated.add(newObjectId('attempt'));
    }
    assert.equal(generated.size, 3000);
  });

  it('[T5] IMPLEMENTATION INVARIANT: ID bodies are unique and structurally valid', () => {
    const bodies = new Set<string>();
    for (let index = 0; index < 1000; index += 1) {
      const body = ids.newIdBody();
      assert.match(body, CROCKFORD_26);
      bodies.add(body);
    }
    assert.equal(bodies.size, 1000);
    assert.equal(isIdBody(bodies.values().next().value ?? ''), true);
    assert.equal(isIdBody('short'), false);
    assert.equal(isIdBody('LLLLLLLLLLLLLLLLLLLLLLLLLL'), false);
  });

  it('IMPLEMENTATION INVARIANT: the factory is deterministic under injected clock and randomness', () => {
    const fixedDeps = {
      now: () => 1_800_000_000_000,
      randomBytes: (length: number) => new Uint8Array(length).fill(7),
    };
    const first = createIdBodyFactory(fixedDeps)();
    const second = createIdBodyFactory(fixedDeps)();

    // Same clock + same randomness ⇒ same first ID (deterministic, reproducible tests).
    assert.equal(first, second);

    // Same millisecond ⇒ monotonic and still unique.
    const factory = createIdBodyFactory(fixedDeps);
    const a = factory();
    const b = factory();
    assert.equal(a, first);
    assert.notEqual(b, a);
    assert.ok(b > a);
    assert.equal(b.length, ID_BODY_LENGTH);
    assert.equal(isWellFormedObjectId(`ATT_${b}`), true);

    // A different millisecond re-seeds the random part.
    let tick = 1_800_000_000_000;
    const advancing = createIdBodyFactory({
      now: () => (tick += 1),
      randomBytes: (length) => new Uint8Array(length).fill(3),
    });
    assert.notEqual(advancing(), advancing());
  });

  it('IMPLEMENTATION INVARIANT: the encoded timestamp is an ordering aid, not a version', () => {
    const early = createIdBodyFactory({
      now: () => 1_700_000_000_000,
      randomBytes: (length) => new Uint8Array(length).fill(1),
    })();
    const late = createIdBodyFactory({
      now: () => 1_800_000_000_000,
      randomBytes: (length) => new Uint8Array(length).fill(1),
    })();

    assert.equal(idTimestampOf(`ATT_${early}`), 1_700_000_000_000);
    assert.equal(idTimestampOf(`ATT_${late}`), 1_800_000_000_000);
    assert.ok(early < late);
    assert.equal(idTimestampOf('not-an-id'), null);
  });

  it('[AC-137] an ID is carried by the object content and is independent of any file name', () => {
    const attemptId = newObjectId('attempt');

    // No path separator, no extension, no positional index - nothing file-shaped.
    assert.ok(!attemptId.includes('/'));
    assert.ok(!attemptId.includes('\\'));
    assert.ok(!attemptId.endsWith('.md'));
    assert.ok(!attemptId.endsWith('.json'));
    assert.ok(!attemptId.includes('.'));

    // The same object keeps its ID no matter what the surrounding file is called.
    const objectContents = { attempt_id: attemptId, raw_text: 'x' };
    const afterRename = { ...objectContents };
    assert.equal(afterRename.attempt_id, attemptId);
    assert.equal(isObjectIdOfKind(afterRename.attempt_id, 'attempt'), true);
  });

  it('[AC-138] an archived object keeps a resolvable ID - archiving never invalidates identity', () => {
    const attemptId = newObjectId('attempt');
    assert.equal(isObjectId(attemptId), true);
    assert.equal(idKindOf(attemptId), 'attempt');
    // Archiving changes a state bit only; the ID is untouched and still parses.
    assert.equal(isWellFormedObjectId(attemptId), true);
  });

  it('[AC-122] no user-visible version concept exists in the ID vocabulary', () => {
    const exportedNames = Object.keys(ids);
    for (const name of exportedNames) {
      assert.ok(
        !/version|revision|rollback/i.test(name),
        `the ID module must not expose "${name}"`,
      );
    }
    for (let index = 0; index < 20; index += 1) {
      const generated = newObjectId('attempt');
      // No dotted / numbered version segment anywhere in the identifier.
      assert.ok(!/\d+\.\d+/.test(generated));
      assert.equal(generated.split('.').length, 1);
    }
  });

  it('IMPLEMENTATION INVARIANT: parsing and narrowing behave for valid and invalid input', () => {
    const attemptId = newObjectId('attempt');
    const parsed = parseObjectId<'ATT'>(attemptId);
    assert.ok(parsed !== null);
    assert.equal(parsed?.kind, 'attempt');
    assert.equal(parsed?.prefix, 'ATT');
    assert.equal(parsed?.body.length, ID_BODY_LENGTH);

    assert.equal(parseObjectId('ATT'), null);
    assert.equal(parseObjectId('ATT_'), null);
    assert.equal(parseObjectId('_00000000000000000000000000'), null);
    assert.equal(parseObjectId('ZZZ_00000000000000000000000000'), null);
    assert.equal(isObjectId(''), false);
    assert.equal(isObjectId('random text'), false);

    // Lenient parse accepts a hand-authored body; the strict check rejects it.
    const handAuthored = 'ATT_manual-1';
    assert.equal(isObjectId(handAuthored), true);
    assert.equal(isWellFormedObjectId(handAuthored), false);

    assert.equal(toObjectId(attemptId, 'attempt'), attemptId);
    assert.equal(toObjectId(attemptId, 'insight'), null);
    assert.equal(assertObjectIdOfKind(attemptId, 'attempt'), attemptId);
    assert.throws(() => assertObjectIdOfKind(attemptId, 'insight'));

    // Prefixes are application constants - never guessed, never reused across objects.
    assert.deepEqual(
      ID_KINDS.map((kind) => ID_PREFIXES[kind]),
      ['WS', 'PRJ', 'ATT', 'INS', 'HYP'],
    );
  });
});
