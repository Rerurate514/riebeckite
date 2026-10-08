# Upgrading Riebeckite

Use this guide when updating an existing site to a newer Riebeckite version.

1. Check the installed packages.
2. Update the Riebeckite packages used by the site together.
3. Run validation and build the site.
4. Review the release notes and migration guide for the target version.

```sh
npm ls @riebeckite/core @riebeckite/cli @riebeckite/honox
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite build
```

`check` validates configuration and plugin contracts. `doctor` diagnoses the
environment, project discovery, configuration, plugins, content source, and
build state. `build` verifies that the site can be generated.

## Compatibility policy

Riebeckite currently does not provide runtime warnings or compatibility layers
for deprecated APIs by default. Breaking changes are communicated through
versions, change history, and migration guides when needed. This policy does
not prevent a future release from introducing a deprecation period.

Before 1.0, minor releases can contain breaking changes. From 1.0 onward,
breaking changes follow semantic versioning. Read the release notes before
upgrading across a minor or major version.

## When an upgrade fails

Start with the command that failed and read its diagnostics. Confirm package
versions, update the affected configuration or plugin contract according to the
migration guide, then rerun `check`, `doctor`, and `build`. Keep the pre-upgrade
state in version control so the change can be reviewed or reverted safely.