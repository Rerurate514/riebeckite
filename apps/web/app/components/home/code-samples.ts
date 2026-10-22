export const contentSource = `---
publish: true
title: Ownership
---

A site should remain understandable after its framework changes.

See also: [[architecture]]`;

export const applicationCode = `import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  plugins: [obsidianMarkdown()],
});`;
