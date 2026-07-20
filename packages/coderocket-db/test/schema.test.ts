import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

const migrationsDirectory = new URL('../supabase/migrations/', import.meta.url)

async function readMigrations(): Promise<string> {
  const filenames = (await readdir(migrationsDirectory))
    .filter(filename => filename.endsWith('.sql'))
    .sort()
  const migrations = await Promise.all(
    filenames.map(filename => readFile(new URL(filename, migrationsDirectory), 'utf8'))
  )
  return migrations.join('\n')
}

describe('CodeRocket database migrations', () => {
  it('starts with builder accounts, subscriptions, and a durable worker queue', async () => {
    const sql = await readFile(
      new URL('../supabase/migrations/202607160001_coderocket_foundation.sql', import.meta.url),
      'utf8'
    )
    for (const table of [
      'cr_profiles',
      'cr_jobs',
      'cr_subscriptions',
      'cr_stripe_events',
      'cr_worker_heartbeats'
    ])
      assert.match(sql, new RegExp(`create table public\\.${table}`))
    assert.match(sql, /kind in \('site_import'\)/)
    assert.match(sql, /create or replace function public\.cr_claim_jobs/)
  })

  it('creates only the website cloning, editing, connection, and publishing domain', async () => {
    const sql = (await readMigrations()).toLowerCase()
    for (const table of [
      'cr_builder_sites',
      'cr_site_revisions',
      'cr_builder_messages',
      'cr_builder_connections',
      'cr_figma_connections'
    ])
      assert.match(sql, new RegExp(`create table public\\.${table}`))
    assert.doesNotMatch(sql, /cr_audits|cr_findings|cr_occurrences|cr_projects/)
    assert.doesNotMatch(sql, /'audit'|'retention'|'email'|'ai_analysis'|'ai_usage'/)
  })

  it('contains no destructive table or data operations', async () => {
    const sql = (await readMigrations()).toLowerCase()
    assert.doesNotMatch(sql, /drop\s+table/)
    assert.doesNotMatch(sql, /truncate/)
    assert.doesNotMatch(sql, /delete\s+from/)
    assert.doesNotMatch(sql, /alter\s+table[^;]+drop\s+column/)
  })

  it('keeps every public database object inside the cr_ namespace', async () => {
    const sql = await readMigrations()
    const publicObjects = [...sql.matchAll(/\bpublic\.([a-z_][a-z0-9_]*)/gi)].map(match => match[1])
    assert.ok(publicObjects.length > 0)
    assert.deepEqual(
      [...new Set(publicObjects.filter(objectName => !objectName.startsWith('cr_')))],
      []
    )
  })

  it('keeps owner data behind row-level security', async () => {
    const sql = (await readMigrations()).toLowerCase()
    for (const table of [
      'cr_profiles',
      'cr_jobs',
      'cr_subscriptions',
      'cr_builder_sites',
      'cr_site_revisions',
      'cr_builder_connections',
      'cr_figma_connections'
    ])
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`))
  })

  it('stores encrypted Figma OAuth data and bounds each selected-screen import', async () => {
    const sql = await readFile(
      new URL('../supabase/migrations/202607210001_figma_site_import.sql', import.meta.url),
      'utf8'
    )
    assert.match(sql, /create table public\.cr_figma_connections/)
    assert.match(sql, /encrypted_credentials text not null/)
    assert.match(
      sql,
      /revoke all privileges on table public\.cr_figma_connections from anon, authenticated/
    )
    assert.match(sql, /cardinality\(p_node_ids\) not between 1 and 5/)
    assert.match(sql, /create or replace function public\.cr_request_figma_import/)
    assert.doesNotMatch(sql, /access_token|refresh_token/)
  })

  it('streams safe plain-language milestones for Studio iterations', async () => {
    const sql = await readFile(
      new URL(
        '../supabase/migrations/202607210002_studio_iteration_live_progress.sql',
        import.meta.url
      ),
      'utf8'
    )
    for (const column of [
      'progress_stage',
      'progress_current',
      'progress_total',
      'progress_message',
      'progress_updated_at'
    ])
      assert.match(sql, new RegExp(`add column if not exists ${column}`))
    assert.match(sql, /create or replace function public\.cr_prepare_builder_message_progress/)
    assert.match(sql, /progress_total > 0 then new\.progress_total else 5/)
    assert.match(sql, /jobs\.kind = 'site_edit'/)
    assert.doesNotMatch(sql, /alter publication[^;]+cr_jobs/i)
    assert.doesNotMatch(sql.toLowerCase(), /drop\s+table|truncate|delete\s+from/)
  })
})
