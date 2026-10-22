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
    <div class="rb-home__code-window rr-code">
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
        <div class="rb-home__install">
          <p>{copy.hero.commandLabel}</p>
          <CodeWindow label={copy.copyLabel}>{copy.hero.command}</CodeWindow>
        </div>
      </section>

      <section class="rb-home__section" aria-labelledby="home-content">
        <div class="rb-home__section-intro">
          <SectionHeading id="home-content">
            {copy.content.heading}
          </SectionHeading>
          <p>{copy.content.intro}</p>
        </div>
        <div class="rb-home__content-example">
          <div>
            <p class="rb-home__label">{copy.content.sourceLabel}</p>
            <CodeWindow label={copy.copyLabel}>
              {copy.content.source}
            </CodeWindow>
          </div>
          <ol class="rb-home__steps">
            {copy.content.steps.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <span>{step.body}</span>
              </li>
            ))}
          </ol>
        </div>
        <HomeAnchor class="rb-home__text-link" link={copy.content.docs} />
      </section>

      <section class="rb-home__section" aria-labelledby="home-application">
        <div class="rb-home__section-intro">
          <SectionHeading id="home-application">
            {copy.application.heading}
          </SectionHeading>
          <p>{copy.application.intro}</p>
        </div>
        <div class="rb-home__application-example">
          <CodeWindow label={copy.copyLabel}>
            {copy.application.code}
          </CodeWindow>
          <div class="rb-home__application-copy">
            <p>{copy.application.body}</p>
            <ul>
              {copy.application.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <div class="rb-home__resource-links">
              <HomeAnchor
                class="rb-home__text-link"
                link={copy.application.plugins}
              />
              <HomeAnchor
                class="rb-home__text-link"
                link={copy.application.themes}
              />
            </div>
          </div>
        </div>
      </section>

      <section class="rb-home__section" aria-labelledby="home-examples">
        <div class="rb-home__section-intro">
          <SectionHeading id="home-examples">
            {copy.examples.heading}
          </SectionHeading>
          <p>{copy.examples.intro}</p>
        </div>
        <ul class="rb-home__resource-list">
          {copy.examples.resources.map((resource) => (
            <li key={resource.link.href}>
              <HomeAnchor link={resource.link} />
              <p>{resource.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section class="rb-home__continue" aria-labelledby="home-continue">
        <SectionHeading id="home-continue">
          {copy.continue.heading}
        </SectionHeading>
        <p>{copy.continue.intro}</p>
        <div class="rb-home__resource-links">
          <HomeAnchor class="rb-home__text-link" link={copy.continue.docs} />
          <HomeAnchor class="rb-home__text-link" link={copy.showcaseCta} />
          <a
            class="rb-home__language"
            href={copy.language.href}
            hreflang={copy.language.hreflang}
            lang={copy.language.hreflang}
          >
            {copy.language.label}
          </a>
        </div>
      </section>
    </div>
  );
}
