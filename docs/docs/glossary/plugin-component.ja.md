---
title: プラグイン UI コンポーネント
sidebar:
  hidden: true
---

# プラグイン UI コンポーネント

Plugin は server-rendered Hono JSX コンポーネントとデータヘルパーを公開し、CSS と選択的な client runtime を提供します。Site はどこで描画するかを決めます。データヘルパーは狭いサーバー安全な query で不変 model を返します。コンポーネントは型付き props を受け取り、描画済み JSX を返します。Site は自分の TSX でこれらのコンポーネントを組み立て、それぞれの表示有無、位置、頻度を自ら決定します。

各 Plugin のデータヘルパーは `PublicContentView`（または同様のフィルタされたファサード）を受け取り、型付き model を返します。その後 Site が記事レイアウトやページテンプレートで直接コンポーネントを描画します。これにより Site は配置、順序、コンディショナルレンダリングを制御できます。一方、Plugin は model、内部実装、asset、client-entry 登録の所有権を保持します。

**典型的な Plugin エクスポート形態：**

- **データヘルパー + コンポーネント**：各 Plugin は helper（query）と component を公開し、Site がそれらを組み立てます。
- **Site が描画を所有**：Site は配置、順序、表示するかどうかを決定します。
- **選択的な CSS と client runtime**：Plugin は通常どおり `./style.css` と `./client` を export します。これらは integration を通じて登録されます。
- **context を読むコンポーネント**：Site が周囲の context を用意している場合、コンポーネントが現在の site や article のデータを自分で解決できます。

```ts
// index.ts
import { definePlugin } from "@riebeckite/core";
import { Properties, getProperties } from "./components/properties";

export function examplePlugin() {
  return definePlugin({ name: "example" });
}

export { Properties, getProperties };
```

あるいはより規則的な形で、Plugin は `./components/` の下に置くことができます：

```text
packages/plugins/example/
├─ index.ts
├─ components/
│  └─ properties.tsx   // <Properties /> と getProperties を export
├─ style.css
└─ client.ts
```

Site はその後 import して描画します：

```tsx
import { getProperties } from "@riebeckite/plugin-properties";
import { Properties } from "@riebeckite/plugin-properties/components";

const data = getProperties({ view, frontmatter: entry.frontmatter });
<Properties data={data} />
```
