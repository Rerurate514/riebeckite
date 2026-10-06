# Add Your First Plugin

Plugins add features to your Riebeckite site — search, diagrams, embeds, and more. This guide walks through adding the **highlight** plugin, which lets you mark text with `==double equals==` syntax.

> Want to change how the site looks instead? See [Change Your Theme](./first-theme.en.md).

---

## 1. Install

In your generated site directory:

```sh
npm install @riebeckite/plugin-highlight
```

---

## 2. Import

Open `riebeckite.config.ts` and add the import at the top:

```ts
import { highlight } from "@riebeckite/plugin-highlight";
```

---

## 3. Add the Plugin

Find the `plugins` array in your config and add `highlight()`:

```ts
plugins: [
  // ... existing plugins
  highlight(),
],
```

---

## 4. Try It

Restart the dev server (or start it if not running):

```sh
npm exec riebeckite dev
```

Open your site and edit a Markdown file (e.g., `content/index.md`). Add some highlighted text:

```md
This sentence has a ==highlighted phrase== inside it.
```

Save and check the page — the text between `==` is now highlighted.

---

## 5. Next Steps

- Explore more plugins in the [Plugins reference](../plugins/README.en.md)
- Try `@riebeckite/plugin-mermaid` for diagrams
- Try `@riebeckite/plugin-graphviz` for graph visualizations
- Learn to [write your own plugin](../plugins/writing-a-plugin.en.md)