import {
  type ScaffoldContentSource,
  type ScaffoldDeployment,
  type ScaffoldDeploymentFlags,
  ScaffoldSiteError,
} from "./options.js";
import { readTemplate } from "./template-loader.js";
import type { SiteTemplateFile } from "./templates.js";
import {
  buildWranglerConfig,
  DEFAULT_WORKER_NAME,
  GITHUB_ACTIONS_SECRETS,
} from "./wrangler-defaults.js";

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
    throw new ScaffoldSiteError(
      `${option} must be a GitHub repository in owner/repository form.`,
    );
  }
}

export function scaffoldDeploymentFromFlags(
  flags: ScaffoldDeploymentFlags,
): ScaffoldDeployment {
  const githubActions = flags.githubActions ?? false;
  const cloudflareWorkers = flags.cloudflareWorkers ?? false;
  const { contentRepository, siteRepository } = flags;

  if (githubActions && cloudflareWorkers) {
    throw new ScaffoldSiteError(
      "--github-actions and --cloudflare-workers are mutually exclusive.",
    );
  }
  if (contentRepository !== undefined && !githubActions) {
    throw new ScaffoldSiteError(
      "--content-repository requires --github-actions.",
    );
  }
  if (cloudflareWorkers) return { type: "cloudflare-workers" };
  if (!githubActions) return { type: "none" };
  if (contentRepository === undefined) {
    return { type: "github-actions", content: { type: "local" } };
  }
  if (siteRepository === undefined) {
    throw new ScaffoldSiteError(
      "--site-repository is required when --content-repository is used with --github-actions.",
    );
  }
  return {
    type: "github-actions",
    content: { type: "external", contentRepository, siteRepository },
  };
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

function renderDeployWorkflow(contentRepository?: string): string {
  const contentCheckout =
    contentRepository === undefined
      ? ""
      : contentCheckoutStep(contentRepository);
  return substituteSecrets(readDeploymentTemplate("deploy.yml")).replace(
    "{{contentCheckout}}",
    contentCheckout,
  );
}

export function deploymentWorkflow(content?: ScaffoldContentSource): string {
  const contentRepository =
    content?.type === "external" ? content.contentRepository : undefined;
  return renderDeployWorkflow(contentRepository);
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
    content: buildWranglerConfig(workerName),
  };
}

export function deploymentTemplateFiles(
  content: ScaffoldContentSource,
): readonly SiteTemplateFile[] {
  if (content.type === "external") {
    assertGitHubRepository(content.contentRepository, "--content-repository");
    assertGitHubRepository(content.siteRepository, "--site-repository");
  }

  const files: SiteTemplateFile[] = [
    wranglerJsoncFile(DEFAULT_WORKER_NAME),
    {
      path: ".github/workflows/deploy.yml",
      content: deploymentWorkflow(content),
    },
  ];

  if (content.type === "external") {
    files.push({
      path: "github/notify-site.yml",
      content: notifySiteWorkflow(content.siteRepository),
    });
  }

  return files;
}
