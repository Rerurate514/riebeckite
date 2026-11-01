# @riebeckite/plugin-vault-heatmap

Riebeckite の Vault アクティビティをカレンダーヒートマップで表示するプラグインです。公開対象コンテンツの frontmatter にある `created`、`modified`、`updated` を読み取り、ビルド時に `vault-heatmap` のフェンスコードブロックを描画します。

````markdown
```vault-heatmap
weeks: 26
title: 執筆アクティビティ
weekStart: monday
```
````

集計対象は public と unlisted のコンテンツだけです。draft、一覧に出さない unlisted、公開予定の scheduled は含まれません。終了日は既定で最新のアクティビティ日になるため、変更がない限り同じビルド結果になります。

```ts
import { vaultHeatmap } from "@riebeckite/plugin-vault-heatmap";

plugins: [vaultHeatmap()];
```

オプションは `weeks`（1〜104、既定52）、`title`、`weekStart`（`sunday` または `monday`）、`language` です。ブロック側で `weeks`、`title`、`weekStart`、`end`（`YYYY-MM-DD`）を上書きできます。出力は静的な HTML で、クライアント JavaScript は使いません。
