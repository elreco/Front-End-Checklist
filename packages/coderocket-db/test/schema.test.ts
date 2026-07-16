import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

describe('CodeRocket database migration', () => {
  it('enables RLS on every owner-data table', async () => {
    const sql = await readFile(
      new URL('../supabase/migrations/202607160001_coderocket_foundation.sql', import.meta.url),
      'utf8'
    )
    for (const table of [
      'cr_projects',
      'cr_audits',
      'cr_audit_pages',
      'cr_findings',
      'cr_occurrences',
      'cr_api_tokens',
      'cr_share_links',
      'cr_subscriptions'
    ]) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`))
    }
  })

  it('contains no destructive table or data operations', async () => {
    const migrationsDirectory = new URL('../supabase/migrations/', import.meta.url)
    const migrationFiles = (await readdir(migrationsDirectory))
      .filter(filename => filename.endsWith('.sql'))
      .sort()
    const migrations = await Promise.all(
      migrationFiles.map(filename => readFile(new URL(filename, migrationsDirectory), 'utf8'))
    )
    const sql = migrations.join('\n').toLowerCase()

    assert.doesNotMatch(sql, /drop\s+table/)
    assert.doesNotMatch(sql, /truncate/)
    assert.doesNotMatch(sql, /delete\s+from/)
    assert.doesNotMatch(sql, /alter\s+table[^;]+drop\s+column/)
  })

  it('adds website health coverage without replacing legacy data', async () => {
    const sql = await readFile(
      new URL('../supabase/migrations/202607160003_website_health.sql', import.meta.url),
      'utf8'
    )
    assert.match(sql, /add value if not exists 'inconclusive'/)
    assert.match(sql, /add column if not exists requested_page_count/)
    assert.match(sql, /add column if not exists checked_page_count/)
    assert.match(sql, /add column if not exists audience/)
    assert.doesNotMatch(sql.toLowerCase(), /drop\s+table|truncate|delete\s+from/)
  })
})
