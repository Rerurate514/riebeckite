---
date: 2026-10-14
title: Folder Page
sidebar:
  hidden: true
---

# Folder Page

A page that represents a folder rather than a single file, handled by the folder-pages plugin. It gives a directory an entry and a public URL while its children keep their own paths.

## What it does

A folder with an index note becomes a page at the folder's URL, and its children remain addressable under that folder. This is how a directory can act as a landing page.

## URLs

The folder page gets its own [permalink](./permalink.md). Its children keep theirs, so the folder does not flatten the tree.

## Folder pages plugin

Folder pages are built by the `folder-pages` plugin (`packages/plugins/folder-pages/src/folder_pages.ts`). The `buildFolderPages` function takes a `ContentManifest` and generates `FolderPagesModel`, which contains `paths` (generated folder page URLs) and `byPath` (a map from pathname to `FolderPage` entries).

Key behaviors:

- A folder with an `index` or `README` note becomes a page at the folder's URL
- Children of the folder keep their own permalinks and are not flattened under the folder page
- The `isNavigable` check determines whether a folder should have a page generated based on owner presence, routable pages, and subfolder listing
- Generated paths are resolved by `resolveGeneratedFolderLocation` from `@riebeckite/core`

```ts
// From packages/plugins/folder-pages/src/types.ts
export type FolderPagesModel = {
  paths: string[];
  byPath: Map<string, FolderPage>;
};

export type FolderPage = {
  folder: string;
  pathname: string;
  language?: string;
  title: string;
  pages: FolderPageLink[];
  folders: FolderPageLink[];
  dependencies: OutputDependency[];
};
```

Unowned folders (no index note) may still get a page if they have a routable page or subfolders that are listed.
