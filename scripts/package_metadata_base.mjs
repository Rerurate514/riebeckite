import path from "node:path";

export const repositoryRoot = path.resolve(import.meta.dirname, "..");

export const repositoryUrl = "https://github.com/Rerurate514/riebeckite.git";

export const sharedPackageMetadata = {
  license: "Apache-2.0",
  publishConfig: { access: "public" },
  homepage: "https://github.com/Rerurate514/riebeckite#readme",
  bugs: { url: "https://github.com/Rerurate514/riebeckite/issues" },
};

// Vite 8, used by the CLI and the HonoX integration, needs Node 22.12+.
// Node 22.13 is the baseline so the lint toolchain does not warn.
export const supportedNodeEngines = { node: "^22.13.0 || ^24.0.0 || ^26.0.0" };
