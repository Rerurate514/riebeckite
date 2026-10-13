---
title: Logical Path
sidebar:
  hidden: true
---

# Logical Path

The location of a content file inside the content root, expressed relative to that root. Riebeckite keeps the logical path stable and maps it to a public path separately.

## Logical path

A file at `content/notes/hello.md` has the logical path `notes/hello`. The logical path is what the content system reasons about; it is not necessarily the public URL.

## Mapping to public

Location resolution maps the logical path to a [public path](./public-path.md). A [folder page](./folder-page.md) or a permalink rule can change the mapping without moving the file.
