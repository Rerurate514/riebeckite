import type { HomeRuntime } from "../../lib/home-runtime";
import RuntimeCode from "./runtime-code";

export default function JapaneseHomePage({
  runtime,
}: {
  runtime?: HomeRuntime;
}) {
  return (
    <div class="rb-home">
      <section class="rb-home__hero" aria-labelledby="home-title">
        <div class="rb-home__hero-copy">
          <a
            class="rb-home__wordmark"
            href="/ja/"
            aria-label="Riebeckite ホーム"
          >
            <img src="/riebeckite-logo.png" alt="" width="28" height="28" />
            <span>Riebeckite</span>
          </a>
          <p class="rb-home__eyebrow">
            オープンソース · Apache-2.0 · TypeScript
          </p>
          <h1 id="home-title">Markdown から、自分の Web をつくる。</h1>
          <p class="rb-home__lead">
            Riebeckite は Markdown と Obsidian
            のノートを静的サイトに変換し、ルート、コンポーネント、見た目は自分で管理できる
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
              書く場所と、サイトのつくり方を分けて管理する。
            </p>
            <p>
              書くものは Markdown に残し、アプリケーションは通常の TypeScript
              ファイルで管理する。片方を変えても、もう片方を手放す必要はありません。
            </p>
            <a href="/ja/docs/getting-started/">コンテンツの設定を見る →</a>
          </article>
        </div>
      </section>

      <section class="rb-home__explore" aria-labelledby="home-explore">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">Theme だけではないフレームワーク</p>
          <h2 id="home-explore">
            公開するサイト全体を、ひとつずつ組み立てる。
          </h2>
          <p>
            Markdown
            を起点に、ナビゲーション、見つけやすさ、Theme、ルートまでを選べます。ここにある要素は、生成したプロジェクトでもそのまま使えます。
          </p>
        </div>
        <div class="rb-home__site-preview">
          <div class="rb-home__preview-bar">
            <span>my-notes.example</span>
            <span>preview</span>
          </div>
          <div class="rb-home__preview-layout">
            <nav aria-label="プレビューのナビゲーション">
              <p>Notebook</p>
              <a href="/ja/docs/getting-started/">はじめる</a>
              <a href="/ja/docs/guides/writing-content/">書く</a>
              <a href="/ja/docs/plugins/showcase/">動作例</a>
            </nav>
            <div class="rb-home__preview-page">
              <p class="rb-home__example-kicker">Architecture / Notes</p>
              <h3>ノートをつなぎ、サイトは自分のものとして残す。</h3>
              <p>
                リンクされた文章を公開しながら、その周りのサイト構造と UI
                は必要な形に保てます。
              </p>
              <div class="rb-home__preview-links">
                <a href="/ja/docs/plugins/">Plugin</a>
                <a href="/ja/themes/">Theme プレビュー</a>
                <a href="/ja/docs/guides/discovery-recipes/">
                  見つけやすくする
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rb-home__conversion" aria-labelledby="home-conversion">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">Markdown → Web</p>
          <h2 id="home-conversion">ノートを書き、そのままページにする。</h2>
          <p>
            この表示にも、サイトをビルドするときと同じ Riebeckite Pipeline
            を使っています。Frontmatter、Markdown、Obsidian WikiLink
            を処理します。
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
          <p class="rb-home__section-label">npm パッケージ</p>
          <h2 id="home-extensions">サイトに必要な機能を、npm で足す。</h2>
          <p>
            パッケージを導入して設定に登録し、コンポーネントをどのルートで使うかはサイト側で決めます。
          </p>
        </div>
        <div class="rb-home__application-example">
          {runtime && <RuntimeCode html={runtime.codes.application} />}
          <div class="rb-home__application-copy">
            <p>
              この例ではサイト内検索を追加します。Plugin
              では変換、レンダラー、単独ページ、ブラウザ側の動作、エンドポイント、SEO、診断も追加できます。Theme
              はトークンとスタイルを提供し、アプリケーションの構造は決めません。
            </p>
            <div class="rb-home__resource-links">
              <a class="rb-home__text-link" href="/ja/docs/plugins/">
                Plugin を探す
              </a>
              <a class="rb-home__text-link" href="/ja/docs/plugins/search/">
                検索 Plugin
              </a>
              <a class="rb-home__text-link" href="/ja/docs/themes/">
                Theme を見る
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="rb-home__recipes" aria-labelledby="home-recipes">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">目的から選ぶ</p>
          <h2 id="home-recipes">追加したい機能から Plugin を探す。</h2>
          <p>
            パッケージ名ではなく、サイトで実現したいことから始められます。各ガイドでは設定とルートへの組み込み方を案内します。
          </p>
        </div>
        <div class="rb-home__recipe-links">
          <a href="/ja/docs/plugins/search/">
            <strong>検索</strong>
            <span>ノートを見つけやすくする。</span>
          </a>
          <a href="/ja/docs/plugins/related-posts/">
            <strong>関連記事</strong>
            <span>内容で文章をつなげる。</span>
          </a>
          <a href="/ja/docs/plugins/local-graph/">
            <strong>ローカルグラフ</strong>
            <span>ノートの周辺にあるリンクを表示する。</span>
          </a>
          <a href="/ja/docs/plugins/l10n/">
            <strong>多言語化</strong>
            <span>複数の言語で公開する。</span>
          </a>
        </div>
      </section>

      <section class="rb-home__project" aria-labelledby="home-project">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">読めるプロジェクト</p>
          <h2 id="home-project">コンテンツ、UI、設定を分けて置く。</h2>
          <p>
            生成されるのは通常のファイルです。別のプロジェクト形式を覚えなくても、ルートやコンポーネントを編集し、コンテンツを移動できます。
          </p>
          <a class="rb-home__text-link" href="/ja/docs/getting-started/">
            プロジェクトの設定を見る
          </a>
        </div>
        <pre class="rb-home__project-tree">
          <code>{projectTree}</code>
        </pre>
      </section>

      <section class="rb-home__workflow" aria-labelledby="home-workflow">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">下書きから公開まで</p>
          <h2 id="home-workflow">公開までの流れを、短く保つ。</h2>
        </div>
        <ol class="rb-home__workflow-list">
          <li>
            <strong>1. 作成</strong>
            <span>プロジェクトを生成する。</span>
          </li>
          <li>
            <strong>2. 書く</strong>
            <span>コンテンツソースに Markdown を追加する。</span>
          </li>
          <li>
            <strong>3. 確認</strong>
            <span>ビルドして出力を確認する。</span>
          </li>
          <li>
            <strong>4. 公開</strong>
            <span>
              生成された <code>dist/</code> をデプロイする。
            </span>
          </li>
        </ol>
      </section>

      <section class="rb-home__gallery" aria-labelledby="home-gallery">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">動くものを見る</p>
          <h2 id="home-gallery">選ぶ前に、実際の表示を確かめる。</h2>
          <p>
            公式Themeを比べ、Pluginが一緒に動く様子を見て、コンテンツに合わせたサイトの整え方を確認できます。
          </p>
        </div>
        <div class="rb-home__gallery-links">
          <a href="/themes/">
            <span>Theme プレビュー</span>
            <b>→</b>
          </a>
          <a href="/ja/docs/plugins/showcase/">
            <span>Plugin の動作例</span>
            <b>→</b>
          </a>
          <a href="/ja/docs/guides/customizing-your-site/">
            <span>サイトのカスタマイズ</span>
            <b>→</b>
          </a>
        </div>
      </section>

      <section class="rb-home__continue" aria-labelledby="home-continue">
        <h2 id="home-continue">確認したビルドを公開する。</h2>
        <p>
          ビルド出力は <code>dist/</code>{" "}
          に書き出されます。デプロイガイドでは、Cloudflare Workers
          へのローカル公開、GitHub
          Actions、コンテンツリポジトリの分離を案内しています。
        </p>
        <div class="rb-home__resource-links">
          <a
            class="rb-home__cta rb-home__cta--primary"
            href="/ja/docs/getting-started/"
          >
            始める
          </a>
          <a
            class="rb-home__text-link"
            href="/ja/docs/getting-started/deployment/"
          >
            デプロイ
          </a>
          <a class="rb-home__text-link" href="/ja/docs/">
            ドキュメント
          </a>
          <a class="rb-home__language" href="/" hreflang="en" lang="en">
            English
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

const projectTree = `app/
  routes/
  components/
content/
riebeckite.config.ts`;
