---
title: Attachment
sidebar:
  hidden: true
---

# Attachment

A file in the content tree that is served as an asset rather than a content entry. Attachments map to public URLs while keeping their logical path, and the publication boundary decides what is safe to expose.

## Attachments and URLs

An image, PDF, or other non-Markdown file keeps its [logical path](./logical-path.md) and maps to a public URL. It is referenced with a normal Markdown link or an [embed](./embed.md).

## Boundary

Only files inside the content tree become public URLs. The [publication boundary](./publication-boundary.md) decides what is safe to expose, so arbitrary files outside the root are not published.
