import type { Span } from '@oxlint/plugins'

/**
 * Structural view of the few node fields the rule reads. Both linters emit
 * these, but their typings are ~200-way unions.
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
