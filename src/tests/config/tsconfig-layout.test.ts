/**
 * IMPLEMENTATION INVARIANT ｜ Root config split and repository hygiene (S01-01A)
 *                          + Wave-1 compile boundary (S01-W1-PREP)
 *                          + proxy test scope / placeholder removal (S01-W1-INTEGRATE).
 *
 * Not a product AC. It is the compile-time / configuration counterpart of
 * `domain-purity.test.ts`: that guard proves layers 1-2 contain no DOM *references*,
 * this one proves the compiler configuration keeps DOM *unavailable* to them - and
 * that the browser / server scopes exist separately instead of by widening the core.
 *
 * Guarantees asserted here:
 *   ① a framework-neutral NO-DOM scope exists for Domain + Workspace + the `src/ai` M10 contract
 *      (`tsconfig.core.json`, lib = ES2022 only);
 *   ② a separate DOM-enabled scope exists for browser code
 *      (`tsconfig.browser.json`, lib includes DOM + DOM.Iterable, no node types);
 *   ③ a separate Node-aware NO-DOM scope exists for the server runtime
 *      (`tsconfig.server.json`: `api/proxy/**` + `src/server/**` + `src/ai/**`);
 *   ④ the default `npm run typecheck` stays core + Node tests with NO DOM;
 *   ⑤ `npm run build` / `npm test` / `npm run test:proxy` emit to separate directories;
 *   ⑥ `.gitignore` ignores build/dependency noise but keeps the authoritative records;
 *   ⑦ the three runtime scopes are mutually exclusive - no browser path in core/server,
 *      no `api/proxy` path in core/browser - and the core lib is never widened to make
 *      browser code compile;
 *   ⑧ 🔴 `tsconfig.proxy-test.json` is the ONE deliberate exception that may compile
 *      `api/proxy/**` into a test process, and it does so in an INDEPENDENT output directory
 *      so the 224 pre-existing tests keep their emitted layout;
 *   ⑨ 🔴 (`S01-05-INTEGRATE`) `src/application/**` — the `D9` steps ①-⑤ layer — is part of the
 *      SAME framework-neutral NO-DOM scope as the domain it orchestrates, AND part of the
 *      production build. Before this change it was only reachable through the test import graph,
 *      so `dist/` carried no application module at all.
 *
 * References: contract §0.2 / §12 (layering, no UI in the core), contract §0.4 D
 * (M10 interface / M11 browser / M12 server runtime split) and Gate C Plan §I.1 / §J.3.
 *
 * 🔴 This file creates NO new AC. Every case is an IMPLEMENTATION INVARIANT.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');

const CORE_CONFIG = 'tsconfig.core.json';
const BROWSER_CONFIG = 'tsconfig.browser.json';
const SERVER_CONFIG = 'tsconfig.server.json';
const PROXY_TEST_CONFIG = 'tsconfig.proxy-test.json';

interface RawTsconfig {
  readonly extends?: string;
  readonly compilerOptions?: {
    readonly lib?: readonly string[];
    readonly types?: readonly string[];
    readonly outDir?: string;
    readonly rootDir?: string;
    readonly noEmit?: boolean;
  };
  readonly include?: readonly string[];
}

interface EffectiveTsconfig {
  readonly lib: readonly string[];
  readonly types: readonly string[];
  readonly include: readonly string[];
  readonly outDir: string | null;
  readonly rootDir: string | null;
  readonly noEmit: boolean | null;
}

function readJson(path: string): RawTsconfig {
  return JSON.parse(readFileSync(path, 'utf8')) as RawTsconfig;
}

/**
 * Follows the `extends` chain so the assertions see the EFFECTIVE `lib` / `types`,
 * never just what one file locally happens to declare.
 */
function effectiveTsconfig(name: string): EffectiveTsconfig {
  const chain: RawTsconfig[] = [];
  let current: string | undefined = name;
  while (current !== undefined) {
    const raw = readJson(join(REPO_ROOT, current));
    chain.unshift(raw);
    current = raw.extends;
  }

  let lib: readonly string[] = [];
  let types: readonly string[] = [];
  let include: readonly string[] = [];
  let outDir: string | null = null;
  let rootDir: string | null = null;
  let noEmit: boolean | null = null;

  for (const layer of chain) {
    const options = layer.compilerOptions;
    if (options?.lib !== undefined) {
      lib = options.lib;
    }
    if (options?.types !== undefined) {
      types = options.types;
    }
    if (options?.outDir !== undefined) {
      outDir = options.outDir;
    }
    if (options?.rootDir !== undefined) {
      rootDir = options.rootDir;
    }
    if (options?.noEmit !== undefined) {
      noEmit = options.noEmit;
    }
    if (layer.include !== undefined) {
      include = layer.include;
    }
  }

  return { lib, types, include, outDir, rootDir, noEmit };
}

function readManifest(): {
  readonly scripts: Record<string, string>;
  readonly dependencies: Record<string, string>;
} {
  return JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
  };
}

/** Every NON-glob input must really exist - the "no fake business code" rule. */
function concreteInputsOf(config: EffectiveTsconfig): readonly string[] {
  return config.include.filter((pattern) => !pattern.includes('*'));
}

function assertNoDom(config: EffectiveTsconfig, label: string): void {
  assert.ok(!config.lib.includes('DOM'), `${label} must not enable DOM`);
  assert.ok(!config.lib.includes('DOM.Iterable'), `${label} must not enable DOM.Iterable`);
  assert.ok(
    ![...config.types].some((type) => type.toLowerCase() === 'dom'),
    `${label} must not pull in DOM types`,
  );
}

function assertIncludes(config: EffectiveTsconfig, pattern: string, label: string): void {
  assert.ok(config.include.includes(pattern), `${label} must cover "${pattern}" (got: ${config.include.join(', ')})`);
}

function assertExcludesPath(config: EffectiveTsconfig, segment: string, label: string): void {
  for (const pattern of config.include) {
    assert.ok(
      !pattern.toLowerCase().includes(segment),
      `${label} must NOT include "${pattern}" ("${segment}" is out of scope)`,
    );
  }
}

/** Recursive `.ts` file count under a repo-relative directory; 0 when the directory is absent. */
function countTsFiles(relative_directory: string): number {
  const root = join(REPO_ROOT, relative_directory);
  if (!existsSync(root)) {
    return 0;
  }
  let total = 0;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      total += countTsFiles(`${relative_directory}/${entry.name}`);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      total += 1;
    }
  }
  return total;
}

describe('IMPLEMENTATION INVARIANT｜root config split, scripts and .gitignore', () => {
  it('IMPLEMENTATION INVARIANT (root config split): the framework-neutral core scope has NO DOM', () => {
    const core = effectiveTsconfig(CORE_CONFIG);

    assert.deepEqual([...core.lib], ['ES2022']);
    assert.ok(!core.lib.includes('DOM'));
    assert.ok(!core.lib.includes('DOM.Iterable'));
    assert.deepEqual([...core.types], ['node']);

    // The core scope really covers both framework-neutral layers.
    assertIncludes(core, 'src/domain/**/*.ts', 'core scope');
    assertIncludes(core, 'src/workspace/**/*.ts', 'core scope');
    // 🔴 S01-05-INTEGRATE: the `D9` steps ①-⑤ application layer is framework-neutral by
    //    construction, so it belongs to the SAME NO-DOM scope as the domain it orchestrates.
    assertIncludes(core, 'src/application/**/*.ts', 'core scope');
    assertExcludesPath(core, 'browser', 'core scope');
  });

  it('IMPLEMENTATION INVARIANT (root config split): a separate browser scope enables DOM + DOM.Iterable', () => {
    const browser = effectiveTsconfig(BROWSER_CONFIG);

    assert.ok(browser.lib.includes('DOM'), browser.lib.join(', '));
    assert.ok(browser.lib.includes('DOM.Iterable'), browser.lib.join(', '));
    assert.ok(browser.lib.includes('ES2022'));
    // 🔴 The browser scope must not inherit the Node type environment.
    assert.deepEqual([...browser.types], []);

    // 🔴 S01-W1-INTEGRATE: the S01-01A placeholder is gone. `src/browser/**/*.ts` is the only entry
    //    and it must resolve to real browser business code (no fake module, no empty scope).
    assert.deepEqual(
      [...concreteInputsOf(browser)],
      [],
      'the S01-01A placeholder must be removed once src/browser/** contains real modules',
    );
    assertIncludes(browser, 'src/browser/**/*.ts', 'browser scope');
    assert.ok(countTsFiles('src/browser') > 0, 'src/browser must contain the real browser modules');
  });

  it('IMPLEMENTATION INVARIANT (root config split): the default typecheck stays core + Node tests with NO DOM', () => {
    const all = effectiveTsconfig('tsconfig.json');

    assert.deepEqual([...all.lib], ['ES2022']);
    assert.ok(!all.lib.includes('DOM'));
    assert.deepEqual([...all.types], ['node']);
    assert.equal(all.noEmit, true);

    assertIncludes(all, 'src/tests/**/*.ts', 'default typecheck');
    assertIncludes(all, 'src/domain/**/*.ts', 'default typecheck');
    assertIncludes(all, 'src/workspace/**/*.ts', 'default typecheck');
    assertExcludesPath(all, 'browser', 'default typecheck');
  });

  it('IMPLEMENTATION INVARIANT (root config split): core typecheck, browser typecheck and test are separate scripts', () => {
    const { scripts } = readManifest();

    assert.equal(scripts['typecheck'], 'tsc -p tsconfig.json');
    assert.equal(scripts['typecheck:core'], 'tsc -p tsconfig.core.json');
    assert.equal(scripts['typecheck:browser'], 'tsc -p tsconfig.browser.json');
    assert.ok(scripts['test']?.includes('tsconfig.test.json'));
    assert.ok(scripts['build']?.includes('tsconfig.build.json'));

    // Every script names a config file that really exists.
    for (const name of ['tsconfig.json', 'tsconfig.core.json', 'tsconfig.browser.json', 'tsconfig.base.json', 'tsconfig.build.json', 'tsconfig.test.json', 'tsconfig.proxy-test.json']) {
      assert.ok(existsSync(join(REPO_ROOT, name)), `${name} is missing`);
    }
  });

  it('IMPLEMENTATION INVARIANT (root config split): build and test emit to separate directories', () => {
    const build = effectiveTsconfig('tsconfig.build.json');
    const test = effectiveTsconfig('tsconfig.test.json');

    assert.equal(build.outDir, 'dist');
    assert.equal(build.noEmit, false);
    assert.equal(test.outDir, 'dist-test');
    assert.equal(test.noEmit, false);
    // 🔴 The test build keeps the Node type environment and never gains DOM.
    assert.deepEqual([...test.types], ['node']);
    assert.ok(!test.lib.includes('DOM'));
    // The production build is the framework-neutral core only.
    assertIncludes(build, 'src/domain/**/*.ts', 'build scope');
    // 🔴 S01-05-INTEGRATE: `src/application/**` was previously reachable ONLY through the test
    //    import graph, so the production build emitted no application module at all.
    assertIncludes(build, 'src/application/**/*.ts', 'build scope');
    assert.ok(!build.include.some((pattern) => pattern.includes('tests')));
  });

  it('IMPLEMENTATION INVARIANT (root config split): .gitignore ignores build noise but keeps authoritative records', () => {
    const gitignore = readFileSync(join(REPO_ROOT, '.gitignore'), 'utf8');

    for (const ignored of ['node_modules/', 'dist/', 'dist-test/', 'dist-proxy-test/', 'coverage/', '.env', '*.log']) {
      assert.ok(gitignore.includes(ignored), `.gitignore must ignore ${ignored}`);
    }
    // 🔴 Never ignore the authoritative records or the sources themselves.
    for (const kept of ['docs/', 'src/', 'package-lock.json', '.learnbuddy/', '20_INTEGRATION/']) {
      const ignoredLines = gitignore
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('!'));
      assert.ok(
        !ignoredLines.includes(kept) && !ignoredLines.includes(`/${kept}`),
        `.gitignore must NOT ignore ${kept}`,
      );
    }
  });
});

describe('IMPLEMENTATION INVARIANT｜Wave-1 compile boundary (core / browser / server)', () => {
  it('IMPLEMENTATION INVARIANT (compile boundary A): core scope = framework-neutral NO DOM, covering domain + workspace + `src/ai` M10 contract', () => {
    const core = effectiveTsconfig(CORE_CONFIG);

    assert.deepEqual([...core.lib], ['ES2022']);
    assertNoDom(core, 'core scope');
    assert.deepEqual([...core.types], ['node']);

    assertIncludes(core, 'src/domain/**/*.ts', 'core scope');
    assertIncludes(core, 'src/workspace/**/*.ts', 'core scope');
    assertIncludes(core, 'src/ai/**/*.ts', 'core scope');
    // 🔴 S01-05-INTEGRATE: the application layer joins the core NO-DOM scope.
    assertIncludes(core, 'src/application/**/*.ts', 'core scope');
    assert.ok(
      countTsFiles('src/application') > 0,
      'src/application must contain the real D9 steps ①-⑤ modules',
    );
  });

  it('IMPLEMENTATION INVARIANT (compile boundary B): browser scope = DOM + DOM.Iterable, types = [], covering `src/browser/**`', () => {
    const browser = effectiveTsconfig(BROWSER_CONFIG);

    assert.deepEqual([...browser.lib], ['ES2022', 'DOM', 'DOM.Iterable']);
    assert.deepEqual([...browser.types], []);
    assertIncludes(browser, 'src/browser/**/*.ts', 'browser scope');

    // 🔴 Framework-neutral contracts come in over the import graph, never by re-globbing
    // the core scopes (or copying the domain types) inside the browser scope.
    const foreignGlobs = browser.include.filter(
      (pattern) => pattern.includes('**') && !pattern.startsWith('src/browser/'),
    );
    assert.deepEqual(
      [...foreignGlobs],
      [],
      `browser scope must resolve core contracts via imports (got: ${browser.include.join(', ')})`,
    );

    // 🔴 S01-W1-INTEGRATE: no placeholder input any more - see the case above for the detail.
    assert.deepEqual([...concreteInputsOf(browser)], [], 'the S01-01A placeholder must be removed');
    assert.ok(countTsFiles('src/browser') > 0, 'src/browser must contain real browser modules');
  });

  it('IMPLEMENTATION INVARIANT (compile boundary C): server scope = ES2022 + node types, NO DOM, covering `api/proxy/**` + `src/server/**` + `src/ai/**`', () => {
    const server = effectiveTsconfig(SERVER_CONFIG);

    assert.deepEqual([...server.lib], ['ES2022']);
    assertNoDom(server, 'server scope');
    assert.deepEqual([...server.types], ['node'], 'the server scope must have the Node type environment');
    assertIncludes(server, 'api/proxy/**/*.ts', 'server scope');
    // 🔴 S01-W1-INTEGRATE: the M12 pure policy moved to `src/server/proxy/**`; the Node shell that
    //    consumes it must keep compiling it, together with the M10 contract it implements.
    assertIncludes(server, 'src/server/**/*.ts', 'server scope');
    assertIncludes(server, 'src/ai/**/*.ts', 'server scope');

    // 🔴 S01-W1-INTEGRATE: the S01-01A placeholder is gone - every entry is real business code.
    assert.deepEqual([...concreteInputsOf(server)], [], 'the S01-01A placeholder must be removed');
    assert.ok(countTsFiles('src/server') > 0, 'src/server must contain the M12 policy modules');
  });

  it('IMPLEMENTATION INVARIANT (compile boundary H): the proxy test scope is the ONE deliberate `api/proxy` exception, with an independent output directory', () => {
    const proxy_test = effectiveTsconfig(PROXY_TEST_CONFIG);

    // Same type environment as the server scope: Node, NO DOM.
    assert.deepEqual([...proxy_test.lib], ['ES2022']);
    assertNoDom(proxy_test, 'proxy test scope');
    assert.deepEqual([...proxy_test.types], ['node'], 'the proxy test scope must have the Node type environment');

    // It really covers the Node transport shell...
    assertIncludes(proxy_test, 'api/proxy/**/*.ts', 'proxy test scope');

    // ...and writes somewhere DISJOINT from every existing output directory, so the 224
    // pre-existing tests keep their emitted layout untouched.
    assert.equal(proxy_test.outDir, 'dist-proxy-test');
    assert.equal(proxy_test.noEmit, false);
    assert.equal(proxy_test.rootDir, '.', 'rootDir must span both src/** and api/**');
    for (const name of [CORE_CONFIG, BROWSER_CONFIG, SERVER_CONFIG, 'tsconfig.json', 'tsconfig.build.json', 'tsconfig.test.json']) {
      assert.notEqual(
        effectiveTsconfig(name).outDir,
        proxy_test.outDir,
        `${name} must not share the proxy test output directory`,
      );
    }

    assert.ok(countTsFiles('api/proxy') > 0, 'api/proxy must contain the Node transport shell');
  });

  it('IMPLEMENTATION INVARIANT (compile boundary D): no browser path may enter the core / server / default / build / test scope', () => {
    for (const name of [CORE_CONFIG, SERVER_CONFIG, 'tsconfig.json', 'tsconfig.build.json', 'tsconfig.test.json']) {
      assertExcludesPath(effectiveTsconfig(name), 'browser', name);
    }

    // The browser scope must be a genuinely different scope, not the core scope renamed.
    const core = effectiveTsconfig(CORE_CONFIG);
    const browser = effectiveTsconfig(BROWSER_CONFIG);
    assert.notDeepStrictEqual([...browser.lib], [...core.lib]);
    assert.notDeepStrictEqual([...browser.types], [...core.types]);
  });

  it('IMPLEMENTATION INVARIANT (compile boundary E): no `api/proxy` path may enter the core / browser / default / build / test scope', () => {
    for (const name of [CORE_CONFIG, BROWSER_CONFIG, 'tsconfig.json', 'tsconfig.build.json', 'tsconfig.test.json']) {
      const config = effectiveTsconfig(name);
      assertExcludesPath(config, 'api/proxy', name);
      assertExcludesPath(config, 'api/', name);
      assertExcludesPath(config, 'proxy', name);
    }

    // M11 (browser direct) and M12 (thin proxy) never share one runtime scope:
    // the browser side reaches M12 over the network, never by import.
    assert.ok(
      !effectiveTsconfig(BROWSER_CONFIG).include.some((pattern) => pattern.includes('api/proxy')),
      'browser scope must not compile the server proxy',
    );
  });

  it('IMPLEMENTATION INVARIANT (compile boundary F): root scripts expose typecheck / typecheck:core / typecheck:browser / typecheck:server / test:proxy', () => {
    const { scripts } = readManifest();

    assert.equal(scripts['typecheck'], 'tsc -p tsconfig.json');
    assert.equal(scripts['typecheck:core'], 'tsc -p tsconfig.core.json');
    assert.equal(scripts['typecheck:browser'], 'tsc -p tsconfig.browser.json');
    assert.equal(scripts['typecheck:server'], 'tsc -p tsconfig.server.json');
    // 🔴 S01-W1-INTEGRATE: the dedicated server/proxy behaviour-test entry point.
    assert.equal(
      scripts['test:proxy'],
      'tsc -p tsconfig.proxy-test.json && node --test "dist-proxy-test/**/*.test.js"',
    );

    for (const name of ['tsconfig.json', 'tsconfig.base.json', CORE_CONFIG, BROWSER_CONFIG, SERVER_CONFIG, 'tsconfig.build.json', 'tsconfig.test.json', PROXY_TEST_CONFIG]) {
      assert.ok(existsSync(join(REPO_ROOT, name)), `${name} is missing`);
    }
  });

  it('IMPLEMENTATION INVARIANT (compile boundary G): the core `lib` is never widened to make browser code compile', () => {
    const core = effectiveTsconfig(CORE_CONFIG);

    // The DOM is granted by the browser scope ALONE.
    assert.deepEqual([...core.lib], ['ES2022']);
    assertNoDom(core, 'core scope');
    assert.ok(
      !core.include.some((pattern) => pattern.includes('browser')),
      'a browser path must never be added to the core include list',
    );

    const browser = effectiveTsconfig(BROWSER_CONFIG);
    assert.ok(browser.lib.includes('DOM') && browser.lib.includes('DOM.Iterable'));
    assert.ok(browser.include.includes('src/browser/**/*.ts'));

    // Every other scope stays NO-DOM as well.
    for (const name of ['tsconfig.json', SERVER_CONFIG, 'tsconfig.build.json', 'tsconfig.test.json']) {
      assertNoDom(effectiveTsconfig(name), name);
    }
  });
});

describe('IMPLEMENTATION INVARIANT｜S01-03 retrieval scope (layer 3)', () => {
  /**
   * `M6` (Retrieval / Comparator) is framework-neutral by construction: it consumes the domain
   * projection, the `M2` storage abstraction and the `M10` provider INTERFACE. It therefore belongs
   * to the SAME NO-DOM core scope as the layers below it - granting it DOM would be the first step
   * towards browser logic leaking into the retrieval layer.
   */
  it('IMPLEMENTATION INVARIANT (retrieval scope): the framework-neutral core covers `src/retrieval/**` with NO DOM', () => {
    const core = effectiveTsconfig(CORE_CONFIG);

    assert.deepEqual([...core.lib], ['ES2022']);
    assertNoDom(core, 'core scope');
    assert.deepEqual([...core.types], ['node']);
    assertIncludes(core, 'src/retrieval/**/*.ts', 'core scope');
    assert.ok(
      countTsFiles('src/retrieval') > 0,
      'src/retrieval must contain the real M6 modules',
    );
  });

  it('IMPLEMENTATION INVARIANT (retrieval scope): the default typecheck also covers `src/retrieval/**` and stays NO DOM', () => {
    const all = effectiveTsconfig('tsconfig.json');

    assertIncludes(all, 'src/retrieval/**/*.ts', 'default typecheck');
    assertNoDom(all, 'default typecheck');
    assert.equal(all.noEmit, true);
  });

  it('IMPLEMENTATION INVARIANT (retrieval scope): the production build really contains `src/retrieval/**`', () => {
    const build = effectiveTsconfig('tsconfig.build.json');

    assertIncludes(build, 'src/retrieval/**/*.ts', 'build scope');
    assert.equal(build.outDir, 'dist');
    assertNoDom(build, 'build scope');
    // Tests, browser code and the server proxy stay outside the production build.
    assert.ok(!build.include.some((pattern) => pattern.includes('tests')));
    assertExcludesPath(build, 'browser', 'build scope');
    assertExcludesPath(build, 'api/', 'build scope');
  });

  it('IMPLEMENTATION INVARIANT (retrieval scope): no retrieval path may enter the browser / server scopes', () => {
    for (const name of [BROWSER_CONFIG, SERVER_CONFIG, PROXY_TEST_CONFIG]) {
      assertExcludesPath(effectiveTsconfig(name), 'retrieval', name);
    }
  });
});
