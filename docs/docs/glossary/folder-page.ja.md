---
date: 2026-10-14
title: フォルダーページ（Folder Page）
sidebar:
  hidden: true
---

# フォルダーページ（Folder Page）

単一のファイルではなくフォルダーを表すページで、folder-pagesプラグインが扱います。ディレクトリにエントリと公開URLを与えつつ、配下のページはそれぞれのパスを保ちます。

## 何をするか

indexノートを持つフォルダーは、そのフォルダーのURLにあるページになります。配下のページはそのフォルダーの下で引き続き参照できます。これにより、ディレクトリをランディングページとして使えます。

## URL

フォルダーページは自身のパーマリンクを持ちます。配下のページもそれぞれのパーマリンクを保つため、フォルダーがツリーを平坦化することはありません。

## folder-pagesプラグイン

フォルダーページは`folder-pages`プラグイン（`packages/plugins/folder-pages/src/folder_pages.ts`）が構築します。`buildFolderPages`関数は`ContentManifest`を受け取り、`FolderPagesModel`を生成します。これには`paths`（生成されたフォルダーページのURL）と`byPath`（パス名から`FolderPage`へのマップ）が含まれます。

主な動作：

- `index`または`README`ノートを持つフォルダーは、そのフォルダーのURLにあるページになります
- フォルダーの配下のページはそれぞれのパーマリンクを保ち、フォルダーページの下に平坦化されません
- `isNavigable`のチェックが、オーナーの有無、ルーティング対象のページ、一覧に載るサブフォルダーに基づいて、フォルダーにページを生成するかを決めます
- 生成されたパスは`@riebeckite/core`の`resolveGeneratedFolderLocation`が解決します

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

オーナーのいないフォルダー（indexノートがないフォルダー）でも、ルーティング対象のページや一覧に載るサブフォルダーがあればページが生成されます。
