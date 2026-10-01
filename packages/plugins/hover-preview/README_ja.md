# @riebeckite/plugin-hover-preview

内部リンクにカーソルを合わせると、リンク先のタイトルと抜粋をポップオーバーで表示するプラグインです。Quartz や Obsidian Publish のプレビューに近い挙動で、ページを離れずにリンク先の内容を確認できます。

[English](./README.md)

## 概要

ビルド時に `hoverPreviewPlugin()` がコンテンツマニフェストからプレビュー索引（`permalink` → `{ title, excerpt, slug }`）を作り、内部リンクを含むページへ一度だけ `<script type="application/json" data-rb-hover-preview>` として埋め込みます。クライアント側の `initHoverPreview` がこのデータを読み、対象リンクにホバー・フォーカス・タップの処理を付けます。

抜粋は描画済み HTML からタグを除いたプレーンテキストで、空白をまとめたうえで `excerptLength` 文字に切り詰めます。内部リンクのないページには何も挿入しません。`maxEntries` を指定するとページごとのデータ量を抑えられます。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { hoverPreviewPlugin } from "@riebeckite/plugin-hover-preview";

export default defineConfig({
  // ...
  plugins: [hoverPreviewPlugin()],
});
```

`hoverPreviewPlugin()` がスタイル、クライアントエントリ、ビルド時のデータ注入をまとめて登録します。`hoverPreview` は同じファクトリの別名です。

クライアントエントリは引数を取りません。表示に関する設定はデータ用スクリプトの data 属性に載るため、初期化処理をオプションなしで呼んでも動作します。

## オプション

| オプション      | 既定値         | 説明                                       |
| --------------- | -------------- | ------------------------------------------ |
| `delay`         | `120`          | ポップオーバーが出るまでの待ち時間（ミリ秒） |
| `excerptLength` | `160`          | 抜粋の最大文字数                           |
| `maxEntries`    | 未指定         | ページに埋め込む項目数の上限               |
| `selector`      | `a[href^="/"]` | プレビュー対象にする内部リンクのセレクタ   |
| `className`     | `rb-hover-preview` | ポップオーバーの基準クラス名           |
| `includeTitles` | `true`         | ポップオーバーにタイトルを表示するか       |

```ts
hoverPreviewPlugin({
  delay: 200,
  excerptLength: 120,
  maxEntries: 200,
  selector: 'a[href^="/notes/"]',
});
```

## 主なエクスポート

- `hoverPreviewPlugin(options?)`: プラグインを作成する
- `hoverPreview`: `hoverPreviewPlugin` の別名
- `resolveHoverPreviewOptions(options?)`: 既定値を適用して `ResolvedHoverPreviewOptions` を返す
- `buildPreviewIndex(entries, options)`: `HoverPreviewIndex`（`permalink` → `{ title, excerpt, slug }`）を作る
- `htmlToPlainText(html)` / `createExcerpt(html, length)`: 抜粋を作る補助関数
- `initHoverPreview()`: ブラウザ側の初期化処理。`@riebeckite/plugin-hover-preview/client` からも読み込める
- 定数: `HOVER_PREVIEW_ATTRIBUTE`, `HOVER_PREVIEW_SCRIPT_ID`
- 型: `HoverPreviewOptions`, `ResolvedHoverPreviewOptions`, `HoverPreviewEntry`, `HoverPreviewIndex`

## 関連資料

- [プラグインシステム](../../../docs/ja/docs/reference/plugin-api.md)

