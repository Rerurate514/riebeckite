---
date: 2026-10-14
title: 設定（Config）
sidebar:
  hidden: true
---

# 設定（Config）

コンテンツ、公開、プラグイン、テーマ、キャッシュ、来歴、SPA の挙動を制御する Riebeckite の設定オブジェクトです。ビルドが使う前に検証され、解決されます。

## 制御するもの

| 設定 | 目的 |
| --- | --- |
| `site` | サイトの基本情報と SEO の既定値 |
| `content.directory` | コンテンツを読み取る場所 |
| `content.filters.publishStrategy` | 既定の公開戦略 |
| `plugins` | 実行するプラグインとそのオプション |
| `theme` | テーマとそのオプション |
| `cache.enabled` | ビルドでキャッシュを使うか |
| `publication` | 公開承認モードと永続状態 |
| `provenance` | ビルド来歴を記録するか |
| `spa` | クライアントサイドナビゲーションの挙動 |

## 検証してから解決

生の設定は検証されたあと、ビルドが使う形に解決されます。失敗はコンテンツを処理する前に報告されるため、設定の誤りが出力を壊すことはありません。

## 解決

`packages/core/src/config.ts` の `resolveConfig` が解決を行います。

1. **`validateConfig`** — コンテンツ処理を始める前に、必須フィールドと値の型・列挙型を確認します。
2. **`resolveTheme`** — テーマインスタンスの `colorMode`、`layout`、`preset`、`settings`、`stylesheets`、スタイルを、その定義に対して解決します。
3. **残りのセクション** — プラグイン、公開設定、SPA オプションを解決し、`site`、`content`、`cache`、`provenance` の既定値を適用します。

結果は `ResolvedRiebeckiteConfig` としてメモリ上でパイプラインとコンテンツマネージャーに使われます。ビルド状態とキャッシュは `.riebeckite/` 配下のファイルですが、解決済み設定そのものはそこに保存されません。

## RiebeckiteConfig インターフェース

設定の形は `packages/core/src/types/riebeckite_config.ts` で定義されています。

```ts
export interface RiebeckiteConfig {
  site: SiteConfig;
  content?: {
    directory?: string;
    source?: ContentSource;
    exclude?: string[];
    filters?: {
      publishStrategy?: PublishStrategy;
    };
  };
  theme?: ThemeInput;
  plugins?: PluginInput[];
  cache?: {
    enabled?: boolean;
    directory?: string;
  };
  provenance?: {
    enabled?: boolean;
  };
  publication?: PublicationConfig;
  spa?: boolean | SpaConfig;
}
```

必須のトップレベルフィールドは `site` で、ほかのセクションはすべて任意です。`SiteConfig` は `packages/core/src/types/site_config.ts` にあり、`title`、`description`、`author`、`baseUrl`、`locale`、`twitterSite`、`defaultOgImage`、`feed` を含みます。

## 解決済み設定

解決済み設定には、正規化された `site` の基本情報とフィード、`content` の `directory`・`source`・`exclude`・`filters.publishStrategy`、テーマの名前・カラーモード・レイアウト・スタイル・スタイルシート・設定、解決済みの `plugins`、`cache` の `enabled` と `directory`、`provenance.enabled`、任意の `publication` と `spa` が含まれます。

## 関連用語

- [[glossary/theme|Theme]]
- [[glossary/plugin|Plugin]]
- [[glossary/content|Content]]
- [[glossary/build|Build]]
