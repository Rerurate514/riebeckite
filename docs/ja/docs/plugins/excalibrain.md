# ExcaliBrain

ノートごとの関係を 7 つの領域に分けたマップとして表示する Plugin です。[ExcaliBrain](https://github.com/zsviczian/excalibrain) の考え方をモデルにしています。

| 領域 | 位置 | ロール |
| --- | --- | --- |
| Parents | 上 | `parent` |
| Children | 下 | `child` |
| Left friends | 左 | `leftFriend` |
| Right friends | 右 | `rightFriend` |
| Previous | 左端 | `previous` |
| Next | 右端 | `next` |
| Siblings | 周辺 | `sibling` |

## 導入

```bash
npm install @riebeckite/plugin-excalibrain
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

`excalibrain` フェンスを置くと、その位置にマップが差し込まれます。

````md
```excalibrain
```
````

```excalibrain
```

フェンスの中身は読みません。フェンスは「ここに描画する」という位置だけを決めます。マップが描くのは、そのページ自身のリンク関係です。

上のマップの `child` には [[plugins/README|Plugin catalog]] と [[showcase]] が並びます。この 2 つは、このページの本文に書いた WikiLink から推論されました。

関係を明示したい場合は、YAML frontmatter か Dataview インラインフィールドで指定します。明示した関係は推論より優先されます。

````md
---
parent: "[[excalibrain-parent]]"
children: ["[[excalibrain-child-a]]", "[[excalibrain-child-b]]"]
friends: ["[[excalibrain-note-a]]"]
---

children:: [[excalibrain-child]]

related:: [[excalibrain-note-a]] と [[excalibrain-note-b]] は近い
````

末尾の例のように、リンク先となるノートが Vault に存在しない場合、そのリンクは仮想ノードとして描画されます。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { excaliBrain } from "@riebeckite/plugin-excalibrain";

export default defineConfig({
  plugins: [
    excaliBrain({
      auto: false,
      render: "build",
    }),
  ],
});
```

`auto` を有効にすると、`excalibrain` フェンスのないノートでも関係が存在する場合にマップを記事末尾へ追加します。マップを出すノートだけを決めている場合は `auto: false` にしてください。このドキュメントサイトでも `auto: false` にして、Plugin Showcase の 1 ページだけでマップを表示しています。

## 使いどころ

記事ごとに、その記事とつながるノートを一望できるマップを置きたい場合に使います。通常の Plugin は 1 つの Markdown 断片だけをどう描画するかを担当しますが、この Plugin はページ全体のリンク関係を扱います。

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/excalibrain/README_ja.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。実際の描画例は [Plugin Showcase](./showcase.md) にもあります。