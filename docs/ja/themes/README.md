# Themes

Theme は、Riebeckite サイトの見た目を変える仕組みです。色、文字、余白、レイアウト、記事の表示を調整します。Markdown 記法、検索、図表などの機能を追加したい場合は [Plugin](../plugins/README.md) を使います。

## Theme をインストールする

生成されたサイトには、通常すでに Theme が入っています。`minimal` preset は `@riebeckite/theme-minimal`、`starter` と `showcase` は `@riebeckite/theme-default` を使います。

別の Theme を追加する場合は、package をインストールします。

```bash
npm install @riebeckite/theme-minimal
```

## Theme を設定する

Theme の factory を import し、`riebeckite.config.ts` の `theme` に指定します。

```ts
import { defineConfig } from "@riebeckite/core";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  theme: minimalTheme(),
});
```

Theme によっては option を指定できます。

```ts
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  theme: defaultTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    userCss: ["/extensions/custom.css"],
  }),
});
```

`userCss` は、サイト固有の小さな調整に向いています。再利用できる見た目として整理したい場合は、Theme として作る方が向いています。

## 公式 Theme

| Theme | Package | Factory | 特徴 |
| --- | --- | --- | --- |
| [Default](./default.md) | [`@riebeckite/theme-default`](../../../packages/themes/default/README.md) | `defaultTheme()` | 標準の出発点。読みやすく、設定しやすく、カラーモードにも対応 |
| [Minimal](./minimal.md) | [`@riebeckite/theme-minimal`](../../../packages/themes/minimal/README.md) | `minimalTheme()` | 装飾を抑えた小さな Theme |
| [Gruvbox](./gruvbox.md) | [`@riebeckite/theme-gruvbox`](../../../packages/themes/gruvbox/README.md) | `gruvboxTheme()` | Gruvbox 風の暖かい高コントラスト配色 |
| [Rerurate](./rerurate.md) | [`@riebeckite/theme-rerurate`](../../../packages/themes/rerurate/README.md) | `rerurateTheme()` | Rerurate の視覚文法に基づく Theme |
| [Sakura](./sakura.md) | [`@riebeckite/theme-sakura`](../../../packages/themes/sakura/README.md) | `sakuraTheme()` | 桜をモチーフにした配色 |
| [Tokyo Night](./tokyonight.md) | [`@riebeckite/theme-tokyonight`](../../../packages/themes/tokyonight/README.md) | `tokyonightTheme()` | Tokyo Night 風の暗色・エディタ風 Theme |

各 Theme の export 名と option は、package README が正本です。

## Theme を作りたい場合

まず [Writing a Theme](./writing-a-theme.md) を読んでください。正確な contract は [Theme API](../reference/theme-api.md)、詳しい設計は [Framework / Theme system](../framework/theme-system.md) にあります。

## 次に読むページ

- [Writing a Theme](./writing-a-theme.md)
- [Theme API](../reference/theme-api.md)
