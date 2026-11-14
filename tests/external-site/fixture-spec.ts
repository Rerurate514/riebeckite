import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectWorkspacePackageClosure,
  type PackageSpec,
} from "@riebeckite/test/e2e";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const fixtureRoot = path.join(here, "fixture", "site");
const starterManifest = path.join(
  repoRoot,
  "packages",
  "create-riebeckite",
  "test",
  "__golden__",
  "scaffold",
  "starter",
  "package.json",
);

type Manifest = {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
};

function packageNamesFromFixture(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return packageNamesFromFixture(file);
    if (!entry.isFile()) return [];
    return [
      ...fs
        .readFileSync(file, "utf8")
        .matchAll(/from\s+["'](@riebeckite\/[^/"']+)/g),
    ].map((match) => match[1] as string);
  });
}

function collectExternalSitePackages(): readonly PackageSpec[] {
  const starter = JSON.parse(
    fs.readFileSync(starterManifest, "utf8"),
  ) as Manifest;
  const starterPackages = [
    ...Object.keys(starter.dependencies ?? {}),
    ...Object.keys(starter.devDependencies ?? {}),
  ].filter((name) => name.startsWith("@riebeckite/"));
  return collectWorkspacePackageClosure(repoRoot, [
    ...packageNamesFromFixture(fixtureRoot),
    ...starterPackages,
  ]);
}

export const PACKAGES = collectExternalSitePackages();

export const HOME_MARKER = "RIEBECKITE_EXTERNAL_HOME_MARKER";
export const NOTE_MARKER = "RIEBECKITE_EXTERNAL_NOTE_MARKER";
export const QUERY_MARKER = "RIEBECKITE_EXTERNAL_QUERY_MARKER";
export const BASES_MARKER = "RIEBECKITE_EXTERNAL_BASES_MARKER";
export const DATAVIEW_NOTE_TITLE = "Dataview Alpha";
export const PROPERTY_MARKER = "RIEBECKITE_EXTERNAL_PROPERTY_MARKER";
export const KANBAN_MARKER = "RIEBECKITE_EXTERNAL_KANBAN_MARKER";
export const KANBAN_BLOCK_MARKER = "RIEBECKITE_EXTERNAL_KANBAN_BLOCK_MARKER";
export const SITE_COMPONENT_MARKER = "RIEBECKITE_SITE_COMPONENT_MARKER";
export const SITE_ISLAND_MARKER = "RIEBECKITE_SITE_ISLAND_MARKER";
export const MDX_MARKER = "RIEBECKITE_MDX_MARKER";
export const EXTERNAL_COMPONENT_MARKER = "RIEBECKITE_EXTERNAL_COMPONENT_MARKER";
export const MDX_COMPONENT_MARKER = "RIEBECKITE_MDX_COMPONENT_MARKER";
export const LOCAL_PLUGIN_MARKER = "RIEBECKITE_EXTERNAL_LOCAL_PLUGIN_MARKER";
export const LOCAL_PLUGIN_PAGE_MARKER =
  "RIEBECKITE_EXTERNAL_PLUGIN_PAGE_MARKER";
export const QR_MARKER = "RIEBECKITE_EXTERNAL_QR_MARKER";
export const MARKMAP_MARKER = "RIEBECKITE_EXTERNAL_MARKMAP_MARKER";
export const EXCALIBRAIN_MARKER = "RIEBECKITE_EXTERNAL_EXCALIBRAIN_MARKER";
export const PRIVATE_MARKER = "RIEBECKITE_EXTERNAL_PRIVATE_MARKER";
export const HOVER_PREVIEW_TITLE_MARKER = "Hover Preview Alpha Note";
export const FLASHCARDS_MARKER = "RIEBECKITE_EXTERNAL_FLASHCARDS_MARKER";
export const FLASHCARDS_CLIENT_IDENTIFIER = "rb-flashcards";
export const CODE_ANNOTATIONS_MARKER =
  "RIEBECKITE_EXTERNAL_CODE_ANNOTATIONS_MARKER";
export const SHORTCODE_MARKER = "RIEBECKITE_EXTERNAL_SHORTCODE_MARKER";
export const CANVAS_MARKER = "RIEBECKITE_EXTERNAL_CANVAS_MARKER";
export const RICHEMBED_MARKER = "RIEBECKITE_EXTERNAL_RICHEMBED_MARKER";
export const CHARTJS_MARKER = "RIEBECKITE_EXTERNAL_CHARTJS_MARKER";
export const CITATIONS_MARKER = "RIEBECKITE_EXTERNAL_CITATIONS_MARKER";
export const PLANTUML_MARKER = "RIEBECKITE_EXTERNAL_PLANTUML_MARKER";
export const ALIAS_MARKER = "RIEBECKITE_EXTERNAL_ALIAS_MARKER";
export const HIGHLIGHT_MARKER = "RIEBECKITE_EXTERNAL_HIGHLIGHT_MARKER";
export const SERIES_MARKER = "RIEBECKITE_EXTERNAL_SERIES_MARKER";
export const SERIES_PART_1_PERMALINK = "/notes/series-demo-1";
export const SERIES_PART_2_PERMALINK = "/notes/series-demo-2";
export const ANALYTICS_CONTENT_ID_ATTRIBUTE = "data-riebeckite-content-id";
export const ANALYTICS_CONTENT_ID = "external-fixture-home";
export const ANALYTICS_DEMO_CONTENT_ID = "analytics-demo";
export const ANALYTICS_PAGE_MARKER =
  "RIEBECKITE_EXTERNAL_ANALYTICS_PAGE_MARKER";
export const D2_MARKER = "RIEBECKITE_EXTERNAL_D2_MARKER";
export const GRAPHVIZ_MARKER = "RIEBECKITE_EXTERNAL_GRAPHVIZ_MARKER";
export const VEGALITE_MARKER = "RIEBECKITE_EXTERNAL_VEGALITE_MARKER";
export const WAVEDROM_MARKER = "RIEBECKITE_EXTERNAL_WAVEDROM_MARKER";
export const MARP_MARKER = "RIEBECKITE_EXTERNAL_MARP_MARKER";
export const SVG_MARKER = "RIEBECKITE_EXTERNAL_SVG_MARKER";
