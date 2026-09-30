// The post-scaffold instructions printed by `create-riebeckite` and
// `riebeckite init`. They share one implementation so the two entry points
// cannot drift apart. Commands use the generated package scripts (`npm run`)
// instead of `npx riebeckite`, which would otherwise probe the npm registry
// when the local `riebeckite` binary is missing (for example after a failed
// install).
export function formatScaffoldNextSteps(relativeDirectory: string): string {
  const lines = ["Next steps:"];
  if (relativeDirectory !== ".") {
    lines.push(`  cd ${relativeDirectory}`);
  }
  lines.push("  npm install");
  lines.push("  npm run check");
  lines.push("  npm run dev");
  lines.push("  npm run build");
  return lines.join("\n");
}
