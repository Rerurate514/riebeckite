# @riebeckite/plugin-code-tabs

Groups adjacent code blocks with `tab="..."` metadata into an accessible tab UI.

[日本語](./README_ja.md)

## Installation

```ts
import { defineConfig } from "@riebeckite/core";
import { codeTabs } from "@riebeckite/plugin-code-tabs";

export default defineConfig({
  // ...
  plugins: [codeTabs()],
});
```

The plugin registers its own `style.css` and client entry (`initCodeTabs`).

## Config

```ts
codeTabs({
  syncTabs: false,
});
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `syncTabs` | `boolean` | `false` | When enabled, selecting a label such as `TypeScript` also selects the same label in other code-tab groups on the page. |

## Syntax

````md
```dart tab="Flutter"
void main() {}
```

```ts tab="React"
console.log("Hello");
```
````

Regular code blocks without `tab="..."` are not changed.

## Grouping rules

Adjacent `tab="..."` code blocks become one group. Any other content ends the
current group.

````md
```dart tab="Dart"
```
```ts tab="TypeScript"
```
````

The two blocks above are one group.

````md
```dart tab="Dart"
```

Text between blocks.

```ts tab="TypeScript"
```
````

The paragraph separates them into different groups.

## Using with code-enhance

`@riebeckite/plugin-code-tabs` does not import or depend on
`@riebeckite/plugin-code-enhance`. It detects both normal `<pre><code>` blocks
and enhanced `rehype-pretty-code` figures, then wraps the whole rendered code
block as a panel. Syntax highlighting, filename headers, copy buttons, wrap,
collapse, line numbers, and diff/highlight markup are preserved as much as
possible.

Place `codeTabs()` after `codeEnhance()` if both plugins are enabled so tabs wrap
the enhanced code block output.

## Accessibility

The generated HTML uses `role="tablist"`, `role="tab"`, and `role="tabpanel"`.
The client supports click, `ArrowLeft`, `ArrowRight`, `Home`, `End`, `Enter`, and
`Space`, and keeps `aria-selected` and `tabindex` in sync. Without JavaScript,
all panels remain visible so every code block can still be read.

## Exports

- `codeTabs(options?)` — plugin factory
- `rehypeCodeTabs(options?)` — rehype transform
- `initCodeTabs(options?)` — client initializer
- Types: `CodeTabsOptions`, `CodeTabsClientOptions`
