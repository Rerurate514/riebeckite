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

      <section class="rb-home__statement" aria-labelledby="home-content">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">Markdown and Obsidian</p>
          <h2 id="home-content">
            Your notes do not have to own your architecture.
          </h2>
          <p>
            Use <code>content/</code> in the project or point to an external
            Obsidian vault. Published notes become static pages; the application
            remains a normal Hono JSX project.
          </p>
        </div>
        <div class="rb-home__content-example">
          <div>
            <p class="rb-home__label">content/notes/ownership.md</p>
            {runtime && <RuntimeCode html={runtime.codes.content} />}
          </div>
          <p class="rb-home__content-note">
            The official Obsidian plugin supports WikiLinks, embeds, callouts,
            properties, and tags. Frontmatter keeps publication data next to the
            writing.
          </p>
        </div>
        <a class="rb-home__text-link" href="/docs/guides/writing-content/">
          Configure content sources
        </a>
      </section>

      <section class="rb-home__section" aria-labelledby="home-application">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">Application ownership</p>
          <h2 id="home-application">
            Start with a project, not a closed template.
          </h2>
          <p>
            The generated site has an <code>app/</code> directory, a
            configuration file, and dependencies you control. Add pages,
            documentation, navigation, and components with Hono JSX.
          </p>
        </div>
        <div class="rb-home__ownership-example">
          <div>
            <p class="rb-home__label">The generated project</p>
            {runtime && <RuntimeCode html={runtime.codes.project} />}
          </div>
          <p>
            Riebeckite is a set of packages, not a project format that absorbs
            your site. Updating it is a dependency change, with the usual care
            for major versions.
          </p>
        </div>
      </section>

      <section class="rb-home__configuration" aria-labelledby="home-extensions">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">Extension boundaries</p>
          <h2 id="home-extensions">
            Plugins add capabilities. Themes handle presentation.
          </h2>
          <p>
            Install npm packages and register them in one configuration. Decide
            where their components belong in your routes.
          </p>
        </div>
        <div class="rb-home__application-example">
          {runtime && <RuntimeCode html={runtime.codes.application} />}
          <div class="rb-home__application-copy">
            <p>
              Plugins can add Markdown and HTML transforms, renderers,
              standalone pages, browser behavior, endpoints, SEO, and
              diagnostics. A theme supplies tokens and styles without deciding
              application structure.
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

      <section class="rb-home__workflow" aria-labelledby="home-workflow">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">Build and inspect</p>
          <h2 id="home-workflow">
            Build only what changed, then inspect the result.
          </h2>
          <p>
            Successful builds record reusable state and dependency
            relationships. When a linked page or asset changes, related output
            is regenerated; <code>--full</code> bypasses reuse when you need it.
          </p>
        </div>
        <dl class="rb-home__workflow-list">
          <div>
            <dt>Develop</dt>
            <dd>
              <code>riebeckite dev</code> starts the integration workflow.
            </dd>
          </div>
          <div>
            <dt>Validate</dt>
            <dd>
              <code>riebeckite check</code> validates configuration, content,
              plugin options, and capabilities.
            </dd>
          </div>
          <div>
            <dt>Inspect</dt>
            <dd>
              <code>riebeckite inspect</code> displays resolved configuration,
              plugins, content, graph, or build state.
            </dd>
          </div>
        </dl>
      </section>

      <section class="rb-home__preview" aria-labelledby="home-preview">
        <div>
          <p class="rb-home__section-label">Local previews</p>
          <h2 id="home-preview">
            Develop extensions against a real fixture site.
          </h2>
        </div>
        <div class="rb-home__preview-body">
          <p>
            <code>riebeckite theme preview</code> serves Home, Article,
            Documentation, and Components fixtures.{" "}
            <code>riebeckite plugin dev</code> links one local plugin into a
            temporary site with deterministic Markdown.
          </p>
          {runtime && <RuntimeCode html={runtime.codes.preview} />}
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
          <a
            class="rb-home__text-link"
            href="/docs/getting-started/deployment/"
          >
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

[[Getting started]]`;
