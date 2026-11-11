import fs from "node:fs/promises";
import path from "node:path";
import mdxRollup from "@mdx-js/rollup";
import { definePlugin, extractFrontmatter } from "@riebeckite/core";
import type { MdxOptions } from "./src/types.js";

export type { MdxOptions } from "./src/types.js";

export default function mdx(options: MdxOptions) {
  if (options.trusted !== true) {
    throw new Error(
      "@riebeckite/plugin-mdx requires trusted: true because MDX executes authored code.",
    );
  }

  return definePlugin({
    name: "mdx",
    options,
    contentFormats: [
      {
        extension: ".mdx",
        rendererModule: "virtual:riebeckite/mdx-renderer",
        rendererOptions: options,
        process: async ({ source, processMarkdown }) => {
          const projected = stripMdxSyntax(source);
          const rendered =
            projected.trim() === ""
              ? undefined
              : await processMarkdown(projected);
          return {
            frontmatter: extractFrontmatter(source),
            html: rendered?.html ?? "",
          };
        },
        dependencies: ({ sourcePath, source, paths }) =>
          resolveMdxDependencies(sourcePath, source, paths),
      },
    ],
    vitePlugins: ({ contentDirectory }) => [
      mdxFrontmatterPlugin(),
      mdxRollup({
        jsxImportSource: "hono/jsx",
        providerImportSource: undefined,
      }),
      mdxRendererPlugin(contentDirectory),
    ],
    processedContentCache: { version: "mdx-v2", dependencyMode: "tracked" },
  });
}

function resolveMdxDependencies(
  sourcePath: string,
  source: string,
  paths: readonly string[],
): string[] {
  const available = new Set(
    paths.map((candidate) => candidate.replace(/\\/g, "/")),
  );
  const dependencies = new Set<string>();
  for (const specifier of staticModuleSpecifiers(source)) {
    if (!specifier.startsWith(".")) continue;
    const basePath = path.posix.normalize(
      path.posix.join(path.posix.dirname(sourcePath), specifier),
    );
    const exact = available.has(basePath) ? basePath : undefined;
    const extensionless = [...available]
      .filter((candidate) => candidate.startsWith(`${basePath}.`))
      .sort()[0];
    const index = [...available]
      .filter((candidate) => candidate.startsWith(`${basePath}/index.`))
      .sort()[0];
    const dependency = exact ?? extensionless ?? index;
    if (dependency) dependencies.add(dependency);
  }
  return [...dependencies].sort();
}

function staticModuleSpecifiers(source: string): string[] {
  return [
    ...source.matchAll(
      /\b(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    ),
  ]
    .map((match) => match[1])
    .filter((specifier): specifier is string => Boolean(specifier));
}

const rendererModuleId = "virtual:riebeckite/mdx-renderer";
const resolvedRendererModuleId = `\0${rendererModuleId}.tsx`;

const frontmatterPattern = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

function stripMdxSyntax(source: string): string {
  return source
    .replace(frontmatterPattern, "")
    .replace(/^\s*(?:import|export)\b[^\n]*$/gm, "")
    .replace(/\{[^{}]*\}/g, "")
    .replace(/<\/?[A-Za-z][^>]*>/g, "");
}

function mdxFrontmatterPlugin() {
  return {
    name: "riebeckite-mdx-frontmatter",
    transform(code: string, id: string) {
      if (!id.split("?")[0].toLowerCase().endsWith(".mdx")) return null;
      const stripped = code.replace(frontmatterPattern, "");
      return stripped === code ? null : { code: stripped, map: null };
    },
  };
}

function mdxRendererPlugin(contentDirectory: string) {
  return {
    name: "riebeckite-mdx-renderer",
    resolveId(id: string) {
      return id === rendererModuleId ? resolvedRendererModuleId : null;
    },
    async load(id: string) {
      if (id !== resolvedRendererModuleId) return null;
      const files = await findMdxFiles(contentDirectory);
      const imports = files
        .map(
          (file, index) =>
            `import * as module${index} from ${JSON.stringify(file.absolutePath)};`,
        )
        .join("\n");
      const entries = files
        .map(
          (file, index) =>
            `${JSON.stringify(file.sourcePath)}: module${index}.default`,
        )
        .join(",\n");
      return `import { jsx } from "hono/jsx/jsx-runtime";
${imports}
const modules = {${entries}};

export default function renderMdx(sourcePath, options) {
  const Component = modules[sourcePath.replaceAll("\\\\", "/")];
  return Component ? jsx(Component, { components: options?.components }) : undefined;
}
`;
    },
    configureServer(server: {
      watcher: {
        on(event: "add" | "unlink", listener: (file: string) => void): void;
        off(event: "add" | "unlink", listener: (file: string) => void): void;
      };
      moduleGraph: {
        getModuleById(id: string): unknown;
        invalidateModule(module: unknown): void;
      };
      ws: { send(payload: { type: "full-reload" }): void };
    }) {
      const reload = (file: string) => {
        if (!isMdxContentFile(contentDirectory, file)) return;
        const module = server.moduleGraph.getModuleById(
          resolvedRendererModuleId,
        );
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", reload);
      server.watcher.on("unlink", reload);
      return () => {
        server.watcher.off("add", reload);
        server.watcher.off("unlink", reload);
      };
    },
  };
}

function isMdxContentFile(contentDirectory: string, file: string): boolean {
  const relative = path.relative(contentDirectory, file);
  return (
    relative.length > 0 &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative) &&
    relative.toLowerCase().endsWith(".mdx")
  );
}

async function findMdxFiles(
  directory: string,
  relativeDirectory = "",
): Promise<Array<{ absolutePath: string; sourcePath: string }>> {
  const entries = await fs.readdir(path.join(directory, relativeDirectory), {
    withFileTypes: true,
  });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.posix.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) return await findMdxFiles(directory, sourcePath);
      return entry.isFile() && sourcePath.toLowerCase().endsWith(".mdx")
        ? [{ absolutePath: path.join(directory, sourcePath), sourcePath }]
        : [];
    }),
  );
  return files.flat();
}
