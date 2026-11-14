import fs from "node:fs/promises";
import path from "node:path";

export async function generateVault(directory, size) {
  await fs.mkdir(path.join(directory, "assets"), { recursive: true });
  for (let index = 0; index < Math.max(1, Math.ceil(size / 100)); index++) {
    await fs.writeFile(
      path.join(directory, "assets", `asset-${index}.png`),
      Buffer.from(`asset ${index}`),
    );
  }
  for (let index = 0; index < size; index++) {
    await writeNote(directory, index);
  }
}

export async function writeNote(directory, index, options = {}) {
  const file = path.join(directory, notePath(index));
  await fs.mkdir(path.dirname(file), { recursive: true });
  const links = [];
  if (index > 0 && index % 3 === 0) links.push(`[[${slugPath(index - 1)}]]`);
  if (index > 10 && index % 10 === 0) links.push(`[[${slugPath(0)}]]`);
  if (index > 5 && index % 25 === 0) links.push(`![[${slugPath(5)}]]`);
  if (index % 20 === 0)
    links.push(
      `![asset](../assets/asset-${index % Math.max(1, Math.ceil((index + 1) / 100))}.png)`,
    );
  const tags = [`tag${index % 20}`, `group${index % 7}`];
  const alias = `Alias ${index}`;
  const markdown = [
    "---",
    `title: Note ${index}`,
    "visibility: public",
    `aliases: ["${alias}"]`,
    `tags: [${tags.map((tag) => `"${tag}"`).join(", ")}]`,
    "---",
    "",
    `# Note ${index}`,
    "",
    `This is deterministic content for note ${index}.`,
    ...links,
    "",
    `#${tags[0]} #${tags[1]}`,
    options.extra ?? "",
  ].join("\n");
  await fs.writeFile(file, markdown, "utf8");
}

export function notePath(index) {
  return `${slugPath(index)}.md`;
}

export function slugPath(index) {
  const section = String(Math.floor(index / 100)).padStart(3, "0");
  return `notes/section-${section}/note-${String(index).padStart(5, "0")}`;
}

export async function append(directory, relativePath, text) {
  await fs.appendFile(path.join(directory, relativePath), text, "utf8");
}

export async function renameMove(directory, index) {
  const from = path.join(directory, notePath(index));
  const to = path.join(
    directory,
    "moved",
    `note-${String(index).padStart(5, "0")}.md`,
  );
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
}
