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

export type ThemeConfig = {
  name?: string;
  colorMode?: ThemeColorMode;
  typography?: ThemeTypographyPreset;
  articleLayout?: ThemeArticleLayoutPreset;
  tokens?: ThemeDesignTokens;
  userCss?: string[];
};
