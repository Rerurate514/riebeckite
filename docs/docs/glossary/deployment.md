---
title: Deployment
sidebar:
  hidden: true
---

# Deployment

The step that places the built site on a hosting target. The build produces the manifest and generated outputs, and the integration connects them to a platform such as Cloudflare Workers.

## What the build hands over

- The [manifest](./manifest.md).
- The [generated outputs](./generated-output.md).
- The build state used for the next [incremental build](./incremental-build.md).

## Targets

The [integration](./integration.md) connects the output to a platform. Static hosting serves the files directly; a worker or edge target serves them through a runtime.
