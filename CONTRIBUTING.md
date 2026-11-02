# Contributing to Riebeckite

Riebeckite is developed as a pnpm monorepo. Read [Framework Development](https://riebeckite.dev/docs/framework/development) for setup and package layout, and [Design Philosophy](https://riebeckite.dev/docs/philosophy) before changing a public contract.

日本語: [CONTRIBUTING.ja.md](./CONTRIBUTING.ja.md)

## Before you change code

1. Pick the owning package. Keep Core independent of HonoX, Vite, plugins, themes, and the application.
2. Check whether the change is user-visible. If someone who installs a Riebeckite package can observe it, add a change entry.
3. Check whether the change needs an ADR. Public contract changes, architecture boundary changes, intentional exceptions to Design Philosophy, security or publication exceptions, and release policy changes need one.
4. If users must change code or configuration, mark the entry as breaking and write migration steps.

Do not add an ADR or change entry to an ordinary internal fix. CI checks the format of entries and generated files, not whether a change needed one.

## Change entries

```bash
pnpm changes:new my-change
pnpm changelog
pnpm check:changes
```

The entry is the source of truth for `CHANGELOG.md`, the release notes pages, and GitHub Releases. Commit the entry and the regenerated files together. See [changes/README.md](./changes/README.md) for the fields.

## ADRs

Use the template in [`docs/agents/adr/TEMPLATE.md`](./docs/agents/adr/TEMPLATE.md). Name the file `YYYYMMDD-HHmmss-<slug>-<6 hex>.md` so parallel worktrees do not collide. Add it to the index in [`docs/agents/adr/README.md`](./docs/agents/adr/README.md).

## Checks

Run the smallest relevant test first, then widen:

```bash
pnpm --filter <package> test
pnpm check
pnpm test:changelog
pnpm check:changes
pnpm check:docs
```

## Pull requests

Use the pull request template. Describe the user impact, the decision, and the tests you ran. Do not include unrelated refactors.

## Commits

Write commit messages in concise Japanese. Do not use `feat:` or `fix:` prefixes. Example:

```text
キャッシュの依存関係検証を追加
```

## Release

Releases are maintainer-only and use `pnpm release <version>`. Do not run `npm publish` manually. See [Release Operations](https://riebeckite.dev/docs/framework/release).
