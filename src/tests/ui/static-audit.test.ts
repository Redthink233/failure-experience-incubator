/**
 * S01-06 ｜ STATIC AUDIT of the App Shell - the structural guarantees a later edit must not break.
 *
 * 🔴 These are `IMPLEMENTATION INVARIANT` cases, not new product `AC`. They exist because every one
 *    of the properties below is a property of the SOURCE TREE rather than of a run: "the UI does not
 *    import the comparator" cannot be proven by calling a function, and "no credential is written to
 *    `localStorage`" is only meaningful when the forbidden carrier is absent from the code.
 * 🔴 COMMENTS ARE STRIPPED BEFORE MATCHING, so a docstring may EXPLAIN a prohibition without being
 *    counted as a violation of it.
 *
 * Covered: U1 (no business-rule import), U4 (no forbidden credential carrier), U14 (copy red lines),
 * §51 (the core keeps NO DOM), §62 (the web bundle, when built, contains no Node builtin).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  REPO_ROOT,
  importSpecifiersOf,
  readRepoFile,
  repoFiles,
  stripComments,
} from '../ai/source-scan.js';
import { providerConfigOf } from '../../ui/settings/provider-presets.js';

interface Source {
  readonly name: string;
  readonly code: string;
}

function sourcesOf(directory: string): readonly Source[] {
  return repoFiles(directory).map((file) => {
    const name = relative(REPO_ROOT, file).replace(/\\/g, '/');
    return { name, code: stripComments(readRepoFile(name)) };
  });
}

const UI_SOURCES = sourcesOf('src/ui');
const UI_ENTRY = 'app/main.ts';

function uiFiles(): readonly Source[] {
  return existsSync(join(REPO_ROOT, 'app/main.ts'))
    ? [...UI_SOURCES, { name: UI_ENTRY, code: stripComments(readRepoFile(UI_ENTRY)) }]
    : UI_SOURCES;
}

function filesContaining(token: string): readonly string[] {
  return uiFiles()
    .filter((file) => file.code.includes(token))
    .map((file) => file.name)
    .sort();
}

/* ------------------------------------------------------------------ *
 * U1 - the UI owns no business rule
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜the App Shell owns no business rule (U1, §49)', () => {
  it('IMPLEMENTATION INVARIANT (U1): the audit is not vacuous - the App Shell really exists', () => {
    assert.ok(UI_SOURCES.length >= 14, `expected the App Shell sources, found ${UI_SOURCES.length}`);
    for (const expected of [
      'src/ui/copy.ts',
      'src/ui/app-root.ts',
      'src/ui/bootstrap.ts',
      'src/ui/dom.ts',
      'src/ui/styles/app.css',
      'src/ui/presenters/steps.ts',
      'src/ui/presenters/retrieval.ts',
      'src/ui/presenters/insights.ts',
      'src/ui/presenters/hypotheses.ts',
      'src/ui/presenters/notices.ts',
      'src/ui/presenters/rail.ts',
      'src/ui/presenters/capture.ts',
      'src/ui/session/app-session.ts',
      'src/ui/session/ui-port.ts',
      'src/ui/session/browser-gateway.ts',
    ]) {
      assert.ok(
        UI_SOURCES.some((file) => file.name === expected) || existsSync(join(REPO_ROOT, expected)),
        `${expected} is missing`,
      );
    }
  });

  it('IMPLEMENTATION INVARIANT (U1): `src/ui/**` imports neither the comparator, the grounding layer nor the workspace schema', () => {
    const offenders: string[] = [];
    for (const file of uiFiles()) {
      for (const specifier of importSpecifiersOf(file.code)) {
        if (
          specifier.includes('retrieval/compare') ||
          specifier.includes('retrieval/grounding') ||
          specifier.includes('workspace/schema')
        ) {
          offenders.push(`${file.name} → ${specifier}`);
        }
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `the UI may only render what M15 hands it:\n${offenders.join('\n')}`,
    );
  });

  it('IMPLEMENTATION INVARIANT (§49): the UI re-implements none of the derived numbers', () => {
    /*
     * The tokens below can only be needed by a SECOND implementation of a rule that `M6` / `M7` / `M8`
     * already own. Reading a number the service produced (`n_retrieval`, `n_citation`) is expected and
     * correct - computing one is what is forbidden.
     */
    for (const token of [
      'eligibleHistoricalAttempts',
      'retrievalViewOf',
      'deriveCitationView',
      'deriveNCitationSnapshot',
      'deriveTraceabilityView',
      'buildGroundingContext',
      'buildGroundingSourceCatalog',
      'candidate_entries',
      'thresholds',
    ]) {
      const hits = filesContaining(token);
      assert.deepEqual(hits, [], `"${token}" must not appear in the App Shell (found in ${hits.join(', ')})`);
    }
  });

  it('IMPLEMENTATION INVARIANT (§68): the framework-neutral core still has NO DOM and NO React', () => {
    for (const directory of ['src/domain', 'src/application', 'src/retrieval', 'src/workspace']) {
      for (const file of sourcesOf(directory)) {
        for (const token of ['document.', 'window.', 'HTMLElement', 'localStorage', 'indexedDB', 'react']) {
          assert.ok(
            !file.code.includes(token),
            `${file.name} must not reference "${token}" (framework-neutral scope)`,
          );
        }
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * U4 - the credential carrier
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜the session-only credential (U4, §12)', () => {
  it('IMPLEMENTATION INVARIANT (U4): no forbidden credential carrier appears in the App Shell', () => {
    for (const token of [
      'localStorage',
      'indexedDB',
      'document.cookie',
      'rememberMe',
      'remember_me',
      '记住',
      'persistCredential',
      'saveApiKey',
    ]) {
      const hits = filesContaining(token);
      assert.deepEqual(hits, [], `"${token}" must not appear in the App Shell (found in ${hits.join(', ')})`);
    }
  });

  it('IMPLEMENTATION INVARIANT (U4/§12): the API key field is a password input and the key never enters a `ProviderConfig`', () => {
    const shell = readRepoFile('src/ui/components/shell.ts');
    assert.ok(
      /labelInput\(\s*SETTINGS_API_KEY,\s*'password'/u.test(shell),
      'the API key input must be a password field',
    );

    /* 🔴 The strongest form of the rule: build a config FROM a key and watch the key disappear. */
    const config = providerConfigOf({
      provider_id: 'browser-direct-custom',
      model: 'fixture-model',
      api_key: 'sk-fixture-NOT-A-REAL-KEY-0000000000',
      custom_base_url: 'https://fixture.registry-fixture.test/v1/chat',
    });
    assert.ok(config !== null, 'a fully specified draft must produce a config');
    assert.deepEqual(Object.keys(config ?? {}).sort(), [
      'base_url',
      'base_url_source',
      'capability',
      'display_name',
      'model',
      'provider_id',
    ]);
    assert.ok(!JSON.stringify(config).includes('sk-fixture'), 'the secret must not travel in the config');
  });

  it('IMPLEMENTATION INVARIANT (§12): the credential store is reached only through the M13 session store', () => {
    const bootstrap = stripComments(readRepoFile('src/ui/bootstrap.ts'));
    assert.ok(bootstrap.includes('createSessionCredentialStore'), 'the session store is the only carrier');
    assert.ok(bootstrap.includes('credentialRefForProvider'), 'the ref is derived from the provider id');
  });
});

/* ------------------------------------------------------------------ *
 * U14 - the copy red lines
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜copy red lines (§57)', () => {
  it('IMPLEMENTATION INVARIANT (U14): no product string carries a similarity, confidence or grade', () => {
    const banned = [
      '相似度',
      '相关性评分',
      '证据强度',
      '置信度',
      '综合评分',
      '经验等级',
      '最佳经验',
      '最强证据',
      '已证明',
      '已证实',
      '已验证',
      '记住 API Key',
      '自动继续生成',
      '后台正在分析',
      '版本 1',
      '版本 2',
      'Insight version',
      'Hypothesis version',
      '高相似',
      '低相似',
      '★★★★★',
    ];
    for (const file of uiFiles()) {
      for (const phrase of banned) {
        assert.ok(!file.code.includes(phrase), `${file.name} must not contain "${phrase}"`);
      }
    }
  });

  it('IMPLEMENTATION INVARIANT (U14): no percentage or x/10 score exists in any App Shell string', () => {
    for (const file of uiFiles()) {
      assert.ok(!/\d+\s*%/u.test(file.code), `${file.name} contains a percentage`);
      assert.ok(!/\d+(\.\d+)?\s*\/\s*10/u.test(file.code), `${file.name} contains an x/10 score`);
    }
  });

  it('IMPLEMENTATION INVARIANT (§58): the product vocabulary is the Chinese one, not the internal module one', () => {
    const copy = readRepoFile('src/ui/copy.ts');
    for (const productTerm of ['尝试记录', '候选经验', '已正式保存', '草稿', '待验证方向']) {
      assert.ok(copy.includes(productTerm), `the copy deck must define 「${productTerm}」`);
    }
    /* The internal module names must never be rendered. */
    for (const internal of ['M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M15']) {
      assert.ok(!stripComments(copy).includes(internal), `"${internal}" must not be product copy`);
    }
  });
});

/* ------------------------------------------------------------------ *
 * U3 - the picker is a user gesture
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜the workspace picker (U3, §9)', () => {
  it('IMPLEMENTATION INVARIANT (U3): the picker is called from the user-gesture handler and nowhere else', () => {
    const bootstrap = stripComments(readRepoFile('src/ui/bootstrap.ts'));
    const handler = bootstrap.indexOf('async function pickWorkspace');
    const call = bootstrap.indexOf('await selectWorkspaceDirectory(');
    assert.ok(handler >= 0, 'the App Shell must own one picker entry point');
    assert.ok(call > handler, 'the picker must be called INSIDE that entry point');

    const occurrences = bootstrap.split('selectWorkspaceDirectory(').length - 1;
    assert.equal(occurrences, 1, `expected exactly one picker call, found ${occurrences}`);
  });

  it('IMPLEMENTATION INVARIANT (U3/§9): no read happens before authorization - the port is gated in ONE place', () => {
    const session = stripComments(readRepoFile('src/ui/session/app-session.ts'));
    assert.ok(session.includes('function requirePort()'), 'reads must go through one gate');
    /* The gate is what makes "nothing before authorization" checkable. */
    assert.ok(session.includes('if (port === null)'), 'the gate must really refuse when unset');
    assert.ok(
      session.includes('workspaceAllowsRead') || session.includes("status: 'connected'"),
      'authorization must be recorded on the workspace state',
    );
  });
});

/* ------------------------------------------------------------------ *
 * §62 - the built web output
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜the web build output (§52 / §62)', () => {
  const dist = join(REPO_ROOT, 'dist-web');
  const built = existsSync(join(dist, 'index.html'));

  it('IMPLEMENTATION INVARIANT (§52): the web entry, the bundle and the stylesheet live in `dist-web/`, apart from `dist/`', () => {
    const web = readFileSync(join(REPO_ROOT, 'tsconfig.web.json'), 'utf8');
    assert.ok(web.includes('"outDir": "dist-web"'), 'the web build must emit to dist-web');
    const core = readFileSync(join(REPO_ROOT, 'tsconfig.build.json'), 'utf8');
    assert.ok(core.includes('"outDir": "dist"'), 'the core build must keep emitting to dist');
    assert.notEqual('dist-web', 'dist');

    if (!built) {
      /* The bundle audit needs `npm run build:web`; the build configuration itself is still audited. */
      assert.ok(existsSync(join(REPO_ROOT, 'scripts/build-web.mjs')));
      assert.ok(existsSync(join(REPO_ROOT, 'app/index.html')));
      return;
    }

    assert.ok(existsSync(join(dist, 'app/main.js')), 'the emitted entry module must exist');
    assert.ok(existsSync(join(dist, 'src/ui/styles/app.css')), 'the stylesheet must be copied');
    const html = readFileSync(join(dist, 'index.html'), 'utf8');
    assert.ok(html.includes('./app/main.js'), 'the entry must be loaded as a module');
    assert.ok(html.includes('./src/ui/styles/app.css'), 'the stylesheet must be linked');
  });

  it('IMPLEMENTATION INVARIANT (§62): no Node builtin may reach the browser runtime', () => {
    if (!built) {
      return;
    }
    const emitted: string[] = [];
    const walk = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          walk(path);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          emitted.push(path);
        }
      }
    };
    walk(dist);
    assert.ok(emitted.length > 0, 'the web build must emit modules');
    for (const file of emitted) {
      const code = readFileSync(file, 'utf8');
      assert.ok(
        !code.includes("from 'node:") && !code.includes('from "node:'),
        `${relative(REPO_ROOT, file)} imports a Node builtin`,
      );
      assert.ok(!/\brequire\(/u.test(code), `${relative(REPO_ROOT, file)} uses require()`);
    }
  });
});
