import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PaddingOption } from '../fixtures.js'

const require = createRequire(import.meta.url)
const RULE = '@gregdev/oxlint-plugin-stylistic/padding-line-between-statements'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const pluginPath = join(packageRoot, 'dist', 'index.js')

/** Path to the oxlint binary, resolved from this package's dependencies. */
const oxlintBin = (): string => {
  const manifestPath = require.resolve('oxlint/package.json')
  const manifest = require(manifestPath) as { bin: Record<string, string> }
  const bin = manifest.bin.oxlint

  if (!bin) {
    throw new Error('oxlint does not declare a binary')
  }

  return join(manifestPath, '..', bin)
}

interface OxlintDiagnostic {
  filename?: string
  message?: string
  labels?: { span?: { line?: number } }[]
}

/**
 * Runs oxlint on `code` with only this plugin's rule enabled and returns
 * `line:message` findings, sorted the same way the ESLint oracle reports them.
 */
export const runOxlint = (
  code: string,
  options: readonly PaddingOption[],
): string[] => {
  const dir = mkdtempSync(join(tmpdir(), 'oxlint-parity-'))

  try {
    const configPath = join(dir, '.oxlintrc.json')
    const filePath = join(dir, 'fixture.ts')

    writeFileSync(
      configPath,
      JSON.stringify(
        {
          jsPlugins: [pluginPath],
          rules: { [RULE]: ['error', ...options] },
        },
        null,
        2,
      ),
    )
    writeFileSync(filePath, code)

    const stdout = execFileSync(
      oxlintBin(),
      ['-c', configPath, '-f', 'json', '-A', 'all', '-D', RULE, filePath],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )

    return parse(stdout)
  } catch (error) {
    const stdout = (error as { stdout?: string }).stdout

    if (!stdout) {
      throw error
    }

    return parse(stdout)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const parse = (stdout: string): string[] => {
  const payload = JSON.parse(stdout) as {
    diagnostics?: OxlintDiagnostic[]
  }

  return (payload.diagnostics ?? [])
    .map((diagnostic) => {
      const line = diagnostic.labels?.[0]?.span?.line ?? 0

      return `${line}:${diagnostic.message ?? ''}`
    })
    .sort()
}
