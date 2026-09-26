/**
 * S01 ｜ `M9` step ⑨ batch PATH SAFETY ｜ `PSA-A-CORRECTION-M9-PATH-01`.
 *
 * 🔴 THE DEFECT THIS SUITE CLOSES. `newHypothesisBatchId` mints
 *    `ATT_…:hypothesis-batch:<ULID body>`. A `:` is a LEGAL logical-id character but an ILLEGAL Windows
 *    file-name character. `hypothesisBatchPath` used to embed the logical id VERBATIM, so on Windows the
 *    step ⑨ batch write could never land - the SAME SHAPE as the already-repaired step ⑧ defect
 *    (`PSA-A-CORRECTION-M8-PATH-01`, whose interrupted PSA-A run left `insights/batches/` empty while
 *    the operation anchor stayed `in_progress`, so the step could never become `done`).
 * 🔴 THE BOUNDARY THIS SUITE PINS. The LOGICAL `batch_id` is immutable and is NEVER encoded: it keeps
 *    its original value inside the domain object, the batch JSON and the operation anchor. ONLY the
 *    physical file name is encoded, REVERSIBLY, with `M9`'s OWN EXISTING `~HH` codec
 *    (`encodeOperationIdToken`). No second sanitising rule set is introduced, and `M9` gains no runtime
 *    dependency on `src/application/insight/**`.
 * 🔴 THE FILE NAME IS NEVER IDENTITY (§3.2 rule 3 / AC-137). Discovery reads the `batch_id` INSIDE the
 *    document, so this suite also proves that a batch file renamed to something unrelated still
 *    resolves by content.
 * 🔴 THE OPERATION ANCHOR IS NOT TOUCHED. `hypothesisOperationKey` already applies the codec when it
 *    builds `<source_attempt_id>__<encoded operation_id>`, so `hypothesisOperationAnchorPath` must NOT
 *    encode again - doing so would move every already-persisted anchor and orphan a pending recovery.
 * 🔴 A ROUND-TRIP BUG IS EXPLICITLY GUARDED: consecutive multi-byte (Chinese) characters and runs of
 *    consecutive special characters must both survive `encode → decode` unchanged. Reading a run of
 *    `~HH` groups greedily is a real defect this module has already had once (`M9-HYGIENE-01`).
 *
 * 🔴 No model, no provider and no network are involved anywhere: every document here is a hand-written
 *    fixture, or is produced through the REAL application service driven by the suite's fake provider
 *    adapter (`NOT_A_REAL_LLM_OUTPUT`). `Real Provider Calls = 0`.
 *
 * Canonical ACs referenced: AC-130 (Local Workspace files), AC-137 (resolution by content).
 * Everything else is labelled `IMPLEMENTATION INVARIANT` and adds no `AC`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  HYPOTHESIS_BATCHES_DIRECTORY,
  HYPOTHESIS_GENERATION_BATCH_OBJECT_TYPE,
  hypothesisBatchPath,
  hypothesisOperationAnchorPath,
  parseHypothesisBatch,
} from '../../../application/hypothesis/persistence.js';
import {
  decodeOperationIdToken,
  encodeOperationIdToken,
  hypothesisOperationKey,
  isHypothesisBatchId,
  newHypothesisBatchId,
} from '../../../application/hypothesis/identity.js';
import { createHypothesisRepository } from '../../../application/hypothesis/hypothesis-repository.js';
import type { HypothesisGenerationBatch } from '../../../application/hypothesis/types.js';
import { InMemoryWorkspaceStorage } from '../../../workspace/memory-storage.js';
import {
  at,
  generationAnswerOf,
  groundedAnswer,
  ID_SOURCE,
  seedStandardFixture,
} from './harness.js';

/* ------------------------------------------------------------------ *
 * The Windows physical-name contract
 * ------------------------------------------------------------------ */

/** The characters a Windows file name can NEVER contain. */
const WINDOWS_ILLEGAL_FILENAME_CHARACTERS = /[<>:"/\\|?*]/;

/** The reserved DOS device basenames, illegal as a basename whatever the extension. */
const WINDOWS_RESERVED_BASENAMES = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/iu;

const JSON_EXTENSION = '.json';

function basenameOf(path: string): string {
  const index = path.lastIndexOf('/');
  return index < 0 ? path : path.slice(index + 1);
}

/** The file name without its extension - i.e. the encoded token. */
function stemOf(path: string): string {
  const name = basenameOf(path);
  return name.endsWith(JSON_EXTENSION) ? name.slice(0, -JSON_EXTENSION.length) : name;
}

/** The 26-character ULID body used by the hand-written fixtures below. */
const BODY_A = '0000000000000000000000000A';
const BODY_B = '0000000000000000000000000B';

const SOURCE_ATTEMPT = `ATT_${BODY_A}`;

/** A logical batch id in EXACTLY the shape `newHypothesisBatchId` mints - `:` separators included. */
const LOGICAL_BATCH_ID = `${SOURCE_ATTEMPT}:hypothesis-batch:${BODY_B}`;

/** A SECOND well-formed logical batch id for the SAME source record: a legitimate second generation. */
const SECOND_LOGICAL_BATCH_ID = `${SOURCE_ATTEMPT}:hypothesis-batch:${BODY_A}`;

/**
 * The ids a physical name must keep apart.
 *
 * 🔴 This sample is deliberately NOT restricted to schema-valid batch ids: it is used ONLY against the
 *    pure string function `hypothesisBatchPath`, to prove the mapping is INJECTIVE - including over
 *    each other's NAIVE encodings. The real-persistence cases below use `newHypothesisBatchId` output,
 *    because `parseHypothesisBatch` only accepts the minted shape.
 */
const COLLISION_SAMPLE: readonly string[] = [
  LOGICAL_BATCH_ID,
  `${SOURCE_ATTEMPT}:hypothesis-batch:${BODY_A}`,
  /* 🔴 The NAIVE encoding of `LOGICAL_BATCH_ID`. If `~` were left unencoded, these two would land on
     ONE physical file and a legitimate second generation would silently be read as the first. */
  `${SOURCE_ATTEMPT}~3Ahypothesis-batch~3A${BODY_B}`,
  `${SOURCE_ATTEMPT}~3ahypothesis-batch~3a${BODY_B}`,
  `操作批次:hypothesis-batch:${BODY_B}`,
  `${SOURCE_ATTEMPT}%3Ahypothesis-batch%3A${BODY_B}`,
];

function zeroOutputBatch(batch_id: string, operation_id: string): HypothesisGenerationBatch {
  return {
    batch_id,
    source_attempt_id: SOURCE_ATTEMPT as never,
    operation_id,
    hypothesis_ids: [],
    model_suggestion_ids: [],
    exit_route: 'EXIT-A',
    absence_statement: 'NOT_A_REAL_LLM_OUTPUT: 手写 fixture，没有任何可引用的历史内容。',
    created_at: '2026-09-26T00:00:00.000Z',
  };
}

async function writeBatch(
  batch: HypothesisGenerationBatch,
): Promise<{ readonly storage: InMemoryWorkspaceStorage; readonly paths: readonly string[] }> {
  const storage = new InMemoryWorkspaceStorage();
  const repository = createHypothesisRepository({ storage });
  await repository.recordBatchIfAbsent(batch);
  return {
    storage,
    paths: Object.keys(storage.snapshot()).filter((path) =>
      path.startsWith(`${HYPOTHESIS_BATCHES_DIRECTORY}/`),
    ),
  };
}

/* ------------------------------------------------------------------ *
 * M9-PATH-01 … M9-PATH-11
 * ------------------------------------------------------------------ */

describe('PSA-A-CORRECTION-M9-PATH-01 ｜ step ⑨ batch persistence is path-safe', () => {
  it('M9-PATH-01 / IMPLEMENTATION INVARIANT: a logical batch id carrying two colons must never reach the physical file name', () => {
    /*
     * 🔴 The fixture is minted in the REAL shape, so this is not a synthetic string:
     *    `newHypothesisBatchId` really does separate its three segments with `:`.
     */
    assert.equal(
      isHypothesisBatchId(LOGICAL_BATCH_ID),
      true,
      'the fixture must be a well-formed batch id',
    );
    assert.equal(
      isHypothesisBatchId(newHypothesisBatchId(SOURCE_ATTEMPT), SOURCE_ATTEMPT),
      true,
      'the batch id the module really mints must be well-formed',
    );
    assert.ok(
      LOGICAL_BATCH_ID.includes(':'),
      'the fixture must carry the separator Windows refuses in a file name',
    );

    const physical = hypothesisBatchPath(LOGICAL_BATCH_ID);
    assert.ok(
      physical.startsWith(`${HYPOTHESIS_BATCHES_DIRECTORY}/`),
      'the physical location must stay inside the batch directory',
    );
    const name = basenameOf(physical);
    assert.equal(
      WINDOWS_ILLEGAL_FILENAME_CHARACTERS.test(name),
      false,
      `the physical file name must be a legal Windows name, received "${name}"`,
    );
    assert.equal(
      name.includes(':'),
      false,
      `the physical file name must carry no colon at all, received "${name}"`,
    );
  });

  it('M9-PATH-02 / IMPLEMENTATION INVARIANT: every real batch name satisfies the full Windows file-name contract', () => {
    const samples: readonly string[] = [
      ...Array.from({ length: 64 }, () => newHypothesisBatchId(SOURCE_ATTEMPT)),
      ...COLLISION_SAMPLE,
    ];
    for (const logical of samples) {
      const path = hypothesisBatchPath(logical);
      const name = basenameOf(path);
      assert.notEqual(name.length, 0, 'a physical file name may never be empty');
      assert.equal(
        WINDOWS_ILLEGAL_FILENAME_CHARACTERS.test(name),
        false,
        `illegal Windows file-name character in "${name}"`,
      );
      assert.equal(
        /[. ]$/.test(name),
        false,
        `a Windows file name may not end with "." or a space: "${name}"`,
      );
      assert.equal(
        name.startsWith('.'),
        false,
        `a physical batch file must not be a hidden dotfile: "${name}"`,
      );
      /*
       * 🔴 RESERVED DEVICE BASENAMES. Every batch id carries the stable `ATT_…:hypothesis-batch:`
       *    prefix, and `:` is encoded, so the encoded stem can never BECOME `CON` / `NUL` / `COM1` / …
       *    . This is an empirical statement over the real minted shape, not a guess: the assertion
       *    below is what would fail if a future change dropped the prefix.
       */
      assert.equal(
        WINDOWS_RESERVED_BASENAMES.test(stemOf(path)),
        false,
        `the encoded stem became a reserved Windows device name: "${stemOf(path)}"`,
      );
    }
  });

  it('M9-PATH-03 / IMPLEMENTATION INVARIANT: the physical batch name is the LOGICAL id through the module own codec', () => {
    /*
     * 🔴 ONE CODEC, NOT TWO. The physical file name must be exactly the module's existing reversible
     *    `~HH` encoding of the logical id - proving the fix REUSES that codec instead of introducing a
     *    second, differently-behaving rule set.
     */
    const physical = hypothesisBatchPath(LOGICAL_BATCH_ID);
    assert.equal(
      `${stemOf(physical)}${JSON_EXTENSION}`,
      `${encodeOperationIdToken(LOGICAL_BATCH_ID)}${JSON_EXTENSION}`,
    );
    assert.equal(
      decodeOperationIdToken(stemOf(physical)),
      LOGICAL_BATCH_ID,
      'the physical name must decode back to the logical id',
    );
  });

  it('M9-PATH-04 / IMPLEMENTATION INVARIANT: consecutive Chinese multi-byte characters round-trip without merging', () => {
    const samples: readonly string[] = [
      '中文',
      '连续中文字符串',
      '操作一操作二操作三',
      `${SOURCE_ATTEMPT}:hypothesis-batch:中文后缀`,
      '假设批次：中文假设：连续五个中文字符',
      '混合 mixed 中文 ABC 123',
    ];
    for (const sample of samples) {
      const token = encodeOperationIdToken(sample);
      assert.equal(
        decodeOperationIdToken(token),
        sample,
        `round-trip failed for the consecutive multi-byte run "${sample}" (token "${token}")`,
      );
      assert.equal(
        WINDOWS_ILLEGAL_FILENAME_CHARACTERS.test(token),
        false,
        `the token of "${sample}" is not a legal Windows name: "${token}"`,
      );
    }
  });

  it('M9-PATH-05 / IMPLEMENTATION INVARIANT: runs of consecutive special characters round-trip and never merge', () => {
    /*
     * 🔴 THE REGRESSION THIS PINS. Reading consecutive `~HH` groups greedily (collect the whole run,
     *    then decode once) MERGES two adjacent multi-byte characters into one invalid byte sequence.
     *    Every sample below therefore places special characters and multi-byte characters back to back.
     */
    const samples: readonly string[] = [
      ':::',
      '~~~',
      '%%%',
      '::~~%%',
      '\u00e9\u00e9',
      '中文::中文::中文',
      'a:::b~~~c%%%d',
      '中文::~~~%%中文',
      `${SOURCE_ATTEMPT}::hypothesis-batch::${BODY_A}`,
      '   ',
      '...',
    ];
    for (const sample of samples) {
      const token = encodeOperationIdToken(sample);
      assert.equal(
        decodeOperationIdToken(token),
        sample,
        `round-trip failed for the consecutive run "${sample}" (token "${token}")`,
      );
    }
  });

  it('M9-PATH-06 / AC-137: the persisted batch document keeps the ORIGINAL logical batch_id', async () => {
    const { storage, paths } = await writeBatch(zeroOutputBatch(LOGICAL_BATCH_ID, 'op-path-06'));
    assert.equal(paths.length, 1);
    const raw = storage.peek(paths[0] ?? '');
    assert.ok(typeof raw === 'string', 'the batch document must exist in the workspace');
    const parsed = parseHypothesisBatch(raw, paths[0] ?? '');
    assert.equal(parsed.batch_id, LOGICAL_BATCH_ID);
    assert.equal(parsed.batch_id.includes(':'), true, 'the logical id keeps its colon separators');
    /* The encoded stem is NOT the logical id, so the content is the only source of identity here. */
    assert.notEqual(stemOf(paths[0] ?? ''), LOGICAL_BATCH_ID);
    assert.equal(
      raw.includes(`"batch_id": "${LOGICAL_BATCH_ID}"`),
      true,
      'the raw document must carry the logical id verbatim',
    );
    assert.equal(
      raw.includes(`"object_type": "${HYPOTHESIS_GENERATION_BATCH_OBJECT_TYPE}"`),
      true,
    );
  });

  it('M9-PATH-07 / AC-137: discovery resolves each batch by CONTENT, not by reading the file name', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repository = createHypothesisRepository({ storage });
    const first = zeroOutputBatch(LOGICAL_BATCH_ID, 'op-path-07-a');
    const second = zeroOutputBatch(SECOND_LOGICAL_BATCH_ID, 'op-path-07-b');
    await repository.recordBatchIfAbsent(first);
    await repository.recordBatchIfAbsent(second);

    /* 🔴 Both batches really landed, and neither physical name carries the illegal separator. */
    const written = Object.keys(storage.snapshot()).filter((path) =>
      path.startsWith(`${HYPOTHESIS_BATCHES_DIRECTORY}/`),
    );
    assert.equal(written.length, 2, 'both logical batch ids must own their own file');
    for (const path of written) {
      const name = basenameOf(path);
      assert.equal(
        WINDOWS_ILLEGAL_FILENAME_CHARACTERS.test(name),
        false,
        `the persisted batch file name is not a legal Windows name: "${name}"`,
      );
    }

    const by_id = await repository.readBatch(LOGICAL_BATCH_ID);
    assert.ok(by_id !== null, 'the logical id must resolve through content-based discovery');
    assert.equal(by_id.batch_id, LOGICAL_BATCH_ID);

    const by_second = await repository.readBatch(SECOND_LOGICAL_BATCH_ID);
    assert.ok(by_second !== null);
    assert.equal(by_second.batch_id, SECOND_LOGICAL_BATCH_ID);

    const by_operation = await repository.findBatchByOperationId('op-path-07-b');
    assert.ok(by_operation !== null);
    assert.equal(by_operation.batch_id, second.batch_id);

    /*
     * 🔴 RENAME TOLERANCE (§3.2 rule 3): moving the file to an unrelated name must NOT break
     *    resolution, because the file name was never the identity.
     */
    const paths = Object.keys(storage.snapshot()).filter((path) =>
      path.startsWith(`${HYPOTHESIS_BATCHES_DIRECTORY}/`),
    );
    assert.equal(paths.length, 2);
    const original = paths.find((path) => (storage.peek(path) ?? '').includes(LOGICAL_BATCH_ID));
    assert.ok(original !== undefined);
    const renamed = `${HYPOTHESIS_BATCHES_DIRECTORY}/renamed-by-the-user.json`;
    await storage.move(original, renamed);
    const after_rename = await repository.readBatch(LOGICAL_BATCH_ID);
    assert.ok(after_rename !== null, 'a renamed batch must still resolve by its internal id');
    assert.equal(after_rename.batch_id, LOGICAL_BATCH_ID);
  });

  it('M9-PATH-08 / IMPLEMENTATION INVARIANT: two different logical batch ids never land on one physical path', async () => {
    /* (a) 🔴 INJECTIVITY of the pure path mapping, over arbitrary ids AND their naive encodings. */
    const paths = COLLISION_SAMPLE.map((logical) => hypothesisBatchPath(logical));
    assert.equal(
      new Set(paths).size,
      paths.length,
      `two different logical batch ids share one physical path: ${JSON.stringify(paths)}`,
    );

    /*
     * (b) 🔴 INJECTIVITY over the REAL store: several schema-valid batch ids of ONE source record must
     *        each own a file. Two explicit generations of the same record may never overwrite one
     *        another, which is exactly what a lossy sanitisation would cause.
     */
    const storage = new InMemoryWorkspaceStorage();
    const repository = createHypothesisRepository({ storage });
    const real_ids = [
      LOGICAL_BATCH_ID,
      SECOND_LOGICAL_BATCH_ID,
      ...Array.from({ length: 6 }, () => newHypothesisBatchId(SOURCE_ATTEMPT)),
    ];
    assert.equal(
      new Set(real_ids).size,
      real_ids.length,
      'the fixture itself must keep its logical ids distinct',
    );
    for (const [index, logical] of real_ids.entries()) {
      await repository.recordBatchIfAbsent(zeroOutputBatch(logical, `op-collision-${index}`));
    }
    const written = Object.keys(storage.snapshot()).filter((path) =>
      path.startsWith(`${HYPOTHESIS_BATCHES_DIRECTORY}/`),
    );
    assert.equal(
      written.length,
      real_ids.length,
      'every distinct logical batch id must own its own file',
    );
    /* And each of them is still retrievable by its logical id alone. */
    for (const logical of real_ids) {
      const found = await repository.readBatch(logical);
      assert.ok(found !== null, `"${logical}" must still resolve after the write`);
      assert.equal(found.batch_id, logical);
    }
  });

  it('M9-PATH-09 / IMPLEMENTATION INVARIANT: a normal step ⑨ generation lands its batch on a legal physical name', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-m9-path-09',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }

    const batch_id = outcome.batch.batch_id;
    assert.equal(
      isHypothesisBatchId(batch_id, ID_SOURCE),
      true,
      'the real minted batch id must be well-formed and bound to its source record',
    );
    assert.equal(batch_id.includes(':'), true, 'the logical batch id keeps its colon separators');

    const files = harness.batchFiles();
    assert.equal(files.length, 1, 'exactly one batch record must be persisted');
    const name = basenameOf(files[0] ?? '');
    assert.equal(
      WINDOWS_ILLEGAL_FILENAME_CHARACTERS.test(name),
      false,
      `the persisted batch file name is not a legal Windows name: "${name}"`,
    );
    assert.equal(stemOf(files[0] ?? ''), encodeOperationIdToken(batch_id));
  });

  it('M9-PATH-10 / AC-137: after a reload the batch is still discovered from its encoded file', async () => {
    const { harness } = await seedStandardFixture({
      generation: generationAnswerOf([groundedAnswer()]),
    });
    const outcome = await harness.service.generateHypotheses({
      operation_id: 'op-m9-path-10',
      source_attempt_id: at(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'generated');
    if (outcome.kind !== 'generated') {
      return;
    }

    /*
     * 🔴 A fresh repository handle over the SAME persisted workspace - the reload path a user would
     *    take after closing and reopening the app. Nothing is read from a file NAME.
     */
    const persisted = harness.batchFiles();
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0], hypothesisBatchPath(outcome.batch.batch_id));
    assert.equal(
      WINDOWS_ILLEGAL_FILENAME_CHARACTERS.test(basenameOf(persisted[0] ?? '')),
      false,
      'the reloaded batch must live under a legal physical name',
    );

    const reopened = harness.reopenRepository();
    const by_id = await reopened.readBatch(outcome.batch.batch_id);
    assert.ok(by_id !== null, 'a reopened workspace must still find the batch by its logical id');
    assert.equal(by_id.batch_id, outcome.batch.batch_id);
    assert.equal(by_id.operation_id, outcome.batch.operation_id);

    const by_operation = await reopened.findBatchByOperationId('op-m9-path-10');
    assert.ok(by_operation !== null);
    assert.equal(by_operation.batch_id, outcome.batch.batch_id);

    const listed = await reopened.listBatchesBySourceAttempt(at(ID_SOURCE));
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.batch_id, outcome.batch.batch_id);
  });

  it('M9-PATH-11 / IMPLEMENTATION INVARIANT: the operation codec golden values and the anchor path format are unchanged', () => {
    /*
     * 🔴 These are hand-computed UTF-8 percent-encodings, not values read back from the implementation,
     *    so they really do constrain the format. `~HH` is always UPPERCASE and always two digits. They
     *    are the SAME golden values the pre-existing `M9-HYGIENE-01` suite pins, so an encoder change
     *    that would silently move every persisted anchor path is caught here as well.
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

    /* 🔴 The anchor key format is untouched - the codec is applied by `hypothesisOperationKey` itself. */
    assert.equal(hypothesisOperationKey('ATT_A', 'op-1'), 'ATT_A__op-1');
    assert.equal(
      hypothesisOperationKey('ATT_A', '操作一'),
      'ATT_A__~E6~93~8D~E4~BD~9C~E4~B8~80',
    );

    /*
     * 🔴 NO DOUBLE ENCODING. `operation_key` arrives ALREADY encoded, so the anchor path must be the
     *    RAW interpolation of it. Re-encoding would move every already-persisted
     *    `hypotheses/operations/<operation_key>.json` and orphan a pending recovery (§36).
     */
    const key = hypothesisOperationKey(SOURCE_ATTEMPT, '操作一');
    assert.equal(key, `${SOURCE_ATTEMPT}__~E6~93~8D~E4~BD~9C~E4~B8~80`);
    assert.equal(hypothesisOperationAnchorPath(key), `hypotheses/operations/${key}.json`);
    assert.equal(
      hypothesisOperationAnchorPath(key).includes(encodeOperationIdToken(key)),
      false,
      'the anchor path must not be the encoded key - the key is already a path-safe token',
    );
    assert.equal(
      WINDOWS_ILLEGAL_FILENAME_CHARACTERS.test(basenameOf(hypothesisOperationAnchorPath(key))),
      false,
      'the anchor file name must stay a legal Windows name',
    );
  });
});
