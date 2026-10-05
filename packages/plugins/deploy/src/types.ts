/**
 * Static hosting targets this plugin can prepare output files for. Uploading is
 * intentionally out of scope: the plugin only plans deterministic files that a
 * deploy step can then pick up.
 */
export type DeployProvider =
  | "cloudflare-pages"
  | "netlify"
  | "vercel"
  | "github-pages";

/**
 * A previous public path that should keep working after a permalink change.
 * `from` is the old public path, `to` is the current permalink of the target
 * entry.
 */
export type PublicRedirect = {
  from: string;
  to: string;
  status: 301 | 302 | 307 | 308;
};

export type DeployOptions = {
  /** One or more deploy targets to prepare files for. */
  provider: DeployProvider | DeployProvider[];
  /** Vercel `trailingSlash` preference. */
  trailingSlash?: "always" | "never";
  /** Additional hosting headers, rendered per provider when supported. */
  headers?: Record<string, string>;
  /** GitHub Pages custom domain written to `CNAME`. */
  cname?: string;
};

/** A file the plugin wants the build to write into the output directory. */
export type DeployOutput = {
  path: string;
  content: string;
};
