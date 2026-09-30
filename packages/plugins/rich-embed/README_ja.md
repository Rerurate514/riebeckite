# @riebeckite/plugin-rich-embed

` ```embed ` コードブロックを、ビルド時に外部メディアの埋め込みへ変換するプラグインです。

[English](./README.md)

## 概要

`richEmbed()` は ` ```embed ` フェンスをレスポンシブな
`<figure class="rb-rich-embed">` に置き換えます。プロバイダの判定は URL の文字列解析だけで行うため、ビルド時にネットワークへアクセスしません。クライアント側 JavaScript も不要です。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { richEmbed } from "@riebeckite/plugin-rich-embed";

export default defineConfig({
  // ...
  plugins: [
    richEmbed({
      allowHosts: ["player.example.com"],
    }),
  ],
});
```

## 構文

最初の空でない行が URL、それ以降の `key: value` 行がオプションです。

````md
```embed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
title: デモ動画
caption: 枠の下に表示するキャプション
aspect: 16/9
start: 30
```
````

| ブロックオプション | 説明 |
| ------------------ | ---- |
| `title` | `<iframe>` の `title` 属性（Gist ではリンクのラベル） |
| `caption` | `<figcaption class="rb-rich-embed__caption">` として出力 |
| `aspect` | `16/9` や `4/3` などのアスペクト比（既定は `16/9`） |
| `start` | 開始位置（秒、YouTube のみ） |

未知のキーは無視します。`aspect` が不正な場合は `16/9` に戻します。

## 対応プロバイダ

| プロバイダ | 認識する URL | 出力する `src` |
| ---------- | ------------ | -------------- |
| YouTube | `youtube.com/watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/` | `https://www.youtube-nocookie.com/embed/<id>` |
| Vimeo | `vimeo.com/<数値ID>` | `https://player.vimeo.com/video/<id>` |
| Spotify | `open.spotify.com/(track\|album\|playlist\|episode\|show)/<id>` | `https://open.spotify.com/embed/<type>/<id>` |
| CodePen | `codepen.io/<user>/pen/<id>` | `https://codepen.io/<user>/embed/<id>` |
| GitHub Gist | `gist.github.com/...` | リンクカード（iframe 埋め込み不可） |

ホストを判別できない場合はブロックをそのまま残し、警告の診断を出します。汎用 `<iframe>` を出力するのは、ホストが `allowHosts` に含まれる場合だけです。

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `allowHosts` | `string[]` | `[]` | 汎用 iframe へのフォールバックを許可するホスト名 |
| `providers` | `RichEmbedProvider[]` | すべて | 有効にするプロバイダの許可リスト |
| `disable` | `RichEmbedProvider[]` | `[]` | 無効にするプロバイダ（`providers` より優先） |

## 出力 HTML

```html
<figure
  class="rb-rich-embed"
  data-rich-embed="youtube"
  data-rich-embed-marker="RIEBECKITE_EXTERNAL_RICHEMBED_MARKER"
>
  <div class="rb-rich-embed__frame" style="--rb-rich-embed-aspect:16/9">
    <iframe
      src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
      loading="lazy"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
      title="デモ動画"
    ></iframe>
  </div>
  <figcaption class="rb-rich-embed__caption">キャプション</figcaption>
</figure>
```

Gist の場合は iframe の代わりに
`div.rb-rich-embed__card > a.rb-rich-embed__link` を出力します。

### CSS フック

- `.rb-rich-embed` — 外側の figure
- `.rb-rich-embed__frame` — レスポンシブなラッパー（`--rb-rich-embed-aspect` を参照）
- `.rb-rich-embed__caption` — 任意のキャプション
- `.rb-rich-embed__card`, `.rb-rich-embed__link` — Gist のリンクカード

スタイルシートは `@riebeckite/plugin-rich-embed/style.css` として配布されます。

## 診断

未対応または不正なブロックは元のコードブロックを保持し、vfile のメッセージとして警告を報告します。

- `source: "@riebeckite/plugin-rich-embed"`
- `ruleId: "unsupported-embed"`

## セキュリティ

- `https:` の URL だけを受理します。
- プロバイダの出力は検証済みのパスセグメントから組み立て、動的な部分は `encodeURIComponent` を通します。
- 汎用 iframe には `allowHosts` への明示的な登録が必要です。
- 生のユーザー HTML は出力しません。タイトル・キャプション・ラベルはすべてエスケープされるテキストノードとして書き込みます。

## 制限事項

- OEMBED の取得やタイトル・サムネイルの自動検出は行いません。URL とブロックオプションだけから組み立てます。
- GitHub Gist は iframe で埋め込めないため、リンクカードとして表示します。
- 汎用埋め込みは `https:` の URL をそのまま使うため、信頼できるホストだけを許可してください。

## エクスポート

- `richEmbed(options?)` — プラグインファクトリ
- `richEmbedPlugin` — `richEmbed` の別名
- 型: `RichEmbedOptions`, `RichEmbedProvider`

## 関連

- [プラグインガイド](../../../docs/ja/reference/plugin-api.md)
