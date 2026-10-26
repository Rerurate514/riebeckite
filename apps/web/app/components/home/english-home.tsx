import type { HomeRuntime } from "../../lib/home-runtime";
import RuntimeCode from "./runtime-code";

export default function EnglishHomePage({
  runtime,
}: {
  runtime?: HomeRuntime;
}) {
  return (
    <div class="rb-home">
      <section class="rb-home__hero" aria-labelledby="home-title">
        <div class="rb-home__hero-copy">
          <a class="rb-home__wordmark" href="/" aria-label="Riebeckite home">
            <img src="/riebeckite-logo.png" alt="" width="28" height="28" />
            <span>Riebeckite</span>
          </a>
          <p class="rb-home__eyebrow">Open source · Apache-2.0 · TypeScript</p>
          <h1 id="home-title">Markdown is where your site begins.</h1>
          <p class="rb-home__lead">
            Build a static site from Markdown or an Obsidian vault, while
            keeping routes, components, and styles in an application you own.
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
            {runtime && <RuntimeCode html={runtime.codes.install} />}
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
              Keep writing in Markdown and the application in ordinary
              TypeScript files. Change either without giving up the other.
            </p>
            <a href="/docs/getting-started/">Read the source setup →</a>
          </article>
        </div>
      </section>

      <section class="rb-home__explore" aria-labelledby="home-explore">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">A framework, not a theme</p>
          <h2 id="home-explore">
            See the pieces of a published site together.
          </h2>
          <p>
            Start from Markdown, then choose the navigation, discovery tools,
            theme, and routes that make the site yours. These are the same
            surfaces available to a generated project.
          </p>
        </div>
        <div class="rb-home__site-preview">
          <div class="rb-home__preview-bar">
            <span>my-notes.example</span>
            <span>preview</span>
          </div>
          <div class="rb-home__preview-layout">
            <nav aria-label="Preview navigation">
              <p>Notebook</p>
              <a href="/docs/getting-started/">Getting started</a>
              <a href="/docs/guides/writing-content">Writing</a>
              <a href="/docs/plugins/showcase">Showcase</a>
            </nav>
            <div class="rb-home__preview-page">
              <p class="rb-home__example-kicker">Architecture / Notes</p>
              <h3>Notes that connect, pages that remain yours.</h3>
              <p>
                Publish linked writing with the site structure and interface you
                need around it.
              </p>
              <div class="rb-home__preview-links">
                <a href="/docs/plugins/">Plugins</a>
                <a href="/themes">Theme previews</a>
                <a href="/docs/guides/discovery-recipes">Discovery</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rb-home__conversion" aria-labelledby="home-conversion">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">Markdown → Web</p>
          <h2 id="home-conversion">Write the note. Publish the page.</h2>
          <p>
            The same Riebeckite pipeline that builds a site parses frontmatter,
            Markdown, and Obsidian WikiLinks here.
          </p>
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

      <section class="rb-home__configuration" aria-labelledby="home-extensions">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">npm packages</p>
          <h2 id="home-extensions">Add the feature your site needs.</h2>
          <p>
            Install a package, register it in the configuration, and decide
            where its components belong in your routes.
          </p>
        </div>
        <div class="rb-home__application-example">
          {runtime && <RuntimeCode html={runtime.codes.application} />}
          <div class="rb-home__application-copy">
            <p>
              This example adds site search. Plugins can also add transforms,
              renderers, standalone pages, browser behavior, endpoints, SEO, and
              diagnostics. Themes supply tokens and styles without deciding the
              application structure.
            </p>
            <div class="rb-home__resource-links">
              <a class="rb-home__text-link" href="/docs/plugins/">
                Browse plugins
              </a>
              <a class="rb-home__text-link" href="/docs/plugins/search">
                Search plugin
              </a>
              <a class="rb-home__text-link" href="/docs/themes/">
                Explore themes
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="rb-home__recipes" aria-labelledby="home-recipes">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">Choose by outcome</p>
          <h2 id="home-recipes">Find a Plugin by what you want to publish.</h2>
          <p>
            Start with a site need rather than a package name. Each guide covers
            setup and the pieces you add to your routes.
          </p>
        </div>
        <div class="rb-home__recipe-links">
          <a href="/docs/plugins/search">
            <strong>Search</strong>
            <span>Help readers find notes.</span>
          </a>
          <a href="/docs/plugins/related-posts">
            <strong>Related posts</strong>
            <span>Connect writing by content.</span>
          </a>
          <a href="/docs/plugins/local-graph">
            <strong>Local graph</strong>
            <span>Show links around a note.</span>
          </a>
          <a href="/docs/plugins/l10n">
            <strong>Localization</strong>
            <span>Publish in more than one language.</span>
          </a>
        </div>
      </section>

      <section class="rb-home__project" aria-labelledby="home-project">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">A project you can read</p>
          <h2 id="home-project">
            Keep content, interface, and settings separate.
          </h2>
          <p>
            Generated projects use ordinary files, so each change has an obvious
            home. Writing stays separate from the interface around it, while one
            configuration file describes the site you are assembling.
          </p>
          <dl class="rb-home__project-parts">
            <div>
              <dt>
                <a href="/docs/getting-started/first-content">Content</a>
              </dt>
              <dd>
                Keep Markdown in <code>content/</code> so notes can grow and
                move without changing the application.
              </dd>
            </div>
            <div>
              <dt>
                <a href="/docs/getting-started/presets">Interface</a>
              </dt>
              <dd>
                Use <code>app/routes/</code> and <code>app/components/</code>{" "}
                for the pages and UI your readers use.
              </dd>
            </div>
            <div>
              <dt>
                <a href="/docs/reference/configuration-reference">Settings</a>
              </dt>
              <dd>
                Choose plugins, themes, and content sources in{" "}
                <code>riebeckite.config.ts</code>.
              </dd>
            </div>
          </dl>
          <a class="rb-home__text-link" href="/docs/getting-started/">
            See the project setup
          </a>
        </div>
        <pre class="rb-home__project-tree">
          <code>{projectTree}</code>
        </pre>
      </section>

      <section class="rb-home__workflow" aria-labelledby="home-workflow">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">From draft to live site</p>
          <h2 id="home-workflow">Keep the publishing path short.</h2>
        </div>
        <ol class="rb-home__workflow-list">
          <li>
            <strong>Create</strong>
            <span>Generate the project.</span>
          </li>
          <li>
            <strong>Write</strong>
            <span>Add Markdown to your content source.</span>
          </li>
          <li>
            <strong>Review</strong>
            <span>Build and inspect the output.</span>
          </li>
          <li>
            <strong>Publish</strong>
            <span>
              Deploy the generated <code>dist/</code>.
            </span>
          </li>
        </ol>
      </section>

      <section class="rb-home__gallery" aria-labelledby="home-gallery">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">Working references</p>
          <h2 id="home-gallery">Open the parts before choosing them.</h2>
          <p>
            Compare official themes, see plugins running together, or read how
            to customize the site around your content.
          </p>
        </div>
        <div class="rb-home__gallery-links">
          <a href="/themes">
            <span>Theme previews</span>
            <b>→</b>
          </a>
          <a href="/docs/plugins/showcase">
            <span>Plugin showcase</span>
            <b>→</b>
          </a>
          <a href="/docs/guides/customizing-your-site">
            <span>Customization guide</span>
            <b>→</b>
          </a>
        </div>
      </section>

      <section class="rb-home__continue" aria-labelledby="home-continue">
        <h2 id="home-continue">Publish the build you reviewed.</h2>
        <p>
          Build output is written to <code>dist/</code>. The deployment guide
          covers local Cloudflare Workers publishing, GitHub Actions, and
          separate content repositories.
        </p>
        <div class="rb-home__resource-links">
          <a
            class="rb-home__cta rb-home__cta--primary"
            href="/docs/getting-started/"
          >
            Getting started
          </a>
          <a class="rb-home__text-link" href="/docs/getting-started/deployment">
            Deployment
          </a>
          <a class="rb-home__text-link" href="/docs/">
            Documentation
          </a>
          <a class="rb-home__language" href="/ja/" hreflang="ja" lang="ja">
            日本語
          </a>
        </div>
      </section>
    </div>
  );
}

const demoSource = `---
title: Hello
---

## Hello

My **first** note.

[Getting started](/docs/getting-started)`;

const projectTree = `app/
  routes/
  components/
content/
riebeckite.config.ts`;
