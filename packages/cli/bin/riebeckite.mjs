#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const entryPoint = fileURLToPath(new URL("../index.ts", import.meta.url));
const result = spawnSync(process.execPath, ["--import", "tsx", entryPoint, ...process.argv.slice(2)], {
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
