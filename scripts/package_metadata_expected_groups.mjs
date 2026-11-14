import fs from "node:fs";
import path from "node:path";
import { repositoryRoot } from "./package_metadata_base.mjs";
import { publishingMetadata } from "./package_metadata_publishing.mjs";

export function expectedGroupPackageMetadata(directory) {
  if (directory.startsWith("packages/plugins/")) {
    const pluginName = directory.slice("packages/plugins/".length);
    const hasStyle = fs.existsSync(
      path.join(repositoryRoot, directory, "style.css"),
    );
    const hasTests = [
      "alias",
      "analytics",
      "archive",
      "article-metadata",
      "backlinks",
      "bases",
      "breadcrumbs",
      "calculator",
      "citations",
      "code-annotations",
      "code-enhance",
      "daily-notes",
      "deploy",
      "diagnostics",
      "diff",
      "docs",
      "excalibrain",
      "folder-pages",
      "frontmatter-transformer",
      "gallery",
      "hard-breaks",
      "highlight",
      "hover-preview",
      "icons",
      "image-compare",
      "image-optimizer",
      "l10n",
      "local-graph",
      "mdx",
      "meta-bind",
      "navigation",
      "permalink",
      "properties",
      "quality",
      "query",
      "recent-posts",
      "related-posts",
      "rename",
      "responsive-image",
      "search",
      "seo",
      "series",
      "share",
      "shortcodes",
      "sidenotes",
      "source-files",
      "svg-optimizer",
      "taxonomy",
      "text-fragment",
      "toc",
      "vault-heatmap",
      "webmention",
    ].includes(pluginName);
    const testCommand =
      pluginName === "analytics"
        ? 'pnpm exec tsx --test "test/*.test.ts"'
        : 'node --import tsx --test "test/*.test.ts"';
    return {
      ...publishingMetadata(directory, hasStyle ? ["./style.css"] : false),
      files: [
        "LICENSE",
        "README.md",
        "README_ja.md",
        "dist",
        ...(hasStyle ? ["style.css"] : []),
      ],
      scripts: {
        build: "node ../../../scripts/build_package.mjs",
        ...(hasTests ? { test: testCommand } : {}),
        prepack: "pnpm run build",
      },
    };
  }

  if (directory.startsWith("packages/themes/")) {
    return {
      ...publishingMetadata(directory, ["./styles/*.css"]),
      files: [
        "LICENSE",
        "README.md",
        "README_ja.md",
        "dist",
        ...(directory === "packages/themes/module" ? ["src"] : []),
        "styles",
      ],
      scripts: {
        build: "node ../../../scripts/build_package.mjs",
        prepack: "pnpm run build",
      },
    };
  }

  throw new Error(`No package metadata convention for ${directory}`);
}
