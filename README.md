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

## Releasing

Publishing runs in GitHub Actions
(`.github/workflows/release.yml`) on any `v*` tag, using npm's
[trusted publishing](https://docs.npmjs.com/trusted-publishers): the workflow
presents an OIDC identity, and npm exchanges it for a short-lived credential.
There is no `NPM_TOKEN` to create, store or rotate.

```bash
pnpm version patch   # or minor / major; commits the bump and tags it
git push --follow-tags
```

The workflow installs with a frozen lockfile, checks the tag matches
`package.json`, lints, tests, then publishes. `prepublishOnly` rebuilds and
retests, so a stale `dist/` can't ship. Provenance is generated automatically
for OIDC publishes from a public repo.

### One-time setup

1. **Publish `0.1.0` once, by hand.** npm can't attach a trusted publisher to a
   package that doesn't exist yet, and OIDC can't create the first version
   ([npm/cli#8544](https://github.com/npm/cli/issues/8544)). Run
   `npm login` then `npm publish --provenance=false` in this repo. That's an
   interactive login, not a stored token.
2. **Add the trusted publisher** — npmjs.com → the package → Settings →
   Trusted publishing → GitHub Actions:

   | Field        | Value                         |
   | ------------ | ----------------------------- |
   | Organization | `gregdev`                     |
   | Repository   | `oxlint-plugin-padding-lines` |
   | Workflow     | `release.yml`                 |
   | Environment  | _(leave blank)_               |

   Values are case-sensitive and must match exactly; npm doesn't validate them
   when you save, so a typo only surfaces as `ENEEDAUTH` on the next tag.

3. **Optionally lock it down** — Settings → Publishing access → _Require
   two-factor authentication and disallow tokens_. Trusted publishers keep
   working; old tokens stop working.

A new trusted publisher expires if its first successful publish doesn't happen
within 2 days, so tag a release (say `v0.1.1`) soon after step 2.

The `repository.url` in `package.json` must match the GitHub repo exactly, which
is why it's spelled out there.

### Publishing from your machine

Attestations can only be generated inside a supported CI provider, so turn
provenance off explicitly:

```bash
npm publish --provenance=false
```

## License

MIT
