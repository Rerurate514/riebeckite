# Architecture Decision Records

An ADR records a design decision that future maintainers will need to find. It
is deliberately lightweight: one file, one decision.

## When an ADR is required

Write an ADR for:

- a change to a public API, configuration field, or plugin/theme contract
- an architecture boundary change between Core, Plugin, Integration, Theme, App,
  or CLI
- an intentional exception to a Design Philosophy principle
- a security or publication-boundary exception
- a release, versioning, or change-management policy change

Do not write an ADR for ordinary bug fixes, internal refactors, test changes, or
documentation edits. The pull request description is enough for those.

When in doubt, ask whether a maintainer six months from now would need the
context in order to avoid undoing the decision. If yes, write an ADR.

## Naming

```text
YYYYMMDD-HHmmss-<slug>-<6 hex>.md
```

Example: `20261102-143500-release-change-management-b2c3d4.md`

The timestamp and random suffix avoid collisions when several worktrees create
ADRs at the same time. Do not renumber existing files.

## Status

| Status | Meaning |
| ------ | ------- |
| `Proposed` | Open for review. Not yet the working rule. |
| `Accepted` | The current decision. |
| `Superseded` | Replaced by a newer ADR. Link the replacement. |
| `Rejected` | Considered and not adopted. Keep the reasoning. |

An accepted ADR is not rewritten to match later behavior. Add a new ADR and mark
the old one `Superseded`.

## Related records

Older investigation reports remain in [`../history/`](../history/README.md).
They are historical evidence, not active decisions. New decisions belong here.

## Index

| ADR | Status | Decision |
| --- | ------ | -------- |
| [20261111-100000-navigation-exclude-73be42](./20261111-100000-navigation-exclude-73be42.md) | Accepted | Exclude configured slug paths and their descendants from derived navigation. |
| [20261102-143500-release-change-management-b2c3d4](./20261102-143500-release-change-management-b2c3d4.md) | Accepted | Record user-facing changes as entries and decisions as ADRs, then generate the changelog and release notes from one source. |
