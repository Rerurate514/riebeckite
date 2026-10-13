---
title: Routable
sidebar:
  hidden: true
---

# Routable

A publishing view that lists the entries the site serves at a URL, including unlisted ones. Routing and output generation use this view rather than the discoverable one.

## What the view contains

Every entry that receives a URL and an output. An [unlisted](./unlisted.md) page is routable: it is served at its URL even though it is kept out of listings.

## Used by

Routing and [output generation](./output-inventory.md) read this view. A page that is not routable produces no output.
