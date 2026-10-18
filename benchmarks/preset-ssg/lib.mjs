import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const pixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9wAAAAABJRU5ErkJggg==",
  "base64",
);

export const scenarioNames = [
  "cold",
  "no-change",
  "single-body-edit",
  "link-edit",
  "add",
  "delete",
  "rename",
  "publication-change",
  "draft-to-public",
];

export async function createBenchmarkContent({
  contentDirectory,
  count,
  preset,
}) {
  const benchmarkDirectory = path.join(contentDirectory, "benchmark");
  await fs.mkdir(path.join(benchmarkDirectory, "assets"), { recursive: true });
  await fs.writeFile(
    path.join(benchmarkDirectory, "assets", "pixel.png"),
    pixelPng,
  );
  for (let index = 0; index < count; index += 1) {
    const section = String(Math.floor(index / 50)).padStart(3, "0");
    const language = index % 2 === 0 ? "en" : "ja";
    const translation = Math.floor(index / 2);
    const lines = [
      "---",
      `title: ${language === "ja" ? `記録 ${index}` : `Record ${index}`}`,
      `aliases: ["record-${index}"]`,
      `visibility: ${index % 17 === 0 ? "draft" : "public"}`,
      `tags: ["benchmark", "section-${index % 8}"]`,
      ...(preset === "showcase"
        ? [`lang: ${language}`, `translation: benchmark-${translation}`]
        : []),
      "---",
      "",
      `# ${language === "ja" ? `ベンチマーク記録 ${index}` : `Benchmark record ${index}`}`,
      "",
      language === "ja"
        ? "実際のノートに近い本文です。公開状態、リンク、添付ファイルを含みます。"
        : "This realistic note includes publication state, links, and an attachment.",
      "",
      index > 0
        ? `[[benchmark/section-${String(Math.floor((index - 1) / 50)).padStart(3, "0")}/note-${String(index - 1).padStart(5, "0")}]]`
        : "",
      "",
      `[Reference](https://example.test/reference/${index})`,
      "",
      `![Pixel](../assets/pixel.png)`,
      "",
    ];
    await fs.mkdir(path.join(benchmarkDirectory, `section-${section}`), {
      recursive: true,
    });
    await fs.writeFile(
      notePath(contentDirectory, index),
      `${lines.join("\n")}\n`,
      "utf8",
    );
  }
}

export async function applyScenario({ contentDirectory, count, scenario }) {
  const last = notePath(contentDirectory, count - 1);
  if (scenario === "cold" || scenario === "no-change") return;
  if (scenario === "single-body-edit") {
    await fs.appendFile(
      last,
      "\nA deterministic body edit for this benchmark.\n",
      "utf8",
    );
    return;
  }
  if (scenario === "link-edit") {
    await fs.appendFile(
      last,
      "\n[[benchmark/section-000/note-00000]]\n",
      "utf8",
    );
    return;
  }
  if (scenario === "add") {
    await fs.mkdir(path.dirname(notePath(contentDirectory, count)), {
      recursive: true,
    });
    await fs.writeFile(
      notePath(contentDirectory, count),
      '---\ntitle: Added record\nvisibility: public\naliases: ["added-record"]\n---\n\n# Added record\n\n[[benchmark/section-000/note-00000]]\n',
      "utf8",
    );
    return;
  }
  if (scenario === "delete") {
    await fs.rm(last);
    return;
  }
  if (scenario === "rename") {
    const destination = path.join(
      contentDirectory,
      "benchmark",
      "renamed",
      "record.md",
    );
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.rename(notePath(contentDirectory, 0), destination);
    return;
  }
  if (scenario === "publication-change") {
    for (let index = 0; index < count; index += 1) {
      const file = notePath(contentDirectory, index);
      const source = await fs.readFile(file, "utf8");
      if (!source.includes("visibility: public")) continue;
      await fs.writeFile(
        file,
        source.replace("visibility: public", "visibility: draft"),
        "utf8",
      );
      return;
    }
    throw new Error("Publication-change scenario requires a public note.");
  }
  if (scenario === "draft-to-public") {
    for (let index = 0; index < count; index += 1) {
      const file = notePath(contentDirectory, index);
      const source = await fs.readFile(file, "utf8");
      if (!source.includes("visibility: draft")) continue;
      await fs.writeFile(
        file,
        source.replace("visibility: draft", "visibility: public"),
        "utf8",
      );
      return;
    }
    throw new Error("Draft-to-public scenario requires a draft note.");
  }
  throw new Error(`Unknown preset benchmark scenario: ${scenario}`);
}

export async function snapshotTree(directory) {
  const snapshot = {};
  async function walk(current, relative = "") {
    const entries = await fs
      .readdir(current, { withFileTypes: true })
      .catch(() => []);
    for (const entry of entries) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(child, childRelative);
      else if (entry.isFile())
        snapshot[childRelative] = hash(await fs.readFile(child));
    }
  }
  await walk(directory);
  return snapshot;
}

export function compareSnapshots(incremental, clean) {
  const paths = [
    ...new Set([...Object.keys(incremental), ...Object.keys(clean)]),
  ].sort();
  const differences = paths
    .filter((file) => incremental[file] !== clean[file])
    .map((file) => ({
      file,
      incremental: incremental[file] ?? null,
      clean: clean[file] ?? null,
    }));
  return { equivalent: differences.length === 0, differences };
}

export async function removeSafeTemporaryDirectory(directory, temporaryRoot) {
  const resolvedDirectory = path.resolve(directory);
  const resolvedRoot = path.resolve(temporaryRoot);
  if (
    resolvedDirectory === resolvedRoot ||
    !resolvedDirectory.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error(
      `Refusing to remove a directory outside the benchmark root: ${resolvedDirectory}`,
    );
  }
  await fs.rm(resolvedDirectory, { recursive: true, force: true });
}

export function notePath(contentDirectory, index) {
  const section = String(Math.floor(index / 50)).padStart(3, "0");
  return path.join(
    contentDirectory,
    "benchmark",
    `section-${section}`,
    `note-${String(index).padStart(5, "0")}.md`,
  );
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}
