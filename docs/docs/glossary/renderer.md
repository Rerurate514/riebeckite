---
title: Renderer
sidebar:
  hidden: true
---

# Renderer

Renderers transform a content target into plugin-specific HTML; return `null` when the target is not handled so another renderer can participate. Examples include Canvas, Excalidraw, and attachment rendering.

## Renderer contract

Renderers receive a target with `kind`, `path`, `raw`, `label`, `url`, `embed` plus standard `PluginContext`. Return `null` when the renderer does not handle the target so the next renderer is tried.

## Examples

Built-in renderers include: canvas (Excalidraw), attachment, and media. Custom renderers can be defined per plugin for formats such as Bases or third-party diagram libraries.

## Related terms

- [[plugin|Plugin]]
- [[content-hook|Content hook]]
- [[island|Island]]
- [[asset|Asset]]
- [[endpoint|Endpoint]]

## Learn more

- [Plugin API](../reference/plugin-api.md)
