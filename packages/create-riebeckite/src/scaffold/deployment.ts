import { readTemplate } from "./template-loader.js";
import type { SiteTemplateFile } from "./templates.js";
import {
  buildDefaultWranglerConfig,
  GITHUB_ACTIONS_SECRETS,
  WRANGLER_DEFAULTS,
} from "./wrangler-defaults.js";

export interface ScaffoldDeploymentOptions {
  readonly contentRepository?: string;
  readonly siteRepository?: string;
}

const GITHUB_REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

const DEPLOYMENT_TEMPLATE_ROOT = "deployment/github-actions";

const SECRET_SUBSTITUTIONS: ReadonlyArray<readonly [string, string]> = [
  ["{{cloudflareApiToken}}", GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN],
  ["{{cloudflareAccountId}}", GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID],
  [
    "{{contentReadToken}}",
    GITHUB_ACTIONS_SECRETS.RIEBECKITE_CONTENT_READ_TOKEN,
  ],
  ["{{siteDispatchToken}}", GITHUB_ACTIONS_SECRETS.SITE_DISPATCH_TOKEN],
];

export function assertGitHubRepository(value: string, option: string): void {
  if (!GITHUB_REPOSITORY_PATTERN.test(value)) {
    throw new Error(
      `${option} must be a GitHub repository in owner/repository form.`,
    );
  }
}

function readDeploymentTemplate(relativePath: string): string {
  return new TextDecoder().decode(
    readTemplate(`${DEPLOYMENT_TEMPLATE_ROOT}/${relativePath}`),
  );
}

function substituteSecrets(content: string): string {
  let result = content;
  for (const [placeholder, secret] of SECRET_SUBSTITUTIONS) {
    result = result.split(placeholder).join(secret);
  }
  return result;
}

function contentCheckoutStep(contentRepository: string): string {
  const fragment = substituteSecrets(
    readDeploymentTemplate("content-checkout.yml").replace(/\n$/, ""),
  );
  return `\n${fragment.split("{{contentRepository}}").join(contentRepository)}\n`;
}

function deployWorkflow(contentRepository?: string): string {
  const contentCheckout =
    contentRepository === undefined
      ? ""
      : contentCheckoutStep(contentRepository);
  return substituteSecrets(readDeploymentTemplate("deploy.yml")).replace(
    "{{contentCheckout}}",
    contentCheckout,
  );
}

function notifySiteWorkflow(siteRepository: string): string {
  const separator = siteRepository.indexOf("/");
  const owner = siteRepository.slice(0, separator);
  const repository = siteRepository.slice(separator + 1);
  return substituteSecrets(readDeploymentTemplate("notify-site.yml"))
    .split("{{owner}}")
    .join(owner)
    .split("{{repository}}")
    .join(repository);
}

export function wranglerJsoncFile(workerName: string): SiteTemplateFile {
  return {
    path: "wrangler.jsonc",
    content: buildDefaultWranglerConfig(workerName),
  };
}

export function deploymentTemplateFiles(
  options: ScaffoldDeploymentOptions,
): readonly SiteTemplateFile[] {
  const { contentRepository, siteRepository } = options;

  if (contentRepository !== undefined) {
    assertGitHubRepository(contentRepository, "--content-repository");
    if (siteRepository === undefined) {
      throw new Error(
        "--site-repository is required when --content-repository is used with --github-actions.",
      );
    }
  }
  if (siteRepository !== undefined) {
    assertGitHubRepository(siteRepository, "--site-repository");
  }

  const files: SiteTemplateFile[] = [
    wranglerJsoncFile(WRANGLER_DEFAULTS.name),
    {
      path: ".github/workflows/deploy.yml",
      content: deployWorkflow(contentRepository),
    },
  ];

  if (contentRepository !== undefined && siteRepository !== undefined) {
    files.push({
      path: "github/notify-site.yml",
      content: notifySiteWorkflow(siteRepository),
    });
  }

  return files;
}
