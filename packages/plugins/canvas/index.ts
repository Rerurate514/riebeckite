import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
  getExtension,
  readContentSourceEntry,
} from "@riebeckite/core";
import { parseCanvas, resolveCanvasOptions } from "./src/parse.js";
import { remarkCanvas } from "./src/remark.js";
import { renderCanvas } from "./src/render.js";
import { createCanvasResolver } from "./src/resolve.js";
import { createCanvasRuntime } from "./src/runtime.js";
import type { CanvasOptions, CanvasRenderMode } from "./src/types.js";

export {
  buildCanvasLayout,
  isRenderMode,
  parseCanvas,
  resolveCanvasOptions,
} from "./src/parse.js";
export type { RenderCanvasInput } from "./src/render.js";
export { CANVAS_NOTE_HREF } from "./src/render.js";
export type {
  CanvasDocument,
  CanvasEdge,
  CanvasEdgeSide,
  CanvasFileLink,
  CanvasLayout,
  CanvasLayoutEdge,
  CanvasLayoutNode,
  CanvasNode,
  CanvasNodeType,
  CanvasOptions,
  CanvasRenderMode,
  CanvasResolver,
  ResolvedCanvasOptions,
} from "./src/types.js";

const PLUGIN_NAME = "canvas";

export function canvas(options: CanvasOptions = {}) {
  const resolved = resolveCanvasOptions(options);
  const runtime = createCanvasRuntime();

  return definePlugin({
    name: PLUGIN_NAME,
    order: -15,
    processedContentCache: {
      version: "canvas-v1",
      dependencyMode: "unsafe",
    },
    options,
    validateOptions: validateCanvasOptions,
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(remarkCanvas, {
        options: resolved,
        contentIndex: context.contentIndex,
        contentSource: context.contentSource,
      });
    },
    renderers: [
      {
        name: "canvas-embed",
        render: async (context) => {
          if (context.kind !== "attachment") return null;
          if (!context.embed) return null;
          if (getExtension(context.path) !== "canvas") return null;
          if (!context.contentSource) return null;

          const raw = await readContentSourceEntry(
            context.contentSource,
            context.path,
          );
          if (raw === null) return null;

          const json =
            typeof raw === "string" ? raw : new TextDecoder().decode(raw);
          const document = parseCanvas(json);
          if (!document) {
            context.diagnostics.push({
              code: "canvas-invalid",
              severity: "warning",
              pluginName: PLUGIN_NAME,
              message: `Canvas \`${context.path}\` is not valid JSON Canvas.`,
              target: context.path,
            });
            return null;
          }

          return renderCanvas({
            document,
            source: context.path,
            options: resolved,
            resolver: createCanvasResolver(context.contentIndex),
          });
        },
      },
    ],
    onManifestCreated: (context) => {
      runtime.resolve(context.manifest);
    },
    assets: [createStyleAsset(PLUGIN_NAME)],
    clientEntries: [createClientEntry(PLUGIN_NAME, "initCanvas")],
  });
}

export const canvasPlugin = canvas;

function validateCanvasOptions(
  options: CanvasOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.className !== undefined &&
    (typeof options.className !== "string" || options.className.trim() === "")
  ) {
    issues.push({ path: "className", message: "Expected a non-empty string." });
  }
  if (
    options.language !== undefined &&
    (typeof options.language !== "string" || options.language.trim() === "")
  ) {
    issues.push({ path: "language", message: "Expected a non-empty string." });
  }
  if (!isCanvasRenderMode(options.render)) {
    issues.push({
      path: "render",
      message: 'Expected "static", "client", or "both".',
    });
  }
  if (options.height !== undefined && !isCanvasHeight(options.height)) {
    issues.push({
      path: "height",
      message: "Expected a positive number or a non-empty CSS length string.",
    });
  }
  if (
    options.maxNodes !== undefined &&
    (!Number.isInteger(options.maxNodes) || options.maxNodes <= 0)
  ) {
    issues.push({ path: "maxNodes", message: "Expected a positive integer." });
  }
  return issues;
}

function isCanvasRenderMode(value: CanvasRenderMode | undefined): boolean {
  return (
    value === undefined ||
    value === "static" ||
    value === "client" ||
    value === "both"
  );
}

function isCanvasHeight(value: number | string): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  return value.trim() !== "";
}
