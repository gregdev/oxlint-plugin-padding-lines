# @gregdev/oxlint-plugin-padding-lines

`padding-line-between-statements` as a native oxlint rule, with the same
behaviour and options as ESLint's version, including autofix.

## Why this exists

- **oxlint has no native equivalent.** Oxc dropped its stylistic rules in
  favour of oxfmt, so `padding-line-between-statements` isn't in oxlint's rule
  set.
- **A formatter won't cover it.** Prettier and oxfmt don't insert blank lines
  between statements, so neither will produce or repair this spacing.
- **You could load `@stylistic/eslint-plugin` instead**, but that means loading
  a 96-rule plugin to use one rule, through oxlint's JS plugin API — which is
  still alpha.

That third point is the actual reason to install this: it's one small rule
instead of a large plugin behind an alpha API. It is not a claim that the rule
is otherwise impossible to run under oxlint.

## Rules

| Rule                              | Autofix |
| --------------------------------- | ------- |
| `padding-line-between-statements` | Yes     |

Behaviour follows ESLint's implementation, including the fiddly bits:

- a comment in the gap splits it into two gaps
- in semicolon-less code, a leading `;` belongs to the next statement
- IIFEs and `do`/`while` count as block-like
- directives (`'use strict'`) aren't treated as plain expressions
- a labelled statement is matched by the statement inside it
- when several option triples match, the last one wins

## Install

```bash
pnpm add -D @gregdev/oxlint-plugin-padding-lines
```

## oxlint

```jsonc
// .oxlintrc.json
{
  "jsPlugins": ["@gregdev/oxlint-plugin-padding-lines"],
  "rules": {
    "@gregdev/oxlint-plugin-padding-lines/padding-line-between-statements": [
      "error",
      { "blankLine": "always", "prev": "*", "next": "return" },
      { "blankLine": "any", "prev": ["block-like", "block"], "next": "return" },
    ],
  },
}
```

The options are the same triples ESLint takes, and you can repeat them. The
schema validates the array as a whole, so any number of triples works.

## ESLint

The rule uses the normal `create(context)` shape, so the same file works as an
ESLint plugin too:

```js
// eslint.config.mjs
import paddingLines from '@gregdev/oxlint-plugin-padding-lines'

export default [
  {
    plugins: { '@gregdev/padding-lines': paddingLines },
    rules: {
      '@gregdev/padding-lines/padding-line-between-statements': ['error', ...],
    },
  },
]
```

If you use ESLint rather than oxlint, you almost certainly want
`@stylistic/eslint-plugin` instead — it ships this rule alongside everything
else, and on ESLint the plugin-size argument doesn't apply.

## Parity

Each fixture goes through both this rule (running the real oxlint binary) and
ESLint's built-in `padding-line-between-statements` (loaded via
`eslint/use-at-your-own-risk`). The test asserts that the findings and the
`--fix` output are byte-identical.

```bash
pnpm test
```

That's the only reason ESLint is a devDependency. It isn't imported at runtime
and isn't a peer dependency.

## Caveats

- Autofix adds or removes a single blank line, same as ESLint. It won't fix a
  `never` violation when there's a comment in the gap, since merging the two
  would swallow the comment.
- oxlint's JS plugin API is alpha, so `@oxlint/plugins` can shift between
  oxlint minors. It's pinned here.
- Vue, Svelte and Astro: oxlint only lints `<script>` blocks. ESLint behaves
  the same way with this rule, and template formatting is out of scope.
- This isn't a formatter. Keep oxfmt or Prettier for whitespace; the rule only
  deals with how statements are separated.

## Development

```bash
pnpm install
pnpm build          # tsc -> dist
pnpm test           # parity + message assertions
pnpm lint           # oxlint, dogfooding this plugin
pnpm format         # oxfmt
```

`pnpm lint` builds first, since `.oxlintrc.json` loads the plugin out of
`dist/`.

## License

MIT
