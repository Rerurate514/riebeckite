export const THEME_TEMPLATE_IDS = [
  "minimal",
  "blog",
  "documentation",
  "portfolio",
  "digital-garden",
  "blank",
] as const;

export type ThemeTemplateId = (typeof THEME_TEMPLATE_IDS)[number];

export const THEME_FEATURE_IDS = [
  "typography",
  "code-blocks",
  "callouts",
  "cards",
  "toc",
  "responsive",
  "animations",
  "print-styles",
] as const;

export type ThemeFeatureId = (typeof THEME_FEATURE_IDS)[number];

type ThemeTemplate = {
  readonly id: ThemeTemplateId;
  readonly name: string;
  readonly description: string;
  readonly defaultFeatures: readonly ThemeFeatureId[];
};

export const themeTemplateRegistry: Readonly<
  Record<ThemeTemplateId, ThemeTemplate>
> = {
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "A small, accessible general-purpose theme.",
    defaultFeatures: ["typography", "responsive"],
  },
  blog: {
    id: "blog",
    name: "Blog",
    description: "Article-focused reading and metadata presentation.",
    defaultFeatures: ["typography", "code-blocks", "responsive"],
  },
  documentation: {
    id: "documentation",
    name: "Documentation",
    description: "Structured documentation with sidebar and TOC styling.",
    defaultFeatures: [
      "typography",
      "code-blocks",
      "callouts",
      "toc",
      "responsive",
    ],
  },
  portfolio: {
    id: "portfolio",
    name: "Portfolio",
    description: "A spacious visual presentation for work and media.",
    defaultFeatures: ["cards", "responsive"],
  },
  "digital-garden": {
    id: "digital-garden",
    name: "Digital Garden",
    description: "Notes, links, tags, backlinks, callouts, and graph hooks.",
    defaultFeatures: ["typography", "callouts", "cards", "responsive"],
  },
  blank: {
    id: "blank",
    name: "Blank",
    description: "Only the required public Theme API and token contract.",
    defaultFeatures: [],
  },
};

export const themeFeatureRegistry: Readonly<
  Record<ThemeFeatureId, { readonly description: string }>
> = {
  typography: { description: "Article typography using rb article hooks." },
  "code-blocks": {
    description: "Visual frame for the code plugin public hooks.",
  },
  callouts: { description: "Visual frame for the callout plugin public hook." },
  cards: {
    description: "Surface treatment for public content and plugin roots.",
  },
  toc: { description: "Visual treatment for the TOC plugin public hook." },
  responsive: { description: "Small-screen layout and overflow safeguards." },
  animations: { description: "Reduced-motion-safe visual transitions." },
  "print-styles": { description: "Print-friendly presentation rules." },
};

function isThemeTemplateId(value: string): value is ThemeTemplateId {
  return THEME_TEMPLATE_IDS.includes(value as ThemeTemplateId);
}

export function parseThemeTemplate(value: string): ThemeTemplateId {
  if (!isThemeTemplateId(value)) {
    throw new Error(
      `Unknown theme template: ${value}. Available templates: ${THEME_TEMPLATE_IDS.join(", ")}.`,
    );
  }
  return value;
}

export function parseThemeFeatures(value: string): readonly ThemeFeatureId[] {
  if (!value.trim()) return [];
  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const invalid = values.filter(
    (item) => !THEME_FEATURE_IDS.includes(item as ThemeFeatureId),
  );
  if (invalid.length > 0) {
    throw new Error(
      `Unknown theme feature: ${invalid.join(", ")}. Available features: ${THEME_FEATURE_IDS.join(", ")}.`,
    );
  }
  return [...new Set(values)] as ThemeFeatureId[];
}
