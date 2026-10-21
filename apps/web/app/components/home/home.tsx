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

function SectionHeading({
  index,
  id,
  children,
}: {
  index: string;
  id: string;
  children: string;
}) {
  return (
    <header class="rb-home__heading">
      <span aria-hidden="true">{index}</span>
      <h2 id={id}>{children}</h2>
    </header>
  );
}

function CodeWindow({ children }: { children: string }) {
  return (
    <pre class="rb-home__code-window">
      <code>{children}</code>
    </pre>
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
          <p class="rb-home__hero-tagline">{copy.hero.tagline}</p>
          <p class="rb-home__lead">{copy.hero.lead}</p>
          <div class="rb-home__actions">
            <HomeAnchor
              class="rb-home__cta rb-home__cta--primary"
              link={copy.primaryCta}
            />
            <HomeAnchor class="rb-home__cta" link={copy.showcaseCta} />
            <HomeAnchor class="rb-home__cta" link={copy.githubCta} />
          </div>
          <CodeWindow>{copy.hero.command}</CodeWindow>
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

      <section class="rb-home__section" aria-labelledby="home-developer">
        <SectionHeading id="home-developer" index="01">
          {copy.developer.heading}
        </SectionHeading>
        <p class="rb-home__intro">{copy.developer.intro}</p>
        <ol class="rb-home__feature-grid">
          {copy.developer.features.map((feature, index) => (
            <li key={feature.title}>
              <span aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              {feature.code ? <CodeWindow>{feature.code}</CodeWindow> : null}
            </li>
          ))}
        </ol>
      </section>

      <section
        class="rb-home__section rb-home__section--ownership"
        aria-labelledby="home-ownership"
      >
        <SectionHeading id="home-ownership" index="02">
          {copy.ownership.heading}
        </SectionHeading>
        <div class="rb-home__ownership-grid">
          <div>
            <p class="rb-home__statement">{copy.ownership.statement}</p>
            <p class="rb-home__intro">{copy.ownership.body}</p>
          </div>
          <CodeWindow>{copy.ownership.code}</CodeWindow>
        </div>
        <ul class="rb-home__principles">
          {copy.ownership.principles.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>

      <section class="rb-home__section" aria-labelledby="home-notes">
        <SectionHeading id="home-notes" index="03">
          {copy.notes.heading}
        </SectionHeading>
        <p class="rb-home__intro">{copy.notes.intro}</p>
        <ol class="rb-home__pipeline">
          {copy.notes.steps.map((step, index) => (
            <li key={step.title}>
              <span class="rb-home__pipeline-no" aria-hidden="true">
                0{index + 1}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        class="rb-home__section rb-home__section--start"
        aria-labelledby="home-start"
      >
        <SectionHeading id="home-start" index="04">
          {copy.start.heading}
        </SectionHeading>
        <div class="rb-home__start-grid">
          <div>
            <p class="rb-home__statement">{copy.start.statement}</p>
            <p class="rb-home__intro">{copy.start.intro}</p>
            <HomeAnchor class="rb-home__text-link" link={copy.start.link} />
          </div>
          <section
            class="rb-home__terminal"
            aria-label={copy.start.terminalLabel}
          >
            <div class="rb-home__terminal-bar">
              <span /> <span /> <span />
            </div>
            <CodeWindow>{copy.start.command}</CodeWindow>
            <p>{copy.start.terminalNote}</p>
          </section>
        </div>
      </section>

      <section class="rb-home__section" aria-labelledby="home-extend">
        <SectionHeading id="home-extend" index="05">
          {copy.extend.heading}
        </SectionHeading>
        <div class="rb-home__extend-grid">
          <div>
            <p class="rb-home__statement">{copy.extend.statement}</p>
            <p class="rb-home__intro">{copy.extend.intro}</p>
            <ul class="rb-home__principles">
              {copy.extend.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <CodeWindow>{copy.extend.code}</CodeWindow>
        </div>
        <div class="rb-home__resource-links">
          <HomeAnchor class="rb-home__text-link" link={copy.extend.link} />
          <HomeAnchor class="rb-home__text-link" link={copy.extend.themeLink} />
        </div>
      </section>

      <section
        class="rb-home__section rb-home__section--frustration"
        aria-labelledby="home-frustration"
      >
        <SectionHeading id="home-frustration" index="06">
          {copy.frustration.heading}
        </SectionHeading>
        <div class="rb-home__frustration-copy">
          <p class="rb-home__statement">{copy.frustration.statement}</p>
          <p>{copy.frustration.body}</p>
        </div>
      </section>

      <section class="rb-home__closing" aria-labelledby="home-closing">
        <SectionHeading id="home-closing" index="07">
          {copy.closing.heading}
        </SectionHeading>
        <p>{copy.closing.body}</p>
        <div class="rb-home__actions">
          <HomeAnchor
            class="rb-home__cta rb-home__cta--primary"
            link={copy.primaryCta}
          />
          <HomeAnchor class="rb-home__cta" link={copy.closing.docs} />
          <HomeAnchor class="rb-home__cta" link={copy.githubCta} />
        </div>
        <a
          class="rb-home__language"
          href={copy.language.href}
          hreflang={copy.language.hreflang}
          lang={copy.language.hreflang}
        >
          {copy.language.label}
        </a>
      </section>
    </div>
  );
}
