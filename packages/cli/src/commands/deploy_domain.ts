import fs from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";
import { domainToASCII } from "node:url";
import {
  applyEdits,
  modify,
  type ParseError,
  parse,
  parseTree,
} from "jsonc-parser";
import type { RiebeckiteProject } from "../application_root.js";
import { findWranglerConfig, resolveDeployRoot, runDeploy } from "./deploy.js";

type DomainPrompts = {
  readonly interactive: boolean;
  input(message: string): Promise<string>;
  confirm(message: string, initial: boolean): Promise<boolean>;
};

export type DeployDomainOptions = {
  readonly prompts?: DomainPrompts;
  readonly writeLine?: (line: string) => void;
  readonly deploy?: (project: RiebeckiteProject) => Promise<void>;
  readonly writeConfig?: (filePath: string, content: string) => Promise<void>;
};

export class CustomDomainError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string, cause?: unknown) {
    super(message, { cause });
    this.name = "CustomDomainError";
    this.hint = hint;
  }
}

export async function runDeployDomain(
  project: RiebeckiteProject,
  options: DeployDomainOptions = {},
): Promise<void> {
  const prompts = options.prompts ?? createDomainPrompts();
  const writeLine = options.writeLine ?? ((line: string) => console.log(line));
  const configPath = await findWranglerConfig(resolveDeployRoot(project));
  if (configPath === undefined) {
    throw new CustomDomainError(
      "Could not find a Wrangler configuration file.",
      "Deploy to Cloudflare Workers first with: npm exec riebeckite deploy",
    );
  }
  if (path.extname(configPath).toLowerCase() === ".toml") {
    throw new CustomDomainError(
      "Existing wrangler.toml detected. It was left unchanged.",
      'Add a [[routes]] entry with pattern = "example.com" and custom_domain = true manually, then deploy.',
    );
  }
  if (!prompts.interactive) {
    throw new CustomDomainError(
      "A Custom Domain must be entered in an interactive terminal.",
    );
  }

  const domain = normalizeCustomDomain(
    await prompts.input("Enter a domain, for example docs.example.com: "),
  );
  const content = await fs.readFile(configPath, "utf8");
  const update = addCustomDomainToJsonc(content, domain);

  writeLine("");
  writeLine("Configuration");
  writeLine(`  Domain: ${domain}`);
  writeLine(`  Config: ${path.basename(configPath)}`);
  writeLine(
    `  Action: ${update.alreadyConfigured ? "Keep Workers Custom Domain" : "Add Workers Custom Domain"}`,
  );

  if (!update.alreadyConfigured) {
    const confirmed = await prompts.confirm(
      `Add ${domain} to this Riebeckite site?`,
      true,
    );
    if (!confirmed) {
      writeLine("No changes were made.");
      return;
    }
    const writeConfig = options.writeConfig ?? writeFileAtomically;
    await writeConfig(configPath, update.content);
    writeLine(`✓ ${path.basename(configPath)} updated`);
  } else {
    writeLine(`✓ ${domain} is already configured`);
  }

  const deployNow = await prompts.confirm("Deploy now?", true);
  if (!deployNow) {
    writeLine("");
    writeLine("✓ Custom Domain configured.");
    writeLine("");
    writeLine("Deploy when ready:");
    writeLine("  npm exec riebeckite deploy");
    return;
  }

  try {
    await (
      options.deploy ?? ((target) => runDeploy(target, { dryRun: false }))
    )(project);
  } catch (error) {
    if (!update.alreadyConfigured) {
      throw new CustomDomainError(
        "Custom Domain configuration was saved. Deployment failed.",
        "Retry with: npm exec riebeckite deploy",
        error,
      );
    }
    throw error;
  }
  writeLine(`✓ Deployed\n\nhttps://${domain}`);
}

export function normalizeCustomDomain(input: string): string {
  if (input !== input.trim() || /\s/.test(input)) {
    throw new CustomDomainError("Enter a hostname without whitespace.");
  }
  if (
    input.includes("://") ||
    input.includes("/") ||
    input.includes("*") ||
    input.endsWith(".")
  ) {
    throw new CustomDomainError(
      "Enter a hostname only, without a URL, path, wildcard, or trailing dot.",
    );
  }
  const hostname = domainToASCII(input).toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    isIP(hostname) !== 0 ||
    !hostname.includes(".")
  ) {
    throw new CustomDomainError(
      "Enter a public domain or subdomain, for example docs.example.com.",
    );
  }
  if (
    hostname.length > 253 ||
    hostname
      .split(".")
      .some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  ) {
    throw new CustomDomainError("Enter a valid domain or subdomain hostname.");
  }
  return hostname;
}

export function addCustomDomainToJsonc(
  content: string,
  domain: string,
): { readonly content: string; readonly alreadyConfigured: boolean } {
  const errors: ParseError[] = [];
  const tree = parseTree(content, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  });
  if (tree === undefined || errors.length > 0 || tree.type !== "object") {
    throw new CustomDomainError(
      "Could not safely parse the Wrangler JSON configuration.",
    );
  }
  const config = parse(content, [], {
    allowTrailingComma: true,
    disallowComments: false,
  });
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new CustomDomainError(
      "The Wrangler JSON configuration must be an object.",
    );
  }
  const routes = (config as Record<string, unknown>).routes;
  if (routes !== undefined && !Array.isArray(routes)) {
    throw new CustomDomainError(
      "The existing Wrangler routes setting is not an array and was left unchanged.",
    );
  }
  const routeEntries: readonly unknown[] = Array.isArray(routes) ? routes : [];
  let alreadyConfigured = false;
  for (const route of routeEntries) {
    const entry =
      typeof route === "object" && route !== null && !Array.isArray(route)
        ? (route as Record<string, unknown>)
        : undefined;
    const pattern = typeof route === "string" ? route : entry?.pattern;
    if (
      typeof pattern !== "string" ||
      !matchesConfiguredDomain(pattern, domain)
    ) {
      continue;
    }
    if (entry?.custom_domain === true) {
      alreadyConfigured = true;
      continue;
    }
    throw new CustomDomainError(
      `${domain} already has a non-Custom-Domain route in the Wrangler configuration.`,
      "Remove or migrate that route before adding this Custom Domain.",
    );
  }
  if (alreadyConfigured) return { content, alreadyConfigured: true };
  const entry = { pattern: domain, custom_domain: true };
  const pathToInsert: (string | number)[] =
    routes === undefined ? ["routes"] : ["routes", -1];
  const edits = modify(
    content,
    pathToInsert,
    routes === undefined ? [entry] : entry,
    {
      formattingOptions: {
        insertSpaces: true,
        tabSize: 2,
        eol: content.includes("\r\n") ? "\r\n" : "\n",
      },
      isArrayInsertion: routes !== undefined,
    },
  );
  const updated = applyEdits(content, edits);
  const updatedErrors: ParseError[] = [];
  if (
    parseTree(updated, updatedErrors, {
      allowTrailingComma: true,
      disallowComments: false,
    }) === undefined ||
    updatedErrors.length > 0
  ) {
    throw new CustomDomainError(
      "Could not validate the updated Wrangler JSON configuration.",
    );
  }
  return { content: updated, alreadyConfigured: false };
}

function matchesConfiguredDomain(pattern: string, domain: string): boolean {
  const normalized = pattern.toLowerCase();
  return normalized === domain || normalized.startsWith(`${domain}/`);
}

function createDomainPrompts(): DomainPrompts {
  return {
    interactive: process.stdin.isTTY === true && process.stdout.isTTY === true,
    async input(message) {
      const { createInterface } = await import("node:readline/promises");
      const readline = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      try {
        return await readline.question(message);
      } finally {
        readline.close();
      }
    },
    async confirm(message, initial) {
      const { createSetupPrompts } = await import("../prompts.js");
      return createSetupPrompts().confirm(message, initial);
    },
  };
}

async function writeFileAtomically(
  filePath: string,
  content: string,
): Promise<void> {
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  await fs.writeFile(temporaryPath, content, "utf8");
  try {
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}
