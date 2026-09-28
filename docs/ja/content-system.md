# Content System

## 明確な二つの責務

`ContentSource` は source data を発見して読む boundary です。scan/read、identity、mtime・size・ETag・hash などの metadata を所有します。ローカル標準実装は `FileSystemContentSource` です。

`ContentManager` は data の意味を扱います。parse、Markdown/HTML pipeline、post processing、plugin orchestration、manifest 作成、content graph 構築を担当します。filesystem を直接扱う機能をここへ足して ContentSource を迂回しないでください。

```text
scan/read
  -> public location を解決        (default resolver + plugin hooks)
  -> parse post -> process post -> manifest -> graph
                      `------ plugin lifecycle/content hooks ------'
```

URL を必要とする content を処理する前に public location を解決するため、consumer が URL を自前で組み立てる必要はありません。Plugin は config resolved、content loaded、post parsed/processed、manifest created、build start/end などの phase に定義済み hooks で参加します。source I/O、意味の解釈、rendering を分けることで、Core policy を変えずに remote source へ差し替えられます。

## Public Location と URL

Content entry は二つの identity を分けて持ちます。

- **slug** — `contentIndex`、manifest の `bySlug`、content graph、`/explore?note=<slug>` のような application 内の selection key に使う内部 lookup key。
- **permalink** — article link、feed、sitemap、metadata に使う解決済みの canonical public URL。

両者は別物です。public URL が必要な consumer は `ContentManifestEntry.permalink`（`entry.publicLocation` も同じ）を読み、slug や filesystem path から URL を組み立てません。slug から URL を作るのは Core の default resolver だけです。

解決は単一の stateless な流れです。

1. Core は全 entry を正式な default resolver `resolveDefaultContentLocation(content)` で初期化します（`content` は `ContentLocationInput` = `slug` / `path` / `markdown`）。既定 policy は `index` → `/`、それ以外 → `/{slug}` です。これは互換 fallback ではなく Core の default public-location policy です。
2. 有効な Plugin は optional な `resolveContentLocations` hook で location を置き換えられます。hook は `ContentLocationInput` の一覧を受け取り `ContentPublicLocation` を返します。Plugin 固有の URL strategy は Plugin 内に閉じます。
3. `ContentManager.getContentLocations()` が解決済みの `ReadonlyMap<string, ContentPublicLocation>` を返します。`ContentPublicLocation` は canonical な `permalink`、任意の `redirects`、Core が解釈しない opaque な `metadata` を持ちます。

Manifest は解決結果を保持します（`ContentManifestEntry.permalink` / `.publicLocation`、`byPermalink` 索引、`redirects`）。content graph と `readOnlyContentGraph(source, locations)` は URL を再生成せず、この解決済み entry を使います。location が未解決の場合は slug 由来 URL で補わず、明示的な error にします。

Manifest は application が使う生成済み content 表現、content graph は関係表現です。runtime manifest の参照は明示的 build ではありません。incremental state は explicit build 専用で、Worker runtime の可変依存にはできません。

## Content query

Core は解決済み manifest entry に対する portable な query 層を公開します。

- `queryContentEntries(entries, spec)` は tag、folder、frontmatter、date 期間で絞り込み、複数の sort key を適用し、`limit`/`offset` で切り出します。
- `groupContentEntries(entries, groupBy, options)` は同じ selection を行ったうえで、tag、folder、date の粒度（`year`/`month`/`day`）、frontmatter field ごとに grouping します。

どちらも `ContentManifestEntry` を対象とするため、link には解決済みの `permalink` を使います。slug から content の公開 URL を組み立てることはありません。Application と Plugin はこれらを組み合わせて一覧 page や taxonomy 表示を作り、routing は Core の責務にしません。

canonical content identity を source/manifest/graph で保ち、slug と permalink を別概念として public URL は解決済み `ContentPublicLocation` からのみ取得し、metadata を過信せず、publication/exclusion policy を config に表し、recoverable error を黙って content から落とさず diagnostics にします。
