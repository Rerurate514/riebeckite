import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";
import {
  type CodeEnhanceOptions,
  codeEnhance,
} from "@riebeckite/plugin-code-enhance";
import { type CodeTabsOptions, codeTabs } from "@riebeckite/plugin-code-tabs";
import { hardBreaks } from "@riebeckite/plugin-hard-breaks";
import { type HighlightOptions, highlight } from "@riebeckite/plugin-highlight";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import {
  type ShortcodeOptions,
  shortcodes,
} from "@riebeckite/plugin-shortcodes";
import { type SidenotesOptions, sidenotes } from "@riebeckite/plugin-sidenotes";
import {
  createPreviewRegistry,
  definePluginPreview,
  type PreviewRegistry,
} from "@riebeckite/preview";

export const previewRegistry: PreviewRegistry = createPreviewRegistry({
  plugins: [
    definePluginPreview<CodeTabsOptions>({
      id: "code-tabs",
      title: "Code Tabs",
      availability: "browser",
      modes: ["static"],
      fixtures: [
        {
          id: "basic",
          title: "Basic tabs",
          markdown: [
            '```ts tab="TypeScript"',
            'const message = "Hello, Riebeckite";',
            "```",
            "",
            '```js tab="JavaScript"',
            'const message = "Hello, Riebeckite";',
            "```",
          ].join("\n"),
        },
        {
          id: "separate-groups",
          title: "Separate groups",
          markdown: [
            '```ts tab="TypeScript"',
            "const answer = 42;",
            "```",
            "",
            "A paragraph separates the groups.",
            "",
            '```js tab="JavaScript"',
            "const answer = 42;",
            "```",
          ].join("\n"),
        },
      ],
      options: {
        syncTabs: {
          type: "boolean",
          title: "Sync code-tab labels",
          default: false,
        },
      },
      create: (options) => codeTabs(options),
    }),
    definePluginPreview({
      id: "code-annotations",
      title: "Code Annotations",
      availability: "browser",
      modes: ["static"],
      fixtures: [
        {
          id: "diff",
          title: "Diff annotations",
          markdown: [
            "```diff ts",
            "-const legacy = true;",
            "+const modern = true;",
            "```",
          ].join("\n"),
        },
      ],
      create: () => codeAnnotations(),
    }),
    definePluginPreview({
      id: "autocardlink",
      title: "Auto Card Link",
      availability: "browser",
      modes: ["static"],
      fixtures: [
        fixture(
          "card",
          "Link card",
          [
            "```cardlink",
            "url: https://riebeckite.dev",
            "title: Riebeckite",
            "description: A Markdown publishing toolkit.",
            "host: riebeckite.dev",
            "```",
          ].join("\n"),
        ),
      ],
      create: () => autoCardLinkPlugin(),
    }),
    definePluginPreview<CodeEnhanceOptions>({
      id: "code-enhance",
      title: "Code Enhance",
      availability: "browser",
      modes: ["static"],
      fixtures: [
        fixture(
          "highlighted-lines",
          "Highlighted lines",
          '```ts {2} title="greeting.ts"\nconst greeting = "Hello";\nconsole.log(greeting);\n```',
        ),
      ],
      options: {
        copyLabel: { type: "string", title: "Copy label", default: "Copy" },
      },
      create: (options) => codeEnhance(options),
    }),
    definePluginPreview({
      id: "hard-breaks",
      title: "Hard Breaks",
      availability: "browser",
      modes: ["static"],
      fixtures: [
        fixture(
          "paragraph",
          "Soft line breaks",
          "The first line\ncontinues on the second line.",
        ),
      ],
      create: () => hardBreaks(),
    }),
    definePluginPreview<HighlightOptions>({
      id: "highlight",
      title: "Highlight",
      availability: "browser",
      modes: ["static"],
      fixtures: [
        fixture(
          "marked-text",
          "Marked text",
          "Use ==highlighted text== for emphasis.",
        ),
      ],
      options: { tag: { type: "string", title: "HTML tag", default: "mark" } },
      create: (options) => highlight(options),
    }),
    definePluginPreview({
      id: "lightbox",
      title: "Lightbox",
      availability: "browser",
      modes: ["static"],
      fixtures: [
        fixture(
          "image",
          "Enhanced image",
          "![A violet square](https://placehold.co/640x360/7655a6/ffffff?text=Lightbox)",
        ),
      ],
      create: () => lightboxPlugin(),
    }),
    definePluginPreview({
      id: "obsidian-markdown",
      title: "Obsidian Markdown",
      availability: "browser",
      modes: ["static", "site"],
      fixtures: [
        fixture(
          "callout",
          "Callout and tag",
          "> [!tip] Preview\n> This is an Obsidian callout.\n\n#riebeckite",
        ),
        {
          id: "wiki-links",
          title: "Wiki links across pages",
          markdown:
            "# Architecture\n\n[[Guides/Getting Started|Read the guide]]",
          currentPageId: "architecture",
          pages: [
            {
              id: "architecture",
              title: "Architecture",
              path: "notes/Architecture.md",
              markdown:
                "---\ntags: [riebeckite, architecture]\n---\n# Architecture\n\n[[Guides/Getting Started|Read the guide]]",
            },
            {
              id: "getting-started",
              title: "Getting Started",
              path: "Guides/Getting Started.md",
              markdown:
                "---\ntags: [riebeckite, guide]\n---\n# Getting Started\n\n[[Architecture]] explains the design.",
            },
          ],
        },
      ],
      create: () => obsidianMarkdown(),
    }),
    definePluginPreview<SidenotesOptions>({
      id: "sidenotes",
      title: "Sidenotes",
      availability: "browser",
      modes: ["static"],
      fixtures: [
        fixture(
          "note",
          "Footnote conversion",
          "A claim with a note.[^note]\n\n[^note]: The generated static markup is shown; the popover needs the site client entry.",
        ),
      ],
      create: (options) => sidenotes(options),
    }),
    definePluginPreview<ShortcodeOptions>({
      id: "shortcodes",
      title: "Shortcodes",
      availability: "browser",
      fixtures: [
        fixture(
          "note",
          "Note shortcode",
          ":::note[Preview]\nThis block is rendered by the shortcode plugin.\n:::",
        ),
      ],
      create: (options) => shortcodes(options),
    }),
  ],
});

function fixture(id: string, title: string, markdown: string) {
  return { id, title, markdown };
}
