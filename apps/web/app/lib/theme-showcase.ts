import type { PreviewFixture } from "@riebeckite/preview";
import { defaultTheme } from "@riebeckite/theme-default";
import { editorialTheme } from "@riebeckite/theme-editorial";
import { folioTheme } from "@riebeckite/theme-folio";
import { gardenTheme } from "@riebeckite/theme-garden";
import { gruvboxTheme } from "@riebeckite/theme-gruvbox";
import { minimalTheme } from "@riebeckite/theme-minimal";
import { rerurateTheme } from "@riebeckite/theme-rerurate";
import { sakuraTheme } from "@riebeckite/theme-sakura";
import { technicalTheme } from "@riebeckite/theme-technical";
import { tokyonightTheme } from "@riebeckite/theme-tokyonight";

type ThemeDefinition = ReturnType<typeof defaultTheme>;

export type ShowcaseTheme = {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly packageName: string;
  readonly factory: string;
  readonly attributes: Readonly<Record<string, string>>;
};

function themeDefinition(
  theme: ThemeDefinition,
  details: Omit<ShowcaseTheme, "name" | "attributes">,
): ShowcaseTheme {
  return {
    ...details,
    name: theme.name,
    attributes: Object.fromEntries(
      Object.entries(theme.attributes ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
  };
}

export const showcaseThemes = [
  themeDefinition(defaultTheme(), {
    label: "Default",
    description: "A balanced foundation for documentation and product sites.",
    features: ["Balanced", "System-ready"],
    packageName: "@riebeckite/theme-default",
    factory: "defaultTheme",
  }),
  themeDefinition(minimalTheme(), {
    label: "Minimal",
    description: "A quiet baseline that keeps long-form content in focus.",
    features: ["Restrained", "Readable"],
    packageName: "@riebeckite/theme-minimal",
    factory: "minimalTheme",
  }),
  themeDefinition(gruvboxTheme(), {
    label: "Gruvbox",
    description: "Warm contrast for technical notes and focused writing.",
    features: ["Warm palette", "Contrast options"],
    packageName: "@riebeckite/theme-gruvbox",
    factory: "gruvboxTheme",
  }),
  themeDefinition(rerurateTheme(), {
    label: "Rerurate",
    description: "A characterful reading experience with editorial details.",
    features: ["Drop caps", "Motion options"],
    packageName: "@riebeckite/theme-rerurate",
    factory: "rerurateTheme",
  }),
  themeDefinition(sakuraTheme(), {
    label: "Sakura",
    description: "A soft, expressive theme for personal writing.",
    features: ["Serif tone", "Decorated headings"],
    packageName: "@riebeckite/theme-sakura",
    factory: "sakuraTheme",
  }),
  themeDefinition(tokyonightTheme(), {
    label: "Tokyo Night",
    description: "A nocturnal technical theme with precise contrast.",
    features: ["Technical", "Neon option"],
    packageName: "@riebeckite/theme-tokyonight",
    factory: "tokyonightTheme",
  }),
  themeDefinition(gardenTheme(), {
    label: "Garden",
    description: "Built for connected notes and a calm knowledge garden.",
    features: ["Notes", "Connected writing"],
    packageName: "@riebeckite/theme-garden",
    factory: "gardenTheme",
  }),
  themeDefinition(editorialTheme(), {
    label: "Editorial",
    description: "A considered, publication-like layout for essays.",
    features: ["Long-form", "Typography-led"],
    packageName: "@riebeckite/theme-editorial",
    factory: "editorialTheme",
  }),
  themeDefinition(technicalTheme(), {
    label: "Technical",
    description: "Clear hierarchy and dense detail for reference material.",
    features: ["Documentation", "Code-first"],
    packageName: "@riebeckite/theme-technical",
    factory: "technicalTheme",
  }),
  themeDefinition(folioTheme(), {
    label: "Folio",
    description: "A visual portfolio surface for projects and case studies.",
    features: ["Portfolio", "Captions"],
    packageName: "@riebeckite/theme-folio",
    factory: "folioTheme",
  }),
] as const;

export const showcaseFixtures: readonly PreviewFixture[] = [
  {
    id: "article",
    title: "Article",
    markdown: `# A considered interface\n\nA theme is more than a palette. It sets the rhythm of **reading**, the weight of a heading, and the space between ideas. Visit [Riebeckite](https://riebeckite.dev).\n\n## Reading with structure\n\n> Good typography makes a complex page easier to enter.\n\n- A clear hierarchy\n- Comfortable line length\n- Details that stay out of the way\n\n1. Write in Markdown\n2. Render with Riebeckite\n3. Choose the right theme\n\n### A small example\n\n\`\`\`ts\nimport { defineConfig } from "@riebeckite/core";\n\nexport default defineConfig({\n  theme: gardenTheme(),\n});\n\`\`\`\n\n| Token | Purpose |\n| --- | --- |\n| ink | Primary text |\n| paper | Surface |\n| accent | Links and focus |\n\n> [!NOTE]\n> The same Markdown makes typography and spacing differences easy to compare.\n\n---`,
  },
  {
    id: "notes",
    title: "Notes",
    markdown: `---\ntags: [design, notes]\nstatus: growing\n---\n\n# Theme observations\n\n[[Reading list]] collects references; [[Design principles]] holds the decisions behind this page.\n\n## Backlinks\n\n- [[Project index]] links here from the current release note.\n- A short note can still carry useful properties.\n\n> [!TIP]\n> Select **Reading list** from the page menu to inspect a related page.`,
    currentPageId: "observations",
    pages: [
      {
        id: "observations",
        title: "Theme observations",
        path: "notes/Theme observations.md",
        markdown: `# Theme observations\n\n[[Reading list]] collects references; [[Design principles]] holds the decisions behind this page.\n\n> [!NOTE]\n> Notes stay small, linked, and easy to revisit.`,
      },
      {
        id: "reading-list",
        title: "Reading list",
        path: "notes/Reading list.md",
        markdown: `# Reading list\n\n- [[Theme observations]]\n- *The Elements of Typographic Style*\n- A useful design decision record`,
      },
    ],
  },
  {
    id: "documentation",
    title: "Documentation",
    markdown: `# Configure a theme\n\nUse a theme factory in \`riebeckite.config.ts\`.\n\n## Installation\n\n\`\`\`sh\nnpm install @riebeckite/theme-garden\n\`\`\`\n\n## Configuration\n\n\`\`\`ts\nimport { defineConfig } from "@riebeckite/core";\nimport { gardenTheme } from "@riebeckite/theme-garden";\n\nexport default defineConfig({ theme: gardenTheme() });\n\`\`\`\n\n| Mode | Behaviour |\n| --- | --- |\n| light | Always light |\n| dark | Always dark |\n| system | Follows the OS |\n\n> [!WARNING]\n> Install the package before importing its factory.`,
  },
  {
    id: "portfolio",
    title: "Portfolio",
    markdown: `# Atlas field notes\n\n![A quiet desk with an open notebook](https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=80)\n\n*Research, writing, and an interface for returning to ideas.*\n\n## The work\n\nAtlas turns scattered project notes into a readable public record. The system pairs concise essays with a searchable archive.\n\n[Read the case study](https://riebeckite.dev)\n\n> [!NOTE]\n> External images are intentionally limited to HTTPS in the preview document.`,
  },
] as const;
