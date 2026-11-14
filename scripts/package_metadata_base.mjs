import path from "node:path";

export const repositoryRoot = path.resolve(import.meta.dirname, "..");

export const repositoryUrl = "https://github.com/Rerurate514/riebeckite.git";

export const sharedPackageMetadata = {
  license: "Apache-2.0",
  publishConfig: { access: "public" },
  homepage: "https://github.com/Rerurate514/riebeckite#readme",
  bugs: { url: "https://github.com/Rerurate514/riebeckite/issues" },
};

// Match Vite 8, used by the CLI and the HonoX integration. In particular,
// Node 21 and early Node 22 releases are not in its supported range.
export const supportedNodeEngines = { node: "^20.19.0 || >=22.12.0" };
