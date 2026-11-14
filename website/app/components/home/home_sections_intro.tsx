import type { HomeRuntime } from "../../lib/home-runtime";
import { demoSource, type HomeContent } from "./home_content.js";
import RuntimeCode from "./runtime-code";

export function HomeIntroSection({
  t,
  href,
  runtime,
}: {
  t: HomeContent;
  href: (path: string) => string;
  runtime?: HomeRuntime;
}) {
  return (
    <>
      <section class="rb-home__hero" aria-labelledby="home-title">
        <div class="rb-home__hero-copy">
          <a
            class="rb-home__wordmark"
            href={`${t.prefix}/`}
            aria-label={t.wordmarkLabel}
          >
            <img src="/riebeckite-logo.png" alt="" width="28" height="28" />
            <span>Riebeckite</span>
          </a>
          <p class="rb-home__eyebrow">{t.eyebrow}</p>
          <h1 id="home-title">{t.title}</h1>
          <p class="rb-home__lead">{t.lead}</p>
          <div class="rb-home__actions">
            <a
              class="rb-home__cta rb-home__cta--primary"
              href={href("/docs/getting-started/")}
            >
              {t.start}
            </a>
            <a
              class="rb-home__cta"
              href="https://github.com/Rerurate514/riebeckite"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
          <div class="rb-home__install">
            <p>{t.create}</p>
            {runtime && <RuntimeCode html={runtime.codes.install} />}
          </div>
        </div>
        <div class="rb-home__published-example">
          <div class="rb-home__example-bar">
            <span>content/guides/development-setup.md</span>
            <span>published</span>
          </div>
          <article class="rb-home__example-page">
            <p class="rb-home__example-kicker">{t.exampleKicker}</p>
            <p class="rb-home__example-title">{t.exampleTitle}</p>
            <p>{t.exampleCopy}</p>
            <a href={href("/docs/getting-started/")}>{t.exampleLink}</a>
          </article>
        </div>
      </section>
      <section class="rb-home__explore" aria-labelledby="home-explore">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">{t.explore[0]}</p>
          <h2 id="home-explore">{t.explore[1]}</h2>
          <p>{t.explore[2]}</p>
        </div>
        <div class="rb-home__site-preview">
          <div class="rb-home__preview-bar">
            <span>team-handbook.example</span>
            <span>preview</span>
          </div>
          <div class="rb-home__preview-layout">
            <nav aria-label={t.previewNav}>
              <p>Team Handbook</p>
              <a href={href("/docs/getting-started/")}>{t.previewLinks[0]}</a>
              <a href={href("/docs/guides/writing-content")}>
                {t.previewLinks[1]}
              </a>
              <a href={href("/docs/plugins/showcase")}>{t.previewLinks[2]}</a>
            </nav>
            <div class="rb-home__preview-page">
              <p class="rb-home__example-kicker">{t.previewKicker}</p>
              <h3>{t.previewTitle}</h3>
              <p>{t.previewCopy}</p>
              <div class="rb-home__preview-links">
                <a href={href("/docs/plugins/")}>Changelog</a>
                <a href={href("/themes")}>Rollback</a>
                <a href={href("/docs/guides/discovery-recipes")}>
                  Incident response
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="rb-home__conversion" aria-labelledby="home-conversion">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">{t.conversion[0]}</p>
          <h2 id="home-conversion">{t.conversion[1]}</h2>
          <p>{t.conversion[2]}</p>
        </div>
        <div class="rb-home__conversion-flow">
          <div class="rb-home__conversion-source">
            <p class="rb-home__label">Markdown source</p>
            <pre>
              <code>{demoSource}</code>
            </pre>
          </div>
          <p class="rb-home__conversion-arrow" aria-hidden="true">
            →
          </p>
          <div class="rb-home__conversion-output">
            <p class="rb-home__label">Published page</p>
            {runtime && (
              <article
                class="rb-home__rendered rb-article-content"
                dangerouslySetInnerHTML={{ __html: runtime.demoHtml }}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
