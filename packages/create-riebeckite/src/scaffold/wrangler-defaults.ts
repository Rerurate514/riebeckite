import path from "node:path";

/**
 * Static defaults for the Cloudflare Workers config that the scaffold generates.
 */

export const CLOUDFLARE_WORKERS_DEFAULTS = {
  /** JSON schema for IDE support and validation */
  $schema: "node_modules/wrangler/config-schema.json",
  /** Compatibility date - update when Workers runtime changes require it */
  compatibility_date: "2026-06-09",
  /** Required for Node.js APIs used by Riebeckite */
  compatibility_flags: ["nodejs_compat"] as const,
  /** Static assets directory - Riebeckite builds to ./dist */
  assets: { directory: "./dist" },
} as const;

/** Type for the wrangler config object */
export type CloudflareWorkersDefaults = typeof CLOUDFLARE_WORKERS_DEFAULTS;

export const WRANGLER_VERSION = "^4.83.0";

export const DEFAULT_WORKER_NAME = "riebeckite-site";

export const WORKER_NAME_MAX_LENGTH = 63;

export function workerNameFromDirectory(directoryName: string): string {
  const normalized = directoryName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const name = normalized.slice(0, WORKER_NAME_MAX_LENGTH).replace(/-+$/g, "");
  return name.length > 0 ? name : DEFAULT_WORKER_NAME;
}

export function buildWranglerConfig(workerName: string): string {
  const config = {
    $schema: CLOUDFLARE_WORKERS_DEFAULTS.$schema,
    name: workerName,
    compatibility_date: CLOUDFLARE_WORKERS_DEFAULTS.compatibility_date,
    compatibility_flags: CLOUDFLARE_WORKERS_DEFAULTS.compatibility_flags,
    assets: CLOUDFLARE_WORKERS_DEFAULTS.assets,
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

export function wranglerConfigForDirectory(directory: string): string {
  return buildWranglerConfig(workerNameFromDirectory(path.basename(directory)));
}

/** Expected secret names in GitHub Actions workflow */
export const GITHUB_ACTIONS_SECRETS = {
  /** Cloudflare API token with Workers Scripts: Edit permission */
  CLOUDFLARE_API_TOKEN: "CLOUDFLARE_API_TOKEN",
  /** Cloudflare Account ID (found in Workers & Pages dashboard URL) */
  CLOUDFLARE_ACCOUNT_ID: "CLOUDFLARE_ACCOUNT_ID",
  /** Optional: Token for content repo to dispatch to site repo */
  SITE_DISPATCH_TOKEN: "SITE_DISPATCH_TOKEN",
  /** Optional: Token for site repo to read content repo */
  RIEBECKITE_CONTENT_READ_TOKEN: "RIEBECKITE_CONTENT_READ_TOKEN",
} as const;

/** Package manager used by generated sites and workflows */
export const PACKAGE_MANAGER = "npm" as const;

/** Lockfile name that must be committed */
export const LOCKFILE_NAME = "package-lock.json" as const;

/** Files/directories that must be in .gitignore */
export const GITIGNORE_REQUIRED = [
  "node_modules/",
  "dist/",
  ".riebeckite/",
  "app/.riebeckite/",
] as const;

/** Files that must NOT be in .gitignore */
export const GITIGNORE_FORBIDDEN = ["package-lock.json"] as const;

/** Starter preset content pages (base names without language suffixes) */
export const STARTER_CONTENT_PAGES = [
  "index",
  "guide",
  "examples",
  "notes/planning",
  "notes/writing",
] as const;

/** Starter preset languages */
export const STARTER_LANGUAGES = [
  "en",
  "ja",
  "zh-CN",
  "es",
  "de",
  "fr",
  "ko",
] as const;
