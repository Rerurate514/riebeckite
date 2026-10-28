---
date: 2026-10-23
title: SPAナビゲーション
---

# SPAナビゲーション

このガイドは、RiebeckiteのサイトでSPAナビゲーションを有効にする方法を説明します。ページ移動の対象になるリンクと、ページを描画する側に必要な要件も扱います。サイトを開発する人向けの内容で、内部実装は別ページで説明します。

## SPAナビゲーションで変わること

Riebeckiteはページをサーバーで描画します。SPAナビゲーションは、それを置き換えるものではなく、ページ移動を軽くするための任意の拡張です。

最初のページを読み込んだ後、条件を満たすリンクをクリックすると、次のページのHTMLをバックグラウンドで取得し、ページの内容だけを置き換えます。ヘッダー、フッター、その他のアプリケーションシェルはそのまま残ります。

Riebeckiteはクライアントサイドルーターを追加しません。各URLはこれまでどおりサーバーが描画し、直接アクセスした場合や再読み込みした場合は通常のHTML文書を読み込みます。

## 有効にする

`riebeckite.config.ts` で `spa` を設定します。

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My site", baseUrl: "https://example.com" },
  spa: true,
});
```

`spa: true` は既定値でランタイムを有効にします。設定を変える場合はオブジェクトを渡します。

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

`spa` を省略するか `spa: false` にすると、通常のブラウザのページ移動になります。

## ページ移動時に起きること

対象のリンクをクリックすると、Riebeckiteは次の処理を行います。

- 現在のページを離れずに、次のページのHTMLを取得する
- `<main id="main-content">` と一致する `data-spa-region` 要素を、取得したページの出力で置き換える
- ページタイトル、言語、文字方向、ページ固有のメタデータを更新する
- 新しいページのislandをhydrateする
- 履歴を更新し、スクロール位置を復元し、ページの内容へフォーカスを移し、支援技術に新しいページを通知する

属性のないmain要素の外側にあるアプリケーションシェルは再描画されません。グローバルなスタイルシートとスクリプトは読み込まれたままです。

## ページ移動の対象になるリンク

次の条件をすべて満たす `<a href>` が対象です。

- 同一オリジンで、HTTPまたはHTTPSである
- `target` がない、または `_self` である
- 修飾キー（Meta、Ctrl、Shift、Alt）が押されていない
- `download` 属性がない
- `data-spa="false"` が指定されていない
- 現在のページのハッシュだけを変えるリンクではない

それ以外のリンクは通常のブラウザ動作になります。対象から外すには `data-spa="false"` を指定します。

```html
<a href="/print/article" data-spa="false">Print view</a>
```

フォームとプログラムからのページ移動は横取りしません。

## ページを描画する側の要件

各ページは、`main-content` というIDを持つmain要素を1つだけ描画する必要があります。

```tsx
<SiteHeader />
<main id="main-content" tabindex={-1}>
  {children}
</main>
<SiteFooter />
```

永続するUIは、この要素の外側に置きます。URL、言語、ページデータによって変わるシェルの出力は、相互にSPA遷移するすべてのルートで、名前付きのregionに入れてください。

```tsx
<header data-spa-region="site-header"><SiteHeader /></header>
<main id="main-content" tabindex={-1}>{children}</main>
<footer data-spa-region="site-footer"><SiteFooter /></footer>
```

region名は文書内で一意にし、現在のページと取得したページの両方に置く必要があります。regionは `main` より先に置き換えられ、属性のないシェルUIは残ります。いずれかのページに `main#main-content` がない場合は、ページ全体の読み込みにフォールバックします。

`tabindex={-1}` は、ランタイムが新しい内容へフォーカスを移すために使います。省略してもランタイムが追加しますが、明示しておくと意図が伝わります。

## 設定項目

| 設定キー | 型 | 既定値 | 効果 |
| --- | --- | --- | --- |
| `prefetch` | `false \| "hover"` | `false` | リンクにポインターが入ったとき、同一オリジンのページを先に取得する |
| `scrollRestoration` | `boolean` | `true` | 履歴の項目ごとにスクロール位置を保存・復元する |
| `viewTransitions` | `boolean` | `false` | 利用可能で、動きが許可されている場合にView Transitions APIを使う |

不正な値は、ランタイムの開始時に例外になります。

`prefetch: "hover"` は、必ず成功するとは限りません。ランタイムはデータ節約設定や低速接続（2G以下）では実行せず、同じURLへのリクエストを重複排除します。完了したページを最大20件、30秒間保持し、ランタイムの停止時には進行中の取得を中断します。ページ移動を中断しても、共有されている先読みのリクエストは中断しません。リンクが多いページで余分なリクエストを避けたい場合は `prefetch: false` にします。

## ページのスクリプトとisland

新しいmain要素内のislandは、置き換え後にhydrateされます。通常の `<script>` タグは、SPAナビゲーションでは再実行されません。ページ固有の操作はislandかPluginのクライアントエントリに置き、Riebeckiteがページごとに初期化できるようにします。

グローバルなスタイルシートは読み込まれたままです。スタイルシートの変更は反映されません。次のページにだけ存在するスタイルシートは追加されません。共有するスタイルはグローバルに読み込んでください。

独自のコードは `spa:navigation` イベントでページ移動の完了を検知できます。region内の要素にリスナーを付けるシェルの動作は、このイベントの後に初期化し直すか、イベント委譲で実装してください。

```ts
document.addEventListener("spa:navigation", (event) => {
  const { url, popstate } = (
    event as CustomEvent<{
      url: string;
      popstate: boolean;
    }>
  ).detail;
  console.log("navigated", url, popstate);
});
```

イベントは新しいページの反映後に発火します。最初のページの読み込みでは発火しません。

## 制限と注意点

- SPAナビゲーションにはJavaScriptが必要です。最初の読み込みは通常のサーバー描画ページで、SPAを無効にしたビルドもこれまでどおり動作します。
- 対象は同一オリジンのGETリンクだけです。別オリジンのリンク、フォーム、ダウンロード、新しいタブで開くリンクはブラウザに任せます。
- `main#main-content` がない場合や取得に失敗した場合は、ページ全体を読み込み直します。
- ランタイムは、有効なキャッシュがなければ履歴の項目ごとにページを取得します。キャッシュは短時間しか有効ではないため、オフライン時の戻る・進むが確実に動くわけではありません。
- ページ固有の `<script>` やスタイルシートの変更は反映されません。islandとグローバルなアセットを使ってください。
- View Transitionはブラウザの対応に依存し、`prefers-reduced-motion: reduce` のときは省略されます。
- SPAナビゲーションはルーターではありません。ルートの解決、リダイレクト、HTMLの生成はサーバーが行います。

## 関連ページ

- [SPAナビゲーションの構成](../framework/spa-navigation.ja.md)
- [SPAランタイムの内部実装](../framework/spa-runtime.ja.md)
- [HonoXとの連携](../framework/honox-integration.ja.md)
- [設定リファレンス](../reference/configuration.ja.md)
