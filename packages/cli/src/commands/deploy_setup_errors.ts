import type { CommandRunner } from "../process_runner.js";
import type { SetupPrompts } from "../prompts.js";

export type CloudflareAccount = {
  readonly id: string;
  readonly name: string;
};

export type DeploySetupOptions = {
  readonly runner?: CommandRunner;
  readonly prompts?: SetupPrompts;
  readonly env?: NodeJS.ProcessEnv;
  readonly resolveWrangler?: (root: string) => Promise<string>;
  readonly openBrowser?: (url: string) => void | Promise<void>;
  readonly writeLine?: (line: string) => void;
};

export class GitRepositoryMissingError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GitRepositoryMissingError";
    this.hint =
      hint ??
      "Run this command inside a Git repository, or create one with: git init";
  }
}

export class GitHubRemoteMissingError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GitHubRemoteMissingError";
    this.hint =
      hint ??
      "Add a GitHub remote, for example: git remote add origin git@github.com:owner/repository.git";
  }
}

export class GitHubCliNotFoundError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GitHubCliNotFoundError";
    this.hint =
      hint ??
      "Install the GitHub CLI from https://cli.github.com/, then run: gh auth login";
  }
}

export class GitHubAuthenticationError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GitHubAuthenticationError";
    this.hint = hint ?? "Run: gh auth login";
  }
}

export class GitHubRepositoryAccessError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GitHubRepositoryAccessError";
    this.hint =
      hint ??
      "Check that the repository exists and that your GitHub account can access it.";
  }
}

export class GitHubSecretError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GitHubSecretError";
    this.hint =
      hint ??
      "Run the command again to retry. Secrets that are already configured are skipped.";
  }
}

export class CloudflareAuthenticationError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "CloudflareAuthenticationError";
    this.hint = hint ?? "Run: npx wrangler login, then run this command again.";
  }
}

export class CloudflareAccountError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "CloudflareAccountError";
    this.hint =
      hint ??
      "Set CLOUDFLARE_ACCOUNT_ID to the account id, or run interactively to choose an account.";
  }
}

export class CloudflareTokenError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "CloudflareTokenError";
    this.hint =
      hint ??
      'Create a token with the "Workers Scripts: Edit" permission, then run the command again.';
  }
}

export class DeploySetupError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "DeploySetupError";
    this.hint = hint;
  }
}
