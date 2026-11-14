import { fence } from "./readme_demos.js";

const CONTENT_MARKDOWN_GUIDES: Readonly<
  Record<string, { readonly summary: string; readonly markdown: string }>
> = {
  "@riebeckite/plugin-color-mode": {
    summary:
      "Adds the light/dark/system color-mode control to the app shell. Markdown does not need special syntax; every page inherits the toggle.",
    markdown:
      "Write any page normally. Use the color-mode control in the header to see the same Markdown under light and dark tokens.",
  },
  "@riebeckite/plugin-l10n": {
    summary:
      "Routes translated Markdown files by language suffix and keeps the default-language file unsuffixed.",
    markdown: fence(
      "text",
      [
        "content/about.md       # default language",
        "content/about.ja.md    # Japanese version served under /ja/about/",
        "content/about.fr.md    # French version served under /fr/about/",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-seo": {
    summary:
      "Turns Markdown frontmatter and site config into metadata, feeds, sitemap, and robots output.",
    markdown: [
      "---",
      "title: Search-friendly title",
      "description: Page-specific summary used for meta tags and cards.",
      "image: /ogp/page.png",
      "date: 2026-09-30",
      "publish: true",
      "---",
      "",
      "# Search-friendly title",
    ].join("\n"),
  },
  "@riebeckite/plugin-toc": {
    summary: "Builds a table of contents from Markdown headings.",
    markdown: [
      "# Page",
      "",
      "## First section",
      "",
      "### Nested section",
      "",
      "## Second section",
    ].join("\n"),
  },
  "@riebeckite/plugin-properties": {
    summary: "Renders selected frontmatter properties in article metadata.",
    markdown: [
      "---",
      "created: 2026-09-30",
      "modified: 2026-09-30",
      "tags: [riebeckite, demo]",
      "status: active",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-alias": {
    summary:
      "Creates redirects from old Markdown paths declared in frontmatter.",
    markdown: [
      "---",
      "aliases:",
      "  - /old-page/",
      "  - /notes/previous-name/",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-search": {
    summary:
      "Indexes published Markdown pages for client-side search. No special syntax is required; searchable text comes from each page body and metadata.",
    markdown:
      "# Indexed page\n\nThis body text becomes searchable after the site is built.",
  },
  "@riebeckite/plugin-backlinks": {
    summary:
      "Shows pages that link to the current page. Use normal Markdown links or Obsidian wikilinks.",
    markdown:
      "Mention another page with [[guide]] or [the guide](/guide/). The target page can show this page as a backlink.",
  },
  "@riebeckite/plugin-related-posts": {
    summary: "Finds related pages from tags and backlink relationships.",
    markdown: [
      "---",
      "tags: [typescript, static-site]",
      "---",
      "",
      "Link to [[another-note]] to strengthen the relationship.",
    ].join("\n"),
  },
  "@riebeckite/plugin-share": {
    summary:
      "Adds share links to rendered pages. Markdown does not need special syntax; page title and URL are used automatically.",
    markdown: [
      "---",
      "title: Shareable article",
      "---",
      "",
      "# Shareable article",
    ].join("\n"),
  },
  "@riebeckite/plugin-changelog": {
    summary:
      "Surfaces recent or per-note update information from Markdown metadata.",
    markdown: [
      "---",
      "title: Updated article",
      "modified: 2026-09-30",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-webmention": {
    summary:
      "Displays webmentions for the page URL when data is available. Markdown controls the canonical page metadata.",
    markdown: [
      "---",
      "title: Mentionable page",
      "canonical: https://example.com/mentionable-page/",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-recent-posts": {
    summary: "Builds recent-post lists from dated Markdown entries.",
    markdown: [
      "---",
      "title: New post",
      "date: 2026-09-30",
      "publish: true",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-attachment": {
    summary:
      "Enhances links to downloadable assets, including size display when enabled.",
    markdown: "Download the handout: [slides.pdf](/attachments/slides.pdf)",
  },
  "@riebeckite/plugin-pdf": {
    summary: "Embeds linked PDFs with a viewer/fallback UI.",
    markdown: "![Project brief](./attachments/project-brief.pdf)",
  },
  "@riebeckite/plugin-media": {
    summary:
      "Enhances Markdown audio/video embeds with lazy loading and captions.",
    markdown:
      "![Demo video](./media/demo.mp4)\n\n![Episode audio](./media/episode.mp3)",
  },
  "@riebeckite/plugin-responsive-image": {
    summary:
      "Rewrites Markdown image embeds into responsive images with configured widths and formats.",
    markdown: "![A responsive landscape](./images/landscape.jpg)",
  },
  "@riebeckite/plugin-lightbox": {
    summary:
      "Makes image links open in a lightbox when the configured trigger class is present.",
    markdown:
      "[![Open in lightbox](./images/photo.jpg)](./images/photo.jpg){.rr-lightbox-trigger}",
  },
  "@riebeckite/plugin-highlight": {
    summary: "Highlights marked inline text.",
    markdown:
      "This sentence contains ==highlighted text== inside normal Markdown.",
  },
  "@riebeckite/plugin-code-annotations": {
    summary:
      "Renders code diffs with syntax highlighting for the target language.",
    markdown: [
      "```diff ts",
      "+ const answer = 42",
      "- const answer = 0",
      "console.log(answer)",
      "```",
    ].join("\n"),
  },
  "@riebeckite/plugin-shortcodes": {
    summary: "Expands built-in shortcode syntax inside Markdown.",
    markdown:
      '::youtube{id=dQw4w9WgXcQ}\n\n::figure[Demo image]{src="/images/demo.png"}',
  },
};

export { CONTENT_MARKDOWN_GUIDES };
