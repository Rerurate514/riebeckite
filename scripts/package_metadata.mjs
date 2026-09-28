export const PACKAGE_DIRECTORIES = [
  "packages/cli",
  "packages/core",
  "packages/integrations/honox",
  "packages/plugins/attachment",
  "packages/plugins/autocardlink",
  "packages/plugins/backlinks",
  "packages/plugins/code-enhance",
  "packages/plugins/code-tabs",
  "packages/plugins/diagnostics",
  "packages/plugins/diff",
  "packages/plugins/excalibrain",
  "packages/plugins/excalidraw",
  "packages/plugins/garden-explorer",
  "packages/plugins/lightbox",
  "packages/plugins/local-graph",
  "packages/plugins/media",
  "packages/plugins/mermaid",
  "packages/plugins/obsidian-markdown",
  "packages/plugins/permalink",
  "packages/plugins/query",
  "packages/plugins/recent-posts",
  "packages/plugins/search",
  "packages/plugins/seo",
  "packages/plugins/toc",
  "packages/themes/default",
  "packages/themes/gruvbox",
  "packages/themes/minimal",
  "packages/themes/rerurate",
  "packages/themes/sakura",
  "packages/themes/tokyonight",
];

export const repositoryUrl = "https://github.com/Rerurate514/riebeckite.git";

export const sharedPackageMetadata = {
  license: "Apache-2.0",
  publishConfig: { access: "public" },
  homepage: "https://github.com/Rerurate514/riebeckite#readme",
  bugs: { url: "https://github.com/Rerurate514/riebeckite/issues" },
};

export const catalogDependencies = {
  "@types/mdast": "^4.0.4",
  "@types/node": "^24.5.2",
  "@types/unist": "^3.0.3",
  esbuild: "^0.28.2",
  hono: "^4.12.25",
  "remark-parse": "^11.0.0",
  unified: "^11.0.5",
  "unist-util-visit": "^5.1.0",
  "vfile-matter": "^5.0.1",
  vite: "^8.0.9",
};

export function expectedPackageMetadata(directory) {
  if (directory === "packages/cli") {
    return {
      files: ["LICENSE", "bin", "dist"],
      scripts: {
        build:
          "esbuild index.ts --bundle --platform=node --format=esm --minify --banner:js=\"import{createRequire as __createRequire}from'node:module';const require=__createRequire(import.meta.url);\" --external:esbuild --external:vite --alias:@riebeckite/core=../core/index.ts --alias:@riebeckite/honox=../integrations/honox/index.ts --outfile=dist/cli.js",
        prepack: "node ../../scripts/copy_license.mjs && pnpm run build",
      },
    };
  }

  if (directory === "packages/core") {
    return {
      files: ["LICENSE", "dist"],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/integrations/honox") {
    return {
      files: ["LICENSE", "dist"],
      scripts: {
        build: "node ../../../scripts/build_package.mjs",
        prepack: "pnpm run build",
      },
    };
  }

  if (directory.startsWith("packages/plugins/")) {
    const hasStyle = !["diagnostics", "obsidian-markdown", "permalink", "seo"].some(
      (plugin) => directory.endsWith(`/${plugin}`),
    );
    return {
      files: [
        "LICENSE",
        "README_en.md",
        "README_ja.md",
        "dist",
        ...(hasStyle ? ["style.css"] : []),
      ],
      scripts: {
        build: "node ../../../scripts/build_package.mjs",
        prepack: "pnpm run build",
      },
    };
  }

  if (directory.startsWith("packages/themes/")) {
    return {
      files: ["LICENSE", "README_en.md", "README_ja.md", "dist", "styles"],
      scripts: {
        build: "node ../../../scripts/build_package.mjs",
        prepack: "pnpm run build",
      },
    };
  }

  throw new Error(`No package metadata convention for ${directory}`);
}
