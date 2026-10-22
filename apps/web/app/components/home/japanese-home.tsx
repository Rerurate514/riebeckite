import { applicationCode, contentSource } from "./code-samples";
import CodeWindow from "./code-window";

export default function JapaneseHomePage() {
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
