import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scaffoldRiebeckiteSite } from "create-riebeckite/scaffold";

type PreviewPackage = {
  readonly name: string;
  readonly directory: string;
};

type PreviewAlias = {
  readonly find: string;
  readonly replacement: string;
};

export async function scaffoldPreviewSite(
  root: string,
  title: string,
): Promise<void> {
  await scaffoldRiebeckiteSite({
    targetDirectory: root,
    preset: "minimal",
    utilities: [],
    deployment: { type: "none" },
    site: { title },
  });
}

export async function linkPreviewDependencies(
  previewRoot: string,
  extraPackages: readonly PreviewPackage[] = [],
): Promise<string[]> {
  const packages = new Map<string, string>();
  for (const [name, specifier] of [
    ["@hono/vite-build", "@hono/vite-build/node"],
    ["@riebeckite/core", "@riebeckite/core"],
    ["@riebeckite/honox", "@riebeckite/honox"],
    ["@riebeckite/plugin-color-mode", "@riebeckite/plugin-color-mode"],
    ["@riebeckite/plugin-docs", "@riebeckite/plugin-docs"],
    [
      "@riebeckite/plugin-obsidian-markdown",
      "@riebeckite/plugin-obsidian-markdown",
    ],
    ["@riebeckite/plugin-toc", "@riebeckite/plugin-toc"],
    ["@riebeckite/theme-default", "@riebeckite/theme-default"],
    ["@riebeckite/ui", "@riebeckite/ui"],
    ["hono", "hono"],
    ["honox", "honox"],
    ["vite", "vite"],
  ] as const) {
    const packageDirectory = await findPackageDirectory(
      await resolveModuleSpecifier(specifier),
    );
    packages.set(name, packageDirectory);
  }
  for (const extra of extraPackages) packages.set(extra.name, extra.directory);

  await Promise.all(
    [...packages].map(async ([name, directory]) => {
      const target = path.join(previewRoot, "node_modules", name);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.symlink(directory, target, "junction");
    }),
  );
  return [...packages.values()];
}

export async function writePreviewViteConfig(
  previewRoot: string,
  aliases: readonly PreviewAlias[] = [],
  allowedDirectories: readonly string[] = [],
): Promise<void> {
  const [build, honoxIntegration, honox, vite] = await Promise.all([
    resolveModuleSpecifier("@hono/vite-build/node"),
    resolveModuleSpecifier("@riebeckite/honox"),
    resolveModuleSpecifier("honox/vite"),
    resolveModuleSpecifier("vite"),
  ]);
  const aliasSource =
    aliases.length === 0
      ? "[]"
      : `[\n${aliases
          .map(
            (alias) =>
              `    { find: new RegExp(${JSON.stringify(`^${escapeRegExp(alias.find)}$`)}), replacement: ${JSON.stringify(alias.replacement)} },`,
          )
          .join("\n")}\n  ]`;
  const serverSource =
    allowedDirectories.length === 0
      ? ""
      : `  server: { fs: { allow: ${JSON.stringify(allowedDirectories)} } },\n`;
  const source = `import build from ${JSON.stringify(build)};
import { riebeckiteVite } from ${JSON.stringify(honoxIntegration)};
import honox from ${JSON.stringify(honox)};
import { defineConfig } from ${JSON.stringify(vite)};

export default defineConfig({
  resolve: { alias: ${aliasSource} },
${serverSource}  plugins: [
    honox({ client: { input: ["/app/client.ts", "/app/style.css"] } }),
    ...riebeckiteVite(),
    build(),
  ],
});
`;
  await fs.writeFile(path.join(previewRoot, "vite.config.ts"), source, "utf8");
}

export async function resolveModuleSpecifier(
  specifier: string,
): Promise<string> {
  return fileURLToPath(await import.meta.resolve(specifier));
}

async function findPackageDirectory(file: string): Promise<string> {
  let current = path.dirname(file);
  while (true) {
    try {
      await fs.access(path.join(current, "package.json"));
      return current;
    } catch {}
    const parent = path.dirname(current);
    if (parent === current)
      throw new Error("Could not resolve preview dependencies.");
    current = parent;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
