import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import { NoopLogger, SinkTracer } from "../src/observability.js";
import type { ResolvedRiebeckiteConfig } from "../src/types/resolved_riebeckite_config.js";

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((filePath) => ({ path: filePath }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

function testConfig(directory: string): ResolvedRiebeckiteConfig {
  return {
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
    plugins: [],
    cache: { enabled: true, directory: path.join(directory, "cache") },
  };
}

type BuildResult = {
  refHtml: string;
  publicSlugs: string[];
  discoverableSlugs: string[];
  routablePermalinks: string[];
  affected: number;
  reused: number;
};

async function build(
  files: Record<string, string>,
  directory: string,
): Promise<BuildResult> {
  const events: { name: string; attributes?: Record<string, unknown> }[] = [];
  const tracer = new SinkTracer({
    onEvent: (event) => events.push(event),
    onSpan: () => {},
  });
  const config = testConfig(directory);
  const manager = new ContentManager(memorySource(files), [], {
    config,
    plugins: config.plugins,
    observability: { logger: new NoopLogger(), tracer },
  });
  const manifest = await manager.build({ incremental: true });
  await manager.dispose();
  return {
    refHtml: manifest.bySlug.get("ref")?.html ?? "",
    publicSlugs: manifest.publicEntries.map((entry) => entry.slug).sort(),
    discoverableSlugs: manifest.discoverableEntries
      .map((entry) => entry.slug)
      .sort(),
    routablePermalinks: [...manifest.byRoutablePermalink.keys()].sort(),
    affected: Number(
      events.find((event) => event.name === "build.incremental")?.attributes
        ?.affected ?? -1,
    ),
    reused: events.filter((event) => event.name === "content.reuse").length,
  };
}

async function tempDirectory(name: string): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), `riebeckite-${name}-`));
}

async function coldBuild(files: Record<string, string>): Promise<BuildResult> {
  return await build(files, await tempDirectory("visibility-cold"));
}

const REFERENCE = [
  "---",
  "publish: true",
  "---",
  "",
  "[target](target.md)",
  "",
].join("\n");

type TransitionCase = {
  name: string;
  initialTarget: string;
  nextTarget: string;
  referenceHidden: RegExp;
  referenceVisible: RegExp;
  initialPublic: boolean;
};

const CASES: TransitionCase[] = [
  {
    name: "draft to public",
    initialTarget: "---\nvisibility: draft\n---\n\nTarget body\n",
    nextTarget: "---\nvisibility: public\n---\n\nTarget body\n",
    referenceHidden: /href="target\.md"/,
    referenceVisible: /href="\/target"/,
    initialPublic: false,
  },
  {
    name: "public to draft",
    initialTarget: "---\nvisibility: public\n---\n\nTarget body\n",
    nextTarget: "---\nvisibility: draft\n---\n\nTarget body\n",
    referenceHidden: /href="target\.md"/,
    referenceVisible: /href="\/target"/,
    initialPublic: true,
  },
  {
    name: "private to public",
    initialTarget: "---\npublish: false\n---\n\nTarget body\n",
    nextTarget: "---\npublish: true\n---\n\nTarget body\n",
    referenceHidden: /href="target\.md"/,
    referenceVisible: /href="\/target"/,
    initialPublic: false,
  },
  {
    name: "public to private",
    initialTarget: "---\npublish: true\n---\n\nTarget body\n",
    nextTarget: "---\npublish: false\n---\n\nTarget body\n",
    referenceHidden: /href="target\.md"/,
    referenceVisible: /href="\/target"/,
    initialPublic: true,
  },
];

for (const scenario of CASES) {
  test(`${scenario.name} updates dependents and the public manifest incrementally`, async () => {
    const directory = await tempDirectory(
      `visibility-${scenario.name.replace(/\s+/g, "-")}`,
    );
    const files: Record<string, string> = {
      "ref.md": REFERENCE,
      "target.md": scenario.initialTarget,
      "unrelated.md": "---\npublish: true\n---\n\nUnrelated body\n",
    };

    const first = await build(files, directory);
    if (scenario.initialPublic) {
      assert.match(first.refHtml, scenario.referenceVisible);
      assert.ok(first.publicSlugs.includes("target"));
      assert.ok(first.discoverableSlugs.includes("target"));
    } else {
      assert.match(first.refHtml, scenario.referenceHidden);
      assert.doesNotMatch(first.refHtml, /href="\/target"/);
      assert.equal(first.publicSlugs.includes("target"), false);
      assert.equal(first.discoverableSlugs.includes("target"), false);
      assert.equal(first.routablePermalinks.includes("/target"), false);
    }

    files["target.md"] = scenario.nextTarget;
    const second = await build(files, directory);
    const cold = await coldBuild(files);

    assert.equal(second.refHtml, cold.refHtml);
    assert.deepEqual(second.publicSlugs, cold.publicSlugs);
    assert.deepEqual(second.discoverableSlugs, cold.discoverableSlugs);
    assert.deepEqual(second.routablePermalinks, cold.routablePermalinks);

    if (scenario.initialPublic) {
      assert.match(second.refHtml, scenario.referenceHidden);
      assert.doesNotMatch(second.refHtml, /href="\/target"/);
      assert.equal(second.publicSlugs.includes("target"), false);
      assert.equal(second.discoverableSlugs.includes("target"), false);
    } else {
      assert.match(second.refHtml, scenario.referenceVisible);
      assert.ok(second.publicSlugs.includes("target"));
      assert.ok(second.discoverableSlugs.includes("target"));
    }

    assert.equal(second.reused, 1);
    assert.equal(second.affected, 2);
  });
}
