import { PACKAGE_MANAGER } from "./scaffold/wrangler-defaults.js";

export type PackageManagerName = "npm" | "pnpm";

export type PackageManagerCommand = {
  readonly command: string;
  readonly args: readonly string[];
  readonly label: string;
};

export type PackageManagerCommands = {
  readonly name: PackageManagerName;
  readonly install: PackageManagerCommand;
  readonly build: PackageManagerCommand;
  readonly deploy: PackageManagerCommand;
};

export function packageManagerCommands(
  name: PackageManagerName = PACKAGE_MANAGER,
): PackageManagerCommands {
  if (name === "pnpm") {
    return {
      name,
      install: { command: "pnpm", args: ["install"], label: "pnpm install" },
      build: { command: "pnpm", args: ["build"], label: "pnpm build" },
      deploy: {
        command: "pnpm",
        args: ["exec", "riebeckite", "deploy"],
        label: "pnpm exec riebeckite deploy",
      },
    };
  }

  return {
    name: "npm",
    install: { command: "npm", args: ["install"], label: "npm install" },
    build: { command: "npm", args: ["run", "build"], label: "npm run build" },
    deploy: {
      command: "npm",
      args: ["exec", "riebeckite", "deploy"],
      label: "npm exec riebeckite deploy",
    },
  };
}
