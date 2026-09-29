# はじめてのテーマ作成

テーマはサイトの「見た目」（配色・文字組み・レイアウト）を変える仕組みです。**機能は足せません**。機能を足したいときは [はじめてのプラグイン作成](./plugin-tutorial.md) を参照してください。

まず「組み込みテーマを調整する」→「自分で作る」の順で進めます。

## 1. 組み込みテーマを調整する（最短）

見た目をベースに少しだけ変えたいなら、`defaultTheme()` にオプションと CSS を渡すだけで済みます。

```ts
// riebeckite.config.ts
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  theme: defaultTheme({
    colorMode: "light",      // "light" | "dark" | "system"
    typography: "system",    // "system" | "serif" | "sans"
    userCss: ["/extensions/custom.css"], // 最後に読み込まれる上書き CSS
  }),
  // ...
});
```

## 2. 最小のテーマを作る

独自テーマは `defineTheme`（`@riebeckite/core` から import）で作ります。**パッケージにする必要はなく、サイトの中に置けます**。

```ts
// extensions/local-theme.ts
import { defineTheme } from "@riebeckite/core";

export function localTheme() {
  return defineTheme({
    name: "local",
    styles: [{ moduleSpecifier: "/extensions/theme.css" }],
  });
}
```

`riebeckite.config.ts` で `theme` に渡します。

```ts
// riebeckite.config.ts
import { localTheme } from "./extensions/local-theme";

export default defineConfig({
  theme: localTheme(),
  // ...
});
```

- `name` はテーマの識別子です。
- `styles` はテーマの stylesheet を宣言します。site 内テーマでは `/extensions/theme.css` のように、host bundler が解決できるパスを指定します。

## 3. CSS を書く

色をハードコードせず、**セマンティック token（`--rb-*`）と安定したフック（`rb-*` / `rr-<feature>`）** を使います。こうするとテーマを差し替えやすくなります。

```css
/* 例: 背景と文字色、記事幅を調整 */
.rb-site {
  background: var(--rb-color-paper);
  color: var(--rb-color-ink);
}

.rb-article {
  max-width: var(--rb-layout-article-max);
}
```

カラーモード対応は次の 3 つの状態で書きます。

```css
:root { /* ライト */ }
:root[data-theme="dark"] { /* ダーク */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) { /* OS に追従（system） */ }
}
```

CSS の読み込み順は決まっており、テーマ CSS は `userCss` より前に来ます（`userCss` が最上位）。token の一覧、フックの一覧、順序の詳細は [Theme System](./theme-system.md) を参照してください。

## 4. 配布用パッケージにする（任意）

サイト内で動けば、配布用にもできます。雛形は `packages/themes/minimal` です。

```text
packages/themes/minimal/
├─ src/index.ts      ← defineTheme を呼ぶ factory
├─ styles/theme.css  ← テーマの stylesheet
├─ package.json      ← ./style.css を exports で公開
├─ README_ja.md
└─ README.md
```

- 外部配布のテーマは `@riebeckite/core` だけに依存し、stylesheet を `./style.css` の export として公開します。monorepo 内の path を参照しないでください。
- テーマ独自オプションはテーマ側で解決し、Core に増やさないのが原則です。

## 5. 検証する

```sh
npx riebeckite check          # 設定と Plugin の解決を検証
npx riebeckite inspect config # 解決済みのテーマを確認
npx riebeckite dev            # ローカルで見た目を確認
npx riebeckite build          # 生成物を確認
```

`check` / `doctor` / `inspect` は読み取り専用です。エラーが出たら診断の指示に従って直してください。

## 関連資料

- [テーマ作成の詳細](./theme-in-depth.md) — この入門の詳細編（option・token・hook・cascade・配布）
- [Theme System](./theme-system.md) — theme contract、token、hook、cascade の詳細
- [Plugin System](./plugin-system.md) — テーマとの境界（機能は Plugin）
- [Framework Reference](./framework-reference.md) — `defineTheme` などの公開 API