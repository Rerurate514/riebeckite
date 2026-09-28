# Theme System

Riebeckite Theme は **presentation layer** です。Theme はサイトや Plugin
の機能を差し替える仕組みではなく、共通の design contract
を通じて見た目を変更します。

## styling の前に scope を決める

Theme が変更できるのは token、stylesheet rule、theme 固有の `data-*` attribute です。content の意味や application structure は変更できません。interactive behavior は Plugin/application に、visual adjustment は Theme に置きます。この分離により route、manifest、graph、client behavior を変えずに Theme を交換できます。

## 最小 Theme

``` ts
import { defineTheme } from "@riebeckite/core";

export function minimalTheme() {
  return defineTheme({
    name: "minimal",
    styles: [
      { moduleSpecifier: "@riebeckite/theme-minimal/style.css" },
    ],
  });
}
```

利用側:

``` ts
export default defineConfig({
  theme: minimalTheme(),
});
```

## Theme contract

Theme が扱える主要な contract:

  -----------------------------------------------------------------------
  領域                                内容
  ----------------------------------- -----------------------------------
  Identity                            `name`

  Factory options                     `options`

  Styles                              `styles[].moduleSpecifier`

  Common config                       `colorMode`, `typography`,
                                      `articleLayout`, `tokens`,
                                      `userCss`

  Attributes                          safe な `data-*` attributes
  -----------------------------------------------------------------------

## Color Mode

``` ts
type ThemeColorMode = "light" | "dark" | "system";
```

`system` は OS preference に追従できるモードです。Theme は `data-theme`
と semantic token を利用し、個別 component に色を hardcode
することを避けます。

## Typography

``` ts
type ThemeTypographyPreset = "system" | "serif" | "sans";
```

Typography preset は body/heading 等の semantic font token
に反映します。

## Article Layout

``` ts
type ThemeArticleLayoutPreset =
  | "article"
  | "sidebar"
  | "full-width";
```

Theme は layout preset の presentation を定義できますが、route や
component tree 自体を差し替えません。

## Design Tokens

Core の `ThemeDesignTokens` は次の semantic group を持ちます。

### Color

-   `paper`
-   `ink`
-   `muted`
-   `accent`
-   `border`
-   `borderStrong`
-   `surface`
-   `surfaceHover`
-   `overlay`
-   `danger`
-   `success`
-   `codeBackground`

### Typography

-   `bodyFont`
-   `headingFont`
-   `monoFont`

### Layout

-   `pageMaxWidth`
-   `articleMaxWidth`
-   `sidebarWidth`
-   `contentGap`

Theme stylesheet ではこれらを `--rb-*` semantic CSS custom properties
として扱います。

``` css
:root {
  --rb-color-paper: #fafafa;
  --rb-color-ink: #202020;
  --rb-color-accent: #555;
  --rb-font-body: system-ui, sans-serif;
  --rb-layout-article-max: 48rem;
}
```

## Semantic token を使う理由

Component や Plugin が特定 Theme の色名を直接参照すると、Theme
の差し替えができなくなります。

``` css
/* good */
.rr-example {
  color: var(--rb-color-ink);
  background: var(--rb-color-surface);
}

/* avoid */
.rr-example {
  color: #171717;
  background: #f6efe2;
}
```

Plugin 固有の意味を持つ token は Plugin が所有し、fallback として
`--rb-*` を利用できます。

## Styles

Theme stylesheet は host bundler が解決する module specifier
として宣言します。

``` ts
styles: [
  { moduleSpecifier: "@riebeckite/theme-example/style.css" },
]
```

filesystem path を application へコピーする contract ではありません。

### Site 内 Theme

Theme も Site 内に置けます。既存 Theme を合成するか `defineTheme`
で直接定義し、`theme` へ指定します。

``` ts
// site/extensions/local-theme.ts
return defineTheme({
  name: "site-local",
  styles: [
    { moduleSpecifier: "/extensions/theme.css" },
  ],
  attributes: { "data-site-local": "on" },
});
```

site 内 Theme の `name`、`styles`、`attributes`、`tokens` は published Theme と
同じ `resolveThemeConfig` 経路で解決・sanitize・適用されます。

## Attributes

Theme 固有 option を CSS に渡す場合は safe な `data-*` attribute
を利用できます。

``` ts
return defineTheme({
  name: "newspaper",
  attributes: {
    "data-newspaper-density": "compact",
  },
});
```

Theme API から `class`, `style`, `id`, `lang`
を任意変更する設計にはしません。Framework が所有する attribute と Theme
固有 attribute の namespace を分けます。

## Theme factory options

Theme 独自 option は Theme package 内で解決します。

``` ts
type NewspaperOptions = {
  density?: "compact" | "comfortable";
};

export function newspaperTheme(options: NewspaperOptions = {}) {
  return defineTheme({
    name: "newspaper",
    options,
    attributes: {
      "data-newspaper-density": options.density ?? "comfortable",
    },
    styles: [
      { moduleSpecifier: "@riebeckite/theme-newspaper/style.css" },
    ],
  });
}
```

Theme 固有概念を Core の `ThemeConfig` に増やさないことが重要です。

## Stable CSS hooks

Theme は内部 markup ではなく、文書化された stable hook を対象にします。Riebeckite では class を 2 つの namespace に分けます。

-   `rb-*` — framework が提供する構造 hook と semantic design token。構造 hook は `.rb-site`、`.rb-article`、`.rb-article-layout`、`.rb-article-header`、`.rb-article-body`、`.rb-article-meta`、`.rb-article-footer`、`.rb-sidebar` です。
-   `rr-<feature>` — Plugin / feature が描画する最外要素に付く root hook。例として `.rr-search`、`.rr-callout`、`.rr-table-of-contents`、`.rr-backlinks`、`.rr-local-graph`、`.rr-code`、`.rr-code-tabs`、`.rr-lightbox`、`.rr-excalidraw`、`.rr-mermaid`、`.rr-query`、`.rr-cardlink`、`.rr-diff-history`、`.rr-attachment`、`.rr-media`、`.rr-recent-posts`、`.rr-garden-explorer` があります。

Theme が style してよいのはこの root hook と、Plugin が文書化した子孫 class です。BEM の element (`__...`) と modifier (`--...`) は原則 internal、`.sr-only` のような汎用 helper class は Plugin hook ではありません。Plugin は後方互換のため従来 class も残すので、同じ要素に `.rr-<feature>` と旧 class が並ぶことがあります。Theme は `rr-*` を対象にしてください。

Plugin 固有の意味を持つ token は `--rr-*` として Plugin が所有し、fallback として `--rb-*` を利用できます。Plugin 側の規約は [Plugin System](./plugin-system.md#css-hooks) を参照してください。

## CSS cascade

読み込み順は presentation extension の重要な contract です。

``` text
base / app structural CSS
→ Plugin default CSS
→ Theme CSS
→ config token inline style
→ userCss
```

この順序は偶発的なものではなく保証された contract です。`@riebeckite/honox` が `.riebeckite/plugin-styles.css`（resolved plugin order の Plugin style）と `.riebeckite/theme-styles.css`（Theme style）を生成します。Site は plugin stylesheet を theme stylesheet より先に import するため、Theme CSS は常に Plugin default を上書きし、利用者の `userCss` が最終 override になります。この import 順を入れ替えたり、生成ファイルを直接編集したりしないでください。各生成ファイルの先頭コメントにも cascade 上の位置を記載しています。通常は `!important` に依存しません。

## Theme と Plugin

Theme: - 見た目 - semantic token - stable hook への CSS - presentation
attribute

Plugin: - content transformation - renderer - client behavior -
endpoint - diagnostics - SEO extension

「見た目を変えるためだけ」に Plugin を作らず、「機能を追加するため」に
Theme を拡張しません。

## Theme がしてはいけないこと

Theme は次を行いません。

-   Component replacement
-   JSX injection
-   route 追加
-   Plugin の追加/削除
-   client script execution
-   DOM transformation
-   Island 登録
-   filesystem access
-   ContentManager access

## Theme package の例

``` text
packages/themes/example/
├─ index.ts
├─ package.json
├─ style.css
├─ README_ja.md
└─ README_en.md
```

## この repository 外で Theme を配布する

外部 Theme package は `@riebeckite/core` だけに依存し、`defineTheme` を使って
stylesheet を `./style.css` export として公開します。monorepo 内の path を参照
しないでください。対応する package surface と現時点の制約は
[Public package と import path](./framework-reference.md#public-package-と-import-path)
を参照してください。

## Theme の差し替え可能性

Theme が共通 contract に従うことで、application logic を変えずに Theme
を交換できます。Theme-specific option はその Theme
を選んだ場合だけ意味を持ち、Core や他 Theme へ漏らしません。

## 関連

-   [Architecture](./architecture.md)
-   [Plugin System](./plugin-system.md)
-   [Configuration](./configuration.md)
-   [Framework Reference](./framework-reference.md)
