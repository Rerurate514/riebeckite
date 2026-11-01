---
date: 2026-10-08
title: 発見導線のレシピ
---
# 発見導線のレシピ

Riebeckite には「ホームページ専用のフレームワーク」はありません。ホームページと、読者がサイトを見て回るためのページは、既存のプラグインが提供するページ種別で作ります。Markdown ブロックと `navigation` プラグインを組み合わせてページを作成します。

このガイドでは、注目記事、最新記事、全記事一覧、タグ、フォルダー、シリーズ、アーカイブといったよくある発見導線のレシピを集めます。それぞれが使うプラグインとオプションを対応づけます。どのレシピも公開されているプラグイン API と Core の設定だけで成立し、新しい Core 機能は必要ありません。

## 覚えておくこと

プラグインを有効にするとページは登録されますが、ヘッダーやフッターにリンクは追加されません。リンクは `navigation({ items })` に自分で追加します。

```ts
navigation({
  secondary: [
    { label: "Posts", href: "/posts" },
    { label: "Tags", href: "/tags" },
  ],
})
```

ルートは定数ではなく設定です。タグの一覧、シリーズの一覧、アーカイブにはそれぞれベースパスのオプションがあり、以下の例のパスは既定値であって固定値ではありません。ヘッダー / フッターの考え方は [サイトのカスタマイズ](./customizing-your-site.ja.md) を参照してください。

## starter が最初から用意しているもの

`starter` プリセットは、多くのサイトが必要とする部品をすでに登録しています。

- 生成されるホームページの **最新記事**（`recent-posts`）
- `taxonomy` による **Tag / Folder** の一覧ページ（既定は `/tags` と `/folders`）
- `folder-pages` による **フォルダーのランディングページ** と `README.md` / `index.md` の本文
- 記事ヘッダーの **パンくず**（`breadcrumbs`）
- `hover-preview` による公開済み内部リンクの **リンクプレビュー**

`query`、`dataview`、`archive`、`series` はパッケージとしては利用できますが、`starter` には登録されていません。レシピで必要になった時点で追加します。各プリセットの構成は [プリセット](../getting-started/presets.ja.md) を参照してください。

## 最新記事

これは既定で有効です。生成される `app/routes/index.tsx` が最新記事を集め、ホームページの本文の後に描画します。

```tsx
import { RecentPosts, getRecentPosts } from "@riebeckite/plugin-recent-posts";
import { content } from "../content";

const recentPosts = getRecentPosts({ manifest: await content.getManifest() });
```

`getRecentPosts()` は既定で 5 件を返し、`manifest.discoverableEntries` を読みます。unlisted 、 draft 、予約公開のノートと `index` ノートは対象外で、`date`（無ければ `created`）で並べます。件数や表示位置を変えたい場合はルートを編集します。`limit` を渡すと既定値を上書きできます。日付を解釈できないノートは除外されます。`recent-posts` の Markdown ブロックはなく、サイトが配置するコンポーネントです。

## 注目記事

「注目記事」は Core の概念ではなく、frontmatter のフラグかタグで表します。`featured: true` を付けたノートを用意します。

```yaml
---
title: A hand-picked article
featured: true
---
```

ホームページには `query` ブロックで描画します。まず `@riebeckite/plugin-query` をインストールして登録します（`starter` には含まれません）。

```ts
plugins: [query()],
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

全記事一覧は、フィルタの無い `query` です。専用のノートを用意し、たとえば `content/posts.md` に書いて `navigation` プラグインからリンクします。

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

## タグ

`taxonomy` は `tagsBasePath`（既定 `/tags`）に Tag 一覧を、`tagsBasePath/<slug>` に各 Tag のページを生成します。`starter` ではすでに登録されています。読者がたどれるよう Navigation にリンクを追加します。

```ts
navigation({ secondary: [{ label: "Tags", href: "/tags" }] })
```

`/tags` が既存のコンテンツと衝突する場合は prefix を変更します。

```ts
taxonomy({ tagsBasePath: "/topics" }),
```

各 Tag のページには RSS、Atom、JSON の feed も一緒に出力されます。Tag だけが欲しい場合は `folders: false` を指定します。

## フォルダー

Folder の形をした導線は2つあり、併用できます。

- `taxonomy` は `foldersBasePath`（既定 `/folders`）に Folder ごとのノート一覧を生成し、Folder ごとのページを作ります。
- `folder-pages` は各フォルダーを、そのフォルダーのパス（たとえば `/notes/`）のランディングページにします。フォルダー内の `README.md` や `index.md` はそのランディングページへ集約します。

Folder 一覧を使う場合は、taxonomy のパスを Navigation に追加します。

```ts
navigation({ secondary: [{ label: "Folders", href: "/folders" }] })
```

prefix は `taxonomy({ foldersBasePath: "/directories" })` で変更できます。`starter` では `folder-pages` も有効です。そのため、公開対象を含むフォルダーごとにランディングページが作られ、フォルダー内の `README.md` や `index.md` はその本文になります。タクソノミーの一覧を読者に見せる場合は `/folders` をナビゲーションに追加します。コンテンツから組み立てるナビゲーションは公開済みノートとフォルダーの所有者をたどります。

## シリーズ

シリーズは `series` frontmatter キーを共有するノートの集まりです。次のものが必要な場合は、`@riebeckite/plugin-series` をインストールして登録します。各パートの前後ナビ、`basePath`（既定 `/series`）の一覧、`basePath/<name>` のシリーズごとのランディングページです。

```ts
import { series } from "@riebeckite/plugin-series";

plugins: [series()]
```

```yaml
---
title: Part 1
series: Build a thing
series_order: 1
---
```

一覧を `navigation` プラグインからリンクします。

```ts
navigation({ secondary: [{ label: "Series", href: "/series" }] })
```

prefix は `series({ basePath: "/guides" })` で変更できます。`basePath: ""` にすると生成ページを無効にし、export されている `buildSeriesIndex()` や `renderSeriesIndex()` で自分で描画できます。

## アーカイブ

`archive` は `basePath/<yyyy>/<mm>`（既定 `/archive`）に月ごとの一覧ページを、ページネーション付きで生成します。プラグインを追加します。

```ts
plugins: [archive()],
```

base path にリンクします。

```ts
navigation({ secondary: [{ label: "Archive", href: "/archive" }] })
```

`archive({ basePath: "/history", pageSize: 20 })` で prefix や 1 ページの件数を変更できます。`pageSize: 0` にすると月ごとに 1 ページのままになります。

## 組み合わせる

ブログ風のホームページは、これらをいくつか組み合わせます。

1. `content/index.md` の導入文。
2. Featured ノートの `query` ブロック。
3. 生成されるホームページのルートにある `<RecentPosts />`。
4. `/tags` や `/archive` など、有効にした発見導線への Navigation リンク。

ドキュメント風のサイトでは、starter に含まれる `folder-pages` をセクションのランディングに使い、順序付きガイドには `series` を追加できます。ネストしたフォルダーが少ない Vault ならフォルダーページを外してもかまいません。手持ちのコンテンツに合う部品を選んでください。

## このガイドで必要としないもの

ここで挙げたレシピは、新しい抽象化を意図的に避けています。ホームページ用のフレームワークも、注目記事の API も、Core の Discovery レジストリもありません。注目記事、全記事一覧、アーカイブはすべて既存のプラグイン、Markdown ブロック、`navigation` プラグインの組み合わせです。

## 次に読むページ

- [サイトのカスタマイズ](./customizing-your-site.ja.md)：ヘッダー / フッターとプラグインコンポーネントの考え方
- [プリセット](../getting-started/presets.ja.md)：各プリセットが登録するプラグイン
- [プラグイン](../plugins/README.ja.md)：プラグインの一覧
- [プラグイン API](../reference/plugin-api.ja.md)：ページ種別、プラグインコンポーネント、CSS フック
