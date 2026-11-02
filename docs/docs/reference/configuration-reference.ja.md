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

必須なのは `site` だけです。

それ以外の設定を省略した場合は、それぞれ既定値が使われます。

## Config の検証

設定に問題がある場合は `ConfigValidationError` が発生します。

エラーには、問題が見つかった設定の場所と、その理由が表示されます。

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
