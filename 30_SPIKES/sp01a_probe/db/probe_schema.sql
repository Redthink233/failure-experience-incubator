-- SP-01a MINIMAL PERSISTENCE PROBE SCHEMA
-- 标记：DISPOSABLE / NON-PRODUCTION
-- 用途：仅用于 S-07 持久化观测（写入 / 重启后复查）
--
-- 🔴 边界（必须遵守）
--   · 只建这 1 张表；不得创建任何业务表、业务 schema、migration 框架
--   · 不得写入任何真实业务数据；note 只承载探针自述字符串
--   · 只为独立 R3（TencentDB for PostgreSQL · 广州 · 按量 · 1C2G · 10 GB 本地 SSD）
--     服务
--   · 🔴 绝对不要建到 CloudBase bundled PostgreSQL 上（该库为 UNUSED BUNDLED CAPABILITY）
--   · SP-01a 结束后随 R3 一并销毁
--
-- 执行方式：在 R3 实例的 SQL 窗口 / 客户端中执行本文件（由项目负责人执行）

CREATE TABLE IF NOT EXISTS probe_persistence (
  id         bigserial   PRIMARY KEY,
  note       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 便于人工核对（不建额外索引，保持最小）
COMMENT ON TABLE probe_persistence IS 'SP-01a disposable probe table (NON-PRODUCTION)';
