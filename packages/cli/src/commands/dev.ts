import { startHonoxDevServer } from "@riebeckite/honox";
import type { RiebeckiteProject } from "../application_root.js";
import { loadProjectConfig } from "../load_config.js";
import { createDevIndicator, waitForFirstResponse } from "./dev_indicator.js";
import { managedDevReporter, managedSiteId } from "./managed_dev.js";

export type RiebeckiteDevStartOptions = {
  readonly indicator?: boolean;
};

export async function runDev(
  project: RiebeckiteProject,
  onReady?: (urls: readonly string[]) => void | Promise<void>,
  options: RiebeckiteDevStartOptions = {},
): Promise<void> {
  const managed = managedDevReporter();
  managed?.starting();
  const bridgeToken = process.env.RIEBECKITE_BRIDGE_TOKEN;
  const indicator =
    options.indicator && !managed ? createDevIndicator() : undefined;
  let interrupted = false;
  const onInterrupt = () => {
    interrupted = true;
  };
  process.once("SIGINT", onInterrupt);
  try {
    indicator?.phase("Loading the project config");
    await loadProjectConfig(project);
    indicator?.phase("Starting the Vite dev server");
    await startHonoxDevServer({
      root: project.appRoot,
      bridgeToken,
      onServerReady: async (urls) => {
        const origin = urls.find(isLoopbackOrigin);
        if (origin && !interrupted) {
          indicator?.phase("Preparing the first page");
          const response = await waitForFirstResponse(origin, {
            isAborted: () => interrupted,
          });
          if (interrupted) indicator?.fail("Interrupted");
          else if (!response)
            indicator?.fail("Development server did not become reachable");
          else
            indicator?.done(
              response.status >= 400
                ? `Ready at ${origin} (HTTP ${response.status})`
                : `Ready at ${origin}`,
            );
        }
        await onDevServerReady(urls, {
          managed,
          bridgeToken,
          siteId: managedSiteId(project.contentRoot),
        });
        await onReady?.(urls);
      },
    });
    if (interrupted) indicator?.fail("Interrupted");
  } catch (error) {
    indicator?.fail("Development server failed to start");
    managed?.failed();
    throw error;
  } finally {
    process.removeListener("SIGINT", onInterrupt);
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
