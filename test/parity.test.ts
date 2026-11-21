import { Linter } from 'eslint'
import { builtinRules } from 'eslint/use-at-your-own-risk'
import tsParser from '@typescript-eslint/parser'
import { describe, expect, it } from 'vitest'
import type { PaddingOption } from './fixtures.js'
import { FIXTURES, GREGS_OPTIONS } from './fixtures.js'
import { runOxlint, runOxlintFix } from './helpers/run-oxlint.js'

const RULE = 'padding-line-between-statements'

const linter = new Linter()
const paddingRule = builtinRules.get(RULE)

if (!paddingRule) {
  throw new Error(`${RULE} is not available in this ESLint version`)
}

const eslintConfig = (options: readonly PaddingOption[]) => ({
  languageOptions: {
    ecmaVersion: 2022 as const,
    sourceType: 'module' as const,
    parser: tsParser,
  },
  plugins: { oracle: { rules: { [RULE]: paddingRule } } },
  rules: { [`oracle/${RULE}`]: ['error', ...options] },
})

const eslintFindings = (
  code: string,
  options: readonly PaddingOption[],
): string[] =>
  linter
    .verify(code, eslintConfig(options))
    .map((message) => `${message.line}:${message.message}`)

describe('parity with ESLint: findings', () => {
  for (const [name, code] of Object.entries(FIXTURES)) {
    it(`reports the same findings on ${name}`, () => {
      expect(runOxlint(code, GREGS_OPTIONS)).toEqual(
        eslintFindings(code, GREGS_OPTIONS),
      )
    })
  }
})

describe('parity with ESLint: autofix', () => {
  for (const [name, code] of Object.entries(FIXTURES)) {
    it(`produces the same source as ESLint --fix on ${name}`, () => {
      const expected = linter.verifyAndFix(code, eslintConfig(GREGS_OPTIONS))

      expect(runOxlintFix(code, GREGS_OPTIONS)).toBe(expected.output)
    })
  }

  it('inserts a blank line after a trailing comment', () => {
    const code = [
      'export function f() {',
      '  a() // why',
      '  // after',
      '  return 1',
      '}',
      '',
    ].join('\n')
    const options: PaddingOption[] = [
      { blankLine: 'always', prev: '*', next: 'return' },
    ]
    const expected = linter.verifyAndFix(code, eslintConfig(options))

    expect(runOxlintFix(code, options)).toBe(expected.output)
    expect(expected.output).toContain('a() // why\n\n  // after')
  })

  it('declines to merge a comment-separated gap', () => {
    const code = [
      'export function f() {',
      '  a()',
      '',
      '  // why',
      '  return 1',
      '}',
      '',
    ].join('\n')
    const options: PaddingOption[] = [
      { blankLine: 'never', prev: '*', next: 'return' },
    ]
    const expected = linter.verifyAndFix(code, eslintConfig(options))

    expect(runOxlintFix(code, options)).toBe(expected.output)
  })

  it('removes a single blank line for a never rule', () => {
    const code = [
      'export function f() {',
      '  const a = 1',
      '',
      '  return a',
      '}',
      '',
    ].join('\n')
    const options: PaddingOption[] = [
      { blankLine: 'never', prev: '*', next: 'return' },
    ]
    const expected = linter.verifyAndFix(code, eslintConfig(options))

    expect(runOxlintFix(code, options)).toBe(expected.output)
    expect(expected.output).not.toContain('const a = 1\n\n')
  })

  it('is a no-op on already-correct source', () => {
    const code = [
      'export function f() {',
      '  const a = 1',
      '',
      '  return a',
      '}',
      '',
    ].join('\n')

    expect(runOxlintFix(code, GREGS_OPTIONS)).toBe(code)
  })
})
