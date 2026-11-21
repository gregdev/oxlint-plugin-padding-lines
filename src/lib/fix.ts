import type { Fix, Fixer, SourceCode } from '@oxlint/plugins'
import type { AstNode } from './ast.js'
import {
  getActualLastToken,
  getPaddingLineSequences,
  isOnSameLine,
} from './tokens.js'
import type { TokenOrComment } from './tokens.js'

const LINE_BREAK = String.raw`\r\n\u2028\u2029`

/** Matches indent plus exactly one blank line between statements. */
const PADDING_LINE_SEQUENCE = new RegExp(
  String.raw`^(\s*?[${LINE_BREAK}])\s*[${LINE_BREAK}](\s*;?)$`,
  'u',
)

const withoutPaddingLine = (
  _match: string,
  trailing: string,
  indentation: string,
): string => trailing + indentation

/** Insert a blank line before `node`, after any trailing comment. */
export const fixExpectedBlankLine = (
  sourceCode: SourceCode,
  previousNode: AstNode,
  node: AstNode,
  fixer: Fixer,
): Fix => {
  const lastToken = getActualLastToken(sourceCode, previousNode)

  if (!lastToken) {
    return fixer.insertTextBefore(node, '\n')
  }

  let anchor: TokenOrComment = lastToken

  const nextToken: TokenOrComment | AstNode =
    (sourceCode.getFirstTokenBetween(lastToken, node, {
      includeComments: true,
      filter: (token: TokenOrComment) => {
        if (isOnSameLine(anchor, token)) {
          anchor = token

          return false
        }

        return true
      },
    }) as TokenOrComment | null) ?? node

  const insertText = isOnSameLine(anchor, nextToken) ? '\n\n' : '\n'

  return fixer.insertTextAfter(anchor, insertText)
}

/**
 * Remove one blank line before `node`. Returns `null` when more than one
 * padded gap exists, since merging those would swallow comments.
 */
export const fixUnexpectedBlankLine = (
  sourceCode: SourceCode,
  previousNode: AstNode,
  node: AstNode,
  fixer: Fixer,
): Fix | null => {
  const pairs = getPaddingLineSequences(sourceCode, previousNode, node)
  const pair = pairs.length === 1 ? pairs[0] : undefined

  if (!pair) {
    return null
  }

  const [before, after] = pair
  const range: [number, number] = [before.range[1], after.range[0]]
  const text = sourceCode.text
    .slice(range[0], range[1])
    .replace(PADDING_LINE_SEQUENCE, withoutPaddingLine)

  return fixer.replaceTextRange(range, text)
}
