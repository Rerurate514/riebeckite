---
title: 移行ガイド
sidebar:
  label: 移行ガイド
  order: 100
---
# 移行ガイド

移行元を選んでください。各ページは自動変換の手順ではなく、根拠を確認した移行計画です。難易度は、移行元固有の実行環境、テンプレート、layout、拡張を作り直す量に基づきます。すべてのサイトが同じ難易度であるという意味ではありません。

| プラットフォーム | 向いているケース | コンテンツ移行 | Theme / Layout 移行 | 主な制約 |
| --- | --- | --- | --- | --- |
| [Quartz](./from-quartz.ja.md) | Markdown コンテンツを中心としたデジタルガーデン | 低〜中 | 中 | Quartz の設定と component layout はそのまま移せません。Riebeckite の Plugin、Theme CSS、または HonoX アプリコードとして作り直します。 |
| [Obsidian Publish](./from-obsidian-publish.ja.md) | 公開ノートをセルフホストサイトにできる Obsidian Vault | 低〜中 | 中 | Publish のホスティング、サイト設定、共有制御には、エクスポート互換の Riebeckite 機能がありません。ホスティングと公開ノートの選択は自分で設定します。 |
| [VitePress](./from-vitepress.ja.md) | コンテンツ中心の静的サイトに移せる Markdown ドキュメントサイト | 中 | 中〜高 | VitePress Theme API、Vue component、Vite Plugin は Riebeckite では実行できません。 |
| [Docusaurus](./from-docusaurus.ja.md) | 単一バージョンのドキュメントサイトまたはコンテンツサイト | 中 | 中〜高 | React/MDX component、生成 ID、Docusaurus versioning は、別途維持するか作り直す必要があります。 |
| [MkDocs](./from-mkdocs.ja.md) | Python Theme の動作に依存しない Markdown ドキュメント | 中 | 中〜高 | Python Plugin、Jinja Theme override、Material 固有の構文は手作業で置き換えます。 |
| [GitBook](./from-gitbook.ja.md) | Git にソース Markdown がある GitBook Space | 中 | 中〜高 | ホスト型編集、権限、integration、GitBook 固有 block は Riebeckite の動作としてエクスポートできません。 |
| [Hugo](./from-hugo.ja.md) | Go template からコンテンツを分離できる Markdown 中心の静的サイト | 中 | 中〜高 | Go template、shortcode、Hugo Pipes、taxonomy はそのまま互換になりません。 |
| [Jekyll](./from-jekyll.ja.md) | Liquid への依存が限定的な Markdown post と page | 中 | 中〜高 | Liquid、Ruby Plugin、collection の出力規則、GitHub Pages の動作は手作業で再設計します。 |
| [Eleventy (11ty)](./from-eleventy.ja.md) | JavaScript template から独立した Markdown コンテンツ中心のサイト | 中 | 中〜高 | Nunjucks/Liquid/JavaScript template、computed data、任意の data fetching は移植できません。 |
| [Hexo](./from-hexo.ja.md) | 一般的な post、page、静的 asset を持つ Markdown blog | 中 | 中〜高 | EJS/Pug/Swig Theme、Hexo generator、deploy Plugin は手作業で置き換えます。 |
| [Zola](./from-zola.ja.md) | Tera template の動作を手放せる Markdown コンテンツサイト | 中 | 中〜高 | Tera template、shortcode、Sass 処理、section pagination は互換ではありません。 |
| [Astro](./from-astro.ja.md) | Astro component や server runtime を必要としない、ほぼ静的な Markdown サイト | 高 | 中〜高 | Astro component、integration、content schema、server endpoint、island は HonoX または手作業で実装します。 |
| [Gatsby](./from-gatsby.ja.md) | GraphQL 駆動のアプリケーション動作に依存しない静的 Markdown コンテンツ | 高 | 中〜高 | GraphQL query、React template、source Plugin、client runtime の動作は移植できません。 |
| [Next.js static export](./from-nextjs.ja.md) | 完全に静的出力できる Markdown 中心のサイト。一般的な Next.js アプリケーションは対象外 | 高 | 中〜高 | Server Actions、API route、middleware、ISR、image optimization、動的 server rendering は静的 Riebeckite サイトへ移行できません。 |

## 共通の安全ルール

1. リポジトリ、アセット、URL 一覧をバックアップします。
2. 新しいディレクトリに scaffold し、移行元を上書きしません。
3. まず Markdown を移し、動作は明示的に再実装します。
4. URL はドキュメント化された Permalink Plugin で維持し、デプロイ後に redirect を検証します。
5. アプリケーションの実行環境、テンプレート、ホストサービスの設定、未確認の拡張は手作業として扱います。

すべてのガイドでは、Riebeckite の `create-riebeckite`、`check`、`doctor`、`build`、`inspect` だけを使います。外部の本番プロジェクトを用いたエンドツーエンド移行済みとは記載していません。

## Riebeckite の移行に使う機能

- [コンテンツを書く](../writing-content.ja.md)
- [Obsidian ノートを公開する](../obsidian.ja.md)
- [設定](../../reference/configuration.ja.md)
- [CLI リファレンス](../../reference/cli.ja.md)
- [Docs Plugin](../../plugins/docs.ja.md)
- [Permalink Plugin](../../plugins/permalink.ja.md)
- [SEO Plugin](../../plugins/seo.ja.md)
- [デプロイ](../deployment/README.ja.md)
