#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertDeclaredDependencies,
  assertNoMonorepoEscapeHatches,
  createLogger,
  type ExternalSiteE2EConfig,
  type ExternalSiteWorkspace,
  formatBytes,
  run,
  runCli,
  runExternalSiteE2E,
  walkFiles,
  writeFileDependencies,
} from "@riebeckite/test/e2e";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const fixtureRoot = path.join(here, "fixture");
const dependencyCheckScript = path.join(
  repoRoot,
  "scripts",
  "check_dependencies.mjs",
);
const logger = createLogger("external-site");

function fail(message: string): never {
  throw new Error(message);
}

import * as fixture from "./fixture-spec.js";
import { PACKAGES } from "./fixture-spec.js";

const {
  HOME_MARKER,
  NOTE_MARKER,
  QUERY_MARKER,
  BASES_MARKER,
  DATAVIEW_NOTE_TITLE,
  PROPERTY_MARKER,
  KANBAN_MARKER,
  KANBAN_BLOCK_MARKER,
  SITE_COMPONENT_MARKER,
  SITE_ISLAND_MARKER,
  LOCAL_PLUGIN_MARKER,
  LOCAL_PLUGIN_PAGE_MARKER,
  QR_MARKER,
  MARKMAP_MARKER,
  EXCALIBRAIN_MARKER,
  PRIVATE_MARKER,
  HOVER_PREVIEW_TITLE_MARKER,
  FLASHCARDS_MARKER,
  FLASHCARDS_CLIENT_IDENTIFIER,
  CODE_ANNOTATIONS_MARKER,
  SHORTCODE_MARKER,
  CANVAS_MARKER,
  RICHEMBED_MARKER,
  CHARTJS_MARKER,
  CITATIONS_MARKER,
  PLANTUML_MARKER,
  ALIAS_MARKER,
  HIGHLIGHT_MARKER,
  SERIES_MARKER,
  SERIES_PART_1_PERMALINK,
  SERIES_PART_2_PERMALINK,
  ANALYTICS_CONTENT_ID_ATTRIBUTE,
  ANALYTICS_CONTENT_ID,
  ANALYTICS_DEMO_CONTENT_ID,
  ANALYTICS_PAGE_MARKER,
  D2_MARKER,
  GRAPHVIZ_MARKER,
  VEGALITE_MARKER,
  WAVEDROM_MARKER,
  MARP_MARKER,
} = fixture;

const cliEntryFor = (siteDir: string): string =>
  path.join(
    siteDir,
    "node_modules",
    "@riebeckite",
    "cli",
    "bin",
    "riebeckite.mjs",
  );

function assertBuildOutput(siteDir: string, vaultDir: string): void {
  logger.step("checking generated site output");
  const distDir = path.join(siteDir, "dist");
  if (!fs.existsSync(distDir)) {
    fail("build did not create a dist/ directory");
  }

  const htmlFiles = walkFiles(distDir, (full) => full.endsWith(".html"));
  if (htmlFiles.length === 0) {
    fail("build did not emit any HTML files under dist/");
  }

  const combined = htmlFiles
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  if (!combined.includes(HOME_MARKER)) {
    fail(`generated HTML is missing the home marker (${HOME_MARKER})`);
  }
  if (!combined.includes(NOTE_MARKER)) {
    fail(`generated HTML is missing the note marker (${NOTE_MARKER})`);
  }
  if (!combined.includes(LOCAL_PLUGIN_PAGE_MARKER)) {
    fail("external plugin page was not emitted through the public page API");
  }
  if (!combined.includes(QUERY_MARKER)) {
    fail(`generated HTML is missing the query marker (${QUERY_MARKER})`);
  }
  if (!combined.includes(SITE_COMPONENT_MARKER)) {
    fail(
      `generated HTML is missing the site component (${SITE_COMPONENT_MARKER})`,
    );
  }
  if (!combined.includes(SITE_ISLAND_MARKER)) {
    fail(`generated HTML is missing the site island (${SITE_ISLAND_MARKER})`);
  }
  if (!combined.includes('class="rb-article fixture-article"')) {
    fail("site component did not compose the public Article primitive");
  }
  if (!combined.includes("rr-query__table")) {
    fail("generated HTML is missing the query plugin table output");
  }
  if (!combined.includes('class="rr-cardlink')) {
    fail("autocardlink plugin did not render a cardlink block");
  }
  if (!combined.includes('class="rr-cardlink__image"')) {
    fail("autocardlink plugin did not render the card preview image");
  }
  if (!combined.includes("data-rr-query-result")) {
    fail("query placeholder was not replaced with rendered output");
  }
  if (!combined.includes(BASES_MARKER)) {
    fail(`generated HTML is missing the bases marker (${BASES_MARKER})`);
  }
  if (!combined.includes("rb-bases")) {
    fail("generated HTML is missing the bases plugin output");
  }
  if (!combined.includes("data-bases")) {
    fail("bases placeholder was not replaced with rendered output");
  }
  if (!combined.includes('class="rb-bases__link"')) {
    fail("bases plugin did not render an entry link");
  }
  if (!combined.includes('href="/notes/example"')) {
    fail("bases plugin did not link to the known fixture note");
  }
  if (!combined.includes('data-dataview-type="list"')) {
    fail("dataview plugin did not render a LIST result");
  }
  if (!combined.includes('data-dataview-type="table"')) {
    fail("dataview plugin did not render a TABLE result");
  }
  if (!combined.includes('data-dataview-type="task"')) {
    fail("dataview plugin did not render a TASK result");
  }
  if (!combined.includes('data-dataview-type="calendar"')) {
    fail("dataview plugin did not render a CALENDAR result");
  }
  if (!combined.includes("rb-dataview__table")) {
    fail("generated HTML is missing the dataview table output");
  }
  if (!combined.includes("rb-dataview__tasks")) {
    fail("generated HTML is missing the dataview task list output");
  }
  if (!combined.includes('data-task="x"')) {
    fail("dataview task output is missing the completed data-task state");
  }
  if (!combined.includes("rb-dataview__fallback")) {
    fail("dataview output is missing the raw-query fallback");
  }
  if (!combined.includes(DATAVIEW_NOTE_TITLE)) {
    fail("dataview did not render a title from the external vault");
  }
  if (!combined.includes("language-dataviewjs")) {
    fail("dataviewjs code blocks must stay code blocks");
  }
  if (!combined.includes("rb-properties")) {
    fail("generated HTML is missing the properties plugin panel");
  }
  if (!combined.includes('data-property-key="marker"')) {
    fail("properties panel did not render the fixture frontmatter key");
  }
  if (!combined.includes(PROPERTY_MARKER)) {
    fail("properties panel did not render the fixture frontmatter value");
  }
  // The panel must sit between the article title and the meta row. Find the
  // fixture page that owns the property marker, then compare raw string
  // indexes in its emitted article HTML.
  const propertiesPage = htmlFiles
    .map((file) => ({ file, html: fs.readFileSync(file, "utf8") }))
    .find(({ html }) => html.includes(PROPERTY_MARKER));
  if (!propertiesPage) {
    fail("no emitted page contains the fixture property marker");
  }
  const propertiesArticle = propertiesPage.html;
  const headingIndex = propertiesArticle.indexOf("<h1");
  const panelIndex = propertiesArticle.indexOf("rb-properties");
  const metaIndex = propertiesArticle.indexOf("rb-article-meta");
  if (headingIndex === -1) {
    fail("the properties demo page has no <h1> heading");
  }
  if (panelIndex === -1) {
    fail("the properties demo page has no rendered properties panel");
  }
  if (metaIndex === -1) {
    fail("the properties demo page has no article meta element");
  }
  if (!(headingIndex < panelIndex && panelIndex < metaIndex)) {
    fail(
      "the properties panel must render after the first <h1> and before the article meta row",
    );
  }
  if (!combined.includes("data-related-posts")) {
    fail("related-posts plugin did not annotate any entry");
  }
  if (!combined.includes('class="rb-related-posts"')) {
    fail("related-posts plugin did not render its navigation container");
  }
  if (!combined.includes("rb-related-posts__link")) {
    fail("related-posts plugin did not render its links");
  }
  if (!combined.includes('data-related-score="')) {
    fail("related-posts plugin did not render related scores");
  }
  if (!combined.includes('href="/notes/related-b"')) {
    fail("related-posts plugin did not link a known related fixture note");
  }
  if (!combined.includes('data-flashcards-count="')) {
    fail("generated HTML is missing the flashcards deck output");
  }
  if (!combined.includes("rb-flashcards__list")) {
    fail("flashcards fallback list was not rendered");
  }
  if (
    !combined.includes('class="rb-flashcards__front"') ||
    !combined.includes('class="rb-flashcards__back"')
  ) {
    fail("flashcards fallback did not expose front and back content");
  }
  if (!combined.includes("data-flashcards-payload")) {
    fail("flashcards payload script was not emitted");
  }
  if (!combined.includes(FLASHCARDS_MARKER)) {
    fail(
      `generated HTML is missing the flashcards fixture card text (${FLASHCARDS_MARKER})`,
    );
  }
  if (!combined.includes(RICHEMBED_MARKER)) {
    fail(
      `generated HTML is missing the rich embed marker (${RICHEMBED_MARKER})`,
    );
  }
  if (!combined.includes("www.youtube-nocookie.com/embed/")) {
    fail("generated HTML is missing the rich embed YouTube iframe");
  }
  if (!combined.includes(CHARTJS_MARKER)) {
    fail(`generated HTML is missing the chartjs marker (${CHARTJS_MARKER})`);
  }
  if (!combined.includes(CITATIONS_MARKER)) {
    fail(
      `generated HTML is missing the citations marker (${CITATIONS_MARKER})`,
    );
  }
  if (!combined.includes('href="#ref-smith2024"')) {
    fail("citations plugin did not link citation labels to references");
  }
  if (!combined.includes("External Consumer Citations")) {
    fail("citations plugin did not render the bibliography entry");
  }
  if (!combined.includes("data-chartjs-config")) {
    fail("generated HTML is missing the chartjs canvas configuration");
  }
  if (!combined.includes("rb-chartjs")) {
    fail("generated HTML is missing the chartjs figure markup");
  }
  if (!combined.includes(PLANTUML_MARKER)) {
    fail(`generated HTML is missing the PlantUML marker (${PLANTUML_MARKER})`);
  }
  if (!combined.includes("data-plantuml")) {
    fail("generated HTML is missing the PlantUML figure output");
  }
  if (!combined.includes("/svg/")) {
    fail("generated HTML is missing the PlantUML image URL");
  }
  if (!combined.includes(ALIAS_MARKER)) {
    fail(`generated HTML is missing the alias marker (${ALIAS_MARKER})`);
  }
  if (!combined.includes("kind=redirect target=/notes/alias-demo")) {
    fail("an Obsidian alias did not resolve to a redirect route");
  }
  if (!combined.includes(HIGHLIGHT_MARKER)) {
    fail(
      `generated HTML is missing the highlight marker (${HIGHLIGHT_MARKER})`,
    );
  }
  if (!combined.includes("<mark")) {
    fail("generated HTML is missing the highlight <mark> element");
  }
  if (!combined.includes("rb-highlight")) {
    fail("generated HTML is missing the rb-highlight class");
  }
  // The series marker is fixture-origin now: it is the series name declared in
  // the vault notes, so it flows into the generated `data-series` attribute and
  // the rendered heading instead of a plugin-hardcoded attribute.
  if (!combined.includes("rb-series")) {
    fail("generated HTML is missing the series plugin output");
  }
  if (!combined.includes(`data-series="${SERIES_MARKER}"`)) {
    fail(
      `series navigation is missing the fixture series name (${SERIES_MARKER})`,
    );
  }
  if (!combined.includes(`>${SERIES_MARKER}</a>`)) {
    fail(
      `series heading does not render the fixture-origin marker (${SERIES_MARKER})`,
    );
  }
  if (!combined.includes(`href="${SERIES_PART_1_PERMALINK}"`)) {
    fail(`series navigation is missing part 1 (${SERIES_PART_1_PERMALINK})`);
  }
  if (!combined.includes(`href="${SERIES_PART_2_PERMALINK}"`)) {
    fail(
      `series navigation is missing the part 1 -> part 2 link (${SERIES_PART_2_PERMALINK})`,
    );
  }
  if (!combined.includes('rel="prev"') || !combined.includes('rel="next"')) {
    fail("series navigation is missing the previous/next links");
  }
  // The taxonomy plugin emits per-term feeds through the build's
  // generated-output sink: one file per tag/folder and feed format.
  const tagRss = path.join(distDir, "tags", "featured", "feed.xml");
  if (!fs.existsSync(tagRss)) {
    fail("taxonomy plugin did not emit the /tags/featured RSS feed");
  }
  const tagRssBody = fs.readFileSync(tagRss, "utf8");
  if (!tagRssBody.includes("<rss")) {
    fail("taxonomy tag feed is not an RSS document");
  }
  if (!tagRssBody.includes("/notes/example")) {
    fail("taxonomy tag feed did not link the fixture note");
  }
  const tagAtom = path.join(distDir, "tags", "featured", "atom.xml");
  if (!fs.existsSync(tagAtom)) {
    fail("taxonomy plugin did not emit the /tags/featured Atom feed");
  }
  const tagJson = path.join(distDir, "tags", "featured", "feed.json");
  if (!fs.existsSync(tagJson)) {
    fail("taxonomy plugin did not emit the /tags/featured JSON feed");
  }
  const tagJsonBody = JSON.parse(fs.readFileSync(tagJson, "utf8")) as {
    version?: unknown;
  };
  if (tagJsonBody.version !== "https://jsonfeed.org/version/1.1") {
    fail("taxonomy JSON feed is not JSON Feed 1.1");
  }
  const tagRelatedFeed = path.join(distDir, "tags", "related-demo", "feed.xml");
  if (!fs.existsSync(tagRelatedFeed)) {
    fail("taxonomy plugin did not emit the /tags/related-demo RSS feed");
  }
  const folderFeed = path.join(distDir, "folders", "notes", "feed.xml");
  if (!fs.existsSync(folderFeed)) {
    fail("taxonomy plugin did not emit the /folders/notes RSS feed");
  }
  if (!fs.readFileSync(folderFeed, "utf8").includes("/notes/example")) {
    fail("taxonomy folder feed did not link the fixture note");
  }
  if (
    !combined.includes(ANALYTICS_CONTENT_ID_ATTRIBUTE) ||
    !combined.includes(ANALYTICS_CONTENT_ID)
  ) {
    fail("generated HTML is missing the stable analytics content ID marker");
  }
  if (!combined.includes(ANALYTICS_DEMO_CONTENT_ID)) {
    fail(
      "generated HTML is missing the analytics demo content ID marker " +
        `(${ANALYTICS_DEMO_CONTENT_ID})`,
    );
  }
  // Every page must carry at most one content-ID marker, and each content ID
  // must be unique across the site: a shared ID would merge analytics page
  // views for different notes.
  const contentIdOwners = new Map<string, string>();
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const ids = [
      ...html.matchAll(
        new RegExp(`${ANALYTICS_CONTENT_ID_ATTRIBUTE}="([^"]*)"`, "g"),
      ),
    ].map((match) => match[1]);
    if (ids.length > 1) {
      fail(
        `page ${path.relative(siteDir, file)} carries ${ids.length} analytics content ID markers`,
      );
    }
    const contentId = ids[0];
    if (!contentId) continue;
    const owner = contentIdOwners.get(contentId);
    if (owner) {
      fail(
        `analytics content ID "${contentId}" appears on both ${owner} and ${path.relative(siteDir, file)}`,
      );
    }
    contentIdOwners.set(contentId, path.relative(siteDir, file));
  }
  for (const contentId of [ANALYTICS_CONTENT_ID, ANALYTICS_DEMO_CONTENT_ID]) {
    if (!contentIdOwners.has(contentId)) {
      fail(
        `analytics content ID "${contentId}" is missing from the emitted pages`,
      );
    }
  }
  const analyticsDemoPage = htmlFiles
    .map((file) => ({ file, html: fs.readFileSync(file, "utf8") }))
    .find(({ html }) => html.includes(ANALYTICS_PAGE_MARKER));
  if (!analyticsDemoPage) {
    fail(`the analytics demo page was not built (${ANALYTICS_PAGE_MARKER})`);
  }
  if (
    !analyticsDemoPage.html.includes(
      `${ANALYTICS_CONTENT_ID_ATTRIBUTE}="${ANALYTICS_DEMO_CONTENT_ID}"`,
    )
  ) {
    fail("the analytics demo page is missing its content ID marker");
  }
  if (!combined.includes(GRAPHVIZ_MARKER)) {
    fail(`generated HTML is missing the graphviz marker (${GRAPHVIZ_MARKER})`);
  }
  if (!combined.includes("rb-graphviz")) {
    fail("generated HTML is missing the graphviz plugin output");
  }
  if (!combined.includes('data-graphviz="rendered"')) {
    fail("graphviz diagram was not rendered at build time");
  }
  if (
    !combined.includes('data-attachment-path="attachments/external-guide.pdf"')
  ) {
    fail("attachment plugin did not resolve a file from the external vault");
  }
  if (!combined.includes('class="rr-attachment"')) {
    fail("attachment plugin did not expose its stable rr-attachment hook");
  }
  const attachmentSize = formatBytes(
    fs.statSync(path.join(vaultDir, "attachments", "external-guide.pdf")).size,
  );
  if (!combined.includes(`rr-attachment__size">${attachmentSize}</span>`)) {
    fail(
      `attachment plugin did not read the external vault file size (expected ${attachmentSize})`,
    );
  }
  if (!combined.includes('class="rr-media rr-media--audio"')) {
    fail("media plugin did not render an external vault media embed");
  }
  if (!combined.includes('class="rr-search-bar rr-search"')) {
    fail("search plugin did not expose its stable rr-search hook");
  }
  if (!combined.includes("/assets/attachments/media/external-audio.mp3")) {
    fail("external vault media URL was not generated from its logical path");
  }
  if (!combined.includes('name="theme-color" content="#1ABC9C"')) {
    fail("discord-embed plugin did not emit the frontmatter theme color");
  }
  if (!combined.includes("rb-qr")) {
    fail("qr-code plugin did not render the fixture QR block");
  }
  if (!combined.includes('data-qr="rendered"')) {
    fail("qr-code plugin did not render the QR code at build time");
  }
  if (!combined.includes("<svg")) {
    fail("qr-code plugin did not emit an inline SVG");
  }
  if (!combined.includes(QR_MARKER)) {
    fail(`generated HTML is missing the qr fixture marker (${QR_MARKER})`);
  }
  // The markmap plugin renders on the client, so its build-time artifact is the
  // placeholder figure holding the raw Markdown. The marker must travel inside
  // the `data-markmap-source` attribute.
  if (!combined.includes("rb-markmap")) {
    fail("generated HTML is missing the markmap plugin output (rb-markmap)");
  }
  if (!combined.includes('data-markmap="pending"')) {
    fail("markmap figure is missing its pending state attribute");
  }
  if (
    !new RegExp(`data-markmap-source="[^"]*${MARKMAP_MARKER}`).test(combined)
  ) {
    fail(`markmap source attribute is missing the marker (${MARKMAP_MARKER})`);
  }
  if (!combined.includes(MARKMAP_MARKER)) {
    fail(`generated HTML is missing the markmap marker (${MARKMAP_MARKER})`);
  }
  if (!combined.includes(VEGALITE_MARKER)) {
    fail(`generated HTML is missing the Vega-Lite marker (${VEGALITE_MARKER})`);
  }
  if (!combined.includes("rb-vega-lite")) {
    fail(
      "generated HTML is missing the Vega-Lite plugin output (rb-vega-lite)",
    );
  }
  if (!combined.includes("data-vega-lite")) {
    fail("Vega-Lite figure is missing the output data attributes");
  }
  if (!combined.includes(WAVEDROM_MARKER)) {
    fail(`generated HTML is missing the wavedrom marker (${WAVEDROM_MARKER})`);
  }
  if (!combined.includes("data-wavedrom-spec")) {
    fail("generated HTML is missing the wavedrom figure configuration");
  }
  if (!combined.includes("rb-wavedrom")) {
    fail("generated HTML is missing the wavedrom figure markup");
  }
  if (!combined.includes(MARP_MARKER)) {
    fail(`generated HTML is missing the marp marker (${MARP_MARKER})`);
  }
  if (!combined.includes('class="rb-marp"')) {
    fail("marp plugin did not emit the deck figure wrapper");
  }
  if (!combined.includes("data-marp")) {
    fail("marp plugin did not mark the figure as a deck");
  }
  if (!combined.includes("data-marpit-svg")) {
    fail("marp plugin did not render the slide SVG structure");
  }
  if (!combined.includes('class="rb-marp__deck"')) {
    fail("marp plugin did not emit the deck container");
  }
  if (!combined.includes('class="rb-responsive-image"')) {
    fail("responsive-image plugin did not wrap a marked image in <picture>");
  }
  if (!combined.includes("<picture")) {
    fail("responsive-image plugin did not emit a <picture> element");
  }
  if (!combined.includes('loading="lazy"')) {
    fail('responsive-image plugin did not add loading="lazy"');
  }
  if (!combined.includes('decoding="async"')) {
    fail('responsive-image plugin did not add decoding="async"');
  }
  if (!combined.includes("/attachments/rb-photo-640.webp")) {
    fail("responsive-image plugin did not discover a pre-generated variant");
  }
  if (!combined.includes('srcset="/attachments/rb-photo-640.webp 640w')) {
    fail("responsive-image plugin did not emit a width-described srcset");
  }
  if (!combined.includes("data-kanban-plugin")) {
    fail("generated HTML is missing the kanban plugin board output");
  }
  if (!combined.includes('data-kanban-source="note"')) {
    fail("kanban did not render the auto-detected note board");
  }
  if (!combined.includes('data-kanban-source="block"')) {
    fail("kanban did not render the fenced block board");
  }
  if (!combined.includes('data-column="In Progress"')) {
    fail("kanban did not parse columns from the fixture");
  }
  if (!combined.includes('data-checked="true"')) {
    fail("kanban did not render a checked card");
  }
  if (!combined.includes('data-checked="false"')) {
    fail("kanban did not render an unchecked card");
  }
  if (!combined.includes('data-kanban-link="index"')) {
    fail("kanban did not resolve a wikilink into an href");
  }
  if (!combined.includes("rb-kanban__fallback")) {
    fail("kanban did not preserve unsupported lines in the fallback");
  }
  if (!combined.includes(KANBAN_MARKER)) {
    fail(`generated HTML is missing the kanban note marker (${KANBAN_MARKER})`);
  }
  if (!combined.includes(KANBAN_BLOCK_MARKER)) {
    fail(
      `generated HTML is missing the kanban block marker (${KANBAN_BLOCK_MARKER})`,
    );
  }
  if (!combined.includes("rb-code__line--highlighted")) {
    fail("code-annotations did not highlight a line from fence meta");
  }
  if (!combined.includes("rb-code__line--added")) {
    fail("code-annotations did not mark a [!code ++] line as added");
  }
  if (!combined.includes("rb-code__line--removed")) {
    fail("code-annotations did not mark a [!code --] line as removed");
  }
  if (!combined.includes('data-line="2"')) {
    fail(
      "code-annotations did not materialize per-line wrappers with data-line",
    );
  }
  if (!combined.includes(CODE_ANNOTATIONS_MARKER)) {
    fail(
      `generated HTML is missing the fixture code marker (${CODE_ANNOTATIONS_MARKER})`,
    );
  }
  if (combined.includes("[!code ")) {
    fail("code-annotations did not strip the inline marker comments");
  }
  if (!combined.includes("rb-shortcode--youtube")) {
    fail("shortcodes plugin did not render the youtube built-in");
  }
  if (!combined.includes("rb-shortcode--kbd")) {
    fail("shortcodes plugin did not render the kbd built-in");
  }
  if (!combined.includes("rb-shortcode--note")) {
    fail("shortcodes plugin did not render the note built-in");
  }
  if (!combined.includes("rb-shortcode--badge")) {
    fail("shortcodes plugin did not render the badge built-in");
  }
  if (!combined.includes(SHORTCODE_MARKER)) {
    fail(
      `generated HTML is missing the shortcode fixture marker (${SHORTCODE_MARKER})`,
    );
  }
  if (!combined.includes("rb-canvas")) {
    fail("generated HTML is missing the canvas plugin output");
  }
  if (!combined.includes("data-canvas")) {
    fail("canvas plugin output is missing its data-canvas attributes");
  }
  if (!combined.includes(CANVAS_MARKER)) {
    fail(`generated HTML is missing the canvas marker (${CANVAS_MARKER})`);
  }
  if (!combined.includes(LOCAL_PLUGIN_MARKER)) {
    fail(
      `generated HTML is missing the site-local plugin marker (${LOCAL_PLUGIN_MARKER})`,
    );
  }
  if (!combined.includes(`data-local-plugin-marker="${LOCAL_PLUGIN_MARKER}"`)) {
    fail("site-local plugin marker attribute was not rendered");
  }
  if (!combined.includes('data-theme-name="fixture-local"')) {
    fail("site-local theme name was not applied to the document");
  }
  if (!combined.includes('data-fixture-theme="local"')) {
    fail("site-local theme attribute was not applied to the document");
  }
  if (!combined.includes("data-rb-hover-preview")) {
    fail("generated HTML is missing the hover preview payload script");
  }
  const hoverPreviewIndexPath = path.join(
    distDir,
    "_riebeckite",
    "hover-preview",
    "index.json",
  );
  if (!fs.existsSync(hoverPreviewIndexPath)) {
    fail("hover preview shared index was not emitted");
  }
  if (
    !fs
      .readFileSync(hoverPreviewIndexPath, "utf8")
      .includes(HOVER_PREVIEW_TITLE_MARKER)
  ) {
    fail("hover preview shared index is missing the fixture note title");
  }

  const scriptFiles = walkFiles(distDir, (full) => full.endsWith(".js"));
  const scripts = scriptFiles
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  if (!scripts.includes("rb-hover-preview")) {
    fail(
      "client bundle is missing the hover preview runtime (rb-hover-preview)",
    );
  }
  if (!scripts.includes("initHoverPreview")) {
    fail(
      "client bundle is missing the hover preview initializer (initHoverPreview)",
    );
  }

  if (combined.includes(PRIVATE_MARKER)) {
    fail("non-published note content leaked into the generated HTML");
  }
  const distFiles = walkFiles(distDir);
  const leakedAsset = distFiles.find((file) =>
    path.basename(file).includes("private-only"),
  );
  if (leakedAsset) {
    fail(
      `non-published attachment leaked into dist: ${path.relative(siteDir, leakedAsset)}`,
    );
  }
  for (const file of distFiles.filter((full) => full.endsWith(".json"))) {
    if (fs.readFileSync(file, "utf8").includes(PRIVATE_MARKER)) {
      fail(
        `non-published note leaked into a generated index: ${path.relative(siteDir, file)}`,
      );
    }
  }

  const centerPage = htmlFiles
    .map((file) => ({ file, html: fs.readFileSync(file, "utf8") }))
    .find(({ html }) =>
      html.includes('data-excalibrain-center="notes/excalibrain-center"'),
    );
  if (!centerPage) {
    fail("the ExcaliBrain center page was not found in the build output");
  }
  const center = centerPage.html;
  for (const snippet of [
    "rb-excalibrain",
    "data-excalibrain",
    'data-node-role="parent"',
    'data-node-role="child"',
    'data-node-role="left-friend"',
    'data-node-role="sibling"',
  ]) {
    if (!center.includes(snippet)) {
      fail(`ExcaliBrain center page is missing ${snippet}`);
    }
  }
  if (!center.includes(EXCALIBRAIN_MARKER)) {
    fail(
      `ExcaliBrain center page is missing the marker-titled related note (${EXCALIBRAIN_MARKER})`,
    );
  }
  if (!center.includes('href="/notes/excalibrain-parent"')) {
    fail("ExcaliBrain center page is missing the permalink to the parent note");
  }
  if (!center.includes('data-excalibrain-render="build"')) {
    fail("ExcaliBrain center page did not report the build render mode");
  }
  if (!center.includes('<svg class="rb-excalibrain__svg"')) {
    fail("ExcaliBrain center page did not inline the build-time SVG");
  }

  const cssFiles = walkFiles(distDir, (full) => full.endsWith(".css"));
  const css = cssFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  if (!css.includes("fixture-local-plugin")) {
    fail("site-local plugin stylesheet was not bundled into the dist CSS");
  }
  if (!css.includes("data-fixture-theme")) {
    fail("site-local theme stylesheet was not bundled into the dist CSS");
  }
  if (!css.includes("rb-dataview")) {
    fail("dataview plugin stylesheet was not bundled into the dist CSS");
  }
  if (!css.includes("rb-flashcards__deck")) {
    fail("flashcards stylesheet was not bundled into the dist CSS");
  }

  const jsFiles = walkFiles(distDir, (full) => full.endsWith(".js"));
  const js = jsFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  // The analytics client initializer must be part of the emitted browser
  // bundle. `initAnalytics` is the factory registered through the generic
  // public-config mechanism; the attribute string and the event type are
  // identifiers that only exist in the plugin's client source.
  if (!js.includes("initAnalytics")) {
    fail("the analytics client bundle is missing initAnalytics");
  }
  if (!js.includes(ANALYTICS_CONTENT_ID_ATTRIBUTE)) {
    fail("the analytics client bundle is missing its content ID selector");
  }
  if (!js.includes("page_view")) {
    fail("the analytics client bundle is missing the page_view event type");
  }
  // The fixture collector URL is part of the public config serialized into the
  // client module; its presence proves the browser entry received the config.
  if (!js.includes("analytics.example.com")) {
    fail("the analytics public config was not bundled into the client module");
  }
  if (!js.includes(FLASHCARDS_CLIENT_IDENTIFIER)) {
    fail(
      `emitted client bundle is missing the flashcards identifier (${FLASHCARDS_CLIENT_IDENTIFIER})`,
    );
  }
  if (!css.includes("rb-kanban")) {
    fail("kanban plugin stylesheet was not bundled into the dist CSS");
  }

  if (!js.includes("rb-canvas")) {
    fail("canvas styles/logic were not bundled into the dist JavaScript");
  }
  if (!js.includes("initCanvas")) {
    fail(
      "the canvas client initializer was not bundled into the dist JavaScript",
    );
  }
  // The ux plugin has no article HTML of its own, so its build-time
  // configuration element and its emitted client bundle are the observable
  // artifacts. `rb-ux` is a real identifier that only exists in plugin source.
  if (!combined.includes('id="rb-ux-config"')) {
    fail("the ux plugin did not inject its configuration element into HTML");
  }
  if (!js.includes("rb-ux")) {
    fail("the ux plugin client bundle is missing its `rb-ux` identifier");
  }
  if (!css.includes("rb-ux")) {
    fail("the ux plugin stylesheet is missing its `rb-ux` classes");
  }
  if (!js.includes("rb-markmap")) {
    fail(
      "the markmap plugin client bundle is missing its `rb-markmap` identifier",
    );
  }
  if (!js.includes("initMarkmap")) {
    fail(
      "the markmap plugin client bundle is missing its `initMarkmap` initializer",
    );
  }
  if (!combined.includes('class="rr-color-mode"')) {
    fail("color-mode plugin did not render its rr-color-mode root hook");
  }
  if (!combined.includes("data-color-mode-root")) {
    fail("color-mode plugin did not render the color-mode toggle root");
  }
  if (!combined.includes("riebeckite-color-mode")) {
    fail("color-mode plugin did not emit its storage key");
  }
  if (!js.includes("initColorMode")) {
    fail("color-mode plugin client bundle is missing initColorMode");
  }
  if (!css.includes("rr-color-mode")) {
    fail("color-mode plugin stylesheet is missing its rr-color-mode classes");
  }
  if (!combined.includes("rb-d2")) {
    fail("generated HTML is missing the D2 plugin output (rb-d2)");
  }
  if (!combined.includes('data-d2="rendered"')) {
    fail("D2 diagram was not rendered to SVG at build time");
  }
  const d2Source = combined.match(/data-d2-source="([^"]*)"/);
  if (!d2Source?.[1].includes(D2_MARKER)) {
    fail(`D2 figure source does not contain the fixture marker (${D2_MARKER})`);
  }
  if (!/<figure[^>]*\bclass="rb-d2"[^>]*>[\s\S]*?<svg/.test(combined)) {
    fail("D2 figure does not contain a rendered inline SVG");
  }

  for (const file of htmlFiles) {
    console.log(`  ${path.relative(siteDir, file)}`);
  }
  for (const file of cssFiles) {
    console.log(`  ${path.relative(siteDir, file)}`);
  }
}

function generateStarterSite(tempRoot: string): string {
  logger.step("generating a starter site with riebeckite init");
  const starterDir = path.join(tempRoot, "starter");
  const cli = path.join(repoRoot, "packages", "cli", "bin", "riebeckite.mjs");
  run(process.execPath, [cli, "init", starterDir], { cwd: repoRoot });

  const rerun = run(process.execPath, [cli, "init", starterDir], {
    cwd: repoRoot,
    allowFailure: true,
  });
  if (rerun.status === 0) {
    fail("riebeckite init must refuse a non-empty target without --force");
  }

  return starterDir;
}

function generateCreateStarterSite(tempRoot: string): void {
  logger.step("generating a starter site with create-riebeckite");
  const starterDir = path.join(tempRoot, "starter-create");
  const createBin = path.join(
    repoRoot,
    "packages",
    "create-riebeckite",
    "bin",
    "create-riebeckite.mjs",
  );
  run(process.execPath, [createBin, starterDir], { cwd: repoRoot });
  if (!fs.existsSync(path.join(starterDir, "riebeckite.config.ts"))) {
    fail("create-riebeckite did not generate riebeckite.config.ts");
  }
  const config = fs.readFileSync(
    path.join(starterDir, "riebeckite.config.ts"),
    "utf8",
  );
  if (!config.includes("@riebeckite/plugin-search")) {
    fail("create-riebeckite must use the practical starter preset by default");
  }
  if (config.includes("@riebeckite/plugin-mermaid")) {
    fail("create-riebeckite default must not use the showcase preset");
  }

  logger.step("create-riebeckite lists the scaffold presets");
  const listResult = run(process.execPath, [createBin, "--list-presets"], {
    cwd: repoRoot,
  });
  const listOutput = listResult.stdout;
  for (const name of ["starter", "minimal", "showcase", "empty"]) {
    if (!listOutput.includes(name)) {
      fail(`create-riebeckite --list-presets must list the ${name} preset`);
    }
  }
  for (const removed of ["rich", "full", "max", "ultra"]) {
    if (listOutput.includes(`  ${removed}:`)) {
      fail(
        `create-riebeckite --list-presets must not list removed preset ${removed}`,
      );
    }
  }
}

function assertStarterOutput(siteDir: string): void {
  logger.step("checking generated starter output");
  const distDir = path.join(siteDir, "dist");
  if (!fs.existsSync(distDir)) {
    fail("starter build did not create a dist/ directory");
  }

  const notFoundPath = path.join(siteDir, "app/routes/_404.tsx");
  if (!fs.existsSync(notFoundPath)) {
    fail("generated starter must ship a site-owned app/routes/_404.tsx");
  }
  if (!fs.readFileSync(notFoundPath, "utf8").includes("NotFoundHandler")) {
    fail("generated starter 404 surface must use Hono's NotFoundHandler");
  }

  const htmlFiles = walkFiles(distDir, (full) => full.endsWith(".html"));
  if (htmlFiles.length === 0) {
    fail("starter build did not emit any HTML files under dist/");
  }

  const combined = htmlFiles
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  if (!combined.includes("starter")) {
    fail("starter HTML is missing the generated site title");
  }

  for (const file of htmlFiles) {
    console.log(`  ${path.relative(siteDir, file)}`);
  }
}

function runStarterChecks(workspace: ExternalSiteWorkspace): void {
  generateCreateStarterSite(workspace.tempRoot);
  const starterDir = generateStarterSite(workspace.tempRoot);
  writeFileDependencies(starterDir, workspace.packed);
  assertNoMonorepoEscapeHatches(starterDir, {
    monorepoPackagesDirectory: "packages",
    logger,
  });
  assertDeclaredDependencies(starterDir, {
    dependencyCheckScript,
    cwd: repoRoot,
    logger,
  });

  logger.step("npm install the generated starter");
  run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
    cwd: starterDir,
  });

  runCli(["check"], {
    cliEntry: cliEntryFor(starterDir),
    cwd: starterDir,
    cliName: "riebeckite",
    logger,
  });
  runCli(["doctor"], {
    cliEntry: cliEntryFor(starterDir),
    cwd: starterDir,
    cliName: "riebeckite",
    logger,
  });
  runCli(["build"], {
    cliEntry: cliEntryFor(starterDir),
    cwd: starterDir,
    cliName: "riebeckite",
    logger,
  });
  assertStarterOutput(starterDir);
}

const config: ExternalSiteE2EConfig = {
  repoRoot,
  packages: PACKAGES,
  fixture: {
    site: path.join(fixtureRoot, "site"),
    vault: path.join(fixtureRoot, "vault"),
  },
  dependencyCheckScript,
  scope: "@riebeckite",
  cliName: "riebeckite",
  resolveCliEntry: cliEntryFor,
  cliCommands: [
    { args: ["check"] },
    { args: ["doctor"] },
    { args: ["inspect"] },
    {
      args: ["inspect", "config"],
      assertOutput: (output) => {
        if (!output.includes("fixture-local")) {
          fail(
            "inspect config did not report the site-local theme (fixture-local)",
          );
        }
      },
    },
    {
      args: ["inspect", "plugins"],
      assertOutput: (output) => {
        if (!output.includes("fixture-local")) {
          fail(
            "inspect plugins did not report the site-local plugin (fixture-local)",
          );
        }
      },
    },
    { args: ["build"] },
  ],
  cliWorkingDirectory: "app",
  typecheckProjects: ["tsconfig.json", "tsconfig.nodenext.json"],
  additionalTypeLibraries: ["vite/client"],
  bundlerTypeExclude: ["typecheck/development-riebeckite-modules.d.ts"],
  nodeNextProject: {
    config: "tsconfig.nodenext.json",
    include: ["typecheck/nodenext.ts"],
  },
  requiredInstallPaths: [
    {
      label: "vite/client",
      relativePath: path.join("node_modules", "vite", "client.d.ts"),
      missingMessage: "vite/client types are missing from the isolated install",
    },
    {
      label: "typescript/tsc",
      relativePath: path.join("node_modules", "typescript", "bin", "tsc"),
      missingMessage: "the isolated install has no local TypeScript compiler",
      report: false,
    },
  ],
  monorepoPackagesDirectory: "packages",
  siteChecks: [
    (workspace) => {
      logger.step("verifying capability dependency resolution");
      run(
        process.execPath,
        [path.join(workspace.siteDir, "capability-check.mjs")],
        { cwd: workspace.siteDir },
      );
    },
    (workspace) => {
      logger.step("verifying the publish boundary");
      run(
        process.execPath,
        [path.join(workspace.siteDir, "publish-boundary-check.mjs")],
        { cwd: workspace.siteDir },
      );
    },
  ],
  assertions: { buildOutput: assertBuildOutput },
  afterSiteChecks: runStarterChecks,
  stepLabel: "external-site",
  keepEnv: "RIEBECKITE_E2E_KEEP",
  logger,
};

async function main(): Promise<void> {
  await runExternalSiteE2E(config);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n[external-site] FAIL: ${message}`);
  process.exitCode = 1;
});
