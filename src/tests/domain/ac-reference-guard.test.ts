/**
 * IMPLEMENTATION INVARIANT ｜ AC reference guard.
 *
 * Not a product AC. Gate C Plan §N.2 requires that
 *   - every test assertion names an EXISTING canonical AC,
 *   - the suite never references a non-existent AC,
 *   - the suite never invents a new AC.
 *
 * This guard scans the S01-01 test sources and verifies:
 *   ① every referenced `AC-n` is inside the canonical continuous range (≤ 162);
 *   ② every referenced `AC-Q06-n` is inside the independent range (1–6);
 *   ③ every test file either references at least one canonical AC or declares an
 *      `IMPLEMENTATION INVARIANT` (the sanctioned marker when no product AC exists);
 *   ④ the guard is not vacuous (it really does see AC references).
 *
 * The canonical totals are fixed by the frozen contract §0.4 E.10:
 * 162 continuous + 6 independent = 168 valid acceptance points.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const TESTS_DIR = join(REPO_ROOT, 'src', 'tests');

/** Frozen canonical magnitudes (contract §0.4 E.10). NOT an assertion about AC content. */
const MAX_CONTINUOUS_AC = 162;
const MAX_Q06_AC = 6;

function listTestFiles(directory: string): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTestFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      files.push(path);
    }
  }
  return files;
}

function continuousAcNumbers(source: string): readonly number[] {
  return [...source.matchAll(/\bAC-(\d+)\b/g)]
    .map((match) => Number.parseInt(match[1] ?? '', 10))
    .filter((value) => Number.isFinite(value));
}

function q06AcNumbers(source: string): readonly number[] {
  return [...source.matchAll(/\bAC-Q06-(\d+)\b/g)]
    .map((match) => Number.parseInt(match[1] ?? '', 10))
    .filter((value) => Number.isFinite(value));
}

/** Titles of the individual `it(...)` cases declared in a test source file. */
function testTitlesOf(source: string): readonly string[] {
  return [...source.matchAll(/\bit\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g)]
    .map((match) => match[1] ?? match[2] ?? match[3] ?? '')
    .filter((title) => title.length > 0);
}

describe('IMPLEMENTATION INVARIANT｜AC reference guard (Gate C Plan §N.2)', () => {
  const files = listTestFiles(TESTS_DIR);
  const sources = files.map((file) => ({ file, source: readFileSync(file, 'utf8') }));
  const allContinuous = sources.flatMap(({ source }) => continuousAcNumbers(source));

  it('IMPLEMENTATION INVARIANT: the guard is not vacuous - the suite references canonical ACs', () => {
    assert.ok(files.length >= 6, `expected test files, found ${files.length}`);
    assert.ok(
      allContinuous.length >= 20,
      `expected many canonical AC references, found ${allContinuous.length}`,
    );
    assert.ok(Math.min(...allContinuous) >= 1);
  });

  it('IMPLEMENTATION INVARIANT (rule ①): every referenced canonical AC stays inside the existing range', () => {
    const outOfRange = allContinuous.filter((value) => value > MAX_CONTINUOUS_AC);
    assert.deepEqual(outOfRange, [], `out-of-range AC references: ${outOfRange.join(', ')}`);
    assert.ok(Math.max(...allContinuous) <= MAX_CONTINUOUS_AC);
  });

  it('IMPLEMENTATION INVARIANT (rule ②): every referenced independent AC-Q06 stays inside the existing range', () => {
    const allQ06 = sources.flatMap(({ source }) => q06AcNumbers(source));
    const outOfRange = allQ06.filter((value) => value > MAX_Q06_AC || value < 1);
    assert.deepEqual(outOfRange, [], `out-of-range AC-Q06 references: ${outOfRange.join(', ')}`);
  });

  it('IMPLEMENTATION INVARIANT (rule ③): every test file names a canonical AC or declares an invariant', () => {
    for (const { file, source } of sources) {
      const namesAc = continuousAcNumbers(source).length > 0;
      const declaresInvariant = source.includes('IMPLEMENTATION INVARIANT');
      assert.ok(
        namesAc || declaresInvariant,
        `${file} names no canonical AC and declares no IMPLEMENTATION INVARIANT`,
      );
    }
  });

  it('IMPLEMENTATION INVARIANT (rule ④): every individual test names a canonical AC or an invariant', () => {
    for (const { file, source } of sources) {
      for (const title of testTitlesOf(source)) {
        const namesAc = /AC-(?:\d+|Q06-\d+)/.test(title);
        const declaresInvariant = title.includes('IMPLEMENTATION INVARIANT');
        assert.ok(
          namesAc || declaresInvariant,
          `${file}: test "${title}" names neither an AC nor an IMPLEMENTATION INVARIANT`,
        );
      }
    }
  });

  it('IMPLEMENTATION INVARIANT (rule ⑤): the AC totals used by the project are reported consistently', () => {
    assert.equal(MAX_CONTINUOUS_AC, 162);
    assert.equal(MAX_Q06_AC, 6);
    assert.equal(MAX_CONTINUOUS_AC + MAX_Q06_AC, 168);
  });
});
