import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const scaffoldDir = path.join(
  repositoryRoot,
  "packages",
  "integrations",
  "honox",
  "src",
  "scaffold",
);
const honoxPackageRoot = path.join(
  repositoryRoot,
  "packages",
  "integrations",
  "honox",
);

// The scaffold pins every generated Riebeckite dependency to the workspace
// release version. This is the value those pins must match.
const honoxManifest = JSON.parse(
  fs.readFileSync(path.join(honoxPackageRoot, "package.json"), "utf8"),
);
const expectedRiebeckiteSpec = `^${honoxManifest.version}`;

const errors = [];

function expect(condition, message) {
  if (!condition) errors.push(message);
}

function expectConfigPassesBiome(root, label) {
  const configPath = path.join(root, "riebeckite.config.ts");
  if (!fs.existsSync(configPath)) return;

  try {
    execSync(`npx --no-install biome lint "${configPath}"`, {
      cwd: repositoryRoot,
      stdio: "inherit",
    });
  } catch {
    errors.push(
      `${label}: generated riebeckite.config.ts must pass biome lint`,
    );
  }
}

function expectHoverPreviewSelector(config, label) {
  expect(
    config.includes("selector: 'a[href^=\"/\"]'"),
    `${label}: hoverPreview selector must be emitted as a quoted string literal`,
  );
  expect(
    !config.includes('selector: a[href^="/"]'),
    `${label}: hoverPreview selector must not be emitted as an unquoted expression`,
  );
}

function readSiteFile(root, name) {
  const file = path.join(root, name);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

const scaffoldSources = [
  path.join(scaffoldDir, "presets.ts"),
  path.join(scaffoldDir, "templates.ts"),
  path.join(scaffoldDir, "app-templates.ts"),
  path.join(scaffoldDir, "localized-content.ts"),
  path.join(scaffoldDir, "next-steps.ts"),
  path.join(scaffoldDir, "version.ts"),
  path.join(repositoryRoot, "scripts", "check_scaffold.mjs"),
];

async function main() {
  // 1. Biome on the scaffold sources this feature owns (no --write: this
  //    check must not mutate). The whole scaffold directory is excluded so
  //    untouched files (index.ts) cannot surface line-ending noise.
  try {
    execSync(
      `npx --no-install biome check ${scaffoldSources.map((p) => `"${p}"`).join(" ")}`,
      { cwd: repositoryRoot, stdio: "inherit" },
    );
  } catch {
    errors.push("biome check reported issues in the scaffold sources");
  }

  // 2. Build honox so the scaffolders reflect the current sources.
  try {
    execSync("node ../../../scripts/build_package.mjs", {
      cwd: honoxPackageRoot,
      stdio: "inherit",
    });
  } catch {
    errors.push(
      "failed to build packages/integrations/honox before scaffolding",
    );
    return;
  }

  const distUrl = pathToFileURL(
    path.join(honoxPackageRoot, "dist", "index.js"),
  ).href;
  const { scaffoldRiebeckiteSite } = await import(distUrl);

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "check-scaffold-"));
  try {
    checkScaffoldVersion();
    await checkStarter(scaffoldRiebeckiteSite, tmpRoot);
    await checkMinimal(scaffoldRiebeckiteSite, tmpRoot);
    await checkShowcase(scaffoldRiebeckiteSite, tmpRoot);
    await checkEmpty(scaffoldRiebeckiteSite, tmpRoot);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

async function generate(scaffoldRiebeckiteSite, tmpRoot, name, options) {
  const target = path.join(tmpRoot, name);
  await scaffoldRiebeckiteSite({
    targetDirectory: target,
    overwrite: true,
    ...options,
  });
  checkGeneratedCommands(target, name);
  expectConfigPassesBiome(target, name);
  return target;
}

// Every generated site must teach the local CLI (`npm exec riebeckite …`), not
// `npx riebeckite`, which probes the npm registry for a non-existent package
// when the local binary is missing.
function checkGeneratedCommands(root, label) {
  const scan = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        scan(absolute);
        continue;
      }
      if (!/\.(md|json|ts|tsx|txt)$/.test(entry.name)) continue;
      const text = fs.readFileSync(absolute, "utf8");
      if (text.includes("npx riebeckite")) {
        errors.push(
          `${label}: ${path.relative(root, absolute)} must use npm exec riebeckite commands instead of npx riebeckite`,
        );
      }
    }
  };
  scan(root);
}

function checkScaffoldVersion() {
  const source = fs.readFileSync(path.join(scaffoldDir, "version.ts"), "utf8");
  expect(
    source.includes(`"${expectedRiebeckiteSpec}"`),
    `version.ts must pin ${expectedRiebeckiteSpec} to match the workspace release version`,
  );
}

async function checkStarter(scaffoldRiebeckiteSite, tmpRoot) {
  const root = await generate(scaffoldRiebeckiteSite, tmpRoot, "starter", {
    preset: "starter",
    siteTitle: "Starter Demo",
    baseUrl: "https://starter.example.com",
    locale: "en",
  });
  const config = readSiteFile(root, "riebeckite.config.ts");
  expect(config !== null, "starter: riebeckite.config.ts is missing");
  if (config) {
    expect(
      config.includes('label: "Notes", href: "/notes/planning"'),
      "starter: navigation parent must target an existing page",
    );
    expect(
      config.includes("obsidianMarkdown()"),
      "starter: obsidianMarkdown must be bare",
    );
    expect(
      config.includes("colorModePlugin()"),
      "starter: colorModePlugin must be bare",
    );
    expect(
      config.includes('l10n({ defaultLang: "en", languages: ['),
      "starter: l10n must be resolved dynamically",
    );
    expect(
      config.includes(
        'seo({ siteName: "Starter Demo", sitemap: true, robots: true })',
      ),
      "starter: seo must include practical options",
    );
    expect(
      config.includes("searchPlugin()"),
      "starter: search must be registered",
    );
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

async function checkMinimal(scaffoldRiebeckiteSite, tmpRoot) {
  const root = await generate(scaffoldRiebeckiteSite, tmpRoot, "minimal", {
    preset: "minimal",
    siteTitle: "Minimal Blog",
    baseUrl: "https://minimal.example.com",
    locale: "en_US",
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

async function checkShowcase(scaffoldRiebeckiteSite, tmpRoot) {
  const root = await generate(scaffoldRiebeckiteSite, tmpRoot, "showcase", {
    preset: "showcase",
    siteTitle: "私のブログ",
    baseUrl: "https://showcase.example.com",
    locale: "ja_JP",
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
        'seo({ siteName: "私のブログ", sitemap: true, robots: true, defaultImage: "/ogp.png", feed: { rss: true, atom: true, json: true } })',
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
      config.includes(
        'deployPlugin({ provider: "cloudflare-pages", baseUrl: "https://showcase.example.com" })',
      ),
      "showcase: deploy must include the site baseUrl",
    );
    expect(
      config.includes('textFragmentPlugin({ prefix: "私のブログ: " })'),
      "showcase: textFragment prefix must follow the site title",
    );
    expect(
      config.includes("reportUnusedAssets: true"),
      "showcase: diagnostics must show its options",
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

async function checkEmpty(scaffoldRiebeckiteSite, tmpRoot) {
  const root = await generate(scaffoldRiebeckiteSite, tmpRoot, "empty", {
    preset: "empty",
    siteTitle: "Empty Blog",
    baseUrl: "https://empty.example.com",
    locale: "en",
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

await main();

if (errors.length > 0) {
  console.error(`Scaffold validation failed (${errors.length} error(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    "Scaffold validated: biome clean, presets generate tiered options and localized READMEs/examples.",
  );
}
