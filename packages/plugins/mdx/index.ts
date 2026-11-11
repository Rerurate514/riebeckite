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
        process: async ({ source }) => ({
          frontmatter: extractFrontmatter(source),
          html: "",
        }),
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
    processedContentCache: { version: "mdx-v1", dependencyMode: "unsafe" },
  });
}

const rendererModuleId = "virtual:riebeckite/mdx-renderer";
const resolvedRendererModuleId = `\0${rendererModuleId}.tsx`;

const frontmatterPattern = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

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
  const Component = modules[sourcePath];
  return Component ? jsx(Component, { components: options?.components }) : undefined;
}
`;
    },
  };
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
