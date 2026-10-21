import { codeAnnotations } from "@riebeckite/plugin-code-annotations";
import { type CodeTabsOptions, codeTabs } from "@riebeckite/plugin-code-tabs";
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
      fixtures: [
        {
          id: "diff",
          title: "Diff annotations",
          markdown: [
            "```diff",
            "-const legacy = true;",
            "+const modern = true;",
            "```",
          ].join("\n"),
        },
      ],
      create: () => codeAnnotations(),
    }),
  ],
});
