/**
 * T4 ｜ `LevelAProjection` maps exactly the four canonical dimensions to their frozen
 * primary field paths.
 *
 * ITC-05 (Level A projection).
 * Canonical AC references used by this file:
 *   AC-04 / AC-20 / AC-22 / AC-114 / AC-137.
 * 🔴 This file creates NO new AC.
 *
 * Implementation basis: the FROZEN contract §9.4.1
 * (`goal -> goal` / `approach -> actual_attempt` / `condition -> condition` /
 *  `result -> actual_result`) and §12 item 6.
 *
 * IMPLEMENTATION INVARIANT: the projection is a pure, deterministic function with exactly
 * ONE primary field path per dimension; it uses neither `result_status`, `expected_result`,
 * `judgment_basis` nor `failure_tag(s)`, and computes no numeric similarity.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  LEVEL_A_DIMENSION_LABELS,
  LEVEL_A_DIMENSIONS,
  LEVEL_A_FIELD_PATH_MAP,
  LEVEL_A_FIELD_PATHS,
  fieldPathForLevelADimension,
  levelADimensionForFieldPath,
} from '../../domain/types/level-a.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import { isUnknownIntercepted } from '../../domain/types/presence.js';
import { provided } from '../../domain/types/presence.js';
import {
  LEVEL_A_FORBIDDEN_SOURCE_FIELDS,
  dimensionOfProjectedFieldPath,
  presencePairOf,
  projectAttemptToLevelA,
  projectedFieldPathOf,
  projectedItemOf,
  projectedPresenceOf,
  unknownLevelADimensions,
} from '../../domain/projection/level-a.js';
import { decisionInferenceItem, displayInferenceItem, extractionItem, factItem } from '../../domain/types/source-type.js';
import { makeDraft, makeFormal } from './fixtures.js';

describe('T4 Level A projection｜four dimensions → frozen field paths', () => {
  it('[AC-20] the mapping table is exactly the frozen §9.4.1 table', () => {
    assert.deepEqual(
      { ...LEVEL_A_FIELD_PATH_MAP },
      {
        goal: 'goal',
        approach: 'actual_attempt',
        condition: 'condition',
        result: 'actual_result',
      },
    );
    assert.deepEqual(
      [...LEVEL_A_DIMENSIONS],
      ['goal', 'approach', 'condition', 'result'],
    );
    assert.deepEqual(
      [...LEVEL_A_FIELD_PATHS],
      ['goal', 'actual_attempt', 'condition', 'actual_result'],
    );
    // Exactly one primary field path per dimension: 4 dimensions, 4 distinct paths.
    assert.equal(Object.keys(LEVEL_A_FIELD_PATH_MAP).length, 4);
    assert.equal(new Set(Object.values(LEVEL_A_FIELD_PATH_MAP)).size, 4);
  });

  it('IMPLEMENTATION INVARIANT (contract §9.4.1): the dimension ↔ path mapping is bijective', () => {
    for (const dimension of LEVEL_A_DIMENSIONS) {
      const path = fieldPathForLevelADimension(dimension);
      assert.equal(levelADimensionForFieldPath(path), dimension);
      assert.equal(LEVEL_A_DIMENSION_LABELS[dimension].length > 0, true);
    }
    assert.throws(() => levelADimensionForFieldPath('not_a_path' as never));
  });

  it('IMPLEMENTATION INVARIANT: none of the forbidden source fields is a Level A field path', () => {
    for (const forbidden of LEVEL_A_FORBIDDEN_SOURCE_FIELDS) {
      assert.ok(
        !(LEVEL_A_FIELD_PATHS as readonly string[]).includes(forbidden),
        `"${forbidden}" must not be a Level A primary field path`,
      );
      assert.ok(
        !Object.values(LEVEL_A_FIELD_PATH_MAP).includes(forbidden as never),
        `"${forbidden}" must not appear in the mapping table`,
      );
    }
    // The four explicitly banned fields really exist on Attempt, so the ban is meaningful.
    assert.ok((LEVEL_A_FORBIDDEN_SOURCE_FIELDS as readonly string[]).includes('result_status'));
    assert.ok((LEVEL_A_FORBIDDEN_SOURCE_FIELDS as readonly string[]).includes('expected_result'));
    assert.ok((LEVEL_A_FORBIDDEN_SOURCE_FIELDS as readonly string[]).includes('judgment_basis'));
    assert.ok((LEVEL_A_FORBIDDEN_SOURCE_FIELDS as readonly string[]).includes('failure_tags'));
  });

  it('[AC-04] projecting a Draft yields four explicit unknowns, never empty values', () => {
    const projection = projectAttemptToLevelA(makeDraft());

    for (const dimension of LEVEL_A_DIMENSIONS) {
      assert.equal(projectedPresenceOf(projection, dimension), 'unknown');
      assert.equal(projectedItemOf(projection, dimension), null);
      assert.notEqual(projectedItemOf(projection, dimension), '');
      assert.equal(
        projectedFieldPathOf(projection, dimension),
        LEVEL_A_FIELD_PATH_MAP[dimension],
      );
    }
    assert.deepEqual([...unknownLevelADimensions(projection)], [...LEVEL_A_DIMENSIONS]);
  });

  it('[T4] IMPLEMENTATION INVARIANT (contract §9.4.1): each dimension is projected from the correct Attempt field', () => {
    const projection = projectAttemptToLevelA(makeFormal());

    assert.deepEqual(
      {
        goal: projectedItemOf(projection, 'goal')?.value,
        approach: projectedItemOf(projection, 'approach')?.value,
        condition: projectedItemOf(projection, 'condition')?.value,
        result: projectedItemOf(projection, 'result')?.value,
      },
      {
        goal: '缩短干燥时长',
        approach: '提升热风温度',
        condition: '50 摄氏度',
        result: '出现明显开裂',
      },
    );
    for (const dimension of LEVEL_A_DIMENSIONS) {
      assert.equal(projectedPresenceOf(projection, dimension), 'present');
      assert.equal(
        dimensionOfProjectedFieldPath(projectedFieldPathOf(projection, dimension)),
        dimension,
      );
    }
    assert.deepEqual([...unknownLevelADimensions(projection)], []);
  });

  it('IMPLEMENTATION INVARIANT: the projection is pure and deterministic', () => {
    const attempt = makeFormal();
    const first = projectAttemptToLevelA(attempt);
    const second = projectAttemptToLevelA(attempt);

    assert.deepEqual(first, second);
    assert.notEqual(first, second); // fresh object each call — no shared mutable state
    assert.deepEqual(
      LEVEL_A_DIMENSIONS.map((dimension) => first[dimension].field_path),
      LEVEL_A_DIMENSIONS.map((dimension) => second[dimension].field_path),
    );
    // The source object is never mutated.
    const before = JSON.stringify(attempt);
    projectAttemptToLevelA(attempt);
    assert.equal(JSON.stringify(attempt), before);
  });

  it('IMPLEMENTATION INVARIANT (§9.4.1): result_status / expected_result / judgment_basis / failure_tags do not affect the projection', () => {
    const base = makeFormal();
    const altered = {
      ...base,
      result_status: { presence_state: 'unknown' } as const,
      expected_result: provided(factItem('CI-expected', '期望不出现开裂')),
      judgment_basis: provided(extractionItem('CI-basis', '参考了历史记录')),
      failure_tags: ['thermal'],
      user_note: provided(factItem('CI-note', '现场备注')),
    };

    assert.deepEqual(projectAttemptToLevelA(base), projectAttemptToLevelA(altered));
  });

  it('[AC-114][AC-22] either side unknown ⇒ uncompared; two unknowns are never matched', () => {
    assert.equal(isUnknownIntercepted('unknown', 'present'), true);
    assert.equal(isUnknownIntercepted('present', 'unknown'), true);
    assert.equal(isUnknownIntercepted('unknown', 'unknown'), true);
    assert.equal(isUnknownIntercepted('present', 'present'), false);

    const current = projectAttemptToLevelA(makeDraft());
    const historical = projectAttemptToLevelA(makeFormal());
    const pair = presencePairOf(current, historical, 'goal');
    assert.equal(pair.dimension, 'goal');
    assert.equal(pair.left, 'unknown');
    assert.equal(pair.right, 'present');
    assert.equal(isUnknownIntercepted(pair.left, pair.right), true);

    // Both unknown: structurally intercepted, and therefore never comparable/matched.
    const bothUnknown = presencePairOf(current, projectAttemptToLevelA(makeDraft()), 'condition');
    assert.equal(isUnknownIntercepted(bothUnknown.left, bothUnknown.right), true);
  });

  it('[AC-137] the projection references Attempt fields only - never a file name or a list position', () => {
    const projection = projectAttemptToLevelA(makeFormal());
    const paths = LEVEL_A_DIMENSIONS.map((dimension) => projection[dimension].field_path);
    for (const path of paths) {
      assert.ok(!path.includes('/'));
      assert.ok(!path.includes('.md'));
      assert.ok(!path.includes('.json'));
      assert.equal(typeof path, 'string');
    }
    assert.equal(paths.length, 4);
  });

  it('IMPLEMENTATION INVARIANT: no numeric similarity is produced by the projection', () => {
    const projection = projectAttemptToLevelA(makeFormal());
    const serialized = JSON.stringify(projection);

    for (const forbidden of ['similarity', 'score', 'confidence', 'percent', 'grade']) {
      assert.ok(!serialized.includes(forbidden), `projection must not expose "${forbidden}"`);
    }
    // Unknown dimensions never receive a computed default value.
    const withUnknown = projectAttemptToLevelA(makeFormal({ condition: { presence_state: 'unknown' } }));
    assert.equal(projectedItemOf(withUnknown, 'condition'), null);
    assert.equal(projectedPresenceOf(withUnknown, 'condition'), 'unknown');
    // A ContentItem that happens to be an Inference keeps its own source type in the projection.
    const inferenceGoal = projectAttemptToLevelA(
      makeFormal({ goal: provided(displayInferenceItem('CI-ai-goal', 'AI 归纳的目标')) }),
    );
    assert.equal(projectedItemOf(inferenceGoal, 'goal')?.source_type, 'Inference');
    const extractionGoal = projectAttemptToLevelA(
      makeFormal({ goal: provided(extractionItem('CI-ex-goal', '抽取的目标')) }),
    );
    assert.equal(projectedItemOf(extractionGoal, 'goal')?.source_type, 'Extraction');
    assert.equal(
      projectedItemOf(
        projectAttemptToLevelA(
          makeFormal({ result_status: provided(decisionInferenceItem('CI-s', 'Failed', 'accepted')) }),
        ),
        'result',
      )?.source_type,
      'Fact',
    );
  });

  it('[AC-137] dimension identity survives projection for every dimension', () => {
    const projection = projectAttemptToLevelA(makeFormal());
    const roundTripped = LEVEL_A_DIMENSIONS.map(
      (dimension: LevelADimension) =>
        levelADimensionForFieldPath(projection[dimension].field_path),
    );
    assert.deepEqual(roundTripped, [...LEVEL_A_DIMENSIONS]);
  });
});
