# Defer Open Graph image rendering

- **Status:** Accepted
- **Date:** 2026-11-03
- **Related Changes / PR:** `changes/unreleased/20261103-og-image.md`

## Context

Open Graph PNG rendering is expensive enough that planning it as in-memory output makes unchanged builds do unnecessary work. Generated images must also obey the existing publication boundary and output cache behavior.

## Decision

Generated output planning supports deferred outputs with a stable fingerprint and a renderer function. Integrations call the renderer only after the output plan marks its path affected. The OG image plugin uses this contract and only plans paths it generated for routable public content.

## Alternatives

Rendering during manifest construction was rejected because it defeats output-cache reuse. A remote image service was rejected because the generated site must remain static and self-contained.

## Consequences

Deferred output providers must supply a stable fingerprint without executing their renderer. Custom OG layouts require an explicit fingerprint so users control cache invalidation.
