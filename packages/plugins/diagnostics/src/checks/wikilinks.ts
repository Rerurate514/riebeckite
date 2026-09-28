import type { Diagnostic } from "@riebeckite/core";
import { LineMapper } from "../location.js";
import {
  fragmentExists,
  getWikilinkMatches,
  isAssetTarget,
  isImageTarget,
  resolveWikilinkTarget,
  type ScannedNote,
  type ScanResult,
} from "../vault.js";
import {
  type AnalysisState,
  addIncoming,
  type NormalizedOptions,
  pushDiagnostic,
} from "./shared.js";

export function checkWikilinks(
  note: ScannedNote,
  source: ScanResult,
  state: AnalysisState,
  options: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  const position = new LineMapper(note.markdown);
  const location = { slug: note.slug, filePath: note.relativePath };

  for (const match of getWikilinkMatches(note.markdown)) {
    const { line, column } = position.positionAt(match.index);
    const rawTarget = match.target;
    const resolved = resolveWikilinkTarget(rawTarget, source.targetIndex);

    if (!resolved) {
      const targetIsImage = isImageTarget(rawTarget);
      const targetIsAsset = isAssetTarget(rawTarget);
      const code =
        targetIsImage || match.embed ? "broken-image" : "broken-wikilink";
      const verb = targetIsAsset || match.embed ? "embed" : "link";
      pushDiagnostic(
        diagnostics,
        options,
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
          pushDiagnostic(
            diagnostics,
            options,
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
      if (resolved.value !== note.slug)
        addIncoming(state, resolved.value, note.slug);
      continue;
    }

    if (resolved.kind === "image" || resolved.kind === "attachment") {
      state.referencedAssets.add(resolved.value);
    }
  }
}
