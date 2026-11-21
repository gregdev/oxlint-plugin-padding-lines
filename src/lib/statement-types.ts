import type { SourceCode } from '@oxlint/plugins'
import type { AstNode } from './ast.js'
import { asNode, field } from './ast.js'

/** Tells a matcher whether a node is a directive (`'use strict'`). */
export type DirectiveTest = (node: AstNode) => boolean

export type StatementMatcher = (
  node: AstNode,
  sourceCode: SourceCode,
  isDirective: DirectiveTest,
) => boolean

const TRANSPARENT_WRAPPERS = new Set([
  'ChainExpression',
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
])

/** Strips wrappers that do not change what a statement is. */
const unwrap = (node: AstNode | null): AstNode | null => {
  let current = node

  while (current && TRANSPARENT_WRAPPERS.has(current.type)) {
    current = asNode(field(current, 'expression'))
  }

  return current
}

const firstTokenValue = (
  node: AstNode,
  sourceCode: SourceCode,
): string | undefined => {
  const token = sourceCode.getFirstToken(node)

  return token ? String(token.value) : undefined
}

const keyword =
  (word: string): StatementMatcher =>
  (node, sourceCode) =>
    firstTokenValue(node, sourceCode) === word

const multilineKeyword =
  (word: string): StatementMatcher =>
  (node, sourceCode) =>
    node.loc.start.line !== node.loc.end.line &&
    firstTokenValue(node, sourceCode) === word

const singlelineKeyword =
  (word: string): StatementMatcher =>
  (node, sourceCode) =>
    node.loc.start.line === node.loc.end.line &&
    firstTokenValue(node, sourceCode) === word

const nodeType =
  (type: string): StatementMatcher =>
  (node) =>
    node.type === type

/** An expression statement that invokes a function literal. */
export const isIIFEStatement: StatementMatcher = (node) => {
  if (node.type !== 'ExpressionStatement') {
    return false
  }

  const expression = unwrap(asNode(field(node, 'expression')))

  if (!expression) {
    return false
  }

  const call =
    expression.type === 'UnaryExpression'
      ? unwrap(asNode(field(expression, 'argument')))
      : expression

  if (!call || call.type !== 'CallExpression') {
    return false
  }

  const callee = unwrap(asNode(field(call, 'callee')))

  if (!callee) {
    return false
  }

  return (
    callee.type === 'FunctionExpression' ||
    callee.type === 'ArrowFunctionExpression' ||
    callee.type === 'FunctionDeclaration' ||
    callee.type === 'Function'
  )
}

/** A statement whose last token closes a block. */
export const isBlockLikeStatement: StatementMatcher = (node, sourceCode) => {
  const body = asNode(field(node, 'body'))

  if (node.type === 'DoWhileStatement' && body?.type === 'BlockStatement') {
    return true
  }

  if (isIIFEStatement(node, sourceCode, () => false)) {
    return true
  }

  const lastToken = sourceCode.getLastToken(node)

  if (!lastToken || String(lastToken.value) !== '}') {
    return false
  }

  const owner = asNode(sourceCode.getNodeByRangeIndex(lastToken.range[0]))

  return owner?.type === 'BlockStatement' || owner?.type === 'SwitchStatement'
}

export const STATEMENT_TYPE_NAMES = [
  '*',
  'block-like',
  'multiline-block-like',
  'directive',
  'expression',
  'multiline-expression',
  'iife',
  'multiline-const',
  'multiline-let',
  'multiline-var',
  'singleline-const',
  'singleline-let',
  'singleline-var',
  'block',
  'empty',
  'function',
  'class',
  'break',
  'continue',
  'debugger',
  'do',
  'export',
  'for',
  'if',
  'import',
  'let',
  'return',
  'switch',
  'throw',
  'try',
  'var',
  'while',
  'with',
  'case',
  'default',
  'const',
] as const

export type StatementTypeName = (typeof STATEMENT_TYPE_NAMES)[number]

const MATCHERS: Record<StatementTypeName, StatementMatcher> = {
  '*': () => true,
  'block-like': isBlockLikeStatement,
  'multiline-block-like': (node, sourceCode, isDirective) =>
    node.loc.start.line !== node.loc.end.line &&
    isBlockLikeStatement(node, sourceCode, isDirective),
  directive: (node, _sourceCode, isDirective) => isDirective(node),
  expression: (node, _sourceCode, isDirective) =>
    node.type === 'ExpressionStatement' && !isDirective(node),
  'multiline-expression': (node, _sourceCode, isDirective) =>
    node.loc.start.line !== node.loc.end.line &&
    node.type === 'ExpressionStatement' &&
    !isDirective(node),
  iife: isIIFEStatement,
  'multiline-const': multilineKeyword('const'),
  'multiline-let': multilineKeyword('let'),
  'multiline-var': multilineKeyword('var'),
  'singleline-const': singlelineKeyword('const'),
  'singleline-let': singlelineKeyword('let'),
  'singleline-var': singlelineKeyword('var'),
  block: nodeType('BlockStatement'),
  empty: nodeType('EmptyStatement'),
  function: nodeType('FunctionDeclaration'),
  class: keyword('class'),
  const: keyword('const'),
  let: keyword('let'),
  var: keyword('var'),
  import: keyword('import'),
  export: keyword('export'),
  return: keyword('return'),
  throw: keyword('throw'),
  if: keyword('if'),
  for: keyword('for'),
  while: keyword('while'),
  do: keyword('do'),
  switch: keyword('switch'),
  try: keyword('try'),
  break: keyword('break'),
  continue: keyword('continue'),
  debugger: keyword('debugger'),
  with: keyword('with'),
  case: keyword('case'),
  default: keyword('default'),
}

/**
 * A labelled statement matches on its inner statement; a list matches if any
 * entry does.
 */
export const statementMatches = (
  node: AstNode,
  type: string | readonly string[],
  sourceCode: SourceCode,
  isDirective: DirectiveTest,
): boolean => {
  let inner = node

  while (inner.type === 'LabeledStatement') {
    const body = asNode(field(inner, 'body'))

    if (!body) {
      break
    }

    inner = body
  }

  if (Array.isArray(type)) {
    return type.some((candidate) =>
      statementMatches(inner, candidate, sourceCode, isDirective),
    )
  }

  const matcher = MATCHERS[type as StatementTypeName]

  return matcher ? matcher(inner, sourceCode, isDirective) : false
}
