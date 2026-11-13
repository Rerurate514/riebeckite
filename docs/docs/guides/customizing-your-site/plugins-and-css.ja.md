---
date: 2026-10-08
title: プラグインとCSS
sidebar:
  label: プラグインとCSS
  order: 30
---
# プラグインとCSS

## プラグインのコンポーネントを使う

プラグインによっては、サイトから直接利用できる Hono JSX コンポーネントを提供しています。たとえば、バックリンクや目次をサイトの好きな場所へ配置できます。

```tsx
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { TableOfContents } from "@riebeckite/plugin-toc";

export function ArticleAside({ items, backlinks }: Props) {
  return (
    <aside>
      <TableOfContents items={items} />
      <Backlinks backlinks={backlinks} />
    </aside>
  );
}
```

利用できるコンポーネントや `props` は、それぞれのプラグインのページやパッケージの README を確認してください。多くのコンポーネントは `./components` から default import することもできます。

```tsx
import Backlinks from "@riebeckite/plugin-backlinks/components";
```

`color-mode` は例外で、`ColorModeScript` と `ColorModeToggle` をパッケージのルートから公開しています。

### ページの情報を参照するコンポーネント

プラグインのコンポーネントによっては、現在のページのデータを自分で解決します。`SiteProvider` と、公開された `entry` を持つ `Article` の内側ではコンテキストから読み取るため、サイトはデータを明示的に渡さずに描画できます。`props` を渡した場合は、常にコンテキストより優先されます。

詳しくは[Site コンポーネント](../../reference/plugin-api/ui-and-assets.ja.md#site-コンポーネント)と[UI の提供方法](../../plugins/writing-a-plugin.ja.md#ui-や出力を追加する方法)を参照してください。

## 操作できるUIを作る

クリックや状態管理など、ブラウザ側の処理が必要な UI は `app/islands/` に作ります。これは通常の HonoX の[[glossary/island|アイランド]]と同じです。作成したアイランドをルートやコンポーネントから import して利用します。Riebeckite 専用のアイランドの仕組みがあるわけではありません。

`app/client.ts` では、次の2つを初期化します。

```ts
createClient();
initRiebeckiteClient();
```

`createClient()` はサイトのクライアント処理を初期化します。`initRiebeckiteClient()` は、プラグインやテーマが提供するブラウザ側の処理を起動します。サイトのアイランドは `app/islands/`、プラグインのブラウザ側処理はプラグイン側というように、責務が分かれています。

## CSSを変更する

サイトのデザインは、`app/style.css` や各コンポーネントの CSS から変更できます。生成されるプリセットでは、サイトの CSS を `app/styles/` に分割し、`app/style.css` から読み込みます。通常の CSS や Tailwind を利用できます。

Riebeckite がプラグインやテーマから生成した CSS は、サイトの CSS から一度だけ読み込みます。

```css
/* app/style.css */
@import "./.riebeckite/framework-styles.css";
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";
```

`app/.riebeckite/` のファイルは自動生成されるため、直接編集しないでください。

プラグインの見た目を上書きするときは、各プラグインが文書化しているルートフック（通常は `rr-<feature>`、一部の組み込みプラグインは `rb-*`）、Riebeckite の UI プリミティブを調整するときは `rb-*` の CSS フックを利用できます。レイヤー外の通常のサイトルールは、詳細度にかかわらずフレームワーク・プラグイン・テーマの通常宣言を上書きします。低い優先順位を意図していない限り、上書きを名前付きレイヤーへ入れないでください。詳しくは[CSS フック](../../reference/plugin-api/ui-and-assets.ja.md#cssフック)を参照してください。
