import {
  type ScaffoldContentSource,
  type ScaffoldDeployment,
  type ScaffoldDeploymentFlags,
  ScaffoldSiteError,
} from "./options.js";
import type { SiteTemplateFile } from "./template_types.js";
import { readTemplate } from "./template-loader.js";
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

export type ScaffoldPublicationSchedule = {
  readonly enabled: boolean;
  readonly intervalMinutes: number;
};

function renderDeployWorkflow(
  contentRepository?: string,
  schedule?: ScaffoldPublicationSchedule,
): string {
  const contentCheckout =
    contentRepository === undefined
      ? ""
      : contentCheckoutStep(contentRepository);
  return substituteSecrets(readDeploymentTemplate("publish.yml"))
    .replace("{{contentCheckout}}", contentCheckout)
    .replace("{{schedule}}", renderSchedule(schedule));
}

function renderSchedule(schedule?: ScaffoldPublicationSchedule): string {
  if (schedule?.enabled !== true) return "";
  return `  schedule:\n    - cron: "*/${schedule.intervalMinutes} * * * *"\n`;
}

export function deploymentWorkflow(
  content?: ScaffoldContentSource,
  schedule?: ScaffoldPublicationSchedule,
): string {
  const contentRepository =
    content?.type === "external" ? content.contentRepository : undefined;
  return renderDeployWorkflow(contentRepository, schedule);
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

function wranglerJsoncFile(
  workerName: string,
  customDomain?: string,
): SiteTemplateFile {
  return {
    path: "wrangler.jsonc",
    content: buildWranglerConfig(workerName, customDomain),
  };
}

export type ScaffoldDeploymentTemplateOptions = {
  readonly workerName?: string;
  readonly customDomain?: string;
};

export function deploymentTemplateFiles(
  content: ScaffoldContentSource,
  schedule?: ScaffoldPublicationSchedule,
  options: ScaffoldDeploymentTemplateOptions = {},
): readonly SiteTemplateFile[] {
  if (content.type === "external") {
    assertGitHubRepository(content.contentRepository, "--content-repository");
    assertGitHubRepository(content.siteRepository, "--site-repository");
  }

  const files: SiteTemplateFile[] = [
    wranglerJsoncFile(
      options.workerName ?? DEFAULT_WORKER_NAME,
      options.customDomain,
    ),
    {
      path: ".github/workflows/publish.yml",
      content: deploymentWorkflow(content, schedule),
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
