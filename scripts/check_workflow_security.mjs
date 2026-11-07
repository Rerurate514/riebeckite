#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const workflowExtension = /\.(?:ya?ml)$/;
const actionReference = /^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm;
const commitSha = /^[0-9a-f]{40}$/i;

export function findUnpinnedActionReferences(directory) {
  const violations = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      violations.push(...findUnpinnedActionReferences(target));
      continue;
    }
    if (!entry.isFile() || !workflowExtension.test(entry.name)) continue;
    const source = fs.readFileSync(target, "utf8");
    for (const match of source.matchAll(actionReference)) {
      const reference = match[1];
      if (!reference || reference.startsWith("./")) continue;
      const revision = reference.slice(reference.lastIndexOf("@") + 1);
      if (!commitSha.test(revision)) {
        violations.push(`${path.relative(directory, target)}: ${reference}`);
      }
    }
  }
  return violations;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const directory = path.join(repositoryRoot, ".github");
  const violations = findUnpinnedActionReferences(directory);
  if (violations.length > 0) {
    console.error("GitHub Actions must be pinned to full commit SHAs:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
  }
}
