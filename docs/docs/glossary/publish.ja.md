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

## 公開判定の流れ

公開の判定は`resolvePublishingState`（`packages/core/src/content/publishing.ts`）が行い、publish strategyとfrontmatterフィールドの両方を考慮します。この関数は`ResolvedPublishingState`を返し、`visibility`、`routable`、`discoverable`フィールドを持ちます：

- 明示的なvisibilityが`"draft"`の場合→ draft状態、routableもdiscoverableもfalse
- `publishAt`が設定されており未来の場合→ scheduled状態、routableもdiscoverableもfalse
- 明示的なvisibilityが`"unlisted"`の場合→ unlisted状態、routableはtrueだがdiscoverableはfalse
- 明示的なvisibilityが`"public"`または`publishAt`が設定されている場合→ public状態、routableもdiscoverableもtrue
- それ以外→ 戦略に応じて`isPublishable`を呼び出し、trueの場合はpublic、falseの場合はdraft

```ts
// From packages/core/src/content/publishing.ts
export function resolvePublishingState(
  frontmatter: PostFrontmatter | undefined,
  options: PublishingResolutionOptions,
): ResolvedPublishingState {
  // ... logic as above
}
```

## 公開戦略の設定

公開戦略はサイトごとに設定され、`selective`がデフォルトです。`explicit`モードの場合、frontmatterの`publish: true`が設定されているノートのみが公開されます。`selective`モード（デフォルト）の場合、`private: true`または`draft: true`が設定されていない限り、ノートは公開されます。

```ts
// From packages/core/src/types/publish_strategy.ts
export type PublishStrategy = "explicit" | "selective";
```

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
