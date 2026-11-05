import { startHonoxDevServer } from "@riebeckite/honox";
import type { RiebeckiteProject } from "../application_root.js";
import { loadProjectConfig } from "../load_config.js";
import { managedDevReporter, managedSiteId } from "./managed_dev.js";

export async function runDev(project: RiebeckiteProject): Promise<void> {
  const managed = managedDevReporter();
  managed?.starting();
  const bridgeToken = process.env.RIEBECKITE_BRIDGE_TOKEN;
  try {
    await loadProjectConfig(project);
    await startHonoxDevServer({
      root: project.appRoot,
      bridgeToken,
      onServerReady: (urls) =>
        onDevServerReady(urls, {
          managed,
          bridgeToken,
          siteId: managedSiteId(project.contentRoot),
        }),
    });
  } catch (error) {
    managed?.failed();
    throw error;
  }
}

export async function onDevServerReady(
  urls: readonly string[],
  options: {
    readonly managed: ReturnType<typeof managedDevReporter>;
    readonly bridgeToken: string | undefined;
    readonly siteId: string;
  },
): Promise<void> {
  if (!options.managed) return;
  const previewOrigin = urls.find(isLoopbackOrigin);
  if (!previewOrigin || !options.bridgeToken)
    throw new Error("Managed development requires a loopback Bridge.");
  await verifyBridge(previewOrigin, options.bridgeToken);
  options.managed.ready({
    siteId: options.siteId,
    previewOrigin: previewOrigin.replace(/\/$/, ""),
    capabilities: ["bridge-v1"],
  });
}

async function verifyBridge(
  previewOrigin: string,
  bridgeToken: string,
): Promise<void> {
  const response = await fetch(
    new URL("/__riebeckite/bridge/bootstrap", previewOrigin),
    { headers: { "x-riebeckite-bridge-token": bridgeToken } },
  );
  if (!response.ok) {
    throw new Error("This site does not support the Riebeckite Bridge.");
  }
  const body: unknown = await response.json();
  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { origin?: unknown }).origin !== "string" ||
    !isLoopbackOrigin((body as { origin: string }).origin)
  ) {
    throw new Error("This site does not support the Riebeckite Bridge.");
  }
}

function isLoopbackOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
        url.hostname.toLowerCase(),
      )
    );
  } catch {
    return false;
  }
}
