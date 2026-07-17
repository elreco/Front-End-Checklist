import { spawnSync } from 'node:child_process'
import { chmod, cp, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = resolve(packageDirectory, 'dist')
const rulesDirectory = resolve(packageDirectory, 'rules')

await Promise.all([
  rm(outputDirectory, { force: true, recursive: true }),
  rm(rulesDirectory, { force: true, recursive: true })
])
await mkdir(outputDirectory, { recursive: true })
await build({
  entryPoints: [resolve(packageDirectory, 'src/index.ts')],
  outfile: resolve(outputDirectory, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  banner: {
    js: "import { createRequire } from 'node:module'\nconst require = createRequire(import.meta.url)"
  },
  sourcemap: true
})
await chmod(resolve(outputDirectory, 'index.js'), 0o755)
const smokeTest = spawnSync(process.execPath, [resolve(outputDirectory, 'index.js')], {
  encoding: 'utf8'
})
if (smokeTest.status !== 2 || !smokeTest.stderr.includes('Usage: coderocket audit')) {
  throw new Error(`Built CLI smoke test failed: ${smokeTest.stderr || 'unexpected exit code'}`)
}
await mkdir(rulesDirectory, { recursive: true })
await cp(resolve(packageDirectory, '../content/rules/en'), resolve(rulesDirectory, 'en'), {
  recursive: true
})
