---
date: 2026-10-14
title: 公開戦略（Publish Strategy）
sidebar:
  hidden: true
---

# 公開戦略（Publish Strategy）

コンテンツをどう公開するかを決める設定値で、すべて公開するか、公開指定のあるものだけを公開するかを選びます。公開境界の既定側を定めます。

## 値

| 戦略 | 挙動 |
| --- | --- |
| all | frontmatterで除外しない限り公開 |
| selective | 公開指定のあるコンテンツだけを公開 |

## frontmatterとの関係

戦略が既定を決め、`published` などのfrontmatterがそれを調整します。両者で[公開境界](./publication-boundary.md)を構成します。

## 戦略の解決
戦略は[解決済みのRiebeckite設定](../framework/honox-integration/site.md)の `config.content.filters.publishStrategy` から解決されます。値は `"explicit"` か `"selective"` で、`PublishStrategy` として保存されます。

## explicitとselective
`packages/core/src/types/publish_strategy.ts` によると、2つの戦略はfrontmatterフィールドが公開をどう決めるかを規定します。

- **explicit**：`publish === true`。frontmatterに `publish: true` があるノートだけが公開され、それ以外は除外されます。
- **selective**：`private === true` でも `draft === true` でもない。`private: true` か `draft: true` を付けない限り、ノートは既定で公開されます。

```ts
export type PublishStrategy = "explicit" | "selective";

export function isPublishable(
  strategy: PublishStrategy,
  frontmatter: PublishFrontmatter | undefined,
): boolean {
  if (strategy === "explicit") {
    return frontmatter?.publish === true;
  }
  return !(frontmatter?.private === true || frontmatter?.draft === true);
}
```

## 解決済み設定での公開戦略
公開戦略は設定の解決時に解決され、`config.content.filters.publishStrategy` に保存されます。`@riebeckite/core` の `isPublished` 関数がこの戦略を使い、各ノートをビルド出力に含めるかを決めます。

```ts
import { isPublished } from "@riebeckite/core";

const published = isPublished(config, frontmatter, { buildTime: new Date() });
```

戦略が `"explicit"` なら、frontmatterに `publish: true` があるノートだけが公開されます。`"selective"` なら、frontmatterに `private: true` か `draft: true` があるノートを除いて公開されます。この関数はビルドパイプラインで、出力生成前にコンテンツを絞り込むために呼ばれます。

## 関連用語

- [[publish|Publish]]
- [[draft|Draft]]
- [[visibility|Visibility]]
- [[publication-boundary|Publication Boundary]]
- [[frontmatter|Frontmatter]]
