import type { CloudflareAccount } from "./deploy_setup_errors.js";

export function parseGitRemoteUrl(url: string): string | undefined {
  const trimmed = url.trim();
  const scheme = /^(?:https?|ssh|git):\/\//;
  if (scheme.test(trimmed)) {
    let value = trimmed.replace(scheme, "");
    const at = value.indexOf("@");
    if (at !== -1) value = value.slice(at + 1);
    const slash = value.indexOf("/");
    if (slash === -1) return undefined;
    const host = value.slice(0, slash).split(":")[0];
    if (host !== "github.com") return undefined;
    return normalizeSlug(value.slice(slash + 1));
  }

  const scp = /^[^@/]+@([^:/]+):(.+)$/.exec(trimmed);
  if (scp) {
    if (scp[1] !== "github.com") return undefined;
    return normalizeSlug(scp[2] ?? "");
  }

  return undefined;
}

export function parseCloudflareAccounts(
  stdout: string,
): readonly CloudflareAccount[] | undefined {
  const parsed = tryParseJson(stdout);
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const record = parsed as Record<string, unknown>;
  if (record.loggedIn !== true) return undefined;
  if (!Array.isArray(record.accounts)) return undefined;

  const accounts: CloudflareAccount[] = [];
  for (const entry of record.accounts) {
    if (typeof entry !== "object" || entry === null) continue;
    const id = (entry as Record<string, unknown>).id;
    const name = (entry as Record<string, unknown>).name;
    if (typeof id === "string" && id.length > 0) {
      accounts.push({
        id,
        name: typeof name === "string" ? name : "(unnamed account)",
      });
    }
  }
  return accounts;
}

export function isWranglerLoggedOut(stdout: string): boolean {
  const parsed = tryParseJson(stdout);
  if (typeof parsed !== "object" || parsed === null) return false;
  return (parsed as Record<string, unknown>).loggedIn === false;
}

export function parseSecretNames(stdout: string): Set<string> {
  const parsed = tryParseJson(stdout);
  const names = new Set<string>();
  if (!Array.isArray(parsed)) return names;
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const name = (entry as Record<string, unknown>).name;
    if (typeof name === "string" && name.length > 0) names.add(name);
  }
  return names;
}

export function looksLikeRiebeckiteWorkflow(content: string): boolean {
  return (
    content.includes("cloudflare/wrangler-action@") &&
    content.includes("riebeckite")
  );
}

export function normalizeWorkflow(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function normalizeSlug(pathPart: string): string | undefined {
  const cleaned = pathPart.replace(/\.git$/, "").replace(/\/$/, "");
  const segments = cleaned.split("/").filter((segment) => segment.length > 0);
  if (segments.length !== 2) return undefined;
  const [owner, repository] = segments;
  if (owner === undefined || repository === undefined) return undefined;
  return `${owner}/${repository}`;
}

export function parseNameWithOwner(stdout: string): string | undefined {
  const parsed = tryParseJson(stdout);
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const owner = (parsed as Record<string, unknown>).nameWithOwner;
  return typeof owner === "string" && owner.length > 0 ? owner : undefined;
}

export function parseDefaultBranch(stdout: string): string | undefined {
  const parsed = tryParseJson(stdout);
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const ref = (parsed as Record<string, unknown>).defaultBranchRef;
  if (typeof ref !== "object" || ref === null) return undefined;
  const name = (ref as Record<string, unknown>).name;
  return typeof name === "string" && name.length > 0 ? name : undefined;
}

export function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
