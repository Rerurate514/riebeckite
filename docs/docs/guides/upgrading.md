---
date: 2026-10-06
title: Upgrading Riebeckite
---
# Upgrading Riebeckite

Use this guide when updating an existing site to a newer Riebeckite version.

1. Check the installed packages.
2. Update the Riebeckite packages used by the site together.
3. Run validation and build the site.
4. Review the [release notes](https://github.com/Rerurate514/riebeckite/releases) for the target version.

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

Riebeckite records deprecated public APIs in API lifecycle metadata and marks
TypeScript declarations with `@deprecated`. `check`, `doctor`, and the
Development Inspector's API tab report deprecated configuration keys and plugin
options that the project still uses, including the replacement, removal version,
and migration guide when they are known. These warnings explain how to migrate;
they do not add a compatibility layer and do not fail a build by default. Use
`doctor --fail-on warning` when a CI check should treat them as failures.

Usage detection is limited to lifecycle metadata that names a configuration path
or plugin option. Deprecated APIs without that metadata still appear in
`inspect api` and the Inspector, but are not reported as used.

Breaking changes are communicated through versions, change history, lifecycle
metadata, and migration guides when needed. This policy does not require a
deprecation period before every removal.

Before 1.0, minor releases can contain breaking changes. From 1.0 onward,
breaking changes follow semantic versioning. Read the [release notes](https://github.com/Rerurate514/riebeckite/releases) before
upgrading across a minor or major version.

## When an upgrade fails

Start with the command that failed and read its diagnostics. Confirm package
versions, update the affected configuration or plugin contract according to the
release notes for the target version, then rerun `check`, `doctor`, and `build`. Keep the pre-upgrade
state in version control so the change can be reviewed or reverted safely.