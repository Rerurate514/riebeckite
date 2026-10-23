---
date: 2026-10-14
title: Diagnostic severity
sidebar:
  hidden: true
---

# Diagnostic severity
Severity levels (error, warn, info) proportionate to whether output can remain correct; errors prevent correct output, warnings indicate potential issues, and info provides contextual information.

## Severity values
- `error`: output cannot remain correct; the build may fail or published content is invalid.
- `warn`: output may still be correct but requires attention; e.g., a link target may have changed.
- `info`: contextual information; does not affect correctness of output.

## Severity choice
Choose severity proportionate to the impact on published output. Prefer reporting uncertainty rather than silently choosing unsafe output. Errors stop the build; warnings allow the build to complete but flag the issue; info does not affect the build result.

## Related terms
- [[plugin|Plugin]]
- [[glossary/diagnostics|Diagnostics]]
- [[diagnostic-code|Diagnostic code]]
- [[doctor|Doctor]]

## Learn more
- [Diagnostics](../framework/diagnostics.md)