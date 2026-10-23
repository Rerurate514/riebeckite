---
date: 2026-10-14
title: 公開（Publish）
sidebar:
  hidden: true
---

# 公開（Publish）

コンテンツを公開サイトに含めるかどうかの判定で、公開戦略と `published` や `visibility` などのfrontmatterで制御します。公開されたコンテンツは公開境界のビューに入ります。

## 判定の入力

- 設定された公開戦略。
- `published` frontmatterフィールド。
- `visibility` frontmatterフィールド。

## 結果

判定を通ったコンテンツは[ルーティング対象](./routable.md)と[検出可能](./discoverable.md)のビューに入ります。通らなかったコンテンツは[下書き](./draft.md)となり、公開集合から外れます。

## 公開判定の流れ

公開の判定は `resolvePublishingState`（`packages/core/src/content/publishing.ts`）が行い、公開戦略とfrontmatterフィールドの両方を考慮します。この関数は `ResolvedPublishingState` を返し、`visibility`、`routable`、`discoverable` フィールドを持ちます。

- 明示的なvisibilityが `"draft"` の場合 → 下書き状態。ルーティング対象でも検出可能でもない
- `publishAt` が設定されていて未来の場合 → 予約状態。ルーティング対象でも検出可能でもない
- 明示的なvisibilityが `"unlisted"` の場合 → 非公開（unlisted）状態。ルーティング対象だが検出可能ではない
- 明示的なvisibilityが `"public"` の場合、または `publishAt` が設定されている場合 → 公開状態。ルーティング対象で検出可能
- それ以外 → 戦略を渡して `isPublishable` を呼ぶ。trueなら公開、falseなら下書き

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

公開戦略はサイトごとに設定し、既定は `"selective"` です。`explicit` 戦略では、frontmatterに `publish: true` があるノートだけが公開されます。`selective` モード（既定）では、`private: true` か `draft: true` が設定されていない限り、ノートは公開されます。

```ts
// From packages/core/src/types/publish_strategy.ts
export type PublishStrategy = "explicit" | "selective";
```

## 公開用frontmatter
判定は `packages/core/src/types/publish_strategy.ts` の `PublishFrontmatter` 型に基づきます。
```ts
export type PublishFrontmatter = {
  readonly publish?: unknown;
  readonly private?: unknown;
  readonly draft?: unknown;
};
```
`publish`（opt-in）、`private`（opt-out）、`draft`（非公開）の3つのフィールドが公開判定を制御します。これらのフィールドの有無と値は、有効な戦略によって解釈が変わります。

## isPublishableのロジック
`isPublishable` 関数（`packages/core/src/types/publish_strategy.ts`）は2つの戦略を実装します。
- **explicit**：`frontmatter.publish === true`。明示的にopt-inしたノートだけが公開されます。
- **selective**：`private === true` でも `draft === true` でもない。明示的に隠さない限り、ノートは公開されます。

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
