---
date: 2026-10-14
title: 設定（Config）
sidebar:
  hidden: true
---

# 設定（Config）

コンテンツ、公開、プラグイン、テーマ、キャッシュの挙動を制御するRiebeckiteの設定オブジェクトです。ビルドが使う前に検証され、解決されます。

## 制御するもの

| 設定 | 目的 |
| --- | --- |
| `content.directory` | コンテンツを読み取る場所 |
| `content.filters.publishStrategy` | 既定の公開戦略 |
| `plugins` | 実行するプラグインとそのオプション |
| `theme` | テーマとそのオプション |
| `cache.enabled` | ビルドでキャッシュを使うか |

## 検証してから解決

生の設定は検証されたあと、ビルドが使う形に解決されます。失敗はコンテンツを処理する前に報告されるため、設定の誤りが出力を壊すことはありません。

## 解決パイプライン

設定はビルドが使う前に3つの段階を通ります（`packages/core/src/config.ts`）。

1. **`validateConfig`** — すべての必須フィールドが存在し、値が期待される型や列挙型に適合するかを確認します。コンテンツ処理を始める前にエラーを報告します。

2. **`resolveThemeConfig`** — テーマ設定を解決します。入力が`RiebeckiteTheme`の場合は`name`、`config`、`styles`、`attributes`、`userCss`を取り出します。素の`ThemeConfig`の場合はそのまま使い、欠けているフィールドに既定値を適用します。結果は解決済みの設定の`theme`キーにマージされます。

3. **`resolveConfig`** — すべてをまとめる最終的な解決段階です。次の処理を行います。
   - 生の`RiebeckiteConfig`に対して`validateConfig`を呼び出す。
   - `resolveThemeConfig`を呼び出してテーマを解決する。
   - `resolvePlugins`でプラグインを解決する。
   - `site`、`content`、`cache`、`theme`の各フィールドに既定値を設定する。
   - パイプラインとコンテンツマネージャーが使う`ResolvedRiebeckiteConfig`を生成する。

解決済みの設定はビルド中に`.riebeckite/`に置かれ、`site`、`content`、`theme`、`plugins`、`cache`のセクションを含みます。たとえば`cache`セクションは既定で`enabled: true`となり、任意でカスタムの`directory`も指定できます。`theme`セクションには`colorMode`、`typography`、`articleLayout`、`tokens`、`attributes`が含まれます。

## RiebeckiteConfigインターフェース

設定の形は`packages/core/src/types/riebeckite_config.ts`で定義されています。

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
}
```

必須のトップレベルフィールドは`site`で、ほかのセクションはすべて任意です。`SiteConfig`は`packages/core/src/types/site_config.ts`にあり、`title`、`description`、`author`、`baseUrl`、`locale`、`twitterSite`、`defaultOgImage`、`feed`を含みます。

解決済みの設定では、`site`が`title`、`description`、`author`、`baseUrl`、`locale`、`twitterSite`、`defaultOgImage`、`feed`を含みます。`content`は`directory`、`source`、`exclude`、`filters.publishStrategy`を含みます。`theme`は解決済みのカラーモード、タイポグラフィ、記事レイアウト、トークン、属性を含みます。`plugins`は設定の一覧から解決され、`cache`は`enabled`と`directory`を含みます。

## 関連用語

- [[glossary/theme|Theme]]
- [[glossary/plugin|Plugin]]
- [[glossary/content|Content]]
- [[glossary/build|Build]]
