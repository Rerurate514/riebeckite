---
date: 2026-10-06
title: Testing
---
# Testing

Riebeckite tests run on the Node.js built-in test runner (`node:test`) with
`tsx` for TypeScript, so no separate test framework is required. Output that is
expensive to assert by hand is recorded as committed golden files, which keeps
changes to that output visible in review.

End-to-end coverage of a real site lives separately in `tests/external-site` and
runs with `pnpm test:e2e:external`; this document covers package unit tests. The
reusable engine that drives it lives in `@riebeckite/test/e2e`, while the
repository-specific fixture, package list, and assertions stay in
`tests/external-site`.

## In this section

- [Running](./testing/running.md)
- [Plugins](./testing/plugins.md)
- [Golden files](./testing/golden-files.md)
- [Policy](./testing/policy.md)


