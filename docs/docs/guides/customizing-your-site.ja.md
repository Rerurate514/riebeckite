---
date: 2026-10-08
title: サイトのカスタマイズ
---
# サイトのカスタマイズ

Riebeckiteが生成するサイトは、通常の**HonoXアプリケーション**としてカスタマイズできます。Riebeckite独自のUIフレームワークを覚える必要はありません。ページ、コンポーネント、CSS、操作できる[[glossary/ui|UI]]などは、通常の[[framework/honox-integration|HonoX]] / Hono JSXと同じ方法で変更できます。

Riebeckite が主に担当するのは、次の部分です。

- Markdown などのコンテンツを読み込む
- コンテンツや[[glossary/plugin|プラグイン]]の情報をサイトへ渡す
- プラグインが提供するページや UI をサイトへ接続する

一方、実際のサイトを構成する `app/` はサイト側のコードです。

## このページの構成

- [レイアウト](./customizing-your-site/layout.ja.md)
- [ページとナビゲーション](./customizing-your-site/pages-and-navigation.ja.md)
- [プラグインと CSS](./customizing-your-site/plugins-and-css.ja.md)

## 迷ったときの目安

「どこを変更すればいいか分からない」という場合は、次のように考えると簡単です。

| やりたいこと | 変更する場所 |
| --- | --- |
| ヘッダーにリンクを追加したい | `riebeckite.config.ts` |
| ヘッダーの見た目を変えたい | `app/components/site-header.tsx` |
| サイト全体の外枠を変えたい | `app/routes/_renderer.tsx` |
| 記事ページの構成を変えたい | `app/components/article.tsx` |
| 独自のページを追加したい | `app/routes/` |
| 404ページを変えたい | `app/routes/_404.tsx` |
| 独自のコンポーネントを作りたい | `app/components/` |
| 操作できる UI を作りたい | `app/islands/` |
| 色や余白を変えたい | `app/style.css`、`app/styles/` |
| プラグインの UI を配置したい | プラグインのコンポーネント |

Riebeckite がコンテンツとプラグインをサイトへ接続し、**最終的なページの見た目と構成はサイトが決める**というのが基本的な考え方です。

## 次に読むページ

- [HonoX との統合](../framework/honox-integration.ja.md)：Riebeckite と HonoX の接続、UI プリミティブ
- [プラグイン作成の詳細](../framework/plugin-system.ja.md)：プラグインを作る場合の拡張ポイント
- [プラグイン API](../reference/plugin-api.ja.md)：プラグインのコンポーネント、ページ、アセット、CSS フックの詳細
