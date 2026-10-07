# Archive

月ごとのアーカイブ一覧ページを生成する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-archive
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

ブログや日誌で、読者が古いノートを月ごとにたどれるようにしたい場合に利用します。`basePath`（既定 `/archive`）の下に月ごとの一覧ページを新しい順で生成し、`pageSize` を超える月はページ分割します。

```ts
archive({ basePath: "/archive", pageSize: 10 });
```

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.ja.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.ja.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.ja.md) を参照してください。
