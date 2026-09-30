# Presets

Preset は、生成される theme、Plugin、サンプルコンテンツ、`app/` ファイルの組み合わせです。現在の実装では次の preset があります。

| preset | 向いている用途 | Plugin | 言語 | Theme |
| --- | --- | ---: | --- | --- |
| `empty` | ほぼ空の状態から自分で組み立てたい | 0 | なし | なし |
| `minimal` | 最小構成で Markdown サイトを始めたい | 1 | `en` | `minimal` |
| `starter` | 通常のサイトを始めたい。既定値 | 3 | 7言語 | `default` |
| `rich` | 基本的な公開・読書体験を確認したい | 8 | 7言語 | `default` |
| `full` | ブログや公開サイト向けの主要機能を揃えたい | 29 | 7言語 | `default` |
| `max` | 図表、ナレッジ機能、ショーケースを広く試したい | 53 | 7言語 | `default` |
| `ultra` | 公式 Plugin カタログ全体を確認したい | 59 | 7言語 | `default` |

```bash
npx create-riebeckite my-site --preset starter
npx create-riebeckite --list-presets
```

`starter` は Obsidian Markdown、カラーモード、l10n を含みます。`full` 以上は検索、バックリンク、関連投稿、メディア、コード表示などを含みます。`max` は Mermaid、Graphviz、D2、Chart.js、Excalidraw、Dataview などを追加します。`ultra` は daily notes、rename、quality、deploy、diagnostics まで含む確認用の最上位 preset です。

Plugin の詳細は [Plugins](../plugins/README.md)、Theme の詳細は [Themes](../themes/README.md) を参照してください。
