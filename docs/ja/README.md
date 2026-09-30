<p align="center">
  <img src="../../assets/logos/riebeckite-logo-horizontal.png" alt="Riebeckite" width="360" />
</p>

# Riebeckite ドキュメント

Riebeckite は、Markdown や Obsidian のノートを公開サイトにするためのフレームワークです。このドキュメントは、使う人、拡張する人、本体を開発する人の入口を分けています。

## 何をしたいですか？

| 目的 | 読むページ |
| --- | --- |
| 初めて使う | [Getting Started](./getting-started/README.md) |
| インストール手順だけ確認する | [Installation](./getting-started/installation.md) |
| preset を選ぶ | [Presets](./getting-started/presets.md) |
| 最初の記事を書く | [First Content](./getting-started/first-content.md) |
| デプロイする | [Deployment](./getting-started/deployment.md) / [Deployment Guides](./guides/deployment/README.md) |
| 記事の書き方を知る | [Writing Content](./guides/writing-content.md) |
| Obsidian Vault を公開する | [Obsidian](./guides/obsidian.md) |
| content と site を別リポジトリにする | [Content Repositories](./guides/content-repositories.md) |
| 多言語サイトにする | [Localization](./guides/localization.md) |
| Plugin を探す | [Plugins](./plugins/README.md) |
| Theme を選ぶ | [Themes](./themes/README.md) |
| 設定や CLI を調べる | [Reference](./reference/README.md) |
| 内部構造を理解する | [Framework](./framework/README.md) |
| Riebeckite 本体を開発する | [Framework Development](./framework/development.md) |

## 入口の考え方

サイトを作りたい人は、このリポジトリを clone せず `create-riebeckite` から始めます。monorepo の `pnpm` コマンドや `apps/web` は、Riebeckite 本体を開発する人向けの情報です。

```
README
  ↓
Getting Started
  ↓
create-riebeckite
  ↓
content/ に記事を書く
  ↓
build / deploy
```

Coding Agent 向けの短いルールは [agents](../agents/README.md) に分けています。
