# Change entries

A change entry records one user-facing change before it is released. Entries are
the source of truth for `CHANGELOG.md`, the release notes page, and GitHub
Releases.

## When to add one

Add an entry when a change affects anyone who installs or uses a published
Riebeckite package:

- a new feature or plugin option
- changed default behavior
- a deprecation or removal
- a bug fix that users can observe
- a security fix

You do not need an entry for internal refactors, tests, documentation fixes, or
CI-only changes that users cannot observe.

## Workflow

1. Run `pnpm changes:new my-change` to create `changes/unreleased/YYYYMMDD-HHmmss-<slug>-<6 hex>.md`.
   The timestamp plus random suffix keeps parallel worktrees from colliding.
2. Fill in the frontmatter and write the description for users, not for
   maintainers.
3. Run `pnpm changelog` and commit the regenerated `CHANGELOG.md` and release
   notes pages with the entry.
4. Run `pnpm check:changes` before opening a pull request.

At release time, `pnpm release <version>` validates every pending entry, moves
them to `changes/released/<version>/entries/`, and generates the changelog and
release notes. Re-running the release does not duplicate the entries.

## Format

```yaml
---
packages:
  - "@riebeckite/core"
type: added
breaking: false
migration: ""
pr: "123"
issue: ""
adr: "docs/agents/adr/<file>.md"
---
```

| Field | Required | Meaning |
| ----- | -------- | ------- |
| `packages` | yes | Published packages affected by the change. Use `[]` for repository tooling that affects no package. |
| `type` | yes | `added`, `changed`, `deprecated`, `removed`, `fixed`, or `security`. |
| `breaking` | yes | `true` when users must change their code or configuration. |
| `migration` | when breaking | What users must do. A breaking entry without migration steps fails validation. |
| `pr` | no | Pull request number or URL. |
| `issue` | no | Issue number or URL. |
| `adr` | no | Repository path to the ADR that explains the decision. |

The body after the frontmatter is the user-facing description. Write it as a
short paragraph in the present tense, for example "Add a `changes` directory for
user-facing release notes."

## Versioning before 1.0

Riebeckite is currently below 1.0. Patch releases should contain compatible
fixes. Minor releases may contain breaking changes, and every breaking change
must say so in its entry and include migration steps. From 1.0 onward, breaking
changes follow semantic versioning and require a major release.
