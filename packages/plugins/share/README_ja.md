# @riebeckite/plugin-share

記事ごとの共有ボタンをビルド時に生成するプラグインです。公開対象の各エントリ
について、設定したサービス向けの共有 URL を組み立て、本文の近くにコントロール
を挿入します。共有リンクは通常の `<a>` なので JavaScript なしでも動作し、コピー
操作だけをプログレッシブ・エンハンスメントとして追加します。

[English](./README.md)

## 仕組み

`share()` は各ノートの `permalink` を絶対 URL に解決し、ノートのタイトルと URL
からサービスごとの共有 URL を組み立て、記事の近くにコントロールを挿入します。
`entry.html` と、コンテンツルートが描画するキャッシュ済みの `PostContent.html`
の両方を更新するため、生成ページとフィードの両方に反映されます。

対応サービスは次のとおりです。

| サービス | 共有 URL |
| -------- | -------- |
| `x` | `https://twitter.com/intent/tweet?url=…&text=…` |
| `bluesky` | `https://bsky.app/intent/compose?text=…` |
| `mastodon` | `https://{instance}/share?text=…` |
| `facebook` | `https://www.facebook.com/sharer/sharer.php?u=…` |
| `linkedin` | `https://www.linkedin.com/sharing/share-offsite/?url=…` |
| `hatena` | `https://b.hatena.ne.jp/add?mode=confirm&url=…&title=…` |
| `copy` | ノートの URL をコピーするボタン（リンクは JS 不要） |

`mastodon` はオプトインです。`services` に `"mastodon"` を追加し、
`mastodonInstance` を設定してください。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { share } from "@riebeckite/plugin-share";

export default defineConfig({
  // ...
  plugins: [share()],
});
```

Mastodon を有効にし、表示位置を変える例です。

```ts
share({
  services: ["x", "bluesky", "mastodon", "copy"],
  mastodonInstance: "mastodon.social",
  placement: "top",
});
```

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `services` | `ShareService[]` | `mastodon` 以外のすべて | 表示するサービス（順序どおり） |
| `placement` | `"top" \| "bottom"` | `"bottom"` | コントロールの表示位置 |
| `mastodonInstance` | `string` | なし | Mastodon のホスト。`services` に `"mastodon"` を含めると必須 |
| `className` | `string` | なし | 安定した `rr-share` フックに追加するルートクラス |
| `ariaLabel` | `string` | `"Share"` | コントロールグループのアクセシブル名 |
| `labels` | `Partial<Record<ShareService, string>>` | 組み込みラベル | サービスごとの表示ラベル |
| `copiedLabel` | `string` | `"Copied"` | コピー成功時に通知する文言 |
| `copyFailedLabel` | `string` | `"Copy failed"` | コピー失敗時に通知する文言 |

`services` に `"mastodon"` を含めたのに `mastodonInstance` が未設定の場合、
`riebeckite check` の時点で設定エラーになります。

## 出力

```html
<div class="rr-share" data-rr-share data-rr-share-placement="bottom"
     role="group" aria-label="Share">
  <ul class="rr-share__list">
    <li class="rr-share__item">
      <a class="rr-share__link rr-share__link--x"
         href="https://twitter.com/intent/tweet?url=…&amp;text=…"
         target="_blank" rel="noopener noreferrer" data-share-service="x">X</a>
    </li>
    <li class="rr-share__item">
      <button type="button" class="rr-share__button rr-share__copy"
              data-rr-share-copy data-share-url="https://example.com/posts/hello"
              data-rr-share-copied="Copied" hidden>Copy link</button>
    </li>
  </ul>
  <p class="rr-share__status" role="status" aria-live="polite"></p>
</div>
```

## プログレッシブ・エンハンスメント

共有リンクは通常の `<a>` なので、JavaScript を無効にしても動作します。コピー
ボタンは `hidden` の状態で出力され、アプリのページ初期化時に呼ばれる
`initShare()` が表示に切り替えます。JavaScript がない読者に、動かない操作を
見せることはありません。コピーには `navigator.clipboard.writeText` を使い、
失敗時は非表示の textarea と `document.execCommand("copy")` にフォールバック
します。結果は `aria-live="polite"` のステータス領域で通知します。

## スタイル

パッケージに `style.css` が含まれます。他のプラグインと同じように読み込みます。

```ts
import "@riebeckite/plugin-share/style.css";
```

安定したクラスは `rr-share`（ルート）、`rr-share__list`、`rr-share__item`、
`rr-share__link`、`rr-share__link--{service}`、`rr-share__button`、
`rr-share__copy`、`rr-share__status` です。Theme はこれらのフックを対象に
できます。任意の `className` はルートに追加され、これらのフックを置き換え
ません。

## エクスポート

- `share(options?)` — プラグインファクトリ
- `sharePlugin` — `share` のエイリアス
- `resolveShareOptions(options?)` — オプションの既定値を適用する
- `validateShareOptions(options?)` — 実行時オプションを検証する
- `buildAbsoluteUrl(config, permalink)` — ノート URL を絶対 URL に解決する
- `normalizeMastodonInstance(value)` — インスタンスをホスト名に正規化する
- `buildShareUrl(service, target, instance?)` — 1 サービスの URL を組み立てる
- `buildShareLinks(options, target)` — リンクを持つサービスをすべて組み立てる
- `renderShareControls(options, target)` — コントロールの HTML を生成する
- `injectShareControls(html, block, placement)` — ノート断片に挿入する
- `initShare()` — ブラウザ初期化関数（`@riebeckite/plugin-share/client` からも
  読み込める）
- 定数: `SHARE_SERVICES`, `SHARE_ATTRIBUTE`, `SHARE_ROOT_CLASS`,
  `DEFAULT_SHARE_SERVICES`, `DEFAULT_SHARE_LABELS`, `DEFAULT_SHARE_PLACEMENT`
- 型: `ShareOptions`, `ResolvedShareOptions`, `ShareService`,
  `SharePlacement`, `ShareLink`, `ShareTarget`

## 制約

- 共有 URL はビルド時に確定します。再ビルドすれば常に正しく再計算されます。
- Mastodon は具体的なインスタンスなしには有効化できません。
- プラグインはノート断片に挿入します。レイアウトを所有する Site は、CSS で
  位置を変えたり、ページごとに出力しない選択もできます。

## 関連

- [プラグインガイド](../../../docs/ja/reference/plugin-api.md)
