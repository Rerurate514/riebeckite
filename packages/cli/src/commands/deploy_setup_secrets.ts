import { GITHUB_ACTIONS_SECRETS } from "create-riebeckite/scaffold";
import type { CommandRunner } from "../process_runner.js";
import { GitHubSecretError } from "./deploy_setup_errors.js";

export async function registerSecret(
  runner: CommandRunner,
  cwd: string,
  repository: string,
  existing: ReadonlySet<string>,
  name: string,
  value: string,
  writeLine: (line: string) => void,
): Promise<void> {
  if (existing.has(name)) {
    writeLine(`✓ ${name} already configured`);
    return;
  }
  const result = await runner.run(
    "gh",
    ["secret", "set", name, "--repo", repository],
    { cwd, input: value },
  );
  if (result.code !== 0) {
    throw new GitHubSecretError(`Could not register the ${name} secret.`);
  }
  writeLine(`✓ ${name} configured`);
}

export async function registerVariable(
  runner: CommandRunner,
  cwd: string,
  repository: string,
  value: string,
  writeLine: (line: string) => void,
): Promise<void> {
  const name = GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID;
  const result = await runner.run(
    "gh",
    ["variable", "set", name, "--repo", repository, "--body", value],
    { cwd },
  );
  if (result.code !== 0) {
    throw new GitHubSecretError(`Could not register the ${name} variable.`);
  }
  writeLine(`✓ ${name} configured`);
}
