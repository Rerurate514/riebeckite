---
publish: true
---

# showcase
あなたの Riebeckite サイトへようこそ。
このスターターのすべてのページは 7 言語で利用できます。ページタイトル下のセレクターで切り替えられます。
## Riebeckite とは
Riebeckite は、プレーンな Markdown（Obsidian で管理しているのと同じノート）から高速な静的サイトを生成する、拡張性のあるコンテンツファーストのフレームワークです。エコシステムには 50 以上のプラグインと 6 つのテーマがあり、このサイトはその両方をデモしています。
## さらに深く
- [プラグイン — 機能別の代表的なパッケージ](/framework/plugins)
- [テーマ — 同梱のデザインパッケージと切り替え方](/framework/themes)
- [Working examples](/examples/)
- [Plugin reference](/reference/plugins/)
## サイトの編集
コンテンツは `content/` にプレーンな Markdown として置きます。ファイルを追加してフロントマターに `publish: true` を書けば、ビルドされたサイトに反映されます。
翻訳ページは既定ファイルの隣に `<base>.<lang>.md` の命名規則で置きます（例：`about.ja.md`）。l10n プラグインが `/lang/` パスの配下で配信し、自動的にリンクします。
