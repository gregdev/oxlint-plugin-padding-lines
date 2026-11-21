import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PaddingOption } from '../fixtures.js'

const require = createRequire(import.meta.url)
const RULE = '@gregdev/oxlint-plugin-stylistic/padding-line-between-statements'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const pluginPath = join(packageRoot, 'dist', 'index.js')

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
  labels?: { span?: { line?: number } }[]
  message?: string
}

const parseFindings = (stdout: string): string[] => {
  const payload = JSON.parse(stdout) as { diagnostics?: OxlintDiagnostic[] }

  return (payload.diagnostics ?? [])
    .map((diagnostic) => {
      const line = diagnostic.labels?.[0]?.span?.line ?? 0

      return `${line}:${diagnostic.message ?? ''}`
    })
    .sort()
}

/** Runs oxlint over a throwaway fixture file. */
const withFixture = <T>(
  code: string,
  options: readonly PaddingOption[],
  run: (paths: { file: string; config: string }) => T,
): T => {
  const dir = mkdtempSync(join(tmpdir(), 'oxlint-fix-'))

  try {
    const config = join(dir, '.oxlintrc.json')
    const file = join(dir, 'fixture.ts')

    writeFileSync(
      config,
      JSON.stringify(
        { jsPlugins: [pluginPath], rules: { [RULE]: ['error', ...options] } },
        null,
        2,
      ),
    )
    writeFileSync(file, code)

    return run({ file, config })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** `line:message` findings from oxlint. */
export const runOxlint = (
  code: string,
  options: readonly PaddingOption[],
): string[] =>
  withFixture(code, options, ({ file, config }) => {
    const args = ['-c', config, '-f', 'json', '-A', 'all', '-D', RULE, file]

    try {
      return parseFindings(
        execFileSync(oxlintBin(), args, { encoding: 'utf8' }),
      )
    } catch (error) {
      const stdout = (error as { stdout?: string }).stdout

      if (!stdout) {
        throw error
      }

      return parseFindings(stdout)
    }
  })

/** The source after oxlint applied `--fix`. */
export const runOxlintFix = (
  code: string,
  options: readonly PaddingOption[],
): string =>
  withFixture(code, options, ({ file, config }) => {
    try {
      execFileSync(oxlintBin(), ['-c', config, '--fix', file], {
        encoding: 'utf8',
      })
    } catch {
      // A non-zero exit still leaves the fixed file on disk.
    }

    return readFileSync(file, 'utf8')
  })
