import type { PluginComponent } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import type { LocalizedContent } from "../src/l10n.js";
import { getLocalization } from "../src/l10n.js";

export type LanguageSwitcherProps = {
  localization?: LocalizedContent | null;
};

const LanguageSwitcher = ((props: Readonly<LanguageSwitcherProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const localization =
    props.localization ??
    (site && article?.entry
      ? getLocalization(site.view, article.entry.slug)
      : null);
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
}) satisfies PluginComponent<LanguageSwitcherProps>;

export default LanguageSwitcher;
