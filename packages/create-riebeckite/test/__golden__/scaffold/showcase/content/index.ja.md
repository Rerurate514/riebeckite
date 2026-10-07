---
publish: true
---

# showcase

あなたの Riebeckite サイトへようこそ。この preset はツアーです。Riebeckite が同梱する Plugin カタログをすべて登録し、その機能を画面で確認できるコンテンツを用意しています。

## さらに深く

- [プラグイン — 機能別の代表的なパッケージ](/framework/plugins)
- [テーマ — 同梱のデザインパッケージと切り替え方](/framework/themes)
- [Working examples](/examples/)
- [Plugin reference](/reference/plugins/)

## Riebeckite とは

Riebeckite は、プレーンな Markdown（Obsidian で管理しているのと同じノート）から高速な静的サイトを生成する、拡張性のあるコンテンツファーストのフレームワークです。50 以上の Plugin と 6 つのテーマを同梱しており、このサイトはその両方をデモしています。

## サイトの編集

コンテンツは `content/` にプレーンな Markdown として置きます。ファイルを追加してフロントマターに `publish: true` を書けば、ビルドされたサイトに反映されます。`content/Daily/` のノートは、このページの Daily Notes ウィジェットに表示されます。

このサイトは 7 言語で利用できます。ホームページ・examples・framework のページは翻訳され、guide と Plugin/Theme のリファレンスページは英語のままです。ページタイトル下のセレクターで切り替えられます。

翻訳ページは既定ファイルの隣に `<base>.<lang>.md` の命名規則で置きます（例：`about.ja.md`）。l10n プラグインが `/lang/` パスの配下で配信し、自動的にリンクします。

登録されている Plugin とそのオプションは `riebeckite.config.ts` を参照してください。
