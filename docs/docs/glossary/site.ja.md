---
date: 2026-10-14
title: サイト（Site）
sidebar:
  hidden: true
---

# サイト（Site）

サイトアプリケーションは、ルート、ドキュメントフレーム、メタデータ、HTMLの安全性を所有します。`@riebeckite/honox` インテグレーションを通じてRiebeckite Coreの振る舞いをHonoXとViteにつなぎ、プラグインの提供物を最終的な公開UIにどう組み立てるかを決めます。

## アプリケーションの構成

サイトは次のソースディレクトリを持ちます（インテグレーション、テーマ、プラグインには含まれません）。

```text
app/routes/       — URL handling, page composition, redirects, response metadata
app/components/ — Reusable site presentation and composition of public UI primitives
app/islands/      — Optional interactive UI and its client-side state
app/style.css     — Visual tokens, layout, typography, and imports of generated extension styles
```

## ルートの解決

ルートリゾルバ（`resolveRiebeckiteContentRequest`）が、コンテンツ、プラグインページ、リダイレクト、not-foundを順に解決します。

プラグインは情報とUIの断片を提供し、どこに描画するかはサイトが決めます。

## プラグインUIの組み立て

プラグインは `headTags` を提供し、データヘルパーとJSXコンポーネントを公開します。サイトは自分のTSXでこれらのコンポーネントを組み立て、それぞれを描画するか、どこに、何回描画するかを選びます。各プラグインのデータヘルパーは `PublicContentView`（または同様のフィルタ済みファサード）を受け取り、型付きモデルを返します。そのコンポーネントをサイトの記事レイアウトやページテンプレートが直接描画します。

プラグインUIは明示的に組み立てます。

```tsx
const view = createPublicContentView(manifest);
const entry = view.findRoutableBySlug(slug);
const backlinks = await getBacklinks({ view, slug });
<Backlinks backlinks={backlinks} />
```

および

```tsx
const data = getProperties({ view, frontmatter: entry.frontmatter });
<Properties data={data} />
```

レイアウトの配置はサイトが決めます。プラグインのコンポーネントは、インテグレーションを通じて登録される任意のCSSとクライアントエントリも公開できます。

## SiteConfigの構造

`packages/core/src/types/site_config.ts` の `SiteConfig` インターフェースがサイトのメタデータを定義します。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `title` | `string` | サイトタイトル。`<title>` と見出しで使う |
| `description` | `string \| undefined` | サイトの説明メタタグ |
| `author` | `string \| undefined` | 著者名。メタデータで使う |
| `baseUrl` | `string \| undefined` | サイトのベースURL（例：`https://example.com`） |
| `locale` | `string \| undefined` | ロケールコード（例：`en`、`ja`） |
| `twitterSite` | `string \| undefined` | Twitterカードの帰属を示す `@` ハンドル |
| `defaultOgImage` | `string \| undefined` | ページごとの画像がないときの既定のog:image |
| `feed` | `{ title?: string; description?: string; language?: string } \| undefined` | RSS/Atomフィードの設定 |

各フィールドは次のように使われます。
- **title**：文書の `<title>` とページ見出しに描画されます
- **description**：`<meta name="description">` タグとして追加されます
- **author**：著者メタデータとschema.orgマークアップに追加されます
- **baseUrl**：正規URLとサイトマップの生成に使われます
- **locale**：`<html>` の `lang` 属性を設定し、書式にも影響します
- **twitterSite**：Twitterカードのメタデータに追加されます
- **defaultOgImage**：ページごとの画像がない場合の `og:image` の既定値として使われます
- **feed**：サイトのRSS/Atomフィードの生成に使われます

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

上記のフィールドは `@riebeckite/honox` インテグレーション（`packages/core/src/`）を通じて流れ、最終的な公開UIを組み立てます。`title` と `description` は `<head>` に、`author` と `twitterSite` はソーシャルメタデータに、`baseUrl` はURL生成に、`locale` は `lang` 属性に反映されます。

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
