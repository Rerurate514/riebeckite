---
title: Public Path
sidebar:
  hidden: true
---

# Public Path

The path portion of a note's public URL, before the site origin is added. It is what a link uses after the permalink has been resolved.

## Public path

For the permalink `https://example.com/docs/hello/`, the public path is `/docs/hello/`. The [permalink](./permalink.md) is the full value; the public path is its path part.

## Where it appears

Routing, sitemaps, and generated links all work with public paths. They come from the resolved location, so a change in URL rules propagates without editing content.
