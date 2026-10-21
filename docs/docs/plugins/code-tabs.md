---
title: Code Tabs
---
# Code Tabs

Groups adjacent code blocks with `tab="..."` metadata into an accessible tab UI.

[日本語](./code-tabs.ja.md)

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

## Interactive preview

<section class="plugin-preview plugin-preview--compact" data-plugin-preview data-preview-plugin="code-tabs" data-preview-fixture="basic" data-preview-options="{&quot;syncTabs&quot;:false}">
  <header class="plugin-preview__header"><div><p>Interactive preview</p><h2>Code Tabs</h2></div><a href="/playground?plugin=code-tabs&amp;fixture=basic">Open in Playground</a></header>
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

## See also

- [Plugin guide](../reference/plugin-api.md)
