export const PACKAGE_DIRECTORIES = [
  "packages/cli",
  "packages/core",
  "packages/create-riebeckite",
  "packages/integrations/honox",
  "packages/plugins/alias",
  "packages/plugins/analytics",
  "packages/plugins/attachment",
  "packages/plugins/autocardlink",
  "packages/plugins/backlinks",
  "packages/plugins/bases",
  "packages/plugins/canvas",
  "packages/plugins/chartjs",
  "packages/plugins/code-annotations",
  "packages/plugins/code-enhance",
  "packages/plugins/code-tabs",
  "packages/plugins/color-mode",
  "packages/plugins/d2",
  "packages/plugins/daily-notes",
  "packages/plugins/dataview",
  "packages/plugins/deploy",
  "packages/plugins/diagnostics",
  "packages/plugins/diff",
  "packages/plugins/discord-embed",
  "packages/plugins/excalibrain",
  "packages/plugins/excalidraw",
  "packages/plugins/flashcards",
  "packages/plugins/garden-explorer",
  "packages/plugins/graphviz",
  "packages/plugins/highlight",
  "packages/plugins/hover-preview",
  "packages/plugins/kanban",
  "packages/plugins/lightbox",
  "packages/plugins/local-graph",
  "packages/plugins/markmap",
  "packages/plugins/marp",
  "packages/plugins/media",
  "packages/plugins/mermaid",
  "packages/plugins/obsidian-markdown",
  "packages/plugins/permalink",
  "packages/plugins/plantuml",
  "packages/plugins/properties",
  "packages/plugins/qr-code",
  "packages/plugins/quality",
  "packages/plugins/query",
  "packages/plugins/recent-posts",
  "packages/plugins/related-posts",
  "packages/plugins/rename",
  "packages/plugins/responsive-image",
  "packages/plugins/rich-embed",
  "packages/plugins/search",
  "packages/plugins/seo",
  "packages/plugins/series",
  "packages/plugins/shortcodes",
  "packages/plugins/text-fragment",
  "packages/plugins/toc",
  "packages/plugins/ux",
  "packages/plugins/vega-lite",
  "packages/plugins/wavedrom",
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

// Match Vite 8, used by the CLI and the HonoX integration. In particular,
// Node 21 and early Node 22 releases are not in its supported range.
export const supportedNodeEngines = { node: "^20.19.0 || >=22.12.0" };

const packagePublishingMetadata = {
  "packages/cli": {
    description:
      "Command-line tooling for building and validating Riebeckite sites.",
    keywords: ["riebeckite", "cli", "markdown", "static-site-generator"],
  },
  "packages/core": {
    description:
      "Core content pipeline, configuration, and extension APIs for Riebeckite.",
    keywords: ["riebeckite", "markdown", "obsidian", "static-site-generator"],
  },
  "packages/create-riebeckite": {
    description:
      "Create a new Riebeckite site from the official starter template.",
    keywords: [
      "create-riebeckite",
      "riebeckite",
      "scaffold",
      "static-site-generator",
    ],
  },
  "packages/integrations/honox": {
    description: "HonoX and Vite integration for building Riebeckite sites.",
    keywords: ["riebeckite", "honox", "vite", "static-site-generator"],
  },
  "packages/plugins/alias": {
    description: "Obsidian alias redirects for Riebeckite sites.",
    keywords: ["riebeckite", "plugin", "obsidian", "redirects"],
  },
  "packages/plugins/analytics": {
    description: "Analytics provider integration for Riebeckite sites.",
    keywords: ["riebeckite", "plugin", "analytics", "web-analytics"],
  },
  "packages/plugins/attachment": {
    description: "Attachment link and embed rendering for Obsidian wikilinks.",
    keywords: ["riebeckite", "plugin", "obsidian", "attachments"],
  },
  "packages/plugins/autocardlink": {
    description: "Link preview cards for cardlink code blocks in Riebeckite.",
    keywords: ["riebeckite", "plugin", "link-preview", "markdown"],
  },
  "packages/plugins/backlinks": {
    description: "Backlink lists for published Riebeckite notes.",
    keywords: ["riebeckite", "plugin", "backlinks", "obsidian"],
  },
  "packages/plugins/bases": {
    description: "Build-time rendering for Obsidian Bases definitions.",
    keywords: ["riebeckite", "plugin", "obsidian", "bases"],
  },
  "packages/plugins/canvas": {
    description: "Obsidian Canvas diagram rendering for Riebeckite.",
    keywords: ["riebeckite", "plugin", "obsidian", "canvas"],
  },
  "packages/plugins/chartjs": {
    description: "Chart.js code block rendering for Riebeckite.",
    keywords: ["riebeckite", "plugin", "chartjs", "charts"],
  },
  "packages/plugins/code-annotations": {
    description:
      "Code block annotations, highlights, and diff markers for Riebeckite.",
    keywords: ["riebeckite", "plugin", "code-blocks", "syntax-highlighting"],
  },
  "packages/plugins/code-enhance": {
    description: "Enhanced syntax-highlighted code blocks for Riebeckite.",
    keywords: ["riebeckite", "plugin", "code-blocks", "shiki"],
  },
  "packages/plugins/code-tabs": {
    description: "Accessible tabbed code blocks for Riebeckite.",
    keywords: ["riebeckite", "plugin", "code-blocks", "tabs"],
  },
  "packages/plugins/color-mode": {
    description: "Light / dark / system color-mode switching for Riebeckite.",
    keywords: ["riebeckite", "plugin", "theme", "color-mode", "dark-mode"],
  },
  "packages/plugins/d2": {
    description: "D2 diagram rendering for Riebeckite code blocks.",
    keywords: ["riebeckite", "plugin", "d2", "diagrams"],
  },
  "packages/plugins/daily-notes": {
    description: "Daily Note snippet widgets for Riebeckite sites.",
    keywords: ["riebeckite", "plugin", "daily-notes", "obsidian"],
  },
  "packages/plugins/dataview": {
    description: "Build-time dataview queries for Riebeckite content.",
    keywords: ["riebeckite", "plugin", "dataview", "obsidian"],
  },
  "packages/plugins/diagnostics": {
    description: "Content diagnostics for Riebeckite and Obsidian vaults.",
    keywords: ["riebeckite", "plugin", "diagnostics", "obsidian"],
  },
  "packages/plugins/deploy": {
    description: "Static hosting deployment output for Riebeckite sites.",
    keywords: ["riebeckite", "plugin", "deploy", "static-hosting"],
  },
  "packages/plugins/diff": {
    description: "Git-backed note diffs and revision history for Riebeckite.",
    keywords: ["riebeckite", "plugin", "git", "diff"],
  },
  "packages/plugins/discord-embed": {
    description: "Discord link preview metadata for Riebeckite pages.",
    keywords: ["riebeckite", "plugin", "discord", "embeds"],
  },
  "packages/plugins/excalibrain": {
    description:
      "Relationship maps for Riebeckite notes inspired by ExcaliBrain.",
    keywords: ["riebeckite", "plugin", "graph", "obsidian"],
  },
  "packages/plugins/excalidraw": {
    description: "Excalidraw attachment rendering for Obsidian wikilinks.",
    keywords: ["riebeckite", "plugin", "excalidraw", "obsidian"],
  },
  "packages/plugins/flashcards": {
    description: "Interactive flashcard decks from Riebeckite code blocks.",
    keywords: ["riebeckite", "plugin", "flashcards", "learning"],
  },
  "packages/plugins/garden-explorer": {
    description: "Interactive graph and search explorer for Riebeckite notes.",
    keywords: ["riebeckite", "plugin", "knowledge-graph", "search"],
  },
  "packages/plugins/graphviz": {
    description: "Graphviz DOT diagram rendering for Riebeckite.",
    keywords: ["riebeckite", "plugin", "graphviz", "diagrams"],
  },
  "packages/plugins/highlight": {
    description: "Obsidian-style inline text highlighting for Riebeckite.",
    keywords: ["riebeckite", "plugin", "markdown", "highlight"],
  },
  "packages/plugins/hover-preview": {
    description: "Popover previews for internal Riebeckite links.",
    keywords: ["riebeckite", "plugin", "link-preview", "obsidian"],
  },
  "packages/plugins/kanban": {
    description: "Build-time rendering for Obsidian Kanban boards.",
    keywords: ["riebeckite", "plugin", "kanban", "obsidian"],
  },
  "packages/plugins/lightbox": {
    description: "Click-to-zoom image lightboxes for Riebeckite.",
    keywords: ["riebeckite", "plugin", "images", "lightbox"],
  },
  "packages/plugins/local-graph": {
    description: "Local note graph visualizations for Riebeckite.",
    keywords: ["riebeckite", "plugin", "graph", "backlinks"],
  },
  "packages/plugins/markmap": {
    description: "Markdown mindmap rendering with Markmap for Riebeckite.",
    keywords: ["riebeckite", "plugin", "markmap", "mindmap"],
  },
  "packages/plugins/marp": {
    description: "Build-time Marp slide deck rendering for Riebeckite.",
    keywords: ["riebeckite", "plugin", "marp", "slides"],
  },
  "packages/plugins/media": {
    description: "Audio and video attachment embeds for Obsidian wikilinks.",
    keywords: ["riebeckite", "plugin", "media", "obsidian"],
  },
  "packages/plugins/mermaid": {
    description: "Mermaid diagram rendering for Riebeckite code blocks.",
    keywords: ["riebeckite", "plugin", "mermaid", "diagrams"],
  },
  "packages/plugins/obsidian-markdown": {
    description: "Obsidian-flavored Markdown support for Riebeckite.",
    keywords: ["riebeckite", "plugin", "obsidian", "markdown"],
  },
  "packages/plugins/permalink": {
    description: "Stable, configurable content permalinks for Riebeckite.",
    keywords: ["riebeckite", "plugin", "permalinks", "redirects"],
  },
  "packages/plugins/plantuml": {
    description: "PlantUML diagram rendering for Riebeckite code blocks.",
    keywords: ["riebeckite", "plugin", "plantuml", "diagrams"],
  },
  "packages/plugins/properties": {
    description:
      "Obsidian-style frontmatter property panels for Riebeckite notes.",
    keywords: ["riebeckite", "plugin", "frontmatter", "obsidian"],
  },
  "packages/plugins/qr-code": {
    description: "Inline SVG QR code rendering for Riebeckite code blocks.",
    keywords: ["riebeckite", "plugin", "qr-code", "svg"],
  },
  "packages/plugins/quality": {
    description: "Static quality and accessibility inspection for Riebeckite HTML.",
    keywords: ["riebeckite", "plugin", "accessibility", "quality"],
  },
  "packages/plugins/query": {
    description: "Build-time content queries for Riebeckite code blocks.",
    keywords: ["riebeckite", "plugin", "query", "markdown"],
  },
  "packages/plugins/recent-posts": {
    description: "Recent posts lists for Riebeckite sites.",
    keywords: ["riebeckite", "plugin", "recent-posts", "blog"],
  },
  "packages/plugins/rename": {
    description: "Rename and move redirects for published Riebeckite notes.",
    keywords: ["riebeckite", "plugin", "redirects", "rename"],
  },
  "packages/plugins/related-posts": {
    description: "Build-time related-post navigation for Riebeckite.",
    keywords: ["riebeckite", "plugin", "related-posts", "navigation"],
  },
  "packages/plugins/responsive-image": {
    description: "Responsive image markup and lazy loading for Riebeckite.",
    keywords: ["riebeckite", "plugin", "images", "responsive-images"],
  },
  "packages/plugins/rich-embed": {
    description: "Build-time rich media embeds for Riebeckite code blocks.",
    keywords: ["riebeckite", "plugin", "embeds", "markdown"],
  },
  "packages/plugins/search": {
    description: "Client-side full-text search for Riebeckite sites.",
    keywords: ["riebeckite", "plugin", "search", "full-text-search"],
  },
  "packages/plugins/seo": {
    description:
      "SEO metadata, sitemaps, feeds, and robots.txt for Riebeckite.",
    keywords: ["riebeckite", "plugin", "seo", "sitemap"],
  },
  "packages/plugins/series": {
    description: "Ordered multi-part post navigation for Riebeckite.",
    keywords: ["riebeckite", "plugin", "series", "navigation"],
  },
  "packages/plugins/shortcodes": {
    description: "Remark directive shortcodes for Riebeckite Markdown.",
    keywords: ["riebeckite", "plugin", "shortcodes", "remark"],
  },
  "packages/plugins/text-fragment": {
    description: "Text Fragment links and quotes for Riebeckite articles.",
    keywords: ["riebeckite", "plugin", "text-fragment", "sharing"],
  },
  "packages/plugins/toc": {
    description: "Scroll-aware table of contents for Riebeckite articles.",
    keywords: ["riebeckite", "plugin", "table-of-contents", "navigation"],
  },
  "packages/plugins/ux": {
    description: "Reading experience enhancements for Riebeckite sites.",
    keywords: [
      "riebeckite",
      "plugin",
      "user-experience",
      "progressive-enhancement",
    ],
  },
  "packages/plugins/vega-lite": {
    description: "Vega-Lite chart rendering for Riebeckite code blocks.",
    keywords: ["riebeckite", "plugin", "vega-lite", "charts"],
  },
  "packages/plugins/wavedrom": {
    description: "WaveDrom timing diagram rendering for Riebeckite.",
    keywords: ["riebeckite", "plugin", "wavedrom", "diagrams"],
  },
  "packages/themes/default": {
    description: "The default CSS theme for Riebeckite sites.",
    keywords: ["riebeckite", "theme", "css", "default-theme"],
  },
  "packages/themes/gruvbox": {
    description: "A Gruvbox-inspired CSS theme for Riebeckite sites.",
    keywords: ["riebeckite", "theme", "css", "gruvbox"],
  },
  "packages/themes/minimal": {
    description: "A minimal baseline CSS theme for Riebeckite sites.",
    keywords: ["riebeckite", "theme", "css", "minimal"],
  },
  "packages/themes/rerurate": {
    description: "The Rerurate visual-grammar CSS theme for Riebeckite sites.",
    keywords: ["riebeckite", "theme", "css", "rerurate"],
  },
  "packages/themes/sakura": {
    description: "A sakura-inspired CSS theme for Riebeckite sites.",
    keywords: ["riebeckite", "theme", "css", "sakura"],
  },
  "packages/themes/tokyonight": {
    description: "A Tokyo Night CSS theme for Riebeckite sites.",
    keywords: ["riebeckite", "theme", "css", "tokyo-night"],
  },
};

function publishingMetadata(directory, sideEffects) {
  const metadata = packagePublishingMetadata[directory];
  if (!metadata)
    throw new Error(`Missing publishing metadata for ${directory}`);
  return { ...metadata, engines: supportedNodeEngines, sideEffects };
}

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
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "bin", "dist"],
      scripts: {
        build:
          "esbuild index.ts --bundle --platform=node --format=esm --minify --banner:js=\"import{createRequire as __createRequire}from'node:module';const require=__createRequire(import.meta.url);\" --external:esbuild --external:vite --alias:@riebeckite/core=../core/index.ts --alias:@riebeckite/honox=../integrations/honox/index.ts --outfile=dist/cli.js",
        prepack: "node ../../scripts/copy_license.mjs && pnpm run build",
      },
    };
  }

  if (directory === "packages/core") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "dist"],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        test: "node --import tsx --test \"test/*.test.ts\"",
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/create-riebeckite") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "bin", "dist"],
      scripts: {
        build: "node ../../scripts/build_package.mjs",
        prepack: "pnpm run build",
      },
    };
  }

  if (directory === "packages/integrations/honox") {
    return {
      ...publishingMetadata(directory, false),
      files: ["LICENSE", "README.md", "README_ja.md", "dist"],
      scripts: {
        build: "node ../../../scripts/build_package.mjs",
        prepack: "pnpm run build",
      },
    };
  }

  if (directory.startsWith("packages/plugins/")) {
    const pluginName = directory.slice("packages/plugins/".length);
    const hasStyle = ![
      "alias",
      "analytics",
      "deploy",
      "diagnostics",
      "discord-embed",
      "obsidian-markdown",
      "permalink",
      "quality",
      "rename",
      "seo",
    ].includes(pluginName);
    const hasTests = [
      "daily-notes",
      "deploy",
      "quality",
      "rename",
      "text-fragment",
    ].includes(pluginName);
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
        ...(hasTests
          ? { test: "node --import tsx --test \"test/*.test.ts\"" }
          : {}),
        prepack: "pnpm run build",
      },
    };
  }

  if (directory.startsWith("packages/themes/")) {
    return {
      ...publishingMetadata(directory, ["./styles/*.css"]),
      files: ["LICENSE", "README.md", "README_ja.md", "dist", "styles"],
      scripts: {
        build: "node ../../../scripts/build_package.mjs",
        prepack: "pnpm run build",
      },
    };
  }

  throw new Error(`No package metadata convention for ${directory}`);
}
