---
date: 2026-10-11
title: 移行ガイド
private: true
sidebar:
  label: 移行ガイド
  order: 100
---
# 移行ガイド

移行元のプラットフォームを選んでください。各ページは自動変換の手順ではなく、根拠を確認した移行計画です。難易度は、移行元に固有の実行環境、テンプレート、レイアウト、拡張を作り直す量に基づきます。すべてのサイトが同じ難易度であるという意味ではありません。

| プラットフォーム | 向いているケース | コンテンツ移行 | テーマ / レイアウト移行 | 主な制約 |
| --- | --- | --- | --- | --- |
| [Quartz](./from-quartz.ja.md) | Markdown コンテンツを中心としたデジタルガーデン | 低〜中 | 中 | Quartz の設定とコンポーネントレイアウトはそのまま移せません。Riebeckite のプラグイン、テーマ CSS、または HonoX アプリコードとして作り直します。 |
| [Obsidian Publish](./from-obsidian-publish.ja.md) | 公開ノートをセルフホストサイトにできる Obsidian Vault | 低〜中 | 中 | Publish のホスティング、サイト設定、共有制御には、エクスポート互換の Riebeckite 機能がありません。ホスティングと公開ノートの選択は自分で設定します。 |
| [VitePress](./from-vitepress.ja.md) | コンテンツ中心の静的サイトへ移行できる Markdown ドキュメントサイト | 中 | 中〜高 | VitePress のテーマ API、Vue コンポーネント、Vite プラグインは Riebeckite では実行できません。 |
| [Docusaurus](./from-docusaurus.ja.md) | 単一バージョンのドキュメントサイトまたはコンテンツサイト | 中 | 中〜高 | React/MDX コンポーネント、生成 ID、Docusaurus のバージョン管理は、別途維持するか作り直す必要があります。 |
| [MkDocs](./from-mkdocs.ja.md) | Python テーマの動作に依存しない Markdown ドキュメント | 中 | 中〜高 | Python プラグイン、Jinja テーマの上書き、Material 固有の構文は手作業で置き換えます。 |
| [GitBook](./from-gitbook.ja.md) | Git にソース Markdown がある GitBook Space | 中 | 中〜高 | ホスト型編集、権限、インテグレーション、GitBook 固有のブロックは Riebeckite の動作としてエクスポートできません。 |
| [Hugo](./from-hugo.ja.md) | Go テンプレートからコンテンツを分離できる Markdown 中心の静的サイト | 中 | 中〜高 | Go テンプレート、shortcode、Hugo Pipes、taxonomy はそのまま互換になりません。 |
| [Jekyll](./from-jekyll.ja.md) | Liquid への依存が限定的な Markdown の post と page | 中 | 中〜高 | Liquid、Ruby プラグイン、collection の出力規則、GitHub Pages の動作は手作業で再設計します。 |
| [Eleventy (11ty)](./from-eleventy.ja.md) | JavaScript テンプレートから独立した Markdown コンテンツ中心のサイト | 中 | 中〜高 | Nunjucks/Liquid/JavaScript テンプレート、computed data、任意のデータ取得は移植できません。 |
| [Hexo](./from-hexo.ja.md) | 一般的な post、page、静的アセットを持つ Markdown ブログ | 中 | 中〜高 | EJS/Pug/Swig テーマ、Hexo の generator、デプロイプラグインは手作業で置き換えます。 |
| [Zola](./from-zola.ja.md) | Tera テンプレートの動作を手放せる Markdown コンテンツサイト | 中 | 中〜高 | Tera テンプレート、shortcode、Sass 処理、section のページネーションは互換ではありません。 |
| [Astro](./from-astro.ja.md) | Astro コンポーネントやサーバーランタイムを必要としない、ほぼ静的な Markdown サイト | 高 | 中〜高 | Astro コンポーネント、インテグレーション、コンテンツスキーマ、サーバーエンドポイント、アイランドは HonoX または手作業で実装します。 |
| [Gatsby](./from-gatsby.ja.md) | GraphQL 駆動のアプリケーション動作に依存しない静的 Markdown コンテンツ | 高 | 中〜高 | GraphQL クエリ、React テンプレート、source プラグイン、クライアントランタイムの動作は移植できません。 |
| [Next.js static export](./from-nextjs.ja.md) | 完全に静的出力できる Markdown 中心のサイト。一般的な Next.js アプリケーションは対象外 | 高 | 中〜高 | Server Actions、API ルート、middleware、ISR、画像最適化、動的なサーバーレンダリングは静的 Riebeckite サイトへ移行できません。 |

## 共通の安全ルール

1. リポジトリ、アセット、URL 一覧をバックアップします。
2. 新しいディレクトリにスキャフォールドし、移行元を上書きしません。
3. まず Markdown を移し、動作は明示的に作り直します。
4. URL はドキュメント化された Permalink プラグインで維持し、デプロイ後にリダイレクトを検証します。
5. アプリケーションのランタイム、テンプレート、ホストサービスの設定、未確認の拡張は手作業として扱います。

すべてのガイドでは、Riebeckite の `create-riebeckite`、`check`、`doctor`、`build`、`inspect` だけを使います。外部の本番プロジェクトを用いたエンドツーエンド移行が済んでいるとは記載していません。

## 移行に使える Riebeckite の機能

- [コンテンツを書く](../writing-content.ja.md)
- [Obsidian ノートを公開する](../obsidian.ja.md)
- [設定](../../reference/configuration.ja.md)
- [CLI リファレンス](../../reference/cli.ja.md)
- [Docs プラグイン](../../plugins/docs.ja.md)
- [Permalink プラグイン](../../plugins/permalink.ja.md)
- [SEO プラグイン](../../plugins/seo.ja.md)
- [デプロイ](../deployment/README.ja.md)
