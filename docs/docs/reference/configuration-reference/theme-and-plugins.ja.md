---
date: 2026-10-08
title: テーマとプラグイン
sidebar:
  label: テーマとプラグイン
  order: 20
---
# テーマとプラグイン

## theme

`theme` では、サイトの見た目を設定します。

設定方法は大きく2種類あります。

1. `ThemeOptions` を直接記述する
2. Theme パッケージが提供する関数を使う

`theme` を指定しなかった場合は、Riebeckite の既定 Theme が使われます。

### ThemeOptions を直接指定する

| 設定 | 型 | 既定値 | 用途 |
| --- | --- | --- | --- |
| `name` | `string` | `"riebeckite"` | Theme の識別名。`data-rb-theme` に設定される。 |
| `colorMode` | `"light"` \| `"dark"` \| `"system"` | `"system"` | 明るい表示・暗い表示・ OS 設定への追従を選ぶ。 |
| `typography` | `"system"` \| `"serif"` \| `"sans"` | `"system"` | 使用するフォントの種類を選ぶ。 |
| `layout` | `"article"` \| `"sidebar"` \| `"full-width"` | `"article"` | 記事ページのレイアウトを選ぶ。 |
| `tokens` | `semantic tokens` | `{}` | 色、フォント、幅などの共通デザイン値を変更する。 |
| `attributes` | ``Record<`data-${string}`, string \| undefined>`` | `{}` | 独自の `data-*` 属性を追加する。 |
| `stylesheets` | `string[]` | `[]` | 独自の CSS ファイルを追加する。 |

`colorMode: "system"` の場合は `data-rb-mode` を設定せず、OS の設定に従います。

`typography` の値は `data-rb-setting-typography` に、`layout` の値は `data-rb-layout` に設定されます。

`attributes` では独自の `data-*` 属性を追加できます。

ただし、Riebeckite が使用する次の属性は上書きできません。

- `data-rb-mode`
- `data-rb-theme`
- `data-rb-setting-typography`
- `data-rb-layout`

### theme.tokens

`tokens` では、サイト全体で使用する色、フォント、レイアウトなどの共通値を変更できます。

#### 色

| 設定 |
| --- |
| `paper` |
| `ink` |
| `muted` |
| `accent` |
| `border` |
| `borderStrong` |
| `surface` |
| `surfaceHover` |
| `overlay` |
| `danger` |
| `success` |
| `codeBackground` |

#### フォント

| 設定 |
| --- |
| `bodyFont` |
| `headingFont` |
| `monoFont` |

#### レイアウト

| 設定 |
| --- |
| `pageMaxWidth` |
| `articleMaxWidth` |
| `sidebarWidth` |
| `contentGap` |

これらの値は、それぞれ `--rb-*` 形式の CSS カスタムプロパティとして出力されます。

詳しい対応関係は [Design tokens](../theme-api.ja.md#デザイントークン) を参照してください。

`theme.tokens` は Theme の stylesheet より後に、layer に属さない `:root { --rb-* }` として出力されます。そのため、ここで設定した値は Light、明示 Dark、System Dark のいずれでも Theme の値を上書きします。Theme の CSS をコピーするのではなく、アクセントや surface はここで調整してください。

```ts
theme: {
  colorMode: "system",
  typography: "serif",
  layout: "sidebar",
  tokens: {
    color: {
      accent: "#c2410c",
    },
  },
  stylesheets: ["/app/custom.css"],
}
```

`stylesheets` には、ブラウザからアクセスできる CSS ファイルのパスを指定します。

指定した CSS は Theme の CSS より後に読み込まれるため、Theme のスタイルを上書きできます。

### Theme パッケージを使う

Theme パッケージを利用する場合は、Theme が提供する関数の結果を `theme` に指定します。

```ts
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  site: {
    title: "My site",
  },
  theme: rerurateTheme({
    colorMode: "system",
    motion: true,
  }),
});
```

Theme ごとに利用できる設定は異なります。

たとえば上の `motion` は `rerurateTheme` が提供する設定であり、Riebeckite Core 共通の設定ではありません。

各 Theme の設定については、その Theme のドキュメントを確認してください。

Theme の仕組みについては [Theme system](../theme-api.ja.md) を参照してください。

## plugins

`plugins` では、Riebeckite に追加する機能を指定します。

```ts
plugins: [
  obsidianMarkdown(),
  enableSearch && search(),
]
```

`false`、`null`、`undefined` は自動的に無視されます。

そのため、上のように条件によって[[glossary/plugin|プラグイン]]を有効・無効にできます。

有効なプラグインは `order` の値に従って実行順が決まります。

同じ `name` を持つプラグインを複数指定すると、設定エラーになります。

また、プラグインが必要とする機能を利用できるかどうかも確認されます。

プラグインが `validateOptions` を提供している場合は、設定を読み込むときにプラグイン固有の設定内容も検証されます。

各プラグインで利用できる設定については [Plugins](../../plugins/README.ja.md) を参照してください。

プラグインの仕組みについて詳しく知りたい場合は [Plugin system](../plugin-api.ja.md) を参照してください。
