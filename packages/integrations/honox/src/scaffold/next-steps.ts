// The post-scaffold instructions printed by `create-riebeckite` and
// `riebeckite init`. They share one implementation so the two entry points
// cannot drift apart. Commands use npm because it ships with Node.js; the
// generated package.json lists `@riebeckite/cli`, so `npm exec riebeckite`
// resolves the local binary before consulting the registry.
export type ScaffoldNextStepsOptions = {
  /** First Markdown file to edit, when the scaffold wrote one. */
  readonly editFile?: string;
  /** The site keeps its content in a separate repository. */
  readonly externalContent?: boolean;
};

export function formatScaffoldNextSteps(
  relativeDirectory: string,
  options: ScaffoldNextStepsOptions = {},
): string {
  const lines = ["Next steps:"];
  if (relativeDirectory !== ".") {
    lines.push(`  cd ${relativeDirectory}`);
  }
  lines.push("  npm install");
  lines.push("  npm exec riebeckite dev");
  if (options.editFile !== undefined) {
    lines.push("");
    lines.push("Then edit:");
    lines.push(`  ${options.editFile}`);
  }
  if (options.externalContent === true) {
    lines.push("");
    lines.push(
      "Copy github/notify-site.yml to the content repository as .github/workflows/notify-site.yml.",
    );
  }
  return lines.join("\n");
}
