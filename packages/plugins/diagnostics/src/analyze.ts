import type { Diagnostic } from "@riebeckite/core";
import { checkAnalyticsCoverage } from "./checks/analytics.js";
import { checkUnusedAssets } from "./checks/assets.js";
import { checkContentIdIntegrity } from "./checks/content_identity.js";
import { checkExcludedPublic } from "./checks/excluded_public.js";
import { checkFrontmatter } from "./checks/frontmatter.js";
import { checkMarkdownReferences } from "./checks/markdown_references.js";
import {
  checkDuplicateTitles,
  checkSlugCollisions,
} from "./checks/note_metadata.js";
import { checkOrphans } from "./checks/orphans.js";
import { checkPublishBoundary } from "./checks/publish_boundary.js";
import { createAnalysisState, normalizeOptions } from "./checks/shared.js";
import { checkWikilinks } from "./checks/wikilinks.js";
import type { AnalyzerContentConfig, DiagnosticsOptions } from "./types.js";
import { scanVault } from "./vault.js";

export async function analyzeContent(
  config: AnalyzerContentConfig,
  options: DiagnosticsOptions = {},
): Promise<Diagnostic[]> {
  const source = await scanVault(config);
  const normalizedOptions = normalizeOptions(options);
  const state = createAnalysisState();
  const diagnostics: Diagnostic[] = [];

  for (const note of source.includedNotes) {
    checkWikilinks(note, source, state, normalizedOptions, diagnostics);
    checkMarkdownReferences(
      note,
      source,
      state,
      normalizedOptions,
      diagnostics,
    );
    checkFrontmatter(note, source, state, normalizedOptions, diagnostics);
  }

  checkSlugCollisions(source, normalizedOptions, diagnostics);
  checkDuplicateTitles(source, normalizedOptions, diagnostics);
  checkContentIdIntegrity(source, normalizedOptions, diagnostics);
  checkOrphans(source, state, normalizedOptions, diagnostics);
  checkUnusedAssets(source, state, normalizedOptions, diagnostics);
  checkExcludedPublic(source, normalizedOptions, diagnostics);
  checkPublishBoundary(source, normalizedOptions, diagnostics);
  checkAnalyticsCoverage(source, normalizedOptions, diagnostics);

  return diagnostics;
}
