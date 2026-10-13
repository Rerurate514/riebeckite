---
title: Discoverable
sidebar:
  hidden: true
---

# Discoverable

A publishing view that lists the entries allowed to appear in listings, feeds, and navigation. A routable but unlisted page is served at its URL yet kept out of this view.

## Discoverable versus routable

| View | Includes |
| --- | --- |
| routable | Every entry with a URL and an output |
| discoverable | Only entries allowed in listings and feeds |

## Used by

Listings, [feeds](./feed.md), and discovery widgets read this view, so an unlisted page never appears in them.
