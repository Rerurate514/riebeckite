---
title: Publish Strategy
sidebar:
  hidden: true
---

# Publish Strategy

コンテンツをどう公開するかを決める設定値で、すべて公開するか、公開指定のあるものだけを公開するかを選びます。Publication Boundaryの既定側を定めます。

## 値

| strategy | 挙動 |
| --- | --- |
| all | frontmatterで除外しない限り公開 |
| selective | 公開指定のあるコンテンツだけを公開 |

## frontmatterとの関係

strategyが既定を決め、`published`などのfrontmatterがそれを調整します。両者でpublication boundaryを構成します。

## 戦略の解決
戦略はresolved Riebeckite configの`config.content.filters.publishStrategy`から決定されます。値は`"explicit"`または`"selective"`で、`PublishStrategy`として保存されます。

## 明示的vs選択的
2つの戦略は、`packages/core/src/types/publish_strategy.ts`のとおり、frontmatterフィールドが公開をどう決定するかを規定します：

- **explicit**: `publish === true`。`publish: true`を設定したノートだけを公開します。
- **selective**: `private === true`または`draft === true`でなければ公開します。

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

## 解決済みconfigでのpublish戦略
publish戦略はconfig解決時に解決され、`config.content.filters.publishStrategy`に保存されます。@riebeckite/coreからの`isPublished`関数はこの戦略を使用して、各ノートがbuild出力に含まれるべきかどうかを決定します：

```ts
import { isPublished } from "@riebeckite/core";

const published = isPublished(config, frontmatter, { buildTime: new Date() });
```

戦略が`"explicit"`の場合、frontmatterに`publish: true`があるノートのみが公開されます。`"selective"`の場合、frontmatterに`private: true`または`draft: true`があるノートを除いてすべてが公開されます。この関数はビルドパイプラインでコンテンツを出力前にフィルタリングするために呼び出されます。

## 関連用語

- [[publish|Publish]]
- [[draft|Draft]]
- [[visibility|Visibility]]
- [[publication-boundary|Publication Boundary]]
- [[frontmatter|Frontmatter]]
