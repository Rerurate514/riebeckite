---
title: Trace Span
sidebar:
  hidden: true
---

# Trace Span

A timed unit of build work. Traces divide build work into spans and record their duration. Span names should be stable (e.g., `content.load`, `plugins.run`, `diagnostics.run`, `application.build`).

## Structure

A trace has a parent span (e.g., `build`) and child spans for each unit of work.
Always close spans on both success and failure.

## Naming conventions

Use stable span names that can be compared between builds.
Avoid names that change every run due to input file names.

## Related terms

- [[profiler|Profiler]]
- [[logger|Logger]]
- [[build|Build]]

## Learn more

- [Observability](../framework/observability.md)
