#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const sections = ["dependencies", "devDependencies", "peerDependencies"];
const runtimeSections = ["dependencies", "peerDependencies"];

function readManifest(directory) {
  return JSON.parse(
    fs.readFileSync(
      path.join(repositoryRoot, directory, "package.json"),
      "utf8",
    ),
  );
}

function createGraph(includedSections) {
  const manifests = new Map();
  const nameToDirectory = new Map();
  for (const directory of PACKAGE_DIRECTORIES) {
    const manifest = readManifest(directory);
    manifests.set(directory, manifest);
    nameToDirectory.set(manifest.name, directory);
  }

  const edges = new Map();
  for (const directory of PACKAGE_DIRECTORIES) {
    const manifest = manifests.get(directory);
    const dependencies = [];
    for (const section of includedSections) {
      for (const name of Object.keys(manifest[section] ?? {})) {
        const target = nameToDirectory.get(name);
        if (target && target !== directory) dependencies.push(target);
      }
    }
    edges.set(directory, dependencies);
  }

  return edges;
}

function findCycle(edges) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  const visit = (directory) => {
    if (visiting.has(directory)) {
      const start = stack.indexOf(directory);
      return [...stack.slice(start), directory];
    }
    if (visited.has(directory)) return null;
    visiting.add(directory);
    stack.push(directory);
    for (const dependency of edges.get(directory) ?? []) {
      const cycle = visit(dependency);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(directory);
    visited.add(directory);
    return null;
  };

  for (const directory of edges.keys()) {
    const cycle = visit(directory);
    if (cycle) return cycle;
  }
  return null;
}

function describe(cycle) {
  return cycle.map((directory) => readManifest(directory).name).join(" -> ");
}

let failed = false;
for (const [label, includedSections] of [
  ["package", sections],
  ["runtime", runtimeSections],
]) {
  const cycle = findCycle(createGraph(includedSections));
  if (cycle) {
    failed = true;
    console.error(`${label} dependency cycle: ${describe(cycle)}`);
  } else {
    console.log(
      `${label} dependency graph is acyclic (${PACKAGE_DIRECTORIES.length} packages).`,
    );
  }
}

if (failed) process.exit(1);
