---
title: Page Type
sidebar:
  hidden: true
---

# Page Type

A kind of page that a plugin provides with its own public path and body, used for pages that are not ordinary Markdown. The integration resolves the route and the application assembles the final HTML.

## What a page type provides

- A public path for the page.
- A body the integration can render.
- Output dependencies for [incremental builds](./incremental-build.md).

## Boundaries

A page type does not own HonoX routes or the site shell. It declares a page; the integration and application place it.
