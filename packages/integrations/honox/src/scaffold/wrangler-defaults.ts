/**
 * Single source of truth for Wrangler configuration defaults.
 *
 * This module is imported by:
 * - scaffold generator (deployment.ts)
 * - contract tests (to verify generated output)
 * - templates/cloudflare/wrangler.jsonc is the human-readable canonical form
 *
 * When updating these values, update all three places:
 * 1. This file (the programmatic source of truth)
 * 2. templates/cloudflare/wrangler.jsonc (the human-readable template)
 * 3. Contract tests will verify consistency automatically
 */

export const WRANGLER_DEFAULTS = {
  /** JSON schema for IDE support and validation */
  $schema: "node_modules/wrangler/config-schema.json",
  /** Worker name - becomes <name>.<account>.workers.dev */
  name: "riebeckite-site",
  /** Compatibility date - update when Workers runtime changes require it */
  compatibility_date: "2026-06-09",
  /** Required for Node.js APIs used by Riebeckite */
  compatibility_flags: ["nodejs_compat"] as const,
  /** Static assets directory - Riebeckite builds to ./dist */
  assets: { directory: "./dist" },
} as const;

/** Type for the wrangler config object */
export type WranglerDefaults = typeof WRANGLER_DEFAULTS;

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

/** Default preset name used by create-riebeckite */
export const DEFAULT_PRESET = "starter" as const;

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
