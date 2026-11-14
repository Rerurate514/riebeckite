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
    <>
      <section class="rb-home__configuration" aria-labelledby="home-extensions">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">{t.extensions[0]}</p>
          <h2 id="home-extensions">{t.extensions[1]}</h2>
          <p>{t.extensions[2]}</p>
        </div>
        <div class="rb-home__application-example">
          {runtime && <RuntimeCode html={runtime.codes.application} />}
          <div class="rb-home__application-copy">
            <p>{t.extensions[3]}</p>
            <div class="rb-home__resource-links">
              <a class="rb-home__text-link" href={href("/docs/plugins/")}>
                {t.extensions[4]}
              </a>
              <a class="rb-home__text-link" href={href("/docs/plugins/search")}>
                {locale === "ja" ? "検索 Plugin" : "Search plugin"}
              </a>
              <a class="rb-home__text-link" href={href("/docs/themes/")}>
                {t.extensions[5]}
              </a>
            </div>
          </div>
        </div>
      </section>
      <section class="rb-home__recipes" aria-labelledby="home-recipes">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">{t.recipes[0]}</p>
          <h2 id="home-recipes">{t.recipes[1]}</h2>
          <p>{t.recipes[2]}</p>
        </div>
        <div class="rb-home__recipe-links">
          <a href={href("/docs/plugins/search")}>
            <strong>{t.recipes[3]}</strong>
            <span>{t.recipes[4]}</span>
          </a>
          <a href={href("/docs/plugins/related-posts")}>
            <strong>{t.recipes[5]}</strong>
            <span>{t.recipes[6]}</span>
          </a>
          <a href={href("/docs/plugins/local-graph")}>
            <strong>
              {locale === "ja" ? "ローカルグラフ" : "Local graph"}
            </strong>
            <span>
              {locale === "ja"
                ? "ノートの周辺にあるリンクを表示する。"
                : "Show links around a note."}
            </span>
          </a>
          <a href={href("/docs/plugins/l10n")}>
            <strong>{locale === "ja" ? "多言語化" : "Localization"}</strong>
            <span>
              {locale === "ja"
                ? "複数の言語で公開する。"
                : "Publish in more than one language."}
            </span>
          </a>
        </div>
      </section>
    </>
  );
}
