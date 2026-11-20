import { definePlugin } from '@oxlint/plugins'
import type { Plugin } from '@oxlint/plugins'
import { paddingLineBetweenStatements } from './rules/padding-line-between-statements.js'

/** The plugin name doubles as the rule namespace in oxlint config. */
export const plugin: Plugin = definePlugin({
  meta: { name: '@gregdev/oxlint-plugin-stylistic' },
  rules: {
    'padding-line-between-statements': paddingLineBetweenStatements,
  },
})

export default plugin

export type {
  PaddingLineOption,
  PaddingType,
} from './rules/padding-line-between-statements.js'
export { MESSAGES } from './rules/padding-line-between-statements.js'
