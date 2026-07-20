import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const appRoot = path.join(process.cwd(), 'apps/cloud/.next')
const manifestPath = path.join(appRoot, 'coderocket-runtime-env-files.json')
const placeholders = [
  '__CODEROCKET_ANALYTICS_ID__',
  '__CODEROCKET_SITE_URL__',
  '__CODEROCKET_SUPABASE_PUBLISHABLE_KEY__',
  '__CODEROCKET_SUPABASE_URL__'
]
const generatedTextFilePattern = /\.(?:html|js|json|map|txt)$/

/** Replace public build placeholders in one generated text file. */
async function replaceInFile(filePath, runtimeValues) {
  const content = await readFile(filePath, 'utf8')
  let nextContent = content
  for (const [placeholder, value] of Object.entries(runtimeValues)) {
    nextContent = nextContent.replaceAll(placeholder, value)
  }
  if (nextContent !== content) await writeFile(filePath, nextContent)
}

/** Find generated text files that contain at least one public build placeholder. */
async function findPlaceholderFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async entry => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return findPlaceholderFiles(entryPath)
      if (!generatedTextFilePattern.test(entry.name)) return []
      const content = await readFile(entryPath, 'utf8')
      return placeholders.some(placeholder => content.includes(placeholder)) ? [entryPath] : []
    })
  )
  return files.flat()
}

/** Persist the small set of generated files that need runtime environment injection. */
async function writePlaceholderManifest() {
  const files = (
    await Promise.all([
      findPlaceholderFiles(path.join(appRoot, 'standalone/apps/cloud')),
      findPlaceholderFiles(path.join(appRoot, 'static'))
    ])
  )
    .flat()
    .map(filePath => path.relative(appRoot, filePath))
    .sort()
  await writeFile(manifestPath, `${JSON.stringify(files, null, 2)}\n`)
}

/** Read and validate the build-time placeholder manifest before modifying generated output. */
async function readPlaceholderManifest() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (
    !Array.isArray(manifest) ||
    !manifest.every(
      filePath =>
        typeof filePath === 'string' &&
        !path.isAbsolute(filePath) &&
        filePath !== '..' &&
        !filePath.startsWith(`..${path.sep}`)
    )
  )
    throw new Error('CodeRocket runtime environment manifest is invalid')
  return manifest
}

if (process.argv.includes('--index')) {
  await writePlaceholderManifest()
} else {
  const runtimeValues = {
    __CODEROCKET_ANALYTICS_ID__: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? '',
    __CODEROCKET_SITE_URL__: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.coderocket.app',
    __CODEROCKET_SUPABASE_PUBLISHABLE_KEY__:
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      '',
    __CODEROCKET_SUPABASE_URL__:
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  }

  if (
    !(
      runtimeValues.__CODEROCKET_SUPABASE_URL__ &&
      runtimeValues.__CODEROCKET_SUPABASE_PUBLISHABLE_KEY__
    )
  )
    throw new Error('CodeRocket public Supabase runtime values are missing')

  const placeholderFiles = await readPlaceholderManifest()
  await Promise.all(
    placeholderFiles.map(filePath => replaceInFile(path.join(appRoot, filePath), runtimeValues))
  )
}
