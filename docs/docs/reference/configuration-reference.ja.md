---
date: 2026-10-08
title: Configuration リファレンス
---
# Configuration リファレンス

このページでは、`riebeckite.config.ts` で指定できる設定をまとめています。

設定ファイルやコンテンツの場所がどのように決まるか、どのノートが公開されるかなど、設定の仕組みについて詳しく知りたい場合は [Configuration](./configuration.ja.md) を参照してください。

## このページの構成

- [サイトとコンテンツ](./configuration-reference/site-and-content.ja.md)
- [テーマとプラグイン](./configuration-reference/theme-and-plugins.ja.md)
- [公開設定・キャッシュ・ SPA](./configuration-reference/publication-cache-spa.ja.md)

## config ファイルの書き方

アプリケーションのルートに `riebeckite.config.ts` を作成し、`defineConfig` で設定を記述します。

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: {
    title: "My site",
    baseUrl: "https://example.com",
  },
});
```

`defineConfig` は、設定内容を型チェックしやすくするための補助関数です。設定内容そのものを変更する処理は行いません。

Riebeckite が設定ファイルを読み込めるように、`export default` で設定を公開してください。

Vite integration では、通常はアプリケーションのルートにある `riebeckite.config.ts` が使われます。

CLI から実行した場合は、現在のディレクトリから親ディレクトリへ向かって設定ファイルを探します。次のファイル名に対応しています。

- `riebeckite.config.ts`
- `riebeckite.config.js`
- `riebeckite.config.mjs`

設定ファイルを別の場所や別の名前にしたい場合は、`riebeckiteVite()` の `configRoot` と `configFile` で変更できます。

### 主な設定

| 設定 | 必須 | 用途 |
| --- | --- | --- |
| `site` | はい | サイト名や URL などの基本情報 |
| `content` | いいえ | コンテンツの読み込み元や公開条件 |
| `theme` | いいえ | サイトの見た目 |
| `plugins` | いいえ | Riebeckite に追加する機能 |
| `cache` | いいえ | ビルド結果の[[glossary/cache|キャッシュ]] |
| `publication` | いいえ | 公開承認モードと永続状態 |
| `provenance` | いいえ | ビルド来歴の記録 |
| `spa` | いいえ | クライアントサイドのページ遷移、プリフェッチ、スクロール復元、ビュー遷移 |
| `ui` | いいえ | UI の言語と文言辞書 |

必須なのは `site` だけです。

それ以外の設定を省略した場合は、それぞれ既定値が使われます。

### ui

`ui.locale` を指定すると、コンテンツの言語とは独立に、フレームワークとプラグインが描画する文言の言語を固定できます。`ui.labels` は言語コードごとの文言辞書です。言語コードは大文字と小文字を区別せず、辞書にないキーや辞書のない言語は内蔵の英語の文言にフォールバックします。組み込みの英語ラベルがあるキーは `contents`、`contentsHeading`、`filter`、`filterNavigation`、`collapse`、`expand`、`searchNotes`、`searchPlaceholder`、`searchNotesPlaceholder`、`nearbyNotes`、`seriesNavigation`、`language` です。プラグインが描画する UI の文言には、さらに `sidebarNavigation`、`localGraph`、`openInExplorer`、`localGraphTruncated`、`localGraphTruncatedExplorer`、`explorer`、`explorerPanels`、`clearFilters`、`tags`、`folders`、`notes`、`showingNotes`、`noteGraph`、`localGraphMode`、`globalGraphMode`、`localMode`、`globalMode`、`selectNoteHint`、`history`、`historyChanges`、`historyToggle`、`commitHistory`、`untitledChange`、`search`、`closeSearch`、`searchQuery`、`searchFilterHint`、`searchResults`、`seriesPosition` を指定できます。ガーデンエクスプローラーの詳細パネルには、さらに `selectedNote`、`outgoingLinks`、`backlinks`、`relatedNotes`、`noNotes` を指定できます。`showingNotes`、`globalGraphMode`、`historyChanges`、`seriesPosition` は `{...}` のプレースホルダーを残して翻訳してください。プラグインのコンポーネントは `useUiLabels()` からこの辞書を読みます。

```ts
export default defineConfig({
  ui: {
    locale: "ja",
    labels: {
      ja: { contents: "目次" },
    },
  },
});
```

## Config の検証

通常の設定セクションに問題がある場合は `ConfigValidationError` が発生します。テーマのプリセットや設定が不正な場合は `ThemeSettingsValidationError` が発生します。どちらも、問題が見つかった設定の場所と理由を表示します。

設定を変更したあとは、`check` を実行して問題がないことを確認できます。

```sh
npm exec riebeckite check
```

エラーを無視せず、表示された設定項目を確認して修正してください。

## 関連ページ

- [[configuration|Configuration]]：ディレクトリの基準、コンテンツの選択、公開条件
- [[plugin-api|Plugin system]]：プラグインの仕組み
- [[theme-api|Theme system]]：Theme とデザイン設定の仕組み
- [[cli|CLI]]：`check`、`doctor`、`inspect` などのコマンド
