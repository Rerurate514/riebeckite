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

export async function checkShowcase(scaffoldRiebeckiteSite, tmpRoot) {
  const root = await generate(scaffoldRiebeckiteSite, tmpRoot, "showcase", {
    preset: "showcase",
    site: {
      title: "私のブログ",
      baseUrl: "https://showcase.example.com",
      locale: "ja_JP",
    },
  });
  const config = readSiteFile(root, "riebeckite.config.ts");
  expect(config !== null, "showcase: riebeckite.config.ts is missing");
  if (config) {
    expect(
      config.includes('label: "Framework", href: "/framework/plugins"'),
      "showcase: navigation parent must target an existing page",
    );
    expect(
      config.includes(
        "seo({ sitemap: true, robots: true, feed: { rss: true, atom: true, json: true } })",
      ),
      "showcase: seo must show every option and follow the site title",
    );
    expect(
      config.includes(
        'l10n({ defaultLang: "ja", languages: ["en","ja","zh-CN","es","de","fr","ko"] })',
      ),
      "showcase: l10n must resolve the Japanese default",
    );
    expect(
      config.includes('deploy({ provider: "cloudflare-pages" })'),
      "showcase: deploy must configure a provider",
    );
    expect(
      config.includes("textFragment()"),
      "showcase: textFragment must be registered without options",
    );
    expect(
      config.includes("reportUnusedAssets: true"),
      "showcase: diagnostics must show its options",
    );
    expect(
      config.includes("breadcrumbs()"),
      "showcase: breadcrumbs must be registered",
    );
    expect(
      config.includes("folderPages()"),
      "showcase: folder-pages must be registered",
    );
    expectHoverPreviewSelector(config, "showcase");
  }
  const readme = readSiteFile(root, "README.md");
  expect(readme !== null, "showcase: README.md is missing");
  if (readme) {
    expect(
      readme.includes("設定リファレンス"),
      "showcase: README must have the Japanese config reference",
    );
    expect(
      readme.includes("デモを試す"),
      "showcase: README must have the demo page links section",
    );
    expect(
      readme.includes("コピーして使えるデモ"),
      "showcase: README must have the copy-paste demos section",
    );
    expect(
      readme.includes("content/examples.md") &&
        !readme.includes("content/examples.en.md"),
      "showcase: README must link the localized examples page",
    );
  }
  const examplesJa = readSiteFile(root, "content/examples.md");
  expect(examplesJa !== null, "showcase: content/examples.md is missing");
  if (examplesJa) {
    expect(
      examplesJa.includes("# サンプル集"),
      "showcase: Japanese examples page must use the translated heading",
    );
  }
  const examplesEn = readSiteFile(root, "content/examples.en.md");
  expect(examplesEn !== null, "showcase: content/examples.en.md is missing");
  if (examplesEn) {
    expect(
      examplesEn.includes("# Examples"),
      "showcase: English examples page must exist",
    );
  }
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
