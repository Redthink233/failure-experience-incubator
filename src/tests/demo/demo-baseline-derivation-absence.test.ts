/**
 * `M16` ｜ **Demo 基线「没有预置什么」** + 资产卫生 —— D10–D13 / §25 / §33。
 *
 * 🔴 一套 seed 的**可信度**不只取决于「它写了什么」，还取决于「它**没写**什么」。
 *    `Insight` / `Hypothesis` / `EvidenceRef` / `Retrieval Derivation` 一旦被预置，
 *    就等于伪造了「系统曾经推理过」，并且会让 ⑥–⑩ 的现场生成失去意义（doc §J.1 / §J.4）。
 *
 * 🔴 本文件同时是**交付资产**的看门人：`demo-workspace/**` 是要进仓库、要被浏览器选择、
 *    要被人打开看的东西，因此必须逐项证明它只有 21 个文件、只有 `Attempt` 对象、
 *    没有密钥、没有真实用户数据。
 *
 * Canonical references used: AC-48 / AC-49 / AC-76 / AC-97.
 * 凡是断言结构的地方都标 `IMPLEMENTATION INVARIANT`。
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import {
  REPO_ROOT,
  importSpecifiersOf,
  readRepoFile,
  repoFiles,
  stripComments,
} from '../ai/source-scan.js';
import { seedDemoBaseline } from '../../demo/index.js';

/* ------------------------------------------------------------------ *
 * The committed asset
 * ------------------------------------------------------------------ */

const ASSET_DIRECTORY = 'demo-workspace';
const ASSET_ROOT = join(REPO_ROOT, ASSET_DIRECTORY);

/**
 * The physical file count of a seeded workspace:
 *   1 `workspace.json` + 1 operator marker + 3 `project.json` + 8 × (sidecar `.json` + `.md`).
 */
const WORKSPACE_JSON_FILES = 13;
const WORKSPACE_MARKDOWN_FILES = 8;

function listFiles(directory: string): readonly string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...listFiles(path));
    } else if (entry.isFile()) {
      found.push(path);
    }
  }
  return found;
}

/** Directories that would mean a DERIVED object family had been pre-seeded. */
const DERIVED_DIRECTORY_NAMES = ['retrievals', 'insights', 'hypotheses', 'events', 'evidence'];

/** Object types that must NEVER appear in the demo asset. */
const FORBIDDEN_OBJECT_TYPES = ['Insight', 'Hypothesis', 'EvidenceRef', 'RetrievalDerivation', 'Event'];

/* ------------------------------------------------------------------ *
 * D10 - D13 (in-memory): nothing derived is written by the seed
 * ------------------------------------------------------------------ */

describe('M16 ｜ D10 - D13 - the seed writes the Attempt layer and nothing above it', () => {
  it('D13 / AC-97 / IMPLEMENTATION INVARIANT: a seeded workspace holds no Retrieval Derivation', async () => {
    const storage = new InMemoryWorkspaceStorage();
    await seedDemoBaseline({ storage });

    const files = storage.filePathsWithExtension('.json');
    assert.equal(
      files.length,
      WORKSPACE_JSON_FILES,
      'one workspace.json + one operator marker + three project.json + eight sidecars',
    );
    for (const path of files) {
      const text = await storage.readFile(path);
      assert.equal(text.includes('RetrievalDerivation'), false, `${path} declares a derivation`);
      assert.equal(text.includes('retrieval_derivation'), false, `${path} carries a derivation`);
      assert.equal(text.includes('n_retrieval'), false, `${path} carries a retrieval count`);
    }
  });

  it('D10 / AC-48 / IMPLEMENTATION INVARIANT: a seeded workspace holds no Insight', async () => {
    const storage = new InMemoryWorkspaceStorage();
    await seedDemoBaseline({ storage });
    for (const path of storage.filePathsWithExtension('.json')) {
      const text = await storage.readFile(path);
      assert.equal(text.includes('"Insight"'), false, `${path} declares an Insight`);
      assert.equal(text.includes('n_citation'), false, `${path} carries a citation count`);
    }
    assert.equal(await storage.exists('insights'), false);
  });

  it('D11 / AC-48 / IMPLEMENTATION INVARIANT: a seeded workspace holds no Hypothesis', async () => {
    const storage = new InMemoryWorkspaceStorage();
    await seedDemoBaseline({ storage });
    for (const path of storage.filePathsWithExtension('.json')) {
      const text = await storage.readFile(path);
      assert.equal(text.includes('"Hypothesis"'), false, `${path} declares a Hypothesis`);
      assert.equal(text.includes('model_suggestion'), false, `${path} carries a model suggestion`);
    }
    assert.equal(await storage.exists('hypotheses'), false);
  });

  it('D12 / AC-48 / IMPLEMENTATION INVARIANT: a seeded workspace holds no EvidenceRef and no matched result', async () => {
    const storage = new InMemoryWorkspaceStorage();
    await seedDemoBaseline({ storage });
    for (const path of storage.filePathsWithExtension('.json')) {
      const text = await storage.readFile(path);
      assert.equal(text.includes('EvidenceRef'), false, `${path} declares an EvidenceRef`);
      assert.equal(text.includes('evidence_ref'), false, `${path} carries an evidence reference`);
      /* 🔴 No gold retrieval result, no matched set - a stored verdict would fake the live run. */
      assert.equal(text.includes('matched'), false, `${path} carries a matched marker`);
      assert.equal(text.includes('related'), false, `${path} carries a relatedness verdict`);
      assert.equal(text.includes('compared_not_matched'), false, `${path} carries a verdict`);
    }
  });

  it('AC-48 / AC-49 / IMPLEMENTATION INVARIANT: two seeds never produce a derived object either', async () => {
    const storage = new InMemoryWorkspaceStorage();
    await seedDemoBaseline({ storage });
    await seedDemoBaseline({ storage });
    assert.equal(storage.filePathsWithExtension('.json').length, WORKSPACE_JSON_FILES);
    assert.equal(storage.filePathsWithExtension('.md').length, WORKSPACE_MARKDOWN_FILES);
  });
});

/* ------------------------------------------------------------------ *
 * §25 - the static scan of the committed demo workspace
 * ------------------------------------------------------------------ */

describe('M16 ｜ §25 - the committed demo workspace contains no derived artefact', () => {
  it('IMPLEMENTATION INVARIANT: the demo workspace asset really exists and has exactly 21 files', () => {
    assert.ok(existsSync(ASSET_ROOT), `${ASSET_DIRECTORY}/ must be committed as a selectable asset`);
    const files = listFiles(ASSET_ROOT);
    assert.equal(
      files.length,
      21,
      `expected 1 workspace.json + 1 marker + 3 project.json + 8 × (json + md); found:\n${files
        .map((file) => relative(ASSET_ROOT, file))
        .sort()
        .join('\n')}`,
    );
  });

  it('IMPLEMENTATION INVARIANT: no derived-object DIRECTORY exists (empty directories are the only allowed form)', () => {
    const directories: string[] = [];
    const walk = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
          continue;
        }
        directories.push(entry.name);
        walk(join(directory, entry.name));
      }
    };
    walk(ASSET_ROOT);

    for (const name of DERIVED_DIRECTORY_NAMES) {
      assert.equal(
        directories.includes(name),
        false,
        `the demo asset must not contain a "${name}" directory`,
      );
    }
    assert.deepEqual([...directories].sort(), [
      'PRJ_DEM0PRA0000000000000000000',
      'PRJ_DEM0PRB0000000000000000000',
      'PRJ_DEM0PRC0000000000000000000',
      'attempts',
      'attempts',
      'attempts',
      'projects',
    ]);
  });

  it('IMPLEMENTATION INVARIANT: every committed object declares an ALLOWED object_type', () => {
    const declared: string[] = [];
    for (const file of listFiles(ASSET_ROOT)) {
      if (!file.endsWith('.json')) {
        continue;
      }
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      const objectType = parsed['object_type'];
      if (objectType !== undefined) {
        declared.push(String(objectType));
        for (const forbidden of FORBIDDEN_OBJECT_TYPES) {
          assert.notEqual(objectType, forbidden, `${relative(ASSET_ROOT, file)} is a ${forbidden}`);
        }
      }
      const text = readFileSync(file, 'utf8');
      assert.equal(text.includes('matched_level_a_dimensions'), false);
      assert.equal(text.includes('evidence_ref'), false);
    }
    /* Eight Attempt sidecars - and no ninth. */
    assert.equal(declared.filter((value) => value === 'Attempt').length, 8);
    assert.deepEqual(
      [...new Set(declared)].sort(),
      ['Attempt'],
      'the asset must only ever declare Attempt objects',
    );
  });

  it('AC-48 / IMPLEMENTATION INVARIANT: the asset is entirely demo-labelled and byte-identical to a fresh seed', async () => {
    const files = listFiles(ASSET_ROOT);
    const sidecars = files.filter((file) => /ATT_DEM0A\d{2}.*\.json$/u.test(file));
    assert.equal(sidecars.length, 8);
    for (const sidecar of sidecars) {
      const parsed = JSON.parse(readFileSync(sidecar, 'utf8')) as Record<string, unknown>;
      assert.equal(parsed['data_source_nature'], 'demo_sample');
      assert.equal(parsed['state'], 'Formal');
      assert.equal(parsed['object_type'], 'Attempt');
    }

    const archived = sidecars.filter((file) => {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      return parsed['archive_state'] === 'archived';
    });
    assert.equal(archived.length, 1, 'exactly one archived fixture (DEMO-07)');
    assert.ok(archived[0]?.includes('ATT_DEM0A07'));
  });

  it('IMPLEMENTATION INVARIANT: the asset carries the operator marker and the frozen workspace identity', () => {
    const marker = JSON.parse(
      readFileSync(join(ASSET_ROOT, '.demo-workspace-marker.json'), 'utf8'),
    ) as Record<string, unknown>;
    assert.equal(marker['marker'], 'failure-experience-incubator/demo-workspace-baseline');
    assert.equal(marker['workspace_id'], 'WS_DEM0WS00000000000000000000');

    const metadata = JSON.parse(readFileSync(join(ASSET_ROOT, 'workspace.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    assert.equal(metadata['workspace_id'], 'WS_DEM0WS00000000000000000000');
    assert.equal(metadata['schema_version'], '1');
  });
});

/* ------------------------------------------------------------------ *
 * §33 - repository hygiene
 * ------------------------------------------------------------------ */

describe('M16 ｜ §33 - the demo asset is committable: no secret, no personal data, no build output', () => {
  it('IMPLEMENTATION INVARIANT: no credential-shaped token appears anywhere in the asset', () => {
    /* Non-secret sentinels only: this searches for the SHAPE of a credential, never for a real one. */
    const forbidden = [
      'api_key',
      'apikey',
      'apiKey',
      'secret',
      'password',
      'access_token',
      'refresh_token',
      'Authorization',
      'Bearer ',
      'sk-',
      '-----BEGIN',
    ];
    for (const file of listFiles(ASSET_ROOT)) {
      const text = readFileSync(file, 'utf8');
      for (const token of forbidden) {
        assert.equal(text.includes(token), false, `${relative(ASSET_ROOT, file)} contains "${token}"`);
      }
    }
  });

  it('IMPLEMENTATION INVARIANT: the asset holds no user / account / team / permission field', () => {
    for (const file of listFiles(ASSET_ROOT)) {
      /* Markdown bodies carry front-matter, not JSON: only the sidecars are parsed here. */
      if (!file.endsWith('.json')) {
        continue;
      }
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      for (const key of ['user_id', 'account_id', 'tenant', 'role', 'permission', 'members', 'team']) {
        assert.equal(key in parsed, false, `${relative(ASSET_ROOT, file)} carries "${key}"`);
      }
    }
  });

  it('IMPLEMENTATION INVARIANT: the asset contains no directory or file that does not belong to the workspace schema', () => {
    for (const file of listFiles(ASSET_ROOT)) {
      const name = relative(ASSET_ROOT, file);
      assert.equal(name.includes('node_modules'), false);
      assert.equal(name.includes('dist'), false);
      assert.equal(/\.(js|ts|map|log|env)$/u.test(name), false, `${name} is not a workspace file`);
      assert.ok(statSync(file).size > 0, `${name} must not be empty`);
    }
  });
});

/* ------------------------------------------------------------------ *
 * The reset tool must never reach the product runtime
 * ------------------------------------------------------------------ */

describe('M16 ｜ the reset tool is operator-only', () => {
  const PRODUCT_SURFACES = [
    'src/ui',
    'src/browser',
    'app',
    'src/domain',
    'src/workspace',
    'src/application',
    'src/retrieval',
  ];

  it('IMPLEMENTATION INVARIANT: no product surface imports the demo tooling (so no Reset can appear in the UI)', () => {
    const offenders: string[] = [];
    for (const directory of PRODUCT_SURFACES) {
      for (const file of repoFiles(directory)) {
        const name = relative(REPO_ROOT, file).replace(/\\/g, '/');
        const code = stripComments(readRepoFile(name));
        for (const specifier of importSpecifiersOf(code)) {
          if (specifier.includes('demo/') || specifier.includes('/demo.js')) {
            offenders.push(`${name} → ${specifier}`);
          }
        }
        for (const token of ['reset-demo-baseline', 'resetDemoBaseline', 'seed-demo-baseline', 'seedDemoBaseline']) {
          assert.equal(code.includes(token), false, `${name} must not reference "${token}"`);
        }
      }
    }
    assert.deepEqual(offenders, [], `the demo tooling must stay out of the product:\n${offenders.join('\n')}`);
  });

  it('IMPLEMENTATION INVARIANT: the browser build scope cannot even see the demo tooling', () => {
    const web = JSON.parse(readFileSync(join(REPO_ROOT, 'tsconfig.web.json'), 'utf8')) as {
      readonly include: readonly string[];
    };
    const browser = JSON.parse(readFileSync(join(REPO_ROOT, 'tsconfig.browser.json'), 'utf8')) as {
      readonly include: readonly string[];
    };
    const core = JSON.parse(readFileSync(join(REPO_ROOT, 'tsconfig.core.json'), 'utf8')) as {
      readonly include: readonly string[];
    };
    const build = JSON.parse(readFileSync(join(REPO_ROOT, 'tsconfig.build.json'), 'utf8')) as {
      readonly include?: readonly string[];
    };

    for (const [label, config] of [
      ['tsconfig.web.json', web],
      ['tsconfig.browser.json', browser],
      ['tsconfig.core.json', core],
      ['tsconfig.build.json', build],
    ] as const) {
      const includes = config.include ?? [];
      assert.equal(
        includes.some((pattern) => pattern.includes('demo')),
        false,
        `${label} must not compile the demo tooling`,
      );
    }
    /* …while the Node-side scope DOES cover it, so the tools and their tests compile. */
    const test = JSON.parse(readFileSync(join(REPO_ROOT, 'tsconfig.json'), 'utf8')) as {
      readonly include: readonly string[];
    };
    assert.ok(test.include.includes('src/demo/**/*.ts'), 'the Node-side scope must cover src/demo');
  });

  it('IMPLEMENTATION INVARIANT: `src/ui/**` hard-codes no fixture key and no demo object id', () => {
    for (const file of repoFiles('src/ui')) {
      const name = relative(REPO_ROOT, file).replace(/\\/g, '/');
      const code = stripComments(readRepoFile(name));
      assert.equal(/DEMO-0\d/u.test(code), false, `${name} hard-codes a fixture key`);
      assert.equal(code.includes('DEM0'), false, `${name} hard-codes a demo object id`);
      /*
       * 🔴 The nature VALUE is expected to appear: the badge is a projection of
       *    `data_source_nature`, so `demo_sample` is the one legitimate occurrence. What must not
       *    appear is a *record identity* - a fixture key or an object id - as the badge's source.
       */
      assert.equal(/ATT_[A-Z0-9]/u.test(code), false, `${name} hard-codes an attempt id`);
    }
  });
});
