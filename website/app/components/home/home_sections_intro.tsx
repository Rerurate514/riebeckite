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
            >
              GitHub
            </a>
            <a
              class="rb-home__cta"
              href={t.language.href}
              hreflang={t.language.lang}
              lang={t.language.lang}
            >
              {t.language.label}
            </a>
          </div>
        </div>
        <div class="rb-home__hero-aside">
          <p class="rb-home__brand">
            <span class="rb-home__brand-mark">
              <img
                src="/riebeckite-logo.png"
                alt=""
                width="1230"
                height="1278"
                fetchpriority="high"
              />
              <span>Riebeckite</span>
            </span>
          </p>
          <div class="rb-home__install">
            <p>{t.create}</p>
            {runtime && <RuntimeCode html={runtime.codes.install} />}
          </div>
        </div>
      </section>
      <section class="rb-home__conversion" aria-labelledby="home-conversion">
        <div class="rb-home__section-intro">
          <h2 id="home-conversion">{t.conversion.title}</h2>
          <p>{t.conversion.description}</p>
        </div>
        <div class="rb-home__conversion-flow">
          <div class="rb-home__conversion-source">
            <p class="rb-home__label">{t.conversion.sourceLabel}</p>
            <pre>
              <code>{demoSource}</code>
            </pre>
          </div>
          <p class="rb-home__conversion-arrow" aria-hidden="true">
            →
          </p>
          <div class="rb-home__conversion-output">
            <p class="rb-home__label">{t.conversion.outputLabel}</p>
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
