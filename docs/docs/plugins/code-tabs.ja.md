<!-- Generated from packages/plugins/code-tabs/README_ja.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Code Tabs

連続するコードブロックを、`tab="..."` の名前ごとにタブへまとめるプラグインです。

[English](./code-tabs.md)

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { codeTabs } from "@riebeckite/plugin-code-tabs";

export default defineConfig({
  // ...
  plugins: [codeTabs()],
});
```

スタイルと `initCodeTabs` はプラグイン自身が登録します。

## コードブロックにタブ名を付ける

````md
```dart tab="Flutter"
void main() {}
```

```ts tab="React"
console.log("Hello");
```
````

`tab` を持つコードブロックが連続している間だけ、一つのタブグループになります。段落、見出し、画像などが間に入ると別のグループです。`tab` のないコードブロックは変更しません。

## オプションとアクセシビリティ

| オプション | 既定値 | 内容 |
| --- | --- | --- |
| `syncTabs` | `false` | あるタブを選ぶと、同じページの同名タブも切り替えるか |

生成する要素には `tablist`、`tab`、`tabpanel` のロールを設定します。矢印キー、`Home`、`End`、`Enter`、`Space` で操作でき、JavaScript が動かない場合は全パネルをそのまま読めます。

`@riebeckite/plugin-code-enhance` と併用する場合は、強調表示後の出力をまとめられるよう `codeEnhance()` の後に `codeTabs()` を置いてください。

## 公開 API

- `codeTabs(options?)` — プラグインファクトリ
- `rehypeCodeTabs(options?)` — Rehype 変換
- `initCodeTabs(options?)` — ブラウザ初期化関数
- `CodeTabsOptions`、`CodeTabsClientOptions` — 型

## 関連資料

- [プラグインシステム](../reference/plugin-api.ja.md)
- [`@riebeckite/plugin-code-enhance`](./code-enhance.ja.md)
