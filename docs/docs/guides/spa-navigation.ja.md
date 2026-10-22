---
title: SPA Navigation
---

# SPA Navigation

このガイドは、Riebeckite Site で SPA navigation を有効にする方法、対象になる
リンク、Renderer に必要な要件を説明します。Site を開発する人向けの内容で、
内部実装は別ページで扱います。

## SPA navigation が変えるもの

Riebeckite は Page を Server で描画します。SPA navigation は opt-in の拡張です。最初の
Page を読み込んだ後、条件を満たすリンクをクリックすると、次の Page を
background で取得し、Page の内容だけを置き換えます。Header、Footer、その他の
application shell はそのまま残ります。

Riebeckite は client-side router を追加しません。各 URL はこれまでどおり
Server が描画し、直接アクセスや reload では通常の document を読み込みます。

## 有効にする

`riebeckite.config.ts` で `spa` を設定します。

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My site", baseUrl: "https://example.com" },
  spa: true,
});
```

`spa: true` は既定値で runtime を有効にします。設定を変える場合は object を
渡します。

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My site", baseUrl: "https://example.com" },
  spa: {
    prefetch: "hover",
    viewTransitions: true,
  },
});
```

`spa` を省略するか `spa: false` にすると、通常の browser navigation になります。

## Navigation で変わること

対象のリンクをクリックすると、Riebeckite は次の処理を行います。

- 現在の Page を離れずに、次の HTML document を取得する
- `<main id="main-content">` を、取得した Page の main element で置き換える
- document title、言語、方向、一部の Page metadata を更新する
- 新しい Page の island を hydrate する
- history を更新し、scroll を復元し、Page の内容へ focus を移し、支援技術に
  新しい Page を通知する

main element の外側にある application shell は再描画されません。Global の
stylesheet と script は読み込まれたままです。

## SPA navigation の対象になるリンク

次の条件をすべて満たす `<a href>` が対象です。

- 同一 origin で、HTTP または HTTPS である
- `target` がない、または `_self` である
- modifier key が押されていない
- `download` 属性がない
- `data-spa="false"` が指定されていない
- 現在の Page の hash だけを変えるリンクではない

それ以外のリンクは通常の browser 動作になります。対象から外すには
`data-spa="false"` を指定します。

```html
<a href="/print/article" data-spa="false">Print view</a>
```

Form と programmatic な navigation は intercept しません。

## Renderer の要件

各 Page は、`main-content` という ID を持つ main element を1つだけ描画する
必要があります。

```tsx
<SiteHeader />
<main id="main-content" tabindex={-1}>
  {children}
</main>
<SiteFooter />
```

Header、Footer、その他の永続する UI はこの element の外側に置きます。現在の
Page または取得した Page に `main#main-content` がない場合、transition は失敗
し、通常の document navigation に fallback します。

`tabindex={-1}` は、runtime が新しい内容へ focus を移すために使います。なくても
runtime が追加しますが、明示しておくと意図が伝わります。

## オプション

| Option | 型 | 既定値 | 効果 |
| --- | --- | --- | --- |
| `prefetch` | `false \| "hover"` | `false` | リンクに pointer が入ったとき、同一 origin の Page を先に取得する |
| `scrollRestoration` | `boolean` | `true` | history entry ごとに scroll 位置を保存・復元する |
| `viewTransitions` | `boolean` | `false` | 利用可能で、動きが許可されている場合に View Transitions API を使う |

不正な値は runtime の開始時に例外になります。

`prefetch: "hover"` は best-effort です。runtime は最大20件の Page を保持し、
別の Page へ移動しても prefetch を中止しません。リンクが多い Page で余分な
request を避けたい場合は `prefetch: false` にします。

## Page の script と island

新しい main element 内の island は、置き換え後に hydrate されます。通常の
`<script>` tag は SPA navigation では再実行されません。Page の操作は island か
plugin client entry に置き、Riebeckite が Page ごとに初期化できるようにします。

Global の stylesheet は読み込まれたままです。Stylesheet の変更は反映されません。
次の Page にだけ存在する stylesheet は追加されません。共有する style は global
に読み込んでください。

独自の code は `riebeckite:navigation` event で transition の完了を検知できます。

```ts
document.addEventListener("riebeckite:navigation", (event) => {
  const { url, popstate } = (
    event as CustomEvent<{
      url: string;
      popstate: boolean;
    }>
  ).detail;
  console.log("navigated", url, popstate);
});
```

event は新しい Page の commit 後に発火します。最初の Page load では発火しません。

## 制限と注意点

- SPA navigation には JavaScript が必要です。最初の load は通常の
  server-rendered Page で、SPA 無効時の build もこれまでどおり動作します。
- 対象は同一 origin の GET link だけです。Cross-origin link、form、download、
  新しい tab で開く link は browser に任せます。
- `main#main-content` がない場合や fetch に失敗した場合は、document 全体を
  読み込み直します。
- runtime は history entry ごとに Page を取得します。Page cache を持たないため、
  offline の back/forward は SPA navigation では動作しません。
- Page 固有の `<script>` や stylesheet の変更は反映されません。island と
  global asset を使ってください。
- View transition は browser の対応に依存し、
  `prefers-reduced-motion: reduce` のときは省略されます。
- SPA navigation は router ではありません。Route の解決、redirect、HTML の
  生成は Server が行います。

## 関連ページ

- [SPA navigation の構成](../framework/spa-navigation.ja.md)
- [SPA runtime の内部実装](../framework/spa-runtime.ja.md)
- [HonoX Integration](../framework/honox-integration.ja.md)
- [Configuration](../reference/configuration.ja.md)
