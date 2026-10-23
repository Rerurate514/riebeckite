---
date: 2026-10-14
title: Check
sidebar:
  hidden: true
---

# Check

The CLI command that validates the configuration, plugins, and capabilities are set up correctly before a build.

## What it validates

Config format is valid.
Plugin configuration is valid.
Required capabilities are resolved.

## Purpose

Establishes basic project validity, not that output has been built or deployed. Guarantees that the configuration is valid.

## Check Command Details

`riebeckite check` validates the following:

- **Config format** — the configuration file structure is valid (types, required fields)
- **Plugin configuration** — each plugin's `validateOptions` has passed
- **Required capabilities** — all plugins' `provides` and `requires` are resolved without circular dependencies

The command exits with a non-zero code if any validation fails, but does not perform a build or emit output.

### Example

```sh
# Check validates configuration before building
npm exec riebeckite check

# Output: "✓ Configuration" and "✓ Content directory" if valid,
# or an error message indicating what is misconfigured
```
## Related terms

- [[doctor|Doctor]]
- [[glossary/inspector|Inspector]]
- [[build|Build]]

## Learn more

- [Check](../reference/cli.md)
