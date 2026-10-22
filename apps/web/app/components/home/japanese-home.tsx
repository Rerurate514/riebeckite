import {
  applicationCode,
  contentSource,
  projectStructure,
} from "./code-samples";
import CodeWindow from "./code-window";

export default function JapaneseHomePage() {
  return (
    <div class="rb-home">
      <section class="rb-home__hero" aria-labelledby="home-title">
        <div class="rb-home__hero-copy">
          <p class="rb-home__eyebrow">
            オープンソース · Apache-2.0 · TypeScript
          </p>
          <h1 id="home-title">Markdown から、自分の Web をつくる。</h1>
          <p class="rb-home__lead">
            Riebeckite は Markdown と Obsidian
            のノートを静的サイトに変換し、その先のルート、コンポーネント、見た目は自分で持てるようにする
            TypeScript フレームワークです。
          </p>
          <div class="rb-home__actions">
            <a
              class="rb-home__cta rb-home__cta--primary"
              href="/ja/docs/getting-started/"
            >
              プロジェクトを始める
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
        </div>
        <div class="rb-home__published-example">
          <div class="rb-home__example-bar">
            <span>content/notes/ownership.md</span>
            <span>published</span>
          </div>
          <article class="rb-home__example-page">
            <p class="rb-home__example-kicker">Notes / Architecture</p>
            <p class="rb-home__example-title">
              所有することは、実装上の選択です。
            </p>
            <p>
              書くものは Markdown に残し、アプリケーションは通常の TypeScript
              ファイルで管理する。片方を変えても、もう片方を手放す必要はありません。
            </p>
            <a href="/ja/docs/guides/writing-content/">
              コンテンツの設定を見る →
            </a>
          </article>
        </div>
      </section>

      <section class="rb-home__statement" aria-labelledby="home-content">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">使い続けられるサイト</p>
          <h2 id="home-content">ノートにサイトの構造まで決めさせない。</h2>
          <p>
            プロジェクト内の <code>content/</code> も、外部の Obsidian Vault
            もコンテンツソースにできます。公開対象のノートはビルド時に静的ページになり、アプリケーションは通常の
            Hono JSX プロジェクトとして残ります。
          </p>
        </div>
        <div class="rb-home__content-example">
          <div>
            <p class="rb-home__label">content/notes/ownership.md</p>
            <CodeWindow label="コピー">{contentSource}</CodeWindow>
          </div>
          <p class="rb-home__content-note">
            公式 Plugin
            を追加すると、WikiLink、埋め込み、Callout、プロパティ、タグを含む
            Obsidian 記法も扱えます。
          </p>
        </div>
        <a class="rb-home__text-link" href="/ja/docs/guides/writing-content/">
          コンテンツソースを設定する
        </a>
      </section>

      <section class="rb-home__section" aria-labelledby="home-application">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">コードも自分のもの</p>
          <h2 id="home-application">
            閉じたテンプレートではなく、プロジェクトから始める。
          </h2>
          <p>
            生成されるサイトには <code>app/</code>{" "}
            ディレクトリと設定ファイルがあり、依存関係も自分で管理します。Hono
            JSX を使い、ほかの TypeScript
            アプリケーションと同じようにルートやコンポーネントを書けます。
          </p>
        </div>
        <div class="rb-home__ownership-example">
          <div>
            <p class="rb-home__label">生成されるプロジェクト</p>
            <CodeWindow label="コピー">{projectStructure}</CodeWindow>
          </div>
          <p>
            Riebeckite はサイトを抱え込むプロジェクト形式ではなく、npm
            パッケージの集合です。更新は依存関係の更新として扱えます。メジャーバージョンの更新には、通常どおり注意が必要です。
          </p>
        </div>
      </section>

      <section class="rb-home__configuration" aria-labelledby="home-examples">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">必要なものだけを組み合わせる</p>
          <h2 id="home-examples">Plugin は機能を、Theme は見た目を担う。</h2>
          <p>
            通常の npm
            パッケージを導入して設定に登録し、どのルートでコンポーネントを使うかはサイト側で決めます。
          </p>
        </div>
        <div class="rb-home__application-example">
          <CodeWindow label="コピー">{applicationCode}</CodeWindow>
          <div class="rb-home__application-copy">
            <p>
              Plugin は Markdown
              の変換、ページ、コンポーネント、CSS、ブラウザ側のコード、HTTP
              エンドポイント、生成ファイルを追加できます。Theme
              は別の値として渡すため、見た目がアプリケーションの構造を決めることはありません。
            </p>
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

      <section class="rb-home__continue" aria-labelledby="home-continue">
        <h2 id="home-continue">導入を決める前に、実装を確かめる。</h2>
        <p>
          Markdown と実際の Plugin
          の出力を比べ、リファレンスを確認してから、生成されるプロジェクトを始められます。
        </p>
        <div class="rb-home__resource-links">
          <a class="rb-home__text-link" href="/ja/docs/">
            ドキュメント
          </a>
          <a class="rb-home__text-link" href="/ja/docs/plugins/showcase">
            Plugin の出力を見る
          </a>
          <a class="rb-home__language" href="/" hreflang="en" lang="en">
            English
          </a>
        </div>
      </section>
    </div>
  );
}
