import type { PluginSiteComponent } from "@riebeckite/core";
import { useArticleContext, useSiteContext, useUiLabels } from "@riebeckite/ui";
import type { LocalizedContent } from "../src/l10n.js";
import { getLocalization } from "../src/l10n.js";
import { l10nLabels } from "../src/labels.js";

export type LanguageSwitcherProps = {
  localization?: LocalizedContent | null;
};

const LanguageSwitcher = ((props: Readonly<LanguageSwitcherProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const labels = useUiLabels(l10nLabels);
  const localization =
    props.localization ??
    (site && article?.entry
      ? getLocalization(site.view, article.entry.slug)
      : null);
  if (!localization || localization.availableLanguages.length < 2) return null;
  return (
    <nav class="rr-l10n-switcher" aria-label={labels.language}>
      <span class="rr-l10n-switcher__label">{labels.language}</span>
      <ul class="rr-l10n-switcher__list">
        {localization.availableLanguages.map((lang) => {
          const href = localization.translations[lang];
          if (!href) return null;
          return (
            <li key={lang}>
              <a
                class="rr-l10n-switcher__link"
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
}) satisfies PluginSiteComponent<LanguageSwitcherProps>;

export default LanguageSwitcher;
