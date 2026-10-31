/**
 * Hosting adapters describe what a target can do. Deployment itself lives in
 * the CLI (or an external CI workflow); Core never talks to a provider API.
 */
export type HostingProvider =
  | "github-pages"
  | "cloudflare-workers"
  | "cloudflare-pages"
  | "netlify"
  | "vercel";

export type HostingSchedulerGuarantee = "native" | "ci-best-effort" | "none";

export type HostingCapabilities = {
  readonly scheduler: HostingSchedulerGuarantee;
  readonly atomicDeploy: boolean;
  readonly rollback: boolean;
  readonly redirects: "native" | "static-stub" | "unsupported";
  readonly headers: boolean;
  readonly customDomain: boolean;
};

export type HostingAdapterDefinition = {
  readonly id: HostingProvider;
  readonly displayName: string;
  readonly capabilities: HostingCapabilities;
  /**
   * Environment variable names only. Values are never read, written, or
   * recorded by Riebeckite.
   */
  readonly requiredEnvironment: readonly string[];
  /**
   * Executable used for an explicit deploy, or undefined when the provider is
   * deployed by an external CI workflow.
   */
  readonly executable?: string;
};

export const HOSTING_ADAPTERS: Readonly<
  Record<HostingProvider, HostingAdapterDefinition>
> = {
  "github-pages": {
    id: "github-pages",
    displayName: "GitHub Pages",
    capabilities: {
      scheduler: "ci-best-effort",
      atomicDeploy: true,
      rollback: true,
      redirects: "static-stub",
      headers: false,
      customDomain: true,
    },
    requiredEnvironment: [],
  },
  "cloudflare-workers": {
    id: "cloudflare-workers",
    displayName: "Cloudflare Workers",
    capabilities: {
      scheduler: "none",
      atomicDeploy: true,
      rollback: true,
      redirects: "native",
      headers: true,
      customDomain: true,
    },
    requiredEnvironment: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"],
    executable: "wrangler",
  },
  "cloudflare-pages": {
    id: "cloudflare-pages",
    displayName: "Cloudflare Pages",
    capabilities: {
      scheduler: "none",
      atomicDeploy: true,
      rollback: true,
      redirects: "native",
      headers: true,
      customDomain: true,
    },
    requiredEnvironment: [
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
      "RIEBECKITE_CLOUDFLARE_PAGES_PROJECT",
    ],
    executable: "wrangler",
  },
  netlify: {
    id: "netlify",
    displayName: "Netlify",
    capabilities: {
      scheduler: "none",
      atomicDeploy: true,
      rollback: true,
      redirects: "native",
      headers: true,
      customDomain: true,
    },
    requiredEnvironment: ["NETLIFY_AUTH_TOKEN", "NETLIFY_SITE_ID"],
    executable: "netlify",
  },
  vercel: {
    id: "vercel",
    displayName: "Vercel",
    capabilities: {
      scheduler: "none",
      atomicDeploy: true,
      rollback: true,
      redirects: "native",
      headers: true,
      customDomain: true,
    },
    requiredEnvironment: ["VERCEL_TOKEN"],
    executable: "vercel",
  },
};

export type HostingDetectionInput = {
  readonly wranglerConfig?: boolean;
  readonly githubPagesWorkflow?: boolean;
  readonly vercelConfig?: boolean;
  readonly netlifyConfig?: boolean;
};

/**
 * Picks an adapter from files that already exist in the project. The first
 * match wins; an explicit `--provider` always overrides detection.
 */
export function detectHostingProvider(
  input: HostingDetectionInput,
): HostingProvider | undefined {
  if (input.wranglerConfig) return "cloudflare-workers";
  if (input.githubPagesWorkflow) return "github-pages";
  if (input.netlifyConfig) return "netlify";
  if (input.vercelConfig) return "vercel";
  return undefined;
}

export function resolveHostingCapabilities(
  provider: HostingProvider | undefined,
): HostingCapabilities | undefined {
  return provider === undefined
    ? undefined
    : HOSTING_ADAPTERS[provider].capabilities;
}

/**
 * Scheduled publication is only a guarantee where the host runs it. CI
 * schedulers are best effort, so every plan re-evaluates publication state.
 */
export function describeSchedulerGuarantee(
  provider: HostingProvider | undefined,
): string {
  const guarantee = resolveHostingCapabilities(provider)?.scheduler ?? "none";
  if (guarantee === "native") return "The host schedules the deployment.";
  if (guarantee === "ci-best-effort")
    return "A CI schedule triggers the deployment; the run may be delayed.";
  return "Riebeckite does not schedule deployments for this host; run publish from CI or manually.";
}
