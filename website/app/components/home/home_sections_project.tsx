import type { HomeLocale } from "../../lib/home";
import type { HomeContent } from "./home_content.js";

const projectTree = `app/
  routes/
  components/
content/
riebeckite.config.ts`;

export function HomeProjectSection({
  locale,
  t,
  href,
}: {
  locale: HomeLocale;
  t: HomeContent;
  href: (path: string) => string;
}) {
  return (
    <section class="rb-home__project" aria-labelledby="home-project">
      <div class="rb-home__section-intro">
        <p class="rb-home__section-label">{t.project[0]}</p>
        <h2 id="home-project">{t.project[1]}</h2>
        <p>{t.project[2]}</p>
        <dl class="rb-home__project-parts">
          <div>
            <dt>
              <a href={href("/docs/getting-started/first-content")}>
                {t.project[3]}
              </a>
            </dt>
            <dd>
              {t.project[4]} <code>content/</code> {t.project[5]}
            </dd>
          </div>
          <div>
            <dt>
              <a href={href("/docs/getting-started/presets")}>{t.project[6]}</a>
            </dt>
            <dd>
              {locale === "ja" ? (
                <>
                  <code>app/routes/</code> と <code>app/components/</code>{" "}
                  {t.project[7]}
                </>
              ) : (
                <>
                  Use <code>app/routes/</code> and <code>app/components/</code>{" "}
                  {t.project[7]}
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <a href={href("/docs/reference/configuration-reference")}>
                {t.project[8]}
              </a>
            </dt>
            <dd>
              {t.project[9]} <code>riebeckite.config.ts</code>
              {locale === "ja" ? "。" : "."}
            </dd>
          </div>
        </dl>
        <a class="rb-home__text-link" href={href("/docs/getting-started/")}>
          {locale === "ja"
            ? "プロジェクトの設定を見る"
            : "See the project setup"}
        </a>
      </div>
      <pre class="rb-home__project-tree">
        <code>{projectTree}</code>
      </pre>
    </section>
  );
}
