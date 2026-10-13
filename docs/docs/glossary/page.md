---
title: Page
sidebar:
  hidden: true
---

# Page

A routable piece of content that the site serves at a URL. A page is produced either from Markdown or by a plugin page type, and the integration renders it through a route.

## Markdown pages and plugin pages

Most pages come from Markdown. A [page type](./page-type.md) lets a plugin contribute a page that is not ordinary Markdown, such as an index or a generated listing.

## Rendering

The integration resolves a route for the page and the application assembles the final HTML. The plugin supplies the body, not the site shell.
