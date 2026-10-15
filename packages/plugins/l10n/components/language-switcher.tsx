import type { PluginComponent } from "@riebeckite/core";
import type { LocalizedContent } from "../src/l10n.js";

export type LanguageSwitcherProps = {
  localization: LocalizedContent | null;
};

const LanguageSwitcher: PluginComponent<LanguageSwitcherProps> = (props) => {
  const localization = props.localization;
  if (!localization || localization.availableLanguages.length < 2) return null;
  return (
    <nav class="l10n-switcher" aria-label="Language">
      <span class="l10n-switcher__label">Language</span>
      <ul class="l10n-switcher__list">
        {localization.availableLanguages.map((lang) => {
          const href = localization.translations[lang];
          if (!href) return null;
          return (
            <li key={lang}>
              <a
                class="l10n-switcher__link"
                href={href}
                hreflang={lang}
                lang={lang}
                aria-current={lang === localization.lang ? "page" : undefined}
              >
                {lang}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default LanguageSwitcher;
