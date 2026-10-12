import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "--test",
    "test/browser/search-modal.test.ts",
    "test/browser/theme-isolation.test.ts",
  ],
  {
    env: { ...process.env, RIEBECKITE_REQUIRE_BROWSER: "1" },
    stdio: "inherit",
  },
);

process.exitCode = result.status ?? 1;
