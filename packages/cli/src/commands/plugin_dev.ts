import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { startHonoxDevServer } from "@riebeckite/honox";
import { writePluginDevConfig } from "../plugin_dev/config.js";
import { writePluginDevFixture } from "../plugin_dev/fixtures.js";
import { loadLocalPlugin } from "../plugin_dev/local_plugin.js";
import {
  linkPreviewDependencies,
  resolveModuleSpecifier,
  scaffoldPreviewSite,
  writePreviewViteConfig,
} from "../preview_site.js";

export type PluginDevOptions = {
  readonly pluginPath: string;
  readonly port?: number;
  readonly open: boolean;
};

export async function runPluginDev(options: PluginDevOptions): Promise<void> {
  const plugin = await loadLocalPlugin(options.pluginPath);
  const previewRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-plugin-"),
  );
  const removePreview = () => {
    fsSync.rmSync(previewRoot, { recursive: true, force: true });
  };
  const shutdown = () => {
    removePreview();
    process.exit(0);
  };
  process.once("exit", removePreview);
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  try {
    await scaffoldPreviewSite(previewRoot, `${plugin.name} preview`);
    const dependencies = await linkPreviewDependencies(previewRoot, [
      { name: plugin.name, directory: plugin.root },
    ]);
    await writePreviewViteConfig(
      previewRoot,
      [
        { find: plugin.name, replacement: plugin.entry },
        ...plugin.aliases,
        {
          find: "@riebeckite/core",
          replacement: await resolveModuleSpecifier("@riebeckite/core"),
        },
      ],
      [...new Set([previewRoot, plugin.root, process.cwd(), ...dependencies])],
    );
    await writePluginDevConfig(previewRoot, plugin);
    await writePluginDevFixture(previewRoot, plugin.name);

    console.log(`Plugin fixture: ${previewRoot}`);
    console.log(`Previewing local Plugin "${plugin.name}".`);

    await startHonoxDevServer({
      root: previewRoot,
      server: { host: "127.0.0.1", open: options.open, port: options.port },
      restartOnChange: [plugin.entry],
      onServerReady: async (urls) => {
        const url =
          urls.find((candidate) => candidate.startsWith("http://127.0.0.1")) ??
          urls[0];
        if (!url) throw new Error("Vite did not report a local URL.");
        console.log(`Plugin preview: ${url}`);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(120_000),
        });
        if (!response.ok) {
          const body = (await response.text()).slice(0, 2_000);
          throw new Error(
            `Plugin preview failed with HTTP ${response.status}.\n${body}`,
          );
        }
      },
    });
  } finally {
    process.removeListener("exit", removePreview);
    process.removeListener("SIGINT", shutdown);
    process.removeListener("SIGTERM", shutdown);
    await fs.rm(previewRoot, { recursive: true, force: true });
  }
}
