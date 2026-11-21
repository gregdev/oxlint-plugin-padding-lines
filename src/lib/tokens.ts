import type { Comment, Location, SourceCode, Token } from '@oxlint/plugins'
import type { AstNode } from './ast.js'

/** Anything carrying `value`, `range` and `loc`: a token or a comment. */
export type TokenOrComment = Token | Comment

/** Anything positioned in the source: a node, token or comment. */
interface Located {
  loc: Location
}

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

/**
 * Token pairs with at least one blank line between them. Comments split a gap
 * in two, so one blank line above a comment and one below yields two pairs.
 */
export const getPaddingLineSequences = (
  sourceCode: SourceCode,
  previousNode: AstNode,
  nextNode: AstNode,
): [TokenOrComment, TokenOrComment][] => {
  const pairs: [TokenOrComment, TokenOrComment][] = []
  const start = getActualLastToken(sourceCode, previousNode)

  if (!start) {
    return pairs
  }

  if (nextNode.loc.start.line - start.loc.end.line < 2) {
    return pairs
  }

  let cursor: TokenOrComment = start

  while (cursor.range[0] < nextNode.range[0]) {
    const token = sourceCode.getTokenAfter(cursor, {
      includeComments: true,
    }) as TokenOrComment | null

    if (!token) {
      break
    }

    if (token.loc.start.line - cursor.loc.end.line >= 2) {
      pairs.push([cursor, token])
    }

    cursor = token
  }

  return pairs
}

/** True when `second` starts on the line `first` ends. */
export const isOnSameLine = (first: Located, second: Located): boolean =>
  first.loc.end.line === second.loc.start.line
