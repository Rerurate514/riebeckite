export const contentSource = `---
publish: true
title: Ownership
---

A site should remain understandable after its framework changes.

See also: [[architecture]]`;

export const applicationCode = `import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { highlight } from "@riebeckite/plugin-highlight";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  content: { directory: "../vault" },
  theme: minimalTheme(),
  plugins: [obsidianMarkdown(), highlight()],
});`;

export const projectStructure = `my-site/
├── app/
├── content/
├── riebeckite.config.ts
└── package.json`;
