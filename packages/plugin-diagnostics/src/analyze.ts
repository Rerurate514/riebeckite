import type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
} from "@riebeckite/core";
import { getNoteTitle, hasField } from "./frontmatter.js";
import { LineMapper } from "./location.js";
import { extractMarkdownReferences } from "./markdown_links.js";
import type { AnalyzerContentConfig, DiagnosticsOptions } from "./types.js";
import {
  fragmentExists,
  getExtension,
  getWikilinkMatches,
  isAssetTarget,
  isImageTarget,
  resolveLocalReference,
  resolveVaultRelative,
  resolveWikilinkTarget,
  type ScannedNote,
  type ScanResult,
  scanVault,
} from "./vault.js";

const PLUGIN_NAME = "diagnostics";

const DEFAULT_SEVERITY: Record<string, DiagnosticSeverity> = {
  "broken-wikilink": "error",
  "broken-image": "error",
  "broken-link": "error",
  "unused-asset": "warning",
  "orphan-note": "info",
  "missing-frontmatter": "warning",
  "publish-conflict": "warning",
  "duplicate-title": "warning",
  "slug-collision": "error",
  "excluded-public": "warning",
  "internal-error": "error",
};

type NoteLocation = {
  slug?: string;
  filePath?: string;
};

type AnalysisState = {
  referencedAssets: Set<string>;
  incoming: Map<string, Set<string>>;
};

type NormalizedOptions = {
  reportUnusedAssets: boolean;
  reportOrphans: boolean;
  requiredFrontmatter: string[];
  severity: Partial<Record<string, DiagnosticSeverity>>;
};

export async function analyzeContent(
  config: AnalyzerContentConfig,
  options: DiagnosticsOptions = {},
): Promise<Diagnostic[]> {
  const source = await scanVault(config);
  const opts = normalizeOptions(options);
  const state: AnalysisState = {
    referencedAssets: new Set<string>(),
    incoming: new Map<string, Set<string>>(),
  };
  const diagnostics: Diagnostic[] = [];

  for (const note of source.includedNotes) {
    checkWikilinks(note, source, state, opts, diagnostics);
    checkMarkdownReferences(note, source, state, opts, diagnostics);
    checkFrontmatter(note, source, state, opts, diagnostics);
  }

  checkSlugCollisions(source, opts, diagnostics);
  checkDuplicateTitles(source, opts, diagnostics);
  checkOrphans(source, state, opts, diagnostics);
  checkUnusedAssets(source, state, opts, diagnostics);
  checkExcludedPublic(source, opts, diagnostics);

  return diagnostics;
}

function checkWikilinks(
  note: ScannedNote,
  source: ScanResult,
  state: AnalysisState,
  opts: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  const position = new LineMapper(note.markdown);
  for (const match of getWikilinkMatches(note.markdown)) {
    const { line, column } = position.positionAt(match.index);
    const location: NoteLocation = {
      slug: note.slug,
      filePath: note.relativePath,
    };
    const rawTarget = match.target;
    const resolved = resolveWikilinkTarget(rawTarget, source.targetIndex);

    if (!resolved) {
      const targetIsImage = isImageTarget(rawTarget);
      const targetIsAsset = isAssetTarget(rawTarget);
      const code =
        targetIsImage || match.embed ? "broken-image" : "broken-wikilink";
      const verb = targetIsAsset || match.embed ? "embed" : "link";
      push(
        diagnostics,
        opts,
        location,
        code,
        `wikilink ${verb} "[[${rawTarget}]]" does not resolve to any published note or asset`,
        rawTarget,
        targetIsAsset || match.embed
          ? "fix the asset path or add the asset to the vault"
          : "create the target note or fix the link",
        line,
        column,
      );
      continue;
    }

    if (resolved.kind === "note") {
      if (match.fragment) {
        const targetNote = source.noteBySlug.get(resolved.value);
        if (targetNote && !fragmentExists(targetNote, match.fragment)) {
          push(
            diagnostics,
            opts,
            location,
            "broken-wikilink",
            `wikilink fragment "#${match.fragment}" does not exist in "${resolved.value}"`,
            `${resolved.value}#${match.fragment}`,
            "fix the fragment to an existing heading or block id",
            line,
            column,
          );
        }
      }
      if (resolved.value !== note.slug) {
        addIncoming(state, resolved.value, note.slug);
      }
      continue;
    }

    if (resolved.kind === "image" || resolved.kind === "attachment") {
      state.referencedAssets.add(resolved.value);
    }
  }
}

function checkMarkdownReferences(
  note: ScannedNote,
  source: ScanResult,
  state: AnalysisState,
  opts: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  for (const reference of extractMarkdownReferences(note.markdown)) {
    const resolved = resolveLocalReference(note.slug, reference.url);
    if (!resolved) continue;

    const location: NoteLocation = {
      slug: note.slug,
      filePath: note.relativePath,
    };
    const extension = getExtension(resolved);

    if (reference.kind === "image") {
      if (source.assetPaths.has(resolved)) {
        state.referencedAssets.add(resolved);
      } else if (source.filePaths.has(resolved)) {
        state.referencedAssets.add(resolved);
      } else {
        push(
          diagnostics,
          opts,
          location,
          "broken-image",
          `image "${reference.url}" does not exist`,
          reference.url,
          "fix the image path or add the image to the vault",
          reference.line,
          reference.column,
        );
      }
      continue;
    }

    if (extension === "md") {
      const targetSlug = resolved.slice(0, -3);
      if (source.noteSlugs.has(targetSlug)) {
        if (targetSlug !== note.slug) {
          addIncoming(state, targetSlug, note.slug);
        }
      } else if (source.filePaths.has(resolved)) {
        push(
          diagnostics,
          opts,
          location,
          "broken-link",
          `link "${reference.url}" points to an excluded note that will not be published`,
          reference.url,
          "link to a published note or remove the link",
          reference.line,
          reference.column,
        );
      } else {
        push(
          diagnostics,
          opts,
          location,
          "broken-link",
          `link "${reference.url}" points to a missing note`,
          reference.url,
          "fix the link to an existing note",
          reference.line,
          reference.column,
        );
      }
      continue;
    }

    if (isImageTarget(resolved)) {
      if (source.assetPaths.has(resolved)) {
        state.referencedAssets.add(resolved);
      } else {
        push(
          diagnostics,
          opts,
          location,
          "broken-image",
          `image link "${reference.url}" does not exist`,
          reference.url,
          "fix the image path or add the image to the vault",
          reference.line,
          reference.column,
        );
      }
      continue;
    }

    if (!source.filePaths.has(resolved)) {
      push(
        diagnostics,
        opts,
        location,
        "broken-link",
        `link "${reference.url}" points to a missing file`,
        reference.url,
        "fix the link to an existing file",
        reference.line,
        reference.column,
      );
    }
  }
}

function checkFrontmatter(
  note: ScannedNote,
  source: ScanResult,
  state: AnalysisState,
  opts: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  const location: NoteLocation = {
    slug: note.slug,
    filePath: note.relativePath,
  };
  const values = note.fm.values;

  if (!note.fm.hasFrontmatter) {
    push(
      diagnostics,
      opts,
      location,
      "missing-frontmatter",
      "note has no frontmatter",
      note.slug,
      "add frontmatter with the required fields",
    );
  } else if (opts.requiredFrontmatter.length > 0) {
    for (const field of opts.requiredFrontmatter) {
      if (hasField(values, field)) continue;
      push(
        diagnostics,
        opts,
        location,
        "missing-frontmatter",
        `missing required frontmatter field "${field}"`,
        field,
        `add "${field}" to the frontmatter`,
      );
    }
  }

  if (values.publish === true) {
    if (values.draft === true) {
      push(
        diagnostics,
        opts,
        location,
        "publish-conflict",
        "frontmatter sets both publish: true and draft: true",
        note.slug,
        "set only one of publish or draft",
      );
    }
    if (values.private === true) {
      push(
        diagnostics,
        opts,
        location,
        "publish-conflict",
        "frontmatter sets both publish: true and private: true",
        note.slug,
        "set only one of publish or private",
      );
    }
  }

  for (const field of ["image", "ogImage"]) {
    const raw = values[field];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const resolved =
      resolveLocalReference(note.slug, raw) ?? resolveVaultRelative(raw);
    if (resolved && source.assetPaths.has(resolved)) {
      state.referencedAssets.add(resolved);
    }
  }
}

function checkSlugCollisions(
  source: ScanResult,
  opts: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  const byKey = new Map<string, ScannedNote[]>();
  for (const note of source.includedNotes) {
    const key = note.slug.toLowerCase();
    const group = byKey.get(key) ?? [];
    group.push(note);
    byKey.set(key, group);
  }

  for (const [key, notes] of byKey) {
    if (notes.length < 2) continue;
    const others = notes.map((note) => note.slug).join(", ");
    for (const note of notes) {
      push(
        diagnostics,
        opts,
        { slug: note.slug, filePath: note.relativePath },
        "slug-collision",
        `slug "${note.slug}" collides with ${others} case-insensitively`,
        key,
        "rename one of the notes to avoid the collision",
      );
    }
  }
}

function checkDuplicateTitles(
  source: ScanResult,
  opts: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  const byTitle = new Map<string, ScannedNote[]>();
  for (const note of source.includedNotes) {
    if (!note.published) continue;
    const title = getNoteTitle(note.fm.values, note.slug);
    const key = title.toLowerCase();
    const group = byTitle.get(key) ?? [];
    group.push(note);
    byTitle.set(key, group);
  }

  for (const [title, notes] of byTitle) {
    if (notes.length < 2) continue;
    const slugs = notes.map((note) => note.slug).join(", ");
    for (const note of notes) {
      push(
        diagnostics,
        opts,
        { slug: note.slug, filePath: note.relativePath },
        "duplicate-title",
        `title "${title}" is used by multiple published notes: ${slugs}`,
        typeof notes[0]?.fm.values.title === "string"
          ? notes[0].fm.values.title
          : title,
        "rename the title or the note",
      );
    }
  }
}

function checkOrphans(
  source: ScanResult,
  state: AnalysisState,
  opts: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  if (!opts.reportOrphans) return;

  for (const note of source.includedNotes) {
    if (!note.published) continue;
    if (note.slug === "index") continue;
    const incoming = state.incoming.get(note.slug) ?? new Set<string>();
    if (incoming.size > 0) continue;
    push(
      diagnostics,
      opts,
      { slug: note.slug, filePath: note.relativePath },
      "orphan-note",
      "published note has no incoming links",
      note.slug,
      "link to this note from another note",
    );
  }
}

function checkUnusedAssets(
  source: ScanResult,
  state: AnalysisState,
  opts: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  if (!opts.reportUnusedAssets) return;

  for (const asset of source.assets) {
    if (state.referencedAssets.has(asset.relativePath)) continue;
    push(
      diagnostics,
      opts,
      { filePath: asset.relativePath },
      "unused-asset",
      `image "${asset.relativePath}" is never referenced by any note`,
      asset.relativePath,
      "reference the image from a note or remove it",
    );
  }
}

function checkExcludedPublic(
  source: ScanResult,
  opts: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  for (const note of source.excludedNotes) {
    if (note.fm.values.publish !== true) continue;
    push(
      diagnostics,
      opts,
      { slug: note.slug, filePath: note.relativePath },
      "excluded-public",
      `excluded note "${note.slug}" is marked publish: true`,
      note.slug,
      "unset publish or move the note outside of the excluded directory",
    );
  }
}

function addIncoming(state: AnalysisState, target: string, source: string) {
  const sources = state.incoming.get(target) ?? new Set<string>();
  sources.add(source);
  state.incoming.set(target, sources);
}

function push(
  diagnostics: Diagnostic[],
  opts: NormalizedOptions,
  location: NoteLocation,
  code: DiagnosticCode,
  message: string,
  target?: string,
  suggestion?: string,
  line?: number,
  column?: number,
) {
  diagnostics.push({
    pluginName: PLUGIN_NAME,
    code,
    severity: severityFor(opts, code),
    message,
    slug: location.slug,
    filePath: location.filePath,
    line,
    column,
    target,
    suggestion,
  });
}

function severityFor(
  opts: NormalizedOptions,
  code: DiagnosticCode,
): DiagnosticSeverity {
  return opts.severity[code] ?? DEFAULT_SEVERITY[code] ?? "warning";
}

function normalizeOptions(options: DiagnosticsOptions): NormalizedOptions {
  return {
    reportUnusedAssets: options.reportUnusedAssets ?? false,
    reportOrphans: options.reportOrphans ?? false,
    requiredFrontmatter: options.requiredFrontmatter ?? [],
    severity: options.severity ?? {},
  };
}
