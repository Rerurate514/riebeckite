import { getHomeCopy, type HomeLink, type HomeLocale } from "../../lib/home";

const workflow = ["content/", "build", "dist/"] as const;

function HomeAnchor({ link }: { link: HomeLink }) {
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer">
        {link.label}
      </a>
    );
  }

  return <a href={link.href}>{link.label}</a>;
}

function SectionHeading({
  id,
  index,
  children,
}: {
  id: string;
  index: string;
  children: string;
}) {
  return (
    <header class="rb-home__heading">
      <span class="rb-home__heading-no" aria-hidden="true">
        {index}
      </span>
      <h2 id={id}>{children}</h2>
    </header>
  );
}

export default function HomePage({ locale }: { locale: HomeLocale }) {
  const copy = getHomeCopy(locale);

  return (
    <main class="rb-home">
      <section class="rb-home__hero" aria-labelledby="home-title">
        <div class="rb-home__hero-main">
          <p class="rb-home__eyebrow">{copy.eyebrow}</p>
          <h1 id="home-title" class="rb-home__brand">
            <img
              class="rb-home__brand-logo"
              src="/riebeckite-logo-horizontal.png"
              alt="Riebeckite"
              width="1983"
              height="793"
              decoding="async"
            />
          </h1>
          <p class="rb-home__tagline">{copy.tagline}</p>
          <p class="rb-home__lead">{copy.lead}</p>
          <div class="rb-home__actions">
            <a
              class="rb-home__cta rb-home__cta--primary"
              href={copy.primaryCta.href}
            >
              {copy.primaryCta.label}
            </a>
            <a
              class="rb-home__cta rb-home__cta--secondary"
              href={copy.secondaryCta.href}
              target="_blank"
              rel="noreferrer"
            >
              {copy.secondaryCta.label}
            </a>
          </div>
        </div>

        <nav class="rb-home__index" aria-labelledby="home-index-label">
          <p class="rb-home__index-label" id="home-index-label">
            {copy.menuLabel}
          </p>
          <ul>
            {copy.quickLinks.map((link) => (
              <li key={link.href}>
                <HomeAnchor link={link} />
                <span class="rb-home__index-mark" aria-hidden="true">
                  &rarr;
                </span>
              </li>
            ))}
            <li>
              <a
                href={copy.language.href}
                hreflang={copy.language.hreflang}
                lang={copy.language.hreflang}
              >
                {copy.language.label}
              </a>
              <span class="rb-home__index-mark" aria-hidden="true">
                &rarr;
              </span>
            </li>
          </ul>
        </nav>
      </section>

      <section class="rb-home__section" aria-labelledby="home-what">
        <SectionHeading id="home-what" index="01">
          {copy.what.heading}
        </SectionHeading>
        <div class="rb-home__what">
          <div class="rb-home__prose">
            {copy.what.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <ol class="rb-home__flow">
            {workflow.map((step) => (
              <li key={step}>
                <code>{step}</code>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section class="rb-home__section" aria-labelledby="home-why">
        <SectionHeading id="home-why" index="02">
          {copy.why.heading}
        </SectionHeading>
        <p class="rb-home__intro">{copy.why.intro}</p>
        <ol class="rb-home__list">
          {copy.why.features.map((feature, index) => (
            <li key={feature.title}>
              <span class="rb-home__list-no" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section class="rb-home__section" aria-labelledby="home-build">
        <SectionHeading id="home-build" index="03">
          {copy.build.heading}
        </SectionHeading>
        <p class="rb-home__intro">{copy.build.intro}</p>
        <ul class="rb-home__cases">
          {copy.build.useCases.map((useCase) => (
            <li key={useCase.title}>
              <a href={useCase.href}>
                <span class="rb-home__case-title">{useCase.title}</span>
                <span class="rb-home__case-body">{useCase.body}</span>
                <span class="rb-home__case-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section class="rb-home__section" aria-labelledby="home-extend">
        <SectionHeading id="home-extend" index="04">
          {copy.extend.heading}
        </SectionHeading>
        <p class="rb-home__intro">{copy.extend.intro}</p>
        <div class="rb-home__split">
          <div class="rb-home__panel">
            <p class="rb-home__panel-label">Plugin</p>
            <h3>{copy.extend.plugins.heading}</h3>
            <p>{copy.extend.plugins.body}</p>
            <HomeAnchor link={copy.extend.plugins.link} />
          </div>
          <div class="rb-home__panel">
            <p class="rb-home__panel-label">Theme</p>
            <h3>{copy.extend.themes.heading}</h3>
            <p>{copy.extend.themes.body}</p>
            <HomeAnchor link={copy.extend.themes.link} />
          </div>
        </div>
      </section>

      <section class="rb-home__section" aria-labelledby="home-built-with">
        <SectionHeading id="home-built-with" index="05">
          {copy.builtWith.heading}
        </SectionHeading>
        <p class="rb-home__intro">{copy.builtWith.intro}</p>
        <ul class="rb-home__tags">
          {copy.builtWith.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p class="rb-home__more">
          <HomeAnchor link={copy.builtWith.link} />
        </p>
      </section>

      <section class="rb-home__section" aria-labelledby="home-start">
        <SectionHeading id="home-start" index="06">
          {copy.start.heading}
        </SectionHeading>
        <p class="rb-home__intro">{copy.start.intro}</p>
        <ol class="rb-home__steps">
          {copy.start.steps.map((step, index) => (
            <li key={step.title}>
              <span class="rb-home__step-no" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div class="rb-home__step-body">
                <h3>{step.title}</h3>
                {step.command ? (
                  <pre>
                    <code>{step.body}</code>
                  </pre>
                ) : (
                  <p>{step.body}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p class="rb-home__actions">
          <a
            class="rb-home__cta rb-home__cta--primary"
            href={copy.start.cta.href}
          >
            {copy.start.cta.label}
          </a>
        </p>
      </section>

      <section
        class="rb-home__section rb-home__section--explore"
        aria-labelledby="home-explore"
      >
        <SectionHeading id="home-explore" index="07">
          {copy.explore.heading}
        </SectionHeading>
        <ul class="rb-home__links">
          {copy.explore.links.map((link) => (
            <li key={link.href}>
              <HomeAnchor link={link} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
