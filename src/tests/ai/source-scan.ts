/**
 * Source-tree scan helpers shared by the S01-04 structural invariants.
 *
 * 🔴 WHY A ROOT SEARCH INSTEAD OF `resolve(HERE, '../../..')`: the S01-04 suite spans several
 *    depths (`dist-test/tests/ai`, `dist-test/tests/proxy`, `dist-test/tests/browser/ai`), so a
 *    fixed number of `..` segments is only correct for one of them. Walking up to the directory that
 *    contains `package.json` + `tsconfig.base.json` is depth-independent and fails loudly instead
 *    of silently scanning the wrong directory.
 *
 * The 109 pre-existing tests keep their own fixed-depth computation; this helper is additive and
 * does not change them.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));

export function findRepoRoot(start: string): string {
  let current = start;
  for (let depth = 0; depth < 10; depth += 1) {
    if (existsSync(join(current, 'package.json')) && existsSync(join(current, 'tsconfig.base.json'))) {
      return current;
    }
    const parent = resolve(current, '..');
    if (parent === current) {
      break;
    }
    current = parent;
  }
  throw new Error(`Repository root not found above ${start}`);
}

export const REPO_ROOT = findRepoRoot(HERE);

export function listSourceFiles(directory: string): readonly string[] {
  if (!existsSync(directory)) {
    return [];
  }
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

export function repoFiles(relative_directory: string): readonly string[] {
  return listSourceFiles(join(REPO_ROOT, relative_directory));
}

export function readRepoFile(relative_path: string): string {
  return readFileSync(join(REPO_ROOT, relative_path), 'utf8');
}

/** Removes comments so that prose *about* a prohibition is not counted as a violation. */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((line) => {
      const index = line.indexOf('//');
      return index < 0 ? line : line.slice(0, index);
    })
    .join('\n');
}

/** Removes comments AND string/template literals, for identifier scans. */
export function stripCommentsAndStrings(source: string): string {
  return stripComments(source)
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

/** Every module specifier of a source file, with comments stripped first. */
export function importSpecifiersOf(source: string): readonly string[] {
  const stripped = stripComments(source);
  const specifiers: string[] = [];
  const pattern = /(?:from\s+|import\s*\(\s*)'([^']+)'/g;
  let match = pattern.exec(stripped);
  while (match !== null) {
    if (match[1] !== undefined) {
      specifiers.push(match[1]);
    }
    match = pattern.exec(stripped);
  }
  return specifiers;
}

export interface DirectoryScan {
  readonly directory: string;
  readonly files: readonly string[];
  readonly sources: readonly { readonly file: string; readonly source: string }[];
}

export function scanDirectory(relative_directory: string): DirectoryScan {
  const absolute = join(REPO_ROOT, relative_directory);
  const files = listSourceFiles(absolute);
  return {
    directory: relative_directory,
    files,
    sources: files.map((file) => ({ file, source: readFileSync(file, 'utf8') })),
  };
}
