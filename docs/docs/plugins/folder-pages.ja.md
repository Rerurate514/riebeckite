<!-- Generated from packages/plugins/folder-pages/README_ja.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Folder Pages

[English](./folder-pages.md)

Riebeckite の Folder Page を提供するプラグインです。フォルダの入口ノートを
フォルダのランディングページにし、入口ノートのないフォルダには一覧ページを
自動生成します。

## インストール

```bash
pnpm add @riebeckite/plugin-folder-pages
```

## 使い方

```ts
import { folderPages } from "@riebeckite/plugin-folder-pages";

export default {
  plugins: [folderPages()],
};
```

## Markdown ベースの Folder Page

`<folder>/README.md` または `<folder>/index.md` にあるノートは、そのフォルダの
ランディングページになります。解決済みの permalink を `/folder/README` や
`/folder/index` から `/folder/` へ畳み込み、元の URL から新しい URL へ
リダイレクトします。

畳み込みは slug から URL を推測しません。ロケーションリゾルバが確定させた
permalink を書き換えるため、l10n やカスタム permalink でも正しい URL を
維持します。

フォルダ入口として扱うのは `README` と `index` だけです。`<folder>.md` は
通常のコンテンツページのままです。

同じフォルダに `README.md` と `index.md` の両方がある場合は、どちらも
畳み込みません。暗黙に一方を選ぶと曖昧になるためです。

## 自動生成される Folder Page

入口ノートを持たず、公開されたコンテンツがあるフォルダには `/folder/` に
ページを自動生成します。表示するのはフォルダ直下の要素だけです。

- **Pages**: 直下の公開・discoverable なノート
- **Folders**: discoverable なコンテンツを持つ直下のサブフォルダ

一覧は `manifest.discoverableEntries` を基準に作るため、unlisted・draft・
scheduled のノートは表示されません。URL を知っていれば到達できるノートと、
自動ナビゲーションから発見できるノートを区別します。`folder.md` を
フォルダ入口と混同することもありません。

## 並び順

Pages と Folders は解決済み permalink、次に title で並べます。プラグインの
順序に依存せず、出力は常に決定的です。

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `className` | `string` | `"rr-folder-page"` | 生成するフラグメントのルート CSS クラス。 |
| `pagesLabel` | `string` | `"Pages"` | ページ一覧の見出し。 |
| `foldersLabel` | `string` | `"Folders"` | フォルダ一覧の見出し。 |

## プラグイン依存

`content.localization` capability への任意依存を宣言しています。
`@riebeckite/plugin-l10n` を有効にすると、フォルダページのロケーション
書き換えがローカライズの後に実行され、畳み込み後の URL とリダイレクトが
最終的なローカライズ済み permalink を使います。l10n なしでも単独で動作します。
