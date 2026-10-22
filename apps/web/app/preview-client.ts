import autoCardLinkStyle from "@riebeckite/plugin-autocardlink/style.css?inline";
import codeEnhanceStyle from "@riebeckite/plugin-code-enhance/style.css?inline";
import codeTabsStyle from "@riebeckite/plugin-code-tabs/style.css?inline";
import highlightStyle from "@riebeckite/plugin-highlight/style.css?inline";
import lightboxStyle from "@riebeckite/plugin-lightbox/style.css?inline";
import obsidianMarkdownStyle from "@riebeckite/plugin-obsidian-markdown/style.css?inline";
import shortcodesStyle from "@riebeckite/plugin-shortcodes/style.css?inline";
import sidenotesStyle from "@riebeckite/plugin-sidenotes/style.css?inline";
import { initPluginPreviews as initializePluginPreviews } from "@riebeckite/preview/ui";
import defaultThemeStyle from "@riebeckite/theme-default/style.css?inline";
import gruvboxThemeStyle from "@riebeckite/theme-gruvbox/style.css?inline";
import minimalThemeStyle from "@riebeckite/theme-minimal/style.css?inline";
import rerurateThemeStyle from "@riebeckite/theme-rerurate/style.css?inline";
import sakuraThemeStyle from "@riebeckite/theme-sakura/style.css?inline";
import tokyonightThemeStyle from "@riebeckite/theme-tokyonight/style.css?inline";

const themeStyles = {
  default: defaultThemeStyle,
  gruvbox: gruvboxThemeStyle,
  minimal: minimalThemeStyle,
  rerurate: rerurateThemeStyle,
  sakura: sakuraThemeStyle,
  tokyonight: tokyonightThemeStyle,
} as const;

export function initPluginPreviews(): void {
  initializePluginPreviews({
    themeStyles,
    pluginStyles: [
      autoCardLinkStyle,
      codeEnhanceStyle,
      codeTabsStyle,
      highlightStyle,
      lightboxStyle,
      obsidianMarkdownStyle,
      sidenotesStyle,
      shortcodesStyle,
    ],
  });
}
