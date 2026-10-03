import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type {
  ContentSource,
  ContentSourceEntry,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import {
  ContentManager,
  NoopLogger,
  Pipeline,
  SinkTracer,
} from "@riebeckite/core";
import { citations } from "../index.js";

const bibliography = `
@article{smith2024,
  author = {Smith, Jane},
  title = {Citation Systems},
  journal = {Journal of Notes},
  year = {2024}
}

@book{doe2025,
  author = {Doe, John},
  title = {Markdown Research},
  publisher = {Riebeckite Press},
  year = {2025}
}

@inproceedings{conf2023,
  author = {Conf, Casey},
  title = {Proceedings Paper},
  booktitle = {MarkdownConf},
  year = {2023}
}

@article{colon:2024,
  author = {Colon, Casey},
  title = {Colon Keys},
  journal = {Journal of Colons},
  year = {2024}
}
`;

const defaultFiles = { "references.bib": bibliography };

test("renders single, multiple, repeated, and inline citations", async () => {
  const plugin = citations({ bibliography: "references.bib" });
  const content = await render(
    `According to previous research [@smith2024].

Multiple [@smith2024; @doe2025].

@conf2023 argues that repeated citations [@smith2024] keep their number.`,
    plugin,
  );

  assert.match(
    content.html,
    /previous research <a href="#ref-smith2024">\[1\]<\/a>/,
  );
  assert.match(content.html, /Multiple <a href="#ref-smith2024">\[1, 2\]<\/a>/);
  assert.match(content.html, /<a href="#ref-conf2023">3<\/a> argues/);
  assert.match(content.html, /<h2 id="references">References<\/h2>/);
  assert.match(content.html, /Smith, Jane\. \(2024\)\. Citation Systems/);
  assert.match(content.html, /Doe, John\. \(2025\)\. Markdown Research/);
});

test("keeps code, fenced code, wikilinks, and markdown links intact", async () => {
  const plugin = citations({ bibliography: "references.bib" });
  const content = await render(
    "`[@smith2024]`\n\n```\n[@smith2024]\n```\n\n[[Note @smith2024]]\n\n[link @smith2024](https://example.com)\n\nReal [@smith2024]",
    plugin,
  );

  assert.match(content.html, /<code>\[@smith2024\]<\/code>/);
  assert.match(content.html, /<pre><code>\[@smith2024\]/);
  assert.match(content.html, /\[\[Note @smith2024\]\]/);
  assert.match(
    content.html,
    /<a href="https:\/\/example.com">link @smith2024<\/a>/,
  );
  assert.match(content.html, /Real <a href="#ref-smith2024">\[1\]<\/a>/);
});

test("does not rewrite citations nested inside a link", async () => {
  const plugin = citations({ bibliography: "references.bib" });
  const content = await render(
    "[**bold @smith2024**](https://example.com)",
    plugin,
  );

  assert.match(
    content.html,
    /<a href="https:\/\/example.com"><strong>bold @smith2024<\/strong><\/a>/,
  );
  assert.doesNotMatch(content.html, /#ref-smith2024/);
});

test("repairs citation keys that remark-directive splits at a colon", async () => {
  const plugin = citations({ bibliography: "references.bib" });
  const content = await render(
    "Bracket [@colon:2024] and inline @colon:2024 argues. Unrelated foo:bar stays a directive.",
    plugin,
  );

  assert.match(
    content.html,
    /Bracket <a href="#ref-colon-2024">\[1\]<\/a> and inline <a href="#ref-colon-2024">1<\/a> argues/,
  );
  assert.match(
    content.html,
    /<li id="ref-colon-2024">Colon, Casey\. \(2024\)\. Colon Keys\. Journal of Colons<\/li>/,
  );
  assert.match(content.html, /Unrelated foo/);
  assert.match(content.html, /stays a directive/);
  assert.doesNotMatch(content.html, /href="#ref-foo/);
  assert.equal(
    content.html.match(/id="ref-/g)?.length,
    1,
    "only the colon citation key should receive a reference anchor",
  );
});

test("reports unknown citation key and missing bibliography", async () => {
  const plugin = citations({ bibliography: "missing.bib" });
  await render("Missing [@unknown2026]", plugin);
  const diagnostics = await plugin.addDiagnostics?.(baseContext());

  assert.equal(
    diagnostics?.some((item) => item.code === "citation-missing-bibliography"),
    true,
  );
  assert.equal(
    diagnostics?.some((item) => item.code === "citation-unknown-key"),
    true,
  );
});

test("reports malformed and duplicate bibliography entries", async () => {
  const plugin = citations({ bibliography: "bad.bib" });
  await render("Bad [@smith2024]", plugin, {
    "bad.bib": `${bibliography}\n@article{smith2024, title = {Duplicate}}\n@article{broken, title = {Broken}`,
  });
  const diagnostics = await plugin.addDiagnostics?.(baseContext());

  assert.equal(
    diagnostics?.some((item) => item.code === "citation-duplicate-key"),
    true,
  );
  assert.equal(
    diagnostics?.some(
      (item) => item.code === "citation-malformed-bibliography",
    ),
    true,
  );
});

test("keeps parsing after comment, string, and malformed entries", async () => {
  const plugin = citations({ bibliography: "references.bib" });
  const content = await render("Text [@alpha2024; @after2024]", plugin, {
    "references.bib": [
      "@comment{a comment with no comma}",
      "@string{JOURNAL = {Journal of Notes}}",
      "@article{alpha2024, author={Alpha, Ada}, title={First Entry}, journal=JOURNAL, year={2024}}",
      "@article{broken2024, title = {Broken}",
      "@article{after2024, author={After, Ben}, title={Second Entry}, journal={J}, year={2025}}",
      "@article{alpha2024, title = {Duplicate}}",
    ].join("\n\n"),
  });
  const diagnostics = await plugin.addDiagnostics?.(baseContext());

  assert.match(content.html, /First Entry/);
  assert.match(content.html, /Second Entry/);
  assert.match(content.html, /JOURNAL/);
  assert.equal(
    diagnostics?.some(
      (item) => item.code === "citation-malformed-bibliography",
    ),
    true,
  );
  assert.equal(
    diagnostics?.some((item) => item.code === "citation-duplicate-key"),
    true,
  );
  assert.equal(
    diagnostics?.some(
      (item) => item.code === "citation-unsupported-bibliography-syntax",
    ),
    true,
  );
});

test("parses common scoped BibTeX fields and reports unsupported syntax", async () => {
  const plugin = citations({ bibliography: "references.bib" });
  const content = await render("Text [@complex2024; @concat2024]", plugin, {
    "references.bib": `@article{complex2024,
      author = "Doe, Jane and {Smith, John}",
      title = {A {Nested, Braced} Title with {\\LaTeX} and \\& Escapes},
      journal = {Journal, With, Commas},
      year = {2024},
    }

    @article{concat2024,
      title = "Unsupported " # "Concatenation",
      year = 2024,
    }
    @software{tool2024, title = {Unsupported Type}}
    @article{broken2024, title = {Broken}
    @article{complex2024, title = {Duplicate}}`,
  });
  const diagnostics = await plugin.addDiagnostics?.(baseContext());

  assert.match(
    content.html,
    /Doe, Jane and Smith, John\. \(2024\)\. A Nested, Braced Title with \\LaTeX and (?:&amp;|&#x26;|&#38;) Escapes\. Journal, With, Commas/,
  );
  assert.equal(
    diagnostics?.some(
      (item) => item.code === "citation-unsupported-bibliography-syntax",
    ),
    true,
  );
  assert.equal(
    diagnostics?.some(
      (item) => item.code === "citation-unsupported-entry-type",
    ),
    true,
  );
  assert.equal(
    diagnostics?.some(
      (item) => item.code === "citation-malformed-bibliography",
    ),
    true,
  );
  assert.equal(
    diagnostics?.some((item) => item.code === "citation-duplicate-key"),
    true,
  );
});

test("escapes bibliography text and resolves frontmatter bibliography relative to the page", async () => {
  const plugin = citations();
  const content = await render(
    "---\nbibliography: refs.bib\n---\n\nText [@safe2024]",
    plugin,
    {
      "notes/refs.bib": `@article{safe2024,
        author = {<script>alert(1)</script>},
        title = {Safe <img src=x onerror=alert(1)> Title},
        journal = {Security Journal},
        year = {2024},
      }`,
    },
    "notes/page",
  );
  const diagnostics = await plugin.addDiagnostics?.(baseContext());

  assert.match(content.html, /alert\(1\)/);
  assert.match(
    content.html,
    /(?:&lt;|&#x3C;|&#60;)script>alert\(1\)(?:&lt;|&#x3C;|&#60;)\/script/,
  );
  assert.match(
    content.html,
    /Safe (?:&lt;|&#x3C;|&#60;)img src=x onerror=alert\(1\)> Title/,
  );
  assert.doesNotMatch(content.html, /<script>alert/);
  assert.doesNotMatch(content.html, /<img src=x/);
  assert.equal(
    diagnostics?.some((item) => item.code === "citation-missing-bibliography"),
    false,
  );
});

test("uses frontmatter bibliography and a custom references heading", async () => {
  const plugin = citations({ referencesHeading: "参考文献" });
  const content = await render(
    "---\nbibliography: refs.bib\n---\n\nText [@doe2025]",
    plugin,
    { "refs.bib": bibliography },
    "page",
  );

  assert.match(
    content.html,
    /<a href="#ref-doe2025">\[1\]<\/a>/,
    "frontmatter bibliography must win over the default one",
  );
  assert.match(
    content.html,
    /<h2[^>]*>参考文献<\/h2>/,
    "referencesHeading must replace the default heading text",
  );
  assert.doesNotMatch(content.html, /<h2[^>]*>References<\/h2>/);
  assert.match(content.html, /<li id="ref-doe2025">/);
});

test("preserves citation affixes, punctuation, and parenthesised citations", async () => {
  const plugin = citations({ bibliography: "references.bib" });
  const content = await render(
    "Japanese本文[@smith2024, p. 42]. Parenthetical ([@smith2024]). Suppressed [-@smith2024] and [see @doe2025].",
    plugin,
  );

  assert.match(
    content.html,
    /Japanese本文<a href="#ref-smith2024">\[1, p\. 42\]<\/a>\./,
  );
  assert.match(
    content.html,
    /Parenthetical \(<a href="#ref-smith2024">\[1\]<\/a>\)\./,
  );
  assert.match(
    content.html,
    /Suppressed <a href="#ref-smith2024">\[1\]<\/a> and <a href="#ref-doe2025">\[see 2\]<\/a>/,
  );
  assert.match(content.html, /<li id="ref-smith2024">/);
  assert.match(content.html, /<li id="ref-doe2025">/);
});

test("keeps citation numbering and diagnostics scoped to each page", async () => {
  const plugin = citations({ bibliography: "references.bib" });
  const pageA = await render(
    "A [@unknownAlpha]",
    plugin,
    defaultFiles,
    "page-a",
  );
  const pageB = await render(
    "B [@unknownBeta]",
    plugin,
    defaultFiles,
    "page-b",
  );
  const diagnostics = await plugin.addDiagnostics?.(baseContext());

  assert.match(pageA.html, /<a href="#ref-unknownAlpha">\[1\]<\/a>/);
  assert.match(pageB.html, /<a href="#ref-unknownBeta">\[1\]<\/a>/);
  assert.doesNotMatch(pageB.html, /#ref-unknownAlpha/);
  assert.doesNotMatch(pageA.html, /#ref-unknownBeta/);

  const fromA = diagnostics?.find((item) => item.target === "unknownAlpha");
  const fromB = diagnostics?.find((item) => item.target === "unknownBeta");
  assert.equal(fromA?.slug, "page-a");
  assert.equal(fromB?.slug, "page-b");
});

test("produces identical output and diagnostics for identical input", async () => {
  const markdown =
    "First [@smith2024; @doe2025], again [@smith2024], unknown [@ghost2099].";

  const first = await renderOnce(markdown);
  const second = await renderOnce(markdown);

  assert.equal(first.html, second.html);
  assert.deepEqual(first.diagnostics, second.diagnostics);
});

test("incrementally rebuilds only content that reads a changed bibliography", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-citations-"),
  );
  const files = {
    "citing.md": "Citing [@smith2024]",
    "unrelated.md": "# Unrelated",
    "references.bib": bibliography,
  };

  const first = await buildIncrementally(files, directory);
  assert.equal(first.processed, 2);

  const unchanged = await buildIncrementally(files, directory);
  assert.equal(unchanged.processed, 0);
  assert.equal(unchanged.reused, 2);

  files["references.bib"] = bibliography.replace(
    "Citation Systems",
    "Updated Citation Systems",
  );
  const changed = await buildIncrementally(files, directory);
  assert.equal(changed.processed, 1);
  assert.equal(changed.reused, 1);
  assert.match(
    changed.manifest.bySlug.get("citing")?.html ?? "",
    /Updated Citation Systems/,
  );

  files["unrelated.bib"] = bibliography;
  const unrelated = await buildIncrementally(files, directory);
  assert.equal(unrelated.processed, 0);
  assert.equal(unrelated.reused, 2);
});

async function renderOnce(markdown: string) {
  const plugin = citations({ bibliography: "references.bib" });
  const content = await render(markdown, plugin);
  const diagnostics = (await plugin.addDiagnostics?.(baseContext())) ?? [];
  return { html: content.html, diagnostics };
}

async function buildIncrementally(
  files: Record<string, string>,
  directory: string,
) {
  const spans: { name: string }[] = [];
  const plugin = citations({ bibliography: "references.bib" });
  const config: ResolvedRiebeckiteConfig = {
    buildDirectory: directory,
    site: {
      title: "Test",
      description: "",
      author: "",
      baseUrl: "http://test",
      locale: "en",
      twitterSite: "",
      defaultOgImage: "",
      feed: { title: "", description: "", language: "en" },
    },
    navigation: { header: [], footer: [] },
    content: {
      directory: "/test",
      exclude: [],
      filters: { publishStrategy: "explicit" },
    },
    markdown: { syntaxHighlight: { theme: "" } },
    theme: {
      name: "test",
      colorMode: "system",
      typography: "system",
      articleLayout: "article",
      tokens: {},
      attributes: {},
      userCss: [],
      styles: [],
    },
    plugins: [plugin],
    cache: { enabled: true, directory: path.join(directory, "cache") },
  };
  const events: { name: string }[] = [];
  const manager = new ContentManager(new MemoryContentSource(files), [], {
    config,
    plugins: config.plugins,
    observability: {
      logger: new NoopLogger(),
      tracer: new SinkTracer({
        onEvent: (event) => events.push(event),
        onSpan: (span) => spans.push(span),
      }),
    },
  });
  const manifest = await manager.build({ incremental: true });
  await manager.dispose();
  return {
    manifest,
    processed: spans.filter((span) => span.name === "content.process").length,
    reused: events.filter((event) => event.name === "content.reuse").length,
  };
}

async function render(
  markdown: string,
  plugin: ReturnType<typeof citations>,
  files: Record<string, string> = defaultFiles,
  sourceSlug = "note",
) {
  const pipeline = new Pipeline(new Map(), new Map(), undefined, {
    plugins: [plugin],
    contentSource: new MemoryContentSource(files),
  });
  return await pipeline.execute(markdown, { sourceSlug });
}

function baseContext() {
  return {
    contentIndex: new Map(),
    diagnostics: [],
    cache: {} as never,
    output: {} as never,
    logger: {} as never,
    tracer: {} as never,
  };
}

class MemoryContentSource implements ContentSource {
  constructor(private readonly files: Readonly<Record<string, string>>) {}

  async scan(): Promise<readonly ContentSourceEntry[]> {
    return Object.keys(this.files).map((path) => ({ path }));
  }

  async read(entry: ContentSourceEntry): Promise<string> {
    return this.files[entry.path] ?? "";
  }
}
