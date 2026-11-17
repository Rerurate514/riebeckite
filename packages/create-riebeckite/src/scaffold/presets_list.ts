import {
  alias,
  backlinks,
  blogOgImage,
  blogSeo,
  blogTaxonomy,
  breadcrumbs,
  codeEnhance,
  colorMode,
  folderPages,
  gardenTaxonomy,
  lightbox,
  mdx,
  media,
  navigationBlog,
  navigationStarter,
  obsidianMarkdown,
  properties,
  recentPosts,
  relatedPosts,
  responsiveImage,
  search,
  seo,
  series,
  share,
  taxonomy,
  toc,
} from "./presets_plugins_a.js";
import {
  docs,
  gallery,
  hoverPreview,
  localGraph,
  readingPlugins,
} from "./presets_plugins_b.js";
import {
  defaultTheme,
  editorialTheme,
  folioTheme,
  gardenTheme,
  minimalTheme,
} from "./presets_themes.js";
import type { ScaffoldPreset } from "./presets_types.js";

export const empty: ScaffoldPreset = {
  name: "empty",
  description:
    "A blank canvas with only the Riebeckite wiring. Add the theme, plugins, and content yourself.",
  languages: [],
  theme: null,
  plugins: [],
  contentPages: [],
  readme: "short",
};

export const minimal: ScaffoldPreset = {
  name: "minimal",
  description:
    "The smallest readable site, for learning how a Riebeckite site is assembled.",
  languages: ["en"],
  theme: minimalTheme,
  plugins: [obsidianMarkdown],
  contentPages: ["index"],
  readme: "short",
};

export const starter: ScaffoldPreset = {
  name: "starter",
  description:
    "Recommended default: a practical Markdown garden with search, navigation, and reading essentials.",
  languages: ["en"],
  theme: defaultTheme,
  plugins: [
    obsidianMarkdown,
    colorMode,
    seo,
    toc,
    mdx,
    properties,
    alias,
    codeEnhance,
    search,
    backlinks,
    breadcrumbs,
    navigationStarter,
    relatedPosts,
    recentPosts,
    responsiveImage,
    lightbox,
    taxonomy,
    folderPages,
    hoverPreview,
  ],
  contentPages: ["index", "guide", "examples"],
  readme: "standard",
};

export const digitalGarden: ScaffoldPreset = {
  name: "digital-garden",
  description:
    "An Obsidian-compatible digital garden with linked notes, backlinks, and a local graph.",
  languages: ["en"],
  theme: gardenTheme,
  plugins: [
    seo,
    ...readingPlugins,
    properties,
    alias,
    backlinks,
    relatedPosts,
    recentPosts,
    gardenTaxonomy,
    folderPages,
    localGraph,
    hoverPreview,
  ],
  contentPages: [],
  readme: "standard",
};

export const blog: ScaffoldPreset = {
  name: "blog",
  description:
    "A publishing-focused blog with tags, series, related posts, sharing, and feeds.",
  languages: ["en"],
  theme: editorialTheme,
  plugins: [
    ...readingPlugins.filter((plugin) => plugin !== navigationStarter),
    navigationBlog,
    blogSeo,
    blogOgImage,
    properties,
    backlinks,
    relatedPosts,
    share,
    recentPosts,
    series,
    blogTaxonomy,
    folderPages,
  ],
  contentPages: [],
  readme: "standard",
};

export const writer: ScaffoldPreset = {
  name: "writer",
  description:
    "A quiet essay site with a narrow reading column, author notes, tags, and more posts.",
  languages: ["en"],
  theme: minimalTheme,
  plugins: [
    ...readingPlugins.filter((plugin) => plugin !== navigationStarter),
    navigationBlog,
    blogSeo,
    blogOgImage,
    properties,
    share,
    recentPosts,
    series,
    blogTaxonomy,
    folderPages,
  ],
  contentPages: [],
  readme: "standard",
};

export const documentation: ScaffoldPreset = {
  name: "docs",
  description:
    "A documentation site with an automatic sidebar, table of contents, and previous/next navigation.",
  languages: ["en"],
  theme: defaultTheme,
  plugins: [seo, ...readingPlugins, recentPosts, docs],
  contentPages: [],
  readme: "standard",
};

export const portfolio: ScaffoldPreset = {
  name: "portfolio",
  description:
    "A calm portfolio for projects and contact details, with image and media support when you add it.",
  languages: ["en"],
  theme: folioTheme,
  plugins: [
    ...readingPlugins,
    seo,
    properties,
    backlinks,
    relatedPosts,
    recentPosts,
    folderPages,
    responsiveImage,
    lightbox,
    media,
    gallery,
  ],
  contentPages: [],
  readme: "standard",
};
