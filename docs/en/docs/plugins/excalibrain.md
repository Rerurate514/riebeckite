# ExcaliBrain

Renders the relationships of each note as a map divided into seven regions. It models the ideas behind [ExcaliBrain](https://github.com/zsviczian/excalibrain).

| Region | Position | Role |
| --- | --- | --- |
| Parents | top | `parent` |
| Children | bottom | `child` |
| Left friends | left | `leftFriend` |
| Right friends | right | `rightFriend` |
| Previous | far left | `previous` |
| Next | far right | `next` |
| Siblings | around | `sibling` |

## Installation

```bash
npm install @riebeckite/plugin-excalibrain
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Place an `excalibrain` fence where the map should appear.

````md
```excalibrain
```
````

```excalibrain
```

The body of the fence is not read. The fence only decides where the map is drawn. What the map shows are the links of the page that hosts it.

The `child` region of the map above holds [[plugins/README|Plugin catalog]] and [[showcase]]. Both were inferred from the WikiLinks written in the body of this page.

To state relationships explicitly, use YAML frontmatter or Dataview inline fields. Defined relationships take precedence over inferred ones.

````md
---
parent: "[[excalibrain-parent]]"
children: ["[[excalibrain-child-a]]", "[[excalibrain-child-b]]"]
friends: ["[[excalibrain-note-a]]"]
---

children:: [[excalibrain-child]]

related:: [[excalibrain-note-a]] and [[excalibrain-note-b]] are similar
````

A link whose target note does not exist in the Vault, as in the last example, is drawn as a virtual node.

## Configuration

```ts
import { defineConfig } from "@riebeckite/core";
import { excaliBrain } from "@riebeckite/plugin-excalibrain";

export default defineConfig({
  plugins: [
    excaliBrain({
      auto: false,
      render: "build",
    }),
  ],
});
```

With `auto` enabled, a note without an `excalibrain` fence gets the map appended to the end of the article as long as it has at least one relationship. Use `auto: false` when only a few pages should carry a map. This documentation site also runs with `auto: false` and shows the map on the Plugin Showcase page alone.

## When to use it

Use it when you want each article to carry a map of the notes it connects to. Most Plugins describe how a single Markdown fragment is rendered. This Plugin works from the link relationships of the whole page instead.

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md). A rendered example is also available on the [Plugin Showcase](./showcase.md).