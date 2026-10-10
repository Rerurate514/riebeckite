---
title: MkDocs から移行する
sidebar:
  label: MkDocs から
---
# MkDocs から移行する

## 概要

このガイドは、Python Theme の動作に依存しない Markdown ドキュメント を対象にします。これは設定ファイルを機械変換する手順ではなく、**コンテンツを安全に移す手順**です。Riebeckite は Markdown 中心の静的サイトフレームワークで、Plugin、Theme、HonoX アプリケーションを分離します。一方、MkDocs 1.x (including Material extensions where used) には固有の実行環境と規約があります。コンテンツ中心のサイトは現実的に移行できますが、mkdocs.yml、nav、Markdown 拡張、theme に依存するサイトは難易度が高くなります。

**根拠:** 移行元の仕様は 1.x (including Material extensions where used) 向けの [MkDocs 公式ドキュメント](https://www.mkdocs.org/user-guide/configuration/) で確認しています。実際に使っているバージョンと拡張機能のリリースノートも確認してください。

## 移行前の確認

- Git のバックアップ、公開済み URL の一覧、アセットのコピーを作成します。
- Node.js LTS、ターミナル、移行元とは別の出力先を用意します。
- 独自 Theme、拡張、生成ページ、リダイレクト、解析、認証、ホスト設定を棚卸しします。
- Python Plugin、Jinja Theme override、Material 固有の構文は手作業で置き換えます。
- このガイドは自動移行 CLI を提供せず、実際の MkDocs サイトを使ったエンドツーエンド移行済みとは主張しません。

## プラットフォーム固有の注意点

`nav` の順序は Docs の `sidebar.order` または手書きの Navigation item に移します。MkDocs の YAML metadata と通常の Markdown は変換候補ですが、Python Markdown 拡張、Material の admonition、`mkdocs.yml` の Plugin option が互換出力を意味するわけではありません。

## 機能対応表

| 移行元の機能 | Riebeckite での方法 | 対応状況 |
| --- | --- | --- |
| Markdown ページと Frontmatter | 設定した content root 配下に Markdown を置く | Supported |
| mkdocs.yml、nav、Markdown 拡張、theme | Plugin、Theme CSS、アプリケーションコードとして再実装する | Manual Migration Required |
| ナビゲーションとドキュメント階層 | Navigation / Docs Plugin と公開済みコンテンツ、sidebar Frontmatter を使う | Partially Supported |
| 検索、backlinks、graph | 必要な Riebeckite Plugin を有効にする | Partially Supported |
| ホスト・デプロイ固有の動作 | 移行先のホストで別途設定する | Manual Migration Required |
| 未調査のサードパーティ拡張 | ソースを確認し、検証できた動作だけを再現する | Unverified |

## 手順

1. **移行元リポジトリと公開 URL 一覧をバックアップします。** リダイレクト、アセット、クロール結果を確認するまで移行元を公開したままにします。
2. **新しい Riebeckite サイトを作成します。** `npx create-riebeckite my-site --preset starter`、`cd my-site`、`npm install` を順に実行します。移行元で `init --force` は実行しません。
3. **コンテンツを選んでコピーまたは接続します。** 公開する Markdown と参照アセットだけを `content/` にコピーするか、`content.directory` を読み取り専用の元データ／Vault に向けます。移行元では通常 docs/ と mkdocs.yml が起点です。
4. **Frontmatter を正規化します。** 公開ページごとに `publish: true` を追加し、title、description、date、tags、image、canonical、lang を確認して引き継ぎます。
5. **Markdown と埋め込みを確認します。** 標準的な Markdown が最も安全です。独自 directive、shortcode、MDX、テンプレート式は個別に置き換え、対応する Riebeckite Plugin だけを有効にします。
6. **表示と拡張を作り直します。** Preset/Theme を選び、公開済み Plugin を設定します。固有の route や component は生成された HonoX アプリケーションに実装します。移行元の Theme／拡張コードを設定としてコピーしません。
7. **URL とナビゲーションを維持します。** まずファイル名からの標準 URL を確認し、旧 URL が必要なページだけ Permalink Plugin の `permalink` と `redirect_from` を使います。階層には Docs の sidebar Frontmatter または Navigation 設定を使います。
8. **ローカルで検証・ビルドします。** `npm exec riebeckite check`、`npm exec riebeckite doctor`、`npm exec riebeckite build` を実行します。
9. **出力を確認します。** `npm exec riebeckite inspect content --list` を使い、リンク、アセット、draft、redirect、翻訳、検索、feed を手動確認します。
10. **ビルド済みサイトをデプロイします。** Cloudflare Workers のガイドに従うか、`dist/` を配信するホストを使います。本番ビルド前に `site.baseUrl` を設定します。

## 設定対応

| MkDocs の設定 | Riebeckite の置き換え | 注意点 |
| --- | --- | --- |
| docs/ と mkdocs.yml | `riebeckite.config.ts` と `content/` | 設定ファイルを機械変換しません。 |
| site title/base URL | `site.title`、`site.baseUrl` | 最終公開 URL を本番ビルド前に設定します。 |
| navigation/sidebar | Navigation Plugin または Docs Plugin | Docs は公開 Markdown と `sidebar` Frontmatter を使います。 |
| theme/layout | Theme CSS または生成された HonoX アプリ | Theme は見た目のみです。route/component はアプリに置きます。 |
| extensions/plugins | 公開済み Riebeckite Plugin | 機能ごとに明示して導入します。 |

最小構成の例です。

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My site", baseUrl: "https://example.com" },
  content: { directory: "content", filters: { publishStrategy: "explicit" } },
  plugins: [],
});
```

## URL と SEO の維持

Riebeckite は既定で `content/index.md` を `/`、それ以外を slug の URL にします。`@riebeckite/plugin-permalink` を有効にすると既定の canonical URL は `/n/<id>` に変わるため、URL 維持だけを目的に無設定で有効化しないでください。ページ単位の旧 URL には `permalink` と `redirect_from` Frontmatter を使い、サイト全体の URL 方針には `path` または `resolvePath` を明示設定します。ホストがリダイレクトを追加すると仮定せず、デプロイ後の出力を確認してください。

`@riebeckite/plugin-seo` は canonical metadata、sitemap、`robots.txt`、RSS/Atom/JSON feed を生成します。`canonical` と解決済み permalink を使用します。実際の翻訳があるときだけ `@riebeckite/plugin-l10n` を使ってください。既存の翻訳に `hreflang` を出力しますが、フォールバックページは生成しません。`content/` 配下のローカル Markdown 画像は、公開ページから参照されたものだけがコピーされます。相対パスとルート相対パスはサイトルート URL に正規化されるため、参照先は content root 内に置き、すべて検証してください。404 は移行先ホストまたはアプリで用意してください。自動的に同等になるとは限りません。

## よくある問題

- **ページが表示されない:** `publish: true`、`content.directory`、exclude を確認し、`npm exec riebeckite inspect content --list` を実行します。
- **旧 URL が変わった:** 明示的な `permalink` または `redirect_from` を使います。rename 検出を使う場合は ID を安定させます。
- **テンプレート構文がそのまま見える:** 移行元固有の構文です。Markdown、公開済み Plugin、アプリコードに置き換えます。
- **sidebar の順番が違う:** `sidebar.label` と `sidebar.order` を指定し、Docs root を確認します。
- **アセットが壊れる:** Markdown を一括置換する前に、大文字小文字、URL base、相対パス、コピーしたファイルを確認します。

## 検証チェックリスト

- [ ] 移行元リポジトリ、URL 一覧、アセットをバックアップした。
- [ ] 公開する全ページに `publish: true` がある。
- [ ] `npm exec riebeckite check`、`doctor`、`build` が成功する。
- [ ] canonical URL、redirect、navigation、リンク、画像、feed、sitemap、robots をローカルとデプロイ後に確認した。
- [ ] draft/private コンテンツが本番 manifest と出力に含まれていない。
- [ ] 移行元固有の機能を再実装・意図的に廃止・非対応として記録した。

## 関連ドキュメント

- [移行ガイド](./README.ja.md)
- [コンテンツを書く](../writing-content.ja.md)
- [Obsidian Vault](../obsidian.ja.md)
- [設定](../../reference/configuration.ja.md)
- [CLI リファレンス](../../reference/cli.ja.md)
- [Permalink Plugin](../../plugins/permalink.ja.md)
- [SEO Plugin](../../plugins/seo.ja.md)
- [デプロイ](../deployment/README.ja.md)
