# はじめてのテーマ作成

テーマはサイトの「見た目」（配色・文字組み・レイアウト）を変える仕組みです。**機能は足せません**。機能を足したいときは [はじめてのプラグイン作成](../plugins/writing-a-plugin.md) を参照してください。Theme は未知の Page Type にも対応できるよう、route や Page Type ID の一覧ではなく、stable hook と semantic token を対象にします。

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

色をハードコードせず、**セマンティック token（`--rb-*`）と安定したフック（`rb-*` / `rr-<feature>`）** を使い、すべてのルールを theme root selector に限定します。`<name>` はテーマの identity name に置き換えてください（ここではテーマ名 `local`）。

```css
/* 例: 背景と文字色、記事幅を調整 */
:is(:root, .rb-theme-root)[data-theme-name="local"] .rb-site {
  background: var(--rb-color-paper);
  color: var(--rb-color-ink);
}

:is(:root, .rb-theme-root)[data-theme-name="local"] .rb-article {
  max-width: var(--rb-layout-article-max);
}
```

theme root selector `:is(:root, .rb-theme-root)[data-theme-name="<name>"]` は、実サイトでは document root（app が `<html>` に `data-theme-name` を付ける）に一致し、preview では `class="rb-theme-root" data-theme-name="<name>"` を持つ任意のコンテナに一致します。

Theme を作るときは、文字やリンクの見やすさ、キーボード操作中の表示、Light/Dark モードでの読みやすさなどにも注意してください。
詳しいポイントは、[アクセシビリティ](../accessibility.md) を参照してください。

カラーモード対応は次の 3 つの状態で書きます。

```css
:is(:root, .rb-theme-root)[data-theme-name="local"] { /* ライト */ }
:is(:root, .rb-theme-root)[data-theme-name="local"][data-theme="dark"] { /* ダーク */ }
@media (prefers-color-scheme: dark) {
  :is(:root, .rb-theme-root)[data-theme-name="local"]:not([data-theme]) { /* OS に追従（system） */ }
}
```

CSS の読み込み順は決まっており、テーマ CSS は `userCss` より前に来ます（`userCss` が最上位）。token の一覧、フックの一覧、順序の詳細は [Theme System](../reference/theme-api.md) を参照してください。

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
npm exec riebeckite check             # 設定と Plugin の解決を検証
npm exec riebeckite inspect config# 解決済みのテーマを確認
npm exec riebeckite dev               # ローカルで見た目を確認
npm exec riebeckite build             # 生成物を確認
```

`check` / `doctor` / `inspect` は読み取り専用です。エラーが出たら診断の指示に従って直してください。

## 関連資料

- [テーマ作成の詳細](../framework/theme-system.md) — この入門の詳細編（option・token・hook・cascade・配布）
- [Theme System](../reference/theme-api.md) — theme contract、token、hook、cascade の詳細
- [Plugin System](../reference/plugin-api.md) — テーマとの境界（機能は Plugin）
- [Framework Reference](../reference/README.md) — `defineTheme` などの公開 API
