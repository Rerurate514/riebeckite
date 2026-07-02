import { CONTENT_DIR } from "../constants/paths";
import { IMAGE_EXTENSIONS } from "../constants/image_exts";
import fs from "node:fs/promises";
import path from "node:path";

export async function getAllPosts() {
  const files = await fs.readdir(CONTENT_DIR, { recursive: true });

  return files
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const normalizedPath = f.replace(/\\/g, "/");
      const slug = normalizedPath.replace(/\.md$/, "");

      return { slug };
    });
}

export async function getPost(slug: string) {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  return await fs.readFile(filePath, "utf-8");
}

export async function buildContentIndex() {
  const files = await fs.readdir(CONTENT_DIR, { recursive: true });
  const index = new Map<string, string>();

  for (const f of files) {
    const normalizedPath = f.replace(/\\/g, "/");
    const ext = normalizedPath.split(".").pop()?.toLowerCase() ?? "";

    let value: string;
    let parts: string[];

    if (ext === "md") {
      value = normalizedPath.replace(/\.md$/, "");
      parts = value.split("/");
    } else if (IMAGE_EXTENSIONS.includes(ext)) {
      value = normalizedPath;
      parts = normalizedPath.split("/");
    } else {
      continue;
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const rawSuffix = parts.slice(i).join("/");
      const key = (ext === "md" ? rawSuffix : rawSuffix).toLowerCase();

      if (!index.has(key)) {
        index.set(key, value);
      }
    }
  }

  return index;
}
