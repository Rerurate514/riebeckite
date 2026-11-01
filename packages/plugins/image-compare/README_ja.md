# @riebeckite/plugin-image-compare

Riebeckite のためのビフォー・アフター画像比較プラグインです。`image-compare` のフェンスコードブロックを書くと、スライダー付きの比較表示に変換されます。JavaScript がなくても2枚の画像を並べて表示します。

````markdown
```image-compare
before: ./before.png
after: ../assets/after.png
beforeAlt: 変更前
afterAlt: 変更後
orientation: horizontal
label: ホームページ
```
````

画像パスはノートからの相対パスとして、Markdown 画像と同じ規則で解決されます。`orientation` は `horizontal` または `vertical`、`label` と代替テキストは省略できます。スライダーはネイティブの range input を使うため、マウス・タッチ・キーボードで操作できます。

```ts
import { imageCompare } from "@riebeckite/plugin-image-compare";

plugins: [imageCompare()];
```

オプションの `language` でフェンスの言語名を変更できます。スタイルは既存の `--rb-color-*` テーマトークンを使用します。
