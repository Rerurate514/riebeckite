import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import type { SsgModule } from "./types.js";

const standaloneSsgMode = "riebeckite-ssr";

export type StandaloneSsgBundle = {
  readonly app: NonNullable<SsgModule["default"]>;
  readonly module: SsgModule;
};

export async function loadStandaloneSsgBundle(input: {
  readonly root: string;
  readonly entry: string;
  readonly outputDirectory: string;
}): Promise<StandaloneSsgBundle> {
  const root = resolve(input.root);
  const outputDirectory = resolve(input.outputDirectory);
  await mkdir(outputDirectory, { recursive: true });
  await build({
    root,
    mode: standaloneSsgMode,
    build: {
      emptyOutDir: false,
      outDir: outputDirectory,
      ssr: input.entry,
      rollupOptions: {
        output: { entryFileNames: "ssg-server.mjs", format: "es" },
      },
    },
  });
  const module = (await import(
    `${pathToFileURL(resolve(outputDirectory, "ssg-server.mjs")).href}?v=${Date.now()}`
  )) as SsgModule;
  if (!module.default) {
    throw new Error(`Failed to find a default export from ${input.entry}.`);
  }
  return { app: module.default, module };
}

export function isStandaloneSsgMode(mode: string): boolean {
  return mode === standaloneSsgMode;
}
