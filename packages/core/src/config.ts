import { validateConfig } from "./config_validation";
import { resolvePlugins } from "./types/plugin";
import type { PostFrontmatter } from "./types/post_content";
import type { ResolvedRiebeckiteConfig } from "./types/resolved_riebeckite_config";
import type { RiebeckiteConfig } from "./types/riebeckite_config";
import type { ThemeAttributes, ThemeStyle } from "./types/theme_config";
import { isRiebeckiteTheme } from "./types/theme_config";

const defaultThemeStyle: ThemeStyle = {
  moduleSpecifier: "@riebeckite/theme-default/style.css",
};

export function defineConfig(config: RiebeckiteConfig): RiebeckiteConfig {
  return config;
}

/**
 * Resolves a config module that was loaded through `import()`.
 *
 * Depending on the loader, a config module arrives as the config object, a
 * single ESM namespace (`{ default: config }`), or — under tsx, which compiles
 * the config to CommonJS before Node's ESM interop wraps it — a double
 * namespace (`{ default: { default: config } }`). This is the single
 * normalization boundary for every shape so that consumers never need to unwrap
 * `.default` themselves.
 */
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
      source: config.content?.source,
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
    theme,
    plugins: resolvePlugins(config.plugins),
  };
}

function resolveThemeConfig(
  themeInput: RiebeckiteConfig["theme"],
): ResolvedRiebeckiteConfig["theme"] {
  const theme = themeInput
    ? isRiebeckiteTheme(themeInput)
      ? { name: themeInput.name, ...themeInput.config }
      : themeInput
    : undefined;
  const styles = themeInput
    ? isRiebeckiteTheme(themeInput)
      ? (themeInput.styles ?? [])
      : [defaultThemeStyle]
    : [defaultThemeStyle];
  const attributes = themeInput
    ? isRiebeckiteTheme(themeInput)
      ? { ...themeInput.config?.attributes, ...themeInput.attributes }
      : themeInput.attributes
    : undefined;

  return {
    name: theme?.name ?? "riebeckite",
    colorMode: theme?.colorMode ?? "system",
    typography: theme?.typography ?? "system",
    articleLayout: theme?.articleLayout ?? "article",
    tokens: theme?.tokens ?? {},
    attributes: sanitizeThemeAttributes(attributes),
    userCss: theme?.userCss ?? [],
    styles,
  };
}

function sanitizeThemeAttributes(
  attributes: ThemeAttributes | undefined,
): ThemeAttributes {
  if (!attributes) return {};
  const reservedAttributes = new Set([
    "data-theme",
    "data-theme-name",
    "data-typography",
    "data-article-layout",
  ]);

  return Object.fromEntries(
    Object.entries(attributes)
      .filter(
        ([name, value]) => name.startsWith("data-") && value !== undefined,
      )
      .filter(([name]) => !reservedAttributes.has(name)),
  ) as ThemeAttributes;
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
