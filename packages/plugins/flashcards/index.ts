import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { resolveFlashcardsOptions } from "./src/options.js";
import { remarkFlashcards } from "./src/remark.js";
import { createFlashcardsRuntime } from "./src/runtime.js";
import type { FlashcardsOptions } from "./src/types.js";

export { initFlashcards } from "./src/init.js";
export {
  DEFAULT_FLASHCARDS_CLASS,
  DEFAULT_FLASHCARDS_LANGUAGE,
  resolveFlashcardsOptions,
} from "./src/options.js";
export { parseFlashcards, splitFlashcardGroups } from "./src/parse.js";
export {
  createFlashcardsPlaceholder,
  createFlashcardsPlaceholderPattern,
  decodeFlashcardsSource,
  encodeFlashcardsSource,
  FLASHCARDS_ATTRIBUTE,
} from "./src/placeholder.js";
export { remarkFlashcards } from "./src/remark.js";
export {
  renderFlashcards,
  renderFlashcardsFallback,
  renderFlashcardsPayload,
} from "./src/render.js";
export type { FlashcardsRuntime } from "./src/runtime.js";
export { createFlashcardsRuntime } from "./src/runtime.js";
export type {
  FlashcardsCard,
  FlashcardsOptions,
  FlashcardsParseFailure,
  FlashcardsParseResult,
  FlashcardsParseSuccess,
  FlashcardsPayload,
  ResolvedFlashcardsOptions,
} from "./src/types.js";

export function flashcards(options: FlashcardsOptions = {}) {
  const resolved = resolveFlashcardsOptions(options);
  const runtime = createFlashcardsRuntime(options);

  return definePlugin({
    name: "flashcards",
    processedContentCache: {
      version: "flashcards-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateFlashcardsOptions,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkFlashcards, { language: resolved.language });
    },
    onPostProcessed: (context) => {
      runtime.track(context.slug, context.content);
    },
    onManifestCreated: (context) => {
      runtime.resolve(context.manifest, context.diagnostics);
    },
    assets: [createStyleAsset("flashcards")],
    clientEntries: [createClientEntry("flashcards", "initFlashcards")],
  });
}

export const flashcardsPlugin = flashcards;

function validateFlashcardsOptions(
  options: FlashcardsOptions | undefined,
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
  if (options.shuffle !== undefined && typeof options.shuffle !== "boolean") {
    issues.push({ path: "shuffle", message: "Expected a boolean." });
  }
  if (options.fallback !== undefined && typeof options.fallback !== "boolean") {
    issues.push({ path: "fallback", message: "Expected a boolean." });
  }
  return issues;
}
