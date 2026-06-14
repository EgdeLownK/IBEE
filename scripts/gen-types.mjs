import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outFile = path.join(rootDir, 'packages/supabase/src/types.ts')
const projectId = 'ztblirxxptdwqobmervk'

const supabaseBin = path.join(
  rootDir,
  'node_modules',
  'supabase',
  process.platform === 'win32' ? 'bin/supabase.exe' : 'bin/supabase'
)

const result = spawnSync(
  supabaseBin,
  ['gen', 'types', 'typescript', '--project-id', projectId],
  {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  }
)

if (result.error) {
  console.error('[gen-types] Impossible de lancer le CLI Supabase:', result.error.message)
  process.exit(1)
}

if (result.status !== 0) {
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.stdout) process.stdout.write(result.stdout)
  console.error('[gen-types] Échec. Vérifiez que vous êtes connecté : pnpm supabase login')
  process.exit(result.status ?? 1)
}

fs.writeFileSync(outFile, result.stdout, 'utf8')
console.log(`[gen-types] Types écrits dans packages/supabase/src/types.ts`)
