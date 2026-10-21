# @riebeckite/plugin-code-tabs

<!-- Generated from docs/docs/plugins/code-tabs.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

連続するコードブロックを、`tab="..."` の名前ごとにタブへまとめるプラグインです。

[English](./README.md)

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

## 対話プレビュー

<section class="plugin-preview plugin-preview--compact" data-plugin-preview data-preview-plugin="code-tabs" data-preview-fixture="basic" data-preview-options="{&quot;syncTabs&quot;:false}">
  <header class="plugin-preview__header"><div><p>Interactive preview</p><h2>Code Tabs</h2></div><a href="/playground?plugin=code-tabs&amp;fixture=basic">Playground で開く</a></header>
  <div class="plugin-preview__controls">
    <label>Fixture<select data-preview-fixture-select><option value="basic" selected>Basic tabs</option><option value="separate-groups">Separate groups</option></select></label>
    <label><input type="checkbox" data-preview-option="syncTabs"> Sync tabs</label>
    <label>Theme<select data-preview-theme><option value="default">Default</option><option value="minimal">Minimal</option><option value="gruvbox">Gruvbox</option><option value="rerurate">Rerurate</option><option value="sakura">Sakura</option><option value="tokyonight">Tokyo Night</option></select></label>
    <label>Color mode<select data-preview-mode><option value="light">Light</option><option value="dark">Dark</option></select></label>
  </div>
  <label class="plugin-preview__editor-label"><span>Markdown</span><textarea data-preview-markdown spellcheck="false">&#96;&#96;&#96;ts tab="TypeScript"
const greeting = "Hello from TypeScript";
console.log(greeting);
&#96;&#96;&#96;
&#96;&#96;&#96;js tab="JavaScript"
const greeting = "Hello from JavaScript";
console.log(greeting);
&#96;&#96;&#96;</textarea></label>
  <section class="plugin-preview__output" aria-live="polite"><header><span>Preview</span><span data-preview-status>Loading</span></header><iframe data-preview-frame title="Code Tabs preview" sandbox=""></iframe><ul class="plugin-preview__diagnostics" data-preview-diagnostics></ul></section>
</section>

生成する要素には `tablist`、`tab`、`tabpanel` のロールを設定します。矢印キー、`Home`、`End`、`Enter`、`Space` で操作でき、JavaScript が動かない場合は全パネルをそのまま読めます。

`@riebeckite/plugin-code-enhance` と併用する場合は、強調表示後の出力をまとめられるよう `codeEnhance()` の後に `codeTabs()` を置いてください。

## 公開 API

- `codeTabs(options?)`：プラグインファクトリ
- `rehypeCodeTabs(options?)`：Rehype 変換
- `initCodeTabs(options?)`：ブラウザ初期化関数
- `CodeTabsOptions`、`CodeTabsClientOptions`：型

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
- [`@riebeckite/plugin-code-enhance`](../code-enhance/README_ja.md)
