// The post-scaffold instructions printed by `create-riebeckite` and
// `riebeckite init`. They share one implementation so the two entry points
// cannot drift apart. Commands use the installed local CLI through `npm exec`
// instead of `npx riebeckite`, which would otherwise probe the npm registry
// when the local `riebeckite` binary is missing (for example after a failed
// install).
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
