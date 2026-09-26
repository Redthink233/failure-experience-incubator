/**
 * PRE-PSA-BLOCKER-01 ｜ SETTINGS CENTER USABILITY - the regression suite for the fix.
 *
 * 🔴 THIS FILE'S CASES ARE `IMPLEMENTATION INVARIANT` CASES, NOT NEW PRODUCT `AC`. The task fixes
 *    behaviour a later edit could silently break (a control id, a lost caret, an invisible save
 *    outcome); none of it creates an acceptance point, and none of it changes the frozen contract.
 *
 * ── WHAT THIS SUITE PROVES, AND HOW ─────────────────────────────────────────────────
 * 🔴 THE DEFECT HAD TWO MECHANISMS (see `control-identity.ts`), so the cases are split by what can be
 *    decided where:
 *
 *    · The FOCUS cases (F1-F8) run IN PROCESS against the real rule. The rule lives in the
 *      framework-neutral `control-identity.ts` - the Node test scope has no `lib.dom`, and that split
 *      is deliberate - so it is exercised directly on a plain-object tree that reproduces the
 *      renderer's behaviour faithfully, including `querySelector`'s first-match-wins.
 *    · The SESSION cases (C1-C6 / S1-S6 / D7) are driven through the REAL `createAppSession` over the
 *      real `M15` composition. Nothing at the product boundary is mocked.
 *    · The remaining facts - "the × button is wired to `closeSettings`", "the top bar renders one
 *      entry called 设置", "BOTH render paths restore the focus they captured" - are properties of the
 *      SOURCE TREE, so they are read from it (the method `static-audit.test.ts` already uses for the
 *      DOM scope). Comments are stripped first, so a docstring may EXPLAIN a rule without satisfying it.
 *    · The interactive end-to-end behaviour (a real click, a real Escape key, real keystrokes) is
 *      verified by the real-browser smoke of this task. This suite makes NO such claim.
 *
 * Real provider calls = 0; every model answer is a fixture payload.
 *
 * F = focus / identity ｜ C = close ｜ S = save ｜ D = the DeepSeek PSA candidate preset.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { describe, it } from 'node:test';

import { resolveProviderPath } from '../../ai/provider/capability.js';
import type { ProviderConfig } from '../../ai/provider/capability.js';
import { createWorkflowAttemptIndex } from '../../application/workflow/attempt-summaries.js';
import { credentialRefForProvider } from '../../browser/ai/session-credential-store.js';
import { composeBrowserWorkspaceReader } from '../../browser/application/workspace-reader-composition.js';
import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import {
  SETTINGS_BASE_URL_FORBIDDEN,
  SETTINGS_BASE_URL_REQUIRED,
  SETTINGS_CONNECTION_DIRECT,
  SETTINGS_ERRORS_HEADING,
  SETTINGS_KEY_REQUIRED,
  SETTINGS_MODEL_REQUIRED,
  SETTINGS_OPEN,
  SETTINGS_SECTION_MODEL,
  SETTINGS_TITLE,
  SETTINGS_UNSUPPORTED,
  SETTINGS_UNSUPPORTED_HEADING,
} from '../../ui/copy.js';
import { createAppSession } from '../../ui/session/app-session.js';
import type { AppSession } from '../../ui/session/app-session.js';
import { createUiReadPort, createUiWorkflowPort } from '../../ui/session/ui-port.js';
import {
  SETTINGS_CONTROL_IDS,
  SETTINGS_CONTROL_ID_LIST,
  SETTINGS_TEXT_CONTROL_IDS,
  captureFocus,
  restoreFocus,
} from '../../ui/settings/control-identity.js';
import type { CaretControl, FocusScope, FocusSnapshot } from '../../ui/settings/control-identity.js';
import {
  PROVIDER_PRESETS,
  connectionLabelOf,
  findPreset,
  providerConfigOf,
  validateSettingsDraft,
} from '../../ui/settings/provider-presets.js';
import { REPO_ROOT, readRepoFile, repoFiles, stripComments } from '../ai/source-scan.js';
import { makeWorkflowHarness, parsePayload, seedHistory } from '../application/workflow/harness.js';

/* ================================================================== *
 * Source helpers (the DOM scope is audited by reading it)
 * ================================================================== */

const SHELL = 'src/ui/components/shell.ts';
const APP_ROOT = 'src/ui/app-root.ts';
const COPY = 'src/ui/copy.ts';
const PRESETS = 'src/ui/settings/provider-presets.ts';
const IDENTITY = 'src/ui/settings/control-identity.ts';
const SESSION = 'src/ui/session/app-session.ts';

interface SourceFile {
  readonly name: string;
  readonly code: string;
}

/** Every file under `src/ui`, comments stripped, with a repo-relative forward-slash name. */
function uiSources(): readonly SourceFile[] {
  return repoFiles('src/ui').map((file) => ({
    name: relative(REPO_ROOT, file).replace(/\\/gu, '/'),
    code: stripComments(readFileSync(file, 'utf8')),
  }));
}

function shellCode(): string {
  return stripComments(readRepoFile(SHELL));
}

/** The `settingsCenter` panel only - everything it renders, and nothing that follows it. */
function panelSource(): string {
  const code = shellCode();
  const start = code.indexOf('export function settingsCenter(');
  assert.ok(start >= 0, 'the Settings Center must exist');
  const end = code.indexOf('\nfunction presetSelector(', start);
  return end < 0 ? code.slice(start) : code.slice(start, end);
}

/** A top-level `function <name>(…)` body. */
function functionSource(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist in the source`);
  const rest = source.slice(start);
  const end = rest.indexOf('\n}\n');
  return end < 0 ? rest : rest.slice(0, end);
}

/** A method of the object literal returned by `createAppSession`. */
function methodSource(source: string, name: string): string {
  const start = source.indexOf(`\n    ${name}(`);
  assert.ok(start >= 0, `${name} must exist in the source`);
  const rest = source.slice(start + 1);
  const end = rest.indexOf('\n    },');
  return end < 0 ? rest : rest.slice(0, end);
}

/** Every `SETTINGS_CONTROL_IDS.<key>` a chunk of shell source references, in file order. */
function controlKeysIn(code: string): readonly string[] {
  const keys: string[] = [];
  const pattern = /SETTINGS_CONTROL_IDS\.(\w+)/gu;
  let match = pattern.exec(code);
  while (match !== null) {
    if (match[1] !== undefined) {
      keys.push(match[1]);
    }
    match = pattern.exec(code);
  }
  return keys;
}

/* ================================================================== *
 * The plain-object focus tree (no DOM, no jsdom)
 * ================================================================== */

interface FakeControl {
  readonly id: string;
  value: string;
  /** `null` on a control with no caret (a button), exactly like a real `<button>`. */
  selection_start: number | null;
  selection_end: number | null;
  focused: boolean;
}

function field(id: string, value: string, caret: number = value.length): FakeControl {
  return { id, value, selection_start: caret, selection_end: caret, focused: false };
}

function plainButton(id: string): FakeControl {
  return { id, value: '', selection_start: null, selection_end: null, focused: false };
}

function viewOf(node: FakeControl): CaretControl {
  return {
    id: node.id,
    text_length: node.selection_start === null ? null : node.value.length,
    selection_start: node.selection_start,
    selection_end: node.selection_end,
    focus() {
      node.focused = true;
    },
    set_selection_range(start, end) {
      node.selection_start = start;
      node.selection_end = end;
    },
  };
}

/**
 * The first-match-wins lookup a real `root.querySelector('#id')` performs.
 *
 * 🔴 THE BEHAVIOUR IS KEPT DELIBERATELY: it is what makes a duplicated id show up as the bug it is
 *    instead of being hidden by the harness.
 */
function scopeOf(nodes: readonly FakeControl[]): FocusScope {
  return {
    focused() {
      const found = nodes.find((node) => node.focused && node.id.length > 0);
      return found === undefined ? null : viewOf(found);
    },
    named(id) {
      const found = nodes.find((node) => node.id === id);
      return found === undefined ? null : viewOf(found);
    },
  };
}

/**
 * The whole-tree rebuild `app-root.ts` performs: NEW nodes, SAME ids, same logical controls - and
 * every fresh node starts UNFOCUSED, which is exactly what `replaceChildren` does.
 */
function rebuild(nodes: readonly FakeControl[]): FakeControl[] {
  return nodes.map((node) => {
    if (node.selection_start === null) {
      return plainButton(node.id);
    }
    const caret = Math.min(node.selection_end ?? node.value.length, node.value.length);
    return field(node.id, node.value, caret);
  });
}

interface TypedStep {
  readonly nodes: readonly FakeControl[];
  readonly restored: CaretControl | null;
  readonly snapshot: FocusSnapshot | null;
}

/**
 * One "type a character" round trip: type into a control, take the snapshot, rebuild the tree,
 * restore the focus - the exact loop the user reported.
 */
function typeCharacter(nodes: readonly FakeControl[], focused_id: string, appended: string): TypedStep {
  const target = nodes.find((node) => node.id === focused_id);
  assert.ok(target !== undefined, `${focused_id} must be on screen`);
  target.value += appended;
  target.selection_start = target.value.length;
  target.selection_end = target.value.length;
  for (const node of nodes) {
    node.focused = node.id === focused_id;
  }

  const snapshot = captureFocus(scopeOf(nodes));
  const fresh = rebuild(nodes);
  return { nodes: fresh, restored: restoreFocus(scopeOf(fresh), snapshot), snapshot };
}

/* ================================================================== *
 * The settings session (real M15 port, deterministic fixture provider)
 * ================================================================== */

interface WiredSettings {
  readonly session: AppSession;
  readonly harness: ReturnType<typeof makeWorkflowHarness>;
  readonly configs: readonly ProviderConfig[];
  setGatewayOutcome(kind: 'ready' | 'unsupported'): void;
}

async function wireSettings(): Promise<WiredSettings> {
  const storage = new InMemoryWorkspaceStorage();
  const harness = makeWorkflowHarness({
    storage,
    parse: parsePayload({ result_status_proposal: '未达到目标' }),
  });
  await seedHistory(harness);

  const reader = composeBrowserWorkspaceReader({ storage });
  const read_port = createUiReadPort({ reads: reader.reads, index: reader.index });

  const configs: ProviderConfig[] = [];
  let outcome: 'ready' | 'unsupported' = 'ready';

  const session = createAppSession({
    attachStorage: () => read_port,
    createGateway: ({ config }) => {
      configs.push(config);
      if (outcome === 'unsupported') {
        return { kind: 'unsupported', message: SETTINGS_UNSUPPORTED };
      }
      return {
        kind: 'ready',
        gateway: {
          port: createUiWorkflowPort({
            workflow: harness.workflow,
            index: createWorkflowAttemptIndex({
              listAttempts: () => harness.attempts.listAttempts(),
            }),
            capture: harness.capture,
          }),
          credential_ref: credentialRefForProvider(String(config.provider_id)),
          connection_label: connectionLabelOf(config.capability),
          provider_display_name: config.display_name,
          model: config.model,
        },
      };
    },
  });

  return {
    session,
    harness,
    configs,
    setGatewayOutcome: (kind) => {
      outcome = kind;
    },
  };
}

/** A guaranteed-valid browser-direct draft: the DeepSeek PSA candidate. */
interface Draft {
  readonly provider_id: string;
  readonly model: string;
  readonly api_key: string;
  readonly custom_base_url: string;
}

function deepseekDraft(): Draft {
  const preset = findPreset('deepseek');
  assert.ok(preset !== null, 'the deepseek preset must exist');
  return {
    provider_id: 'deepseek',
    model: preset.default_model,
    api_key: 'sk-fixture-NOT-A-REAL-KEY-PSA',
    custom_base_url: '',
  };
}

/* ================================================================== *
 * F1 - F4 ｜ unique, stable, label-independent identity
 * ================================================================== */

describe('PRE-PSA-BLOCKER-01 ｜ F1-F4: every settings control has ONE stable id', () => {
  it('IMPLEMENTATION INVARIANT (F1): `settings-model` is the model field id, and it is unique', () => {
    assert.equal(SETTINGS_CONTROL_IDS.model, 'settings-model');
    assert.equal(SETTINGS_CONTROL_ID_LIST.filter((id) => id === 'settings-model').length, 1);
  });

  it('IMPLEMENTATION INVARIANT (F2): `settings-api-key` is the API key id, and it is unique', () => {
    assert.equal(SETTINGS_CONTROL_IDS.api_key, 'settings-api-key');
    assert.equal(SETTINGS_CONTROL_ID_LIST.filter((id) => id === 'settings-api-key').length, 1);
  });

  it('IMPLEMENTATION INVARIANT (F3): `settings-base-url` is the custom Base URL id, and it is unique', () => {
    assert.equal(SETTINGS_CONTROL_IDS.base_url, 'settings-base-url');
    assert.equal(SETTINGS_CONTROL_ID_LIST.filter((id) => id === 'settings-base-url').length, 1);
  });

  it('IMPLEMENTATION INVARIANT (F4): the whole Settings Center panel has NO duplicate id', () => {
    /* (a) the plan itself */
    assert.equal(
      new Set(SETTINGS_CONTROL_ID_LIST).size,
      SETTINGS_CONTROL_ID_LIST.length,
      'two controls must never share an id',
    );
    for (const id of SETTINGS_CONTROL_ID_LIST) {
      assert.ok(id.length > 0, 'an empty id is not an identity');
      assert.match(id, /^settings-[a-z-]+$/u, `"${id}" must be an explicit ascii identifier`);
      assert.equal(/[\u4e00-\u9fff]/u.test(id), false, 'an id must not contain label text');
    }

    /* (b) the panel really renders each of them, exactly once */
    const keys = controlKeysIn(shellCode());
    assert.equal(new Set(keys).size, keys.length, `a control id is rendered twice: ${keys.join(', ')}`);
    assert.deepEqual(
      [...new Set(keys)].sort(),
      Object.keys(SETTINGS_CONTROL_IDS).sort(),
      'the panel must render every declared control, under its own id',
    );

    /* (c) no id is computed from a label anywhere in the DOM scope */
    for (const file of uiSources()) {
      assert.equal(
        /replace\(\/\[\^A-Za-z0-9\]/u.test(file.code),
        false,
        `${file.name} still derives a control id from a label`,
      );
    }
  });

  it('IMPLEMENTATION INVARIANT (F4): the three typed-into controls are Model / API Key / Base URL', () => {
    assert.deepEqual(SETTINGS_TEXT_CONTROL_IDS, [
      SETTINGS_CONTROL_IDS.model,
      SETTINGS_CONTROL_IDS.api_key,
      SETTINGS_CONTROL_IDS.base_url,
    ]);
    /* 🔴 Every one of them is a text field in the panel, so every one of them can lose a caret. */
    const panel = panelSource();
    for (const key of ['model', 'api_key', 'base_url'] as const) {
      assert.equal(panel.includes(`SETTINGS_CONTROL_IDS.${key}`), true, `${key} must be rendered`);
    }
  });

  it('IMPLEMENTATION INVARIANT (F4): the old label-derived scheme was a duplicate factory', () => {
    /* The old expression, reproduced verbatim. */
    const legacyId = (label: string, type: string): string =>
      `field-${label.replace(/[^A-Za-z0-9]/gu, '')}-${type}`;

    /* Two pure-Chinese labels - the ones the task quotes - collapse to the SAME id. */
    assert.equal(legacyId('模型', 'text'), 'field--text');
    assert.equal(legacyId('结果', 'text'), 'field--text');
    assert.equal(legacyId('模型', 'text'), legacyId('结果', 'text'));

    /*
     * ⚠️ FACTUAL PRECISION: the labels that actually SHIPPED are ASCII (`Model` / `Custom Base URL` /
     * `API Key`), and those three did NOT collide. The duplicate was therefore a LATENT hazard of the
     * scheme rather than the cause of the observed symptom - a distinction this project keeps.
     */
    const shipped = [
      legacyId('Model', 'text'),
      legacyId('Custom Base URL', 'text'),
      legacyId('API Key', 'password'),
    ];
    assert.equal(new Set(shipped).size, shipped.length, 'the shipped labels happened not to collide');

    /* And the replacement scheme cannot collide, whatever a label becomes. */
    assert.equal(new Set(SETTINGS_CONTROL_ID_LIST).size, SETTINGS_CONTROL_ID_LIST.length);
  });

  it('IMPLEMENTATION INVARIANT (F4): with a shared id the caret lands on the FIRST match', () => {
    const nodes = [field('field--text', 'deep'), field('field--text', 'https://api.deepseek.com')];
    nodes[1]!.focused = true;
    const snapshot = captureFocus(scopeOf(nodes));
    assert.equal(snapshot?.id, 'field--text');

    const fresh = [field('field--text', 'deep'), field('field--text', 'https://api.deepseek.com')];
    const restored = restoreFocus(scopeOf(fresh), snapshot);
    assert.equal(restored?.id, 'field--text');
    assert.equal(fresh[0]!.focused, true, 'the FIRST control takes the focus');
    assert.equal(fresh[1]!.focused, false, 'the control the user was typing in loses it');
  });

  it('IMPLEMENTATION INVARIANT (F-ROOT §2): EVERY render path restores the focus it captured', () => {
    /*
     * 🔴 THE OBSERVED DEFECT. `app-root.ts` has two render paths, and the pre-authorization one
     *    `return`ed before restoring the focus. That path renders the Settings Center too, so
     *    configuring a model before choosing a workspace - the normal first run - dropped the caret on
     *    every keystroke.
     */
    const code = stripComments(readRepoFile(APP_ROOT));
    const chunks = code.split('root.replaceChildren(shell);').slice(1);
    assert.equal(chunks.length, 2, 'there are exactly two render paths: before and after authorization');
    for (const chunk of chunks) {
      assert.ok(
        chunk.slice(0, 160).includes('restoreFocus('),
        'a render path that can show a form must restore the focus it captured',
      );
    }
    assert.ok(code.includes('captureFocus('), 'the focus must be captured before the rebuild');
  });
});

/* ================================================================== *
 * F5 - F8 ｜ the caret survives the rebuild
 * ================================================================== */

describe('PRE-PSA-BLOCKER-01 ｜ F5-F8: the caret survives every rebuild', () => {
  it('IMPLEMENTATION INVARIANT (F5): 10+ characters into Model stay focused after EVERY rebuild', () => {
    let nodes: readonly FakeControl[] = [
      field(SETTINGS_CONTROL_IDS.model, ''),
      field(SETTINGS_CONTROL_IDS.api_key, ''),
      field(SETTINGS_CONTROL_IDS.base_url, 'https://api.deepseek.com/chat/completions'),
    ];
    const typed = 'deepseek-flash';
    assert.ok(typed.length > 10, 'the case must exceed ten characters');
    for (const character of typed) {
      const step = typeCharacter(nodes, SETTINGS_CONTROL_IDS.model, character);
      nodes = step.nodes;
      assert.equal(step.restored?.id, SETTINGS_CONTROL_IDS.model, 'focus must stay on Model');
      assert.equal(nodes[0]!.focused, true);
      assert.equal(nodes[1]!.focused, false, 'API Key must never steal focus');
      assert.equal(nodes[2]!.focused, false, 'Base URL must never steal focus');
    }
    assert.equal(nodes[0]!.value, typed, 'every character really landed');
  });

  it('IMPLEMENTATION INVARIANT (F6): a full Base URL typed character by character never jumps to Model', () => {
    let nodes: readonly FakeControl[] = [
      field(SETTINGS_CONTROL_IDS.model, 'deepseek-flash'),
      field(SETTINGS_CONTROL_IDS.api_key, 'sk-fixture-NOT-A-REAL-KEY-PSA'),
      field(SETTINGS_CONTROL_IDS.base_url, ''),
    ];
    const url = 'https://api.deepseek.com/chat/completions';
    for (const character of url) {
      const step = typeCharacter(nodes, SETTINGS_CONTROL_IDS.base_url, character);
      nodes = step.nodes;
      assert.equal(step.restored?.id, SETTINGS_CONTROL_IDS.base_url);
      assert.equal(nodes[0]!.focused, false, 'typing a URL must never move the caret to Model');
      assert.equal(nodes[2]!.focused, true);
      assert.equal(nodes[2]!.selection_end, nodes[2]!.value.length, 'the caret stays at the end');
    }
    assert.equal(nodes[2]!.value, url);
  });

  it('IMPLEMENTATION INVARIANT (F7): 20+ characters into the API Key never lose focus', () => {
    let nodes: readonly FakeControl[] = [
      field(SETTINGS_CONTROL_IDS.model, 'deepseek-flash'),
      field(SETTINGS_CONTROL_IDS.api_key, ''),
      field(SETTINGS_CONTROL_IDS.base_url, ''),
    ];
    const key = 'sk-fixture-NOT-A-REAL-KEY-PSA';
    assert.ok(key.length > 20, 'the case must exceed twenty characters');
    for (const character of key) {
      const step = typeCharacter(nodes, SETTINGS_CONTROL_IDS.api_key, character);
      nodes = step.nodes;
      assert.equal(step.restored?.id, SETTINGS_CONTROL_IDS.api_key);
      assert.equal(nodes[1]!.focused, true);
      assert.equal(nodes[0]!.focused, false);
      assert.equal(nodes[2]!.focused, false);
    }
    assert.equal(nodes[1]!.value, key);
  });

  it('IMPLEMENTATION INVARIANT (F8): a mid-text caret is restored exactly, and clamped when the value shortens', () => {
    const url = 'https://api.deepseek.com/chat/completions';
    const nodes = [field(SETTINGS_CONTROL_IDS.base_url, url, 20), field(SETTINGS_CONTROL_IDS.model, 'deepseek-flash')];
    nodes[0]!.focused = true;

    const snapshot = captureFocus(scopeOf(nodes));
    assert.deepEqual(snapshot, { id: SETTINGS_CONTROL_IDS.base_url, start: 20, end: 20 });

    /* Same value ⇒ the exact caret comes back. */
    const same = rebuild(nodes);
    restoreFocus(scopeOf(same), snapshot);
    assert.equal(same[0]!.selection_start, 20);
    assert.equal(same[0]!.selection_end, 20);

    /* A SHORTER value than the remembered caret ⇒ the caret is clamped, never past the end. */
    const short = 'https://api.deep';
    assert.ok(short.length < 20, 'the shorter value must really be shorter than the caret');
    const shorter = [field(SETTINGS_CONTROL_IDS.base_url, short), field(SETTINGS_CONTROL_IDS.model, 'x')];
    const clamped = restoreFocus(scopeOf(shorter), snapshot);
    assert.equal(clamped?.id, SETTINGS_CONTROL_IDS.base_url);
    assert.equal(shorter[0]!.selection_end, short.length);
  });

  it('IMPLEMENTATION INVARIANT (F8): a control that is GONE is not restored, and no stand-in is chosen', () => {
    const nodes = [
      field(SETTINGS_CONTROL_IDS.base_url, 'https://x.test/v1'),
      plainButton(SETTINGS_CONTROL_IDS.save),
    ];
    nodes[1]!.focused = true;
    const snapshot = captureFocus(scopeOf(nodes));
    assert.deepEqual(snapshot, { id: SETTINGS_CONTROL_IDS.save, start: null, end: null });

    /* The next render has no save button: nothing is focused on its behalf. */
    const fresh = [field(SETTINGS_CONTROL_IDS.base_url, 'https://x.test/v1')];
    assert.equal(restoreFocus(scopeOf(fresh), snapshot), null);
    assert.equal(fresh[0]!.focused, false);
  });

  it('IMPLEMENTATION INVARIANT (F8): a button keeps focus across a rebuild, with no caret invented for it', () => {
    const nodes = [
      field(SETTINGS_CONTROL_IDS.model, 'deepseek-flash'),
      plainButton(SETTINGS_CONTROL_IDS.save),
    ];
    nodes[1]!.focused = true;
    const snapshot = captureFocus(scopeOf(nodes));
    assert.deepEqual(snapshot, { id: SETTINGS_CONTROL_IDS.save, start: null, end: null });

    const fresh = rebuild(nodes);
    restoreFocus(scopeOf(fresh), snapshot);
    assert.equal(fresh[1]!.focused, true);
    assert.equal(fresh[1]!.selection_start, null, 'no selection may be invented for a button');
  });
});

/* ================================================================== *
 * C1 - C6 ｜ leaving the panel
 * ================================================================== */

describe('PRE-PSA-BLOCKER-01 ｜ C1-C6: leaving the Settings Center', () => {
  it('IMPLEMENTATION INVARIANT (C1): the × control calls `closeSettings`, which really closes the panel', async () => {
    assert.ok(shellCode().includes('id: SETTINGS_CONTROL_IDS.close'), 'the × must carry a stable id');
    assert.ok(
      /button\('×',\s*\(\)\s*=>\s*session\.closeSettings\(\)/u.test(shellCode()),
      'the × must be wired to closeSettings',
    );

    const wired = await wireSettings();
    wired.session.openSettings();
    assert.equal(wired.session.getState().settings_open, true);
    wired.session.closeSettings();
    assert.equal(wired.session.getState().settings_open, false);
  });

  it('IMPLEMENTATION INVARIANT (C2): the 取消 control calls `closeSettings` too, and closes the panel', async () => {
    assert.ok(
      /button\(SETTINGS_CANCEL,\s*\(\)\s*=>\s*session\.closeSettings\(\)/u.test(shellCode()),
      '取消 must be wired to closeSettings',
    );
    assert.ok(shellCode().includes('id: SETTINGS_CONTROL_IDS.cancel'));

    const wired = await wireSettings();
    wired.session.openSettings();
    wired.session.closeSettings();
    assert.equal(wired.session.getState().settings_open, false);
  });

  it('IMPLEMENTATION INVARIANT (C3 §6): Escape closes the panel - and does nothing else', () => {
    const code = stripComments(readRepoFile(APP_ROOT));
    assert.ok(code.includes("event.key !== 'Escape'"), 'Escape must be recognised');
    assert.ok(code.includes('settings_open'), 'Escape must act only while the panel is open');
    assert.ok(code.includes('deps.session.closeSettings()'), 'Escape must close the panel');
    /* 🔴 The three things Escape must NEVER do. */
    assert.equal(code.includes('clearCredential'), false, 'Escape may not clear a credential');
    assert.equal(code.includes('saveSettings'), false, 'Escape may not save');
    assert.equal(code.includes('reportWorkspaceFailure'), false, 'Escape may not touch the workspace');
    /* One listener for the shell lifetime, removed by the return value. */
    assert.ok(code.includes("document.addEventListener('keydown'"), 'the listener must be bound once');
    assert.ok(code.includes("document.removeEventListener('keydown'"), 'the listener must be removable');
  });

  it('IMPLEMENTATION INVARIANT (C4): closing leaves the workspace connected and its records readable', async () => {
    const wired = await wireSettings();
    await wired.session.attachWorkspace('fixture-workspace');
    const before = wired.session.getState().attempts.length;
    assert.ok(before > 0, 'the rail must hold the seeded records');

    wired.session.openSettings();
    wired.session.closeSettings();

    const after = wired.session.getState();
    assert.equal(after.workspace.status, 'connected');
    assert.equal(after.workspace.label, 'fixture-workspace');
    assert.equal(after.attempts_loaded, true);
    assert.equal(after.attempts.length, before);
  });

  it('IMPLEMENTATION INVARIANT (C5): closing does not clear an already configured provider', async () => {
    const wired = await wireSettings();
    await wired.session.attachWorkspace('fixture-workspace');
    wired.session.openSettings();
    wired.session.updateSettingsDraft(deepseekDraft());
    await wired.session.saveSettings();
    const configured = wired.session.getState().provider;
    assert.equal(configured.status, 'ready');

    wired.session.openSettings();
    wired.session.closeSettings();

    assert.deepEqual(wired.session.getState().provider, configured);
  });

  it('IMPLEMENTATION INVARIANT (C6): closing performs no provider call at all', async () => {
    const wired = await wireSettings();
    const before = wired.harness.provider.invocations.length;

    wired.session.openSettings();
    wired.session.closeSettings();
    wired.session.openSettings();
    wired.session.closeSettings();

    assert.equal(wired.harness.provider.invocations.length, before);
    assert.equal(wired.configs.length, 0, 'closing must not even compose a gateway');
  });

  it('IMPLEMENTATION INVARIANT (C/§6): closing keeps the DRAFT as it stands, with no persistent draft', () => {
    const close = methodSource(readRepoFile(SESSION), 'closeSettings');
    for (const forbidden of ['localStorage', 'sessionStorage', 'indexedDB', 'cookie']) {
      assert.equal(close.includes(forbidden), false, `closing must not write to ${forbidden}`);
    }
    assert.equal(close.includes('api_key'), false, 'closing must not touch the key');
    assert.equal(close.includes('settings_draft'), false, 'closing must not rewrite the draft');
  });

  it('IMPLEMENTATION INVARIANT (C/§6): no persistent settings draft or credential carrier is introduced', () => {
    for (const file of [IDENTITY, SESSION, PRESETS]) {
      const code = stripComments(readRepoFile(file));
      for (const carrier of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie']) {
        assert.equal(code.includes(carrier), false, `${file} must not reference ${carrier}`);
      }
    }
  });
});

/* ================================================================== *
 * S1 - S6 ｜ what the save button does
 * ================================================================== */

describe('PRE-PSA-BLOCKER-01 ｜ S1-S6: the save button always says what happened', () => {
  it('IMPLEMENTATION INVARIANT (S1 §7A): a missing Model is an INLINE reason and the panel stays open', async () => {
    const wired = await wireSettings();
    await wired.session.attachWorkspace('fixture-workspace');
    wired.session.openSettings();
    wired.session.updateSettingsDraft({
      provider_id: 'browser-direct-custom',
      model: '',
      custom_base_url: 'https://fixture.registry-fixture.test/v1/chat',
    });
    await wired.session.saveSettings();

    const state = wired.session.getState();
    assert.equal(state.settings_open, true, 'a refused save must not close the panel');
    /*
     * 🔴 TWO REASONS NOW, AND THE SECOND ONE IS THE HUMAN DECISION (`PSA-D2 = B`, `CORRECTION-03`):
     *    this draft carries no credential either, and a model configuration is only saved when
     *    `typed_api_key_present OR session_credential_present`. The MISSING MODEL is still reported
     *    first - the assertion's own subject is unchanged.
     */
    assert.deepEqual(state.settings_errors, [SETTINGS_MODEL_REQUIRED, SETTINGS_KEY_REQUIRED]);
    assert.equal(state.settings_save_error, null);
    assert.equal(state.provider.status, 'unconfigured', 'nothing was composed');
    assert.equal(wired.configs.length, 0, 'an invalid draft never reaches the gateway');
  });

  it('IMPLEMENTATION INVARIANT (S2 §7A): a custom (browser-direct) draft with no URL is refused', async () => {
    const wired = await wireSettings();
    wired.session.openSettings();
    wired.session.updateSettingsDraft({
      provider_id: 'browser-direct-custom',
      model: 'some-model',
      custom_base_url: '',
    });
    await wired.session.saveSettings();

    const state = wired.session.getState();
    assert.equal(state.settings_open, true);
    /*
     * 🔴 The forbidden URL is still reported, and a missing credential joins it for the same reason as
     *    in S1 (`PSA-D2 = B`, `CORRECTION-03`). The draft's own subject - the URL rule - is unchanged.
     */
    assert.deepEqual(state.settings_errors, [SETTINGS_KEY_REQUIRED, SETTINGS_BASE_URL_REQUIRED]);
    assert.equal(wired.configs.length, 0);
  });

  it('IMPLEMENTATION INVARIANT (S3 §7B): a valid browser-direct config becomes ready and closes the panel', async () => {
    const wired = await wireSettings();
    await wired.session.attachWorkspace('fixture-workspace');
    wired.session.openSettings();
    wired.session.updateSettingsDraft(deepseekDraft());
    await wired.session.saveSettings();

    const state = wired.session.getState();
    assert.equal(state.settings_open, false, 'a successful save closes the panel');
    assert.equal(state.settings_errors.length, 0);
    assert.equal(state.settings_save_error, null);
    assert.equal(state.provider.status, 'ready');
    /* 🔴 The three facts the top-bar badge is built from. */
    assert.equal(state.provider.display_name, 'DeepSeek');
    assert.equal(state.provider.model, 'deepseek-flash');
    assert.equal(state.provider.connection_label, SETTINGS_CONNECTION_DIRECT);
    assert.equal(state.provider.key_present, true);
    assert.equal(wired.configs.length, 1);
    /* 🔴 The composed config really is the browser-direct candidate. */
    assert.equal(wired.configs[0]?.base_url, 'https://api.deepseek.com/chat/completions');
    assert.equal(wired.configs[0]?.base_url_source, 'registered_fixed');
  });

  it('IMPLEMENTATION INVARIANT (S4 §7C): an unsupported composition keeps the panel OPEN, reported inline', async () => {
    const wired = await wireSettings();
    await wired.session.attachWorkspace('fixture-workspace');
    wired.setGatewayOutcome('unsupported');
    wired.session.openSettings();
    wired.session.updateSettingsDraft(deepseekDraft());
    await wired.session.saveSettings();

    const state = wired.session.getState();
    assert.equal(state.settings_open, true, 'the panel must stay open on an unsupported composition');
    assert.equal(state.settings_save_error, SETTINGS_UNSUPPORTED);
    assert.deepEqual(state.settings_errors, [], 'a composition failure is not an input error');
    assert.equal(state.provider.status, 'unsupported');
    assert.equal(state.provider.message, SETTINGS_UNSUPPORTED);
    /* 🔴 The workspace survives the failure - the two capabilities are separate. */
    assert.equal(state.workspace.status, 'connected');
    assert.equal(state.attempts_loaded, true);
  });

  it('IMPLEMENTATION INVARIANT (S5 §8): every save lands in exactly one of A / B / C', async () => {
    /* A - invalid draft */
    const a = await wireSettings();
    a.session.openSettings();
    a.session.updateSettingsDraft({ provider_id: 'browser-direct-custom', model: '', custom_base_url: '' });
    await a.session.saveSettings();
    const sa = a.session.getState();
    assert.equal(
      sa.settings_errors.length > 0 && sa.settings_open && sa.settings_save_error === null,
      true,
      'A: validation reasons, panel open',
    );

    /* B - composed */
    const b = await wireSettings();
    await b.session.attachWorkspace('fixture-workspace');
    b.session.openSettings();
    b.session.updateSettingsDraft(deepseekDraft());
    await b.session.saveSettings();
    const sb = b.session.getState();
    assert.equal(
      sb.settings_open === false && sb.provider.status === 'ready' && sb.settings_save_error === null,
      true,
      'B: ready, panel closed',
    );

    /* C - unsupported */
    const c = await wireSettings();
    await c.session.attachWorkspace('fixture-workspace');
    c.setGatewayOutcome('unsupported');
    c.session.openSettings();
    c.session.updateSettingsDraft(deepseekDraft());
    await c.session.saveSettings();
    const sc = c.session.getState();
    assert.equal(
      sc.settings_open === true && sc.settings_save_error !== null,
      true,
      'C: unsupported reason, panel open',
    );
  });

  it('IMPLEMENTATION INVARIANT (S5 §7): the panel itself renders all three outcomes - none invisible', () => {
    const panel = panelSource();
    /* 🔴 A - the validation reasons, derived in the panel from the draft AND the credential fact
     *    (`CORRECTION-03`: the same draft is blocking or acceptable depending on whether the session
     *    already holds a key, so the panel must be given that fact rather than guess it). */
    assert.ok(
      /validateSettingsDraft\(\s*draft,/u.test(panel),
      'the panel must derive the reasons from the draft + the credential fact',
    );
    assert.ok(panel.includes('SETTINGS_ERRORS_HEADING'), 'A must have its own heading');
    assert.ok(panel.includes('feedbackBlock'), 'the outcomes must be rendered as blocks');
    /* 🔴 C - the composition failure, from the session state, in the same panel. */
    assert.ok(panel.includes('state.settings_save_error'), 'C must be rendered inline, not behind it');
    assert.ok(panel.includes('SETTINGS_UNSUPPORTED_HEADING'), 'C must have its own heading');
    /* 🔴 The two headings are DIFFERENT statements. */
    assert.notEqual(SETTINGS_ERRORS_HEADING, SETTINGS_UNSUPPORTED_HEADING);
  });

  it('IMPLEMENTATION INVARIANT (S5 §8): the save control is a real wired button, never a dead one', () => {
    const code = shellCode();
    assert.ok(
      /button\(\s*SETTINGS_SAVE,\s*\(\)\s*=>\s*\{\s*void session\.saveSettings\(\);/u.test(code),
      'the save button must call saveSettings',
    );
    assert.ok(code.includes('id: SETTINGS_CONTROL_IDS.save'), 'the save button must carry a stable id');
    /* 🔴 It stays clickable: a disabled button with no explanation is the 「点击无反应」 the task bans. */
    assert.equal(/SETTINGS_SAVE[\s\S]{0,240}disabled:\s*true/u.test(code), false);
  });

  it('IMPLEMENTATION INVARIANT (S6): saving before a workspace is chosen leaves the browse state intact', async () => {
    const wired = await wireSettings();
    wired.session.openSettings();
    wired.session.updateSettingsDraft(deepseekDraft());
    await wired.session.saveSettings();

    const state = wired.session.getState();
    assert.equal(state.workspace.status, 'unselected', 'no workspace may be invented');
    assert.equal(state.attempts_loaded, false, 'nothing may be read');
    assert.equal(state.attempts.length, 0);

    /* 🔴 And the workspace can still be chosen afterwards, exactly as before. */
    await wired.session.attachWorkspace('fixture-workspace');
    assert.equal(wired.session.getState().workspace.status, 'connected');
    assert.equal(wired.session.getState().attempts_loaded, true);
  });
});

/* ================================================================== *
 * D1 - D7 ｜ the DeepSeek PSA candidate
 * ================================================================== */

describe('PRE-PSA-BLOCKER-01 ｜ D1-D7: the DeepSeek PSA candidate preset', () => {
  const preset = findPreset('deepseek');

  it('IMPLEMENTATION INVARIANT (D1 §10): the DeepSeek default model is `deepseek-flash`', () => {
    assert.ok(preset !== null);
    assert.equal(preset.default_model, 'deepseek-flash');
    assert.equal(preset.display_name, 'DeepSeek');
  });

  it('IMPLEMENTATION INVARIANT (D2 §10): the endpoint is the full chat-completions URL', () => {
    assert.ok(preset !== null);
    assert.equal(preset.fixed_base_url, 'https://api.deepseek.com/chat/completions');
    const config = providerConfigOf(deepseekDraft());
    assert.ok(config !== null, 'the DeepSeek draft must compose');
    assert.equal(config.base_url, 'https://api.deepseek.com/chat/completions');
    /* 🔴 The adapter POSTs the value VERBATIM, so the value must already be the route. */
    assert.equal(config.base_url?.endsWith('/chat/completions'), true);
  });

  it('IMPLEMENTATION INVARIANT (D3 §10): the resolved path is `browser_direct`', () => {
    assert.ok(preset !== null);
    const resolution = resolveProviderPath(preset.capability);
    assert.equal(resolution.kind, 'resolved');
    if (resolution.kind === 'resolved') {
      assert.equal(resolution.path, 'browser_direct');
    }
    assert.equal(connectionLabelOf(preset.capability), SETTINGS_CONNECTION_DIRECT);
  });

  it('IMPLEMENTATION INVARIANT (D4 §10 / §12): `thin_proxy` is false for both direct presets', () => {
    assert.ok(preset !== null);
    assert.equal(preset.capability.thin_proxy, false);
    assert.equal(preset.capability.browser_direct, true);
    assert.equal(preset.allows_custom_base_url, false, 'the endpoint is product-registered');
    /* 🔴 And a custom URL is refused outright rather than silently ignored. */
    const refused = validateSettingsDraft({
      provider_id: 'deepseek',
      model: 'deepseek-flash',
      api_key: '',
      custom_base_url: 'https://evil.example/steal',
    });
    assert.equal(refused.length > 0, true);

    /* 🔴 The custom preset is still offered, and it is still browser-direct only. */
    const custom = findPreset('browser-direct-custom');
    assert.ok(custom !== null);
    assert.equal(resolveProviderPath(custom.capability).kind, 'resolved');
    assert.equal(custom.capability.thin_proxy, false);
    assert.equal(custom.allows_custom_base_url, true);
    assert.equal(custom.fixed_base_url, null);
    assert.equal(String(PROVIDER_PRESETS[0]?.provider_id), 'browser-direct-custom');
  });

  it('IMPLEMENTATION INVARIANT (D5 §10): the structured-output mode is `json_object`', () => {
    assert.ok(preset !== null);
    assert.equal(preset.capability.structured_output, 'json_object');
  });

  it('IMPLEMENTATION INVARIANT (D4 §10): the 「no custom URL」 note claims no path it does not use', () => {
    /*
     * 🔴 THE REAL-BROWSER SMOKE FOUND THIS ONE. The note rendered in place of the custom-URL field
     *    used to read 「只能通过受支持的代理连接访问」 - accurate for a `thin_proxy` preset, but FALSE
     *    for `DeepSeek`, which is browser-direct. A statement that names the wrong connection path is
     *    exactly the kind of false claim this project forbids, so the wording was corrected to the
     *    common truth and is pinned here.
     */
    assert.equal(
      SETTINGS_BASE_URL_FORBIDDEN.includes('只能通过受支持的代理连接访问'),
      false,
      'no preset that renders this note is proxy-only',
    );
    assert.ok(SETTINGS_BASE_URL_FORBIDDEN.includes('不能填写 Custom Base URL'), 'it still refuses the field');
    /* 🔴 DeepSeek is one of the presets that renders it. */
    assert.ok(preset !== null);
    assert.equal(preset.allows_custom_base_url, false);
  });

  it('IMPLEMENTATION INVARIANT (D6 §10 / §11): no UI text claims the candidate has been verified', () => {
    assert.ok(preset !== null);
    assert.equal(preset.note, '浏览器直连，实际可用性待 PSA 验证。');

    const banned = ['已验证', '已通过', 'CORS 已支持', 'CORS 可用', '连通性已确认', '可用性已确认'];
    for (const file of uiSources()) {
      for (const phrase of banned) {
        assert.equal(file.code.includes(phrase), false, `${file.name} must not claim 「${phrase}」`);
      }
    }
    /* 🔴 And the honest statement IS there. */
    assert.ok(stripComments(readRepoFile(PRESETS)).includes('待 PSA 验证'));
  });

  it('IMPLEMENTATION INVARIANT (D6 §3): the preset note is rendered in the panel, not buried', () => {
    assert.ok(panelSource().includes('preset.note'), 'the panel must show why the preset is shaped so');
  });

  it('IMPLEMENTATION INVARIANT (D7 §9): saving the DeepSeek configuration makes ZERO provider calls', async () => {
    const wired = await wireSettings();
    await wired.session.attachWorkspace('fixture-workspace');
    const before = wired.harness.provider.invocations.length;

    wired.session.openSettings();
    wired.session.updateSettingsDraft(deepseekDraft());
    await wired.session.saveSettings();

    assert.equal(wired.session.getState().provider.status, 'ready');
    assert.equal(wired.harness.provider.invocations.length, before, 'a save is composition, not a call');
    assert.equal(wired.configs.length, 1, 'exactly one composition happened');
    /* 🔴 The real endpoint never entered the picture. */
    assert.equal(
      wired.harness.provider.invocations.some((call) => JSON.stringify(call).includes('api.deepseek.com')),
      false,
    );
  });

  it('IMPLEMENTATION INVARIANT (D7/§13): the key never enters the composed `ProviderConfig`', async () => {
    const wired = await wireSettings();
    await wired.session.attachWorkspace('fixture-workspace');
    wired.session.openSettings();
    wired.session.updateSettingsDraft(deepseekDraft());
    await wired.session.saveSettings();

    const config = wired.configs[0];
    assert.ok(config !== undefined);
    assert.equal(JSON.stringify(config).includes('sk-fixture'), false, 'the secret must not travel in the config');
    assert.deepEqual(Object.keys(config).sort(), [
      'base_url',
      'base_url_source',
      'capability',
      'display_name',
      'model',
      'provider_id',
    ]);
  });
});

/* ================================================================== *
 * §4 / §5 / §19-V1 ｜ the Settings Center as a place
 * ================================================================== */

describe('PRE-PSA-BLOCKER-01 ｜ the Settings Center information architecture (§4 / §5)', () => {
  it('IMPLEMENTATION INVARIANT (§4): the top-bar entry is 「设置」 and there is exactly ONE of them', () => {
    assert.equal(SETTINGS_OPEN, '设置');
    assert.ok(
      shellCode().includes('button(SETTINGS_OPEN, () => session.openSettings()'),
      'the top bar must offer the settings entry',
    );
    const top_bar = functionSource(readRepoFile(SHELL), 'topBar');
    assert.equal(top_bar.split('SETTINGS_OPEN').length - 1, 1, 'exactly one entry');
    /* 🔴 The standalone 「模型设置」 entry is gone. */
    assert.equal(/SETTINGS_(OPEN|TITLE)\s*=\s*'模型设置'/u.test(readRepoFile(COPY)), false);
    assert.equal(top_bar.includes('模型设置'), false, 'the top bar must not name the model section');
  });

  it('IMPLEMENTATION INVARIANT (§4): the workspace and model status badges are kept', () => {
    const top_bar = functionSource(readRepoFile(SHELL), 'topBar');
    assert.ok(top_bar.includes('workspaceStatusLabel'));
    assert.ok(top_bar.includes('badge(workspace'));
    assert.ok(top_bar.includes('badge(provider'));
    assert.ok(top_bar.includes('SETTINGS_STATUS_UNCONFIGURED'));
  });

  it('IMPLEMENTATION INVARIANT (§5): the panel is a Settings Center with a 模型服务 section', () => {
    assert.equal(SETTINGS_TITLE, '设置');
    assert.equal(SETTINGS_SECTION_MODEL, '模型服务');
    const panel = panelSource();
    assert.ok(panel.includes('SETTINGS_SECTION_MODEL'), 'the section title must be rendered');
    assert.ok(panel.includes('sub-title'), 'a section heading is a heading, not a comment');
    for (const token of [
      'SETTINGS_PROVIDER',
      'SETTINGS_CONNECTION_ROW',
      'SETTINGS_MODEL',
      'SETTINGS_API_KEY',
      'SETTINGS_CUSTOM_BASE_URL',
    ]) {
      assert.ok(panel.includes(token), `${token} must be rendered in the section`);
    }
  });

  it('IMPLEMENTATION INVARIANT (§5): no non-existent section was invented', () => {
    const code = shellCode() + stripComments(readRepoFile(COPY));
    for (const absent of ['账户', '主题', '云同步', '遥测']) {
      assert.equal(code.includes(absent), false, `「${absent}」 is not a V1 section`);
    }
  });

  it('IMPLEMENTATION INVARIANT (§6/§19-V1): the panel is reachable from the top bar and the remedy', () => {
    assert.equal(
      readRepoFile(SHELL).split('.openSettings()').length - 1,
      2,
      'the top-bar entry and the ⑧/⑨ 「此操作需要模型服务」 remedy',
    );
    /* 🔴 And there is a visible way out of it, in the header and in the footer. */
    const panel = panelSource();
    assert.ok(panel.includes('id: SETTINGS_CONTROL_IDS.close'));
    assert.ok(panel.includes('id: SETTINGS_CONTROL_IDS.cancel'));
    assert.equal(panel.split('closeSettings()').length - 1, 2, '× and 取消 both close the panel');
  });
});
