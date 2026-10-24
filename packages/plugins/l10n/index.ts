export type { LanguageSwitcherProps } from "./components/language-switcher.js";
export { default as LanguageSwitcher } from "./components/language-switcher.js";
export {
  getLanguageFromPath,
  getLocalization,
  getLocalizedContent,
  type L10nContent,
  type L10nDetectorContext,
  type L10nDetectorResult,
  type L10nOptions,
  type LocalizedContent,
  l10n,
} from "./src/l10n.js";
