---
date: 2026-10-14
title: Folder Page
sidebar:
  hidden: true
---

# Folder Page

単一のファイルではなくフォルダを代表するページで、folder-pages Pluginが扱います。ディレクトリにentryと公開URLを与えつつ、配下のページはそれぞれのパスを保ちます。

## 何をするか

indexノートを持つフォルダは、そのフォルダのURLのページになります。配下のページはそのフォルダの下で参照可能なままです。これによりディレクトリをランディングページとして使えます。

## URL

フォルダページは自身のpermalinkを持ちます。配下のページもそれぞれのpermalinkを保つため、フォルダがツリーを平坦化することはありません。

## folder-pages Plugin

フォルダページは`folder-pages`プラグイン（`packages/plugins/folder-pages/src/folder_pages.ts`）によって作成されます。`buildFolderPages`関数は`ContentManifest`を受け取り、`FolderPagesModel`を生成します。これには`paths`（生成されたフォルダページのURL）と`byPath`（pathnameからFolderPageへのマップ）が含まれます。

主な動作：

- `index`または`README`ノートを持つフォルダは、そのフォルダのURLのページになります
- フォルダの配下ページはそれぞれのpermalinkを保持し、フォルタ下に平坦化されません
- `isNavigable`チェックは、ownerの有無、routable pageの有無、subfolderがlistedであるかに基づいてフォルダにページを生成するかどうかを決定します
- 生成されたパスは`@riebeckite/core`の`resolveGeneratedFolderLocation`によって解決されます

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

ownerのいないフォルダ（index noteがない場合でも）、routable pageがある場合やlistedなsubfolderがある場合はページが生成されます。
