export type ThemeColorMode = "light" | "dark" | "system";

export type ThemeTypographyPreset = "system" | "serif" | "sans";

export type ThemeArticleLayoutPreset = "article" | "sidebar" | "full-width";

export type ThemeDesignTokens = {
  color?: {
    paper?: string;
    ink?: string;
    muted?: string;
    accent?: string;
    border?: string;
    borderStrong?: string;
    surface?: string;
    surfaceHover?: string;
    overlay?: string;
    danger?: string;
    success?: string;
    codeBackground?: string;
  };
  typography?: {
    bodyFont?: string;
    headingFont?: string;
    monoFont?: string;
  };
  layout?: {
    pageMaxWidth?: string;
    articleMaxWidth?: string;
    sidebarWidth?: string;
    contentGap?: string;
  };
};

export type ThemeStyle = {
  /**
   * CSS module specifier resolved by the host bundler.
   * Example: "@riebeckite/theme-default/style.css".
   */
  moduleSpecifier: string;
};

export type ThemeAttributes = Record<`data-${string}`, string | undefined>;

export type ThemeConfig = {
  name?: string;
  colorMode?: ThemeColorMode;
  typography?: ThemeTypographyPreset;
  articleLayout?: ThemeArticleLayoutPreset;
  tokens?: ThemeDesignTokens;
  attributes?: ThemeAttributes;
  userCss?: string[];
};

export type RiebeckiteTheme<TOptions = unknown> = {
  name: string;
  options?: TOptions;
  styles?: ThemeStyle[];
  config?: Omit<ThemeConfig, "name" | "userCss"> & {
    userCss?: string[];
  };
  attributes?: ThemeAttributes;
};

export type ThemeInput = ThemeConfig | RiebeckiteTheme;

export function defineTheme<TOptions>(
  theme: RiebeckiteTheme<TOptions>,
): RiebeckiteTheme<TOptions> {
  return theme;
}

export function isRiebeckiteTheme(theme: ThemeInput): theme is RiebeckiteTheme {
  return "styles" in theme || "config" in theme;
}
