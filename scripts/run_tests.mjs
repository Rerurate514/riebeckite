import { spawnSync } from "node:child_process";

// Runs `pnpm -r test` for every package that defines a `test` script.
// Pass `--update` to set UPDATE_GOLDEN=1 so the golden helper rewrites committed
// golden files instead of asserting against them.

const update = process.argv.includes("--update");

const result = spawnSync("pnpm", ["-r", "test"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    ...(update ? { UPDATE_GOLDEN: "1" } : {}),
  },
});

process.exit(result.status ?? 1);
