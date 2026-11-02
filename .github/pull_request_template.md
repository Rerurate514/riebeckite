## Summary

<!-- What changes for users or maintainers? -->

## Type of change

- [ ] User-facing feature
- [ ] User-facing fix
- [ ] Documentation only
- [ ] Internal refactor, test, or CI change
- [ ] Breaking change

## Design principles

- [ ] I read [Design Philosophy](https://riebeckite.dev/docs/philosophy) and this change does not contradict it.
- [ ] If this is an intentional exception, an ADR records the context and consequences.

## Decision record

- [ ] No ADR needed.
- [ ] ADR added under `docs/agents/adr/` and listed in its index.

An ADR is required for a public contract change, an architecture boundary change, an intentional exception to Design Philosophy, a security or publication exception, or a release policy change.

## Change entry

- [ ] No user-facing change.
- [ ] Entry added under `changes/unreleased/` and `pnpm changelog` was run.

## Breaking change and migration

- [ ] Not a breaking change.
- [ ] `breaking: true` in the entry, with migration steps.
- [ ] A migration guide is linked when the steps are more than a few lines.

Before 1.0, a minor release may contain a breaking change. From 1.0 onward, it requires a major release.

## Verification

- [ ] Targeted package test or typecheck
- [ ] `pnpm test:changelog` when change entries or generated files changed
- [ ] `pnpm check:changes`
- [ ] `pnpm check:docs` when documentation changed
- [ ] `pnpm check`

## Related issues / PRs / ADRs
