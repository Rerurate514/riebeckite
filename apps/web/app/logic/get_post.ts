import { contentDir } from "../constants/paths";
import fs from "node:fs/promises";
import path from "node:path";

export async function getAllPosts() {
  const files = await fs.readdir(contentDir);
  return files
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ slug: f.replace(/\.md$/, "") }));
}

export async function getPost(slug: string) {
  const filePath = path.join(contentDir, `${slug}.md`);
  return await fs.readFile(filePath, "utf-8");
}
