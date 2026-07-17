import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const appRoot = path.join(process.cwd(), 'apps/cloud/.next')
const runtimeValues = {
  __CODEROCKET_ANALYTICS_ID__: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? '',
  __CODEROCKET_SITE_URL__: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.coderocket.app',
  __CODEROCKET_SUPABASE_PUBLISHABLE_KEY__:
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  __CODEROCKET_SUPABASE_URL__:
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
}

if (
  !(
    runtimeValues.__CODEROCKET_SUPABASE_URL__ &&
    runtimeValues.__CODEROCKET_SUPABASE_PUBLISHABLE_KEY__
  )
) {
  throw new Error('CodeRocket public Supabase runtime values are missing')
}

/** Replace public build placeholders in one generated text file. */
async function replaceInFile(filePath) {
  const content = await readFile(filePath, 'utf8')
  let nextContent = content
  for (const [placeholder, value] of Object.entries(runtimeValues)) {
    nextContent = nextContent.replaceAll(placeholder, value)
  }
  if (nextContent !== content) await writeFile(filePath, nextContent)
}

/** Walk generated Next.js output without touching binary assets. */
async function replaceInDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  await Promise.all(
    entries.map(async entry => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return replaceInDirectory(entryPath)
      if (/\.(?:html|js|json|map|txt)$/.test(entry.name)) await replaceInFile(entryPath)
    })
  )
}

await Promise.all([
  replaceInFile(path.join(appRoot, 'standalone/apps/cloud/server.js')),
  replaceInDirectory(path.join(appRoot, 'standalone/apps/cloud/.next')),
  replaceInDirectory(path.join(appRoot, 'static'))
])
