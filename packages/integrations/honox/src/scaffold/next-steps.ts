// The post-scaffold instructions printed by `create-riebeckite` and
// `riebeckite init`. They share one implementation so the two entry points
// cannot drift apart. Commands use pnpm's local binary resolution so the
// instructions can show the `riebeckite` CLI name without asking npm to
// resolve a package named `riebeckite` from the registry.
export function formatScaffoldNextSteps(relativeDirectory: string): string {
  const lines = ["Next steps:"];
  if (relativeDirectory !== ".") {
    lines.push(`  cd ${relativeDirectory}`);
  }
  lines.push("  pnpm install");
  lines.push("  pnpm exec riebeckite check");
  lines.push("  pnpm exec riebeckite dev");
  lines.push("  pnpm exec riebeckite build");
  return lines.join("\n");
}
