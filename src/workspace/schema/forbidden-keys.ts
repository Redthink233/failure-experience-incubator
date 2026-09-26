/**
 * Persisted-schema red lines, expressed as data so product code AND tests can enforce them.
 *
 * Frozen red lines reproduced from the shared technical contract:
 *   - no user-visible version system: ❌ 版本号 / 版本列表 / 版本比较 / 版本回滚 /
 *     修改次数 / `generation version number` / `diff` / `restore old version`
 *     (D-040 / D-051 / §2.4 / AC-122);
 *   - no numeric similarity: ❌ 相似度 / 分数 / 置信度 / 百分比 / 星级 / 等级
 *     (D-020 / D-037 / §6.3 rule 5 / AC-23);
 *   - no archive snapshot field: `archived_at_ref` was REMOVED and "来源已归档"
 *     is always derived from the target's CURRENT `archive_state`
 *     (CCR-S03B-02 / §5.2 rule 11 / §7.4);
 *   - no physical delete: ❌ `deleted` / `deleted_at` / removal semantics
 *     (§7.1 / §7.3 rule 7 / AC-76);
 *   - no cloud / account / team / role persistence (D-053 §0.4 A / AC-131);
 *   - no credential persisted anywhere (D-056 / AC-133 / AC-134).
 *
 * Matching is by EXACT key name, so the allowed technical compatibility field
 * `schema_version` (contract §12 item 18 note: a technical field, not a product
 * version system) is not affected.
 */

export const FORBIDDEN_PERSISTED_KEYS: readonly string[] = [
  /* version system red line */
  'version',
  'versions',
  'version_number',
  'version_list',
  'generation_version',
  'generation_version_number',
  'revision',
  'revision_id',
  'revision_history',
  'rollback',
  'restore_old_version',
  'diff',
  'edit_count',
  'edit_counts',
  'modification_count',
  /* numeric similarity red line */
  'similarity',
  'similarity_score',
  'match_score',
  'rank_score',
  'score',
  'confidence',
  'confidence_score',
  'percentage',
  'percent',
  'stars',
  'grade',
  /* archive snapshot red line */
  'archived_at_ref',
  'archived_at',
  'archive_snapshot',
  /* physical delete red line */
  'deleted',
  'deleted_at',
  'is_deleted',
  'removed_at',
  /* cloud / account / team red line */
  'cloud_account',
  'cloud_db',
  'cloud_database',
  'cloud_workspace',
  'user_account',
  'user_id',
  'account_id',
  'team',
  'teams',
  'team_id',
  'role',
  'roles',
  'permission',
  'permissions',
  'tenant',
  'tenant_id',
  'organization',
  'organization_id',
  'members',
  /* credential red line */
  'api_key',
  'apikey',
  'credential',
  'credentials',
  'access_token',
  'refresh_token',
  'secret',
  'password',
];

/** Technical compatibility keys that are explicitly allowed. */
export const ALLOWED_TECHNICAL_KEYS: readonly string[] = ['schema_version'];

function walk(value: unknown, path: string, hits: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      walk(entry, `${path}[${index}]`, hits);
    });
    return;
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_PERSISTED_KEYS.includes(key)) {
      hits.push(path === '' ? key : `${path}.${key}`);
    }
    walk(child, path === '' ? key : `${path}.${key}`, hits);
  }
}

/**
 * Returns every forbidden key occurrence found in the value (deep scan).
 * An empty array means the red line holds.
 */
export function findForbiddenPersistedKeys(value: unknown): readonly string[] {
  const hits: string[] = [];
  walk(value, '', hits);
  return hits;
}

/** Parses JSON text and returns the forbidden key occurrences (empty when JSON is invalid). */
export function findForbiddenPersistedKeysInJson(json: string): readonly string[] {
  try {
    return findForbiddenPersistedKeys(JSON.parse(json));
  } catch {
    return [];
  }
}
