# 発見導線のレシピ

Riebeckite には「homepage 専用の framework」はありません。Homepage と、読者がサイトを見て回るためのページは、既存の Plugin が提供する Page Type、Markdown ブロック、`navigation` plugin の組み合わせで作ります。

このガイドでは、よくある発見導線 — Featured、最新記事、全記事一覧、Tag、Folder、Series、Archive — のレシピを集め、それぞれが使う Plugin とオプションを対応づけます。どのレシピも公開されている Plugin API と Core の設定だけで成立し、新しい Core 機能は必要ありません。

## 覚えておくこと

Plugin を有効にするとページは登録されますが、Header や Footer にリンクは追加されません。リンクは `navigation({ items })` に自分で追加します。

```ts
navigation({
  secondary: [
    { label: "Posts", href: "/posts" },
    { label: "Tags", href: "/tags" },
  ],
})
```

Route は定数ではなく設定です。Tags の一覧、Series の一覧、Archive にはそれぞれ base path のオプションがあり、以下の例のパスは既定値であって固定値ではありません。Header / Footer の考え方は [サイトのカスタマイズ](./customizing-your-site.md) を参照してください。

## starter が最初から用意しているもの

`starter` preset は、多くのサイトが必要とする部品をすでに登録しています。

- 生成される Homepage の **最新記事**（`recent-posts`）
- `taxonomy` による **Tag / Folder** の一覧ページ（既定は `/tags` と `/folders`）
- `series` による **Series** の一覧と landing ページ（既定は `/series`）
- 記事ヘッダーの **パンくず**（`breadcrumbs`）

`query`、`dataview`、`archive`、`folder-pages` は package としては利用できますが、`starter` には登録されていません。レシピで必要になった時点で追加します。各 preset の構成は [Presets](../getting-started/presets.md) を参照してください。

## 最新記事

これは既定で有効です。生成される `app/routes/index.tsx` が最新記事を集め、Homepage の本文の後に描画します。

```tsx
import { RecentPosts, getRecentPosts } from "@riebeckite/plugin-recent-posts";
import { config } from "../config";
import { content } from "../content";

const recentPosts = await getRecentPosts({
  posts: manifest.discoverableEntries,
  config,
  getProcessedContent: (slug) => content.getProcessedContent(slug),
  resolveTitle: (slug, title) => title,
});
```

`getRecentPosts()` は既定で 5 件を返し、非公開のノートと `index` ノートを除外して `date`（無ければ `created`）で並べます。件数や表示位置を変えたい場合は route を編集します。`limit` を渡すと既定値を上書きできます。日付を解釈できないノートは除外されます。`recent-posts` の Markdown ブロックはなく、Site が配置する component です。

## Featured

「Featured」は Core の概念ではなく、frontmatter のフラグか Tag で表します。`featured: true` を付けたノートを用意します。

```yaml
---
title: A hand-picked article
featured: true
---
```

Homepage には `query` ブロックで描画します。まず `@riebeckite/plugin-query` を install して登録します（`starter` には含まれません）。

```ts
plugins: [queryPlugin()],
```

````md
```query
filter:
  frontmatter:
    featured: true
sort:
  field: date
  order: desc
limit: 3
format: list
```
````

Tag でも同じことができ、Obsidian からはこちらのほうが付けやすくなります。ノートに `featured` を付けて、Tag で絞り込みます。

````md
```query
filter:
  tags:
    any: [featured]
sort:
  field: date
  order: desc
limit: 3
format: list
```
````

`@riebeckite/plugin-dataview` を使えば、同じ内容を Dataview の構文でも書けます。

````md
```dataview
LIST file.date
FROM #featured
SORT file.date desc
LIMIT 3
```
````

`query` も `dataview` もビルド時に実行され、client JavaScript は追加しません。ただし、これらが生成するリンクは content graph には入らないため、backlinks は作られません。

## 全記事一覧

全記事一覧は、フィルタの無い `query` です。専用のノートを用意し、たとえば `content/posts.md` に書いて `navigation` plugin からリンクします。

````md
---
title: All posts
---

# All posts

```query
sort:
  field: date
  order: desc
format: list
excludeSelf: true
```
````

`excludeSelf: true` は `posts` ノート自身を一覧から除きます。`format: table` と `columns` を使えば表にもできます。

````md
```query
sort:
  field: date
  order: desc
format: table
columns: [title, date, tags]
excludeSelf: true
```
````

平坦な一覧ではなく月ごとに見せたい場合は、後述の Archive のレシピを使います。

## Tag

`taxonomy` は `tagsBasePath`（既定 `/tags`）に Tag 一覧を、`tagsBasePath/<slug>` に各 Tag のページを生成します。`starter` ではすでに登録されています。読者がたどれるよう Navigation にリンクを追加します。

```ts
navigation({ secondary: [{ label: "Tags", href: "/tags" }] })
```

`/tags` が既存のコンテンツと衝突する場合は prefix を変更します。

```ts
taxonomy({ tagsBasePath: "/topics" }),
```

各 Tag のページには RSS、Atom、JSON の feed も一緒に出力されます。Tag だけが欲しい場合は `folders: false` を指定します。

## Folder

Folder の形をした導線は2つあり、併用できます。

- `taxonomy` は `foldersBasePath`（既定 `/folders`）に Folder ごとのノート一覧を生成し、Folder ごとのページを作ります。
- `folder-pages` は各 Folder をその Folder のパス（たとえば `/notes/`）の landing ページにし、Folder 内の `README.md` や `index.md` をその landing ページへ集約します。

Folder 一覧を使う場合は、taxonomy のパスを Navigation に追加します。

```ts
navigation({ secondary: [{ label: "Folders", href: "/folders" }] })
```

prefix は `taxonomy({ foldersBasePath: "/directories" })` で変更できます。`folder-pages` は `README.md` と `index.md` の解決先を変えるため、Folder ごとの landing ページが欲しい場合だけ有効にします。`starter` には登録されていません。

## Series

Series は `series` frontmatter キーを共有するノートの集まりです。`series` は `starter` に含まれ、各パートに前後ナビを追加します。さらに `basePath`（既定 `/series`）に一覧ページを、`basePath/<name>` に Series ごとの landing ページを生成します。

```yaml
---
title: Part 1
series: Build a thing
series_order: 1
---
```

一覧を `navigation` plugin からリンクします。

```ts
navigation({ secondary: [{ label: "Series", href: "/series" }] })
```

prefix は `series({ basePath: "/guides" })` で変更できます。`basePath: ""` にすると生成ページを無効にし、export されている `buildSeriesIndex()` や `renderSeriesIndex()` で自分で描画できます。

## Archive

`archive` は `basePath/<yyyy>/<mm>`（既定 `/archive`）に月ごとの一覧ページを、ページネーション付きで生成します。Plugin を追加します。

```ts
plugins: [archive()],
```

base path にリンクします。

```ts
navigation({ secondary: [{ label: "Archive", href: "/archive" }] })
```

`archive({ basePath: "/history", pageSize: 20 })` で prefix や 1 ページの件数を変更できます。`pageSize: 0` にすると月ごとに 1 ページのままになります。

## 組み合わせる

ブログ風の Homepage は、これらをいくつか組み合わせます。

1. `content/index.md` の導入文。
2. Featured ノートの `query` ブロック。
3. 生成される Homepage route の `<RecentPosts />`。
4. `/tags`、`/series`、`/archive` への Navigation リンク。

Docs 風のサイトは `folder-pages` を section の landing に、`series` を順序付きガイドに使います。ネストした Folder が少ない Vault なら Folder ページは使わなくてもかまいません。手持ちのコンテンツに合う部品を選んでください。

## このガイドで必要としないもの

ここで挙げたレシピは、新しい抽象化を意図的に避けています。Homepage framework も Featured API も Core の Discovery registry もありません。Featured、全記事一覧、Archive はすべて既存 Plugin、Markdown ブロック、`navigation` plugin の組み合わせです。

## 次に読むページ

- [サイトのカスタマイズ](./customizing-your-site.md) — Header / Footer と Body Slot の考え方
- [Presets](../getting-started/presets.md) — 各 preset が登録する Plugin
- [Plugins](../plugins/README.md) — Plugin カタログ
- [Plugin API](../reference/plugin-api.md) — Page Type、Body Slot、CSS Hook
