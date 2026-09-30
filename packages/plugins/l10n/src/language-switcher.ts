import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { LanguageSwitcherRenderContext } from "./l10n.js";

/** Framework-neutral default renderer for the standard LanguageSwitcher. */
export function renderLanguageSwitcher({
  localization,
}: LanguageSwitcherRenderContext): string | null {
  if (localization.availableLanguages.length < 2) return null;
  const links = localization.availableLanguages
    .map((lang) => {
      const href = localization.translations[lang];
      if (!href) return "";
      const current = lang === localization.lang ? ' aria-current="page"' : "";
      const escaped = escapeHtml(lang);
      return `<li><a class="l10n-switcher__link" href="${escapeHtmlAttribute(href)}" hreflang="${escapeHtmlAttribute(lang)}" lang="${escapeHtmlAttribute(lang)}"${current}>${escaped}</a></li>`;
    })
    .join("");
  if (!links) return null;
  return `<nav class="l10n-switcher" aria-label="Language"><span class="l10n-switcher__label">Language</span><ul class="l10n-switcher__list">${links}</ul></nav>`;
}
