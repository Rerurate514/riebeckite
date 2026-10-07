# Navigation

サイトのナビゲーションのモデルと、それを描画する primitive を提供する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-navigation
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

引数なしの `navigation()` は Vault からリンクを導出します。自分でリンクを選びたい場合は `items` を渡します。

```ts
navigation({
  items: [
    { label: "Docs", href: "/docs/" },
    { label: "Reference", href: "/docs/reference/" },
  ],
});
```

この Plugin はナビゲーションのモデルと描画の仕組みを持ちます。`SiteNav` は解決済みツリーを標準の `rb-nav` 構造で描画し、現在パスの判定、言語を考慮した正規化、`aria-current` を提供します。`rb-nav` ツリーを成立させる構造 CSS は Plugin の `style.css` が同梱し、自動生成される plugin styles 経由で読み込まれます。それぞれのリストをどこに置くか、モバイルで `<details>` を使うかはサイトが決めます。ナビゲーションのモデルは [Configuration リファレンス](../reference/configuration.ja.md) も参照してください。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.ja.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.ja.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.ja.md) を参照してください。
