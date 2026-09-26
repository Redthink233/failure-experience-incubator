/**
 * S01-05C ｜ IMPLEMENTATION INVARIANT ｜ stable content-item identity closure.
 *
 * Frozen references used by this file (no new AC, no new Decision):
 *   - contract §3.1 / §3.2 (`TQ15`) - an id is globally unique, stable and never reused, and a
 *     reference is resolved BY ID: never by text matching, never by list position;
 *   - docs/02 §C.4.1 (`item_id` 是条目唯一标识，**禁止**用数组下标代替);
 *   - task §3 §4 §5 §6 §7 §8 - key parameter extraction / `Attempt.key_parameters` list /
 *     candidate cause identity; idempotency; reparse must not renumber identity.
 *
 * 🔴 Every AI payload used here is a hand-written fixture (`NOT_A_REAL_LLM_OUTPUT`). No network
 *    call is made and no model behaviour is claimed.
 * 🔴 The source scan at the end targets IDENTITY CONSTRUCTION only. An `array[index]` read, a
 *    `forEach` index, a test loop counter or a sort comparator's index are NOT reported.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isGeneratedContentItemId } from '../../../domain/ids/content-item-id.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';
import { isIdBody } from '../../../domain/ids/ulid.js';
import {
  FOLLOW_UP_QUESTION_FIELD_KEY,
  KEY_PARAMETER_FIELD_KEY,
  aiParseExtractionItemId,
  canonicalFieldKeyForAttemptField,
  findContentItem,
  followUpQuestionItemId,
} from '../../../domain/types/content-item-record.js';
import {
  causePayload,
  makeReloadableHarness,
  parsePayload,
} from './capture-test-harness.js';

const ACCEPTED_STATUS = { decision: 'accepted' as const, value: '未达到预期' };

const TWO_PARAMETERS = ['热风温度 70 度', '传送带速度中档'] as const;

const TEXT_WORKFLOW = '把热风温度从 50 度调到 70 度想缩短干燥时间，结果表面开裂';

/** A parse answer that also yields two key parameters. */
function parsePayloadWithParameters(): Readonly<Record<string, unknown>> {
  return parsePayload({
    result_status_proposal: '未达到预期',
    key_parameters: [...TWO_PARAMETERS],
  });
}

/** Two DISTINCT candidate causes. */
const TWO_CAUSES = causePayload([
  { statement: '失败可能与温度控制不稳定有关', supporting_source_paths: ['condition'] },
  { statement: '另一个可能的原因是升温速度过快', supporting_source_paths: ['actual_attempt'] },
]);

/** 🔴 Two candidate causes with the SAME text - they must still be two distinct objects. */
const SAME_TEXT_CAUSES = causePayload([
  { statement: '失败可能与温度有关' },
  { statement: '失败可能与温度有关' },
]);

/** Brings a record to the point where step ④ can run. */
async function prepared(
  harness: ReturnType<typeof makeReloadableHarness>,
): Promise<ObjectId<'ATT'>> {
  const started = await harness.service.beginCapture({
    operation_id: 'prep-begin',
    raw_text: TEXT_WORKFLOW,
  });
  const attempt = started.attempt;
  assert.ok(attempt !== null);
  if (attempt === null) {
    throw new Error('fixture setup failed');
  }
  await harness.service.applyStructuredConfirmation({
    operation_id: 'prep-confirm',
    attempt_id: attempt.attempt_id,
    result_status: ACCEPTED_STATUS,
    user_confirmed: true,
  });
  return attempt.attempt_id;
}

/* ------------------------------------------------------------------ *
 * task §3 / §4 - key parameter extraction identity
 * ------------------------------------------------------------------ */

describe('S01-05C｜key parameter extraction identity (task §3 / §4)', () => {
  it('IMPLEMENTATION INVARIANT (ID-1): a key parameter extraction id is generated, never index-derived', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayloadWithParameters(),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'id1-begin',
      raw_text: TEXT_WORKFLOW,
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    assert.equal(started.parse?.kind, 'parsed');
    if (started.parse?.kind !== 'parsed') {
      return;
    }

    const proposal = started.parse.proposal;
    assert.equal(proposal.key_parameters.length, TWO_PARAMETERS.length);
    const proposal_ids = proposal.key_parameters.map((parameter) => parameter.content_item_id);

    for (const id of proposal_ids) {
      assert.ok(isGeneratedContentItemId(id), `${id} must be a generated identity`);
      assert.equal(/:\d+$/.test(id), false, `${id} must not end in a position`);
      assert.ok(id.startsWith(attempt.attempt_id), 'the item must stay traceable to its Attempt');
    }

    /* 🔴 The SAME identity is persisted in the sidecar - it is one object, not a copy. */
    const items = await harness.repository.readAttemptContentItems(attempt.attempt_id);
    const persisted_ids = items
      .filter((item) => item.field_key === KEY_PARAMETER_FIELD_KEY)
      .map((item) => item.content_item_id);
    assert.deepEqual([...persisted_ids].sort(), [...proposal_ids].sort());
    for (const id of persisted_ids) {
      assert.ok(isGeneratedContentItemId(id));
    }

    /* 🔴 The field-level extraction ids are field-derived (never positional) and unchanged. */
    for (const field of ['goal', 'actual_attempt', 'actual_result'] as const) {
      assert.equal(
        aiParseExtractionItemId(attempt.attempt_id, canonicalFieldKeyForAttemptField(field)),
        `${attempt.attempt_id}:${field}:ai`,
      );
    }
  });

  it('IMPLEMENTATION INVARIANT (ID-2): two key parameters own two DIFFERENT stable ids', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayloadWithParameters(),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'id2-begin',
      raw_text: TEXT_WORKFLOW,
    });
    assert.equal(started.parse?.kind, 'parsed');
    if (started.parse?.kind !== 'parsed') {
      return;
    }
    const attempt_id = started.attempt?.attempt_id;
    assert.ok(attempt_id !== undefined);
    if (attempt_id === undefined) {
      return;
    }
    const ids = started.parse.proposal.key_parameters.map((parameter) => parameter.content_item_id);
    assert.equal(ids.length, 2);
    const [first, second] = ids;
    assert.ok(first !== undefined && second !== undefined);
    assert.notEqual(first, second, 'two parameters must never share one identity');
    assert.equal(isIdBody(first.slice(first.lastIndexOf(':') + 1)), true);
    /* A reload reads the identities back from disk instead of re-minting them. */
    const reloaded = await harness.reopenRepository().readAttemptContentItems(attempt_id);
    assert.deepEqual(
      reloaded
        .filter((item) => item.field_key === KEY_PARAMETER_FIELD_KEY)
        .map((item) => item.content_item_id),
      ids,
    );
  });

  it('IMPLEMENTATION INVARIANT (ID-3): reordering `Attempt.key_parameters` never swaps two identities', async () => {
    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayloadWithParameters(),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'id3-begin',
      raw_text: TEXT_WORKFLOW,
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    await harness.service.applyStructuredConfirmation({
      operation_id: 'id3-confirm',
      attempt_id: attempt.attempt_id,
      result_status: ACCEPTED_STATUS,
      user_confirmed: true,
    });

    const stored = await harness.repository.readAttempt(attempt.attempt_id);
    assert.equal(stored?.key_parameters.length, 2);
    const before = stored?.key_parameters ?? [];
    const [item_a, item_b] = before;
    assert.ok(item_a !== undefined && item_b !== undefined);
    const id_a = item_a.content_item_id;
    const id_b = item_b.content_item_id;
    assert.notEqual(id_a, id_b);
    assert.equal(item_a.value, TWO_PARAMETERS[0]);
    assert.equal(item_b.value, TWO_PARAMETERS[1]);

    /* [A, B] -> [B, A]: the very same two objects, in the other order. */
    const reordered = await harness.repository.updateAttempt(attempt.attempt_id, {
      key_parameters: [item_b, item_a],
    });
    const [first, second] = reordered.key_parameters;
    assert.ok(first !== undefined && second !== undefined);
    assert.equal(first.value, TWO_PARAMETERS[1]);
    assert.equal(first.content_item_id, id_b, 'the swapped item keeps its OWN identity');
    assert.equal(second.value, TWO_PARAMETERS[0]);
    assert.equal(second.content_item_id, id_a);

    /* …and the identity -> value binding survives a reload. */
    const reread = await harness.reopenRepository().readAttempt(attempt.attempt_id);
    assert.equal(reread?.key_parameters[0]?.content_item_id, id_b);
    assert.equal(reread?.key_parameters[0]?.value, TWO_PARAMETERS[1]);
    assert.equal(reread?.key_parameters[1]?.content_item_id, id_a);
  });
});

/* ------------------------------------------------------------------ *
 * task §5 / §6 - candidate cause identity
 * ------------------------------------------------------------------ */

describe('S01-05C｜candidate cause identity (task §5 / §6)', () => {
  it('IMPLEMENTATION INVARIANT (ID-4): each candidate owns a generated id - and equal TEXT never means one object', async () => {
    const harness = makeReloadableHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      { kind: 'structured', value: SAME_TEXT_CAUSES },
    ]);
    const attempt_id = await prepared(harness);
    const analysed = await harness.service.analyseCandidateCauses(attempt_id);
    assert.equal(analysed?.kind, 'analysed');
    if (analysed?.kind !== 'analysed') {
      return;
    }
    const candidates = analysed.proposal.candidates;
    assert.equal(candidates.length, 2);
    const [cause_a, cause_b] = candidates;
    assert.ok(cause_a !== undefined && cause_b !== undefined);

    /* 🔴 Identical statement text, two different objects: text is NOT identity (§6). */
    assert.equal(cause_a.statement, cause_b.statement);
    assert.notEqual(cause_a.content_item_id, cause_b.content_item_id);
    for (const candidate of candidates) {
      assert.ok(isGeneratedContentItemId(candidate.content_item_id));
      assert.equal(/:\d+$/.test(candidate.content_item_id), false);
      assert.ok(candidate.content_item_id.startsWith(attempt_id));
      assert.equal(candidate.decision_state, 'unresolved');
    }

    /* Step ④ stays read-only: nothing was persisted by analysing. */
    const untouched = await harness.repository.readAttempt(attempt_id);
    assert.deepEqual([...(untouched?.candidate_causes ?? [])], []);
  });

  it('IMPLEMENTATION INVARIANT (ID-5): a decision binds to ids, so a reordered list cannot move it', async () => {
    const harness = makeReloadableHarness([
      { kind: 'structured', value: parsePayload({ result_status_proposal: '未达到预期' }) },
      { kind: 'structured', value: TWO_CAUSES },
    ]);
    const attempt_id = await prepared(harness);
    const analysed = await harness.service.analyseCandidateCauses(attempt_id);
    assert.equal(analysed?.kind, 'analysed');
    if (analysed?.kind !== 'analysed') {
      return;
    }
    const [cause_a, cause_b] = analysed.proposal.candidates;
    assert.ok(cause_a !== undefined && cause_b !== undefined);
    const id_a = cause_a.content_item_id;
    const id_b = cause_b.content_item_id;
    assert.notEqual(id_a, id_b);
    assert.notEqual(cause_a.statement, cause_b.statement);

    /* The caller presents / sorts them in the OPPOSITE order, then decides about Cause A only. */
    const decided = harness.service.decideCandidateCauses({
      attempt_id: analysed.proposal.attempt_id,
      candidates: [cause_b, cause_a],
      decisions: { [id_a]: 'accepted' },
    });
    const [presented_first, presented_second] = decided.outcome.candidates;
    assert.ok(presented_first !== undefined && presented_second !== undefined);
    assert.equal(presented_first.content_item_id, id_b);
    assert.equal(presented_first.decision_state, 'unresolved', 'Cause B was never decided');
    assert.equal(presented_second.content_item_id, id_a);
    assert.equal(presented_second.decision_state, 'accepted');
    /* 🔴 The acceptance landed on Cause A's STATEMENT - not on the first row of the list. */
    assert.equal(presented_second.statement, cause_a.statement);
    assert.deepEqual([...decided.outcome.changed_content_item_ids], [id_a]);

    /* …and the same binding holds once persisted. */
    const persisted = await harness.service.persistCandidateCauses({
      operation_id: 'id5-causes',
      decision: decided,
    });
    assert.ok(persisted.persisted !== null);
    const stored = await harness.repository.readAttempt(attempt_id);
    const stored_a = stored?.candidate_causes.find((item) => item.content_item_id === id_a);
    const stored_b = stored?.candidate_causes.find((item) => item.content_item_id === id_b);
    assert.equal(stored_a?.decision_state, 'accepted');
    assert.equal(stored_a?.value, cause_a.statement);
    assert.equal(stored_b?.decision_state, 'unresolved');
  });
});

/* ------------------------------------------------------------------ *
 * task §7 - idempotency
 * ------------------------------------------------------------------ */

describe('S01-05C｜operation replay keeps the SAME identities (task §7)', () => {
  it('IMPLEMENTATION INVARIANT (ID-6): replaying a successful operation never mints a second set of ids', async () => {
    const harness = makeReloadableHarness([
      { kind: 'structured', value: parsePayloadWithParameters() },
      { kind: 'structured', value: TWO_CAUSES },
    ]);

    const first = await harness.service.beginCapture({
      operation_id: 'id6-begin',
      raw_text: TEXT_WORKFLOW,
    });
    const attempt = first.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    const items_before = await harness.repository.readAttemptContentItems(attempt.attempt_id);
    const ids_before = items_before.map((item) => [item.field_key, item.content_item_id]);

    /* Same operation_id replayed: the recorded result is returned, nothing is written again. */
    const replay = await harness.service.beginCapture({
      operation_id: 'id6-begin',
      raw_text: TEXT_WORKFLOW,
    });
    assert.equal(replay.idempotent_replay, true);
    assert.deepEqual(replay.attempt, first.attempt);
    const ids_after = (await harness.repository.readAttemptContentItems(attempt.attempt_id)).map(
      (item) => [item.field_key, item.content_item_id],
    );
    assert.deepEqual(ids_after, ids_before);

    /* The confirmation replay writes nothing either, so `key_parameters` ids stay put. */
    await harness.service.applyStructuredConfirmation({
      operation_id: 'id6-confirm',
      attempt_id: attempt.attempt_id,
      result_status: ACCEPTED_STATUS,
      user_confirmed: true,
    });
    const parameters_once = (await harness.repository.readAttempt(attempt.attempt_id))
      ?.key_parameters;
    const parameters_again = await harness.service.applyStructuredConfirmation({
      operation_id: 'id6-confirm',
      attempt_id: attempt.attempt_id,
      result_status: ACCEPTED_STATUS,
      user_confirmed: true,
    });
    assert.equal(parameters_again.idempotent_replay, true);
    assert.deepEqual(
      (await harness.repository.readAttempt(attempt.attempt_id))?.key_parameters,
      parameters_once,
    );

    /* The candidate persistence replay keeps the very same cause ids. */
    const analysed = await harness.service.analyseCandidateCauses(attempt.attempt_id);
    assert.equal(analysed?.kind, 'analysed');
    if (analysed?.kind !== 'analysed') {
      return;
    }
    const decision = harness.service.decideCandidateCauses({
      attempt_id: analysed.proposal.attempt_id,
      candidates: analysed.proposal.candidates,
      decisions: {},
    });
    const persisted_once = await harness.service.persistCandidateCauses({
      operation_id: 'id6-causes',
      decision,
    });
    const persisted_twice = await harness.service.persistCandidateCauses({
      operation_id: 'id6-causes',
      decision,
    });
    assert.equal(persisted_once.idempotent_replay, false);
    assert.equal(persisted_twice.idempotent_replay, true);
    assert.deepEqual(
      (await harness.repository.readAttempt(attempt.attempt_id))?.candidate_causes.map(
        (item) => item.content_item_id,
      ),
      decision.outcome.candidates.map((candidate) => candidate.content_item_id),
    );
  });
});

/* ------------------------------------------------------------------ *
 * task §10 - follow-up question identity regression (S01-05B)
 * ------------------------------------------------------------------ */

describe('S01-05C｜follow-up question identity regression (task §10)', () => {
  it('IMPLEMENTATION INVARIANT (ID-7): the gap-derived question identity is unchanged and not count-dependent', async () => {
    const attempt_id = 'ATT_00000000000000000000000001';
    assert.equal(
      followUpQuestionItemId(attempt_id, 'condition'),
      followUpQuestionItemId(attempt_id, 'condition'),
    );
    assert.equal(/:\d+$/.test(followUpQuestionItemId(attempt_id, 'condition')), false);

    const harness = makeReloadableHarness({
      kind: 'structured',
      value: parsePayload({ result_status_proposal: '未达到预期' }),
    });
    const started = await harness.service.beginCapture({
      operation_id: 'id7-begin',
      raw_text: TEXT_WORKFLOW,
    });
    const attempt = started.attempt;
    assert.ok(attempt !== null);
    if (attempt === null) {
      return;
    }
    /* Asked as the SECOND question: the identity must still be the gap's, not the position's. */
    await harness.service.askFollowUpQuestion({
      operation_id: 'id7-q1',
      attempt_id: attempt.attempt_id,
      question_text: '判断依据是什么？',
      target_gap: 'judgment_basis',
    });
    const asked = await harness.service.askFollowUpQuestion({
      operation_id: 'id7-q2',
      attempt_id: attempt.attempt_id,
      question_text: '当时的具体条件是什么？',
      target_gap: 'condition',
    });
    assert.equal(asked.kind, 'asked');
    assert.equal(asked.draft_state?.asked_key_question_count, 2);
    assert.equal(
      asked.question?.content_item_id,
      followUpQuestionItemId(attempt.attempt_id, 'condition'),
    );
    const items = await harness.repository.readAttemptContentItems(attempt.attempt_id);
    assert.equal(
      findContentItem(items, followUpQuestionItemId(attempt.attempt_id, 'condition'))?.field_key,
      FOLLOW_UP_QUESTION_FIELD_KEY,
    );
  });
});

/* ------------------------------------------------------------------ *
 * task §9 / §12 ID-8 - bounded positional-identity scan
 * ------------------------------------------------------------------ */

const HERE = dirname(fileURLToPath(import.meta.url));

function findRepoRoot(start: string): string {
  let current = start;
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(current, 'package.json'))) {
      return current;
    }
    current = dirname(current);
  }
  throw new Error(`Repository root not found above ${start}`);
}

const REPO_ROOT = findRepoRoot(HERE);

const SCAN_DIRECTORIES = ['src/domain', 'src/application/capture', 'src/workspace'] as const;

function listTsFiles(directory: string): readonly string[] {
  const files: string[] = [];
  if (!existsSync(directory)) {
    return files;
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTsFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const SCANNED = SCAN_DIRECTORIES.flatMap((relative) =>
  listTsFiles(join(REPO_ROOT, relative)).map((file) => ({
    short: file.slice(REPO_ROOT.length + 1).replace(/\\/g, '/'),
    code: stripComments(readFileSync(file, 'utf8')),
  })),
);

/**
 * Every function that PRODUCES an object identity in the scanned scope.
 * 🔴 Adding one is a deliberate act: it must be registered here with a non-positional
 *    discriminator, so a positional id cannot be introduced unnoticed.
 */
const ID_PRODUCERS: readonly string[] = [
  'aiParseExtractionItemId', // (attempt_id, canonical field_key)
  'attemptIdOfContentItemId', // reads the owning Attempt back out of a generated id
  'extractionItemId', // (attempt_id, field)
  'followUpAiExtractionItemId', // (attempt_id, field)
  'followUpQuestionItemId', // (attempt_id, canonical target_gap)
  'followUpUserAnswerItemId', // (attempt_id, field)
  'newContentItemId', // (attempt_id) + a freshly minted ULID body
  'newObjectId', // (logical kind) + a freshly minted ULID body
  'userFactItemId', // (attempt_id, field)
];

/** Function names that are predicates / parsers rather than producers. */
const NOT_A_PRODUCER = /^(is|assert|parse|to|require)/;
const LOOKS_LIKE_AN_ID_PRODUCER = /(?:Id|ItemId)$/;

/** index / position / array offset / sort order / length used as identity. */
const POSITIONAL_TOKEN = /\b(index|idx|position|offset|ordinal|length|count|order)\b/i;

/** An interpolation that reads an id field (e.g. `attempt_id`, `content_item_id`). */
const ID_READING_INTERPOLATION = /_id\b/;

/**
 * True when a template literal builds an identity out of a POSITION, i.e. it interpolates both
 * something id-like AND something index-like (the shape of the removed
 * `` `${attempt_id}:candidate_cause:${index}` ``).
 */
function isPositionalIdentityLiteral(text: string): boolean {
  const interpolations = [...text.matchAll(/\$\{([^}]*)\}/g)].map((entry) => entry[1] ?? '');
  if (interpolations.length < 2) {
    return false;
  }
  const reads_an_id = interpolations.some((entry) => ID_READING_INTERPOLATION.test(entry));
  const reads_a_position = interpolations.some((entry) => POSITIONAL_TOKEN.test(entry));
  return reads_an_id && reads_a_position;
}

/** The shapes the detector must separate. Written as plain strings on purpose. */
const OLD_DEFECT_LITERAL = '`${attempt_id}:candidate_cause:${index}`';
const KEPT_FIELD_LITERAL = '`${attempt_id}:${field}:user`';
const KEPT_GAP_LITERAL = '`${attempt_id}:followup_question:${target_gap}`';

describe('S01-05C｜positional-identity scan (task §9 / ID-8)', () => {
  it('IMPLEMENTATION INVARIANT (ID-8a): the scan is not vacuous - the real modules were read', () => {
    assert.ok(SCANNED.length >= 40, `expected the scanned module files, found ${SCANNED.length}`);
    const all = SCANNED.map((entry) => entry.code).join('\n');
    assert.ok(all.includes('newContentItemId'), 'the id producer must be in scope');
    assert.ok(all.includes('createAttemptRepository'), 'workspace must be in scope');
    assert.ok(all.includes('canonicalFieldKeyForAttemptField'), 'domain must be in scope');
  });

  it('IMPLEMENTATION INVARIANT (ID-8a2): the detector separates the defect from the kept shapes', () => {
    /* Negative control: the removed shape IS reported. */
    assert.equal(isPositionalIdentityLiteral(OLD_DEFECT_LITERAL), true);
    /* Positive controls: the surviving field-derived / gap-derived shapes are NOT reported. */
    assert.equal(isPositionalIdentityLiteral(KEPT_FIELD_LITERAL), false);
    assert.equal(isPositionalIdentityLiteral(KEPT_GAP_LITERAL), false);
  });

  it('IMPLEMENTATION INVARIANT (ID-8b): no identity producer accepts or receives a positional value', () => {
    /* (1) Signature: a producer must not even be ABLE to encode a position. */
    const declared = new Map<string, string>();
    for (const { short, code } of SCANNED) {
      for (const match of code.matchAll(
        /\bfunction\s+([A-Za-z_$][\w$]*)\s*(?:<[^<>]*>)?\s*\(([^)]*)\)/g,
      )) {
        const name = match[1];
        if (name === undefined || !LOOKS_LIKE_AN_ID_PRODUCER.test(name)) {
          continue;
        }
        if (NOT_A_PRODUCER.test(name)) {
          continue;
        }
        declared.set(name, `${short}::${match[2] ?? ''}`);
      }
    }
    assert.deepEqual(
      [...declared.keys()].sort(),
      [...ID_PRODUCERS].sort(),
      'the set of identity producers must be exactly the registered, non-positional ones',
    );
    for (const [name, signature] of declared) {
      assert.equal(
        POSITIONAL_TOKEN.test(signature),
        false,
        `${name} (${signature}) must not take a positional parameter`,
      );
    }

    /* (2) Call sites: no producer is ever called WITH a positional value. */
    let examined = 0;
    for (const { short, code } of SCANNED) {
      for (const name of ID_PRODUCERS) {
        for (const match of code.matchAll(new RegExp(`\\b${name}\\s*\\(([^)]*)\\)`, 'g'))) {
          examined += 1;
          const args = match[1] ?? '';
          assert.equal(
            POSITIONAL_TOKEN.test(args),
            false,
            `${short}: ${name}(${args}) is built from a position`,
          );
        }
      }
    }
    assert.ok(examined >= ID_PRODUCERS.length, `expected real call sites, found ${examined}`);
  });

  it('IMPLEMENTATION INVARIANT (ID-8c): no template literal mixes an id reading with a position', () => {
    const examined: string[] = [];
    for (const { short, code } of SCANNED) {
      for (const literal of code.matchAll(/`[^`]*`/g)) {
        const text = literal[0];
        if (text === undefined) {
          continue;
        }
        const interpolations = [...text.matchAll(/\$\{([^}]*)\}/g)];
        if (interpolations.length < 2) {
          continue;
        }
        examined.push(text);
        assert.equal(
          isPositionalIdentityLiteral(text),
          false,
          `${short}: identity built from a position -> ${text}`,
        );
      }
    }
    /* The scan really had material to look at, including the kept id shapes. */
    assert.ok(examined.length >= 5, `expected multi-interpolation literals, found ${examined.length}`);
    assert.ok(examined.some((text) => text.includes('followup_question')));
    assert.ok(examined.some((text) => text.includes(':user')));
  });

  it('IMPLEMENTATION INVARIANT (ID-8d): the removed positional id shapes are gone', () => {
    const all = SCANNED.map((entry) => `${entry.short}\n${entry.code}`).join('\n');
    for (const gone of [
      'causeContentItemId',
      'keyParameterItemId',
      ':candidate_cause:${',
      ':key_parameters:${',
      ':key_parameter:${',
      'asked_gap_set.length - 1',
    ]) {
      assert.equal(all.includes(gone), false, `"${gone}" must not exist in production code`);
    }
    /* The surviving field-derived / gap-derived identities are still there, unchanged. */
    for (const kept of [
      'followUpQuestionItemId',
      'aiParseExtractionItemId',
      'userFactItemId',
      'extractionItemId',
    ]) {
      assert.ok(all.includes(kept), `"${kept}" must still exist`);
    }
  });
});
