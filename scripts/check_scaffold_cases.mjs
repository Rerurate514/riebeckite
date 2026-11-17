import { expectHoverPreviewSelector } from "./check_scaffold_config.mjs";
import { generate } from "./check_scaffold_presets.mjs";
import {
  expect,
  expectedRiebeckiteSpec,
  readSiteFile,
} from "./check_scaffold_shared.mjs";

export async function checkStarter(scaffoldRiebeckiteSite, tmpRoot) {
  const root = await generate(scaffoldRiebeckiteSite, tmpRoot, "starter", {
    preset: "starter",
    site: {
      title: "Starter Demo",
      baseUrl: "https://starter.example.com",
      locale: "en",
    },
  });
  const config = readSiteFile(root, "riebeckite.config.ts");
  expect(config !== null, "starter: riebeckite.config.ts is missing");
  if (config) {
    expect(config.includes("navigation()"), "starter: navigation must be bare");
    expect(
      !config.includes('label: "Notes"'),
      "starter: navigation must not hard-code sample pages",
    );
    expect(
      config.includes("obsidianMarkdown()"),
      "starter: obsidianMarkdown must be bare",
    );
    expect(config.includes("colorMode()"), "starter: colorMode must be bare");
    expect(
      !config.includes("@riebeckite/plugin-l10n"),
      "starter: l10n must not be registered",
    );
    expect(
      config.includes("seo({ sitemap: true, robots: true })"),
      "starter: seo must include practical options",
    );
    expect(config.includes("search()"), "starter: search must be registered");
    expect(
      config.includes("breadcrumbs()"),
      "starter: breadcrumbs must be registered",
    );
    expect(
      config.includes("@riebeckite/plugin-folder-pages"),
      "starter: folder-pages must be registered",
    );
    expect(
      config.includes("@riebeckite/plugin-hover-preview"),
      "starter: hover-preview must be registered",
    );
    expectHoverPreviewSelector(config, "starter");
    expect(
      !config.includes("mermaid("),
      "starter: niche diagram plugins must be excluded",
    );
  }
  const readme = readSiteFile(root, "README.md");
  expect(readme !== null, "starter: README.md is missing");
  if (readme) {
    expect(
      !readme.includes("Configuration reference"),
      "starter: README must not gain the configuration reference section",
    );
  }
  const manifestFile = readSiteFile(root, "package.json");
  expect(manifestFile !== null, "starter: package.json is missing");
  if (manifestFile) {
    const manifest = JSON.parse(manifestFile);
    expect(
      manifest.dependencies?.["@riebeckite/core"] === expectedRiebeckiteSpec,
      `starter: @riebeckite/core must be pinned to ${expectedRiebeckiteSpec}`,
    );
    expect(
      manifest.dependencies?.["@riebeckite/honox"] === expectedRiebeckiteSpec,
      `starter: @riebeckite/honox must be pinned to ${expectedRiebeckiteSpec}`,
    );
    expect(
      manifest.devDependencies?.["@riebeckite/cli"] === expectedRiebeckiteSpec,
      `starter: @riebeckite/cli must be pinned to ${expectedRiebeckiteSpec}`,
    );
  }
}

export async function checkMinimal(scaffoldRiebeckiteSite, tmpRoot) {
  const root = await generate(scaffoldRiebeckiteSite, tmpRoot, "minimal", {
    preset: "minimal",
    site: {
      title: "Minimal Blog",
      baseUrl: "https://minimal.example.com",
      locale: "en_US",
    },
  });
  const config = readSiteFile(root, "riebeckite.config.ts");
  expect(config !== null, "minimal: riebeckite.config.ts is missing");
  if (config) {
    expect(
      config.includes("obsidianMarkdown()"),
      "minimal: Obsidian Markdown must be registered",
    );
    expect(
      config.includes("minimalTheme()"),
      "minimal: the minimal theme must be registered",
    );
  }
  expect(
    readSiteFile(root, "content/index.md") !== null,
    "minimal: index is missing",
  );
  expect(
    readSiteFile(root, "content/guide.md") === null,
    "minimal: guide must not be generated",
  );
}

export async function checkEmpty(scaffoldRiebeckiteSite, tmpRoot) {
  const root = await generate(scaffoldRiebeckiteSite, tmpRoot, "empty", {
    preset: "empty",
    site: {
      title: "Empty Blog",
      baseUrl: "https://empty.example.com",
      locale: "en",
    },
  });
  const config = readSiteFile(root, "riebeckite.config.ts");
  expect(config !== null, "empty: riebeckite.config.ts is missing");
  if (config) {
    expect(
      !config.includes("@riebeckite/plugin-"),
      "empty: plugins must be absent",
    );
    expect(!config.includes("theme:"), "empty: theme must be absent");
  }
  expect(
    readSiteFile(root, "content/index.md") === null,
    "empty: content must be absent",
  );
}
