# create-riebeckite

公式スターターテンプレートから、新しい Riebeckite サイトを作成するための
CLI ツールです。

[English](./README.md)

## 使い方

```sh
npx create-riebeckite my-site
cd my-site
npm install
npx riebeckite build
```

## オプション

| オプション | 説明 |
| --- | --- |
| `[directory]` | 生成先ディレクトリ（既定はカレントディレクトリ） |
| `--preset <name>` | 使用するスターター構成（既定は `starter`） |
| `--force` | 空でないディレクトリにも展開する |
| `--list-presets` | 利用可能な preset と説明を一覧表示して終了する |

たとえば、`rich` preset で生成する場合は次のようにします。

```sh
npx create-riebeckite my-site --preset rich
```

## Preset

利用可能な preset は `--list-presets` で確認できます。

```sh
npx create-riebeckite --list-presets
```

すべての preset は自己完結のスターターで、小さいものから順に次のとおりです。

| Preset | Theme | Plugins | コンテンツページ |
| --- | --- | --- | --- |
| `empty` | なし | なし | なし（静的インデックスのみ） |
| `minimal` | minimal | 1 | index |
| `starter` | default | 3 | index（7 言語） |
| `rich` | default | 8 | index、framework/plugins、framework/themes（7 言語） |
| `full` | default | 23 | rich + guide |
| `max` | default | 46 | full + examples |
| `ultra` | default | 52 | max + reference/plugins、reference/themes |

各 preset の説明は次のとおりです（`--list-presets` で表示される内容と同じです）。

- `empty` — 空のアプリケーションシェル（Plugin・Theme・コンテンツ・コンポーネントなし）
- `minimal` — 最小構成のサイト（Obsidian Markdown、minimal Theme、1 ページ）
- `starter` — 標準のスターター（Obsidian Markdown、カラーモード、7 言語、サイトヘッダー）
- `rich` — 公開・閲覧向け Plugin と、エコシステムを紹介するページ（7 言語）
- `full` — ブログ一式（検索・メディア・関連記事などの Plugin とビルドガイド）
- `max` — `full` に図表・ナレッジ系 Plugin とサンプルページを追加
- `ultra` — 全 Plugin カタログと Theme リファレンスページ（エコシステムの一式）

Riebeckite は、Markdown や Obsidian 由来のノートを Web で公開するための
拡張可能なフレームワークです。設定方法やプラグインについては
[Riebeckite ドキュメント](https://github.com/Rerurate514/riebeckite#readme)
を参照してください。