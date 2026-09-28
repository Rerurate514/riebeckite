import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
  PluginManifestContext,
} from "@riebeckite/core";
import {
  inspectGeneratedHtml,
  inspectHtml,
  qualityPlugin,
  RULE_CODES,
} from "../index.js";

const CLEAN_DOCUMENT = `<!doctype html>
<html lang="en">
  <head><title>Home</title></head>
  <body>
    <h1>Home</h1>
    <h2 id="intro">Intro</h2>
    <p><a href="#intro">Jump to intro</a></p>
    <img src="cover.png" alt="Cover">
    <table>
      <thead><tr><th scope="col">Name</th></tr></thead>
      <tbody><tr><td>Riebeckite</td></tr></tbody>
    </table>
  </body>
</html>`;

function codes(diagnostics: readonly Diagnostic[]): string[] {
  return diagnostics.map((diagnostic) => diagnostic.code);
}

function hasCode(diagnostics: readonly Diagnostic[], code: string): boolean {
  return diagnostics.some((diagnostic) => diagnostic.code === code);
}

function entry(slug: string, html: string): ContentManifestEntry {
  return {
    slug,
    html,
    permalink: `/${slug}`,
    publicLocation: { slug, permalink: `/${slug}` },
    title: slug,
    frontmatter: {},
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}

function manifestOf(entries: ContentManifestEntry[]): ContentManifest {
  return {
    publicEntries: entries,
    diagnostics: [],
  } as unknown as ContentManifest;
}

test("img-alt-missing fires without alt and stays silent for alt values", () => {
  assert.ok(
    hasCode(inspectHtml('<img src="a.png">'), RULE_CODES.imgAltMissing),
  );
  assert.equal(inspectHtml('<img src="a.png" alt="">').length, 0);
  assert.equal(inspectHtml('<img src="a.png" alt="A">').length, 0);
});

test("img with an empty alt is treated as decorative, not missing", () => {
  const diagnostics = inspectHtml('<img src="a.png" alt="">');
  assert.ok(!hasCode(diagnostics, RULE_CODES.imgAltMissing));
});

test("duplicate-id fires on repeated id values only", () => {
  assert.ok(
    hasCode(
      inspectHtml('<div id="x"></div><span id="x"></span>'),
      RULE_CODES.duplicateId,
    ),
  );
  assert.equal(inspectHtml('<div id="x"></div><span id="y"></span>').length, 0);
  assert.equal(inspectHtml('<div id=""></div><div id=""></div>').length, 0);
});

test("broken-internal-anchor matches ids in the same document", () => {
  assert.ok(
    hasCode(
      inspectHtml('<a href="#missing">go</a>'),
      RULE_CODES.brokenInternalAnchor,
    ),
  );
  assert.equal(
    inspectHtml('<a href="#here">go</a><div id="here"></div>').length,
    0,
  );
  assert.equal(inspectHtml('<a href="/page">go</a>').length, 0);
  assert.equal(inspectHtml('<a href="#">go</a>').length, 0);
});

test("heading-order reports skipped levels and missing h1", () => {
  assert.ok(
    hasCode(inspectHtml("<h1>a</h1><h3>b</h3>"), RULE_CODES.headingOrder),
  );
  assert.ok(hasCode(inspectHtml("<h2>a</h2>"), RULE_CODES.headingOrder));
  assert.equal(inspectHtml("<h1>a</h1><h2>b</h2><h3>c</h3>").length, 0);
  assert.equal(inspectHtml("<p>no headings</p>").length, 0);
});

test("empty-link-text ignores named links and anchor targets", () => {
  assert.ok(
    hasCode(inspectHtml('<a href="/x">   </a>'), RULE_CODES.emptyLinkText),
  );
  assert.ok(
    hasCode(
      inspectHtml('<a href="/x"><img src="a.png" alt=""></a>'),
      RULE_CODES.emptyLinkText,
    ),
  );
  assert.equal(inspectHtml('<a href="/x">Text</a>').length, 0);
  assert.equal(inspectHtml('<a href="/x" aria-label="X"></a>').length, 0);
  assert.equal(
    inspectHtml('<a href="/x"><img src="a.png" alt="Logo"></a>').length,
    0,
  );
  assert.equal(inspectHtml('<a id="target"></a>').length, 0);
});

test("html-lang-missing only applies to full documents", () => {
  assert.ok(
    hasCode(
      inspectHtml("<html><body>x</body></html>"),
      RULE_CODES.htmlLangMissing,
    ),
  );
  assert.ok(
    hasCode(
      inspectHtml('<html lang=""><body>x</body></html>'),
      RULE_CODES.htmlLangMissing,
    ),
  );
  assert.equal(inspectHtml('<html lang="en"><body>x</body></html>').length, 0);
  assert.equal(inspectHtml("<div>fragment</div>").length, 0);
});

test("table-no-header fires without any header cell annotation", () => {
  assert.ok(
    hasCode(
      inspectHtml("<table><tr><td>a</td></tr></table>"),
      RULE_CODES.tableNoHeader,
    ),
  );
  assert.equal(inspectHtml("<table><tr><th>a</th></tr></table>").length, 0);
  assert.equal(
    inspectHtml('<table><tr><td scope="row">a</td></tr></table>').length,
    0,
  );
  assert.equal(
    inspectHtml('<table><tr><td headers="h">a</td></tr></table>').length,
    0,
  );
  assert.equal(inspectHtml("<table></table>").length, 0);
});

test("clean document produces no false positives", () => {
  assert.deepEqual(inspectHtml(CLEAN_DOCUMENT), []);
});

test("masked script and style content is not inspected", () => {
  const html = `<script>const id = "x"; const alt = '<img src="a">';</script>
    <div id="x"></div>`;
  assert.deepEqual(inspectHtml(html), []);
});

test("rule codes are stable quality: identifiers", () => {
  const html = `<html>
    <h1>a</h1><h3>b</h3>
    <img src="a.png">
    <div id="dup"></div><div id="dup"></div>
    <a href="#nope">ok</a>
    <a href="/x">  </a>
    <table><tr><td>a</td></tr></table>
  </html>`;
  const observed = new Set(codes(inspectHtml(html)));
  for (const code of Object.values(RULE_CODES)) {
    assert.ok(observed.has(code), `expected code ${code}`);
    assert.ok(code.startsWith("quality:"));
  }
});

test("ignoreRules suppresses matching codes", () => {
  const html = '<img src="a.png"><div id="x"></div><div id="x"></div>';
  const diagnostics = inspectHtml(html, {
    ignoreRules: [RULE_CODES.duplicateId],
  });
  assert.deepEqual(codes(diagnostics), [RULE_CODES.imgAltMissing]);
});

test("disabling a11y skips every rule", () => {
  assert.deepEqual(
    inspectHtml('<img src="a.png"><div id="x"></div><div id="x"></div>', {
      a11y: { enabled: false },
    }),
    [],
  );
});

test("inspectGeneratedHtml records the page path as filePath", () => {
  const diagnostics = inspectGeneratedHtml({
    path: "index.html",
    html: '<img src="a.png"><div id="x"></div><div id="x"></div>',
  });
  assert.ok(diagnostics.length > 0);
  for (const diagnostic of diagnostics) {
    assert.equal(diagnostic.filePath, "index.html");
  }
  assert.equal(inspectHtml('<img src="a.png">')[0]?.filePath, undefined);
});

test("qualityPlugin pushes article-body diagnostics with slug and filePath", async () => {
  const plugin = qualityPlugin();
  const diagnostics: Diagnostic[] = [];
  await plugin.onManifestCreated?.({
    manifest: manifestOf([entry("post", '<img src="a.png">')]),
    diagnostics,
  } as unknown as PluginManifestContext);

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.code, RULE_CODES.imgAltMissing);
  assert.equal(diagnostics[0]?.pluginName, "quality");
  assert.equal(diagnostics[0]?.slug, "post");
  assert.equal(diagnostics[0]?.filePath, "/post");
});

test("qualityPlugin exposes an inspectGeneratedHtml hook", () => {
  const plugin = qualityPlugin();
  const diagnostics = plugin.inspectGeneratedHtml?.({
    path: "post.html",
    html: '<img src="a.png">',
  });
  assert.equal(diagnostics?.length, 1);
  assert.equal(diagnostics?.[0]?.filePath, "post.html");
});

test("failOn error throws on error-severity diagnostics", () => {
  const plugin = qualityPlugin({ failOn: "error" });
  const manifest = {
    diagnostics: [
      {
        code: RULE_CODES.duplicateId,
        severity: "error",
        message: "duplicate",
        pluginName: "quality",
      },
    ],
  } as unknown as ContentManifest;
  assert.throws(
    () =>
      plugin.onBuildEnd?.({
        manifest,
        diagnostics: [],
      } as unknown as PluginManifestContext),
    /Quality inspection failed/,
  );
});

test("failOn defaults to never", () => {
  const plugin = qualityPlugin();
  const manifest = {
    diagnostics: [
      {
        code: RULE_CODES.duplicateId,
        severity: "error",
        message: "duplicate",
        pluginName: "quality",
      },
    ],
  } as unknown as ContentManifest;
  assert.doesNotThrow(() =>
    plugin.onBuildEnd?.({
      manifest,
      diagnostics: [],
    } as unknown as PluginManifestContext),
  );
});
