import type { Span } from '@oxlint/plugins'

/**
 * Just the node fields this rule actually touches. Both linters emit them,
 * but their own typings are enormous unions, so we duck-type instead.
 */
export interface AstNode extends Span {
  type: string
}

export const isAstNode = (value: unknown): value is AstNode =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string'

export const asNode = (value: unknown): AstNode | null =>
  isAstNode(value) ? value : null

export const asNodeList = (value: unknown): AstNode[] =>
  Array.isArray(value) ? value.filter(isAstNode) : []

/** Reads a field that `AstNode` does not declare. */
export const field = (node: AstNode, key: string): unknown =>
  (node as unknown as Record<string, unknown>)[key]
