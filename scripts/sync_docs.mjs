import fs from "node:fs";
import path from "node:path";

export const repositoryRoot = path.resolve(import.meta.dirname, "..");
export const repositoryUrl = "https://github.com/Rerurate514/riebeckite";
export const EXTERNAL_PATTERN = /^(https?:|mailto:|tel:|data:)/i;
export const FENCE_PATTERN = /^\s*(`{3,}|~{3,})/;
export const LINK_PATTERN = /(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g;

export const documentationCollections = {
  plugin: {
    plural: "plugins",
    packageRoot: path.join(repositoryRoot, "packages", "plugins"),
    docsRoot: path.join(repositoryRoot, "docs", "docs", "plugins"),
  },
  theme: {
    plural: "themes",
    packageRoot: path.join(repositoryRoot, "packages", "themes"),
    docsRoot: path.join(repositoryRoot, "docs", "docs", "themes"),
  },
};

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function splitTarget(rawTarget) {
  const hashIndex = rawTarget.indexOf("#");
  const queryIndex = rawTarget.indexOf("?");
  const indexes = [hashIndex, queryIndex].filter((index) => index >= 0);
  const index = indexes.length === 0 ? -1 : Math.min(...indexes);
  return index < 0
    ? { pathname: rawTarget, suffix: "" }
    : { pathname: rawTarget.slice(0, index), suffix: rawTarget.slice(index) };
}

export function generatedMarker(collection, pageName) {
  const { plural } = documentationCollections[collection];
  return `<!-- Generated from docs/docs/${plural}/${pageName}. Edit the canonical documentation in docs/docs/${plural} and run \`pnpm docs:sync\`. -->`;
}

export function legacyMarkerPrefix(collection) {
  return `<!-- Generated from packages/${documentationCollections[collection].plural}/`;
}

export function rewriteTarget(rawTarget, options) {
  if (EXTERNAL_PATTERN.test(rawTarget) || rawTarget.startsWith("/")) {
    return rawTarget;
  }
  const { pathname, suffix } = splitTarget(rawTarget);
  if (pathname === "") return rawTarget;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }
  const absolute = path.resolve(options.documentDirectory, decoded);
  for (const [collection, settings] of Object.entries(options.collections)) {
    const relative = path.relative(settings.docsRoot, absolute);
    if (
      relative !== "" &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    ) {
      const name = toPosix(relative);
      const match = /^(.*?)(\.ja)?\.md$/.exec(name);
      if (
        match &&
        !match[1].includes("/") &&
        fs.existsSync(path.join(settings.packageRoot, match[1], "package.json"))
      ) {
        const [, targetSlug, japanese] = match;
        if (collection === options.collection && targetSlug === options.slug) {
          return `./${japanese ? "README_ja.md" : "README.md"}${suffix}`;
        }
        return `../${targetSlug}/${japanese ? "README_ja.md" : "README.md"}${suffix}`;
      }
    }
  }
  const repositoryRelative = toPosix(
    path.relative(options.repositoryDirectory, absolute),
  );
  if (
    repositoryRelative === ".." ||
    repositoryRelative.startsWith("../") ||
    path.isAbsolute(repositoryRelative)
  ) {
    throw new Error(`link target escapes the repository: ${rawTarget}`);
  }
  return `${repositoryUrl}/blob/main/${repositoryRelative}${suffix}`;
}

export function rewriteDocumentLinks(text, options) {
  const lines = text.split(/\r?\n/);
  let openFence = null;
  return lines
    .map((line) => {
      const fence = FENCE_PATTERN.exec(line);
      if (fence) {
        const character = fence[1][0];
        const length = fence[1].length;
        if (openFence === null) openFence = { character, length };
        else if (
          openFence.character === character &&
          length >= openFence.length
        ) {
          openFence = null;
        }
        return line;
      }
      if (openFence !== null) return line;
      return line.replace(
        LINK_PATTERN,
        (_match, bang, text, rawTarget, title = "") =>
          `${bang}[${text}](${rewriteTarget(rawTarget, options)}${title})`,
      );
    })
    .join("\n");
}

export function topLevelHeadings(text) {
  const headings = [];
  let openFence = null;
  for (const line of text.split(/\r?\n/)) {
    const fence = FENCE_PATTERN.exec(line);
    if (fence) {
      const character = fence[1][0];
      const length = fence[1].length;
      if (openFence === null) openFence = { character, length };
      else if (
        openFence.character === character &&
        length >= openFence.length
      ) {
        openFence = null;
      }
      continue;
    }
    if (openFence === null && /^#\s+\S/.test(line)) headings.push(line);
  }
  return headings;
}

function bodyWithoutTitle(text) {
  return text.replace(/^#\s+[^\n]*\n+/, "").trim();
}

export function renderReadme(manifestName, documentText, options) {
  const body = rewriteDocumentLinks(bodyWithoutTitle(documentText), options);
  return `# ${manifestName}\n\n${generatedMarker(options.collection, options.pageName)}\n\n${body}\n`;
}

export function collectManifestSlugs(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) =>
      fs.existsSync(path.join(root, entry.name, "package.json")),
    )
    .map((entry) => entry.name)
    .sort();
}

export function buildDesiredReadmes({
  collection,
  packageRoot,
  docsRoot,
  repositoryDirectory = repositoryRoot,
}) {
  const settings = documentationCollections[collection];
  const collections = {
    ...documentationCollections,
    [collection]: { ...settings, packageRoot, docsRoot },
  };
  const errors = [];
  const readmes = [];
  for (const slug of collectManifestSlugs(packageRoot)) {
    const packageDirectory = path.join(packageRoot, slug);
    let manifest;
    try {
      manifest = JSON.parse(
        fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"),
      );
    } catch {
      errors.push(
        `packages/${settings.plural}/${slug}/package.json is invalid`,
      );
      continue;
    }
    if (typeof manifest.name !== "string" || manifest.name.trim() === "") {
      errors.push(
        `packages/${settings.plural}/${slug}/package.json has no package name`,
      );
      continue;
    }
    for (const [pageName, readmeName] of [
      [`${slug}.md`, "README.md"],
      [`${slug}.ja.md`, "README_ja.md"],
    ]) {
      const pagePath = path.join(docsRoot, pageName);
      if (!fs.existsSync(pagePath)) {
        errors.push(`docs/docs/${settings.plural}/${pageName} is missing`);
        continue;
      }
      const document = fs.readFileSync(pagePath, "utf8");
      if (document.startsWith(legacyMarkerPrefix(collection))) {
        errors.push(
          `docs/docs/${settings.plural}/${pageName} has an obsolete generated marker`,
        );
        continue;
      }
      if (
        topLevelHeadings(document).length !== 1 ||
        !document.startsWith("# ")
      ) {
        errors.push(
          `docs/docs/${settings.plural}/${pageName} must have exactly one leading H1`,
        );
        continue;
      }
      try {
        readmes.push({
          readmeName,
          readmePath: path.join(packageDirectory, readmeName),
          relativePath: `packages/${settings.plural}/${slug}/${readmeName}`,
          content: renderReadme(manifest.name, document, {
            collection,
            collections,
            documentDirectory: docsRoot,
            repositoryDirectory,
            slug,
            pageName,
          }),
        });
      } catch (error) {
        errors.push(
          `docs/docs/${settings.plural}/${pageName} contains an invalid link: ${error.message}`,
        );
      }
    }
  }
  return { readmes, errors };
}

export function planSync(desiredReadmes) {
  return desiredReadmes.filter(
    (readme) =>
      !fs.existsSync(readme.readmePath) ||
      fs.readFileSync(readme.readmePath, "utf8") !== readme.content,
  );
}

export function sync(collection, argv = process.argv.slice(2)) {
  const settings = documentationCollections[collection];
  const check = argv.includes("--check");
  const { readmes, errors } = buildDesiredReadmes({
    collection,
    packageRoot: settings.packageRoot,
    docsRoot: settings.docsRoot,
  });
  if (errors.length > 0) {
    console.error(
      `${collection === "plugin" ? "Plugin" : "Theme"} documentation sync failed (${errors.length} issue(s)):`,
    );
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  const writes = planSync(readmes);
  if (check) {
    if (writes.length > 0) {
      console.error(
        `${collection === "plugin" ? "Plugin" : "Theme"} documentation sync failed (${writes.length} issue(s)):`,
      );
      for (const write of writes)
        console.error(`- ${write.relativePath} is out of date`);
      process.exitCode = 1;
      return;
    }
    console.log(
      `${collection === "plugin" ? "Plugin" : "Theme"} documentation sync check passed for ${readmes.length} README file(s).`,
    );
    return;
  }
  for (const write of writes) fs.writeFileSync(write.readmePath, write.content);
  console.log(
    `${collection === "plugin" ? "Plugin" : "Theme"} documentation sync: ${writes.length} README file(s) written.`,
  );
}
