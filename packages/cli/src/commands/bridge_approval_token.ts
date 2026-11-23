import fs from "node:fs/promises";
import path from "node:path";

export async function writeBridgeApprovalToken(
  root: string,
  token: string,
): Promise<void> {
  const target = tokenPath(root);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, token, { mode: 0o600 });
  await fs.chmod(target, 0o600).catch(() => undefined);
}

export async function readBridgeApprovalToken(
  root: string,
): Promise<string | undefined> {
  const value = await fs
    .readFile(tokenPath(root), "utf8")
    .catch(() => undefined);
  return value?.trim() || undefined;
}

export async function clearBridgeApprovalToken(root: string): Promise<void> {
  await fs.rm(tokenPath(root), { force: true });
}

function tokenPath(root: string): string {
  return path.join(root, ".riebeckite", "bridge", "approval-token");
}
