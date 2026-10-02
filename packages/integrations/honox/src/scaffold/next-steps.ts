// The post-scaffold instructions printed by `create-riebeckite` and
// `riebeckite init`. They share one implementation so the two entry points
// cannot drift apart. npm is the reference package manager for generated
// sites: the generated GitHub Actions workflow runs `npm ci` against the
// committed `package-lock.json`, so the printed instructions must produce
// that lockfile rather than a pnpm one. `riebeckite` is a local dependency,
// so `npm exec riebeckite` resolves the binary from `node_modules/.bin`
// instead of the registry.
export function formatScaffoldNextSteps(relativeDirectory: string): string {
  const lines = ["Next steps:"];
  if (relativeDirectory !== ".") {
    lines.push(`  cd ${relativeDirectory}`);
  }
  lines.push("  npm install");
  lines.push("  npm exec riebeckite check");
  lines.push("  npm exec riebeckite dev");
  lines.push("  npm exec riebeckite build");
  return lines.join("\n");
}
