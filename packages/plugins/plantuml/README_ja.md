# @riebeckite/plugin-plantuml

`plantuml` コードブロックを PlantUML の図として表示するプラグインです。ビルド時に PlantUML サーバーの画像 URL を組み立てるだけで、ビルド中にネットワークへアクセスしません。クライアント用の JavaScript も配布しません。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { plantuml } from "@riebeckite/plugin-plantuml";

export default defineConfig({
  // ...
  plugins: [plantuml()],
});
```

`plantuml` は `plantumlPlugin` という別名でもエクスポートしています。

## どのように描画されるか

` ```plantuml ` のコードブロックは `figure.rb-plantuml` に置き換わります。図そのものは `<img>` で、PlantUML サーバーが返す画像を指します。

```html
<figure class="rb-plantuml" data-plantuml data-plantuml-marker="..." data-plantuml-source="...">
  <div class="rb-plantuml__frame">
    <img class="rb-plantuml__image" src="https://www.plantuml.com/plantuml/svg/..." alt="..." loading="lazy" />
  </div>
  <details class="rb-plantuml__fallback">
    <summary>Diagram source</summary>
    <pre><code>...</code></pre>
  </details>
  <figcaption class="rb-plantuml__caption">...</figcaption>
</figure>
```

キャプションはコードブロックの `title`、またはソース中の `%% caption: ...` 行から取得します。`%%` は PlantUML のコメント記法ではないため、`%% caption:` 行は図のソースから取り除いてからエンコードします。キャプションがない場合、`<img>` の代替テキストは `PlantUML diagram` になります。`fallback` を有効にすると、元の PlantUML ソースを折りたたみ表示で残します。

## URL のエンコード

画像 URL は `text encoding` を使ってビルド時に組み立てます。手順は次のとおりです。

1. ソースを UTF-8 のバイト列にする
2. raw DEFLATE（RFC 1951、zlib ヘッダーや Adler-32 を含まない）で圧縮する
3. PlantUML 独自の base64（アルファベット `0-9A-Za-z-_`、3 バイトを 6 ビットずつ 4 文字へ）で再エンコードする

この処理は `src/plantuml-encoder.ts` に実装しています。`node:zlib` は動的 `import` で読み込むため、クライアント向けのバンドルに Node 組み込みモジュールが混入しません。エンコードはビルド時に完結し、PlantUML サーバーへの問い合わせは行いません。

## オプション

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `server` | `https://www.plantuml.com/plantuml` | 図を配信する PlantUML サーバーのベース URL。`http(s)` のみ |
| `format` | `"svg"` | 要求する画像形式。`"svg"` または `"png"` |
| `caption` | `true` | `title` または `%% caption:` をキャプションとして表示する |
| `fallback` | `true` | 元の PlantUML ソースを `<details>` に残す |

## 出力される HTML / CSS

プラグインは `style.css` を公開し、`rb-plantuml`、`rb-plantuml__frame`、`rb-plantuml__image`、`rb-plantuml__caption`、`rb-plantuml__fallback` という安定したクラス名で出力します。CSS 変数 `--rb-color-*` があればそれに追従し、`html[data-theme="dark"]`、または `data-theme` が無いときの `prefers-color-scheme: dark` で暗色に切り替わります。

## 診断

エンコードに失敗した場合は `file.message(...)` で診断を出します。診断の `source` は `@riebeckite/plugin-plantuml`、`ruleId` は `encoder-error`（エンコード失敗）または `empty-source`（空のソース）です。

## 制限

- 表示時に設定した PlantUML サーバーへ到達できる必要があります。オフラインの閲覧環境では図は表示されません
- 自前の PlantUML サーバーを使う場合は `server` にそのベース URL を指定してください
- ビルド時にサーバーへ問い合わせないため、構文が正しいかどうかはビルド時には判定しません

## 主なエクスポート

- `plantuml(options?)`: プラグインを作成する
- `plantumlPlugin`: `plantuml` の別名
- 型: `PlantumlOptions`、`PlantumlFormat`

## 関連資料

- [プラグインシステム](../../../docs/docs/reference/plugin-api.ja.md)

