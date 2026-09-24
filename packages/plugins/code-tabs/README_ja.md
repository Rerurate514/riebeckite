# @riebeckite/plugin-code-tabs

`tab="..."` metadata が付いた連続 code block を、アクセシブルなタブUIにまとめます。

[English](./README_en.md)

## Installation

```ts
import { defineConfig } from "@riebeckite/core";
import { codeTabs } from "@riebeckite/plugin-code-tabs";

export default defineConfig({
  // ...
  plugins: [codeTabs()],
});
```

`style.css` と client entry（`initCodeTabs`）はPlugin自身から登録されます。

## Config

```ts
codeTabs({
  syncTabs: false,
});
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `syncTabs` | `boolean` | `false` | 有効にすると、あるgroupで `TypeScript` などのlabelを選択したとき、同じページ内の他groupでも同じlabelを選択します。 |

## Syntax

````md
```dart tab="Flutter"
void main() {}
```

```ts tab="React"
console.log("Hello");
```
````

`tab="..."` がない通常のcode blockは変更しません。

## Grouping rules

`tab="..."` 付きcode blockが隣接している場合、1つのgroupとして扱います。
paragraph、heading、image など別contentが間に入ると、その時点でgroupを終了します。

````md
```dart tab="Dart"
```
```ts tab="TypeScript"
```
````

上の2つは同じgroupです。

````md
```dart tab="Dart"
```

途中の本文。

```ts tab="TypeScript"
```
````

本文が入るため、別groupになります。

## code-enhanceとの併用

`@riebeckite/plugin-code-tabs` は `@riebeckite/plugin-code-enhance` をimportせず、直接依存しません。
通常の `<pre><code>` と、enhance後の `rehype-pretty-code` figure の両方を検出し、render済みcode block全体をpanelとして包みます。
syntax highlight、filename、copy、wrap、collapse、line number、diff/highlight のDOMは可能な限りそのまま保持します。

併用する場合は、enhance後の出力をtabsで包めるように `codeEnhance()` の後へ `codeTabs()` を配置してください。

## Accessibility

生成HTMLは `role="tablist"`、`role="tab"`、`role="tabpanel"` を使います。
clientは click、`ArrowLeft`、`ArrowRight`、`Home`、`End`、`Enter`、`Space` に対応し、`aria-selected` と `tabindex` を同期します。
JavaScriptが実行されない場合はすべてのpanelが表示されたままなので、すべてのcode blockを読めます。

## Exports

- `codeTabs(options?)` — plugin factory
- `rehypeCodeTabs(options?)` — rehype transform
- `initCodeTabs(options?)` — client initializer
- Types: `CodeTabsOptions`, `CodeTabsClientOptions`
