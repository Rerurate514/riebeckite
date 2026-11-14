import type { HomeLocale } from "../../lib/home";
import type { HomeContent } from "./home_content.js";

export function HomeContinueSection({
  locale,
  t,
  href,
}: {
  locale: HomeLocale;
  t: HomeContent;
  href: (path: string) => string;
}) {
  return (
    <>
      <section class="rb-home__workflow" aria-labelledby="home-workflow">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">{t.workflow[0]}</p>
          <h2 id="home-workflow">{t.workflow[1]}</h2>
        </div>
        <ol class="rb-home__workflow-list">
          <li>
            <strong>{t.workflow[2]}</strong>
            <span>{t.workflow[3]}</span>
          </li>
          <li>
            <strong>{t.workflow[4]}</strong>
            <span>{t.workflow[5]}</span>
          </li>
          <li>
            <strong>{t.workflow[6]}</strong>
            <span>{t.workflow[7]}</span>
          </li>
          <li>
            <strong>{locale === "ja" ? "公開" : "Publish"}</strong>
            <span>
              {locale === "ja" ? (
                <>
                  生成された <code>dist/</code> をデプロイする。
                </>
              ) : (
                <>
                  Deploy the generated <code>dist/</code>.
                </>
              )}
            </span>
          </li>
        </ol>
      </section>
      <section class="rb-home__gallery" aria-labelledby="home-gallery">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">{t.gallery[0]}</p>
          <h2 id="home-gallery">{t.gallery[1]}</h2>
          <p>{t.gallery[2]}</p>
        </div>
        <div class="rb-home__gallery-links">
          <a href={href("/themes")}>
            <span>{t.gallery[3]}</span>
            <b>→</b>
          </a>
          <a href={href("/docs/plugins/showcase")}>
            <span>{t.gallery[4]}</span>
            <b>→</b>
          </a>
          <a href={href("/docs/guides/customizing-your-site")}>
            <span>{t.gallery[5]}</span>
            <b>→</b>
          </a>
        </div>
      </section>
      <section class="rb-home__continue" aria-labelledby="home-continue">
        <h2 id="home-continue">{t.continue[0]}</h2>
        <p>
          {t.continue[1]} <code>dist/</code>
          {locale === "ja" ? "" : ". "}
          {t.continue[2]}
        </p>
        <div class="rb-home__resource-links">
          <a
            class="rb-home__cta rb-home__cta--primary"
            href={href("/docs/getting-started/")}
          >
            {t.continue[3]}
          </a>
          <a
            class="rb-home__text-link"
            href={href("/docs/getting-started/deployment")}
          >
            {t.continue[4]}
          </a>
          <a class="rb-home__text-link" href={href("/docs/")}>
            {locale === "ja" ? "ドキュメント" : "Documentation"}
          </a>
          <a
            class="rb-home__language"
            href={t.language[0]}
            hreflang={t.language[1]}
            lang={t.language[1]}
          >
            {t.language[2]}
          </a>
        </div>
      </section>
    </>
  );
}
