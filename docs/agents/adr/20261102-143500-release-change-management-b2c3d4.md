# Record changes and decisions at their source

- **Status:** Accepted
- **Date:** 2026-11-02
- **Related Design Principles:** [Explicitness over convenience](../../docs/philosophy.md#explicitness-over-convenience), [Existing API preservation vs. architecture improvement](../../docs/philosophy.md#existing-api-preservation-vs-architecture-improvement)
- **Related Changes / PR:** `changes/unreleased/20261102-143000-release-change-management-a1b2c3.md`

## Context

Riebeckite publishes many npm packages at one shared version. The release script
already owns version bumping, publishing, verification, commits, and tags, but it
had no place to record what users should expect, which packages changed, or why a
breaking change was necessary. Release notes were referenced from the upgrade
guide without a maintained source.

Changesets was the first candidate. It is well suited to independent package
versions and its own publish workflow. Riebeckite instead publishes every package
at one version, verifies the registry, and supports resuming a partially
published release. Adopting Changesets version/publish commands would duplicate
that ownership and risk two sources of truth.

## Decision

Record user-facing changes as small Markdown entries under `changes/unreleased/`.
Each entry names its packages, type, breaking status, migration steps, and related
PR, issue, or ADR. `pnpm release <version>` validates the entries before any
publish, archives them after every package is verified live, and generates
`CHANGELOG.md`, the English and Japanese release notes pages, and the GitHub
release notes from that single source.

Record important design decisions as ADRs under `docs/agents/adr/`. ADRs are
required for public contract changes, architecture boundaries, intentional
design-principle exceptions, security or publication exceptions, and release
policy changes. They are not required for ordinary fixes.

The release script remains the only owner of version bumping, npm publishing,
verification, and tag creation. The changelog generator is a deterministic
consumer of the change entries.

## Alternatives

- **Changesets.** Rejected because its version and publish commands overlap the
  existing all-packages release workflow, and its fixed-package model does not
  cover registry verification, resumability, or interactive authentication.
- **Generate the changelog from Git commit messages.** Rejected because commit
  subjects describe implementation history, not user impact, and cannot express
  migration steps or breaking-change classification reliably.
- **Hand-maintain CHANGELOG.md, GitHub Releases, and docs pages.** Rejected
  because the three copies drift and a re-run can append the same release twice.

## Consequences

- A pull request that affects users adds one change entry and regenerates the
  changelog files. CI checks the schema and generated output, not whether an ADR
  or entry was necessary.
- A release without pending entries still works and records that no user-facing
  changes were found.
- The changelog history starts when this system is first used; earlier versions
  remain available as Git tags and GitHub Releases, and are not reconstructed
  from guesses.
- GitHub Releases are created by a tag-triggered workflow from the archived
  release notes, preserving the existing rule that the release script does not
  push tags.
