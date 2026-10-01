# Code Tabs

複数のコードブロックをタブとしてまとめて表示する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-code-tabs
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

同じ処理を複数の言語やパッケージマネージャーで示すドキュメントに向いています。たとえば `npm` / `pnpm` / `bun` のコマンドを切り替えて提示できます。

### ソース

````markdown
```ts tab="React"
const greeting = "Hello from React";
```

```js tab="Vanilla"
console.log("Hello from JavaScript");
```
````

### 実行例

```ts tab="React"
const greeting = "Hello from React";
```

```js tab="Vanilla"
console.log("Hello from JavaScript");
```

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/code-tabs/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

