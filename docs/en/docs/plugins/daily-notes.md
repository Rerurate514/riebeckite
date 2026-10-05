# Daily Notes

Surfaces short snippets extracted from Daily Notes as a site widget.

## Installation

```bash
npm install @riebeckite/plugin-daily-notes
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Read snippets with `getDailyNotes({ manifest, config })` and render the `DailyNotes` component where you want the widget to appear:

```tsx
import DailyNotes, { getDailyNotes } from "@riebeckite/plugin-daily-notes";

const notes = getDailyNotes({ manifest, config });
return <DailyNotes notes={notes} />;
```

The Plugin extracts one opted-in snippet per note — a frontmatter key, a heading section, or a fenced code block — and skips the rest of the body, so long private notes never emit their contents. An unpublished note's permalink and title stay `null`.

## When to use it

Add this Plugin when you keep Daily Notes and want to surface short, deliberately marked excerpts. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).
