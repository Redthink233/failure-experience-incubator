/**
 * `RECOVERY-POLISH-01` ｜ **POLISH-A（`DEMO-08` 文案）+ POLISH-C（真零命中脚本）** —— P1–P4 / P11–P15。
 *
 * 🔴 WHAT THIS SUITE PROVES:
 *      P1–P3  `DEMO-08` lost its cross-domain 竹材域 residue and kept every structured value;
 *      P4     the baseline is still eight and still idempotent;
 *      P11    the new zero-hit script is REGISTERED as text and is NOT a ninth seeded record;
 *      P12    its four `Level A` dimensions have NO deterministic match against `DEMO-01`…`DEMO-08`
 *             - checked with the PRODUCT'S OWN frozen rule (`deterministicDimensionVerdict`), with
 *             the retired `-03` collision as a positive control;
 *      P13    the retired `-03` is still retired and no registry entry revives it;
 *      P14    `TE-DEMO-LIVE-01` is byte-identical to what it was;
 *      P15    a fresh seed still pre-seeds no derived object at all.
 *
 * 🔴 SCOPE OF EVIDENCE, STATED HONESTLY: P12 proves only that the DETERMINISTIC rule pass does not
 *    return `matched` for any of the four dimensions. The dimensions it leaves `undecided` belong to
 *    the dimension judge, so a REAL zero-hit can only be OBSERVED in the `PSA` / rehearsal. This
 *    suite does NOT claim `REAL 0-HIT VERIFIED`, and no `matched` set / `N_检索` is stored anywhere.
 *    These are `IMPLEMENTATION INVARIANT` cases; no `AC` / `Decision` / `CCR` is created.
 */

import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import type { LevelADimension } from '../../domain/types/level-a.js';
import { LEVEL_A_DIMENSIONS } from '../../domain/types/level-a.js';
import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import { deterministicDimensionVerdict } from '../../retrieval/compare/field-rules.js';
import {
  DEMO_ATTEMPTS,
  DEMO_ATTEMPT_COUNT,
  LIVE_DEMO_SCRIPTS,
  LIVE_DEMO_SCRIPTS_ARE_NOT_SEEDED,
  TE_DEMO_LIVE_01,
  TE_DEMO_ZERO_01,
  demoAttemptByKey,
  readDemoBaseline,
  seedDemoBaseline,
} from '../../demo/index.js';
import { REPO_ROOT, readRepoFile } from '../ai/source-scan.js';

/* ------------------------------------------------------------------ *
 * P1 - P4 - the DEMO-08 wording fix touches exactly one thing
 * ------------------------------------------------------------------ */

const DEMO_08_ID = 'ATT_DEM0A080000000000000000000';

describe('RECOVERY-POLISH-01 ｜ POLISH-A - P1 / P2 / P3: DEMO-08 lost its cross-domain residue', () => {
  it('P1 / IMPLEMENTATION INVARIANT: the 竹材域 residue is gone from DEMO-08', () => {
    const text = demoAttemptByKey('DEMO-08')?.raw_text ?? '';
    assert.equal(text.includes('干燥温度'), false, 'DEMO-08 is a 论文写作 record - no drying temperature');
    assert.equal(text.includes('不适用'), false, 'DEMO-08 must not say 「不适用」 about a drying field');
    assert.ok(
      text.includes('当时没有额外记录其它条件'),
      'DEMO-08 must state, naturally, that nothing else was recorded',
    );
    assert.ok(text.includes('避免虚假引用'), 'the record must still be about avoiding fake citations');
    assert.ok(text.includes('幻觉引用明显下降'), 'and still carry its own result');

    /* The same-domain fixtures keep their own, domain-appropriate wording. */
    assert.ok((demoAttemptByKey('DEMO-03')?.raw_text ?? '').includes('干燥温度'));
    assert.ok((demoAttemptByKey('DEMO-01')?.raw_text ?? '').includes('烘干温度'));
    assert.ok((demoAttemptByKey('DEMO-05')?.raw_text ?? '').includes('当时没有额外记录其它条件'));
  });

  it('P2 / IMPLEMENTATION INVARIANT: DEMO-08 still declares `condition` as unknown', () => {
    const fixture = demoAttemptByKey('DEMO-08');
    assert.ok(fixture !== null);
    /* `null` IS the explicit 「未知 / 未提供」 - never an empty string, never a value. */
    assert.equal(fixture.condition, null);
    assert.equal(fixture.result_status, 'Success', 'the status is untouched');
  });

  it('P3 / IMPLEMENTATION INVARIANT: DEMO-08 keeps its object id, Project and structured values', () => {
    const fixture = demoAttemptByKey('DEMO-08');
    assert.ok(fixture !== null);
    assert.equal(String(fixture.attempt_id), DEMO_08_ID);
    assert.equal(fixture.project_id, 'PRJ_DEM0PRC0000000000000000000', 'still 论文写作');
    assert.equal(fixture.archive_state, 'active');
    assert.equal(fixture.goal, '避免虚假引用');
    assert.equal(fixture.actual_attempt, '引用校验后处理 + 人工复核');
    assert.equal(fixture.actual_result, '幻觉引用明显下降');
    /* 🔴 No equipment / version / temperature / cost / threshold / environment / cause was invented. */
    for (const invented of ['设备', '版本', '°C', '成本', '阈值', '温度']) {
      assert.equal(fixture.raw_text.includes(invented), false, `DEMO-08 must not mention ${invented}`);
    }
  });

  it('P4 / IMPLEMENTATION INVARIANT: the baseline is still exactly eight, and re-seeds idempotently', async () => {
    assert.equal(DEMO_ATTEMPT_COUNT, 8);
    assert.equal(DEMO_ATTEMPTS.length, 8);

    const storage = new InMemoryWorkspaceStorage();
    const first = await seedDemoBaseline({ storage });
    assert.equal(first.kind, 'seeded');
    const second = await seedDemoBaseline({ storage });
    assert.equal(second.kind, 'seeded');
    if (second.kind !== 'seeded') {
      return;
    }
    assert.equal(second.result.created, 0, 'a repeated seed creates nothing');
    assert.equal(second.result.reused, 8, 'the eight records are recognised and preserved');
    assert.deepEqual(
      (await readDemoBaseline(storage)).map((attempt) => String(attempt.attempt_id)),
      DEMO_ATTEMPTS.map((fixture) => String(fixture.attempt_id)),
    );
  });
});

/* ------------------------------------------------------------------ *
 * P11 / P12 - the zero-hit fixture is text, and it has no deterministic hit
 * ------------------------------------------------------------------ */

/** The four `Level A` values of a Demo fixture, `null` where the fixture declares it unknown. */
function demoDimensionValues(
  fixture_key: string,
): Readonly<Record<LevelADimension, string | null>> {
  const fixture = demoAttemptByKey(fixture_key);
  assert.ok(fixture !== null, `${fixture_key} must exist`);
  return {
    goal: fixture.goal,
    approach: fixture.actual_attempt,
    condition: fixture.condition,
    result: fixture.actual_result,
  };
}

/** Every file under a directory, relative to it - used to audit the committed delivery asset. */
function filesUnder(root: string, prefix = ''): readonly string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const relative = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      found.push(...filesUnder(root, relative));
    } else {
      found.push(relative);
    }
  }
  return found;
}

describe('RECOVERY-POLISH-01 ｜ POLISH-C - P11: the zero-hit script is registered text, never data', () => {
  it('P11 / IMPLEMENTATION INVARIANT: the probe is derived verbatim from the registered input', () => {
    assert.equal(TE_DEMO_ZERO_01.te_id, 'TE-DEMO-ZERO-01');
    const probe = TE_DEMO_ZERO_01.expected_level_a_parse;
    assert.ok(probe !== undefined, 'the static probe must be registered');

    /* 🔴 Every non-null probe value is a CONTIGUOUS slice of the registered input - not a rewrite. */
    for (const value of [probe.goal, probe.actual_attempt, probe.actual_result]) {
      assert.ok(value.length > 0);
      assert.ok(
        TE_DEMO_ZERO_01.step_a_input.includes(value),
        `the probe value 「${value}」 must appear verbatim in the registered input`,
      );
    }
    assert.equal(probe.condition, null, 'the input says nothing else was recorded');
    assert.equal(TE_DEMO_ZERO_01.step_a_input.includes('当时没有额外记录其它条件'), true);
    assert.equal(TE_DEMO_ZERO_01.design_expectations.length > 0, true);
  });

  it('P11 / IMPLEMENTATION INVARIANT: neither the script nor any probe is a ninth seeded record', async () => {
    assert.equal(LIVE_DEMO_SCRIPTS_ARE_NOT_SEEDED, true);

    const storage = new InMemoryWorkspaceStorage();
    await seedDemoBaseline({ storage });
    const stored = await readDemoBaseline(storage);
    assert.equal(stored.length, 8);

    for (const attempt of stored) {
      assert.equal(attempt.raw_text.value.includes('问卷'), false, 'the zero-hit input is not seeded');
      assert.equal(attempt.raw_text.value.includes('短信提醒'), false);
    }
    for (const fixture of DEMO_ATTEMPTS) {
      assert.equal(fixture.raw_text.includes('问卷回收率'), false, fixture.fixture_key);
    }
    /* Nor is it hiding in the committed delivery asset. */
    for (const file of filesUnder(join(REPO_ROOT, 'demo-workspace'))) {
      /* Only the marker is read as raw text; the rest are matched by name, which is enough here. */
      assert.equal(/questionnaire|zero-?hit/i.test(file), false, file);
    }
  });

  it('P11 / IMPLEMENTATION INVARIANT (static): the seed path never imports the script registry', () => {
    for (const path of ['src/demo/seed-demo-baseline.ts', 'src/demo/demo-baseline-definition.ts']) {
      const source = readRepoFile(path);
      assert.equal(
        source.includes('live-demo-script'),
        false,
        `${path} must not pull the live scripts into the seed path`,
      );
      assert.equal(source.includes('TE_DEMO_ZERO_01'), false, `${path} must not reference the probe`);
    }
  });
});

describe('RECOVERY-POLISH-01 ｜ POLISH-C - P12: no DETERMINISTIC Level A match against DEMO-01…08', () => {
  it('P12 / IMPLEMENTATION INVARIANT (control): the retired `-03` collision WOULD be detected here', () => {
    /*
     * 🔴 The positive control that keeps P12 from being vacuous. The retired `-03` script was
     *    withdrawn because one of its `Level A` dimensions collided with `DEMO-03`; the very same
     *    rule pass must therefore return `matched` for that pair.
     */
    const demo03 = demoDimensionValues('DEMO-03');
    assert.equal(demo03.goal, '缩短干燥周期');
    const collision = deterministicDimensionVerdict('缩短干燥周期', demo03.goal ?? '');
    assert.equal(collision.verdict, 'matched');
    assert.equal(collision.rule, 'notation_equivalence');
    /* 🔴 One matched dimension is already decisive: `related` ⇔ the matched set is non-empty (D-061). */

    /*
     * 🔴 AN INACCURACY IN THE `§K.5` CORRECTION TABLE, RECORDED HONESTLY. That table writes
     *    「热风干燥、提高风量」 in BOTH columns for `actual_attempt`, but `DEMO-03`'s fixture is
     *    「热风干燥 + 提高风量」 - the separator differs, so this row was NEVER verbatim-equal and the
     *    deterministic rules leave it `undecided`. The retirement conclusion is unaffected (the
     *    `goal` collision above is enough on its own), but the row must not be read as verbatim.
     */
    assert.equal(demo03.approach, '热风干燥 + 提高风量');
    assert.equal(
      deterministicDimensionVerdict('热风干燥、提高风量', demo03.approach ?? '').verdict,
      'undecided',
      'the -03 attempt wording differs from the fixture by its separator, not by its substance',
    );
  });

  it('P12 / IMPLEMENTATION INVARIANT: all four dimensions are non-`matched` against all eight', () => {
    const probe = TE_DEMO_ZERO_01.expected_level_a_parse;
    assert.ok(probe !== undefined);

    const probe_values: Readonly<Record<LevelADimension, string | null>> = {
      goal: probe.goal,
      approach: probe.actual_attempt,
      condition: probe.condition,
      result: probe.actual_result,
    };

    const examined: string[] = [];
    const undecided: string[] = [];

    for (const fixture of DEMO_ATTEMPTS) {
      const demo_values = demoDimensionValues(fixture.fixture_key);
      for (const dimension of LEVEL_A_DIMENSIONS) {
        const left = probe_values[dimension];
        const right = demo_values[dimension];
        /* An unknown dimension on EITHER side is structurally `uncompared`, never a match (AC-22). */
        if (left === null || right === null) {
          examined.push(`${fixture.fixture_key}.${dimension}:structural_unknown`);
          continue;
        }
        const verdict = deterministicDimensionVerdict(left, right);
        examined.push(`${fixture.fixture_key}.${dimension}:${verdict.verdict}`);
        assert.notEqual(
          verdict.verdict,
          'matched',
          `${fixture.fixture_key}.${dimension} must not be a deterministic match`,
        );
        if (verdict.verdict === 'undecided') {
          undecided.push(`${fixture.fixture_key}.${dimension}`);
        }
      }
    }

    /* Sanity: the rule pass really ran over four dimensions of eight fixtures. */
    assert.equal(examined.length, 32);
    assert.ok(undecided.length > 0, 'the rules must genuinely run, not silently no-op');
    assert.equal(examined.every((entry) => !entry.endsWith(':matched')), true);
  });

  it('P12 / IMPLEMENTATION INVARIANT: the one uncertain dimension cannot break the zero-hit claim', () => {
    const probe = TE_DEMO_ZERO_01.expected_level_a_parse;
    assert.ok(probe !== undefined);
    /*
     * 🔴 `condition` is NOT force-mapped to a field (§11). Both readings are therefore checked:
     *    (a) the parse yields an unknown condition ⇒ structurally uncompared;
     *    (b) the parse yields 「截止前 24 小时」 ⇒ still no match against any seeded condition.
     *    Neither reading may be fabricated into a hit, and neither may be fabricated into a miss.
     */
    const hypothetical_clause = '截止前 24 小时';
    let compared = 0;
    for (const fixture of DEMO_ATTEMPTS) {
      const seeded = demoDimensionValues(fixture.fixture_key).condition;
      if (seeded === null) {
        continue;
      }
      compared += 1;
      const verdict = deterministicDimensionVerdict(hypothetical_clause, seeded);
      assert.notEqual(verdict.verdict, 'matched', `${fixture.fixture_key}.condition`);
    }
    assert.equal(compared, 4, 'four fixtures carry a seeded condition (DEMO-01/02/04/07)');
    /* The literal clause must remain inside the registered input, so the what-if stays grounded. */
    assert.ok(TE_DEMO_ZERO_01.step_a_input.includes(hypothetical_clause));
  });
});

/* ------------------------------------------------------------------ *
 * P13 / P14 - the retired script stays retired, the live script stays frozen
 * ------------------------------------------------------------------ */

describe('RECOVERY-POLISH-01 ｜ POLISH-C - P13 / P14: retirement is permanent, the main script is frozen', () => {
  it('P13 / IMPLEMENTATION INVARIANT: `TE-DEMO-LIVE-03` is still RETIRED and nothing revives it', () => {
    for (const script of LIVE_DEMO_SCRIPTS) {
      assert.notEqual(script.te_id, 'TE-DEMO-LIVE-03', 'the retired script must not be re-registered');
    }
    assert.deepEqual(
      LIVE_DEMO_SCRIPTS.map((script) => script.te_id),
      ['TE-DEMO-LIVE-01', 'TE-DEMO-ZERO-01'],
    );
    /* The authority is the doc, and it must still say so in place (in-place annotation, not a rewrite). */
    const doc = readRepoFile('docs/architecture/05_TEST_DEMO_DEPLOY.md');
    assert.ok(doc.includes('TE-DEMO-LIVE-03'), 'the retired script keeps its record');
    assert.ok(/TE-DEMO-LIVE-03[\s\S]{0,400}RETIRED/u.test(doc), 'its RETIRED status is intact');
    assert.ok(doc.includes('缩短干燥周期'), 'the original text is preserved, not deleted');
    /* And the replacement input is registered in the same place. */
    assert.ok(doc.includes('TE-DEMO-ZERO-01'), 'the zero-hit script must be registered in §K');
  });

  it('P14 / IMPLEMENTATION INVARIANT: `TE-DEMO-LIVE-01` is byte-identical to the frozen rehearsal text', () => {
    assert.equal(TE_DEMO_LIVE_01.te_id, 'TE-DEMO-LIVE-01');
    assert.equal(TE_DEMO_LIVE_01.title, '主脚本：竹材干燥 50 摄氏度（单位等价 + 同义改写命中）');
    assert.equal(
      TE_DEMO_LIVE_01.step_a_input,
      '这次干燥还是没成功。我想降低竹片干燥后的颜色变化，用的还是热风干燥、调整送风参数那条路线，' +
        '烘干温度设的是 50 摄氏度，一开始含水率就偏高，干燥结束以后含水率还是偏高，板面出现明显开裂。' +
        '设备还是同一台热风循环干燥箱。',
    );
    assert.equal(TE_DEMO_LIVE_01.design_expectations.length, 7);
    assert.equal(
      TE_DEMO_LIVE_01.expected_level_a_parse,
      undefined,
      'the main script gains no static probe - its expectation needs the dimension judge',
    );
  });
});

/* ------------------------------------------------------------------ *
 * P15 - nothing derived is pre-seeded
 * ------------------------------------------------------------------ */

describe('RECOVERY-POLISH-01 ｜ P15: a fresh seed still writes no derived object', () => {
  it('P15 / IMPLEMENTATION INVARIANT: no Retrieval / Insight / Hypothesis / EvidenceRef is pre-seeded', async () => {
    const storage = new InMemoryWorkspaceStorage();
    await seedDemoBaseline({ storage });

    const json_paths = storage.filePathsWithExtension('.json');
    assert.equal(json_paths.length, 13, 'three projects + eight attempts + metadata + marker');
    for (const path of json_paths) {
      assert.equal(
        /retrieval|derivation|insight|hypothes|evidence/i.test(path),
        false,
        `${path} must not be a pre-seeded derived artifact`,
      );
    }

    for (const attempt of await readDemoBaseline(storage)) {
      assert.equal(attempt.state, 'Formal');
      assert.equal(attempt.data_source_nature, 'demo_sample');
      assert.deepEqual(attempt.candidate_causes, []);
      assert.deepEqual(attempt.key_parameters, []);
      assert.deepEqual(attempt.failure_tags, []);
    }

    /* The committed delivery asset has the same shape - and gained no derived file this task. */
    const asset_files = filesUnder(join(REPO_ROOT, 'demo-workspace'));
    assert.equal(asset_files.length, 21, 'three projects + eight attempts ×2 + metadata + marker');
    for (const file of asset_files) {
      assert.equal(
        /retrieval|derivation|insight|hypothes|evidence/i.test(file),
        false,
        `${file} must not be a committed derived artifact`,
      );
      assert.equal(/ZERO|questionnaire/i.test(file), false, `${file} must not hold the probe text`);
    }
  });
});
