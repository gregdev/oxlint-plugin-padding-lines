import { defineRule } from '@oxlint/plugins'
import type { Context, RuleOptionsSchema } from '@oxlint/plugins'
import type { AstNode } from '../lib/ast.js'
import { asNode, asNodeList, field } from '../lib/ast.js'
import { fixExpectedBlankLine, fixUnexpectedBlankLine } from '../lib/fix.js'
import {
  STATEMENT_TYPE_NAMES,
  statementMatches,
} from '../lib/statement-types.js'
import { getPaddingLineSequences } from '../lib/tokens.js'

export type PaddingType = 'always' | 'never' | 'any'

export interface PaddingLineOption {
  blankLine: PaddingType
  prev: string | readonly string[]
  next: string | readonly string[]
}

export const MESSAGES = {
  expectedBlankLine: 'Expected blank line before this statement.',
  unexpectedBlankLine: 'Unexpected blank line before this statement.',
} as const

const statementTypeSchema = {
  anyOf: [
    { enum: [...STATEMENT_TYPE_NAMES] },
    {
      type: 'array',
      items: { enum: [...STATEMENT_TYPE_NAMES] },
      minItems: 1,
    },
  ],
}

/**
 * The option list is variadic, so the schema describes the whole array.
 * A one-element `schema: [...]` makes oxlint reject any config with two or
 * more triples.
 */
const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      blankLine: { enum: ['always', 'never', 'any'] },
      prev: statementTypeSchema,
      next: statementTypeSchema,
    },
    required: ['blankLine', 'prev', 'next'],
    additionalProperties: false,
  },
} as RuleOptionsSchema

const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const toPaddingOptions = (value: unknown): PaddingLineOption[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is PaddingLineOption => {
    if (!isRecord(entry)) {
      return false
    }

    const { blankLine, prev, next } = entry
    const validPadding =
      blankLine === 'always' || blankLine === 'never' || blankLine === 'any'

    return (
      validPadding &&
      (typeof prev === 'string' || isStringList(prev)) &&
      (typeof next === 'string' || isStringList(next))
    )
  })
}

const paddingLineBetweenStatements = defineRule({
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: {
      description:
        'Require or disallow blank lines between statements, matching ESLint semantics.',
      url: 'https://github.com/gregdev/oxlint-plugin-stylistic#padding-line-between-statements',
    },
    messages: MESSAGES,
    schema,
  },
  create(context: Context) {
    const options = toPaddingOptions(context.options)
    const sourceCode = context.sourceCode

    // oxlint reports `'use strict'` as an ExpressionStatement, so directives
    // are identified per statement list rather than read off the node.
    const directives = new WeakSet<AstNode>()
    const isDirective = (node: AstNode): boolean => directives.has(node)

    const markDirectivePrologue = (list: AstNode[]): void => {
      for (const node of list) {
        if (typeof field(node, 'directive') === 'string') {
          directives.add(node)
          continue
        }

        if (node.type !== 'ExpressionStatement') {
          break
        }

        const expression = asNode(field(node, 'expression'))

        if (
          !expression ||
          expression.type !== 'Literal' ||
          typeof field(expression, 'value') !== 'string'
        ) {
          break
        }

        directives.add(node)
      }
    }

    /** Last matching option wins, so later entries override earlier ones. */
    const paddingFor = (previousNode: AstNode, node: AstNode): PaddingType => {
      for (let index = options.length - 1; index >= 0; index -= 1) {
        const option = options[index]

        if (!option) {
          continue
        }

        const matchesPrevious = statementMatches(
          previousNode,
          option.prev,
          sourceCode,
          isDirective,
        )
        const matchesNext = statementMatches(
          node,
          option.next,
          sourceCode,
          isDirective,
        )

        if (matchesPrevious && matchesNext) {
          return option.blankLine
        }
      }

      return 'any'
    }

    const verifyList = (list: AstNode[]): void => {
      markDirectivePrologue(list)

      for (let index = 1; index < list.length; index += 1) {
        const previousNode = list[index - 1]
        const node = list[index]

        if (!previousNode || !node) {
          continue
        }

        const padding = paddingFor(previousNode, node)

        if (padding === 'any') {
          continue
        }

        const gaps = getPaddingLineSequences(sourceCode, previousNode, node)

        if (padding === 'always' && gaps.length === 0) {
          context.report({
            node,
            message: MESSAGES.expectedBlankLine,
            fix: (fixer) =>
              fixExpectedBlankLine(sourceCode, previousNode, node, fixer),
          })
        } else if (padding === 'never' && gaps.length > 0) {
          context.report({
            node,
            message: MESSAGES.unexpectedBlankLine,
            fix: (fixer) =>
              fixUnexpectedBlankLine(sourceCode, previousNode, node, fixer),
          })
        }
      }
    }

    return {
      Program: (node: AstNode) =>
        verifyList([
          ...asNodeList(field(node, 'directives')),
          ...asNodeList(field(node, 'body')),
        ]),
      BlockStatement: (node: AstNode) =>
        verifyList(asNodeList(field(node, 'body'))),
      StaticBlock: (node: AstNode) =>
        verifyList(asNodeList(field(node, 'body'))),
      SwitchCase: (node: AstNode) =>
        verifyList(asNodeList(field(node, 'consequent'))),
      SwitchStatement: (node: AstNode) =>
        verifyList(asNodeList(field(node, 'cases'))),
    }
  },
})

export { paddingLineBetweenStatements }
