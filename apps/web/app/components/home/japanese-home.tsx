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
              所有することは、実装上の選択です。
            </p>
            <p>
              書くものは Markdown に残し、アプリケーションは通常の TypeScript
              ファイルで管理する。片方を変えても、もう片方を手放す必要はありません。
            </p>
            <a href="/ja/docs/guides/writing-content/">コンテンツの設定を見る →</a>
          </article>
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

      <section class="rb-home__statement" aria-labelledby="home-content">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">Markdown と Obsidian</p>
          <h2 id="home-content">ノートにサイトの構造まで決めさせない。</h2>
          <p>
            プロジェクト内の <code>content/</code> も、外部の Obsidian Vault
            もコンテンツソースにできます。公開対象のノートは静的ページになり、アプリケーションは通常の
            Hono JSX プロジェクトとして残ります。
          </p>
        </div>
        <div class="rb-home__content-example">
          <div>
            <p class="rb-home__label">content/notes/ownership.md</p>
            {runtime && <RuntimeCode html={runtime.codes.content} />}
          </div>
          <p class="rb-home__content-note">
            公式 Plugin
            を追加すると、WikiLink、埋め込み、Callout、プロパティ、タグを含む
            Obsidian 記法を扱えます。Frontmatter
            は公開情報を本文と同じファイルで管理します。
          </p>
        </div>
        <a class="rb-home__text-link" href="/ja/docs/guides/writing-content/">
          コンテンツソースを設定する
        </a>
      </section>

      <section class="rb-home__section" aria-labelledby="home-application">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">アプリケーションも自分のもの</p>
          <h2 id="home-application">
            閉じたテンプレートではなく、プロジェクトから始める。
          </h2>
          <p>
            生成されるサイトには <code>app/</code>{" "}
            ディレクトリ、設定ファイル、管理できる依存関係があります。Hono JSX
            でページ、ドキュメント、ナビゲーション、コンポーネントを書けます。
          </p>
        </div>
        <div class="rb-home__ownership-example">
          <div>
            <p class="rb-home__label">生成されるプロジェクト</p>
            {runtime && <RuntimeCode html={runtime.codes.project} />}
          </div>
          <p>
            Riebeckite はサイトを抱え込むプロジェクト形式ではなく、npm
            パッケージの集合です。更新は依存関係の更新として扱えます。
          </p>
        </div>
      </section>

      <section class="rb-home__configuration" aria-labelledby="home-extensions">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">拡張の境界</p>
          <h2 id="home-extensions">Plugin は機能を、Theme は見た目を担う。</h2>
          <p>
            npm
            パッケージを導入して設定に登録し、コンポーネントをどのルートで使うかはサイト側で決めます。
          </p>
        </div>
        <div class="rb-home__application-example">
          {runtime && <RuntimeCode html={runtime.codes.application} />}
          <div class="rb-home__application-copy">
            <p>
              Plugin は Markdown と HTML
              の変換、レンダラー、単独ページ、ブラウザ側の動作、エンドポイント、SEO、診断を追加できます。Theme
              はトークンとスタイルを提供し、アプリケーションの構造は決めません。
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

      <section class="rb-home__workflow" aria-labelledby="home-workflow">
        <div class="rb-home__section-intro">
          <p class="rb-home__section-label">ビルドと確認</p>
          <h2 id="home-workflow">変更分をビルドし、結果を確認する。</h2>
          <p>
            成功したビルドは再利用できる状態と依存関係を記録します。リンク先のページやアセットが変われば関連する出力を生成し直し、
            <code>--full</code> で再利用を使わないビルドもできます。
          </p>
        </div>
        <dl class="rb-home__workflow-list">
          <div>
            <dt>開発</dt>
            <dd>
              <code>riebeckite dev</code> で統合開発環境を起動します。
            </dd>
          </div>
          <div>
            <dt>検証</dt>
            <dd>
              <code>riebeckite check</code> は設定、コンテンツ、Plugin
              のオプション、機能解決を検証します。
            </dd>
          </div>
          <div>
            <dt>確認</dt>
            <dd>
              <code>riebeckite inspect</code>{" "}
              は解決済みの設定、Plugin、コンテンツ、グラフ、ビルド状態を表示します。
            </dd>
          </div>
        </dl>
      </section>

      <section class="rb-home__preview" aria-labelledby="home-preview">
        <div>
          <p class="rb-home__section-label">ローカルプレビュー</p>
          <h2 id="home-preview">実際のフィクスチャサイトで拡張を開発する。</h2>
        </div>
        <div class="rb-home__preview-body">
          <p>
            <code>riebeckite theme preview</code> は
            Home、Article、Documentation、Components
            のフィクスチャを提供します。<code>riebeckite plugin dev</code>{" "}
            はローカル Plugin を一時サイトにリンクし、固定の Markdown
            で確認できます。
          </p>
          {runtime && <RuntimeCode html={runtime.codes.preview} />}
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
