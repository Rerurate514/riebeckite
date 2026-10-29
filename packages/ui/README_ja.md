# @riebeckite/ui

Riebeckite の共有 Context と、任意で利用するヘッドレス UI プリミティブです。

[English](./README.md)

Riebeckite は UI フレームワークではありません。ほとんどのサイトは標準の HTML、CSS、JSX だけで十分です。共有 Context やアクセシブルな対話動作が必要な機能でのみ、このパッケージを import してください。

## 共有 Context

`SiteProvider` は解決済み設定、manifest、公開コンテンツ view、リクエスト path を保持します。`ArticleProvider` は描画対象の post と任意の公開 entry を保持します。Plugin component はこの Context から標準データを解決し、個別の props が渡された場合はそちらを優先します。

```tsx
import { SiteProvider } from "@riebeckite/ui";
```

composition と公開境界の要件は [HonoX UI ドキュメント](../../docs/docs/framework/honox-integration/ui.ja.md)を参照してください。

## 任意のプリミティブ

プリミティブはサブパスごとに分かれており、サイトは必要なものだけを読み込めます。

| Import | 用途 |
| --- | --- |
| `@riebeckite/ui/drawer` | `Drawer` と `DrawerTrigger` のマークアップ |
| `@riebeckite/ui/drawer/client` | フォーカス、Escape、外側クリック、スクロールロック、SPA 遷移時の後始末 |
| `@riebeckite/ui/dialog` | ネイティブ `<dialog>` 用のコントローラ |
| `@riebeckite/ui/tabs` | WAI-ARIA のタブ選択とキーボード動作 |
| `@riebeckite/ui/copy` | フォールバック付きのクリップボードコピー |
| `@riebeckite/ui/behaviors` | フォーカス、dismiss、スクロールロックのユーティリティ |
| `@riebeckite/ui/styles/drawer.css` | Drawer の構造と状態のスタイル |

```tsx
import { Drawer, DrawerTrigger } from "@riebeckite/ui/drawer";
import "@riebeckite/ui/styles/drawer.css";

<DrawerTrigger controls="site-menu" label="Menu" icon="menu" />
<Drawer id="site-menu" label="Navigation">{navigation}</Drawer>
```

```ts
import "@riebeckite/ui/drawer/client";
```

Drawer は Escape と外側クリックによる閉じる操作、フォーカストラップと復元、初期フォーカス、参照カウント付きスクロールロック、トリガーの ARIA 状態、SPA 遷移時の後始末、重複初期化の防止を提供します。JavaScript がない場合、トリガーはフラグメントリンクとして動作し、CSS の `:target` でパネルを開けます。ただしこのフォールバックには、ダイアログのセマンティクス、フォーカスの閉じ込めと復元、Escape と外側クリックによる閉じる操作、スクロールロック、確実な閉じる導線がありません。

`createDialogController()` は `signal` も受け取ります。abort するとコントローラを破棄し、ダイアログを閉じ、スクロールロックを解放してフォーカスを復元するため、ページライフサイクルの後始末で別の `destroy()` 呼び出しを忘れる心配がありません。

その他のプリミティブは [UI ガイド](../../docs/docs/framework/ui.ja.md)を参照してください。
