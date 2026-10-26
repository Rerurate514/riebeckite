import { Pipeline, PluginRuntime } from "@riebeckite/core";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export type HomeRuntime = {
  readonly demoHtml: string;
  readonly codes: Record<"install" | "application", string>;
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
        application: await render(applicationCode, "application-example"),
      },
    };
  } finally {
    await runtime.dispose(contentIndex);
  }
}

const applicationCode = `\`\`\`sh title=terminal
npm install @riebeckite/plugin-search
\`\`\`

\`\`\`ts title=riebeckite.config.ts
import { search } from "@riebeckite/plugin-search";

export default defineConfig({
  plugins: [search()],
});
\`\`\``;
