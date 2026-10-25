import { createRoute } from "honox/factory";
import { buildWebsiteSeo } from "../lib/seo";
import { showcaseFixtures, showcaseThemes } from "../lib/theme-showcase";

const serializedFixtures = JSON.stringify(
  Object.fromEntries(
    showcaseFixtures.map((fixture) => [fixture.id, fixture.markdown]),
  ),
);
const serializedPages = JSON.stringify(
  Object.fromEntries(
    showcaseFixtures
      .filter((fixture) => fixture.pages)
      .map((fixture) => [
        fixture.id,
        { currentPageId: fixture.currentPageId, pages: fixture.pages },
      ]),
  ),
);

export default createRoute(async (c) => {
  c.set(
    "seo",
    buildWebsiteSeo({
      title: "Theme showcase",
      description:
        "Try every official Riebeckite theme with the same rendered Markdown.",
      path: "/themes",
    }),
  );
  c.set("headTags", []);

  return c.render(
    <div class="theme-showcase" data-theme-showcase>
      <header class="theme-showcase__header">
        <p class="theme-showcase__eyebrow">Riebeckite themes</p>
        <h1>Find the right reading surface.</h1>
        <p>
          Compare every official theme with real Markdown rendering. Change the
          content, color mode, and viewport without leaving this page.
        </p>
      </header>

      <section class="theme-showcase__preview" aria-labelledby="preview-title">
        <div class="theme-showcase__section-heading">
          <div>
            <p class="theme-showcase__eyebrow">Interactive preview</p>
            <h2 id="preview-title">Try a theme</h2>
          </div>
        </div>
        <div
          class="theme-showcase__workspace"
          data-plugin-preview
          data-preview-plugin="theme-showcase"
          data-preview-fixtures={serializedFixtures}
          data-preview-pages={serializedPages}
        >
          <output data-preview-status aria-live="polite">
            Preparing preview
          </output>
          <div class="theme-showcase__controls">
            <label>
              Theme
              <select data-preview-theme>
                {showcaseThemes.map((theme) => (
                  <option value={theme.name} key={theme.name}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Color mode
              <select data-preview-mode>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system" selected>
                  System
                </option>
              </select>
            </label>
            <label>
              Sample
              <select data-preview-fixture>
                {showcaseFixtures.map((fixture) => (
                  <option value={fixture.id} key={fixture.id}>
                    {fixture.title}
                  </option>
                ))}
              </select>
            </label>
            <label hidden>
              Page
              <select data-preview-page />
            </label>
            <fieldset class="theme-showcase__devices">
              <legend>Viewport</legend>
              <button
                type="button"
                data-preview-device="desktop"
                aria-pressed="true"
              >
                Desktop
              </button>
              <button
                type="button"
                data-preview-device="tablet"
                aria-pressed="false"
              >
                Tablet
              </button>
              <button
                type="button"
                data-preview-device="mobile"
                aria-pressed="false"
              >
                Mobile
              </button>
            </fieldset>
            <button type="button" data-preview-reset>
              Reset preview
            </button>
          </div>
          <textarea data-preview-markdown hidden>
            {showcaseFixtures[0].markdown}
          </textarea>
          <div
            class="theme-showcase__frame-wrap"
            data-preview-viewport="desktop"
          >
            <iframe data-preview-frame title="Theme preview" sandbox="" />
          </div>
          <ul
            class="theme-showcase__diagnostics"
            data-preview-diagnostics
            aria-live="polite"
          />
        </div>
      </section>

      <section class="theme-showcase__detail" aria-labelledby="detail-title">
        <p class="theme-showcase__eyebrow">Selected theme</p>
        <h2 id="detail-title" data-theme-detail-name>
          Default
        </h2>
        <p data-theme-detail-description />
        <div class="theme-showcase__detail-meta">
          <code data-theme-detail-package />
          <a data-theme-detail-docs href="/themes/default">
            Theme documentation
          </a>
        </div>
        <pre>
          <code data-theme-detail-code />
        </pre>
        <button type="button" data-theme-copy>
          Copy configuration
        </button>
      </section>

      <section class="theme-showcase__gallery" aria-labelledby="gallery-title">
        <div class="theme-showcase__section-heading">
          <div>
            <p class="theme-showcase__eyebrow">Official collection</p>
            <h2 id="gallery-title">Choose by purpose</h2>
          </div>
          <p>{showcaseThemes.length} official themes</p>
        </div>
        <div class="theme-showcase__theme-list">
          {showcaseThemes.map((theme) => (
            <article
              class="theme-showcase__theme"
              key={theme.name}
              data-theme-card={theme.name}
            >
              <div>
                <h3>{theme.label}</h3>
                <p>{theme.description}</p>
              </div>
              <ul>
                {theme.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div class="theme-showcase__theme-actions">
                <button type="button" data-theme-select={theme.name}>
                  Open preview
                </button>
                <a
                  href={`/themes/${theme.name === "riebeckite" ? "default" : theme.name}`}
                >
                  Docs
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>,
  );
});
