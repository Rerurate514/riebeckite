import fs from "node:fs";
import path from "node:path";
import { compareLink, renderEntries } from "./changelog_render.mjs";
import { DOCS_RELEASE_PATHS, REPOSITORY_URL } from "./changelog_schema.mjs";

export function docsPage({ header, intro, unreleased, releases, lang }) {
  const lines = [
    "---",
    `title: ${header.title}`,
    "sidebar:",
    `  label: ${header.title}`,
    "  order: 7",
    "---",
    `# ${header.title}`,
    "",
    ...intro,
    "",
    "## Unreleased",
    "",
    ...renderEntries(unreleased),
  ];

  for (let index = 0; index < releases.length; index += 1) {
    const release = releases[index];
    const previousVersion = releases[index + 1]?.version;
    lines.push(
      "",
      `## ${release.version} - ${release.date}`,
      "",
      ...renderEntries(release.entries),
      "",
      `[${lang === "ja" ? "比較" : "Compare"}](${compareLink(
        release.version,
        previousVersion,
      )})`,
    );
  }

  return `${lines.join("\n")}\n`;
}

export function renderDocsPages({ unreleased, releases }) {
  return {
    [DOCS_RELEASE_PATHS.en]: docsPage({
      lang: "en",
      header: { title: "Release Notes" },
      intro: [
        "Riebeckite release history generated from the change entries under `changes/`.",
        "",
        `The complete changelog is [CHANGELOG.md](${REPOSITORY_URL}/blob/main/CHANGELOG.md). Published releases are also available on [GitHub Releases](${REPOSITORY_URL}/releases).`,
        "",
        "The Unreleased section lists changes that are merged but not yet published to npm. Release history starts with the first release after this system was introduced; earlier versions remain available as Git tags and GitHub Releases.",
      ],
      unreleased,
      releases,
    }),
    [DOCS_RELEASE_PATHS.ja]: docsPage({
      lang: "ja",
      header: { title: "リリースノート" },
      intro: [
        "`changes/` の変更エントリから生成した Riebeckite のリリース履歴です。",
        "",
        `完全な変更履歴は [CHANGELOG.md](${REPOSITORY_URL}/blob/main/CHANGELOG.md) にあります。公開済みのリリースは [GitHub Releases](${REPOSITORY_URL}/releases) でも確認できます。`,
        "",
        "Unreleased は、マージ済みでまだ npm に公開されていない変更を示します。変更エントリの本文は記録時の原文をそのまま表示します。変更履歴はこの仕組みを導入した後の最初のリリースから始まり、それ以前のバージョンは Git タグと GitHub Releases に残っています。",
      ],
      unreleased,
      releases,
    }),
  };
}

export function writeFile(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const temporaryPath = `${absolutePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(temporaryPath, content, "utf8");
    fs.renameSync(temporaryPath, absolutePath);
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true });
    throw error;
  }
}

export function readOptional(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath)
    ? fs.readFileSync(absolutePath, "utf8")
    : null;
}
