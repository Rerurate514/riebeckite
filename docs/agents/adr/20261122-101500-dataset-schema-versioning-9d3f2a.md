# Version the dataset artifact contract with JSON Schema

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related Design Principles:** [Design Philosophy](../../docs/philosophy.md)
- **Related Changes / PR:** `changes/unreleased/20261121-221432-dataset-d1349e.md`

## Context

The `dataset` plugin exports the published content graph as `pages.ndjson`, `links.ndjson`, and `index.json`. External consumers read those files without any Riebeckite code, so the record shapes are a contract that must be described, validated, and versioned independently of the plugin implementation.

## Decision

`@riebeckite/plugin-dataset` ships normative JSON Schema (draft 2020-12) documents for the three artifacts at `./schema/pages.schema.json`, `./schema/links.schema.json`, and `./schema/index.schema.json`, exported from the package. `schemaVersion` counts breaking changes to those record shapes: appending an optional field keeps the version; removing, renaming, or redefining a field bumps it. The plugin's own tests validate generated output against the shipped schemas and against the `index.json` record counts, so a schema and implementation drift fails the build.

## Alternatives

- Describe the records in prose only: prose drifts, and consumers cannot validate a downloaded artifact with it.
- Validate with a runtime dependency: consumers of the artifact should not need a `@riebeckite` package to check the files the plugin already produced.

## Consequences

Schema changes are breaking by default, so consumers can pin a `schemaVersion` and detect moves. The distinction between `slug` (internal identity) and `permalink` (public URL) is contract, and so are the publication boundary (only discoverable notes and links between them), the slug-sorted deterministic output, and the absence of timestamps. New fields ship as optional additions until the next bump.
