import {
  compareStrings,
  isPermanentRedirect,
  normalizeRedirects,
  redirectStubPath,
  renderNotFoundPage,
  renderRedirectLines,
  renderRedirectStubFor,
} from "./redirects.js";
import type {
  DeployOptions,
  DeployOutput,
  DeployProvider,
  PublicRedirect,
} from "./types.js";

/**
 * Renders a Netlify / Cloudflare Pages `_headers` file. Header names are sorted
 * so the output is stable across builds.
 */
export function renderHeaders(headers: Record<string, string>): string {
  const lines = Object.keys(headers)
    .sort(compareStrings)
    .map((name) => `  ${name}: ${headers[name]}`);
  return `/*\n${lines.join("\n")}\n`;
}

/**
 * Renders a Vercel `vercel.json`. Redirects use `{ source, destination,
 * permanent }`, `cleanUrls` stays enabled for extensionless URLs, and
 * `trailingSlash` is only written when configured.
 */
export function renderVercelConfig(args: {
  redirects: readonly PublicRedirect[];
  options?: DeployOptions;
}): string {
  const normalized = normalizeRedirects(args.redirects);
  const config: Record<string, unknown> = {
    redirects: normalized.map((redirect) => ({
      source: redirect.from,
      destination: redirect.to,
      permanent: isPermanentRedirect(redirect.status),
    })),
    cleanUrls: true,
  };
  if (args.options?.trailingSlash) {
    config.trailingSlash = args.options.trailingSlash === "always";
  }
  return `${JSON.stringify(config, null, 2)}\n`;
}

/**
 * Plans every file a single provider needs. Outputs are path-sorted and every
 * emitted path is safe for `normalizeGeneratedOutputPath`. Planning the same
 * path with different content is a programming error and throws.
 */
export function planDeployOutputs(args: {
  provider: DeployProvider;
  redirects: readonly PublicRedirect[];
  options?: DeployOptions;
}): DeployOutput[] {
  const { provider, options } = args;
  const redirects = normalizeRedirects(args.redirects);
  const outputs = new Map<string, string>();
  const add = (path: string, content: string): void => {
    const existing = outputs.get(path);
    if (existing === undefined) {
      outputs.set(path, content);
      return;
    }
    if (existing !== content) {
      throw new Error(
        `Deploy provider "${provider}" planned conflicting content for "${path}".`,
      );
    }
  };

  switch (provider) {
    case "netlify":
    case "cloudflare-pages": {
      const lines = renderRedirectLines(redirects);
      if (lines.length > 0) add("_redirects", lines);
      if (options?.headers && Object.keys(options.headers).length > 0) {
        add("_headers", renderHeaders(options.headers));
      }
      break;
    }
    case "vercel": {
      add("vercel.json", renderVercelConfig({ redirects, options }));
      break;
    }
    case "github-pages": {
      add(".nojekyll", "");
      add("404.html", renderNotFoundPage());
      if (options?.cname) add("CNAME", `${options.cname}\n`);
      for (const redirect of redirects) {
        const path = redirectStubPath(redirect.from);
        if (path === null) continue;
        add(path, renderRedirectStubFor(redirect, options?.baseUrl));
      }
      break;
    }
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unsupported deploy provider: ${String(exhaustive)}`);
    }
  }

  return [...outputs.entries()]
    .map(([path, content]) => ({ path, content }))
    .sort((left, right) => compareStrings(left.path, right.path));
}

/**
 * Merges the planned outputs of several providers. Identical files collapse to
 * one entry; the same path with different content is a hard error so a
 * multi-provider deploy never silently picks a winner.
 */
export function mergePlannedOutputs(
  groups: ReadonlyArray<readonly DeployOutput[]>,
): DeployOutput[] {
  const byPath = new Map<string, string>();
  for (const group of groups) {
    for (const entry of group) {
      const existing = byPath.get(entry.path);
      if (existing === undefined) {
        byPath.set(entry.path, entry.content);
        continue;
      }
      if (existing !== entry.content) {
        throw new Error(
          `Deploy providers planned conflicting content for "${entry.path}".`,
        );
      }
    }
  }
  return [...byPath.entries()]
    .map(([path, content]) => ({ path, content }))
    .sort((left, right) => compareStrings(left.path, right.path));
}
