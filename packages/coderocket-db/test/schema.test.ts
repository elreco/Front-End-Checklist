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

  it('keeps every public database object inside the cr_ namespace', async () => {
    const migrationsDirectory = new URL('../supabase/migrations/', import.meta.url)
    const migrationFiles = (await readdir(migrationsDirectory)).filter(filename =>
      filename.endsWith('.sql')
    )
    const migrations = await Promise.all(
      migrationFiles.map(filename => readFile(new URL(filename, migrationsDirectory), 'utf8'))
    )
    const publicObjects = migrations.flatMap(migration =>
      [...migration.matchAll(/\bpublic\.([a-z_][a-z0-9_]*)/gi)].map(match => match[1])
    )

    assert.ok(publicObjects.length > 0)
    assert.deepEqual(
      [...new Set(publicObjects.filter(objectName => !objectName.startsWith('cr_')))],
      []
    )
  })

  it('adds website health coverage without touching unrelated data', async () => {
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

  it('stores durable website check progress without adding another queue', async () => {
    const sql = await readFile(
      new URL('../supabase/migrations/202607160004_audit_progress.sql', import.meta.url),
      'utf8'
    )
    assert.match(sql, /alter table public\.cr_jobs/)
    assert.match(sql, /add column if not exists progress_stage/)
    assert.match(sql, /add column if not exists progress_current/)
    assert.match(sql, /add column if not exists progress_total/)
    assert.doesNotMatch(sql.toLowerCase(), /create\s+table|drop\s+table|truncate|delete\s+from/)
  })

  it('persists complete audits atomically and prevents duplicate active jobs', async () => {
    const sql = await readFile(
      new URL('../supabase/migrations/202607160005_check_robustness.sql', import.meta.url),
      'utf8'
    )
    assert.match(sql, /create or replace function public\.cr_persist_audit/)
    assert.match(sql, /cr_jobs_one_active_audit_per_project_idx/)
    assert.match(sql, /create or replace function public\.cr_valid_page_paths/)
    assert.match(sql, /on conflict \(project_id, fingerprint\) do update/)
    assert.match(sql, /grant execute on function public\.cr_persist_audit/)
    assert.doesNotMatch(sql.toLowerCase(), /drop\s+table|truncate|delete\s+from/)
  })

  it('stores deterministic evidence and an owner-controlled finding workflow', async () => {
    const sql = await readFile(
      new URL('../supabase/migrations/202607160006_finding_workflow.sql', import.meta.url),
      'utf8'
    )
    assert.match(sql, /add column if not exists evidence jsonb/)
    assert.match(sql, /workflow_status in \('open', 'acknowledged', 'muted'\)/)
    assert.match(sql, /insert into public\.cr_occurrences[^;]+evidence/s)
    assert.doesNotMatch(sql.toLowerCase(), /drop\s+table|truncate|delete\s+from/)
  })

  it('meters evidence-grounded AI analyses without changing audit truth', async () => {
    const sql = await readFile(
      new URL('../supabase/migrations/202607160008_ai_analysis.sql', import.meta.url),
      'utf8'
    )
    assert.match(sql, /create table public\.cr_ai_tasks/)
    assert.match(sql, /create table public\.cr_ai_credit_ledger/)
    assert.match(sql, /create or replace function public\.cr_request_ai_analysis/)
    assert.match(sql, /create or replace function public\.cr_settle_ai_analysis/)
    assert.match(sql, /findings\.resolved_at is null/)
    assert.doesNotMatch(sql.toLowerCase(), /drop\s+table|truncate|delete\s+from/)
  })

  it('snapshots provider prices and the CodeRocket billing multiplier', async () => {
    const sql = await readFile(
      new URL('../supabase/migrations/202607160009_ai_pricing_ledger.sql', import.meta.url),
      'utf8'
    )
    assert.match(sql, /create table public\.cr_ai_model_pricing/)
    assert.match(sql, /'gpt-5\.6-terra'/)
    assert.match(sql, /'openai-2026-07-09'/)
    assert.match(sql, /provider_cost_microusd/)
    assert.match(sql, /customer_charge_microusd/)
    assert.match(sql, /charge_multiplier_bps/)
    assert.match(sql, /create trigger cr_ai_tasks_snapshot_pricing/)
    assert.doesNotMatch(sql.toLowerCase(), /drop\s+table|truncate|delete\s+from/)
  })

  it('stops cancelled checks before they can persist a late audit', async () => {
    const sql = await readFile(
      new URL('../supabase/migrations/202607160010_job_cancellation.sql', import.meta.url),
      'utf8'
    )
    assert.match(sql, /add column if not exists cancelled_at/)
    assert.match(sql, /add column if not exists cancelled_by/)
    assert.match(sql, /create or replace function public\.cr_guard_audit_job_persistence/)
    assert.match(sql, /for update/)
    assert.match(sql, /before insert on public\.cr_audits/)
    assert.doesNotMatch(sql.toLowerCase(), /drop\s+table|truncate|delete\s+from/)
  })

  it('keeps old audits while resetting the comparison baseline after URL changes', async () => {
    const sql = await readFile(
      new URL(
        '../supabase/migrations/202607170002_project_configuration_baselines.sql',
        import.meta.url
      ),
      'utf8'
    )
    assert.match(sql, /add column if not exists baseline_reset_at timestamptz/)
    assert.doesNotMatch(sql.toLowerCase(), /drop\s+table|truncate|delete\s+from/)
  })

  it('bills only paid AI overage through an idempotent Stripe outbox job', async () => {
    const sql = await readFile(
      new URL('../supabase/migrations/202607170001_ai_usage_billing.sql', import.meta.url),
      'utf8'
    )
    assert.match(sql, /included_credits/)
    assert.match(sql, /overage_cap_microeur/)
    assert.match(sql, /billable_overage_microeur/)
    assert.match(sql, /create or replace function public\.cr_prepare_ai_usage_billing/)
    assert.match(sql, /'ai_usage'/)
    assert.doesNotMatch(sql.toLowerCase(), /drop\s+table|truncate|delete\s+from/)
  })
})
