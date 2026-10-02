import type { SiteTemplateFile } from "./templates.js";
import { WRANGLER_DEFAULTS, GITHUB_ACTIONS_SECRETS } from "./wrangler-defaults.js";

export type ScaffoldDeploymentOptions = {
  readonly contentRepository?: string;
  readonly siteRepository?: string;
};

const GITHUB_REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function assertGitHubRepository(value: string, option: string): void {
  if (!GITHUB_REPOSITORY_PATTERN.test(value)) {
    throw new Error(
      `${option} must be a GitHub repository in owner/repository form.`,
    );
  }
}

export function deploymentTemplateFiles(
  options: ScaffoldDeploymentOptions,
): readonly SiteTemplateFile[] {
  const contentRepository = options.contentRepository;
  if (contentRepository !== undefined) {
    assertGitHubRepository(contentRepository, "contentRepository");
  }
  if (options.siteRepository !== undefined) {
    assertGitHubRepository(options.siteRepository, "siteRepository");
  }
  if (contentRepository !== undefined && options.siteRepository === undefined) {
    throw new Error(
      "siteRepository is required when contentRepository is provided.",
    );
  }

  return [
    { path: "wrangler.jsonc", content: wranglerConfig() },
    {
      path: ".github/workflows/deploy.yml",
      content: deployWorkflow(contentRepository),
    },
    ...(contentRepository !== undefined && options.siteRepository !== undefined
      ? [
          {
            path: "github/notify-site.yml",
            content: notifySiteWorkflow(options.siteRepository),
          },
        ]
      : []),
  ];
}

function wranglerConfig(): string {
  return `${JSON.stringify(WRANGLER_DEFAULTS, null, 2)}\n`;
}

function deployWorkflow(contentRepository: string | undefined): string {
  const contentCheckout =
    contentRepository === undefined
      ? ""
      : `\n      - name: Check out the external content repository\n        uses: actions/checkout@v4\n        with:\n          repository: ${contentRepository}\n          token: \${{ secrets.RIEBECKITE_CONTENT_READ_TOKEN || github.token }}\n          path: content\n`;
  return `name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  workflow_dispatch:
  repository_dispatch:
    types: [content-updated]

concurrency:
  group: riebeckite-deploy
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Check out the site repository
        uses: actions/checkout@v4
${contentCheckout}
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Validate configuration and plugins
        run: npm exec riebeckite check

      - name: Build the site
        run: npm exec riebeckite build

      - name: Deploy the built assets
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN} }}
          accountId: \${{ secrets.${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID} }}
          command: deploy
`;
}

function notifySiteWorkflow(siteRepository: string): string {
  const [owner, repo] = siteRepository.split("/");
  return `name: Notify Riebeckite site

on:
  push:
    branches: [main]

permissions: {}

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Validate dispatch configuration
        env:
          SITE_DISPATCH_TOKEN: \${{ secrets.${GITHUB_ACTIONS_SECRETS.SITE_DISPATCH_TOKEN} }}
        run: |
          if [ -z "$SITE_DISPATCH_TOKEN" ]; then
            echo "::error::SITE_DISPATCH_TOKEN is not configured. Add a token that can dispatch to ${siteRepository}."
            exit 1
          fi

      - name: Notify the site repository
        uses: actions/github-script@v7
        with:
          github-token: \${{ secrets.${GITHUB_ACTIONS_SECRETS.SITE_DISPATCH_TOKEN} }}
          script: |
            await github.rest.repos.createDispatchEvent({
              owner: ${JSON.stringify(owner)},
              repo: ${JSON.stringify(repo)},
              event_type: "content-updated",
            });
`;
}
