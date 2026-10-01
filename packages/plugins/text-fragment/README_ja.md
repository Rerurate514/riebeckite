# @riebeckite/plugin-text-fragment

記事内で選択したテキストから、Text Fragment のディープリンク（`#:~:text=`）と Markdown の引用を作るプラグインです。

[English](./README.md)

## できること

クライアント専用のプラグインです。ページ表示時に、選択範囲のそばへ小さなポップオーバーを出し、次の二つをコピーできます。

- **リンクをコピー**: 選択したテキストをハイライトする [Text Fragment](https://wicg.github.io/scroll-to-text-fragment/) 付き URL を作ります。
- **引用をコピー**: ページへのリンク付きで Markdown の引用ブロックを作ります。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { textFragmentPlugin } from "@riebeckite/plugin-text-fragment";

export default defineConfig({
  // ...
  plugins: [textFragmentPlugin()],
});
```

`textFragmentPlugin()` はスタイルと `initTextFragmentShare` を登録します。初期化処理はアプリのページ初期化時に呼ばれます。

## 挙動

- 記事本文内でテキストを選択すると、そのそばにポップオーバーが出ます。`pre`、`code`、`a[href]`、`[data-no-share]` の中の選択は対象外です。
- コピーは `navigator.clipboard.writeText` を使い、失敗時は隠し textarea と `document.execCommand("copy")` に切り替えます。
- コピーに失敗したときは `aria-live="polite"` の領域にメッセージを表示します。
- `Escape` またはポップオーバーの外側をクリックすると閉じます。ボタンは実体の `<button>` なのでキーボードでも操作できます。
- 初期化はページごとに一度だけで、`document` が無い環境では何もしません。

### URL の規則

フラグメントは `#:~:text=[prefix-,]start[,end][,-suffix]` に従います。

- `,`、`-`、`&` はパーセントエンコードします（`%2C`、`%2D`、`%26`）。
- それ以外は UTF-8 単位でエンコードします（改行は `%0A`）。
- ページ URL に既存のハッシュがあるときは、それを外してからディレクティブを付けます。
- 200 文字前後より長い選択、または改行を含む選択は、先頭と末尾のトークンによる `start,end` に短縮します。
- 空または空白だけの選択は `""` を返します。

## 公開 API

- `textFragmentPlugin()` — プラグインファクトリ
- `initTextFragmentShare()` — ブラウザ初期化関数（`@riebeckite/plugin-text-fragment/client` からも読み込める）
- `encodeTextFragment(text)` — テキスト片をパーセントエンコードする
- `buildTextFragmentUrl(pageUrl, selection, options?)` — ディープリンクを作る。`options` は `{ prefix?, suffix? }`
- `buildQuoteMarkdown({ url, title, selection })` — 引用ブロックを作る
- `TextFragmentOptions` — オプションの型

## 関連資料

- [プラグインシステム](../../../docs/ja/docs/reference/plugin-api.md)

