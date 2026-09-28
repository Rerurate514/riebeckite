// Copies the canonical repository-root LICENSE into the current package.
//
// The repository keeps a single authoritative Apache-2.0 `LICENSE` at its
// root; packages do not maintain their own copies. Running this before packing
// (via `prepack` / `build_package.mjs`) makes every published tarball ship the
// same license text without duplicating it in the repository.
import fs from "node:fs";
import path from "node:path";

function findRepositoryRoot(start) {
  let directory = start;
  for (;;) {
    if (fs.existsSync(path.join(directory, "pnpm-workspace.yaml"))) {
      return directory;
    }
    const parent = path.dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

const packageDirectory = process.cwd();
const repositoryRoot = findRepositoryRoot(packageDirectory);

if (!repositoryRoot) {
  console.error("[license] could not locate the repository root");
  process.exit(1);
}

const source = path.join(repositoryRoot, "LICENSE");
if (!fs.existsSync(source)) {
  console.error(`[license] missing canonical license at ${source}`);
  process.exit(1);
}

const destination = path.join(packageDirectory, "LICENSE");
fs.copyFileSync(source, destination);

const label = path.relative(repositoryRoot, packageDirectory) || ".";
console.log(`[license] copied LICENSE into ${label}`);
