---
date: 2026-10-08
title: Properties
---
# Properties

ノートの frontmatter を Obsidian 風のプロパティパネルとして描画するプラグインです。プラグインは値を構造化データに変換し、Site がパネルの配置を決めます。

[English](./properties.md)

## できること

`properties()` はスタイルシートの提供、ウィキリンクの依存関係の追跡、変換できない frontmatter 値の警告を行います。描画済みの Markdown 本文は変更しません。

Site はエクスポートされたコンポーネントを描画します。

```tsx
import { Properties } from "@riebeckite/plugin-properties";

<Properties />;
```

props を渡さない場合、`<Properties />` は Site コンテキストから現在の記事を読み取り、`properties()` の PluginConfig とコンポーネントのオプションをマージします。既定のスキャフォールドでは、すでに記事レイアウトに配置されています。

独自レイアウトでは、データを自分で解決してコンポーネントに渡せます。

```tsx
const data = getProperties({
  view: site.view,
  frontmatter: post.frontmatter,
  options: { title: "Metadata" },
});

return <Properties data={data} className="article-properties" />;
```

優先順位は高い順に次のとおりです。

1. `<Properties data={...} />` に渡した明示的な `data`
2. `<Properties options={...} />`
3. `properties()` の PluginConfig
4. 組み込みの既定値

コンポーネントのオプションは PluginConfig の上にマージされます。`fields` はプロパティキー単位でマージされるため、コンポーネント側で指定したキーの設定は PluginConfig 側の同じキーの設定を置き換えます。コンポーネントの `className` はルートクラスに追加され、置き換えません。

## フィールド設定

キーごとの表示方法を宣言します。

```ts
import { properties } from "@riebeckite/plugin-properties";

properties({
  exclude: ["publish", "permalink"],
  fields: {
    tags: { type: "tags", link: true, tagBase: "/tags/", variant: "chips" },
    status: {
      type: "badge",
      variants: { published: "success", draft: "warning" },
    },
    created: { type: "date", format: "yyyy-MM-dd" },
    related: { type: "wikilinks" },
  },
});
```

`fields` は表示だけを制御します。宣言したキーは既定の表示順になりますが、暗黙に include や exclude されることはありません。表示するキーは `include` と `exclude` で決まります。

### フィールド型

| 型 | 値の扱い |
| --- | --- |
| `text` | エスケープしたテキストとして描画。配列はリスト、オブジェクトはグループになる |
| `link` | HTTP(S) またはルート相対 URL をリンクにする。安全でない URL はテキストのまま |
| `tags` | 文字列または配列をタグとして描画。`link` の既定値は `true`、`variant` は `text`、`links`、`chips`。`text` variant と `link: false` はリンクなしで表示する |
| `badge` | 値をバッジとして描画。`variants` は値から CSS の `data-variant` 名への対応表 |
| `date` | ISO 日付または日時を解析して整形。既定の形式は `yyyy-MM-dd` |
| `wikilinks` | `[[ウィキリンク]]` をリンク化。通常の URL はテキストのまま |

設定していないキーには安全な既定の表示が適用されます。

- `tags` / `tag`、または `#` で始まる値はリンク付きタグになる。
- 配列はリストになる。
- ISO 日付文字列と `Date` は `<time>` になる。
- ウィキリンクや HTTP(S) URL を含む文字列はインラインリンクになる。
- 真偽値、数値、オブジェクトはスカラーまたはネストしたグループとして描画される。
- `hideEmpty` が有効な場合、`null`、`""`、`[]`、`{}` は表示しない。

不正な値でも例外は発生しません。エスケープしたテキストとして描画し、`properties-unrenderable-value` の診断を生成します。

### 日付形式

使用できるトークンは `yyyy`、`MM`、`dd`、`HH`、`mm`、`ss` です。時刻は UTC で扱います。それ以外の英字はオプション検証で拒否されます。

```ts
created: { type: "date", format: "yyyy/MM/dd HH:mm" }
```

### 設定の検証

プラグインは設定読み込み時に `fields` を検証します。パスは `plugins[i].options` の下に報告されます。

```text
plugins[0].options.fields.status.type: Expected one of: text, link, tags, badge, date, wikilinks.
```

不明なフィールドオプション、空のタグベース、未対応の日付トークン、文字列でないバッジバリアントも報告されます。

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `title` | `string \| null` | `"Properties"` | パネルの見出し。`null` で省略 |
| `include` | `string[]` | 未設定 | 指定したキーだけを描画 |
| `exclude` | `string[]` | `["publish", "permalink", "aliases", "redirect_from"]` | 非表示にするキー |
| `order` | `string[]` | フィールド宣言順 | 表示順。指定したキーが先、残りは frontmatter 順 |
| `hideEmpty` | `boolean` | `true` | `null`、`""`、`[]`、`{}` を省略 |
| `className` | `string` | `"rb-properties"` | ルート CSS クラス |
| `collapsed` | `boolean` | `false` | `<details>` 要素の中に描画 |
| `fields` | `Record<string, FieldConfig>` | `{}` | プロパティごとの表示設定 |

```ts
properties({
  title: "メタデータ",
  exclude: ["publish", "permalink", "aliases", "redirect_from", "draft"],
  collapsed: true,
});
```

## 構造化データ

`getProperties()` は `PropertiesData` を返します。値は HTML でも配列を文字列化したものでもなく、意味を持つオブジェクトです。

```ts
type PropertiesData = {
  title: string | null;
  className: string;
  collapsed: boolean;
  items: readonly {
    key: string;
    value: PropertyValue;
  }[];
};
```

代表的な値の形は次のとおりです。

```ts
{ kind: "text", text: "Hello" }
{ kind: "link", text: "Note", href: "/note", external: false }
{ kind: "tags", variant: "chips", tags: [{ tag: "web", text: "#web", href: "/tags/web" }] }
{ kind: "badge", text: "published", variant: "success" }
{ kind: "date", value: "2024-01-02", formatted: "2024-01-02" }
{ kind: "inline", parts: [...] }
{ kind: "list", items: [...] }
{ kind: "group", entries: [{ key: "lang", value: { kind: "text", text: "ja" } }] }
```

`renderPropertiesPanel()` も同じモデルを消費するため、パネルとコンポーネントの値の意味は常に一致します。公開型は `@riebeckite/plugin-properties` からインポートできます。

### Publication Boundary

ウィキリンクは Site の `PublicContentView` を通して解決されます。そのため、draft などルーティングされないエントリはプロパティからリンクできず、エスケープしたテキストのまま残ります。ルーティングされる unlisted エントリはリンクできますが、他の場所では非公開のままです。プラグインが公開判定を迂回することはありません。

## 表示と CSS

パネルはセマンティックなマークアップを使います。

```html
<section class="rb-properties" data-properties data-property-count="3">
  <h2 class="rb-properties__title">Properties</h2>
  <dl class="rb-properties__rows">
    <div class="rb-properties__row" data-property-key="tags">
      <dt class="rb-properties__key">tags</dt>
      <dd class="rb-properties__value">
        <ul class="rb-properties__list" data-variant="chips">
          <li class="rb-properties__list-item">
            <a class="rb-properties__tag" data-tag="web" href="/tags/web">#web</a>
          </li>
        </ul>
      </dd>
    </div>
  </dl>
</section>
```

安定したフックは次のとおりです。

- ルート: `.rb-properties[data-properties]`
- 行: `.rb-properties__row[data-property-key]`
- キーと値: `.rb-properties__key`、`.rb-properties__value`
- タグ: `.rb-properties__tag[data-tag]`、コンテナの `[data-variant]`
- バッジ: `.rb-properties__badge[data-variant]`
- 日付: `.rb-properties__date[datetime]`
- リンク: `.rb-properties__link`、外部リンクは `--external` を追加
- リストとグループ: `.rb-properties__list`、`.rb-properties__nested`

```css
.rb-properties__row[data-property-key="tags"] {
  grid-template-columns: 8rem 1fr;
}

.rb-properties__badge[data-variant="warning"] {
  color: var(--site-warning);
}
```

プラグインのスタイルシートはパネル内部の既定表示を担当します。Site の CSS はレイアウトを担当し、上記のフックを上書きできます。テーマの CSS は色とタイポグラフィのトークンを担当します。

外部リンクには `rel="noopener noreferrer"` と `target="_blank"` が付きます。テキストと属性値はすべてエスケープされます。出力する href は HTTP(S)、アンカー、ルート相対パスに限られます。

## エクスポート

- `properties(options?)` / `propertiesPlugin(options?)`：プラグインファクトリ
- `getProperties({ view, frontmatter, options? })`：構造化データのヘルパー
- `<Properties data? options? className? />`：共通レンダラーのコンポーネント
- `renderPropertiesPanel(frontmatter, options?, context?)`：純粋な HTML レンダラー
- `resolvePropertiesOptions(options?)`：既定値の解決
- `validatePropertiesOptions(options?)`：設定の検証
- `buildTagHref(tag, base?)`：タグ URL の正規ビルダー
- `PropertiesData`、`PropertyValue`、`PropertiesFieldConfig`、`PropertiesOptions`、`ResolvedPropertiesOptions`、`PropertiesRenderContext`、`PropertiesLinkResolver`、`PropertiesMessage`

## 関連資料

- [[plugin-api|プラグインシステム]]
- [[configuration-reference|設定リファレンス]]
