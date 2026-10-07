---
publish: true
---

# showcase-ja

欢迎来到你的 Riebeckite 站点。此 preset 是一次导览：它注册了 Riebeckite 随附的完整插件目录，并准备了可在页面上看到各项能力的示例内容。

## 继续探索

- [插件 — 按能力分组的代表性包](/framework/plugins)
- [主题 — 内置设计包与切换方法](/framework/themes)
- [Working examples](/examples/)
- [Plugin reference](/reference/plugins/)

## 什么是 Riebeckite？

Riebeckite 是一个可扩展、内容优先的框架，可从纯 Markdown（即你在 Obsidian 中保存的笔记）构建快速的静态站点。它随附 50+ 插件与六个主题，本站点同时演示两者。

## 编辑本站点

内容以纯 Markdown 存于 `content/`。新建文件并在 frontmatter 中写入 `publish: true`，它就会出现在构建后的站点中。`content/Daily/` 下的笔记会显示在本页的 Daily Notes 小组件中。

本站点提供七种语言：主页、examples 与 framework 页面已翻译，guide 与插件/主题参考页面保持英文。可用页面标题下方的选择器切换。

本地化页面采用默认文件旁的 `<base>.<lang>.md` 命名约定（例如 `about.ja.md`）。l10n 插件会在 `/lang/` 路径下提供服务并自动互链。

已注册的插件及其选项请查看 `riebeckite.config.ts`。
