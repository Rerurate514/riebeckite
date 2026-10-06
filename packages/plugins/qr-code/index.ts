import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import {
  DEFAULT_QR_CODE_OPTIONS,
  QR_CODE_LEVELS,
  resolveQrCodeOptions,
} from "./src/options.js";
import type { HastNode, QrCodeOptions } from "./src/types.js";

export { resolveQrCodeOptions } from "./src/options.js";
export { buildQrSvg } from "./src/render.js";
export type {
  QrBuildResult,
  QrCodeLevel,
  QrCodeOptions,
  ResolvedQrCodeOptions,
} from "./src/types.js";

const PLUGIN_NAME = "qr-code";

export function qrCode(options: QrCodeOptions = {}) {
  return definePlugin({
    name: PLUGIN_NAME,
    order: -10,
    processedContentCache: {
      version: "qr-code-v2",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateQrCodeOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeQrCodeLazy, options);
    },
    assets: [createStyleAsset(PLUGIN_NAME)],
  });
}

export const qrCodePlugin = qrCode;

function validateQrCodeOptions(
  options: QrCodeOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];
  const issues: ConfigValidationIssue[] = [];

  if (
    options.level !== undefined &&
    !(QR_CODE_LEVELS as readonly string[]).includes(options.level)
  ) {
    issues.push({
      path: "level",
      message: `Expected one of: ${QR_CODE_LEVELS.join(", ")}.`,
    });
  }

  for (const key of ["margin", "width", "size"] as const) {
    const value = options[key];
    if (value === undefined) continue;
    if (
      !Number.isInteger(value) ||
      value < 0 ||
      (key !== "margin" && value === 0)
    ) {
      issues.push({
        path: key,
        message:
          key === "margin"
            ? "Expected a non-negative integer."
            : "Expected a positive integer.",
      });
    }
  }

  for (const key of ["dark", "light", "className", "language"] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }

  for (const key of ["caption"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }

  return issues;
}

function rehypeQrCodeLazy(options: QrCodeOptions = {}) {
  const resolved = resolveQrCodeOptions(options);
  return async (tree: HastNode, file: unknown) => {
    const { rehypeQrCode } = await import("./src/rehype.js");
    await rehypeQrCode(resolved)(tree, file);
  };
}

export { DEFAULT_QR_CODE_OPTIONS };
