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
        <h2 id="home-project">{t.project.title}</h2>
        <p>{t.project.description}</p>
        <dl class="rb-home__project-parts">
          <div>
            <dt>
              <a href={href("/docs/getting-started/first-content")}>
                {t.project.contentTitle}
              </a>
            </dt>
            <dd>
              {t.project.contentBefore} <code>content/</code>{" "}
              {t.project.contentAfter}
            </dd>
          </div>
          <div>
            <dt>
              <a href={href("/docs/getting-started/presets")}>
                {t.project.interfaceTitle}
              </a>
            </dt>
            <dd>
              {locale === "ja" ? (
                <>
                  <code>app/routes/</code> と <code>app/components/</code>{" "}
                  {t.project.interfaceDescription}
                </>
              ) : (
                <>
                  Use <code>app/routes/</code> and <code>app/components/</code>{" "}
                  {t.project.interfaceDescription}
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <a href={href("/docs/reference/configuration-reference")}>
                {t.project.settingsTitle}
              </a>
            </dt>
            <dd>
              {t.project.settingsBefore} <code>riebeckite.config.ts</code>
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
