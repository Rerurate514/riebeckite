export type HomeLocale = "ja" | "en";

const HOME_REPO_URL = "https://github.com/Rerurate514/riebeckite";

type HomeMetadata = {
  title: string;
  description: string;
};

const metadata: Record<HomeLocale, HomeMetadata> = {
  en: {
    title: "Riebeckite — Markdown & Obsidian Website Framework",
    description:
      "Build and publish a website from Markdown and Obsidian notes with a TypeScript framework, independent plugins, themes, and content sources.",
  },
  ja: {
    title: "Riebeckite — Markdown と Obsidian のサイトフレームワーク",
    description:
      "Markdown と Obsidian のノートから、TypeScript、独立した Plugin・Theme・コンテンツソースを使った Web サイトを作成・公開するフレームワークです。",
  },
};

export function getHomeMetadata(locale: HomeLocale): HomeMetadata {
  return metadata[locale];
}

export function getHomePath(locale: HomeLocale): string {
  return locale === "en" ? "/" : "/ja/";
}

export function buildSoftwareApplicationSchema(
  locale: HomeLocale,
  url: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Riebeckite",
    description: getHomeMetadata(locale).description,
    url,
    applicationCategory: "DeveloperApplication",
    codeRepository: HOME_REPO_URL,
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    isAccessibleForFree: true,
    inLanguage: locale === "ja" ? "ja-JP" : "en-US",
  };
}
