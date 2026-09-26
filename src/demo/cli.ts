/**
 * `M16` ｜ Demo 基线的**命令行运维入口**（seed / reset / status / where）。
 *
 * 🔴 Node-only tooling。产品 UI **不 import** 它，浏览器产物**不含**它。
 *    运行方式（与 `npm run dev:web` 同构：先编译再运行）：
 *      npm run demo:seed     →  tsc -p tsconfig.test.json && node dist-test/demo/cli.js seed
 *      npm run demo:reset    →  tsc -p tsconfig.test.json && node dist-test/demo/cli.js reset
 *      npm run demo:status   →  tsc -p tsconfig.test.json && node dist-test/demo/cli.js status
 *
 * 输出：一行 JSON（便于脚本与报告直接引用）。退出码 `0` = 成功，`1` = 拒绝 / 冲突 / 用法错误。
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEMO_ATTEMPTS, DEMO_WORKSPACE_MARKER_FILE } from './demo-baseline-definition.js';
import { NodeDemoWorkspaceStorage } from './demo-workspace-storage.js';
import { proveDemoWorkspaceIdentity } from './demo-workspace-marker.js';
import { readDemoBaseline, seedDemoBaseline } from './seed-demo-baseline.js';
import { resetDemoBaseline } from './reset-demo-baseline.js';
import { createAttemptRepository } from '../workspace/repository/attempt-repository.js';

/**
 * Repository root, derived from THIS module's own location.
 * `src/demo/cli.ts` → (rootDir `src`, outDir `dist-test`) → `dist-test/demo/cli.js`,
 * so the root is three levels up.
 */
function repositoryRoot(): string {
  return resolve(fileURLToPath(import.meta.url), '..', '..', '..');
}

/** Default demo workspace root: the committed, browser-selectable directory in the repository. */
export function defaultDemoWorkspaceRoot(): string {
  return resolve(repositoryRoot(), 'demo-workspace');
}

interface ParsedArguments {
  readonly command: string | null;
  readonly root: string;
}

export function parseArguments(argv: readonly string[]): ParsedArguments {
  const positional: string[] = [];
  let root = defaultDemoWorkspaceRoot();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--root') {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new Error('--root requires a path argument.');
      }
      root = resolve(value);
      index += 1;
      continue;
    }
    if (token !== undefined && !token.startsWith('--')) {
      positional.push(token);
    }
  }
  return { command: positional[0] ?? null, root };
}

async function runStatus(root: string): Promise<number> {
  let storage: NodeDemoWorkspaceStorage;
  try {
    storage = new NodeDemoWorkspaceStorage(root);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify(
        { command: 'status', root, demo_identity_proven: false, error: messageOf(error) },
        null,
        2,
      )}\n`,
    );
    return 1;
  }
  const proof = await proveDemoWorkspaceIdentity(storage);
  const records = await readDemoBaseline(storage);
  /* The TOTAL count is reported so 「8 条 demo + 现场新增若干条」 is visible at a glance. */
  const total = (await createAttemptRepository({ storage }).listAttempts()).length;
  process.stdout.write(
    `${JSON.stringify(
      {
        command: 'status',
        root: storage.rootPath,
        marker_file: DEMO_WORKSPACE_MARKER_FILE,
        demo_identity_proven: proof.ok,
        ...(proof.ok ? {} : { refusal_code: proof.code, refusal_reason: proof.reason }),
        demo_baseline_records: records.length,
        total_attempts: total,
        fixture_keys: DEMO_ATTEMPTS.map((fixture) => fixture.fixture_key),
      },
      null,
      2,
    )}\n`,
  );
  return proof.ok ? 0 : 1;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

async function runSeed(root: string): Promise<number> {
  let storage: NodeDemoWorkspaceStorage;
  try {
    /* `create_root` is safe: creating a directory never destroys anything. */
    storage = new NodeDemoWorkspaceStorage(root, { create_root: true });
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({ command: 'seed', root, kind: 'refused', reason: messageOf(error) }, null, 2)}\n`,
    );
    return 1;
  }
  const outcome = await seedDemoBaseline({ storage });
  process.stdout.write(
    `${JSON.stringify({ command: 'seed', root: storage.rootPath, ...outcome }, null, 2)}\n`,
  );
  return outcome.kind === 'seeded' ? 0 : 1;
}

async function runReset(root: string): Promise<number> {
  const outcome = await resetDemoBaseline({ root_path: root });
  process.stdout.write(`${JSON.stringify({ command: 'reset', root, ...outcome }, null, 2)}\n`);
  return outcome.kind === 'reset' ? 0 : 1;
}

export async function main(argv: readonly string[]): Promise<number> {
  let parsed: ParsedArguments;
  try {
    parsed = parseArguments(argv);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'invalid arguments'}\n`);
    return 1;
  }

  switch (parsed.command) {
    case 'seed':
      return runSeed(parsed.root);
    case 'reset':
      return runReset(parsed.root);
    case 'status':
      return runStatus(parsed.root);
    case 'where':
      process.stdout.write(`${parsed.root}\n`);
      return 0;
    default:
      process.stderr.write(
        'usage: node dist-test/demo/cli.js <seed|reset|status|where> [--root <demo-workspace-path>]\n',
      );
      return 1;
  }
}

/* Only run when invoked directly - importing this module (e.g. from a test) must have no effect. */
const invoked_path = process.argv[1];
if (invoked_path !== undefined && resolve(invoked_path) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
