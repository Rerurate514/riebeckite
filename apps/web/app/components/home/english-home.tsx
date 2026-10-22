import {
  applicationCode,
  contentSource,
  projectStructure,
} from "./code-samples";
import CodeWindow from "./code-window";

export default function EnglishHomePage() {
  return (
    <div class="rb-home">
      <section class="rb-home__hero" aria-labelledby="home-title">
        <div class="rb-home__hero-copy">
          <img
            class="rb-home__logo"
            src="/riebeckite-logo-horizontal.png"
            alt="Riebeckite"
            width="1983"
            height="793"
          />
          <p class="rb-home__eyebrow">Open source · Apache-2.0 · TypeScript</p>
          <h1 id="home-title">Markdown is where your site begins.</h1>
          <p class="rb-home__lead">
            Riebeckite turns Markdown and Obsidian notes into a static website,
            then leaves the routes, components, and styling in your hands.
          </p>
          <div class="rb-home__actions">
            <a
              class="rb-home__cta rb-home__cta--primary"
              href="/docs/getting-started/"
            >
              Start a project
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
            <p>Create a project</p>
            <CodeWindow label="Copy">npx create-riebeckite</CodeWindow>
          </div>
        </div>
        <div class="rb-home__published-example">
          <div class="rb-home__example-bar">
            <span>content/notes/ownership.md</span>
            <span>published</span>
          </div>
          <article class="rb-home__example-page">
            <p class="rb-home__example-kicker">Notes / Architecture</p>
            <p class="rb-home__example-title">
              Ownership is a practical decision.
            </p>
            <p>
              Keep the writing in Markdown. Keep the application in ordinary
              TypeScript files. Change either without giving up the other.
            </p>
            <a href="/docs/guides/writing-content/">Read the source setup →</a>
          </article>
        </div>
      </section>

      <section class="rb-home__statement" aria-labelledby="home-content">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">A site you can keep</p>
          <h2 id="home-content">
            Your notes do not have to own your architecture.
          </h2>
          <p>
            Use <code>content/</code> in the project or point to an external
            Obsidian vault. During the build, published notes become static
            pages; the application remains a normal Hono JSX project.
          </p>
        </div>
        <div class="rb-home__content-example">
          <div>
            <p class="rb-home__label">content/notes/ownership.md</p>
            <CodeWindow label="Copy">{contentSource}</CodeWindow>
          </div>
          <p class="rb-home__content-note">
            Obsidian-flavored Markdown can retain WikiLinks, embeds, callouts,
            properties, and tags when you add the official plugin.
          </p>
        </div>
        <a class="rb-home__text-link" href="/docs/guides/writing-content/">
          Configure content sources
        </a>
      </section>

      <section class="rb-home__section" aria-labelledby="home-application">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">Code that remains yours</p>
          <h2 id="home-application">
            Start with a project, not a closed template.
          </h2>
          <p>
            The generated site has an <code>app/</code> directory, a config
            file, and npm dependencies you control. Add routes and components
            with Hono JSX as you would in another TypeScript application.
          </p>
        </div>
        <div class="rb-home__ownership-example">
          <div>
            <p class="rb-home__label">The generated project</p>
            <CodeWindow label="Copy">{projectStructure}</CodeWindow>
          </div>
          <p>
            Riebeckite is a set of packages, not a project format that absorbs
            your site. Updating it is a dependency change, with the usual care
            required for major versions.
          </p>
        </div>
      </section>

      <section class="rb-home__configuration" aria-labelledby="home-examples">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">Compose only what you need</p>
          <h2 id="home-examples">
            Plugins add capabilities. Themes handle presentation.
          </h2>
          <p>
            Install ordinary npm packages, register them in one configuration,
            and decide where their components belong in your routes.
          </p>
        </div>
        <div class="rb-home__application-example">
          <CodeWindow label="Copy">{applicationCode}</CodeWindow>
          <div class="rb-home__application-copy">
            <p>
              Plugins can contribute Markdown transforms, pages, components,
              CSS, browser-side code, HTTP endpoints, and generated files. A
              theme is a separate value, so its presentation does not decide
              your application structure.
            </p>
            <div class="rb-home__resource-links">
              <a class="rb-home__text-link" href="/docs/plugins/">
                Browse plugins and APIs
              </a>
              <a class="rb-home__text-link" href="/docs/themes/">
                Explore themes
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="rb-home__continue" aria-labelledby="home-continue">
        <h2 id="home-continue">See the implementation before you decide.</h2>
        <p>
          Compare Markdown with real plugin output, inspect the reference, or
          start from the generated project.
        </p>
        <div class="rb-home__resource-links">
          <a class="rb-home__text-link" href="/docs/">
            Documentation
          </a>
          <a class="rb-home__text-link" href="/docs/plugins/showcase">
            View plugin output
          </a>
          <a class="rb-home__language" href="/ja/" hreflang="ja" lang="ja">
            日本語
          </a>
        </div>
      </section>
    </div>
  );
}
