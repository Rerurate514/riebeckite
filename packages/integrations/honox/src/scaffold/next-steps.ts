// The post-scaffold instructions printed by `create-riebeckite` and
// `riebeckite init`. They share one implementation so the two entry points
// cannot drift apart. npm is the reference package manager for generated
// sites: the generated GitHub Actions workflow runs `npm ci` against the
// committed `package-lock.json`, so the printed instructions must produce
// that lockfile rather than a pnpm one. `riebeckite` is a local dependency,
// so `npm exec riebeckite` resolves the binary from `node_modules/.bin`
// instead of the registry.
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
  lines.push("  npm exec riebeckite check");
  lines.push("  npm exec riebeckite dev");
  lines.push("  npm exec riebeckite build");
  if (options.editFile !== undefined) {
    lines.push("");
    lines.push("Then edit:");
    lines.push(`  ${options.editFile}`);
    lines.push("");
    lines.push("Common first settings:");
    lines.push(
      "  riebeckite.config.ts: site.title, site.baseUrl, content.directory",
    );
  }
  if (options.externalContent === true) {
    lines.push("");
    lines.push(
      "Operational content lives in the content repository. CI checks it out to content/.",
    );
    lines.push(
      "Copy github/notify-site.yml to the content repository as .github/workflows/notify-site.yml.",
    );
    lines.push("");
    lines.push("Required GitHub Actions repository secrets:");
    lines.push(
      "  RIEBECKITE_CONTENT_READ_TOKEN: site repository; only when the content repository is private or internal (Contents: read)",
    );
    lines.push(
      "  SITE_DISPATCH_TOKEN: content repository (fine-grained token for the site repository, Contents: read and write)",
    );
    lines.push(
      "  CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID: site repository",
    );
  }
  return lines.join("\n");
}
