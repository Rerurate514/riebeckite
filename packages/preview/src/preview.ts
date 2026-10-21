import {
  Pipeline,
  PluginRuntime,
  type RiebeckitePlugin,
} from "@riebeckite/core";
import rehypeParse from "rehype-parse";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import type { PreviewDiagnostic } from "./diagnostic.js";
import {
  createPreviewRegistry,
  type PreviewPlugin,
  type PreviewRegistry,
} from "./registry.js";

const PREVIEW_SLUG = "__preview__";

export type PreviewResult = {
  readonly html: string;
  readonly diagnostics: readonly PreviewDiagnostic[];
};

export type PreviewRenderInput = {
  readonly markdown?: string;
  readonly pluginId?: string;
  readonly options?: unknown;
};

export type CreatePreviewOptions = {
  readonly registry?: PreviewRegistry;
  readonly plugins?: readonly PreviewPlugin[];
  readonly fixture?: string;
  readonly pluginId?: string;
};

export type PreviewSession = {
  render(input: PreviewRenderInput): Promise<PreviewResult>;
  dispose(): Promise<void>;
};

export function createPreview(options: CreatePreviewOptions = {}): PreviewSession {
  const registry =
    options.registry ?? createPreviewRegistry({ plugins: options.plugins });
  const initialFixture = options.fixture
    ? registry.fixture(options.fixture)
    : undefined;
  let runtime: PluginRuntime | undefined;
  let pipeline: Pipeline | undefined;
  let activePluginId: string | undefined;
  let activeOptions: unknown;
  let disposed = false;
  const contentIndex = new Map([[PREVIEW_SLUG, PREVIEW_SLUG]]);
  const permalinks = new Map([[PREVIEW_SLUG, "/preview/"]]);

  return {
    async render(input) {
      if (disposed) return failedResult("preview-disposed", "Preview session is disposed.");
      const pluginId = input.pluginId ?? options.pluginId;
      const markdown = input.markdown ?? initialFixture?.markdown ?? "";
      const plugin = pluginId ? registry.plugin(pluginId) : undefined;

      if (pluginId && !plugin) {
        return failedResult(
          "unknown-plugin",
          `Preview plugin "${pluginId}" is not registered.`,
          pluginId,
        );
      }
      if (plugin && plugin.availability !== "browser") {
        return failedResult(
          "plugin-unavailable",
          `Preview plugin "${plugin.id}" is not available in the browser.`,
          plugin.id,
        );
      }
      if (!isJsonValue(input.options)) {
        return failedResult(
          "invalid-options",
          "Preview plugin options must be JSON-serializable.",
          plugin?.id,
        );
      }

      try {
        if (
          runtime === undefined ||
          activePluginId !== plugin?.id ||
          !sameJsonValue(activeOptions, input.options)
        ) {
          await runtime?.dispose(contentIndex);
          const plugins = plugin ? [createPlugin(plugin, input.options)] : [];
          runtime = new PluginRuntime({ plugins });
          pipeline = new Pipeline(contentIndex, permalinks, undefined, { plugins });
          activePluginId = plugin?.id;
          activeOptions = input.options;
        }

        await runtime.startBuild(contentIndex);
        await runtime.runContentLoaded(PREVIEW_SLUG, markdown, contentIndex);
        const content = await pipeline.execute(markdown, { sourceSlug: PREVIEW_SLUG });
        await runtime.runPostHook(
          "onPostParsed",
          PREVIEW_SLUG,
          markdown,
          content,
          contentIndex,
        );
        await runtime.runPostHook(
          "onPostProcessed",
          PREVIEW_SLUG,
          markdown,
          content,
          contentIndex,
        );

        return {
          html: await sanitizeHtml(content.html),
          diagnostics: [
            ...runtime.getDiagnostics(),
            ...(await runtime.collectDiagnostics(contentIndex)),
          ].map((diagnostic) => ({
            code: diagnostic.code,
            severity: diagnostic.severity,
            message: diagnostic.message,
            pluginId: diagnostic.pluginName,
          })),
        };
      } catch (error) {
        if (error instanceof InvalidPluginOptionsError) {
          return failedResult(
            "invalid-options",
            "The selected plugin options are invalid.",
            plugin?.id,
          );
        }
        return failedResult(
          "render-failed",
          "The preview could not be rendered. Check the selected plugin options.",
          plugin?.id,
        );
      }
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      await runtime?.dispose(contentIndex);
      runtime = undefined;
      pipeline = undefined;
    },
  };
}

function createPlugin(
  preview: PreviewPlugin,
  options: unknown,
): RiebeckitePlugin {
  const plugin = preview.create(options);
  const issues = plugin.validateOptions?.(plugin.options);
  if (issues && issues.length > 0) {
    throw new InvalidPluginOptionsError();
  }
  return plugin;
}

class InvalidPluginOptionsError extends Error {}

function failedResult(
  code: string,
  message: string,
  pluginId?: string,
): PreviewResult {
  return {
    html: "",
    diagnostics: [{ code, severity: "error", message, pluginId }],
  };
}

async function sanitizeHtml(html: string): Promise<string> {
  const schema = {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      "*": [
        ...(defaultSchema.attributes["*"] ?? []),
        "dataCodeTabs",
        "dataCodeTabsLabel",
        "dataCodeTabsPanel",
        "dataCodeTabsSync",
        "dataCodeTabsTab",
        "dataActive",
      ],
    },
  };
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .process(html);
  return String(file.value);
}

function isJsonValue(value: unknown, seen = new Set<object>()): boolean {
  if (
    value === undefined ||
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || seen.has(value)) return false;
  if (Object.getPrototypeOf(value) !== Object.prototype && !Array.isArray(value)) {
    return false;
  }
  seen.add(value);
  const valid = Object.values(value).every((item) => isJsonValue(item, seen));
  seen.delete(value);
  return valid;
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
