---
date: 2026-11-23
title: インタラクティブなルート
---

# インタラクティブなルート

Riebeckite のサイトとプラグインのクライアントコードは、`hono/jsx/dom/client` の `hydrateRoot` と `createRoot` のどちらかで、インタラクティブなコンポーネントをマウントします。どちらを使うかは、1つの問いで決まります。サーバーがそのコンポーネント自身の出力をコンテナに描画しているか、クライアントが実行時に UI を組み立てるかです。

## hydrateRoot: サーバーのマークアップを描画し直す

サーバーがコンポーネント自身の出力をコンテナに描画し、クライアントが同じデータから同じマークアップを描画し直す場合に `hydrateRoot` を使います。クライアントの描画が既存の内容と一致するため、マウントの前後でページの見た目は変わりません。

hono/jsx の注意点として、hydration は render と同等です。`hydrateRoot` は `container.replaceChildren(fragment)` を呼ぶため、コンテナ内のサーバー描画済みの子要素は破棄され、クライアント側の描画で置き換えられます。既存の任意のマークアップに動作を付けることはなく、一致しないサーバーマークアップを保持することもありません。成立する契約は「同じデータから同じマークアップ」だけです。コンテナ内の SSR HTML は、クライアントコンポーネントが描画する内容と完全に一致している必要があります。

Garden Explorer はこの契約を満たします。サーバーが同じ `GardenExplorer` コンポーネントをルートに描画し、クライアントがシリアライズ済みデータから hydrate します（`packages/plugins/garden-explorer/client.tsx`）。

```tsx
import { hydrateRoot } from "hono/jsx/dom/client";

const root = document.querySelector<HTMLElement>(
  "[data-riebeckite-garden-explorer]",
);
if (root) {
  hydrateRoot(root, <GardenExplorer data={data} />);
}
```

Local Graph も同じ形です（`packages/plugins/local-graph/client.tsx`）。サーバーがビューを描画し、クライアントはその近くにあるシリアライズ済みのデータを読んで、同じコンポーネントをコンテナへ hydrate します。

### Markdown コンポーネントの連携

`markdownComponents` プラグイン API で `client: { moduleSpecifier }` を指定した場合も、この経路を自動で使います。サーバーがコンポーネントをラッパー要素の中に描画し、生成されたクライアントモジュールがシリアライズ済みの props とともにそのラッパーを `hydrateRoot` します。これらのコンポーネントでは、マウント方法を選ぶ必要はありません。ラッパーの子要素はクライアントの描画で置き換えられるため、サーバーとクライアントの描画が一致するようにコンポーネントを書いてください。

## createRoot: ホスト要素をクライアントが引き受ける

クライアントが実行時にだけ UI を組み立てる場合、または JavaScript なしのフォールバックや SSR のペイロードをインタラクティブ版に差し替える場合に `createRoot` を使います。結果の描画、サーバー描画の対応物を持たない UI を開く場合、静的なフォールバックコンテンツの置き換えが該当します。

最もわかりやすい例は Flashcards です。`packages/plugins/flashcards/src/render.ts` は静的なフォールバックを先に描画します。マウント時に `packages/plugins/flashcards/src/init.ts` がコンテナを挿入し、`deck.tsx` の `mountFlashcardsDeck` がその中にインタラクティブなデッキを描画するため、フォールバックは置き換えられます。

```tsx
export function mountFlashcardsDeck(
  container: HTMLElement,
  props: FlashcardsDeckProps,
): () => void {
  const root = createRoot(container);
  root.render(<FlashcardsDeck {...props} />);
  return () => root.unmount();
}
```

検索結果（`packages/plugins/search/src/search-results.tsx`）、差分ビューア（`packages/plugins/diff/client/diff-viewer.ts`）、テキストフラグメントのポップオーバー（`packages/plugins/text-fragment/src/popover.tsx`）、ライトボックス（`packages/plugins/lightbox/src/dialog.tsx`）も同じ形です。これらの UI は、利用者の操作に応じて初めて現れるか、静的なコンテンツをクライアント側で強化したものであり、一致させるべきサーバー描画のインタラクティブなマークアップを持ちません。

## マウント方法の選び方

サーバーがコンポーネント自身の出力をコンテナに描画し、クライアントが同じデータから同じマークアップを描画し直す場合は `hydrateRoot` を使います。クライアントが実行時にだけ UI を組み立てる場合や、JavaScript なしのフォールバックや SSR のペイロードをインタラクティブ版に差し替える場合は `createRoot` を使います。

`hydrateRoot` を、任意のサーバー描画マークアップに動作を付ける手段と考えないでください。hono/jsx の hydration はコンテナの子要素を置き換えるため、SSR HTML はクライアントの描画と同じコンポーネント、同じデータから生成されている必要があります。それ以外はマウント時に破棄されます。逆に、サーバー描画のインタラクティブなマークアップに `createRoot` を使っても、その出力は破棄され、最初から描画し直されます。

## マウントする範囲の選び方

マウント方法とライフサイクルは別の判断です。プラグインのクライアントエントリは `scope` を宣言します。

- `page`（既定）は `main#main-content` にマウントし、SPA ナビゲーションのたびに実行し直されます。ページの置き換え前（`onBeforePageCommit`）に page スコープは unmount され、反映後（`onPageCommit`）に mount し直されます。
- `app` は `document` に1回だけマウントし、ヘッダーやツールバーなど、ページ移動をまたいで残るシェル領域に使います。

置き換えられるページに属するものには `page` を、永続するシェル UI には `app` を使ってください。ページ移動のライフサイクル、イベント、再初期化の決まりは [SPAナビゲーション](./spa-navigation.ja.md) で説明しています。

## 関連ページ

- [SPAナビゲーション](./spa-navigation.ja.md) — ページ移動、ライフサイクル、再初期化
- [クライアントエントリ](../reference/plugin-api/ui-and-assets.ja.md) — クライアントモジュールとスコープの宣言
- [Initializers](../framework/spa-runtime/initializers.ja.md) — 生成されたクライアントコードが各スコープをどうマウントするか
- [サイトのカスタマイズ](./customizing-your-site.ja.md) — island とサイトが持つインタラクティブな UI
