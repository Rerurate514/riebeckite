# Themes

Theme はサイトの見た目を変えます。検索や Markdown 構文のような機能は Plugin の責務です。

## 使う

```bash
npm install @riebeckite/theme-minimal
```

```ts
import { minimalTheme } from "@riebeckite/theme-minimal"

export default defineConfig({
  theme: minimalTheme(),
})
```

## 公式 Theme

| Theme | Factory | 特徴 |
| --- | --- | --- |
| [default](../../../packages/themes/default/README.md) | `defaultTheme` | 標準の編集・読書向け theme |
| [minimal](../../../packages/themes/minimal/README.md) | `minimalTheme` | 装飾を抑えた最小 theme |
| [gruvbox](../../../packages/themes/gruvbox/README.md) | `gruvboxTheme` | Gruvbox 風の暖かい配色 |
| [rerurate](../../../packages/themes/rerurate/README.md) | `rerurateTheme` | Rerurate の視覚文法に基づく theme |
| [sakura](../../../packages/themes/sakura/README.md) | `sakuraTheme` | 桜をモチーフにした editorial theme |
| [tokyonight](../../../packages/themes/tokyonight/README.md) | `tokyonightTheme` | Tokyo Night 風の高コントラスト theme |

Theme の option は package README が正本です。Theme を作る場合は [Writing a Theme](./writing-a-theme.md)、API は [Theme API](../reference/theme-api.md) を参照してください。


