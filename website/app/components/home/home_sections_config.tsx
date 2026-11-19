import type { HomeLocale } from "../../lib/home";
import type { HomeRuntime } from "../../lib/home-runtime";
import type { HomeContent } from "./home_content.js";
import RuntimeCode from "./runtime-code";

export function HomeConfigSection({
  locale,
  t,
  href,
  runtime,
}: {
  locale: HomeLocale;
  t: HomeContent;
  href: (path: string) => string;
  runtime?: HomeRuntime;
}) {
  return (
    <section class="rb-home__configuration" aria-labelledby="home-extensions">
      <div class="rb-home__section-intro">
        <h2 id="home-extensions">{t.extensions.title}</h2>
        <p>{t.extensions.description}</p>
        <p class="rb-home__application-details">{t.extensions.details}</p>
        <div class="rb-home__resource-links">
          <a class="rb-home__text-link" href={href("/docs/plugins/")}>
            {t.extensions.pluginsLink}
          </a>
          <a class="rb-home__text-link" href={href("/docs/plugins/search")}>
            {locale === "ja" ? "検索 Plugin" : "Search plugin"}
          </a>
          <a class="rb-home__text-link" href={href("/docs/themes/")}>
            {t.extensions.themesLink}
          </a>
        </div>
      </div>
      <div class="rb-home__application-example">
        {runtime && <RuntimeCode html={runtime.codes.application} />}
      </div>
    </section>
  );
}
