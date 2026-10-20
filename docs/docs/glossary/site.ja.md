---
title: Site
sidebar:
  hidden: true
---

# Site

サイトのapplicationは、route、文書の枠組み、メタデータ、HTMLの安全性を持ちます。`@riebeckite/honox`のintegrationを通じてRiebeckiteのCoreの振る舞いをHonoXとViteにつなぎ、Pluginの提供物を最終的な公開UIにどう組み立てるかを決めます。

## Applicationの構成

サイトは次のソースディレクトリを持ちます（integration、Theme、Pluginには含まれません）。

```text
app/routes/       — URL の処理、ページ構成、redirect、レスポンスのメタデータ
app/components/ — 公開 UI プリミティブの再利用可能な表示と構成
app/islands/      — 対話的 UI とそのクライアント側の状態
app/style.css     — 視覚的なトークン、レイアウト、タイポグラフィ、生成された拡張スタイルの読み込み
```

## Routeの解決

routeのresolver（`resolveRiebeckiteContentRequest`）が、content、Pluginページ、redirect、not-foundを順に解決します。

Pluginは情報とUIの断片を提供し、どこに描画するかはサイトが決めます。

## Plugin UI 組み立て

Plugin は `headTags` を貢献し、データヘルパーと JSX コンポーネントを公開します。Site は自分の TSX でこれらのコンポーネントを組み立て、それぞれの表示有無、位置、頻度を決めます。各 Plugin のデータヘルパーは `PublicContentView`（または同様のフィルタされたファサード）を受け取り、型付き model を返します。その後、component はサイトの記事レイアウトやページテンプレートで直接描画されます。

Plugin UI は明示的に composition します：

```tsx
const view = createPublicContentView(manifest);
const entry = view.findRoutableBySlug(slug);
const backlinks = await getBacklinks({ view, slug });
<Backlinks backlinks={backlinks} />
```

と

```tsx
const data = getProperties({ view, frontmatter: entry.frontmatter });
<Properties data={data} />
```

Site はレイアウトの配置を決定します。Plugin コンポーネントは選択的な CSS と client entry をエクスポートでき、integration を通じて登録されます。

## SiteConfig 構造

`packages/core/src/types/site_config.ts` から全 `SiteConfig` インターフェースはサイトのメタデータを定義します：

| フィールド | タイプ | 説明 |
| --- | --- | --- |
| `title` | `string` | `<title>` と見出しで使用されます |
| `description` | `string \| undefined` | site description meta tag |
| `author` | `string \| undefined` | メタデータの著者名 |
| `baseUrl` | `string \| undefined` | サイトの基本URL（例：`https://example.com`） |
| `locale` | `string \| undefined` | ロケールコード（例：`en`、`ja`） |
| `twitterSite` | `string \| undefined` | Twitter `@` ハンドル カード帰属 |
| `defaultOgImage` | `feed \| undefined` | RSS/Atom フィードの設定（title、description、language） |

各フィールドは以下のように使用されます：
- **title**: 文書 `<title>` とページ見出しでレンダリングされます
- **description**: `<meta name="description">` タグとして追加されます
- **author**: 著者メタデータと schema.org マークアップに追加されます
- **baseUrl**: 正規URLとsitemapの生成に使用されます
- **locale**: `<html>` の `lang` 属性を設定し、フォーマットに影響を与えます
- **twitterSite**: Twitter card メタデータに追加されます
- **defaultOgImage**: ページごとの画像が提供されない場合の `og:image` のデフォルト値として使用されます
- **feed**: サイトの RSS/Atom フィードを生成するために使用されます

```ts
export interface SiteConfig {
  title: string;
  description?: string;
  author?: string;
  baseUrl?: string;
  locale?: string;
  twitterSite?: string;
  defaultOgImage?: string;
  feed?: {
    title?: string;
    description?: string;
    language?: string;
  };
}
```

## フィールドのサイト全体での使用

上記のフィールドは、`@riebeckite/honox` integration (`packages/core/src/`) を通じて最終的な公開 UI を組み立てるために流れます。`title` と `description` は `<head>` に表示され、`author` と `twitterSite` はソーシャルメタデータに、`baseUrl` は URL 生成に、`locale` は `lang` 属性に影響を与えます。

## 関連用語

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/ui|UI]]

## さらに詳しく

- [HonoX Site](../framework/honox-integration/site.ja.md)