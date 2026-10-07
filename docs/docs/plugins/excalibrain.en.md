<!-- Generated from packages/plugins/excalibrain/README.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# ExcaliBrain

Structured relationship maps for notes, modelled on
[ExcaliBrain](https://github.com/zsviczian/excalibrain) by Zsolt Viczián.

[日本語](./excalibrain.md)

## Overview

`excaliBrain()` renders each note in a planar layout with seven regions:

| Region | Direction | Role |
| ------ | --------- | ---- |
| Parents | top | `parent` |
| Children | bottom | `child` |
| Left friends | left | `leftFriend` |
| Right friends | right | `rightFriend` |
| Previous | far left | `previous` |
| Next | far right | `next` |
| Siblings | periphery | `sibling` |

Relationships come from ExcaliBrain's ontology: YAML frontmatter fields and
dataview inline fields in the note body. When a relationship is not stated
explicitly, it is inferred from the content graph.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { excaliBrain } from "@riebeckite/plugin-excalibrain";

export default defineConfig({
  // ...
  plugins: [
    excaliBrain({
      render: "build",
    }),
  ],
});
```

The plugin runs with `order: -10`.

## Declaring relationships

Explicit relations win over inferred ones.

### YAML frontmatter

```md
---
title: ExcaliBrain Center
parent: "[[excalibrain-parent]]"
children: ["[[excalibrain-child-a]]", "[[excalibrain-child-b]]"]
---
```

### Dataview inline fields

```md
children:: [[excalibrain-child]]

related:: [[note-a]] and [[note-b]] are similar
```

An inline field may appear on its own line or inside brackets
(`[field:: [[target]]]`).

### Ontology

Field names are matched case-insensitively and spaces are normalized to
hyphens. The default ontology is:

| Role | Field names |
| ---- | ----------- |
| `parents` | `parent`, `parents`, `up`, `u`, `north`, `origin`, `inception`, `source`, `parent domain` |
| `children` | `children`, `child`, `down`, `d`, `south`, `leads to`, `contributes to`, `nurtures` |
| `leftFriends` | `friends`, `friend`, `jump`, `jumps`, `j`, `similar`, `supports`, `alternatives`, `advantages`, `pros` |
| `rightFriends` | `opposes`, `disadvantages`, `missing`, `cons` |
| `previous` | `previous`, `prev`, `west`, `w`, `before` |
| `next` | `next`, `n`, `east`, `e`, `after` |
| `hidden` | `hidden` |

The `ontology` option extends the defaults: each role's field names are
appended to that role's defaults rather than replacing them. An override can
still add an existing field to another role, but earlier roles in the
canonical order (`parents`, `children`, `leftFriends`, `rightFriends`,
`previous`, `next`, `hidden`) win when a field is listed twice.

`hidden` follows ExcaliBrain: it lists the targets to hide from this note's
map; it never hides the note itself. `showHidden` reveals those targets.

## Inference

When `infer` is enabled (the default):

- a forward link (this note → other) becomes a `child`;
- a backlink (other → this note) becomes a `parent`;
- a mutual link (this note ↔ other) becomes a `leftFriend`.

With `siblings` enabled (the default), the other children of this note's
parents become `sibling` nodes. Sibling inference also requires `infer`:
setting `infer: false` disables it. Link targets are resolved against the
content manifest; unresolved targets become virtual nodes labelled with the
raw link text (`data-node-virtual="true"`).

## Publication boundary

Nodes are resolved against the content manifest. A target whose
`publishing.routable` flag is false is dropped from the map, so notes excluded
from publication never appear as nodes or links and their titles and permalinks
are not leaked.

## Rendering

The `render` option selects where the map is produced:

| Mode | Behavior |
| ---- | -------- |
| `"build"` (default) | The SVG is generated at build time and inlined into the article. |
| `"client"` | A `div.rb-excalibrain__canvas` carries the escaped graph/layout payload; `initExcaliBrain()` builds the SVG in the browser. |
| `"both"` | Inline SVG plus the client layer for progressive enhancement. |

### Injection

- A ` ```excalibrain ` fence is replaced by the map.
- Otherwise, when `auto` is enabled and the note has at least one
  relationship, the map section is appended to the article HTML (both the
  manifest entry and the cached post content).

`heading` / `headingText` control the optional `<h2>`.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `render` | `"build" \| "client" \| "both"` | `"build"` | Where the map is rendered |
| `auto` | `boolean` | `true` | Append the map when a note has no fence |
| `heading` | `boolean` | `true` | Show the heading |
| `headingText` | `string` | `"ExcaliBrain"` | Heading text |
| `className` | `string` | `"rb-excalibrain"` | Root CSS class |
| `maxPerRegion` | `number` | `8` | Maximum nodes per region |
| `infer` | `boolean` | `true` | Infer relations from links |
| `siblings` | `boolean` | `true` | Infer siblings from parents (requires `infer`) |
| `ontology` | object | — | Ontology field names appended per role |
| `showHidden` | `boolean` | `false` | Include targets named by `hidden` fields |
| `width` | `number` | `720` | SVG viewBox width |
| `height` | `number` | `480` | SVG viewBox height |
| `language` | `string` | `"excalibrain"` | Fence language |

## Output

```html
<section class="rb-excalibrain" data-excalibrain
         data-excalibrain-render="build"
         data-excalibrain-center="notes/center">
  <h2 class="rb-excalibrain__heading">ExcaliBrain</h2>
  <div class="rb-excalibrain__canvas">
    <svg class="rb-excalibrain__svg" viewBox="0 0 720 480" role="img">…</svg>
  </div>
</section>
```

Each region is a `g.rb-excalibrain__region[data-region]`; each node is a
`g.rb-excalibrain__node[data-node-role][data-node-slug][data-relation-type]`
wrapping an `<a href>` around its `<rect>` and `<text>`. Links are
`path.rb-excalibrain__link[data-link-role][data-relation-type]`.

## Limitations

- The map is read-only. The client layer only builds the SVG; there is no drag,
  zoom, or expand/collapse interaction.
- `maxPerRegion` truncates each region, so a note with more relations than the
  limit shows only the first nodes.
- Rendering is limited to the ontology roles above; there is no per-node
  styling or per-region configuration beyond the options listed below.

## Exports

- `excaliBrain(options?)` / `excaliBrainPlugin` — plugin factory
- `resolveExcaliBrainOptions(options?)` — resolved defaults
- `buildExcaliBrainGraph(input)` — pure graph builder
- `layoutExcaliBrain(graph, options?)` — pure deterministic layout
- `renderExcaliBrainSvg(graph, layout, options?)` — pure SVG renderer
- Types: `ExcaliBrainOptions`, `ExcaliBrainGraph`, `ExcaliBrainNode`,
  `ExcaliBrainLink`, `ExcaliBrainLayout`, `ExcaliBrainRole`,
  `ExcaliBrainRenderMode`, …

## See also

- [Plugin guide](../reference/plugin-api.en.md)
