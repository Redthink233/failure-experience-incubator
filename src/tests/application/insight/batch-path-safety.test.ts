/**
 * S01 ｜ `M8` step ⑧ batch PATH SAFETY ｜ `PSA-A-CORRECTION-M8-PATH-01`.
 *
 * 🔴 THE DEFECT THIS SUITE CLOSES. `newInsightBatchId` mints `ATT_…:insight-batch:<ULID body>`. A `:`
 *    is a LEGAL logical-id character but an ILLEGAL Windows file-name character. The physical batch
 *    path used to embed the logical id VERBATIM, so on Windows the step ⑧ batch write could never
 *    land: the interrupted PSA-A run left `insights/batches/` EMPTY while the operation anchor stayed
 *    `in_progress`, and step ⑧ could therefore never become `done`.
 * 🔴 THE BOUNDARY THIS SUITE PINS. The LOGICAL `batch_id` is immutable and is NEVER encoded: it keeps
 *    its original value in the domain object, the batch JSON, the operation anchor, the planned batch
 *    and every reference. ONLY the physical file name is encoded, REVERSIBLY, with the module's
 *    EXISTING `~HH` codec. No second sanitising rule set (`replace(':','_')`, base64, a hash-only
 *    name) is introduced - such a rule would be lossy or would collide two different logical ids onto
 *    one physical file.
 * 🔴 THE FILE NAME IS NEVER IDENTITY (§3.2 / AC-137). Discovery reads the `batch_id` INSIDE the
 *    document, so this suite also proves that a batch file renamed to something unrelated still
 *    resolves by content.
 * 🔴 A ROUND-TRIP BUG IS EXPLICITLY GUARDED: consecutive multi-byte (Chinese) characters and runs of
 *    consecutive special characters must both survive `encode → decode` unchanged. Reading a run of
 *    `~HH` groups greedily is a real defect this module has already had once.
 *
 * 🔴 No model, no provider and no network are involved anywhere: every document here is a
 *    hand-written fixture (`NOT_A_REAL_LLM_OUTPUT`). `Real Provider Calls = 0`.
 *
 * Canonical ACs referenced: AC-130 (Local Workspace files), AC-137 (resolution by content).
 * Everything else is labelled `IMPLEMENTATION INVARIANT` and adds no `AC`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  INSIGHT_BATCHES_DIRECTORY,
  insightBatchPath,
  parseInsightBatch,
} from '../../../application/insight/persistence.js';
import {
  decodeOperationIdToken,
  decodePathSafeToken,
  encodeOperationIdToken,
  encodePathSafeToken,
  insightOperationKey,
  isInsightBatchId,
  newInsightBatchId,
} from '../../../application/insight/identity.js';
import { createInsightRepository } from '../../../application/insight/insight-repository.js';
import type { InsightGenerationBatch } from '../../../application/insight/types.js';
import { InMemoryWorkspaceStorage } from '../../../workspace/memory-storage.js';

/* ------------------------------------------------------------------ *
 * The Windows physical-name contract
 * ------------------------------------------------------------------ */

/** The characters a Windows file name can NEVER contain. */
const WINDOWS_ILLEGAL_FILENAME_CHARACTERS = /[<>:"/\\|?*]/;

/** The reserved DOS device basenames, which are illegal as a basename whatever the extension. */
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

/** The 26-character ULID body used by every fixture id in this file. */
const BODY_A = '0000000000000000000000000A';
const BODY_B = '0000000000000000000000000B';

const SOURCE_ATTEMPT = `ATT_${BODY_A}`;

/** A logical batch id in EXACTLY the shape `newInsightBatchId` mints - `:` separators included. */
const LOGICAL_BATCH_ID = `${SOURCE_ATTEMPT}:insight-batch:${BODY_B}`;

/** The logical ids a physical name must keep apart, including each other's NAIVE encodings. */
const COLLISION_SAMPLE: readonly string[] = [
  LOGICAL_BATCH_ID,
  `${SOURCE_ATTEMPT}:insight-batch:${BODY_A}`,
  /* 🔴 The NAIVE encoding of `LOGICAL_BATCH_ID`. If `~` were left unencoded, these two would land on
     ONE physical file and a legitimate second generation would silently be read as the first. */
  `${SOURCE_ATTEMPT}~3Ainsight-batch~3A${BODY_B}`,
  `${SOURCE_ATTEMPT}~3ainsight-batch~3a${BODY_B}`,
  `操作批次:insight-batch:${BODY_B}`,
  `${SOURCE_ATTEMPT}%3Ainsight-batch%3A${BODY_B}`,
];

function zeroOutputBatch(batch_id: string, operation_id: string): InsightGenerationBatch {
  return {
    batch_id,
    source_attempt_id: SOURCE_ATTEMPT as never,
    operation_id,
    insight_ids: [],
    exit_route: 'EXIT-A',
    absence_statement: 'NOT_A_REAL_LLM_OUTPUT: 手写 fixture，没有任何可引用的历史内容。',
    created_at: '2026-09-26T00:00:00.000Z',
  };
}

async function writeBatch(
  batch: InsightGenerationBatch,
): Promise<{ readonly storage: InMemoryWorkspaceStorage; readonly paths: readonly string[] }> {
  const storage = new InMemoryWorkspaceStorage();
  const repository = createInsightRepository({ storage });
  await repository.recordBatchIfAbsent(batch);
  return {
    storage,
    paths: Object.keys(storage.snapshot()).filter((path) =>
      path.startsWith(`${INSIGHT_BATCHES_DIRECTORY}/`),
    ),
  };
}

/* ------------------------------------------------------------------ *
 * PATH-01 … PATH-08
 * ------------------------------------------------------------------ */

describe('PSA-A-CORRECTION-M8-PATH-01 ｜ step ⑧ batch persistence is path-safe', () => {
  it('PATH-01 / IMPLEMENTATION INVARIANT: a logical batch id carrying ":" must never reach the physical file name', () => {
    /*
     * 🔴 The fixture is minted in the REAL shape, so this is not a synthetic string: `newInsightBatchId`
     *    really does separate its three segments with `:`.
     */
    assert.equal(
      isInsightBatchId(LOGICAL_BATCH_ID),
      true,
      'the fixture must be a well-formed batch id',
    );
    assert.equal(
      isInsightBatchId(newInsightBatchId(SOURCE_ATTEMPT), SOURCE_ATTEMPT),
      true,
      'the batch id the module really mints must be well-formed',
    );
    assert.ok(
      LOGICAL_BATCH_ID.includes(':'),
      'the fixture must carry the separator Windows refuses in a file name',
    );

    const physical = insightBatchPath(LOGICAL_BATCH_ID);
    assert.ok(
      physical.startsWith(`${INSIGHT_BATCHES_DIRECTORY}/`),
      'the physical location must stay inside the batch directory',
    );
    const name = basenameOf(physical);
    assert.equal(
      WINDOWS_ILLEGAL_FILENAME_CHARACTERS.test(name),
      false,
      `the physical file name must be a legal Windows name, received "${name}"`,
    );
  });

  it('PATH-02 / IMPLEMENTATION INVARIANT: the physical batch name is the LOGICAL id through the module codec', () => {
    /*
     * 🔴 ONE CODEC, NOT TWO. The physical file name must be exactly the module's existing reversible
     *    `~HH` encoding of the logical id - proving the fix REUSES that codec instead of introducing a
     *    second, differently-behaving rule set.
     */
    const physical = insightBatchPath(LOGICAL_BATCH_ID);
    assert.equal(`${stemOf(physical)}${JSON_EXTENSION}`, `${encodeOperationIdToken(LOGICAL_BATCH_ID)}${JSON_EXTENSION}`);
    assert.equal(
      decodeOperationIdToken(stemOf(physical)),
      LOGICAL_BATCH_ID,
      'the physical name must decode back to the logical id',
    );
  });

  it('PATH-03 / IMPLEMENTATION INVARIANT: encode/decode round-trips ASCII, Chinese and runs of both', () => {
    const samples: readonly string[] = [
      LOGICAL_BATCH_ID,
      `${SOURCE_ATTEMPT}:insight-batch:${BODY_A}`,
      'plain',
      'with space',
      '中文批次',
      '连续中文字符串',
      '混合 mixed 中文 ABC 123',
      '操作一操作二操作三',
    ];
    for (const sample of samples) {
      const token = encodeOperationIdToken(sample);
      assert.equal(
        decodeOperationIdToken(token),
        sample,
        `round-trip failed for "${sample}" (token "${token}")`,
      );
      assert.equal(
        WINDOWS_ILLEGAL_FILENAME_CHARACTERS.test(token),
        false,
        `the token of "${sample}" is not a legal Windows name: "${token}"`,
      );
    }
  });

  it('PATH-04 / IMPLEMENTATION INVARIANT: runs of consecutive special characters round-trip and never merge', () => {
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
      '\u00e9\u00e9', // 连续两字节：每个字符各占两个 UTF-8 字节
      '\u4e2d\u6587\u4e2d\u6587', // 连续多字节：中文四字
      '\u00e9\u4e2d\u6587\u00e9', // 两字节与三字节相邻
      '中文::中文::中文',
      'a:::b~~~c%%%d',
      '中文::~~~%%中文',
      'ATT_x::insight-batch::y',
      `${SOURCE_ATTEMPT}::insight-batch::${BODY_A}`,
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

  it('PATH-05 / IMPLEMENTATION INVARIANT: two different logical batch ids never land on one physical path', async () => {
    const paths = COLLISION_SAMPLE.map((logical) => insightBatchPath(logical));
    assert.equal(
      new Set(paths).size,
      paths.length,
      `two different logical batch ids share one physical path: ${JSON.stringify(paths)}`,
    );
    /* 🔴 Injective over the whole batch directory, not just pairwise in isolation. */
    const storage = new InMemoryWorkspaceStorage();
    const repository = createInsightRepository({ storage });
    for (const [index, logical] of COLLISION_SAMPLE.entries()) {
      await repository.recordBatchIfAbsent(zeroOutputBatch(logical, `op-collision-${index}`));
    }
    const written = Object.keys(storage.snapshot()).filter((path) =>
      path.startsWith(`${INSIGHT_BATCHES_DIRECTORY}/`),
    );
    assert.equal(
      written.length,
      COLLISION_SAMPLE.length,
      'every distinct logical batch id must own its own file',
    );
  });

  it('PATH-06 / AC-137: the persisted batch document keeps the ORIGINAL logical batch_id', async () => {
    const { storage, paths } = await writeBatch(zeroOutputBatch(LOGICAL_BATCH_ID, 'op-path-06'));
    assert.equal(paths.length, 1);
    const raw = storage.peek(paths[0] ?? '');
    assert.ok(typeof raw === 'string', 'the batch document must exist in the workspace');
    const parsed = parseInsightBatch(raw, paths[0] ?? '');
    assert.equal(parsed.batch_id, LOGICAL_BATCH_ID);
    /* The encoded stem is NOT the logical id, so the content is the only source of identity here. */
    assert.notEqual(stemOf(paths[0] ?? ''), LOGICAL_BATCH_ID);
    assert.equal(
      raw.includes(`"batch_id": "${LOGICAL_BATCH_ID}"`),
      true,
      'the raw document must carry the logical id verbatim',
    );
  });

  it('PATH-07 / AC-137: discovery resolves each batch by CONTENT, not by reading the file name', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repository = createInsightRepository({ storage });
    const first = zeroOutputBatch(LOGICAL_BATCH_ID, 'op-path-07-a');
    const second = zeroOutputBatch(COLLISION_SAMPLE[5] ?? LOGICAL_BATCH_ID, 'op-path-07-b');
    await repository.recordBatchIfAbsent(first);
    await repository.recordBatchIfAbsent(second);

    const by_id = await repository.readBatch(LOGICAL_BATCH_ID);
    assert.ok(by_id !== null, 'the logical id must resolve through content-based discovery');
    assert.equal(by_id.batch_id, LOGICAL_BATCH_ID);

    const by_operation = await repository.findBatchByOperationId('op-path-07-b');
    assert.ok(by_operation !== null);
    assert.equal(by_operation.batch_id, second.batch_id);

    /*
     * 🔴 RENAME TOLERANCE (§3.2 rule 3): moving the file to an unrelated name must NOT break
     *    resolution, because the file name was never the identity.
     */
    const paths = Object.keys(storage.snapshot()).filter((path) =>
      path.startsWith(`${INSIGHT_BATCHES_DIRECTORY}/`),
    );
    assert.equal(paths.length, 2);
    const original = paths.find((path) => (storage.peek(path) ?? '').includes(LOGICAL_BATCH_ID));
    assert.ok(original !== undefined);
    const renamed = `${INSIGHT_BATCHES_DIRECTORY}/renamed-by-the-user.json`;
    await storage.move(original, renamed);
    const after_rename = await repository.readBatch(LOGICAL_BATCH_ID);
    assert.ok(after_rename !== null, 'a renamed batch must still resolve by its internal id');
    assert.equal(after_rename.batch_id, LOGICAL_BATCH_ID);
  });

  it('PATH-08 / IMPLEMENTATION INVARIANT: every real batch id satisfies the Windows file-name contract', () => {
    const samples: readonly string[] = [
      ...Array.from({ length: 64 }, () => newInsightBatchId(SOURCE_ATTEMPT)),
      ...COLLISION_SAMPLE,
    ];
    for (const logical of samples) {
      const name = basenameOf(insightBatchPath(logical));
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
       * 🔴 RESERVED DEVICE BASENAMES. Every batch id carries the stable `ATT_…:insight-batch:` prefix,
       *    and `:` is encoded, so the encoded stem can never BECOME `CON` / `NUL` / `COM1` / … .
       *    This is an empirical statement over the real minted shape, not a guess: the assertion below
       *    is what would fail if a future change dropped the prefix.
       */
      assert.equal(
        WINDOWS_RESERVED_BASENAMES.test(stemOf(insightBatchPath(logical))),
        false,
        `the encoded stem became a reserved Windows device name: "${stemOf(insightBatchPath(logical))}"`,
      );
    }
  });

  it('PATH-09 / IMPLEMENTATION INVARIANT: the batch-path codec IS the anchor key codec - one implementation, no second rule set', () => {
    /*
     * 🔴 REUSE, NOT RE-INVENTION. The batch name and the operation anchor key must go through the
     *    IDENTICAL codec. A second encoder (`replace(':','_')`, base64, a hash) would create a second
     *    format for the same module and would drift from the first one.
     */
    for (const logical of COLLISION_SAMPLE) {
      assert.equal(encodePathSafeToken(logical), encodeOperationIdToken(logical));
      assert.equal(decodePathSafeToken(encodePathSafeToken(logical)), logical);
    }
    assert.equal(
      encodePathSafeToken,
      encodeOperationIdToken,
      'the neutral name must be the SAME function object, not a re-implementation',
    );
    assert.equal(
      decodePathSafeToken,
      decodeOperationIdToken,
      'the neutral name must be the SAME function object, not a re-implementation',
    );
    /*
     * 🔴 THE ANCHOR FORMAT IS UNCHANGED, so no already-persisted `insights/operations/<key>.json` has
     *    to be migrated and a pending recovery keeps finding its anchor.
     */
    assert.equal(
      insightOperationKey(SOURCE_ATTEMPT, 'op~x'),
      `${SOURCE_ATTEMPT}__${encodePathSafeToken('op~x')}`,
    );
    assert.equal(insightOperationKey(SOURCE_ATTEMPT, 'op#a/b'), `${SOURCE_ATTEMPT}__op~23a~2Fb`);
  });
});
