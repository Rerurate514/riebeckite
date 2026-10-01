# Properties

ノートのプロパティや frontmatter に含まれる情報を公開ページで扱いやすくする Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-properties
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

frontmatter に書いた記事の属性を、公開ページでも扱いたい場合に利用します。

```yaml
---
title: Riebeckite Guide
author: Rerurate
tags: [riebeckite, docs]
---
```

frontmatter の値は、記事の先頭（設定により末尾）にプロパティパネルとして表示されます。タグはリンク、日時は `<time>`、真偽値やネストした値も型に合わせて描画されます。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../packages/plugins/properties/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。
