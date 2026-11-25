import type { ScaffoldPackageManager } from "./scaffold/options.js";
import { PACKAGE_MANAGER } from "./scaffold/wrangler-defaults.js";

export const PNPM_VERSION = "11.5.3";

export type PackageManagerCommand = {
  readonly command: string;
  readonly args: readonly string[];
  readonly label: string;
};

export type PackageManagerCommands = {
  readonly name: ScaffoldPackageManager;
  readonly install: PackageManagerCommand;
  readonly deploy: PackageManagerCommand;
};

export function packageManagerCommands(
  name: ScaffoldPackageManager = PACKAGE_MANAGER,
): PackageManagerCommands {
  if (name === "pnpm") {
    return {
      name,
      install: { command: "pnpm", args: ["install"], label: "pnpm install" },
      deploy: {
        command: "pnpm",
        args: ["exec", "riebeckite", "publish", "run", "--execute"],
        label: "pnpm exec riebeckite publish run --execute",
      },
    };
  }

  return {
    name: "npm",
    install: { command: "npm", args: ["install"], label: "npm install" },
    deploy: {
      command: "npm",
      args: ["exec", "--", "riebeckite", "publish", "run", "--execute"],
      label: "npm exec -- riebeckite publish run --execute",
    },
  };
}
