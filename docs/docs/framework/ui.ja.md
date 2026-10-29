---
title: UI
---

# UI

Riebeckite は UI フレームワークではなく、Markdown 中心の静的サイトフレームワークです。Markdown、プリセット、設定から始め、出力は標準 HTML、CSS、JSX でカスタマイズします。ほとんどのサイトで `@riebeckite/ui` は必要ありません。

## 標準的なサイト構造

セマンティックな要素を使い、レスポンシブのルールはサイト CSS で管理します。

```tsx
<header class="site-header">{navigation}</header>
<div class="site-layout">
  <aside class="site-sidebar">{sidebar}</aside>
  <main id="main-content" tabindex={-1} class="site-main">{children}</main>
  <aside class="site-aside">{toc}</aside>
</div>
<footer>{footer}</footer>
```

```css
.site-layout { display: grid; }
.site-sidebar, .site-aside { display: none; }
@media (min-width: 48rem) { .site-sidebar { display: block; } }
@media (min-width: 64rem) { .site-layout { grid-template-columns: 18rem minmax(0, 1fr) 16rem; } .site-aside { display: block; } }
```

DOM、ブレークポイント、見た目はサイト側で決めます。テーマはトークンを提供し、プラグインはコンテンツを提供します。どちらにも UI コンポーネントは必要ありません。

## 任意のプリミティブ

`@riebeckite/ui` には二つの役割があります。

- ルートエクスポートは、プラグインが使う共通の `SiteProvider` / `ArticleProvider` Context を提供します。
- サブパスエクスポートは、任意で使うヘッドレスなプリミティブとアクセシビリティ動作を提供します。サイトやプラグインは必要なものだけを選べます。

通常のサイトでは、機能が不要ならプリミティブをインストールしたり import したりする必要はありません。Core、Markdown パイプライン、テーマ、SSG はプリミティブに依存しません。

## Drawer

モバイルナビゲーションにアクセシブルなオーバーレイ動作が必要な場合だけ Drawer を使います。

```tsx
import { Drawer, DrawerTrigger } from "@riebeckite/ui/drawer";
import "@riebeckite/ui/styles/drawer.css";

<header class="site-header">
  <DrawerTrigger controls="site-menu" label="Menu" icon="menu" />
</header>
<Drawer id="site-menu" label="Navigation">{navigation}</Drawer>
```

フォーカス制御、Escape、外側クリック、SPA 遷移時の後始末には、クライアントエントリを一度読み込みます。

```ts
import "@riebeckite/ui/drawer/client";
```

コンポーネントは `data-rb-drawer`、`data-rb-drawer-backdrop`、`data-rb-drawer-panel`、`data-rb-drawer-trigger`、`data-rb-drawer-target` を出力します。配置は `--rb-drawer-inset-block-start`、`--rb-drawer-width`、`--rb-drawer-padding`、`--rb-drawer-background` で調整できます。

JavaScript がない場合、トリガーはフラグメントリンクとして動作し、`:target` でパネルを開けます。ただしこのフォールバックには、ダイアログのセマンティクス、フォーカストラップとフォーカス復元、Escape と外側クリックによる閉じる操作、スクロールロック、確実な閉じる導線がありません。JavaScript なしの利用を想定する場合は、パネル内に閉じるリンクを置いてください。完全なダイアログ動作が必要ならクライアントエントリを使います。

## Dialog

ネイティブの `<dialog>` 要素と `showModal()` を優先してください。トリガーの状態、フォーカス復元、スクロールロックも必要な場合はコントローラを使います。

```ts
import { createDialogController } from "@riebeckite/ui/dialog";

const controller = createDialogController(dialog, {
  triggers: [openButton],
  closeButtons: [closeButton],
  initialFocus: () => input,
  signal: context.signal,
});
```

コントローラは `aria-expanded` を同期し、背景クリックで閉じ、閉じたときにフォーカスを復元し、スクロールロックを参照カウントで管理します。ページライフサイクルの `AbortSignal` を `signal` に渡すと、abort 時にコントローラを破棄してスクロールロックを解放するため、SPA 遷移時の後始末を別の `destroy()` 呼び出しに依存しません。ネイティブダイアログ自身のフォーカス管理や Escape 処理を置き換えるものではありません。

## Tabs

WAI-ARIA の tabs パターンに沿って、ネイティブの button を使います。`createTabs()` は選択状態、矢印キー、Home/End、フォーカス、`aria-selected`、`tabindex`、パネルの表示を管理します。

```ts
import { createTabs } from "@riebeckite/ui/tabs";

const tabs = createTabs(tablist, {
  onSelect: ({ index }) => {
    /* 機能ごとの副作用 */
  },
});
```

タブグループが DOM から削除されるときは `tabs.destroy()` を呼びます。プリミティブはタブのマークアップや機能固有の意味を持ちません。Code Tabs などのプラグインは、Markdown 変換と同期ルールを引き続き所有します。

## Clipboard

`copyText()` は利用可能なら Clipboard API を使い、そうでなければ現在の選択範囲を保ったまま一時的な textarea でフォールバックします。

```ts
import { copyText } from "@riebeckite/ui/copy";

if (await copyText(value)) {
  /* 成功表示 */
}
```

ラベル、ステータス通知、ボタンのマークアップはプラグイン側に残します。

## Behaviors

`@riebeckite/ui/behaviors` サブパスは、プリミティブが使う小さな部品を公開します。`getFocusable`、`focusFirst`、`trapFocus`、`createDismissable`、`lockScroll` です。SSR 中に import しても安全で、ブラウザで呼び出すまで document にアクセスしません。

高レベルのプリミティブで対応できないオーバーレイ動作をプラグインが持つ場合だけ、これらを直接使います。
