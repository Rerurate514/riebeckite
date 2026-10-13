---
title: Doctor
sidebar:
  hidden: true
---

# Doctor

The CLI command that diagnoses the project broadly, checking environment, config, plugins, content, and build state.

## What it checks

Environment, config, plugins, content sources, and build state.
Continues independent checks where possible; exits unsuccessfully when health checks fail.

## Role

Does not substitute for a build. A failing doctor result exits unsuccessfully.
1つの診断に失敗しても、安全に続行できる独立した診断は可能な限り継続する。

## Related terms

- [[check|Check]]
- [[glossary/inspector|Inspector]]
- [[build|Build]]

## Learn more

- [CLI](../reference/cli.md)
