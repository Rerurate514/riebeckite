import { getHomeCopy, type HomeLink, type HomeLocale } from "../../lib/home";

function HomeAnchor({
  link,
  class: className,
}: {
  link: HomeLink;
  class?: string;
}) {
  return (
    <a
      class={className}
      href={link.href}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noreferrer" : undefined}
    >
      {link.label}
    </a>
  );
}

function SectionHeading({ id, children }: { id: string; children: string }) {
  return <h2 id={id}>{children}</h2>;
}

function CodeWindow({ children, label }: { children: string; label: string }) {
  return (
    <div class="rb-home__code-window">
      <pre>
        <code>{children}</code>
      </pre>
      <button type="button" data-home-copy aria-label={label}>
        {label}
      </button>
    </div>
  );
}

export default function HomePage({ locale }: { locale: HomeLocale }) {
  const copy = getHomeCopy(locale);

  return (
    <div class="rb-home">
      <section class="rb-home__hero" aria-labelledby="home-title">
        <div class="rb-home__hero-copy">
          <p class="rb-home__eyebrow">{copy.eyebrow}</p>
          <h1 id="home-title">{copy.hero.title}</h1>
          <p class="rb-home__lead">{copy.hero.lead}</p>
          <div class="rb-home__actions">
            <HomeAnchor
              class="rb-home__cta rb-home__cta--primary"
              link={copy.primaryCta}
            />
            <HomeAnchor class="rb-home__cta" link={copy.githubCta} />
          </div>
          <CodeWindow label={copy.copyLabel}>{copy.hero.command}</CodeWindow>
        </div>
        <section
          class="rb-home__site-preview"
          aria-label={copy.hero.previewLabel}
        >
          <div class="rb-home__preview-bar">
            <span class="rb-home__preview-mark" aria-hidden="true" />
            <span>my-garden.local</span>
            <span class="rb-home__preview-status">
              {copy.hero.previewStatus}
            </span>
          </div>
          <div class="rb-home__preview-page">
            <p class="rb-home__preview-breadcrumb">
              notes / design / ownership
            </p>
            <p class="rb-home__preview-title">{copy.hero.previewTitle}</p>
            <p>{copy.hero.previewBody}</p>
            <div class="rb-home__preview-links">
              <span>[[architecture]]</span>
              <span>[[ideas]]</span>
            </div>
          </div>
          <div class="rb-home__preview-meta">
            <span>Markdown</span>
            <span>TypeScript</span>
            <span>static output</span>
          </div>
        </section>
      </section>

      <section
        class="rb-home__section rb-home__section--workflow"
        aria-labelledby="home-workflow"
      >
        <div class="rb-home__section-intro">
          <SectionHeading id="home-workflow">
            {copy.workflow.heading}
          </SectionHeading>
          <p>{copy.workflow.intro}</p>
        </div>
        <div class="rb-home__workflow-grid">
          <div class="rb-home__source-note">
            <p class="rb-home__label">{copy.workflow.sourceLabel}</p>
            <CodeWindow label={copy.copyLabel}>
              {copy.workflow.source}
            </CodeWindow>
          </div>
          <div class="rb-home__workflow-copy">
            <p class="rb-home__statement">{copy.workflow.statement}</p>
            <ul class="rb-home__plain-list">
              {copy.workflow.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <HomeAnchor class="rb-home__text-link" link={copy.showcaseCta} />
          </div>
        </div>
      </section>

      <section class="rb-home__section" aria-labelledby="home-development">
        <div class="rb-home__section-intro">
          <SectionHeading id="home-development">
            {copy.development.heading}
          </SectionHeading>
          <p>{copy.development.intro}</p>
        </div>
        <ul class="rb-home__feature-list">
          {copy.development.features.map((feature) => (
            <li key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              <code>{feature.code}</code>
            </li>
          ))}
        </ul>
      </section>

      <section
        class="rb-home__section rb-home__section--extension"
        aria-labelledby="home-extension"
      >
        <div class="rb-home__section-intro">
          <SectionHeading id="home-extension">
            {copy.extension.heading}
          </SectionHeading>
          <p>{copy.extension.intro}</p>
        </div>
        <div class="rb-home__extension-grid">
          <CodeWindow label={copy.copyLabel}>{copy.extension.code}</CodeWindow>
          <div>
            <p class="rb-home__statement">{copy.extension.statement}</p>
            <ul class="rb-home__plain-list">
              {copy.extension.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <div class="rb-home__resource-links">
              <HomeAnchor
                class="rb-home__text-link"
                link={copy.extension.plugins}
              />
              <HomeAnchor
                class="rb-home__text-link"
                link={copy.extension.themes}
              />
            </div>
          </div>
        </div>
      </section>

      <section class="rb-home__start" aria-labelledby="home-start">
        <div>
          <SectionHeading id="home-start">{copy.start.heading}</SectionHeading>
          <p>{copy.start.intro}</p>
          <div class="rb-home__actions">
            <HomeAnchor
              class="rb-home__cta rb-home__cta--primary"
              link={copy.primaryCta}
            />
            <HomeAnchor class="rb-home__cta" link={copy.start.docs} />
          </div>
          <a
            class="rb-home__language"
            href={copy.language.href}
            hreflang={copy.language.hreflang}
            lang={copy.language.hreflang}
          >
            {copy.language.label}
          </a>
        </div>
        <CodeWindow label={copy.copyLabel}>{copy.start.command}</CodeWindow>
      </section>
    </div>
  );
}
