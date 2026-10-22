import type { HomeLocale } from "../../lib/home";

const contentSource = `---
publish: true
title: Ownership
---

A site should remain understandable after its framework changes.

See also: [[architecture]]`;

const applicationCode = `import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  plugins: [obsidianMarkdown()],
});`;

function CodeWindow({ children, label }: { children: string; label: string }) {
  return (
    <div class="rb-home__code-window">
      <pre data-rb-ux-copy="true">
        <code>{children}</code>
      </pre>
      <button type="button" data-home-copy aria-label={label}>
        {label}
      </button>
    </div>
  );
}

function EnglishHomePage() {
  return (
    <div class="rb-home">
      <section class="rb-home__hero" aria-labelledby="home-title">
        <p class="rb-home__eyebrow">Open source · Apache-2.0 · TypeScript</p>
        <h1 id="home-title">Build a static site from Markdown and Obsidian.</h1>
        <p class="rb-home__lead">
          Riebeckite is a TypeScript framework for turning notes into a website.
          Start with Markdown, then write the routes, components, plugins, and
          theme your site needs.
        </p>
        <div class="rb-home__actions">
          <a
            class="rb-home__cta rb-home__cta--primary"
            href="/docs/getting-started/"
          >
            Read the docs
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
      </section>

      <section class="rb-home__section" aria-labelledby="home-content">
        <div class="rb-home__section-intro">
          <h2 id="home-content">Keep content in the form you write.</h2>
          <p>
            Use content/ in the project or point the site at an external
            Obsidian vault. Public notes become static pages during the build.
          </p>
        </div>
        <div class="rb-home__content-example">
          <div>
            <p class="rb-home__label">content/notes/ownership.md</p>
            <CodeWindow label="Copy">{contentSource}</CodeWindow>
          </div>
          <ol class="rb-home__steps">
            <li>
              <strong>Write</strong>
              <span>
                Keep notes in Markdown, including Obsidian syntax when you use
                the official plugin.
              </span>
            </li>
            <li>
              <strong>Configure</strong>
              <span>
                Choose the content directory, plugins, theme, and routes in the
                generated TypeScript site.
              </span>
            </li>
            <li>
              <strong>Build</strong>
              <span>
                Riebeckite writes the published site to dist/ for the host you
                choose.
              </span>
            </li>
          </ol>
        </div>
        <a class="rb-home__text-link" href="/docs/guides/writing-content/">
          Configure content sources
        </a>
      </section>

      <section class="rb-home__section" aria-labelledby="home-application">
        <div class="rb-home__section-intro">
          <h2 id="home-application">Extend the generated application.</h2>
          <p>
            A generated site is a Hono JSX and TypeScript application. Plugins
            provide focused capabilities; the application decides how to use
            them.
          </p>
        </div>
        <div class="rb-home__application-example">
          <CodeWindow label="Copy">{applicationCode}</CodeWindow>
          <div class="rb-home__application-copy">
            <p>
              Add a plugin in the site configuration, compose its components in
              your routes, and keep presentation in a theme. Each responsibility
              stays in the package that owns it.
            </p>
            <ul>
              <li>Use Hono JSX for site routes and components</li>
              <li>Transform Markdown or generate pages with plugins</li>
              <li>Install themes and plugins through the package manager</li>
            </ul>
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

      <section class="rb-home__section" aria-labelledby="home-examples">
        <div class="rb-home__section-intro">
          <h2 id="home-examples">Inspect the parts before adding them.</h2>
          <p>
            The documentation includes working examples rather than a simulated
            product preview.
          </p>
        </div>
        <ul class="rb-home__resource-list">
          <li>
            <a href="/playground">Open Playground</a>
            <p>
              Edit a plugin fixture and inspect the rendered result in the
              browser.
            </p>
          </li>
          <li>
            <a href="/docs/plugins/showcase">View Plugin Showcase</a>
            <p>
              Compare Markdown source with the output of the available plugins.
            </p>
          </li>
          <li>
            <a href="/themes">Browse Theme Gallery</a>
            <p>Preview the themes that are published with the framework.</p>
          </li>
        </ul>
      </section>

      <section class="rb-home__continue" aria-labelledby="home-continue">
        <h2 id="home-continue">Continue with the documentation.</h2>
        <p>
          Set up a project, choose a preset, or read the API reference from the
          documentation.
        </p>
        <div class="rb-home__resource-links">
          <a class="rb-home__text-link" href="/docs/">
            Documentation
          </a>
          <a class="rb-home__text-link" href="/docs/plugins/showcase">
            Plugin showcase
          </a>
          <a class="rb-home__language" href="/ja/" hreflang="ja" lang="ja">
            日本語
          </a>
        </div>
      </section>
    </div>
  );
}

function JapaneseHomePage() {
  return (
    <div class="rb-home">
      <section class="rb-home__hero" aria-labelledby="home-title">
        <p class="rb-home__eyebrow">オープンソース · Apache-2.0 · TypeScript</p>
        <h1 id="home-title">Markdown と Obsidian から静的サイトをつくる。</h1>
        <p class="rb-home__lead">
          Riebeckite は、ノートから Web サイトを構築する TypeScript
          フレームワークです。Markdown
          を起点に、必要なルート、コンポーネント、Plugin、Theme を実装できます。
        </p>
        <div class="rb-home__actions">
          <a
            class="rb-home__cta rb-home__cta--primary"
            href="/ja/docs/getting-started/"
          >
            ドキュメントを読む
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
          <p>プロジェクトを作成する</p>
          <CodeWindow label="コピー">npx create-riebeckite</CodeWindow>
        </div>
      </section>

      <section class="rb-home__section" aria-labelledby="home-content">
        <div class="rb-home__section-intro">
          <h2 id="home-content">普段書いている形式でコンテンツを管理する。</h2>
          <p>
            プロジェクト内の content/、または外部の Obsidian Vault
            をコンテンツソースにできます。公開対象のノートはビルド時に静的ページになります。
          </p>
        </div>
        <div class="rb-home__content-example">
          <div>
            <p class="rb-home__label">content/notes/ownership.md</p>
            <CodeWindow label="コピー">{contentSource}</CodeWindow>
          </div>
          <ol class="rb-home__steps">
            <li>
              <strong>書く</strong>
              <span>
                Markdown でノートを管理し、公式 Plugin を使う場合は Obsidian
                記法もそのまま使えます。
              </span>
            </li>
            <li>
              <strong>設定する</strong>
              <span>
                コンテンツの場所、Plugin、Theme、ルートを生成された TypeScript
                サイトで選びます。
              </span>
            </li>
            <li>
              <strong>ビルドする</strong>
              <span>
                Riebeckite は公開用の静的ファイルを dist/ に出力します。
              </span>
            </li>
          </ol>
        </div>
        <a class="rb-home__text-link" href="/ja/docs/guides/writing-content/">
          コンテンツソースを設定する
        </a>
      </section>

      <section class="rb-home__section" aria-labelledby="home-application">
        <div class="rb-home__section-intro">
          <h2 id="home-application">生成されたアプリケーションを拡張する。</h2>
          <p>
            生成されるサイトは Hono JSX と TypeScript
            のアプリケーションです。Plugin
            は機能を提供し、アプリケーション側で使い方を決めます。
          </p>
        </div>
        <div class="rb-home__application-example">
          <CodeWindow label="コピー">{applicationCode}</CodeWindow>
          <div class="rb-home__application-copy">
            <p>
              サイト設定に Plugin
              を追加し、ルート内でコンポーネントを組み合わせ、見た目は Theme
              で管理します。それぞれの責務をパッケージごとに分けたまま拡張できます。
            </p>
            <ul>
              <li>Hono JSX でサイトのルートとコンポーネントを書く</li>
              <li>Plugin で Markdown を変換したりページを生成したりする</li>
              <li>パッケージマネージャーで Theme と Plugin を導入する</li>
            </ul>
            <div class="rb-home__resource-links">
              <a class="rb-home__text-link" href="/ja/docs/plugins/">
                Plugin と API を見る
              </a>
              <a class="rb-home__text-link" href="/ja/docs/themes/">
                Theme を見る
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="rb-home__section" aria-labelledby="home-examples">
        <div class="rb-home__section-intro">
          <h2 id="home-examples">導入前に実際の動作を確認する。</h2>
          <p>
            シミュレーションではなく、公開済みの機能とドキュメントの実例を確認できます。
          </p>
        </div>
        <ul class="rb-home__resource-list">
          <li>
            <a href="/playground">Playground を開く</a>
            <p>Plugin のフィクスチャを編集し、ブラウザで出力を確認できます。</p>
          </li>
          <li>
            <a href="/ja/docs/plugins/showcase">Plugin Showcase を見る</a>
            <p>Markdown のソースと各 Plugin の出力を比較できます。</p>
          </li>
          <li>
            <a href="/themes">Theme Gallery を見る</a>
            <p>フレームワークとともに公開されている Theme を試せます。</p>
          </li>
        </ul>
      </section>

      <section class="rb-home__continue" aria-labelledby="home-continue">
        <h2 id="home-continue">次はドキュメントへ。</h2>
        <p>
          プロジェクトの作成、Preset の選択、API
          リファレンスはドキュメントで確認できます。
        </p>
        <div class="rb-home__resource-links">
          <a class="rb-home__text-link" href="/ja/docs/">
            ドキュメント
          </a>
          <a class="rb-home__text-link" href="/ja/docs/plugins/showcase">
            Plugin Showcase
          </a>
          <a class="rb-home__language" href="/" hreflang="en" lang="en">
            English
          </a>
        </div>
      </section>
    </div>
  );
}

export default function HomePage({ locale }: { locale: HomeLocale }) {
  return locale === "ja" ? <JapaneseHomePage /> : <EnglishHomePage />;
}
