#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const templatePath = path.join(repositoryRoot, "changes", "TEMPLATE.md");
const unreleasedDirectory = path.join(repositoryRoot, "changes", "unreleased");

const rawSlug = process.argv[2] ?? "change";
const slug = rawSlug
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

if (slug === "") {
  console.error("Usage: node scripts/new_change.mjs <slug>");
  process.exitCode = 1;
} else {
  const now = new Date();
  const timestamp = [
    now.getUTCFullYear().toString().padStart(4, "0"),
    (now.getUTCMonth() + 1).toString().padStart(2, "0"),
    now.getUTCDate().toString().padStart(2, "0"),
  ].join("");
  const time = [
    now.getUTCHours().toString().padStart(2, "0"),
    now.getUTCMinutes().toString().padStart(2, "0"),
    now.getUTCSeconds().toString().padStart(2, "0"),
  ].join("");
  const suffix = randomBytes(3).toString("hex");
  const filename = `${timestamp}-${time}-${slug}-${suffix}.md`;
  const targetPath = path.join(unreleasedDirectory, filename);

  fs.mkdirSync(unreleasedDirectory, { recursive: true });
  fs.copyFileSync(templatePath, targetPath);
  console.log(`Created changes/unreleased/${filename}`);
  console.log("Fill in the frontmatter, then run pnpm changelog.");
}
