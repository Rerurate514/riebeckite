---
date: 2026-10-08
title: サイトとコンテンツ
sidebar.label: サイトとコンテンツ
sidebar.order: 10
---
# サイトとコンテンツ

## site

`site` では、サイト名、説明、URL、言語などの基本情報を設定します。

ここで指定した値は、ページごとの情報が設定されていない場合の既定値としても使われます。

| 設定 | 型 | 既定値 | 用途 |
| --- | --- | --- | --- |
| `title` | `string` | 必須 | サイト名。ページタイトル、`og:site_name`、JSON-LD の `publisher.name` などに使われる。 |
| `description` | `string` | `""` | サイトの説明。`<meta name="description">`、`og:description`、JSON-LD などに使われる。 |
| `author` | `string` | `""` | サイトの作者。`<meta name="author">` と JSON-LD の `author` に使われる。 |
| `baseUrl` | `string` | `""` | サイトの公開 URL。canonical URL、Open Graph、Feed、Webmention などの URL 生成に使われる。 |
| `locale` | `string` | `"en"` | サイトの言語。`<html lang>` や `og:locale` に使われる。 |
| `twitterSite` | `string` | `""` | `<meta name="twitter:site">` に設定する値。 |
| `defaultOgImage` | `string` | `""` | `og:image` や `twitter:image` に使う既定の画像。 |
| `feed` | `object` | 下記参照 | RSS、Atom、JSON Feed の情報。 |

`title` には空でない文字列を指定する必要があります。

`baseUrl` を指定する場合は、`https://example.com` のような完全な HTTP(S) URL を指定してください。

それ以外の文字列は、省略または空文字にできます。

`locale` は SEO 用の `inLanguage` を生成するときに、`_` が `-` に変換されます。

たとえば `ja_JP` は `ja-JP` として扱われます。

### site.feed

`feed` では、RSS、Atom、JSON Feed に使う情報を設定します。

省略した項目には `site` の設定が使われます。

| 設定 | 型 | 既定値 | 用途 |
| --- | --- | --- | --- |
| `title` | `string` | `site.title` | Feed のタイトル。 |
| `description` | `string` | `site.description` | Feed の説明。 |
| `language` | `string` | `site.locale` | Feed の言語。 |

```ts
site: {
  title: "My site",
  description: "Notes and writing",
  baseUrl: "https://example.com",
  locale: "ja_JP",
  feed: {
    language: "ja",
  },
}
```

## content

`content` では、コンテンツをどこから読み込むか、どのファイルを除外するか、どのノートを公開するかなどを設定します。

| 設定 | 型 | 既定値 | 用途 |
| --- | --- | --- | --- |
| `directory` | `string` | `"content"` | コンテンツを置くディレクトリ。 |
| `source` | `ContentSource` | `undefined` | 独自の読み込み方法を使用する場合に指定する。 |
| `exclude` | `string[]` | `[]` | 読み込み対象から除外するファイルのパターン。 |
| `filters.publishStrategy` | `"explicit"` \| `"selective"` | `"explicit"` | ノートを公開するための既定条件。 |

### content.directory

`directory` では、コンテンツを置くディレクトリを指定します。

```ts
content: {
  directory: "content",
}
```

相対パスを指定した場合は、アプリケーションのルート（`appRoot`）を基準に解決されます。

`configRoot` や `process.cwd()` は基準になりません。

詳しくは [3つの Root](../configuration/roots.ja.md) を参照してください。

### content.source

`source` は、通常のファイル読み込みとは別の方法でコンテンツを取得したい場合に使います。

たとえば、外部サービスや独自の保存先からコンテンツを取得するときに利用できます。

```ts
type ContentSource = {
  scan(): Promise<readonly ContentSourceEntry[]>;
  read(entry: ContentSourceEntry): Promise<string | Uint8Array>;
};

type ContentSourceEntry = {
  path: string;
  metadata?: {
    createdAt?: number;
    modifiedAt?: number;
    size?: number;
    etag?: string;
    hash?: string;
  };
};
```

`scan()` は、読み込めるコンテンツの一覧を返します。

`read()` は、指定されたコンテンツを文字列またはバイト列として返します。

`metadata` は省略可能です。更新日時やサイズ、ハッシュなどを指定すると、キャッシュ処理に利用されます。

`source` を指定すると、通常のファイル読み込みの代わりにこの方法が使われます。

同じコンテンツを `directory` と `source` の両方から読み込む設定にはしないでください。

### content.exclude

`exclude` では、Riebeckite に読み込ませたくないファイルを指定します。

```ts
content: {
  directory: "content",
  exclude: [
    "drafts/**",
    "**/private/**",
    ".obsidian/**",
  ],
}
```

パターンでは次の記号を使用できます。

| 記号 | 意味 |
| --- | --- |
| `*` | 1つのパス区間の中で複数文字に一致 |
| `**` | ディレクトリをまたいで一致 |
| `?` | 任意の1文字に一致 |
| | `exclude: ["drafts"]` は `drafts.md` と一致します |

`exclude` で除外されたファイルは、組み込みのファイルシステムソースには入りません。そのため、リンク解析、グラフ、診断などにも現れません。`content.source` を設定した場合は、そのソース側で同じ除外を行う必要があります。

これは `draft` や `unlisted` とは異なります。

`draft` や `unlisted` は Riebeckite にコンテンツとして読み込まれたうえで、公開ページや一覧などから除外されます。

詳しくは [公開条件](../configuration/content.ja.md#公開条件) を参照してください。

### content.filters.publishStrategy

`publishStrategy` では、ノートを公開するための既定条件を指定します。

| 値 | 公開される条件 |
| --- | --- |
| `"explicit"` | frontmatter に `publish: true` がある |
| `"selective"` | frontmatter に `private: true` と `draft: true` のどちらもない |

たとえば `"explicit"` では、次のように明示的に公開したノートだけが公開されます。

```yaml
---
publish: true
---
```

一方で `"selective"` では、特に非公開と指定されていないノートが公開されます。

frontmatter の `visibility` と `publishAt` は、この設定より優先されます。

公開条件全体については [公開条件](../configuration/content.ja.md#公開条件) を参照してください。
