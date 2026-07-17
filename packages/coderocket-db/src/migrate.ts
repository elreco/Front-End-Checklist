import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required for migrations')
const sql = postgres(databaseUrl, { max: 1, ssl: 'require' })

function assertCodeRocketOnlyMigration(filename: string, migration: string): void {
  const referencedPublicObjects = [...migration.matchAll(/\bpublic\.([a-z_][a-z0-9_]*)/gi)].map(
    match => match[1]
  )
  const legacyObjects = [...new Set(referencedPublicObjects)].filter(
    objectName => !objectName.startsWith('cr_')
  )
  if (legacyObjects.length > 0)
    throw new Error(
      `${filename} references non-CodeRocket public objects: ${legacyObjects.join(', ')}`
    )
}

try {
  await sql`select pg_advisory_lock(hashtext('coderocket_migrations'))`
  await sql`create table if not exists public.cr_schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )`
  const directory = path.resolve(import.meta.dirname, '../supabase/migrations')
  const files = (await readdir(directory)).filter(file => file.endsWith('.sql')).sort()
  const pending: Array<{ filename: string; migration: string }> = []
  for (const filename of files) {
    const [applied] =
      await sql`select filename from public.cr_schema_migrations where filename = ${filename}`
    if (applied) continue
    const migration = await readFile(path.join(directory, filename), 'utf8')
    assertCodeRocketOnlyMigration(filename, migration)
    pending.push({ filename, migration })
  }
  await sql.begin(async transaction => {
    for (const { filename, migration } of pending) {
      await transaction.unsafe(migration)
      await transaction`insert into public.cr_schema_migrations (filename) values (${filename})`
    }
  })
  for (const { filename } of pending)
    process.stdout.write(`${JSON.stringify({ event: 'migration.applied', filename })}\n`)
} finally {
  await sql`select pg_advisory_unlock(hashtext('coderocket_migrations'))`.catch(() => undefined)
  await sql.end()
}
