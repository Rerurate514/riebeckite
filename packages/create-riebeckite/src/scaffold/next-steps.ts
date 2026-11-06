import { GITHUB_ACTIONS_SECRETS } from "./wrangler-defaults.js";

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
  /** The external content repository in `owner/repository` form. */
  readonly contentRepository?: string;
  /** Result of trying to clone the content repository into `content/`. */
  readonly contentClone?: "cloned" | "skipped" | "failed";
  /** The site reads content from another directory. */
  readonly contentDirectory?: string;
  readonly dependenciesInstalled?: boolean;
};

export function formatScaffoldNextSteps(
  relativeDirectory: string,
  options: ScaffoldNextStepsOptions = {},
): string {
  const lines = ["Next steps:"];
  if (relativeDirectory !== ".") {
    lines.push(`  cd "${relativeDirectory}"`);
  }
  if (options.dependenciesInstalled !== true) {
    lines.push("  npm install");
  }
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
  if (options.contentDirectory !== undefined) {
    lines.push("");
    lines.push(
      `Content is read from ${options.contentDirectory}. Add Markdown files there before building.`,
    );
  }
  if (options.externalContent === true) {
    const repository = options.contentRepository;
    lines.push("");
    lines.push(
      repository === undefined
        ? "Content lives in the content repository. CI checks it out to content/."
        : `Content lives in ${repository}. CI checks it out to content/.`,
    );
    lines.push("content/ is ignored by Git in this site repository.");
    if (options.contentClone === "cloned") {
      lines.push(
        "A local clone is ready in content/ with .github/workflows/notify-site.yml.",
      );
    } else if (options.contentClone === "skipped") {
      lines.push(
        "content/ already exists and was left unchanged. Use it for local preview.",
      );
    } else if (repository === undefined) {
      lines.push(
        "Copy github/notify-site.yml to the content repository as .github/workflows/notify-site.yml.",
      );
    } else {
      lines.push("Clone it for local preview:");
      lines.push(`  git clone https://github.com/${repository}.git content`);
      lines.push(
        "Copy github/notify-site.yml to the content repository as .github/workflows/notify-site.yml.",
      );
    }
    lines.push("");
    lines.push("Required GitHub Actions configuration:");
    lines.push(
      `  ${GITHUB_ACTIONS_SECRETS.RIEBECKITE_CONTENT_READ_TOKEN}: site repository secret; only when the content repository is private or internal (Contents: read)`,
    );
    lines.push(
      `  RIEBECKITE_APP_ID and RIEBECKITE_APP_PRIVATE_KEY: content repository secrets for a GitHub App (Contents: read and write on the site repository)`,
    );
    lines.push(
      `  ${GITHUB_ACTIONS_SECRETS.SITE_DISPATCH_TOKEN}: content repository secret fallback when no GitHub App is configured`,
    );
    lines.push(
      `  ${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN}: site repository secret`,
    );
    lines.push(
      `  ${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID}: site repository variable`,
    );
  }
  return lines.join("\n");
}
