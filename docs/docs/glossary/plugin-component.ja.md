---
date: 2026-10-16
title: プラグインコンポーネント（Plugin UI component）
sidebar:
  hidden: true
---

# プラグインコンポーネント（Plugin UI component）

プラグインは、サーバー描画のHono JSXコンポーネントとデータヘルパー、さらにCSSと任意のクライアントランタイムを公開します。どこに描画するかはサイトが決めます。データヘルパーは、不変のモデルを返す狭くサーバー安全なクエリです。コンポーネントは型付きpropsを受け取り、描画済みのJSXを返します。サイトは自分のTSXでコンポーネントを組み立て、それぞれを描画するか、どこに、何回描画するかを選びます。

各データヘルパーは `PublicContentView`（または同様のフィルタ済みファサード）を受け取り、型付きモデルを返します。コンポーネントはサイトの記事レイアウトやページテンプレートから直接描画されます。これにより、配置、順序、条件付き描画はサイトが制御し、モデル、内部実装、アセット、クライアントエントリの登録はプラグインが所有します。

**プラグインが公開する典型的な形：**

- **データヘルパーとコンポーネント** — 各プラグインがヘルパー（クエリ）とコンポーネントを公開し、サイトがそれらを組み立てます。
- **描画はサイトが所有** — 配置、順序、描画するかどうかはサイトが決めます。
- **任意のCSSとクライアントランタイム** — プラグインは通常どおり `./style.css` と `./client` を公開でき、インテグレーションを通じて登録されます。
- **コンテキストを読むコンポーネント** — サイトが周囲のコンテキストを用意している場合、コンポーネントが現在のサイトや記事のデータを自分で解決できます。

```ts
// index.ts
import { definePlugin } from "@riebeckite/core";
import { Properties, getProperties } from "./components/properties";

export function examplePlugin() {
  return definePlugin({ name: "example" });
}

export { Properties, getProperties };
```

または、より一般的には、プラグインがコンポーネントとヘルパーを `./components/` の下に置くこともできます。

```text
packages/plugins/example/
├─ index.ts
├─ components/
│  └─ properties.tsx   // exports <Properties /> and getProperties
├─ style.css
└─ client.ts
```

サイト側はこれをインポートして描画します。

```tsx
import { getProperties } from "@riebeckite/plugin-properties";
import { Properties } from "@riebeckite/plugin-properties/components";

const data = getProperties({ view, frontmatter: entry.frontmatter });
<Properties data={data} />
```
