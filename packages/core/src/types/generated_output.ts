import { ATTACHMENTS_BASE_PATH } from "../content/attachment.js";
import type { OutputDependency } from "./output_dependency.js";

const ATTACHMENTS_NAMESPACE = ATTACHMENTS_BASE_PATH.replace(/^\/+/, "");
const STATIC_ASSETS_DIR = "assets";

export type GeneratedOutputContent = string | Uint8Array;

/**
 * A file a plugin wants written to the build output directory. Content is kept
 * in memory until the integration layer forwards it to the build tool, so
 * plugins never touch the filesystem themselves.
 */
export type GeneratedOutputInput = {
  /**
   * Output path relative to the build output directory, for example
   * `_redirects`, `.nojekyll` or `daily/feed.xml`.
   */
  path: string;
  content: GeneratedOutputContent;
  dependencies?: readonly OutputDependency[];
};

export type GeneratedOutput = GeneratedOutputInput & {
  /** Name of the plugin that registered the output. */
  owner: string;
};

export type GeneratedOutputSink = {
  emit(output: GeneratedOutputInput): void;
};

export function createUnavailableGeneratedOutputSink(): GeneratedOutputSink {
  return {
    emit() {
      throw new Error(
        "Generated output is available only during a build lifecycle.",
      );
    },
  };
}

/**
 * Normalizes a plugin-provided output path and rejects anything that could
 * escape the output directory or collide with reserved namespaces. Rejecting
 * (rather than silently rewriting) keeps `..` traversal from being laundered.
 */
export function normalizeGeneratedOutputPath(input: string): string {
  if (typeof input !== "string" || input.length === 0) {
    throw new Error("Generated output path must be a non-empty string.");
  }

  const replaced = input.replace(/\\/g, "/");
  if (replaced.includes("\0")) {
    throw new Error(
      `Generated output path must not contain a null byte: "${input}".`,
    );
  }
  if (
    replaced.startsWith("/") ||
    replaced.startsWith("~") ||
    /^[A-Za-z]:/.test(replaced)
  ) {
    throw new Error(`Generated output path must be relative: "${input}".`);
  }

  const segments = replaced.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    throw new Error(`Generated output path must not be empty: "${input}".`);
  }
  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      throw new Error(
        `Generated output path must not contain "." or ".." segments: "${input}".`,
      );
    }
  }

  const normalized = segments.join("/");
  if (
    normalized === STATIC_ASSETS_DIR ||
    normalized === ATTACHMENTS_NAMESPACE ||
    normalized.startsWith(`${ATTACHMENTS_NAMESPACE}/`)
  ) {
    throw new Error(
      `Generated output path must not conflict with the attachment namespace: "${input}".`,
    );
  }
  if (normalized === ".riebeckite" || normalized.startsWith(".riebeckite/")) {
    throw new Error(
      `Generated output path must not target internal Riebeckite files: "${input}".`,
    );
  }

  return normalized;
}
