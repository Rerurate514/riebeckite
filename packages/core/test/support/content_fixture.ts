import type { ContentSource } from "../../src/content/content_source.js";
import type { ResolvedRiebeckiteConfig } from "../../src/types/resolved_riebeckite_config.js";

export function memoryContentSource(
  files: Record<string, string>,
): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

export function contentTestConfig(
  directory: string,
  plugins: ResolvedRiebeckiteConfig["plugins"] = [],
): ResolvedRiebeckiteConfig {
  return {
    buildDirectory: directory,
    site: {
      title: "Test",
      description: "",
      author: "",
      baseUrl: "http://test",
      locale: "en",
      twitterSite: "",
      defaultOgImage: "",
      feed: { title: "", description: "", language: "en" },
    },
    content: {
      directory: "/test",
      exclude: [],
      filters: { publishStrategy: "explicit" },
    },
    theme: {
      name: "test",
      colorMode: "system",
      typography: "system",
      articleLayout: "article",
      tokens: {},
      attributes: {},
      userCss: [],
      styles: [],
    },
    plugins,
    cache: { enabled: true, directory },
  };
}
