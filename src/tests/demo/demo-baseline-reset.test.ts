/**
 * `M16` ｜ **`reset_demo_baseline`** —— D16 / D17 与 fail-closed 安全面。
 *
 * 🔴 这是本任务里**唯一会删除东西**的代码路径，所以它的测试不是「能不能跑通」，
 *    而是「**拒绝得是否彻底**」：拒绝时目标目录必须**一个字节都没动**。
 *
 * 🔴 测试全程在 OS 临时目录里复制一份资产来操作，**绝不**在仓库的 `demo-workspace/`
 *    上做破坏性实验（仓库那份由 `demo-baseline-derivation-absence.test.ts` 逐字核对）。
 *
 * Canonical references used: AC-76 / AC-137. 凡是断言结构的地方都标 `IMPLEMENTATION INVARIANT`。
 */

import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, parse } from 'node:path';

import { REPO_ROOT } from '../ai/source-scan.js';
import { NodeDemoWorkspaceStorage } from '../../demo/demo-workspace-storage.js';
import {
  DEMO_ATTEMPT_COUNT,
  DEMO_ATTEMPTS,
  readDemoBaseline,
  resetDemoBaseline,
} from '../../demo/index.js';

const ASSET_ROOT = join(REPO_ROOT, 'demo-workspace');

const created_roots: string[] = [];

after(() => {
  for (const root of created_roots) {
    rmSync(root, { recursive: true, force: true });
  }
});

function scratchDirectory(label: string): string {
  const root = mkdtempSync(join(tmpdir(), `m16-demo-reset-${label}-`));
  created_roots.push(root);
  return root;
}

/**
 * A byte-for-byte recursive copy.
 *
 * 🔴 Deliberately NOT `fs.cpSync`: on this machine `cpSync` aborts the whole Node process
 *    (`0xC0000409`) when the SOURCE path contains non-ASCII characters, and this repository lives
 *    under a Chinese directory name. The explicit walk is boring, portable and cannot do that.
 */
function copyTree(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) {
      copyTree(source, target);
    } else if (entry.isFile()) {
      writeFileSync(target, readFileSync(source));
    }
  }
}

/** A real copy of the committed demo workspace, safe to destroy. */
function demoCopy(label: string): string {
  const root = scratchDirectory(label);
  const target = join(root, 'demo-workspace');
  copyTree(ASSET_ROOT, target);
  return target;
}

/**
 * A stable digest of a directory tree (name + size + content hash per file).
 *
 * 🔴 Deterministic within this process; it does not need to be a cryptographic digest because the
 *    only claim it supports is "these two trees are the same bytes".
 */
function treeDigestOf(root: string): string {
  const lines: string[] = [];
  const walk = (directory: string): void => {
    const entries = [...readdirSync(directory, { withFileTypes: true })].sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    );
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      const bytes = readFileSync(path);
      let hash = 2166136261;
      for (const byte of bytes) {
        hash = Math.imul(hash ^ byte, 16777619) >>> 0;
      }
      lines.push(`${path.slice(root.length)}:${hash.toString(16)}:${bytes.length}`);
    }
  };
  walk(root);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * D16 - the reset really rebuilds the baseline
 * ------------------------------------------------------------------ */

describe('M16 ｜ D16 - a reset rebuilds exactly the eight-record baseline', () => {
  it('D16 / IMPLEMENTATION INVARIANT: resetting a demo workspace leaves exactly eight records again', async () => {
    const root = demoCopy('rebuild');
    assert.equal(
      (await readDemoBaseline(new NodeDemoWorkspaceStorage(root))).length,
      DEMO_ATTEMPT_COUNT,
    );

    const outcome = await resetDemoBaseline({ root_path: root });
    assert.equal(outcome.kind, 'reset');
    if (outcome.kind !== 'reset') {
      return;
    }
    assert.equal(outcome.result.attempts.length, 8);
    assert.equal(outcome.result.created, 8);
    assert.equal(outcome.result.reused, 0);
  });

  it('D16 / IMPLEMENTATION INVARIANT: a reset reproduces the committed baseline byte-for-byte', async () => {
    const root = demoCopy('identical');
    const before = treeDigestOf(ASSET_ROOT);

    const outcome = await resetDemoBaseline({ root_path: root });
    assert.equal(outcome.kind, 'reset');

    assert.equal(
      treeDigestOf(root),
      before,
      'the reset baseline must be identical to the committed one - no drifting copy',
    );
  });

  it('D16 / AC-76 / IMPLEMENTATION INVARIANT: reset removes the CONTENTS, and the directory stays selectable', async () => {
    const root = demoCopy('contents');
    /* A whole extra family is added - reset must clear the derived half too, not only the Attempts. */
    mkdirSync(join(root, 'insights'), { recursive: true });
    writeFileSync(join(root, 'insights', 'stale.json'), '{}\n', 'utf8');

    const outcome = await resetDemoBaseline({ root_path: root });
    assert.equal(outcome.kind, 'reset');
    assert.ok(existsSync(root), 'the selected directory must survive - it is still the workspace');
    assert.equal(existsSync(join(root, 'insights')), false, 'derived halves are cleared, not kept');
  });

  it('D16 / IMPLEMENTATION INVARIANT: the baseline never becomes nine across reset → reset', async () => {
    const root = demoCopy('twice');
    await resetDemoBaseline({ root_path: root });
    const again = await resetDemoBaseline({ root_path: root });
    assert.equal(again.kind, 'reset');
    if (again.kind !== 'reset') {
      return;
    }
    assert.equal(again.result.attempts.length, 8);
    assert.equal(again.result.created, 8);
    assert.deepEqual(
      again.result.attempts.map((attempt) => String(attempt.attempt_id)),
      DEMO_ATTEMPTS.map((fixture) => String(fixture.attempt_id)),
    );
  });

  it('D16 / IMPLEMENTATION INVARIANT: an EDITED record is rebuilt from the definition, not carried forward', async () => {
    const root = demoCopy('edited');
    const fixture = DEMO_ATTEMPTS[0];
    assert.ok(fixture !== undefined);
    const sidecar = join(
      root,
      'projects',
      fixture.project_id,
      'attempts',
      `${fixture.attempt_id}.json`,
    );
    writeFileSync(
      sidecar,
      readFileSync(sidecar, 'utf8').replace(
        '降低竹片干燥后的颜色变化',
        '把干燥温度提高到 90 摄氏度',
      ),
      'utf8',
    );

    const outcome = await resetDemoBaseline({ root_path: root });
    assert.equal(outcome.kind, 'reset');
    /*
     * 🔴 A reset deliberately CLEARS first, so an edited record is not preserved - that is exactly
     *    what makes it a trustworthy "before the demo" action. Refusing to overwrite is the SEED
     *    action's job (`DEMO_SEED_CONFLICT`), verified in `demo-baseline-seed.test.ts`.
     */
    assert.equal(
      readFileSync(sidecar, 'utf8').includes('90 摄氏度'),
      false,
      'a reset must not carry an edited record into the new baseline',
    );
    assert.ok(readFileSync(sidecar, 'utf8').includes('降低竹片干燥后的颜色变化'));
  });
});

/* ------------------------------------------------------------------ *
 * D17 - the refusals
 * ------------------------------------------------------------------ */

describe('M16 ｜ D17 - a non-demo workspace is REFUSED and left untouched', () => {
  it('D17 / IMPLEMENTATION INVARIANT: a plain directory without the marker is refused, and its files survive', async () => {
    const root = scratchDirectory('plain');
    const userFile = join(root, 'my-research-notes.txt');
    writeFileSync(userFile, 'real user data\n', 'utf8');
    mkdirSync(join(root, 'projects'), { recursive: true });

    const outcome = await resetDemoBaseline({ root_path: root });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind === 'refused') {
      assert.equal(outcome.code, 'MARKER_MISSING');
      assert.ok(outcome.reason.includes('Nothing was removed'));
    }
    assert.ok(existsSync(userFile), 'the user file must still be there');
    assert.equal(readFileSync(userFile, 'utf8'), 'real user data\n');
    assert.ok(existsSync(join(root, 'projects')));
  });

  it('D17 / IMPLEMENTATION INVARIANT: a marker without the matching workspace_id is refused (two independent proofs)', async () => {
    const root = demoCopy('marker-only');
    /* The marker is intact; the workspace identity belongs to someone else. */
    const metadataPath = join(root, 'workspace.json');
    writeFileSync(
      metadataPath,
      readFileSync(metadataPath, 'utf8').replace(
        'WS_DEM0WS00000000000000000000',
        'WS_01J0000000000000000000000A',
      ),
      'utf8',
    );

    const outcome = await resetDemoBaseline({ root_path: root });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind === 'refused') {
      assert.equal(outcome.code, 'WORKSPACE_ID_MISMATCH');
    }
    /* The eight records are still exactly where they were. */
    assert.equal(readdirSync(join(root, 'projects')).length, 3);
    assert.equal(
      readdirSync(join(root, 'projects', DEMO_ATTEMPTS[0]?.project_id ?? '')).includes('attempts'),
      true,
    );
  });

  it('D17 / IMPLEMENTATION INVARIANT: a workspace.json without the marker is refused', async () => {
    const root = demoCopy('no-marker');
    rmSync(join(root, '.demo-workspace-marker.json'), { force: true });

    const outcome = await resetDemoBaseline({ root_path: root });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind === 'refused') {
      assert.equal(outcome.code, 'MARKER_MISSING');
    }
    assert.ok(existsSync(join(root, 'workspace.json')), 'nothing was removed');
  });

  it('D17 / IMPLEMENTATION INVARIANT: a filesystem root and a missing path are both refused', async () => {
    const driveRoot = parse(REPO_ROOT).root;
    const atDriveRoot = await resetDemoBaseline({ root_path: driveRoot });
    assert.equal(atDriveRoot.kind, 'refused');
    if (atDriveRoot.kind === 'refused') {
      assert.equal(atDriveRoot.code, 'FILESYSTEM_ROOT');
    }

    const missing = await resetDemoBaseline({
      root_path: join(scratchDirectory('missing'), 'not-created-yet'),
    });
    assert.equal(missing.kind, 'refused');
    if (missing.kind === 'refused') {
      assert.equal(missing.code, 'NOT_A_DIRECTORY');
    }
  });

  it('D17 / IMPLEMENTATION INVARIANT: the refusal names the reason and never leaks a thrown value', async () => {
    const root = scratchDirectory('reason');
    const outcome = await resetDemoBaseline({ root_path: root });
    assert.equal(outcome.kind, 'refused');
    if (outcome.kind === 'refused') {
      assert.ok(outcome.reason.length > 0);
      assert.equal(outcome.reason.includes('at Object.'), false);
      assert.equal(outcome.reason.includes('node:internal'), false);
    }
  });
});
