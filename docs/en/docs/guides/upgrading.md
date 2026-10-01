# Upgrading Riebeckite

Use this guide when updating an existing site to a newer Riebeckite version.

## Basic upgrade flow

1. Check the installed package versions:

   ```sh
   npm ls @riebeckite/core @riebeckite/cli @riebeckite/honox
   ```

2. Update all Riebeckite packages in the site together.
3. Run the normal validation commands for your site:

   ```sh
   npm exec riebeckite check
   npm exec riebeckite doctor
   npm exec riebeckite build
   ```

4. If `doctor` reports deprecated usage, update the shown config, Plugin API, Theme API, CLI option, scaffold file, or package reference before the removal version.

## What a deprecated warning means

Deprecated means the feature still works for now, but it is no longer the preferred contract. Riebeckite reports deprecated usage as a warning, not as a build-breaking error.

Every deprecation warning should tell you:

- what is deprecated;
- when it became deprecated;
- what to use instead, if there is a replacement;
- what migration action to take;
- where to read more;
- the planned removal version, when one has been decided.

Run `npm exec riebeckite doctor` after upgrading. Deprecated usage appears in the `Deprecated usage` check. A warning-only doctor result is still a successful command; errors are reserved for invalid configuration, missing dependencies, content problems that block inspection, or APIs that have already been removed.

## Deprecation policy

- **Deprecated**: supported for now, but scheduled to change. You should migrate when practical.
- **Removed**: no longer supported. Continued usage may fail validation, build, or runtime checks.
- **Breaking Change**: a change that can require site, config, plugin, theme, or deployment updates.
- **Migration**: the manual steps documented to move from the old contract to the new one.

Riebeckite is currently pre-1.0, so the project does not promise the same compatibility window as a stable 1.x SemVer line. Even so, deprecated features should not be removed at the same moment they are first marked deprecated unless there is a security or correctness reason. When possible, Riebeckite will first warn, document a replacement or action, and remove the old contract in a later release.

## Reading migration notes

Start with the warning shown by `doctor`. It is the most specific source because it points at the old thing used by your site. Then read the linked migration documentation. If the warning has no direct replacement, follow the `Migration` action instead of searching for a one-to-one option.

Riebeckite does not currently provide `riebeckite migrate` or automatic file rewriting. Apply migrations manually and commit the change so future upgrades are easier to review.
