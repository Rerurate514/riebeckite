import { spawnSync } from "node:child_process";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const result = spawnSync(pnpm, ["--filter", "@riebeckite/honox", "test"], {
  stdio: "inherit",
  env: { ...process.env, RIEBECKITE_REGISTRY_E2E: "1" },
});

process.exit(result.status ?? 1);
