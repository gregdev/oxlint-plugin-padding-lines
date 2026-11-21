# @gregdev/oxlint-plugin-stylistic

Stylistic rules that oxlint does not ship, implemented to match ESLint's
behaviour exactly.

oxlint has no native `padding-line-between-statements`, and formatting can't
cover it: Prettier and oxfmt never insert blank lines _between statements_.
This plugin fills that gap without dragging a second linter into the project.

## Rules

| Rule                              | Status                                        | Autofix |
| --------------------------------- | --------------------------------------------- | ------- |
| `padding-line-between-statements` | All ESLint statement types and option triples | Yes     |

Semantics are copied from ESLint's own implementation, including the cases that
are easy to get wrong:

- comments split a blank-line gap in two
- a leading semicolon in semicolon-less code belongs to the _next_ statement
- IIFEs and `do`/`while` count as block-like statements
- directives (`'use strict'`) are distinguished from plain expressions
- labelled statements match by their inner statement
- the last matching option triple wins

## Install

```bash
pnpm add -D @gregdev/oxlint-plugin-stylistic
```

## oxlint

```jsonc
// .oxlintrc.json
{
  "jsPlugins": ["@gregdev/oxlint-plugin-stylistic"],
  "rules": {
    "@gregdev/oxlint-plugin-stylistic/padding-line-between-statements": [
      "error",
      { "blankLine": "always", "prev": "*", "next": "return" },
      { "blankLine": "any", "prev": ["block-like", "block"], "next": "return" },
    ],
  },
}
```

Options are the same triples ESLint takes, and may be repeated. The schema
describes the whole array, so any number of triples validates.

## ESLint

The rule follows the standard `create(context)` contract, so it works
unmodified as an ESLint plugin too:

```js
// eslint.config.mjs
import stylistic from '@gregdev/oxlint-plugin-stylistic'

export default [
  {
    plugins: { '@gregdev/stylistic': stylistic },
    rules: {
      '@gregdev/stylistic/padding-line-between-statements': ['error', ...],
    },
  },
]
```

## Parity

The test suite runs every fixture through both this rule (via the real oxlint
binary) and ESLint's built-in `padding-line-between-statements` (via
`eslint/use-at-your-own-risk`), then asserts that findings _and_ `--fix`
output are byte-identical.

```bash
pnpm test
```

ESLint is a devDependency for this reason only. It is never imported at
runtime and is not a peer dependency.

## Caveats

- **Autofix inserts and removes one blank line.** `--fix` matches ESLint's
  output. A `never` violation with a comment between the statements is
  reported but not fixed, because merging the gap would swallow the comment.
- **oxlint JS plugins are alpha.** The `@oxlint/plugins` API can change between
  oxlint minors. The version is pinned and treated as a peer range.
- **Vue/Svelte/Astro:** oxlint lints only `<script>` blocks. That matches what
  ESLint does for this rule, but template formatting is out of scope.
- **Not a formatter.** Keep oxfmt (or Prettier) for whitespace; this rule only
  cares about statement separation.

## Development

```bash
pnpm install
pnpm build          # tsc -> dist
pnpm test           # parity + message assertions
pnpm lint           # oxlint, dogfooding this plugin
pnpm format         # oxfmt
```

`pnpm lint` builds first because `.oxlintrc.json` loads the plugin from
`dist/`.

## License

MIT
