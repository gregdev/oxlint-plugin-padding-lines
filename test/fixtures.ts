export type PaddingType = 'always' | 'never' | 'any'

export interface PaddingOption {
  blankLine: PaddingType
  prev: string | string[]
  next: string | string[]
}

/**
 * The option set from the soa-buyflow project. Kept identical here so the
 * parity suite exercises the same rule combinations that project relies on.
 */
export const SOA_BUYFLOW_OPTIONS: PaddingOption[] = [
  { blankLine: 'always', prev: '*', next: 'return' },
  { blankLine: 'any', prev: ['block-like', 'block'], next: 'return' },
  { blankLine: 'never', prev: 'empty', next: 'return' },
  {
    blankLine: 'any',
    prev: ['const', 'let', 'var', 'expression'],
    next: 'return',
  },
  { blankLine: 'always', prev: 'multiline-const', next: 'return' },
  { blankLine: 'always', prev: 'multiline-let', next: 'return' },
  { blankLine: 'always', prev: 'import', next: '*' },
  { blankLine: 'any', prev: 'import', next: 'import' },
  { blankLine: 'always', prev: '*', next: 'block-like' },
  { blankLine: 'always', prev: 'block-like', next: '*' },
  { blankLine: 'any', prev: 'block-like', next: 'block-like' },
  { blankLine: 'always', prev: '*', next: 'throw' },
  { blankLine: 'always', prev: '*', next: ['function', 'class'] },
  { blankLine: 'always', prev: ['function', 'class'], next: '*' },
]

/**
 * Fixtures covering the option pairs above, plus the cases that historically
 * diverge: comments between statements, semicolon-less leading semicolons,
 * IIFEs, switch cases, try/catch and labelled statements.
 */
export const FIXTURES: Record<string, string> = {
  'import then statement': `import { z } from './z'
const mid = 1

export const value = mid
export function f() {
  return 1
}
`,

  'statement then return': `export function g(n: number) {
  n += 1
  return n
}
`,

  'block-like then return needs none': `export function h(n: number) {
  if (n > 0) {
    n += 1
  }
  return n
}
`,

  'multiline const then return': `export function i() {
  const obj = {
    a: 1,
  }
  return obj
}
`,

  'throw after statement': `export function j(n: number) {
  n += 1
  throw new Error('boom')
}
`,

  'return after throw': `export function k(n: number) {
  if (n) {
    throw new Error('x')
  }
  return n
}
`,

  'semicolon-less leading semicolon': `export function l() {
  const a = 1
  ;
  return a
}
`,

  'blank line then comment then return': `export function m() {
  const a = 1

  // why
  return a
}
`,

  'no blank line before comment': `export function n() {
  const a = 1
  // why
  return a
}
`,

  'do-while then return': `export function o() {
  do {
    x()
  } while (y)
  return 1
}
`,

  'iife then expression': `export function p(v: string) {
  ;(function () {
    return 1
  })()
  log(v)
}
`,

  'switch cases': `export function q(v: number) {
  switch (v) {
    case 1:
      a()
      break
    case 2:
      b()
      return 1
    default:
      return 0
  }
}
`,

  'function then statement': `export function r() {}
const after = 1

export function s() {
  const fn = () => {}
  const q = 1

  return q
}
`,

  'try then return': `export function t() {
  try {
    a()
  } catch {
    b()
  }
  return 1
}
`,

  'directive prologue': `export function u() {
  'use strict'
  a()
  return 1
}
`,

  'labelled statement then return': `export function v() {
  outer: for (;;) {
    break outer
  }
  return 1
}
`,

  'export run': `export const a = 1
export const b = 2
`,

  'class members': `export class W {
  a = 1
  b = 2
}
`,
}
