---
title: Config
sidebar:
  hidden: true
---

# Config

コンテンツ、公開、Plugin、Theme、cacheの挙動を制御するRiebeckiteの設定オブジェクトです。Buildが使う前に検証し、解決します。

## 制御するもの

| 設定 | 目的 |
| --- | --- |
| `content.directory` | コンテンツを読み取る場所 |
| `content.filters.publishStrategy` | 既定のpublish strategy |
| `plugins` | 実行するPluginとそのoption |
| `theme` | Themeとそのoption |
| `cache.enabled` | Buildでcacheを使うか |

## 検証してから解決

生のconfigを検証し、Buildが使う形に解決します。失敗はコンテンツを処理する前に報告するため、設定の誤りが出力を壊すことはありません。

## 解決パイプライン

設定はビルドが使う前に3つの段階を通ります：

1. **`validateConfig`** ：すべての必須フィールドが存在し、値が期待される型/列挙型に合致しているかチェックします。コンテンツ処理開始前にエラーを報告します。

2. **`resolveThemeConfig`**：Theme設定を解決します。入力が`RiebeckiteTheme`の場合は`name`、`config`、`styles`、`attributes`、`userCss`を取り出します。素の`ThemeConfig`の場合は、欠けているfieldに既定値を適用します。結果は解決済みのconfigの`theme`キーにマージされます。

3. **`resolveConfig`**：最終的な解決ステップです。次を実行します。
- 生の`RiebeckiteConfig`に対して`validateConfig`を呼び出します。
- `resolveThemeConfig`を呼び出してThemeを解決します。
- `resolvePlugins`でPluginを解決します。
- `site`、`content`、`cache`、`theme`の各fieldに既定値を設定します。
- `ResolvedRiebeckiteConfig`を生成し、パイプラインとContent Managerが使います。

解決済みのconfigはBuild中の`.riebeckite/`に残り、`site`、`content`、`theme`、`plugins`、`cache`のセクションを含みます。たとえば`cache`セクションは`enabled: true`が既定で、任意でカスタムの`directory`も指定できます。`theme`セクションには`colorMode`、`typography`、`articleLayout`、`tokens`、`attributes`が含まれます。

## RiebeckiteConfig interface
configの形は`packages/core/src/types/riebeckite_config.ts`で定義されています：

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

必須のトップレベルフィールドは`site`で、他のすべてのセクションはオプションです。`SiteConfig`は`packages/core/src/types/site_config.ts`にあり、`title`、`description`、`author`、`baseUrl`、`locale`、`twitterSite`、`defaultOgImage`、`feed`を含みます。

## config解決の流れ
生のconfigはビルドが使う前に3つの解決段階を通ります、`packages/core/src/config.ts`に定義されています：

1. **`validateConfig`** ：すべての必須フィールドが存在し、値が期待される型/列挙型に合致しているかチェックします。コンテンツ処理開始前にエラーを報告します。
2. **`resolveThemeConfig`** - Theme設定を解決します。入力が`RiebeckiteTheme`の場合は`name`、`config`、`styles`、`attributes`、`userCss`を取り出します。素の`ThemeConfig`の場合は、欠けているfieldに既定値を適用します。
3. **`resolveConfig`** - 最終的な解決ステップです。次を実行します。`RiebeckiteConfig`のrawに対して`validateConfig`を呼び出し、`resolveThemeConfig`でThemeを解決し、`resolvePlugins`でPluginを解決し、`site`、`content`、`cache`、`theme`の各fieldに既定値を設定し、`ResolvedRiebeckiteConfig`を生成し、パイプラインとContent Managerが使います。

解決済みのconfigには`site`が`title`、`description`、`author`、`baseUrl`、`locale`、`twitterSite`、`defaultOgImage`、`feed`を含み、`content`が`directory`、`source`、`exclude`、`filters.publishStrategy`を含み、`theme`が解決されたcolor mode、typography、article layout、tokens、attributesを含み、`plugins`がconfigリストから解決され、`cache`が`enabled`と`directory`を含みます。

## 関連用語

- [[glossary/theme|Theme]]
- [[glossary/plugin|Plugin]]
- [[glossary/content|Content]]
- [[glossary/build|Build]]
