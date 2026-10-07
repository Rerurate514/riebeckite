import { getHomeCopy, type HomeLink, type HomeLocale } from "../../lib/home";

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

export default function HomePage({ locale }: { locale: HomeLocale }) {
  const copy = getHomeCopy(locale);

  return (
    <main class="rb-home">
      <section class="rb-home__hero" aria-labelledby="home-title">
        <p class="rb-home__eyebrow">{copy.eyebrow}</p>
        <h1 id="home-title" class="rb-home__title">
          Riebeckite
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
        <ul class="rb-home__quick">
          {copy.quickLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
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
          </li>
        </ul>
      </section>

      <section class="rb-home__section" aria-labelledby="home-what">
        <h2 id="home-what">{copy.what.heading}</h2>
        {copy.what.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>

      <section class="rb-home__section" aria-labelledby="home-why">
        <h2 id="home-why">{copy.why.heading}</h2>
        <p class="rb-home__section-intro">{copy.why.intro}</p>
        <ul class="rb-home__cards rb-home__cards--features">
          {copy.why.features.map((feature) => (
            <li class="rb-home__card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section class="rb-home__section" aria-labelledby="home-build">
        <h2 id="home-build">{copy.build.heading}</h2>
        <p class="rb-home__section-intro">{copy.build.intro}</p>
        <ul class="rb-home__cards">
          {copy.build.useCases.map((useCase) => (
            <li class="rb-home__card" key={useCase.title}>
              <h3>
                <a href={useCase.href}>{useCase.title}</a>
              </h3>
              <p>{useCase.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section class="rb-home__section" aria-labelledby="home-extend">
        <h2 id="home-extend">{copy.extend.heading}</h2>
        <p class="rb-home__section-intro">{copy.extend.intro}</p>
        <div class="rb-home__split">
          <div class="rb-home__panel">
            <h3>{copy.extend.plugins.heading}</h3>
            <p>{copy.extend.plugins.body}</p>
            <HomeAnchor link={copy.extend.plugins.link} />
          </div>
          <div class="rb-home__panel">
            <h3>{copy.extend.themes.heading}</h3>
            <p>{copy.extend.themes.body}</p>
            <HomeAnchor link={copy.extend.themes.link} />
          </div>
        </div>
      </section>

      <section class="rb-home__section" aria-labelledby="home-built-with">
        <h2 id="home-built-with">{copy.builtWith.heading}</h2>
        <p class="rb-home__section-intro">{copy.builtWith.intro}</p>
        <ul class="rb-home__evidence">
          {copy.builtWith.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p class="rb-home__more">
          <HomeAnchor link={copy.builtWith.link} />
        </p>
      </section>

      <section class="rb-home__section" aria-labelledby="home-start">
        <h2 id="home-start">{copy.start.heading}</h2>
        <p class="rb-home__section-intro">{copy.start.intro}</p>
        <ol class="rb-home__steps">
          {copy.start.steps.map((step) => (
            <li class="rb-home__step" key={step.title}>
              <h3>{step.title}</h3>
              {step.command ? (
                <p>
                  <code>{step.body}</code>
                </p>
              ) : (
                <p>{step.body}</p>
              )}
            </li>
          ))}
        </ol>
        <p>
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
        <h2 id="home-explore">{copy.explore.heading}</h2>
        <ul class="rb-home__quick">
          {copy.explore.links.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
