import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "tests/web-e2e/browser.test.ts"],
  {
    env: { ...process.env, RIEBECKITE_REQUIRE_BROWSER: "1" },
    stdio: "inherit",
  },
);

process.exitCode = result.status ?? 1;
