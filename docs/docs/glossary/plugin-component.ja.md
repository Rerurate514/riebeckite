---
title: プラグイン UI コンポーネント
sidebar:
  hidden: true
---

# プラグイン UI コンポーネント

Plugin は server-rendered Hono JSX コンポーネントとデータヘルパーを公開し、CSS と選択的な client runtime を提供します。Site はどこで描画するかを決めます。以前の body-slot システムはこのパターンの代わりに削除されました：UI を貢献する各 Plugin はデータヘルパー（狭いサーバー安全な query が不変 model を返す）と、model または narrowed props を受け入れる JSX コンポーネントを公開します。Site は自分の TSX でこれらのコンポーネントを組み立て、それぞれの表示有無、位置、順序を自ら決定します。

削除された slot システムとは違い、manifest entry には累積された `bodySlots` map がありません。代わりに、各 Plugin のデータヘルパーは `PublicContentView`（または同様のフィルタされたファサード）を受け取り、型付き model を返します。その後 Site が記事レイアウトやページテンプレートで直接コンポーネントを描画します。これにより Site は配置、順序、コンディショナルレンダリングの全てを制御できつつ、Plugin は model、component インテリジャ、asset、client-entry registration の所有権を保持します。

**削除された body-slot システムとの主な違い：**

- **`ContentManifestEntry` に `bodySlots` フィールドなし** — Plugin は共有 slot map に HTML フラグメントを貢献しません。
- **データヘルパー + コンポーネント** — 各 Plugin は helper（query）と component を公開します；Site はそれらを組み立てます。
- **Site が描画を所有** — Site は配置、順序、表示するかどうかを決定します。
- **選択的な CSS と client runtime** — Plugin は usual に `./style.css` と `./client` を export します、integration を通じて登録されます。
- **`ContentSlot` primitive の削除** — `@riebeckite/honox/ui` から `ContentSlot` component と `hasSlot` ユーティリティは完全に削除されました。

**典型的な Plugin エクスポート形態：**

```ts
// index.ts
export function examplePlugin() {
  return definePlugin({
    name: "example",
    // ... factory hooks, assets, clientEntries, etc.
    // UI 用のデータヘルパーとコンポーネントをエクスポート
    dataHelper: getProperties,
    component: <Properties />,
  });
}
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

`bodySlots`/`ContentSlot`/`hasSlot` API は完全に削除されました。すべての UI は Site TSX 内で明示的に composition されます。