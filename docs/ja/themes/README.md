# Themes

Theme はサイトの見た目を変えます。検索や Markdown 構文、独立ページのような機能は Plugin の責務です。Theme は未知の Plugin Page Type でも使えるよう、個別 route ではなく token と stable hook を対象にします。

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
| [default](./default.md) | `defaultTheme` | 標準の編集・読書向け theme |
| [minimal](./minimal.md) | `minimalTheme` | 装飾を抑えた最小 theme |
| [gruvbox](./gruvbox.md) | `gruvboxTheme` | Gruvbox 風の暖かい配色 |
| [rerurate](./rerurate.md) | `rerurateTheme` | Rerurate の視覚文法に基づく theme |
| [sakura](./sakura.md) | `sakuraTheme` | 桜をモチーフにした editorial theme |
| [tokyonight](./tokyonight.md) | `tokyonightTheme` | Tokyo Night 風の高コントラスト theme |

Theme の option は package README が正本です。Theme を作る場合は [Writing a Theme](./writing-a-theme.md)、API は [Theme API](../reference/theme-api.md) を参照してください。

