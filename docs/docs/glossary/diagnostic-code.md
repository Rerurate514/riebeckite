---
title: Diagnostic code
sidebar:
  hidden: true
---

# Diagnostic code
Diagnostic codes are stable identifiers for categories of problems; core and plugins share a set of codes such as `duplicate-content-id`, `invalid-content-id`, and `content-integrity-*` for consistent reporting across `check` and `doctor`.

## Common codes
| Code | Default severity | Condition |
| ---- | -- | -- |
| `duplicate-content-id` | `error` | multiple published notes share a stable content ID |
| `invalid-content-id` | `error` | `id` frontmatter violates the stable content ID contract |
| `content-integrity-missing-page` | `warn` | link target does not exist |

## Usage
Report codes rather than ad-hoc messages so `check` and `doctor` can categorize and aggregate findings consistently. Codes are defined in `packages/core/src/diagnostic_code.ts` and can be extended by plugins.

## Related terms
- [[glossary/diagnostics|Diagnostics]]
- [[plugin|Plugin]]
- [[check|Check]]

## Learn more
- [Diagnostics](../framework/diagnostics.md)