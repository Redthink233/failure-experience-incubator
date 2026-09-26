/**
 * S01 ｜ `M7` `Unknown`-result boundary (task §13 / §31).
 *
 * Canonical acceptance point: `AC-40` - a `Formal Attempt` whose result status is `Unknown` may
 * carry `grounding` / `context`, must NOT carry `support` / `contradict` ALONE, must not be removed
 * from the evidence list, and its context-only references must not be counted (`D-035` / `D-030`).
 *
 * 🔴 The rule is a SET-LEVEL rule: one `Unknown` record certainly may support a role, as long as the
 *    role set is not composed of `Unknown` records only. A per-row flag would silently forbid the
 *    second, known-result source.
 * 🔴 This file creates NO new `AC` and no new `Decision`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildGroundingContext } from '../../../retrieval/grounding/grounding-context.js';
import { resultStatusIsUnknown, unsatisfiedDirectionRoles } from '../../../retrieval/grounding/reference-rules.js';
import {
  ID_RELATED,
  ID_UNKNOWN,
  OWNER_HYPOTHESIS,
  allHistoricalOf,
  at,
  levelAPath,
  pick,
  seedFixture,
} from './harness.js';

describe('S01｜M7 Unknown result-status boundary', () => {
  it('AC-40 / U1: an Unknown-result Formal Attempt may carry grounding on a Fact', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [pick(ID_UNKNOWN, levelAPath(ID_UNKNOWN, 'condition'), 'grounding')],
    });

    assert.equal(outcome.kind, 'built');
    if (outcome.kind !== 'built') {
      return;
    }
    assert.equal(outcome.pack.citation.n_citation, 1);
    assert.equal(outcome.pack.has_grounding_reference, true);
  });

  it('AC-40 / U2: an Unknown-result Formal Attempt may carry context and is never deleted from the list', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const historical = await allHistoricalOf(retrieval);
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: historical,
      selections: [pick(ID_UNKNOWN, levelAPath(ID_UNKNOWN, 'goal'), 'context')],
    });

    assert.equal(outcome.kind, 'built');
    if (outcome.kind !== 'built') {
      return;
    }
    /* Present, labelled `context`, counted nowhere. */
    assert.equal(outcome.pack.traceability.length, 1);
    const row = outcome.pack.traceability[0];
    assert.equal(row?.target_id, ID_UNKNOWN);
    assert.equal(row?.role, 'context');
    assert.equal(row?.counted_toward_n_citation, false);
    assert.equal(outcome.pack.citation.n_citation, 0);
    /* And the record itself is still an eligible historical source of the pack. */
    assert.equal(outcome.pack.eligible_historical_target_ids.includes(ID_UNKNOWN), true);
  });

  it('AC-40 / U3: an Unknown-result record as the ONLY support is refused, not silently accepted', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [pick(ID_UNKNOWN, levelAPath(ID_UNKNOWN, 'condition'), 'support')],
    });

    assert.equal(outcome.kind, 'invalid');
    if (outcome.kind !== 'invalid') {
      return;
    }
    assert.deepEqual(
      [...outcome.rejections.map((rejection) => rejection.code)],
      ['UNKNOWN_RESULT_CANNOT_CARRY_DIRECTION_ALONE'],
    );
    assert.equal(outcome.rejections[0]?.selection_index, 0);
    assert.equal(outcome.rejections[0]?.target_id, ID_UNKNOWN);
  });

  it('AC-40 / U4: an Unknown-result record as the ONLY contradict is refused as well', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [pick(ID_UNKNOWN, levelAPath(ID_UNKNOWN, 'condition'), 'contradict')],
    });

    assert.equal(outcome.kind, 'invalid');
    if (outcome.kind !== 'invalid') {
      return;
    }
    assert.deepEqual(
      [...outcome.rejections.map((rejection) => rejection.code)],
      ['UNKNOWN_RESULT_CANNOT_CARRY_DIRECTION_ALONE'],
    );
  });

  it('AC-40 / U5: a second source with a known result makes the same direction legal', async () => {
    const { retrieval, record, source_attempt_id } = await seedFixture();
    const outcome = buildGroundingContext({
      owner_id: OWNER_HYPOTHESIS,
      source_attempt_id,
      derivation: record,
      historical_attempts: await allHistoricalOf(retrieval),
      selections: [
        pick(ID_UNKNOWN, levelAPath(ID_UNKNOWN, 'condition'), 'support'),
        pick(ID_RELATED, levelAPath(ID_RELATED, 'condition'), 'support'),
      ],
    });

    assert.equal(outcome.kind, 'built');
    if (outcome.kind !== 'built') {
      return;
    }
    assert.equal(outcome.pack.citation.n_citation, 2);
  });

  it('IMPLEMENTATION INVARIANT（`AC-40` 判据可机器核验）/ U6: the predicate is set-level', async () => {
    const { retrieval } = await seedFixture();
    const unknown = await retrieval.repository.readAttempt(at(ID_UNKNOWN));
    const related = await retrieval.repository.readAttempt(at(ID_RELATED));
    assert.ok(unknown !== null && related !== null);
    assert.equal(resultStatusIsUnknown(unknown), true);
    assert.equal(resultStatusIsUnknown(related), false);

    assert.deepEqual(
      [
        ...unsatisfiedDirectionRoles([
          { role: 'support', target_id: 'ATT_a', target_result_unknown: true },
        ]),
      ],
      ['support'],
    );
    assert.deepEqual(
      [
        ...unsatisfiedDirectionRoles([
          { role: 'support', target_id: 'ATT_a', target_result_unknown: true },
          { role: 'support', target_id: 'ATT_b', target_result_unknown: false },
        ]),
      ],
      [],
    );
    assert.deepEqual(
      [
        ...unsatisfiedDirectionRoles([
          { role: 'grounding', target_id: 'ATT_a', target_result_unknown: true },
          { role: 'context', target_id: 'ATT_a', target_result_unknown: true },
        ]),
      ],
      [],
      'grounding / context are never constrained by the result status',
    );
  });
});
