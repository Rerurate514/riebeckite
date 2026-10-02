import {
  type ConfigValidationIssue,
  type Diagnostic,
  definePlugin,
  readContentSourceEntry,
} from "@riebeckite/core";
import { remarkCitations } from "./src/remark.js";
import { createCitationState } from "./src/state.js";
import type { CitationsOptions } from "./src/types.js";

export { parseBibliography } from "./src/bibliography.js";
export { remarkCitations } from "./src/remark.js";
export type {
  BibliographyEntry,
  CitationOccurrence,
  CitationReference,
  CitationSyntax,
  CitationsOptions,
  ResolvedCitation,
} from "./src/types.js";

const PLUGIN_NAME = "citations";

export function citations(options: CitationsOptions = {}) {
  const state = createCitationState();

  return definePlugin({
    name: PLUGIN_NAME,
    processedContentCache: {
      version: "citations-v1",
      dependencyMode: "tracked",
    },
    options,
    validateOptions: validateCitationsOptions,
    buildStart: () => {
      state.bibliographies.clear();
      state.diagnostics.length = 0;
    },
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(remarkCitations, {
        ...options,
        sourceSlug: context.sourceSlug,
        contentSource: context.contentSource,
        diagnostics: state.diagnostics,
        loadBibliography: async (path: string) => {
          if (!context.contentSource) return null;
          const content = await readContentSourceEntry(
            context.contentSource,
            path,
          );
          if (content === null) return null;
          return typeof content === "string"
            ? content
            : new TextDecoder().decode(content);
        },
        cache: state.bibliographies,
      });
    },
    addDiagnostics: (): Diagnostic[] => state.diagnostics,
  });
}

export const citationsPlugin = citations;

function validateCitationsOptions(
  options: CitationsOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];
  const issues: ConfigValidationIssue[] = [];
  if (options.bibliography !== undefined) {
    const value = options.bibliography;
    const valid =
      typeof value === "string" ||
      (Array.isArray(value) && value.every((item) => typeof item === "string"));
    if (!valid) {
      issues.push({
        path: "bibliography",
        message: "Expected a bibliography path or an array of paths.",
      });
    }
  }
  if (
    options.referencesHeading !== undefined &&
    typeof options.referencesHeading !== "string"
  ) {
    issues.push({ path: "referencesHeading", message: "Expected a string." });
  }
  return issues;
}
