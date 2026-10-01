import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { createMermaidRenderSession } from "./src/render-static.js";
import type {
  HastNode,
  MermaidOptions,
  MermaidRenderSession,
} from "./src/types.js";

export type {
  MermaidClientOptions,
  MermaidOptions,
  MermaidRenderMode,
  MermaidRenderSession,
  MermaidTheme,
} from "./src/types.js";

export function mermaid(options: MermaidOptions = {}) {
  // One render session per plugin instance: the browser is launched lazily
  // on the first build render and closed when the build ends.
  const session: MermaidRenderSession = createMermaidRenderSession();
  return definePlugin({
    name: "mermaid",
    order: -10,
    options,
    validateOptions: validateMermaidOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeMermaidLazy, { options, session });
    },
    buildEnd: async () => {
      await session.dispose();
    },
    dispose: async () => {
      await session.dispose();
    },
    assets: [createStyleAsset("mermaid")],
    clientEntries: [createClientEntry("mermaid", "initMermaidDiagrams")],
  });
}

function validateMermaidOptions(
  options: MermaidOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.render !== undefined &&
    options.render !== "build" &&
    options.render !== "client" &&
    options.render !== "both"
  ) {
    issues.push({
      path: "render",
      message: 'Expected "build", "client", or "both".',
    });
  }
  if (!isMermaidTheme(options.theme)) {
    issues.push({
      path: "theme",
      message:
        "Expected a theme string or an object with light and dark strings.",
    });
  }
  for (const key of ["caption", "fallback"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }
  return issues;
}

function isMermaidTheme(value: unknown): boolean {
  return (
    value === undefined ||
    typeof value === "string" ||
    (typeof value === "object" &&
      value !== null &&
      "light" in value &&
      "dark" in value &&
      typeof value.light === "string" &&
      typeof value.dark === "string")
  );
}

type RehypeMermaidLazySettings = {
  options: MermaidOptions;
  session: MermaidRenderSession;
};

function rehypeMermaidLazy(settings: RehypeMermaidLazySettings) {
  return async (tree: HastNode, file: unknown) => {
    const { rehypeMermaid } = await import("./src/rehype.js");
    const transformer = rehypeMermaid(settings.options, settings.session) as (
      tree: HastNode,
      file: unknown,
    ) => Promise<void> | void;
    await transformer(tree, file);
  };
}
