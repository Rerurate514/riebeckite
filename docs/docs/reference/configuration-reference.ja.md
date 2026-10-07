# Configuration リファレンス

このページでは、`riebeckite.config.ts` で指定できる設定をまとめています。

設定ファイルやコンテンツの場所がどのように決まるか、どのノートが公開されるかなど、設定の仕組みについて詳しく知りたい場合は [Configuration](./configuration.ja.md) を参照してください。

## config ファイルの書き方

アプリケーションのルートに `riebeckite.config.ts` を作成し、`defineConfig` で設定を記述します。

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: {
    title: "My site",
    baseUrl: "https://example.com",
  },
});
```

`defineConfig` は、設定内容を型チェックしやすくするための補助関数です。設定内容そのものを変更する処理は行いません。

Riebeckite が設定ファイルを読み込めるように、`export default` で設定を公開してください。

Vite integration では、通常はアプリケーションのルートにある `riebeckite.config.ts` が使われます。

CLI から実行した場合は、現在のディレクトリから親ディレクトリへ向かって設定ファイルを探します。次のファイル名に対応しています。

- `riebeckite.config.ts`
- `riebeckite.config.js`
- `riebeckite.config.mjs`

設定ファイルを別の場所や別の名前にしたい場合は、`riebeckiteVite()` の `configRoot` と `configFile` で変更できます。

### 主な設定

| 設定 | 必須 | 用途 |
| --- | --- | --- |
| `site` | はい | サイト名やURLなどの基本情報 |
| `content` | いいえ | コンテンツの読み込み元や公開条件 |
| `theme` | いいえ | サイトの見た目 |
| `plugins` | いいえ | Riebeckiteに追加する機能 |
| `cache` | いいえ | ビルド結果のキャッシュ |

必須なのは `site` だけです。

それ以外の設定を省略した場合は、それぞれ既定値が使われます。

## site

`site` では、サイト名、説明、URL、言語などの基本情報を設定します。

ここで指定した値は、ページごとの情報が設定されていない場合の既定値としても使われます。

| 設定 | 型 | 既定値 | 用途 |
| --- | --- | --- | --- |
| `title` | `string` | 必須 | サイト名。ページタイトル、`og:site_name`、JSON-LD の `publisher.name` などに使われる。 |
| `description` | `string` | `""` | サイトの説明。`<meta name="description">`、`og:description`、JSON-LD などに使われる。 |
| `author` | `string` | `""` | サイトの作者。`<meta name="author">` と JSON-LD の `author` に使われる。 |
| `baseUrl` | `string` | `""` | サイトの公開URL。canonical URL、Open Graph、Feed、Webmention などのURL生成に使われる。 |
| `locale` | `string` | `"en"` | サイトの言語。`<html lang>` や `og:locale` に使われる。 |
| `twitterSite` | `string` | `""` | `<meta name="twitter:site">` に設定する値。 |
| `defaultOgImage` | `string` | `""` | `og:image` や `twitter:image` に使う既定の画像。 |
| `feed` | `object` | 下記参照 | RSS、Atom、JSON Feed の情報。 |

`title` には空でない文字列を指定する必要があります。

`baseUrl` を指定する場合は、`https://example.com` のような完全な HTTP(S) URLを指定してください。

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

詳しくは [3つの Root](./configuration/roots.ja.md) を参照してください。

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

`exclude` で除外されたファイルは、Riebeckite のコンテンツ処理そのものに入りません。

そのため、リンク解析、グラフ、診断などにも現れません。

これは `draft` や `unlisted` とは異なります。

`draft` や `unlisted` はRiebeckiteにコンテンツとして読み込まれたうえで、公開ページや一覧などから除外されます。

詳しくは [公開条件](./configuration/content.ja.md#公開条件) を参照してください。

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

公開条件全体については [公開条件](./configuration/content.ja.md#公開条件) を参照してください。

## theme

`theme` では、サイトの見た目を設定します。

設定方法は大きく2種類あります。

1. `ThemeConfig` を直接記述する
2. Theme パッケージが提供する関数を使う

`theme` を指定しなかった場合は、Riebeckite の既定 Theme が使われます。

### ThemeConfig を直接指定する

| 設定 | 型 | 既定値 | 用途 |
| --- | --- | --- | --- |
| `name` | `string` | `"riebeckite"` | Theme の識別名。`data-theme-name` に設定される。 |
| `colorMode` | `"light"` \| `"dark"` \| `"system"` | `"system"` | 明るい表示・暗い表示・OS設定への追従を選ぶ。 |
| `typography` | `"system"` \| `"serif"` \| `"sans"` | `"system"` | 使用するフォントの種類を選ぶ。 |
| `articleLayout` | `"article"` \| `"sidebar"` \| `"full-width"` | `"article"` | 記事ページのレイアウトを選ぶ。 |
| `tokens` | `ThemeDesignTokens` | `{}` | 色、フォント、幅などの共通デザイン値を変更する。 |
| `attributes` | ``Record<`data-${string}`, string \| undefined>`` | `{}` | 独自の `data-*` 属性を追加する。 |
| `userCss` | `string[]` | `[]` | 独自のCSSファイルを追加する。 |

`colorMode: "system"` の場合は `data-theme` を設定せず、OS の設定に従います。

`typography` の値は `data-typography` に、`articleLayout` の値は `data-article-layout` に設定されます。

`attributes` では独自の `data-*` 属性を追加できます。

ただし、Riebeckite が使用する次の属性は上書きできません。

- `data-theme`
- `data-theme-name`
- `data-typography`
- `data-article-layout`

### theme.tokens

`tokens` では、サイト全体で使用する色、フォント、レイアウトなどの共通値を変更できます。

#### 色

| 設定 |
| --- |
| `paper` |
| `ink` |
| `muted` |
| `accent` |
| `border` |
| `borderStrong` |
| `surface` |
| `surfaceHover` |
| `overlay` |
| `danger` |
| `success` |
| `codeBackground` |

#### フォント

| 設定 |
| --- |
| `bodyFont` |
| `headingFont` |
| `monoFont` |

#### レイアウト

| 設定 |
| --- |
| `pageMaxWidth` |
| `articleMaxWidth` |
| `sidebarWidth` |
| `contentGap` |

これらの値は、それぞれ `--rb-*` 形式の CSS カスタムプロパティとして出力されます。

詳しい対応関係は [Design tokens](./theme-api.ja.md#design-tokens) を参照してください。

`theme.tokens` は Theme の stylesheet より後に、layer に属さない `:root { --rb-* }` として出力されるため、ここで設定した値は Light、明示 Dark、System Dark のいずれでも Theme の値を上書きします。Theme の CSS をコピーするのではなく、アクセントや surface はここで調整してください。

```ts
theme: {
  colorMode: "system",
  typography: "serif",
  articleLayout: "sidebar",
  tokens: {
    color: {
      accent: "#c2410c",
    },
  },
  userCss: ["/app/custom.css"],
}
```

`userCss` には、ブラウザからアクセスできるCSSファイルのパスを指定します。

指定したCSSは Theme のCSSより後に読み込まれるため、Theme のスタイルを上書きできます。

### Theme パッケージを使う

Theme パッケージを利用する場合は、Theme が提供する関数の結果を `theme` に指定します。

```ts
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  site: {
    title: "My site",
  },
  theme: rerurateTheme({
    colorMode: "system",
    motion: true,
  }),
});
```

Theme ごとに利用できる設定は異なります。

たとえば上の `motion` は `rerurateTheme` が提供する設定であり、Riebeckite Core 共通の設定ではありません。

各 Theme の設定については、その Theme のドキュメントを確認してください。

Theme の仕組みについては [Theme system](./theme-api.ja.md) を参照してください。

## plugins

`plugins` では、Riebeckite に追加する機能を指定します。

```ts
plugins: [
  obsidianMarkdown(),
  enableSearch && searchPlugin(),
]
```

`false`、`null`、`undefined` は自動的に無視されます。

そのため、上のように条件によってプラグインを有効・無効にできます。

有効なプラグインは `order` の値に従って実行順が決まります。

同じ `name` を持つプラグインを複数指定すると、設定エラーになります。

また、プラグインが必要とする機能を利用できるかどうかも確認されます。

プラグインが `validateOptions` を提供している場合は、設定を読み込むときにプラグイン固有の設定内容も検証されます。

各プラグインで利用できる設定については [Plugins](../plugins/README.ja.md) を参照してください。

プラグインの仕組みについて詳しく知りたい場合は [Plugin system](./plugin-api.ja.md) を参照してください。

## cache

`cache` では、ビルド結果のキャッシュを設定します。

キャッシュを利用すると、前回のビルド結果を再利用できるため、変更されていないコンテンツの処理を省略できます。

| 設定 | 型 | 既定値 | 用途 |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | キャッシュを使用するかどうか。 |
| `directory` | `string` | `<buildDirectory>/cache` | キャッシュを保存する場所。 |

```ts
cache: {
  enabled: true,
}
```

`enabled: false` にするとキャッシュを使用せず、毎回すべてを処理します。

`directory` を指定すると、キャッシュの保存先を変更できます。

キャッシュを無効化したり保存先を変更したりしても、最終的に生成されるサイトの内容は変わりません。変わるのは主にビルド時間です。

詳しくは [Build cache](./configuration/cache.ja.md#build-cache) を参照してください。

## Config の検証

設定に問題がある場合は `ConfigValidationError` が発生します。

エラーには、問題が見つかった設定の場所と、その理由が表示されます。

設定を変更したあとは、`check` を実行して問題がないことを確認できます。

```sh
npm exec riebeckite check
```

エラーを無視せず、表示された設定項目を確認して修正してください。

## 関連ページ

- [Configuration](./configuration.ja.md) — ディレクトリの基準、コンテンツの選択、公開条件
- [Plugin system](./plugin-api.ja.md) — プラグインの仕組み
- [Theme system](./theme-api.ja.md) — Theme とデザイン設定の仕組み
- [CLI](./cli.ja.md) — `check`、`doctor`、`inspect` などのコマンド
