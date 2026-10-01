# @riebeckite/plugin-map

` ```map ` コードブロックや frontmatter の座標を、埋め込み地図に変換するプラグインです。まず静的フォールバック（座標・場所名・OpenStreetMap リンク・任意の静的画像）を描画し、地図があるページだけブラウザ側で Leaflet によるインタラクティブ地図に拡張します。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { map } from "@riebeckite/plugin-map";

export default defineConfig({
  // ...
  plugins: [
    map({
      zoom: 13,
      height: 320,
      // 既定はキー不要の OpenStreetMap。変更前に「タイルと帰属表示」を参照。
      tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }),
  ],
});
```

このプラグインは `order: -10` で実行されます。

## 記法

### コードブロック

ブロック本文は小さな key/value 形式です。`markers:` の後に `-` でマーカーを並べ、`lat, lng` だけの行は暗黙のマーカーになります。

````markdown
```map
center: 35.6812, 139.7671
zoom: 13
label: Tokyo Station
markers:
  - 35.6812, 139.7671 | Tokyo Station
  - 35.6586, 139.7454 | Tokyo Tower | A lattice tower
```
````

マーカー行は `lat, lng` または `lat, lng | ラベル | 説明` です。コードブロックの `title` がある場合はキャプションになります。

### frontmatter

frontmatter の座標は、記事の先頭に 1 つの地図を生成します。プロパティ名は既定で `map` で、`frontmatterKey` で変更できます。

```yaml
---
title: A trip
map:
  lat: 35.6812
  lng: 139.7671
  zoom: 13
  label: Tokyo Station
  markers:
    - 35.6812, 139.7671 | Tokyo Station
    - lat: 35.6586
      lng: 139.7454
      label: Tokyo Tower
---
```

`lat`/`lng` は `latitude`/`longitude`、`coordinates: [lat, lng]` または `coordinates: "lat, lng"` も受け付けます。`label` は `title`/`place`/`name` も使えます。

## どのように描画されるか

コードブロックまたは frontmatter の地図は `figure.rr-map` になります。

- `figure.rr-map`: `data-rr-map="pending"` と `data-rr-map-payload`（解決済みの地図データ JSON）を持ちます
- `div.rr-map__canvas [data-rr-map-canvas]`: Leaflet が描画する領域
- `figcaption.rr-map__caption`: キャプション（ある場合）
- `div.rr-map__static`: 常に利用できるフォールバック。`p.rr-map__place`、`ul.rr-map__markers` → `a.rr-map__link`（OpenStreetMap リンク）、任意の `img.rr-map__image`、`p.rr-map__attribution` を含みます
- `details.rr-map__fallback`: 元のブロック本文を折りたたんで表示

`initMap` は `[data-rr-map="pending"]` を探し、Leaflet を遅延して読み込み、タイルレイヤーとマーカーを描画して `data-rr-map="rendered"` にします（このとき静的フォールバックは非表示になります）。失敗した場合は `data-rr-map="error"` になり、`details` を開き、静的フォールバックは表示されたままです。

座標も `center` もないブロックは置き換えず、通常のコードブロックのまま残し、`source: "@riebeckite/plugin-map"` を持つ診断を出します。

## オプション

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `language` | `"map"` | 対象にするコードブロックの言語 |
| `className` | `"rr-map"` | figure に付ける基準クラス |
| `height` | `320` | 地図の高さ（ピクセル） |
| `zoom` | `13` | 既定のズームレベル（0〜19） |
| `minZoom` | `1` | 最小ズームレベル |
| `maxZoom` | `19` | 最大ズームレベル |
| `tileUrl` | OpenStreetMap 標準タイル | タイル URL テンプレート（`{z}`/`{x}`/`{y}`） |
| `attribution` | OpenStreetMap の帰属表示 | プロバイダが要求する帰属表示の HTML |
| `fallback` | `true` | 元の本文を表示する `details` を描画する |
| `staticFallback` | `true` | 静的フォールバックのブロックを描画する |
| `staticImageUrl` | — | 静的画像 URL テンプレート（`{lat}`/`{lng}`/`{zoom}`/`{width}`/`{height}`） |
| `frontmatterKey` | `"map"` | 座標を読む frontmatter プロパティ |

## タイルと帰属表示

既定はキー不要の [OpenStreetMap 標準タイル](https://tile.openstreetmap.org/) です。小規模なサイトには十分ですが、OpenStreetMap の[タイル利用ポリシー](https://operations.osmfoundation.org/policies/tiles/)は識別可能な referrer を前提とし、大量アクセスを禁止しています。一定のトラフィックがあるサイトは `tileUrl` を自前のタイルサーバーや商用プロバイダに向けてください。

帰属表示は省略できません。`attribution` は Leaflet に渡され、静的フォールバックにも（プレーンテキストで）描画されます。プロバイダが要求するクレジットを常に表示してください。

このプラグインは API キーや資格情報を同梱しません。タイル URL や静的画像 URL にキーが必要な場合、そのキーはブラウザへ送られるため公開情報になります。キー不要のサーバーか、キーをサーバー側に保持するプロキシを使ってください。`publicConfig` に公開されるのはタイル URL・帰属表示・ズーム範囲だけで、プラグインのオプションが暗黙にコピーされることはありません。

## クライアント側の描画

Leaflet（`leaflet.js` と `leaflet.css`）は、`[data-rr-map="pending"]` の figure が 1 つ以上あるときだけ jsDelivr から取得します。ライブラリを遅延して読み込むため、地図のないページは何も負担せず、地図のあるページも JavaScript を無効にしていたり CDN に到達できなかったりする場合は静的フォールバックが表示されます。

`initMap(options?)` は `tileUrl`、`attribution`、`minZoom`、`maxZoom`、`leafletScriptUrl`、`leafletStyleUrl`、および事前読み込み済みの `runtime`（テストで偽の Leaflet を注入する用途）を受け取ります。

## 出力のフック

- `figure[data-rr-map]`: 状態（`pending` / `rendered` / `error`）
- `figure[data-rr-map-payload]`: 解決済みの地図データ JSON
- `[data-rr-map-canvas]`: Leaflet の描画先
- `[data-rr-map-static]`: 静的フォールバックのブロック
- `details.rr-map__fallback`: 元のブロック本文

## 主なエクスポート

- `map(options?)`: プラグインを作成する（`mapPlugin` は別名）
- `initMap`: クライアント側の地図を初期化する
- `parseMapSource`: コードブロックを `MapData` に変換する
- `normalizeMapInput`: frontmatter を `MapData` に正規化する
- `describeMap`、`formatCoordinates`、`openStreetMapUrl`
- 型: `MapOptions`、`MapData`、`MapMarker`、`MapPayload`、`MapClientOptions`

## 制限

- 描画はクライアント側のみです。JavaScript が無効な環境では、静的フォールバック（座標・場所・OpenStreetMap リンク・任意の画像）は表示されますが、インタラクティブな地図は表示されません
- 最初の描画は Leaflet とタイルの CDN 取得を待ちます
- タイルプロバイダの利用規約と帰属表示はサイト運営者の責任です
- Leaflet は BSD-2-Clause、既定の OpenStreetMap タイルは © OpenStreetMap contributors（ODbL）です

## 関連資料

- [プラグインシステム](../../../docs/ja/docs/reference/plugin-api.md)

