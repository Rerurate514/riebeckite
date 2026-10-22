import { Pipeline, PluginRuntime } from "@riebeckite/core";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export type HomeRuntime = {
  readonly demoHtml: string;
  readonly codes: Record<
    "install" | "content" | "project" | "application" | "preview",
    string
  >;
};

const demoSource = `---
title: Hello
---

## Hello

My **first** note.

[[Getting started]]`;

export async function renderHomeRuntime(): Promise<HomeRuntime> {
  const plugins = [
    obsidianMarkdown(),
    codeEnhance({
      theme: { light: "github-light", dark: "github-dark" },
      lineNumbers: true,
      copyButton: true,
      filename: true,
      wrapToggle: true,
    }),
  ];
  const contentIndex = new Map([
    ["notes/hello", "notes/hello"],
    ["hello", "notes/hello"],
    ["getting started", "getting-started"],
    ["getting-started", "getting-started"],
  ]);
  const permalinks = new Map([
    ["notes/hello", "/notes/hello/"],
    ["getting-started", "/getting-started/"],
  ]);
  const runtime = new PluginRuntime({ plugins });
  const pipeline = new Pipeline(contentIndex, permalinks, undefined, {
    plugins,
  });

  try {
    await runtime.startBuild(contentIndex);
    const render = async (markdown: string, slug: string) => {
      await runtime.runContentLoaded(slug, markdown, contentIndex);
      const result = await pipeline.execute(markdown, { sourceSlug: slug });
      await runtime.runPostHook(
        "onPostParsed",
        slug,
        markdown,
        result,
        contentIndex,
      );
      await runtime.runPostHook(
        "onPostProcessed",
        slug,
        markdown,
        result,
        contentIndex,
      );
      return result.html;
    };

    return {
      demoHtml: await render(demoSource, "notes/hello"),
      codes: {
        install: await render(
          "```sh title=terminal\nnpx create-riebeckite\n```",
          "install",
        ),
        content: await render(contentCode, "content-example"),
        project: await render(projectCode, "project-example"),
        application: await render(applicationCode, "application-example"),
        preview: await render(previewCode, "preview-example"),
      },
    };
  } finally {
    await runtime.dispose(contentIndex);
  }
}

const contentCode = `\`\`\`md title=content/notes/ownership.md
---
title: Ownership
tags: [architecture]
---

# Ownership

[[Getting started]]
\`\`\``;

const projectCode = `\`\`\`text title=project
app/
content/
riebeckite.config.ts
\`\`\``;

const applicationCode = `\`\`\`ts title=riebeckite.config.ts
export default defineConfig({
  plugins: [obsidianMarkdown()],
  theme: defaultTheme(),
});
\`\`\``;

const previewCode = `\`\`\`sh title=terminal
riebeckite theme preview my-theme --no-open
riebeckite plugin dev ./extensions/my-plugin --no-open
\`\`\``;
