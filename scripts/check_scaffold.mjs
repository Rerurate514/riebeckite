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

const errors = [];

function expect(condition, message) {
  if (!condition) errors.push(message);
}

function readSiteFile(root, name) {
  const file = path.join(root, name);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

const scaffoldSources = [
  path.join(scaffoldDir, "presets.ts"),
  path.join(scaffoldDir, "templates.ts"),
  path.join(scaffoldDir, "localized-content.ts"),
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
    await checkStarter(scaffoldRiebeckiteSite, tmpRoot);
    await checkRich(scaffoldRiebeckiteSite, tmpRoot);
    await checkMax(scaffoldRiebeckiteSite, tmpRoot);
    await checkUltra(scaffoldRiebeckiteSite, tmpRoot);
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
  return target;
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
    expect(!config.includes("seo("), "starter: seo must not be registered");
  }
  const readme = readSiteFile(root, "README.md");
  expect(readme !== null, "starter: README.md is missing");
  if (readme) {
    expect(
      !readme.includes("Configuration reference"),
      "starter: README must not gain the configuration reference section",
    );
  }
}

async function checkRich(scaffoldRiebeckiteSite, tmpRoot) {
  const root = await generate(scaffoldRiebeckiteSite, tmpRoot, "rich", {
    preset: "rich",
    siteTitle: "Rich Blog",
    baseUrl: "https://rich.example.com",
    locale: "en_US",
  });
  const config = readSiteFile(root, "riebeckite.config.ts");
  expect(config !== null, "rich: riebeckite.config.ts is missing");
  if (config) {
    expect(
      config.includes('seo({ siteName: "Rich Blog", sitemap: true })'),
      "rich: seo must show only the essential options",
    );
    expect(
      config.includes("codeEnhance({ lineNumbers: true, copyButton: true })"),
      "rich: codeEnhance must show only the essential options",
    );
    expect(
      config.includes('properties({ render: "slot" })'),
      "rich: properties must show only the essential options",
    );
    expect(
      !config.includes("robots: true") && !config.includes("defaultImage"),
      "rich: seo must not include depth-2/3 options",
    );
    expect(
      !config.includes("github-light"),
      "rich: codeEnhance must not include the depth-3 theme",
    );
  }
  const readme = readSiteFile(root, "README.md");
  expect(readme !== null, "rich: README.md is missing");
  if (readme) {
    expect(
      readme.includes("| Package | Factory | Options |"),
      "rich: README must include the configuration reference table",
    );
    expect(
      readme.includes("content/framework/plugins.md"),
      "rich: README must link the plugin tour content page",
    );
  }
}

async function checkMax(scaffoldRiebeckiteSite, tmpRoot) {
  const root = await generate(scaffoldRiebeckiteSite, tmpRoot, "max", {
    preset: "max",
    siteTitle: "Max Blog",
    baseUrl: "https://max.example.com",
    locale: "en",
  });
  const config = readSiteFile(root, "riebeckite.config.ts");
  expect(config !== null, "max: riebeckite.config.ts is missing");
  if (config) {
    expect(
      config.includes(
        'mermaid({ render: "build", theme: { light: "default", dark: "dark" } })',
      ),
      "max: mermaid must show the standard options",
    );
    expect(
      !config.includes("rb-qr"),
      "max: depth-3 className options must be excluded",
    );
  }
  const examples = readSiteFile(root, "content/examples.md");
  expect(examples !== null, "max: content/examples.md is missing");
  if (examples) {
    expect(
      examples.startsWith("---\npublish: true\n---\n\n# Examples\n"),
      "max: examples page must have the English heading",
    );
  }
}

async function checkUltra(scaffoldRiebeckiteSite, tmpRoot) {
  const root = await generate(scaffoldRiebeckiteSite, tmpRoot, "ultra", {
    preset: "ultra",
    siteTitle: "私のブログ",
    baseUrl: "https://ultra.example.com",
    locale: "ja_JP",
  });
  const config = readSiteFile(root, "riebeckite.config.ts");
  expect(config !== null, "ultra: riebeckite.config.ts is missing");
  if (config) {
    expect(
      config.includes(
        'seo({ siteName: "私のブログ", sitemap: true, robots: true, defaultImage: "/ogp.png", feed: { rss: true, atom: true, json: true } })',
      ),
      "ultra: seo must show every option and follow the site title",
    );
    expect(
      config.includes(
        'l10n({ defaultLang: "ja", languages: ["en","ja","zh-CN","es","de","fr","ko"] })',
      ),
      "ultra: l10n must resolve the Japanese default",
    );
    expect(
      config.includes(
        'deployPlugin({ provider: "cloudflare-pages", baseUrl: "https://ultra.example.com" })',
      ),
      "ultra: deploy must include the site baseUrl",
    );
    expect(
      config.includes('textFragmentPlugin({ prefix: "私のブログ: " })'),
      "ultra: textFragment prefix must follow the site title",
    );
    expect(
      config.includes("reportUnusedAssets: true"),
      "ultra: diagnostics must show its options",
    );
  }
  const readme = readSiteFile(root, "README.md");
  expect(readme !== null, "ultra: README.md is missing");
  if (readme) {
    expect(
      readme.includes("設定リファレンス"),
      "ultra: README must have the Japanese config reference",
    );
    expect(
      readme.includes("デモを試す"),
      "ultra: README must have the demo page links section",
    );
    expect(
      readme.includes("コピーして使えるデモ"),
      "ultra: README must have the copy-paste demos section",
    );
    expect(
      readme.includes("content/examples.md") &&
        !readme.includes("content/examples.en.md"),
      "ultra: README must link the localized examples page",
    );
  }
  const examplesJa = readSiteFile(root, "content/examples.md");
  expect(examplesJa !== null, "ultra: content/examples.md is missing");
  if (examplesJa) {
    expect(
      examplesJa.includes("# サンプル集"),
      "ultra: Japanese examples page must use the translated heading",
    );
  }
  const examplesEn = readSiteFile(root, "content/examples.en.md");
  expect(examplesEn !== null, "ultra: content/examples.en.md is missing");
  if (examplesEn) {
    expect(
      examplesEn.includes("# Examples"),
      "ultra: English examples page must exist",
    );
  }
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
