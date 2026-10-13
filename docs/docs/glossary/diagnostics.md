---
title: Diagnostics
sidebar:
  hidden: true
---

# Diagnostics

Diagnostics are structured findings emitted by Core and plugins; they describe what the problem is, where it occurs, its severity, and how to fix it. Plugins report diagnostics through `addDiagnostics`; Core combines them for `check` and `doctor` commands.

## Diagnostic structure

A diagnostic describes: `what` the problem is, `where` it occurs, `how important` it is (severity), and `how to fix` it. Use `check` for configuration/plugin validity and `doctor` for broader health.

## Reporting

```ts
addDiagnostics(context) {
  return [
    {
      id: "duplicate-content-id",
      severity: "error",
      message: "Multiple articles share the same content ID",
    },
  ];
}
```

## Related terms

- [[diagnostic-code|Diagnostic code]]
- [[plugin|Plugin]]
- [[glossary/inspector|Inspector]]
- [[build|Build]]

## Learn more

- [Diagnostics](../framework/diagnostics.md)
