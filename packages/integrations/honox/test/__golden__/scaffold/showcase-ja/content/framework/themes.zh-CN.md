---
publish: true
---

# 主题

主题能整体改变站点的观感——配色、排版与布局——而无需改动你的内容或路由。Riebeckite 内置六个主题，安装一个包、改一行配置即可切换。

## 主题画廊

```gallery
columns: 3
items:
  - title: "Default"
    description: "默认主题：简洁的设计令牌、浅色/深色/系统配色与文章布局。"
    meta: "defaultTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md"
  - title: "Minimal"
    description: "以排版为先的简洁主题。"
    meta: "minimalTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md"
  - title: "Sakura"
    description: "柔和的粉色配色与温暖点缀。"
    meta: "sakuraTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md"
  - title: "Gruvbox"
    description: "受 Gruvbox 启发的温暖复古配色。"
    meta: "gruvboxTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md"
  - title: "Tokyo Night"
    description: "现代夜间配色，可选霓虹点缀。"
    meta: "tokyonightTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md"
  - title: "Rerurate"
    description: "作者个人的设计风格主题。"
    meta: "rerurateTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md"
```

## 切换主题

本模板使用 `@riebeckite/theme-default`。想尝试其他主题：

安装该包：

```sh
npm install @riebeckite/theme-sakura
```

在 `riebeckite.config.ts` 中将 `theme` 指向新工厂函数：

```ts
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  theme: sakuraTheme(),
});
```

## 内置主题一览

| 主题 | 说明 |
| --- | --- |
| [`@riebeckite/theme-default`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md) · `defaultTheme()` | 默认主题：简洁的设计令牌、浅色/深色/系统配色与文章布局。 |
| [`@riebeckite/theme-minimal`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md) · `minimalTheme()` | 以排版为先的简洁主题。 |
| [`@riebeckite/theme-sakura`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md) · `sakuraTheme()` | 柔和的粉色配色与温暖点缀。 |
| [`@riebeckite/theme-gruvbox`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md) · `gruvboxTheme()` | 受 Gruvbox 启发的温暖复古配色。 |
| [`@riebeckite/theme-tokyonight`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md) · `tokyonightTheme()` | 现代夜间配色，可选霓虹点缀。 |
| [`@riebeckite/theme-rerurate`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md) · `rerurateTheme()` | 作者个人的设计风格主题。 |

## 所有主题都支持明暗配色、排版与文章布局，完整选项请见各 README。


[Riebeckite themes on GitHub](https://github.com/Rerurate514/riebeckite/tree/main/packages/themes)

