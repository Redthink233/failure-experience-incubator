'use strict';

/**
 * SP-01a MINIMAL ENVIRONMENT PROBE
 * ------------------------------------------------------------------
 * 标记：DISPOSABLE / NON-PRODUCTION
 * 用途：只测【环境】，不测【业务】
 *   - S-01 可达性（由外部客户端测；本文件提供 /health 端点）
 *   - S-02 冷启动（暴露 module_load -> listen -> first_request 时间差）
 *   - S-04 DB 真实连接（/db-health，含建连耗时）
 *   - S-06 连接能力（/conn?n=N 并发建连观察，不使用任何外部缓存补救）
 *   - S-07 持久化（/persist 写入 + /persist-count 计数；重启/重部署后复查）
 *
 * 🔴 明确不含：任何业务规则、不含 D9 十步逻辑、不含 AI 调用、不含 Attempt/Insight/Hypothesis
 * 🔴 不得写入 src/、不得成为产品模块、SP-01a 结束后随未选中资源一并删除
 *
 * 环境变量（🔴 全部由项目负责人在云函数控制台填写，AI 不接触其值）
 *   PGHOST / PGPORT / PGDATABASE / PGUSER / PGPASSWORD   —— R3 TencentDB for PostgreSQL 连接信息
 *   PG_SSL=true                                          —— 如需要 TLS（按 R3 实际要求）
 *   PG_POOL_MAX / PG_CONNECT_TIMEOUT_MS                  —— 可选，探针默认 2 / 5000
 *   PORT                                                 —— 由 scf_bootstrap 设为 9000
 *   🔴 上述任何值：不得出现于代码 / 仓库 / 报告 / 聊天 / 截图
 */

const http = require('node:http');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT || process.env.SCF_FUNCTION_PORT || 9000);

// ---- 冷启动观测锚点（S-02）------------------------------------------
const PROCESS_STARTED_AT = Date.now() - Math.round(process.uptime() * 1000);
const MODULE_LOADED_AT = Date.now();
let LISTEN_AT = null;
let FIRST_REQUEST_AT = null;
let REQUEST_COUNT = 0;

// ---- DB 连接池（S-04 / S-06）---------------------------------------
const poolConfig = {
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: Number(process.env.PG_POOL_MAX || 2),
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 5000),
  idleTimeoutMillis: 10000,
};
if (process.env.PG_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false };
}
const pool = new Pool(poolConfig);

// ---- 工具 ----------------------------------------------------------
function cors(res) {
  // 🔴 探针期临时配置，仅 SP-01a disposable probe，不是正式 CORS 策略
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function send(res, status, body) {
  const text = JSON.stringify(body, null, 2);
  cors(res);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

function timing() {
  const t0 = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - t0) / 1e6; // ms
}

function base() {
  return {
    probe: 'SP-01a',
    instance_id: process.env.SCF_INSTANCE_ID || process.env.TENCENTCLOUD_RUNENV || null,
    uptime_ms: Math.round(process.uptime() * 1000),
    process_started_at: PROCESS_STARTED_AT,
    module_loaded_at: MODULE_LOADED_AT,
    listen_at: LISTEN_AT,
    listen_ms: LISTEN_AT ? LISTEN_AT - MODULE_LOADED_AT : null,
    first_request_at: FIRST_REQUEST_AT,
    first_request_gap_ms: FIRST_REQUEST_AT ? FIRST_REQUEST_AT - MODULE_LOADED_AT : null,
    request_count: REQUEST_COUNT,
    node: process.version,
  };
}

// ---- 路由 ----------------------------------------------------------
async function handler(req, res) {
  REQUEST_COUNT += 1;
  if (FIRST_REQUEST_AT === null) FIRST_REQUEST_AT = Date.now();

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    send(res, 405, { error: 'method_not_allowed', probe_note: 'probe only supports GET' });
    return;
  }

  const url = new URL(req.url, 'http://0.0.0.0');
  const path = url.pathname;
  const elapsed = timing();

  try {
    // 路由清单
    if (path === '/' || path === '/routes') {
      send(res, 200, {
        ...base(),
        routes: ['/health', '/env-keys', '/db-health', '/persist?note=...', '/persist-count', '/conn?n=N'],
      });
      return;
    }

    // S-02 冷启动 / S-01 可达性
    if (path === '/health') {
      send(res, 200, { ok: true, ...base(), handler_ms: elapsed() });
      return;
    }

    // 只返回"存在哪些环境变量键名"，绝不返回值
    if (path === '/env-keys') {
      const keys = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'PG_SSL', 'PG_POOL_MAX'];
      send(res, 200, {
        present: keys.filter((k) => Boolean(process.env[k])),
        absent: keys.filter((k) => !process.env[k]),
        probe_note: 'keys only -- values are never returned',
      });
      return;
    }

    // S-04 DB 真实连接
    if (path === '/db-health') {
      const t = timing();
      const started = Date.now();
      const r = await pool.query('SELECT 1 AS ok, current_database() AS db, version() AS version, now() AS now');
      const db_ms = t();
      send(res, 200, {
        ok: true,
        connect_and_query_ms: Number(db_ms.toFixed(1)),
        wall_ms: Date.now() - started,
        db: r.rows[0].db,
        server_version_head: String(r.rows[0].version).slice(0, 80),
        pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
        handler_ms: elapsed(),
      });
      return;
    }

    // S-07 持久化写入
    if (path === '/persist') {
      const note = (url.searchParams.get('note') || 'probe-write').slice(0, 200);
      const t = timing();
      const r = await pool.query(
        'INSERT INTO probe_persistence (note) VALUES ($1) RETURNING id, note, created_at',
        [note]
      );
      const write_ms = t();
      send(res, 200, {
        ok: true,
        inserted: r.rows[0],
        write_ms: Number(write_ms.toFixed(1)),
        handler_ms: elapsed(),
      });
      return;
    }

    // S-07 持久化复查（重部署 / 数据库重启后应仍能读到）
    if (path === '/persist-count') {
      const t = timing();
      const r = await pool.query(
        'SELECT count(*)::int AS rows, min(created_at) AS first_at, max(created_at) AS last_at FROM probe_persistence'
      );
      const read_ms = t();
      send(res, 200, { ok: true, ...r.rows[0], read_ms: Number(read_ms.toFixed(1)), handler_ms: elapsed() });
      return;
    }

    // S-06 连接能力（不使用任何外部缓存补救）
    if (path === '/conn') {
      const n = Math.min(Math.max(Number(url.searchParams.get('n') || 8), 1), 50);
      const connT0 = process.hrtime.bigint();
      const results = await Promise.allSettled(
        Array.from({ length: n }, () => pool.query('SELECT 1 AS ok'))
      );
      const totalMs = Number(process.hrtime.bigint() - connT0) / 1e6;
      const okCount = results.filter((x) => x.status === 'fulfilled').length;
      const errors = results
        .filter((x) => x.status === 'rejected')
        .map((x) => String(x.reason && x.reason.message ? x.reason.message : x.reason).slice(0, 160));
      send(res, 200, {
        requested: n,
        ok: okCount,
        failed: n - okCount,
        errors,
        total_ms: Number(totalMs.toFixed(1)),
        pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
        handler_ms: elapsed(),
      });
      return;
    }

    send(res, 404, { error: 'not_found', path, routes: ['/', '/health', '/env-keys', '/db-health', '/persist', '/persist-count', '/conn'] });
  } catch (err) {
    send(res, 500, {
      error: 'probe_error',
      message: String(err && err.message ? err.message : err).slice(0, 300),
      // 🔴 不返回连接串 / 密码 / 任何凭据
      hint: 'check PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD env keys via /env-keys',
    });
  }
}

const server = http.createServer((req, res) => {
  handler(req, res);
});

server.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[sp01a-probe] server error:', err && err.message);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  LISTEN_AT = Date.now();
  // eslint-disable-next-line no-console
  console.log(
    '[sp01a-probe] DISPOSABLE / NON-PRODUCTION listening on 0.0.0.0:' +
      PORT +
      ' | node=' +
      process.version +
      ' | listen_ms=' +
      (LISTEN_AT - MODULE_LOADED_AT)
  );
});

// 便于排障：端口占用自检（不对外暴露）
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[sp01a-probe] uncaughtException:', err && err.message);
});

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('[sp01a-probe] unhandledRejection:', err && err.message);
});
