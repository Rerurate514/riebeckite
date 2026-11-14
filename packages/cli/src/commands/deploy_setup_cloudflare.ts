import type { SetupPrompts } from "../prompts.js";
import { TOKEN_URL } from "./deploy_setup_constants.js";
import {
  type CloudflareAccount,
  CloudflareAccountError,
  CloudflareTokenError,
} from "./deploy_setup_errors.js";

export async function selectCloudflareAccount(
  accounts: readonly CloudflareAccount[],
  env: NodeJS.ProcessEnv,
  prompts: SetupPrompts,
): Promise<CloudflareAccount> {
  const pinned = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (pinned !== undefined && pinned.length > 0) {
    const match = accounts.find((account) => account.id === pinned);
    if (match === undefined) {
      throw new CloudflareAccountError(
        `CLOUDFLARE_ACCOUNT_ID is set to ${pinned}, but Wrangler does not have access to that account.`,
      );
    }
    return match;
  }
  if (accounts.length === 1) {
    const only = accounts[0];
    if (only !== undefined) return only;
  }
  if (!prompts.interactive) {
    throw new CloudflareAccountError(
      "Multiple Cloudflare accounts are available. Set CLOUDFLARE_ACCOUNT_ID to choose one.",
      "Run again with CLOUDFLARE_ACCOUNT_ID set to the account id, or run interactively to choose.",
    );
  }
  return prompts.select(
    "Select the Cloudflare account to deploy to",
    accounts.map((account) => ({
      value: account,
      label: `${account.name} (${account.id})`,
    })),
  );
}

export async function resolveApiToken(
  env: NodeJS.ProcessEnv,
  prompts: SetupPrompts,
  writeLine: (line: string) => void,
  openBrowser: (url: string) => void | Promise<void>,
): Promise<string> {
  const fromEnvironment = env.CLOUDFLARE_API_TOKEN?.trim();
  if (fromEnvironment !== undefined && fromEnvironment.length > 0) {
    writeLine("Using CLOUDFLARE_API_TOKEN from the environment.");
    return fromEnvironment;
  }
  if (!prompts.interactive) {
    throw new CloudflareTokenError(
      "A Cloudflare API token is required for GitHub Actions. Set CLOUDFLARE_API_TOKEN to provide it.",
      'Create a token with the "Workers Scripts: Edit" permission, then run again with CLOUDFLARE_API_TOKEN set.',
    );
  }

  writeLine("A Cloudflare API token is required for GitHub Actions.");
  writeLine('Create a token with the "Workers Scripts: Edit" permission:');
  writeLine(`  ${TOKEN_URL}`);
  const shouldOpen = await prompts.confirm(
    "Open the Cloudflare token page in your browser?",
    true,
  );
  if (shouldOpen) {
    await openBrowser(TOKEN_URL);
  }
  const token = (
    await prompts.password("Paste the Cloudflare API token: ")
  ).trim();
  if (token.length === 0) {
    throw new CloudflareTokenError("No Cloudflare API token was provided.");
  }
  return token;
}
