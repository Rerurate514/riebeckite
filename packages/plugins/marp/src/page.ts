import type {
  ContentManifest,
  ContentManifestEntry,
  PluginPage,
  PluginPageContext,
} from "@riebeckite/core";
import { isMarpDocument } from "./rehype.js";

export const MARP_SLIDES_BASE_PATH = "/slides";

export function marpSlidesPath(permalink: string): string {
  return `${MARP_SLIDES_BASE_PATH}${permalink}`.replace(/\/+$/, "");
}

export function listMarpDeckEntries(
  manifest: ContentManifest,
): ContentManifestEntry[] {
  return manifest.publicEntries.filter((entry) =>
    isMarpDocument(entry.frontmatter),
  );
}

export function listMarpSlidesPaths(
  manifest: ContentManifest,
): readonly string[] {
  return [
    ...new Set(
      listMarpDeckEntries(manifest).map((entry) =>
        marpSlidesPath(entry.permalink),
      ),
    ),
  ];
}

export function findMarpDeckEntry(
  manifest: ContentManifest,
  pathname: string,
): ContentManifestEntry | null {
  const normalized = pathname.replace(/\/+$/, "");
  return (
    listMarpDeckEntries(manifest).find(
      (entry) =>
        marpSlidesPath(entry.permalink).replace(/\/+$/, "") === normalized,
    ) ?? null
  );
}

export function resolveMarpSlidesPage(
  context: PluginPageContext,
): PluginPage | null {
  const entry = findMarpDeckEntry(context.manifest, context.pathname);
  if (!entry) return null;
  return {
    type: "marp-slides",
    pathname: context.pathname,
    title: entry.title,
    body: `<div class="rb-marp-slides">${entry.html}</div>`,
    ...(entry.publicLocation.language === undefined
      ? {}
      : { language: entry.publicLocation.language }),
  };
}
