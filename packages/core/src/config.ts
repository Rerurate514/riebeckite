import { validateConfig } from "./config_validation.js";
import {
  resolvePublishingBuildTime,
  resolvePublishingState,
} from "./content/publishing.js";
import { resolvePublicationConfig } from "./publication/config.js";
import { type RiebeckitePlugin, resolvePlugins } from "./types/plugin.js";
import type { PostFrontmatter } from "./types/post_content.js";
import type { ResolvedRiebeckiteConfig } from "./types/resolved_riebeckite_config.js";
import type { RiebeckiteConfig, SpaConfig } from "./types/riebeckite_config.js";
import {
  defineTheme,
  resolveTheme,
  type ThemeStyle,
} from "./types/theme_config.js";

const defaultThemeStyle: ThemeStyle = {
  moduleSpecifier: "@riebeckite/theme-default/style.css",
};

const fallbackTheme = defineTheme({
  name: "riebeckite",
  styles: [defaultThemeStyle],
});

export function defineConfig(config: RiebeckiteConfig): RiebeckiteConfig {
  return config;
}

export function resolveConfigModule(
  configModule: unknown,
): ResolvedRiebeckiteConfig {
  return resolveConfig(unwrapConfigModule(configModule));
}

const configModuleWrapperKeys = new Set([
  "default",
  "module.exports",
  "__esModule",
]);

function unwrapConfigModule(configModule: unknown): RiebeckiteConfig {
  let candidate: unknown = configModule;
  while (isConfigModuleWrapper(candidate)) {
    candidate = candidate.default;
  }

  return candidate as RiebeckiteConfig;
}

function isConfigModuleWrapper(value: unknown): value is { default: unknown } {
  if (typeof value !== "object" || value === null) return false;
  if (!("default" in value)) return false;

  const keys = Object.keys(value);
  return (
    keys.length > 0 && keys.every((key) => configModuleWrapperKeys.has(key))
  );
}

export function resolveConfig(
  config: RiebeckiteConfig,
): ResolvedRiebeckiteConfig {
  validateConfig(config);
  const theme = resolveThemeConfig(config.theme);
  const spa = resolveSpaConfig(config.spa);

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
      directory: config.content?.directory ?? "content",
      source: config.content?.source,
      exclude: config.content?.exclude ?? [],
      filters: {
        publishStrategy: config.content?.filters?.publishStrategy ?? "explicit",
      },
    },
    theme,
    plugins: resolvePlugins(config.plugins),
    pluginInventory: (config.plugins ?? [])
      .filter((plugin): plugin is RiebeckitePlugin => Boolean(plugin))
      .map((plugin) => ({
        name: plugin.name,
        enabled: plugin.enabled !== false,
        provides: plugin.provides ?? [],
        requires: plugin.requires ?? [],
        optional: plugin.optional ?? [],
      })),
    cache: {
      enabled: config.cache?.enabled ?? true,
      directory: config.cache?.directory ?? "",
    },
    provenance: {
      enabled: config.provenance?.enabled ?? true,
    },
    publication: resolvePublicationConfig(config.publication),
    ...(spa === undefined ? {} : { spa }),
  };
}

function resolveSpaConfig(spa: RiebeckiteConfig["spa"]): SpaConfig | undefined {
  if (spa === undefined || spa === false) return undefined;
  return spa === true ? {} : spa;
}

function resolveThemeConfig(
  themeInput: RiebeckiteConfig["theme"],
): ResolvedRiebeckiteConfig["theme"] {
  return resolveTheme(themeInput, fallbackTheme);
}

export function isPublished(
  config: ResolvedRiebeckiteConfig,
  frontmatter: PostFrontmatter | undefined,
  options: { buildTime?: Date | string } = {},
): boolean {
  return resolvePublishingState(frontmatter, {
    strategy: config.content.filters.publishStrategy,
    buildTime: resolvePublishingBuildTime(options.buildTime),
  }).routable;
}

export function isExcluded(
  patterns: readonly string[],
  relativePath: string,
): boolean {
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
