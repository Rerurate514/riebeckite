# Theme authoring

Riebeckite Theme は presentation layer です。Theme は CSS と少量の metadata で見た目を変えますが、Feature logic、Component implementation、routes、client behavior、DOM structure は変更しません。

## 最小 Theme package

```ts
import { defineTheme } from "@riebeckite/core";

export function minimalTheme() {
  return defineTheme({
    name: "minimal",
    styles: [{ moduleSpecifier: "riebeckite-theme-minimal/theme.css" }],
  });
}
```

利用側は通常の config で Theme を渡します。

```ts
import { minimalTheme } from "riebeckite-theme-minimal";

export default defineConfig({
  theme: minimalTheme(),
});
```

## Customization contract

Theme 作者が利用してよい公開 contract は次の 4 つです。

1. `--rb-*` semantic tokens
2. stable CSS hooks
3. normal CSS cascade
4. Theme-specific options / `data-*` attributes

Theme 固有 option は Theme package 自身で解決します。Core に `density`、`flavor`、`headingStyle` のような Theme 専用概念を追加しません。

## Semantic tokens

`--rb-*` は Riebeckite 全体で共有する semantic Theme contract です。

```css
:root {
  --rb-color-paper: #fafafa;
  --rb-color-surface: #ffffff;
  --rb-color-surface-hover: #f0f0f0;
  --rb-color-ink: #202020;
  --rb-color-muted: #6b6b6b;
  --rb-color-accent: #555555;
  --rb-color-border: color-mix(in srgb, currentColor 18%, transparent);
  --rb-color-border-strong: color-mix(in srgb, currentColor 28%, transparent);
  --rb-color-danger: #b42318;
  --rb-color-success: #047857;
  --rb-color-code-background: #eeeeee;
  --rb-color-overlay: rgb(0 0 0 / 0.4);

  --rb-font-body: ui-sans-serif, system-ui, sans-serif;
  --rb-font-heading: var(--rb-font-body);
  --rb-font-mono: "SFMono-Regular", Consolas, monospace;

  --rb-space-1: 0.5rem;
  --rb-space-2: 1rem;
  --rb-space-3: 1.5rem;
  --rb-space-4: 2rem;
  --rb-space-6: 3rem;
  --rb-space-8: 4rem;
  --rb-rule-width: 1px;
  --rb-layout-page-max: 80rem;
  --rb-layout-article-max: 48rem;
  --rb-layout-sidebar: 14rem;
  --rb-layout-gap: 2rem;
}
```

Plugin 固有 token は Plugin が所有します。Theme は必要なら Plugin root hook に CSS を書けます。

```css
.rr-search {
  --rr-search-surface: var(--rb-color-paper);
  border-radius: 0;
}
```

## Stable CSS hooks

Stable hook は Theme から利用してよい主要な presentation hook です。すべての class が Theme API ではありません。

本体 / Article:

- `.rb-site`
- `.rb-article`
- `.rb-article-layout`
- `.rb-article-header`
- `.rb-article-body`
- `.rb-article-meta`

Plugin / Feature root:

- `.rr-search`
- `.rr-callout`
- `.rr-table-of-contents`
- `.rr-backlinks`
- `.rr-local-graph`
- 既存 Plugin root hooks: `.rr-code`, `.rr-code-tabs`, `.rr-lightbox`, `.rr-excalidraw` など

`__` を含む BEM element class や layout helper class は原則 internal です。Theme で使うことはできますが、stable contract とはみなしません。

## CSS cascade と読み込み順

CSS は次の順で読み込まれます。

1. base / app structural CSS
2. Plugin default CSS
3. Theme CSS
4. config の token inline style
5. `userCss`

そのため Theme CSS は Plugin default appearance を通常の cascade で上書きでき、利用者の `userCss` は Theme より後に適用されます。`!important` に依存しないでください。

## Theme-specific attributes

Theme package は CSS から参照するための任意の `data-*` attributes を宣言できます。

```ts
export function newspaperTheme(options = { density: "compact" }) {
  return defineTheme({
    name: "newspaper",
    attributes: {
      "data-newspaper-density": options.density,
    },
    styles: [{ moduleSpecifier: "riebeckite-theme-newspaper/theme.css" }],
  });
}
```

Theme API 経由で `class`、`style`、`id`、`lang` は変更できません。`data-theme`、`data-theme-name`、`data-typography`、`data-article-layout` も Riebeckite が所有します。

## Theme でやらないこと

Theme は Component replacement、JSX injection、route 追加、Plugin 追加/削除、client script 実行、DOM transformation、Island 登録を行いません。これらは Plugin / App 側の責務です。
