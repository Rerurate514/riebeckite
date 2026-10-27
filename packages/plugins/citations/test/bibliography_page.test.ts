import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { ContentSource, ResolvedRiebeckiteConfig } from "@riebeckite/core";
import {
  ContentManager,
  NoopLogger,
  resolveConfig,
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
`;

const files = {
  "index.md": "---\npublish: true\n---\n\n# Home\n",
  "references.bib": bibliography,
};

function memorySource(input: Readonly<Record<string, string>>): ContentSource {
  return {
    async scan() {
      return Object.keys(input).map((entryPath) => ({ path: entryPath }));
    },
    async read(entry) {
      return input[entry.path] ?? "";
    },
  };
}

function createManager(
  input: Readonly<Record<string, string>>,
  options: Parameters<typeof citations>[0] = {},
) {
  return new ContentManager(memorySource(input), [], {
    config: resolveConfig({
      site: { title: "Test" },
      plugins: [citations(options)],
    }),
  });
}

test("bibliography pages are disabled without pagePath", async () => {
  const manager = createManager(files, { bibliography: "references.bib" });

  assert.deepEqual([...(await manager.getPagePaths())], []);
  assert.equal(await manager.resolvePage("/bibliography"), null);
});

test("pagePath declares a bibliography page listing every entry", async () => {
  const manager = createManager(files, {
    bibliography: "references.bib",
    pagePath: "/bibliography",
  });

  assert.deepEqual([...(await manager.getPagePaths())], ["/bibliography"]);

  const page = await manager.resolvePage("/bibliography");
  assert.equal(page?.type, "citations-bibliography");
  assert.equal(page?.pluginName, "citations");
  assert.equal(page?.pathname, "/bibliography");
  assert.equal(page?.title, "Bibliography");

  const body = page?.body ?? "";
  assert.match(body, /<main class="rb-citations-page">/);
  assert.match(body, /<h1 class="rb-citations-page__title">Bibliography<\/h1>/);
  assert.match(body, /Smith, Jane/);
  assert.match(body, /Citation Systems/);
  assert.match(body, /Doe, John/);
  assert.match(body, /Markdown Research/);
  assert.match(body, /id="ref-smith2024"/);
});

test("pagePath is normalized and lists entries in a deterministic order", async () => {
  const manager = createManager(
    {
      "index.md": "---\npublish: true\n---\n\n# Home\n",
      "refs.bib": `@misc{zeta, title = {Zeta Work}}\n@misc{alpha, title = {Alpha Work}}\n`,
    },
    { bibliography: "refs.bib", pagePath: "refs/" },
  );

  assert.deepEqual([...(await manager.getPagePaths())], ["/refs"]);
  const body = (await manager.resolvePage("/refs"))?.body ?? "";
  assert.ok(
    body.indexOf("Alpha Work") < body.indexOf("Zeta Work"),
    "entries should be sorted by key",
  );
});

test("merges plugin and frontmatter bibliographies from public pages", async () => {
  const manager = createManager(
    {
      "index.md": "---\npublish: true\n---\n\n# Home\n",
      "plugin.bib": "@misc{pluginKey, title = {Plugin Work}}",
      "posts/a.md":
        '---\npublish: true\nbibliography: "a.bib"\n---\n\nText [@alpha].',
      "posts/b.md":
        '---\npublish: true\nbibliography: ["b.bib"]\n---\n\nText [@beta].',
      "posts/a.bib": "@misc{alpha, title = {Alpha Work}}",
      "posts/b.bib": "@misc{beta, title = {Beta Work}}",
    },
    { bibliography: "plugin.bib", pagePath: "/bibliography" },
  );

  const body = (await manager.resolvePage("/bibliography"))?.body ?? "";
  assert.match(body, /Plugin Work/);
  assert.match(body, /Alpha Work/);
  assert.match(body, /Beta Work/);
});

test("does not leak bibliographies referenced by draft or unlisted pages", async () => {
  const manager = createManager(
    {
      "index.md": "---\npublish: true\n---\n\n# Home\n",
      "refs.bib": "@misc{publicKey, title = {Public Work}}",
      "draft.md":
        '---\npublish: true\nvisibility: draft\nbibliography: "secret.bib"\n---\n\nDraft',
      "unlisted.md":
        '---\npublish: true\nvisibility: unlisted\nbibliography: "unlisted.bib"\n---\n\nUnlisted',
      "secret.bib": "@misc{secretKey, title = {Secret Work}}",
      "unlisted.bib": "@misc{unlistedKey, title = {Unlisted Work}}",
    },
    { bibliography: "refs.bib", pagePath: "/bibliography" },
  );

  const body = (await manager.resolvePage("/bibliography"))?.body ?? "";
  assert.match(body, /Public Work/);
  assert.doesNotMatch(body, /Secret Work/);
  assert.doesNotMatch(body, /Unlisted Work/);
});

test("escapes entry text and only links safe http(s) and doi targets", async () => {
  const manager = createManager(
    {
      "index.md": "---\npublish: true\n---\n\n# Home\n",
      "refs.bib": `
@misc{evil,
  author = {<b>Bold</b>},
  title = {<script>alert(1)</script>},
  url = {javascript:alert(2)},
  year = {2020}
}
@misc{linked,
  title = {Linked Work},
  url = {https://example.com/x?y=1&z=2}
}
@misc{doiOnly,
  title = {Doi Work},
  doi = {10.1000/xyz}
}
`,
    },
    { bibliography: "refs.bib", pagePath: "/bibliography" },
  );

  const body = (await manager.resolvePage("/bibliography"))?.body ?? "";
  assert.match(body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(body, /<script>alert\(1\)<\/script>/);
  assert.match(body, /&lt;b&gt;Bold&lt;\/b&gt;/);
  assert.doesNotMatch(body, /javascript:/);
  assert.match(body, /href="https:\/\/example\.com\/x\?y=1&amp;z=2"/);
  assert.match(body, /href="https:\/\/doi\.org\/10\.1000\/xyz"/);
});

test("declares no page when the bibliography has zero entries", async () => {
  const manager = createManager(
    {
      "index.md": "---\npublish: true\n---\n\n# Home\n",
      "refs.bib": "% only a comment\n@comment{ignored}\n",
    },
    { bibliography: "refs.bib", pagePath: "/bibliography" },
  );

  assert.deepEqual([...(await manager.getPagePaths())], []);
  assert.equal(await manager.resolvePage("/bibliography"), null);
});

test("declares no page for a malformed bibliography and reports it", async () => {
  const manager = createManager(
    {
      "index.md": "---\npublish: true\n---\n\n# Home\n",
      "refs.bib": "@article{broken, author = {A}",
    },
    { bibliography: "refs.bib", pagePath: "/bibliography" },
  );

  assert.deepEqual([...(await manager.getPagePaths())], []);
  const manifest = await manager.getManifest();
  assert.equal(
    manifest.diagnostics.some(
      (item) => item.code === "citation-malformed-bibliography",
    ),
    true,
  );
});

test("drops identical duplicate entries silently", async () => {
  const entry =
    "@article{dup, author = {Same}, title = {Same Work}, year = {2020}}";
  const manager = createManager(
    {
      "index.md": "---\npublish: true\n---\n\n# Home\n",
      "a.bib": entry,
      "b.bib": entry,
    },
    { bibliography: ["a.bib", "b.bib"], pagePath: "/bibliography" },
  );

  const body = (await manager.resolvePage("/bibliography"))?.body ?? "";
  assert.equal(body.match(/Same Work/g)?.length, 1);
  assert.equal(body.match(/class="rb-citations-page__item"/g)?.length, 1);
});

test("keeps the first entry and reports conflicting duplicate keys", async () => {
  const manager = createManager(
    {
      "index.md": "---\npublish: true\n---\n\n# Home\n",
      "a.bib":
        "@article{dup, author = {First}, title = {First Work}, year = {2020}}",
      "b.bib":
        "@article{dup, author = {Second}, title = {Second Work}, year = {2021}}",
    },
    { bibliography: ["a.bib", "b.bib"], pagePath: "/bibliography" },
  );

  const body = (await manager.resolvePage("/bibliography"))?.body ?? "";
  assert.match(body, /First Work/);
  assert.doesNotMatch(body, /Second Work/);

  const manifest = await manager.getManifest();
  assert.equal(
    manifest.diagnostics.some(
      (item) => item.code === "citation-duplicate-key" && item.target === "dup",
    ),
    true,
  );
});

test("Markdown wins when the bibliography path collides with a note", async () => {
  const manager = createManager(
    {
      "index.md": "---\npublish: true\n---\n\n# Home\n",
      "bibliography.md": "---\npublish: true\n---\n\n# Note\n",
      "refs.bib": bibliography,
    },
    { bibliography: "refs.bib", pagePath: "/bibliography" },
  );

  assert.deepEqual([...(await manager.getPagePaths())], []);
  assert.equal(await manager.resolvePage("/bibliography"), null);

  const manifest = await manager.getManifest();
  assert.equal(manifest.byRoutablePermalink.has("/bibliography"), true);
  assert.equal(
    manifest.diagnostics.some(
      (item) => item.code === "citations-page-conflict",
    ),
    true,
  );
});

test("bibliography pages stay consistent across cold and warm builds", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-citations-page-"),
  );

  const input = { ...files };
  const first = await buildCached(input, directory);
  assert.deepEqual(
    [...(await first.manager.getPagePaths())],
    ["/bibliography"],
  );
  const firstBody = (await first.manager.resolvePage("/bibliography"))?.body;
  await first.manager.dispose();

  const second = await buildCached(input, directory);
  assert.deepEqual(
    [...(await second.manager.getPagePaths())],
    ["/bibliography"],
  );
  const secondBody = (await second.manager.resolvePage("/bibliography"))?.body;
  assert.equal(firstBody, secondBody);
  await second.manager.dispose();

  input["references.bib"] = bibliography.replace(
    "Citation Systems",
    "Updated Citation Systems",
  );
  const third = await buildCached(input, directory);
  const thirdBody = (await third.manager.resolvePage("/bibliography"))?.body;
  assert.match(thirdBody ?? "", /Updated Citation Systems/);
  await third.manager.dispose();
});

async function buildCached(
  input: Readonly<Record<string, string>>,
  directory: string,
) {
  const plugin = citations({
    bibliography: "references.bib",
    pagePath: "/bibliography",
  });
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
    content: {
      directory: "/test",
      exclude: [],
      filters: { publishStrategy: "explicit" },
    },
    theme: {
      name: "test",
      colorMode: "system",
      layout: "article",
      stylesheets: [],
      settings: { values: {}, attributes: {}, style: "" },
      styles: [],
    },
    plugins: [plugin],
    cache: { enabled: true, directory: path.join(directory, "cache") },
  };
  const manager = new ContentManager(memorySource(input), [], {
    config,
    plugins: config.plugins,
    observability: {
      logger: new NoopLogger(),
      tracer: new SinkTracer({ onEvent: () => {}, onSpan: () => {} }),
    },
  });
  await manager.build({ incremental: true });
  return { manager };
}
