import { resolvePlugins } from "./types/plugin";
import type { PostFrontmatter } from "./types/post_content";
import type { ResolvedRiebeckiteConfig } from "./types/resolved_riebeckite_config";
import type { RiebeckiteConfig } from "./types/riebeckite_config";

export function defineConfig(config: RiebeckiteConfig): RiebeckiteConfig {
  return config;
}

export function resolveConfig(
  config: RiebeckiteConfig,
): ResolvedRiebeckiteConfig {
  return {
    site: {
      title: config.site?.title ?? "",
      description: config.site?.description ?? "",
      author: config.site?.author ?? "",
      baseUrl: config.site?.baseUrl ?? "",
      locale: config.site?.locale ?? "en",
      twitterSite: config.site?.twitterSite ?? "",
      defaultOgImage: config.site?.defaultOgImage ?? "",
      feed: {
        title: config.site?.feed?.title ?? config.site?.title ?? "",
        description:
          config.site?.feed?.description ?? config.site?.description ?? "",
        language: config.site?.feed?.language ?? config.site?.locale ?? "en",
      },
    },
    content: {
      directory: config.content?.directory ?? "../../content",
      exclude: config.content?.exclude ?? [],
      filters: {
        publishStrategy: config.content?.filters?.publishStrategy ?? "explicit",
      },
    },
    markdown: {
      syntaxHighlight: {
        theme: config.markdown?.syntaxHighlight?.theme ?? "",
      },
    },
    theme: {
      name: config.theme?.name ?? "riebeckite",
      colorMode: config.theme?.colorMode ?? "system",
      typography: config.theme?.typography ?? "system",
      articleLayout: config.theme?.articleLayout ?? "article",
      tokens: config.theme?.tokens ?? {},
      userCss: config.theme?.userCss ?? [],
    },
    plugins: resolvePlugins(config.plugins),
  };
}

export function isPublished(
  config: ResolvedRiebeckiteConfig,
  frontmatter: PostFrontmatter | undefined,
): boolean {
  if (config.content.filters.publishStrategy === "explicit") {
    return frontmatter?.publish === true;
  }

  return !(frontmatter?.private === true || frontmatter?.draft === true);
}

export function isExcluded(patterns: string[], relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  return patterns.some((pattern) => matchGlob(pattern, normalized));
}

function matchGlob(pattern: string, value: string): boolean {
  return globToRegExp(pattern).test(value);
}

function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          re += "(?:[^/]+/)*";
        } else {
          re += ".*";
        }
      } else {
        re += "[^/]*";
      }
    } else if (ch === "?") {
      re += "[^/]";
    } else {
      re += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }

  return new RegExp(`^${re}$`);
}
