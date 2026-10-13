---
title: Redirect
sidebar:
  hidden: true
---

# Redirect

An extra URL that points at a note's canonical permalink, usually to keep an older address working. Redirects are part of the resolved public location and do not replace the permalink.

## When redirects appear

A [permalink](./permalink.md) plugin, a rename, or a locale rule can add a redirect. The note keeps one canonical permalink and any number of redirects.

## Example

```ts
permalink: "/docs/notes/hello/",
redirects: ["/docs/hello/", "/hello/"],
```
