# テーマ作成の詳細

[はじめてのテーマ作成](./theme-tutorial.md) は、テーマを動かすまでの流れを短く説明したドキュメントです。このページはその「詳細編」で、テーマを作るときに参照する全項目（option、token、フック、CSS cascade、package 化）をまとめています。

はじめての人はまず [theme-tutorial](./theme-tutorial.md) を読み、このページは「もっと詳しく知りたい」ときに使ってください。contract の概念的な説明は [Theme System](./theme-system.md) にあります。

## 1. Theme ができること・できないこと

Theme は **presentation layer** です。token、stylesheet rule、theme 固有の `data-*` attribute だけを変更できます。content の意味や application structure は変更できません。

| できる | できない |
| --- | --- |
| token の上書き・追加 | Component replacement |
| stylesheet rule の定義 | JSX の注入 |
| theme 固有 `data-*` attribute | route の追加 |
| color mode / typography / layout preset の宣言 | Plugin の追加・削除 |
| `userCss` による最終上書き | client script の実行 |
| stable hook への CSS | DOM 変換・Island 登録・filesystem アクセス・ContentManager アクセス |

「見た目を変えるだけ」の目的で Plugin を作るのではなく、「機能を足す」目的で Theme を拡張しないのが原則です。機能は Plugin、素の見た目は Theme、サイト固有の route は App に置きます。

## 2. defineTheme の contract

`defineTheme` は `@riebeckite/core` から import します。Theme が扱う主要 contract は次の 5 つです。

| 領域 | 内容 |
| --- | --- |
| Identity | `name` |
| Factory options | `options` |
| Styles | `styles[].moduleSpecifier` |
| Common config | `colorMode`、`typography`、`articleLayout`、`tokens`、`userCss` |
| Attributes | safe な `data-*` attribute |

```ts
import { defineTheme } from "@riebeckite/core";

export function exampleTheme() {
  return defineTheme({
    name: "example",
    options: { /* theme 独自 option */ },
    styles: [
      { moduleSpecifier: "@riebeckite/theme-example/style.css" },
    ],
    attributes: { "data-example-flag": "on" },
  });
}
```

`styles[].moduleSpecifier` は host bundler が解決する module specifier です。filesystem path を application へコピーする contract ではありません。

### 2-1. Site 内 Theme

Theme は publish されていなくても動きます。既存 Theme を合成するか、`defineTheme` で直接定義して `theme` へ渡します。

```ts
// site/extensions/local-theme.ts
import { defineTheme } from "@riebeckite/core";

export function localTheme() {
  return defineTheme({
    name: "site-local",
    styles: [
      { moduleSpecifier: "/extensions/theme.css" },
    ],
    attributes: { "data-site-local": "on" },
  });
}
```

site 内 Theme の `name`、`styles`、`attributes`、`tokens` は published Theme と同じ `resolveThemeConfig` 経路で解決・sanitize・適用されます。

## 3. Common config の各項目

### 3-1. colorMode

```ts
type ThemeColorMode = "light" | "dark" | "system";
```

`"system"` は OS の設定に追従できるモードです。Theme は `data-theme` attribute と semantic token を利用し、個別 component に色をハードコードしないようにします。

実行時の配色は次の 3 つの CSS 状態で決まります。

```css
:root { /* ライト */ }
:root[data-theme="dark"] { /* ダーク */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) { /* OS に追従（system） */ }
}
```

サーバーは Theme の `colorMode` が `"system"` 以外のときは `<html>` に `data-theme` を出力します。`"system"` のときは属性を省略します（media query が配色を決めます）。

**実行時切り替えの契約**: `document.documentElement.dataset.theme` に `"light"` か `"dark"` を設定するか、`"system"` なら**属性を削除**します。空文字の `data-theme=""` を設定しないでください。空の属性も `[data-theme]` セレクタに一致してしまい、media query が機能しなくなります。

`@riebeckite/plugin-color-mode` がこの契約の参照実装です（[README](../../packages/plugins/color-mode/README_ja.md)）。描画前のインラインスクリプト `ColorModeScript`、切替コントロール `ColorModeToggle`、`localStorage` に選択を保存する client entry `initColorMode` で構成されます。

### 3-2. typography

```ts
type ThemeTypographyPreset = "system" | "serif" | "sans";
```

preset は body / heading などの semantic font token に反映されます。

### 3-3. articleLayout

```ts
type ThemeArticleLayoutPreset = "article" | "sidebar" | "full-width";
```

Theme は layout preset の presentation を定義できますが、route や component tree 自体は差し替えません。

### 3-4. tokens

Core の `ThemeDesignTokens` は次の semantic group を持ちます。stylesheet では `--rb-*` semantic CSS custom properties として扱います。

**Color:**

| token | CSS 変数 |
| --- | --- |
| `paper` | `--rb-color-paper` |
| `ink` | `--rb-color-ink` |
| `muted` | `--rb-color-muted` |
| `accent` | `--rb-color-accent` |
| `border` | `--rb-color-border` |
| `borderStrong` | `--rb-color-border-strong` |
| `surface` | `--rb-color-surface` |
| `surfaceHover` | `--rb-color-surface-hover` |
| `overlay` | `--rb-color-overlay` |
| `danger` | `--rb-color-danger` |
| `success` | `--rb-color-success` |
| `codeBackground` | `--rb-color-code-background` |

**Typography:**

| token | CSS 変数 |
| --- | --- |
| `bodyFont` | `--rb-font-body` |
| `headingFont` | `--rb-font-heading` |
| `monoFont` | `--rb-font-mono` |

**Layout:**

| token | CSS 変数 |
| --- | --- |
| `pageMaxWidth` | `--rb-layout-page-max` |
| `articleMaxWidth` | `--rb-layout-article-max` |
| `sidebarWidth` | `--rb-layout-sidebar-width` |
| `contentGap` | `--rb-layout-content-gap` |

```css
:root {
  --rb-color-paper: #fafafa;
  --rb-color-ink: #202020;
  --rb-color-accent: #555;
  --rb-font-body: system-ui, sans-serif;
  --rb-layout-article-max: 48rem;
}
```

CSS 変数名の `-strong`、`-hover`、`-code-background` などの接尾辞は、token 名（`borderStrong` 等）を kebab-case にしたものです。token の入力名と CSS 変数名が異なる点に注意してください。

**Semantic token を使う理由**: Component や Plugin が特定 Theme の色名を直接参照すると、Theme の差し替えができなくなります。

```css
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

Plugin 固有の意味を持つ token は Plugin が `--rr-*` として所有し、fallback として `--rb-*` を利用できます。

### 3-5. userCss

`userCss` は cascaade の最上位（最後）に読み込まれる上書き CSS です。site 側が「このテーマを使いながら、ここだけ直したい」ときに使います。Theme の stylesheet は `userCss` より先に読み込まれるため、`userCss` が最終結果になります。

```ts
theme: defaultTheme({
  userCss: ["/extensions/custom.css"],
}),
```

## 4. Color mode と Attributes の詳細

上記 3-1 の契約に加えて、theme 固有 option を CSS に渡したい場合は safe な `data-*` attribute を利用します。

```ts
return defineTheme({
  name: "newspaper",
  attributes: {
    "data-newspaper-density": "compact",
  },
});
```

Theme API が `class`、`style`、`id`、`lang` を任意変更する設計にはしません。Framework が所有する attribute と Theme 固有 attribute の namespace を分けます。

## 5. Stable CSS hooks

Theme は内部 markup ではなく、文書化された stable hook を対象にします。class は 2 つの namespace に分かれています。

- **`rb-*`** — framework が提供する構造 hook と semantic design token。構造 hook は `.rb-site`、`.rb-article`、`.rb-article-layout`、`.rb-article-header`、`.rb-article-body`、`.rb-article-meta`、`.rb-article-footer`、`.rb-sidebar` です。
- **`rr-<feature>`** — Plugin / feature が描画する最外要素に付く root hook。例: `.rr-search`、`.rr-callout`、`.rr-table-of-contents`、`.rr-backlinks`、`.rr-local-graph`、`.rr-code`、`.rr-code-tabs`、`.rr-lightbox`、`.rr-excalidraw`、`.rr-mermaid`、`.rr-query`、`.rr-cardlink`、`.rr-diff-history`、`.rr-attachment`、`.rr-media`、`.rr-recent-posts`、`.rr-garden-explorer`。

Theme が style してよいのは、この root hook と、Plugin が文書化した子孫 class だけです。BEM の element（`__…`）と modifier（`--…`）は原則 internal な実装詳細です。`.sr-only` のような汎用 helper class は Plugin hook ではありません。Plugin は後方互換のため従来 class も残すので、同じ要素に `.rr-<feature>` と旧 class が並ぶことがあります。Theme は `rr-*` を対象にしてください。

## 6. CSS cascade

読み込み順は presentation extension の重要な contract です。

```text
base / app structural CSS
→ Plugin default CSS
→ Theme CSS
→ config token inline style
→ userCss
```

この順序は偶発的なものではなく保証された contract です。`@riebeckite/honox` が `.riebeckite/plugin-styles.css`（resolved plugin order の Plugin style）と `.riebeckite/theme-styles.css`（Theme style）を生成します。Site は plugin stylesheet を theme stylesheet より先に import するため、Theme CSS は常に Plugin default を上書きし、利用者の `userCss` が最終 override になります。

この import 順を入れ替えたり、生成ファイルを直接編集したりしないでください。各生成ファイルの先頭コメントにも cascade 上の位置が記載されています。通常は `!important` に依存しません。

## 7. Theme factory options

Theme 独自 option は Theme package 内で解決します。Core の `ThemeConfig` に増やさないことが重要です。

```ts
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

Theme-specific option はその Theme を選んだ場合だけ意味を持ち、Core や他 Theme へ漏らしません。

## 8. 配布用パッケージにする

雛形は `packages/themes/minimal` です。構成:

```text
packages/themes/minimal/
├─ src/index.ts      ← defineTheme を呼ぶ factory
├─ styles/theme.css  ← テーマの stylesheet
├─ package.json      ← ./style.css を exports で公開
├─ README_ja.md
└─ README.md
```

外部配布の Theme package は `@riebeckite/core` だけに依存し、stylesheet を `./style.css` の export として公開します。monorepo 内の path は参照しないでください。対応する package surface と現時点の制約は [Framework Reference](./framework-reference.md) の「Public package と import path」を参照してください。

## 9. 検証する

```sh
npx riebeckite check          # 設定と Plugin の解決を検証
npx riebeckite inspect config # 解決済みのテーマを確認
npx riebeckite dev            # ローカルで見た目を確認
npx riebeckite build          # 生成物を確認
```

`check` / `doctor` / `inspect` は読み取り専用です。Theme を交換しても route、manifest、graph、client behavior は変わりません。意図した見た目にならない場合、まず cascade の順序（`userCss` が最後）と、`rr-*` / `rb-*` のどちらを狙っているかを確認してください。

## 関連資料

- [はじめてのテーマ作成](./theme-tutorial.md) — 流れに沿った入門
- [Theme System](./theme-system.md) — contract の概念的な説明
- [Plugin System](./plugin-system.md) — テーマとの境界（機能は Plugin）
- [Framework Reference](./framework-reference.md) — `defineTheme` などの公開 API