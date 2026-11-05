---
date: 2026-10-14
title: Diagnostic code
sidebar:
  hidden: true
---

# Diagnostic code
Diagnostic codes are stable identifiers for categories of problems; core and plugins share a set of codes such as `duplicate-content-id`, `invalid-content-id`, and `content-integrity:*` for consistent reporting in `doctor` and the Development Inspector.

## Common codes
| Code | Default severity | Condition |
| ---- | -- | -- |
| `duplicate-content-id` | `error` | multiple published notes share a stable content ID |
| `invalid-content-id` | `error` | `id` frontmatter violates the stable content ID contract |
| `content-integrity:broken-link` | `warning` | link target does not exist |

## Usage
Report codes rather than ad-hoc messages so `doctor` and the Development Inspector can categorize and aggregate findings consistently. The core `DiagnosticCode` type is in `packages/core/src/types/diagnostic.ts`; plugins define their own codes, such as `content-integrity:*` in the diagnostics plugin.

## Related terms
- [[glossary/diagnostics|Diagnostics]]
- [[plugin|Plugin]]
- [[check|Check]]

## Learn more
- [Diagnostics](../framework/diagnostics.md)