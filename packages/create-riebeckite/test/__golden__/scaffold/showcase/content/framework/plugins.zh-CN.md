---
publish: true
---

# 插件

Riebeckite 的强大来自其插件生态——五十多个扩展 Markdown、渲染、搜索、SEO 等的包。下面按能力分组展示代表性示例，每一项都链接到完整 README。

## 添加插件

安装该包：

```sh
npm install @riebeckite/plugin-mermaid
```

在 `riebeckite.config.ts` 的 `plugins` 数组中注册：

```ts
import { defineConfig } from "@riebeckite/core";
import { l10n } from "@riebeckite/plugin-l10n";
import { mermaid } from "@riebeckite/plugin-mermaid";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), l10n({ ... }), mermaid()],
});
```

完整的插件索引位于仓库中：

[GitHub 上的 Riebeckite 插件](https://github.com/Rerurate514/riebeckite/tree/main/packages/plugins)

## Markdown 与笔记

为 Obsidian 库打造的日常笔记功能。

| 插件 | 作用 |
| --- | --- |
| [`@riebeckite/plugin-obsidian-markdown`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/obsidian-markdown/README.md) | Obsidian 风格 Markdown：双链、嵌入、标注与标签。 |
| [`@riebeckite/plugin-attachment`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/attachment/README.md) | 通过双链渲染附件并嵌入资源。 |
| [`@riebeckite/plugin-media`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/media/README.md) | 从普通链接嵌入音频和视频。 |

## 图表与演示

将围栏代码块变成图表与幻灯片。

| 插件 | 作用 |
| --- | --- |
| [`@riebeckite/plugin-mermaid`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/mermaid/README.md) | 从围栏代码块渲染 Mermaid 图表。 |
| [`@riebeckite/plugin-graphviz`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/graphviz/README.md) | DOT / Graphviz 图表。 |
| [`@riebeckite/plugin-d2`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/d2/README.md) | 使用 D2 语言绘制图表。 |
| [`@riebeckite/plugin-excalidraw`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/excalidraw/README.md) | 渲染 Excalidraw 草图文件。 |
| [`@riebeckite/plugin-gallery`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/gallery/README.md) | 用于主题或项目展示的卡片网格。 |

## 代码与阅读体验

更好的代码块与舒适的阅读体验。

| 插件 | 作用 |
| --- | --- |
| [`@riebeckite/plugin-code-enhance`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-enhance/README.md) | 语法高亮、行号与代码工具栏。 |
| [`@riebeckite/plugin-code-tabs`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-tabs/README.md) | 无障碍的标签式代码块。 |
| [`@riebeckite/plugin-toc`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/toc/README.md) | 随滚动高亮的目录。 |
| [`@riebeckite/plugin-backlinks`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/backlinks/README.md) | 列出链接到当前笔记的笔记。 |

## 搜索与导航

快速查找并在笔记之间穿梭。

| 插件 | 作用 |
| --- | --- |
| [`@riebeckite/plugin-search`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/search/README.md) | 带 Ctrl+K 弹窗的客户端全文搜索。 |
| [`@riebeckite/plugin-garden-explorer`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/garden-explorer/README.md) | 交互式图谱与搜索探索器。 |
| [`@riebeckite/plugin-local-graph`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/local-graph/README.md) | 当前笔记周边的链接图谱。 |
| [`@riebeckite/plugin-permalink`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/permalink/README.md) | 稳定、可配置的永久链接。 |

## 发布与 SEO

发布搜索引擎和读者都能理解的站点。

| 插件 | 作用 |
| --- | --- |
| [`@riebeckite/plugin-seo`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/seo/README.md) | SEO 元数据、站点地图、RSS/Atom/JSON 订阅与 robots.txt。 |
| [`@riebeckite/plugin-l10n`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/l10n/README.md) | 本地化 URL、语言切换器与 hreflang 元数据——本站就运行在它之上。 |
| [`@riebeckite/plugin-rich-embed`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/rich-embed/README.md) | 外部链接的构建时富媒体卡片。 |
| [`@riebeckite/plugin-deploy`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/deploy/README.md) | 面向托管服务的静态部署产物。 |

## 内容与开发者体验

查询、整理并保持内容健康。

| 插件 | 作用 |
| --- | --- |
| [`@riebeckite/plugin-dataview`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/dataview/README.md) | 对笔记的构建时查询。 |
| [`@riebeckite/plugin-kanban`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/kanban/README.md) | 从 Markdown 列表创建 Obsidian 风格看板。 |
| [`@riebeckite/plugin-responsive-image`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/responsive-image/README.md) | 响应式图片与懒加载。 |
| [`@riebeckite/plugin-quality`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/quality/README.md) | 静态质量与可访问性检查。 |


Riebeckite: [documentation](https://github.com/Rerurate514/riebeckite/blob/main/docs/README.en.md) · [日本語ドキュメント](https://github.com/Rerurate514/riebeckite/blob/main/docs/README.md)

