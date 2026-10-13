---
title: Publish
sidebar:
  hidden: true
---

# Publish

コンテンツを公開サイトに含めるかどうかの判定で、publish strategyとpublishedやvisibilityといったfrontmatterで制御します。公開されたコンテンツはpublication boundaryのビューに入ります。

## 判定の入力

- 設定したpublish strategy。
- frontmatterの`published`field。
- frontmatterの`visibility`field。

## 結果

判定を通ったコンテンツはroutableとdiscoverableのビューに入ります。通らなかったコンテンツはdraftとなり、公開集合から外れます。

## Publish Frontmatter
判定は`packages/core/src/types/publish_strategy.ts`の`PublishFrontmatter`タイプに基づいています：
```ts
export type PublishFrontmatter = {
  readonly publish?: unknown;
  readonly private?: unknown;
  readonly draft?: unknown;
};
```
3つのフィールドが公開判定を制御します：`publish`（opt-in）、`private`（opt-out）、`draft`（非公開）。これらの有無と値はアクティブな戦略によってdifferentに解釈されます。

## 明示的か選択的
`isPublishable`関数（`packages/core/src/types/publish_strategy.ts`)）は2つの戦略を実装します：
- **explicit**: `publish === true`。`publish: true`を設定したノートだけを公開します。
- **selective**: `private === true`または`draft === true`でなければ公開します。

```ts
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
