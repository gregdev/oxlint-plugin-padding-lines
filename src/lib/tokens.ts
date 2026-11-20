import type { Comment, SourceCode, Token } from '@oxlint/plugins'
import type { AstNode } from './ast.js'

type TokenOrComment = Token | Comment

/**
 * The token that really ends a statement. A leading semicolon in
 * semicolon-less code belongs to the next statement, so it is skipped.
 */
export const getActualLastToken = (
  sourceCode: SourceCode,
  node: AstNode,
): Token | null => {
  const semicolonToken = sourceCode.getLastToken(node)

  if (!semicolonToken) {
    return null
  }

  const previousToken = sourceCode.getTokenBefore(semicolonToken)
  const nextToken = sourceCode.getTokenAfter(semicolonToken)

  const isSemicolonLessStyle =
    previousToken !== null &&
    nextToken !== null &&
    previousToken.range[0] >= node.range[0] &&
    String(semicolonToken.value) === ';' &&
    semicolonToken.loc.start.line !== previousToken.loc.end.line &&
    semicolonToken.loc.end.line === nextToken.loc.start.line

  return isSemicolonLessStyle ? previousToken : semicolonToken
}

/** Blank-line gaps between two statements. Comments split a gap in two. */
export const countBlankLineGaps = (
  sourceCode: SourceCode,
  previousNode: AstNode,
  nextNode: AstNode,
): number => {
  let cursor: TokenOrComment | null = getActualLastToken(
    sourceCode,
    previousNode,
  )

  if (!cursor) {
    return 0
  }

  if (nextNode.loc.start.line - cursor.loc.end.line < 2) {
    return 0
  }

  let gaps = 0

  while (cursor.range[0] < nextNode.range[0]) {
    const token: TokenOrComment | null = sourceCode.getTokenAfter(cursor, {
      includeComments: true,
    })

    if (!token) {
      break
    }

    if (token.loc.start.line - cursor.loc.end.line >= 2) {
      gaps += 1
    }

    cursor = token
  }

  return gaps
}
