import { spawnSync } from "node:child_process";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const result = spawnSync(pnpm, ["--filter", "create-riebeckite", "test"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, RIEBECKITE_REGISTRY_E2E: "1" },
});

process.exit(result.status ?? 1);
