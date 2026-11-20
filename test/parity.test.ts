import { Linter } from 'eslint'
import { builtinRules } from 'eslint/use-at-your-own-risk'
import { describe, expect, it } from 'vitest'
import tseslint from 'typescript-eslint'
import { MESSAGES } from '../src/index.js'
import { FIXTURES, SOA_BUYFLOW_OPTIONS } from './fixtures.js'
import { runOxlint } from './helpers/run-oxlint.js'

const RULE = 'padding-line-between-statements'

const eslintMessages = (
  code: string,
  options: typeof SOA_BUYFLOW_OPTIONS,
): string[] => {
  const linter = new Linter()
  const plugin = builtinRules.get(RULE)

  if (!plugin) {
    throw new Error(`${RULE} is not available in this ESLint version`)
  }

  return linter
    .verify(code, {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parser: tseslint.parser,
      },
      plugins: { oracle: { rules: { [RULE]: plugin } } },
      rules: { [`oracle/${RULE}`]: ['error', ...options] },
    })
    .map((message) => `${message.line}:${message.message}`)
}

describe('parity with ESLint', () => {
  for (const [name, code] of Object.entries(FIXTURES)) {
    it(`matches ESLint on ${name}`, () => {
      const expected = eslintMessages(code, SOA_BUYFLOW_OPTIONS)
      const actual = runOxlint(code, SOA_BUYFLOW_OPTIONS)

      expect(actual).toEqual(expected)
    })
  }

  it('uses the same message text as ESLint', () => {
    const [first] = eslintMessages(
      'export function f() {\n  const a = 1\n\n  return a\n}\n',
      [{ blankLine: 'never', prev: '*', next: 'return' }],
    )

    expect(first).toBe(`4:${MESSAGES.unexpectedBlankLine}`)
    expect(MESSAGES.expectedBlankLine).toBe(
      'Expected blank line before this statement.',
    )
  })
})
