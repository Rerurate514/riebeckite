# @riebeckite/plugin-properties

<!-- Generated from docs/docs/plugins/properties.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Render a note's frontmatter as an Obsidian-style property panel. The plugin
turns raw values into structured data; the Site decides where the panel goes.

[日本語](./README_ja.md)

## Overview

`properties()` contributes a stylesheet, tracks wikilink dependencies, and
reports frontmatter values that cannot be converted. It does not modify the
rendered Markdown body.

The Site renders the exported component:

```tsx
import { Properties } from "@riebeckite/plugin-properties";

<Properties />;
```

With no props, `<Properties />` reads the current article from the Site
context and merges the `properties()` PluginConfig with component options. The
default scaffold already places it in the article layout.

A custom layout can resolve the data itself and pass it to the component:

```tsx
const data = getProperties({
  view: site.view,
  frontmatter: post.frontmatter,
  options: { title: "Metadata" },
});

return <Properties data={data} className="article-properties" />;
```

Precedence, from highest to lowest:

1. Explicit `data` passed to `<Properties data={...} />`
2. `<Properties options={...} />`
3. The `properties()` PluginConfig
4. Built-in defaults

Component options are merged over PluginConfig. `fields` are merged per
property key, so a component field config replaces the whole config for that
key. `className` on the component is appended to the root class; it does not
replace it.

## Field configuration

Declare how individual keys are displayed:

```ts
import { properties } from "@riebeckite/plugin-properties";

properties({
  exclude: ["publish", "permalink"],
  fields: {
    tags: { type: "tags", link: true, tagBase: "/tags/", variant: "chips" },
    status: {
      type: "badge",
      variants: { published: "success", draft: "warning" },
    },
    created: { type: "date", format: "yyyy-MM-dd" },
    related: { type: "wikilinks" },
  },
});
```

`fields` controls presentation only. Declared keys become the default display
order, but they are not implicitly included or excluded. `include` and
`exclude` still decide which keys appear.

### Field types

| Type | Value handling |
| ---- | -------------- |
| `text` | Render escaped text. Arrays become lists and objects become groups |
| `link` | Render an HTTP(S) or root-relative URL as a link; unsafe URLs stay text |
| `tags` | Render strings or arrays as tags. `link` defaults to `true`; `variant` is `text`, `links`, or `chips`. The `text` variant and `link: false` render labels without links |
| `badge` | Render a value as a badge. `variants` maps a value to a CSS `data-variant` name |
| `date` | Parse an ISO date or datetime and format it. Default format: `yyyy-MM-dd` |
| `wikilinks` | Link `[wikilinks](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/wikilinks.md)`; plain URLs remain text |

Unconfigured keys use a safe default:

- `tags` / `tag`, or values beginning with `#`, become linked tags.
- Arrays become lists.
- ISO date strings and `Date` values become `<time>`.
- Strings containing wikilinks or HTTP(S) URLs become inline links.
- Booleans, numbers, and objects render as scalars or a nested group.
- `null`, `""`, `[]`, and `{}` are hidden when `hideEmpty` is enabled.

Invalid values never throw. They render as escaped text and produce a
`properties-unrenderable-value` diagnostic.

### Date formats

Supported tokens are `yyyy`, `MM`, `dd`, `HH`, `mm`, and `ss`. They use UTC.
Other letters are rejected by option validation.

```ts
created: { type: "date", format: "yyyy/MM/dd HH:mm" }
```

### Configuration validation

The plugin validates `fields` during config loading. Paths are reported under
`plugins[i].options`, for example:

```text
plugins[0].options.fields.status.type: Expected one of: text, link, tags, badge, date, wikilinks.
```

Unknown field options, empty tag bases, unsupported date tokens, and
non-string badge variants are also reported.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `title` | `string \| null` | `"Properties"` | Panel heading. `null` omits it |
| `include` | `string[]` | unset | Render only these keys |
| `exclude` | `string[]` | `["publish", "permalink", "aliases", "redirect_from"]` | Keys to hide |
| `order` | `string[]` | field declaration order | Display order: listed keys first, then the rest in frontmatter order |
| `hideEmpty` | `boolean` | `true` | Skip `null`, `""`, `[]`, and `{}` values |
| `className` | `string` | `"rb-properties"` | Root CSS class |
| `collapsed` | `boolean` | `false` | Render inside a `<details>` element |
| `fields` | `Record<string, FieldConfig>` | `{}` | Per-property display configuration |

```ts
properties({
  title: "メタデータ",
  exclude: ["publish", "permalink", "aliases", "redirect_from", "draft"],
  collapsed: true,
});
```

## Structured data

`getProperties()` returns `PropertiesData`. Values are semantic objects, not
HTML and not stringified arrays:

```ts
type PropertiesData = {
  title: string | null;
  className: string;
  collapsed: boolean;
  items: readonly {
    key: string;
    value: PropertyValue;
  }[];
};
```

Common value variants:

```ts
{ kind: "text", text: "Hello" }
{ kind: "link", text: "Note", href: "/note", external: false }
{ kind: "tags", variant: "chips", tags: [{ tag: "web", text: "#web", href: "/tags/web" }] }
{ kind: "badge", text: "published", variant: "success" }
{ kind: "date", value: "2024-01-02", formatted: "2024-01-02" }
{ kind: "inline", parts: [...] }
{ kind: "list", items: [...] }
{ kind: "group", entries: [{ key: "lang", value: { kind: "text", text: "ja" } }] }
```

`renderPropertiesPanel()` consumes the same model, so the panel and the
component always agree on value semantics. Import the public types from
`@riebeckite/plugin-properties`.

### Publication Boundary

Wikilinks resolve through the Site's `PublicContentView`. A draft or other
non-routable entry therefore cannot be linked from properties and remains
escaped text. Unlisted entries that are routable can be linked but stay
undiscoverable elsewhere. The plugin does not bypass publication decisions.

## Display and CSS

The panel uses semantic markup:

```html
<section class="rb-properties" data-properties data-property-count="3">
  <h2 class="rb-properties__title">Properties</h2>
  <dl class="rb-properties__rows">
    <div class="rb-properties__row" data-property-key="tags">
      <dt class="rb-properties__key">tags</dt>
      <dd class="rb-properties__value">
        <ul class="rb-properties__list" data-variant="chips">
          <li class="rb-properties__list-item">
            <a class="rb-properties__tag" data-tag="web" href="/tags/web">#web</a>
          </li>
        </ul>
      </dd>
    </div>
  </dl>
</section>
```

Stable hooks:

- Root: `.rb-properties[data-properties]`
- Rows: `.rb-properties__row[data-property-key]`
- Keys and values: `.rb-properties__key`, `.rb-properties__value`
- Tags: `.rb-properties__tag[data-tag]`, container `[data-variant]`
- Badges: `.rb-properties__badge[data-variant]`
- Dates: `.rb-properties__date[datetime]`
- Links: `.rb-properties__link`, external adds `--external`
- Lists and groups: `.rb-properties__list`, `.rb-properties__nested`

```css
.rb-properties__row[data-property-key="tags"] {
  grid-template-columns: 8rem 1fr;
}

.rb-properties__badge[data-variant="warning"] {
  color: var(--site-warning);
}
```

The plugin stylesheet owns the panel's internal defaults. Site CSS owns layout
and may override the hooks above. Theme CSS owns color and typography tokens.

External links use `rel="noopener noreferrer"` and `target="_blank"`. All text
and attribute values are escaped. Only HTTP(S), anchor, and root-relative hrefs
are emitted.

## Exports

- `properties(options?)` and `properties(options?)` — plugin factory
- `getProperties({ view, frontmatter, options? })` — structured data helper
- `<Properties data? options? className? />` — shared renderer component
- `renderPropertiesPanel(frontmatter, options?, context?)` — pure HTML renderer
- `resolvePropertiesOptions(options?)` — default resolution
- `validatePropertiesOptions(options?)` — config validation
- `buildTagHref(tag, base?)` — canonical tag route builder
- `PropertiesData`, `PropertyValue`, `PropertiesFieldConfig`,
  `PropertiesOptions`, `ResolvedPropertiesOptions`, `PropertiesRenderContext`,
  `PropertiesLinkResolver`, `PropertiesMessage`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [Configuration reference](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/configuration-reference.md)
