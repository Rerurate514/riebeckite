# @riebeckite/plugin-permalink

Riebeckite の記事に対して、公開 URL（permalink）を決定するプラグインです。

ファイル構造をそのまま URL に使う代わりに、frontmatter の ID、ファイルパスから導出した ID、独自の resolver などを使って公開 URL を構築できます。

旧 URL から正準 URL へのリダイレクトも同じ設定から登録できます。

[English](./README.md)

## 基本的な使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { permalink } from "@riebeckite/plugin-permalink";

export default defineConfig({
  plugins: [
    permalink({
      frontmatter: "id",
      id: {
        strategy: "frontmatter-or-hash",
        length: 12,
      },
      path: {
        mode: "flat",
        prefix: "/n",
        trailingSlash: false,
      },
      redirects: {
        frontmatter: "redirect_from",
        status: 308,
      },
    }),
  ],
});
```

例えば次の記事があるとします。

```md
---
id: hello-world
---

# Hello
```

`path.mode: "flat"`、`path.prefix: "/n"` なら公開 URL は次のようになります。

```text
/n/hello-world
```

frontmatter に ID がない場合も、既定の `frontmatter-or-hash` ではファイルパスから決定論的な ID を生成できます。

そのため、既存の Obsidian Vault の全記事へ `id` を追加する必要はありません。

---

## 仕組み

`permalink()` はビルド時の `resolveContentLocations` フックを利用して、各記事の公開位置を解決します。

概念的には次の流れです。

```text
Content
   │
   ├─ frontmatter
   ├─ slug
   └─ source path
          │
          ▼
@riebeckite/plugin-permalink
          │
          ├─ resolve ID
          ├─ resolve path
          ├─ normalize
          ├─ validate
          └─ redirects
          │
          ▼
ContentPublicLocation
          │
          ├─ permalink
          ├─ redirects
          └─ metadata
```

Core は返された `permalink` を正準 URL として扱います。

その URL は、Wikilink、Backlinks、Search、Content Graph、SEO canonical、Sitemap、RSS / Atom / JSON Feed などから共通して参照されます。

Permalink Pluginを使用しない場合も、Coreの正式なdefault resolver `resolveDefaultContentLocation` が `index` を `/`、それ以外を `/{slug}` に解決します。これはfallbackではなく、Coreの標準policyです。

---

# Frontmatter

## ID

既定では `id` を読み取ります。

```md
---
id: hello-world
---
```

フィールド名は変更できます。

```ts
permalink({
  frontmatter: "uid",
});
```

```md
---
uid: hello-world
---
```

`frontmatter` が指定するのはトップレベルのフィールドです。

## Permalink override

特定の記事だけURLを直接指定できます。

```md
---
id: about-page
permalink: /about
---
```

この場合、通常のIDからのパス生成より `/about` が優先されます。

`id` と公開URLは別の概念なので、

```text
ID
about-page

Canonical URL
/about
```

として扱われます。

フィールド名は変更できます。

```ts
permalink({
  override: {
    frontmatter: "url",
  },
});
```

## Redirects

旧URLもfrontmatterから指定できます。

```md
---
id: hello-world
redirect_from:
  - /posts/hello
  - /blog/2024/hello-world
---
```

例えば正準URLが、

```text
/n/hello-world
```

なら、

```text
/posts/hello
        ↓ 308
/n/hello-world

/blog/2024/hello-world
        ↓ 308
/n/hello-world
```

として扱われます。

設定:

```ts
permalink({
  redirects: {
    frontmatter: "redirect_from",
    status: 308,
  },
});
```

`redirect_from` は文字列または文字列配列を受け取ります。

---

# オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `frontmatter` | `string` | `"id"` | IDとして読むトップレベルのfrontmatterフィールド |
| `id.strategy` | `"frontmatter" \| "hash" \| "frontmatter-or-hash"` | `"frontmatter-or-hash"` | IDの決定方法 |
| `id.length` | `number` | `12` | ハッシュIDの文字数（6〜43） |
| `path.mode` | `"flat" \| "preserve" \| "append"` | `"flat"` | IDを公開URLへ配置する方式 |
| `path.prefix` | `string` | `"/n"` | URL prefix。`"/"`または空文字でprefixなし |
| `path.trailingSlash` | `boolean` | `false` | 正準URL末尾へ `/` を付ける |
| `index.collapse` | `boolean` | `true` | `index`ファイルのパスをcollapseする |
| `override.frontmatter` | `string` | `"permalink"` | URLを直接指定するfrontmatterフィールド |
| `redirects.frontmatter` | `string` | `"redirect_from"` | 旧URLを指定するfrontmatterフィールド |
| `redirects.status` | `301 \| 302 \| 307 \| 308` | `308` | リダイレクトHTTP status |
| `resolveId` | `(content) => string` | — | ID解決を完全にカスタマイズする |
| `resolvePath` | `({ content, id }) => string` | — | 公開パス生成を完全にカスタマイズする |

---

# ID Strategy

## `frontmatter`

frontmatterからIDを取得します。

```ts
permalink({
  frontmatter: "id",
  id: {
    strategy: "frontmatter",
  },
});
```

IDが存在しない記事はビルドエラーになります。

永続的なURLを明示的に管理したい場合に向いています。

```md
---
id: article-123
---
```

ファイルをrename/moveしても、`flat` modeならIDおよびURLを維持できます。

---

## `hash`

frontmatterを使用せず、ファイルパスからIDを導出します。

```ts
permalink({
  id: {
    strategy: "hash",
    length: 12,
  },
});
```

入力pathは、

- `\` → `/`
- 先頭 `/` の除去
- Unicode NFC正規化

を行った上でSHA-256へ渡されます。

結果をbase64urlとして表現し、その先頭`id.length`文字をIDとして利用します。

```text
notes/flutter/riverpod.md
        │
        ▼
normalized path
        │
        ▼
SHA-256
        │
        ▼
base64url
        │
        ▼
K7m3Qp8d...
```

同じpathならOSやbuild環境が異なっても同じIDになります。

ただし、pathが入力なのでrename/moveするとIDも変わります。

---

## `frontmatter-or-hash`

既定値です。

```ts
permalink({
  frontmatter: "id",
  id: {
    strategy: "frontmatter-or-hash",
  },
});
```

解決順序は、

```text
frontmatter IDあり
        ↓
frontmatter ID

frontmatter IDなし
        ↓
path-derived hash
```

です。

既存Obsidian Vaultを変更せず利用しながら、重要な記事だけ永続IDを与えたい場合に向いています。

---

# ID metadata

解決されたIDの由来はmetadataから確認できます。

| `metadata.idSource` | 意味 |
| --- | --- |
| `frontmatter` | frontmatterから取得 |
| `derived` | path hashから導出 |
| `custom` | `resolveId`から取得 |

手動`permalink` overrideはURLを変更しますがidentityは消しません。frontmatterのIDがあれば引き続き記録され（`metadata.idSource` は `frontmatter`）、明示的なIDがない場合のみmetadataは付与されません。overrideから暗黙の `/{id}` URLを生成することはありません。

---

# URL Path Mode

IDの決定方法と、URLの構築方法は独立しています。

例えば、

```text
source:
notes/flutter/hello.md

ID:
hello-world
```

とします。

## `flat`

```ts
path: {
  mode: "flat",
  prefix: "/n",
}
```

結果:

```text
/n/hello-world
```

filesystemのディレクトリ構造をURLへ含めません。

OpaqueなURLを作りたい場合に適しています。

---

## `preserve`

ディレクトリ構造を残しつつIDを配置します。

```ts
path: {
  mode: "preserve",
  prefix: "/n",
}
```

例:

```text
notes/flutter/hello.md

↓

/n/notes/flutter/hello-world
```

---

## `append`

`append`も選択できます。

```ts
path: {
  mode: "append",
}
```

現在の実装では`append`は`preserve`と同じパスを返します。

将来的に異なる意味を持たせる場合に備えてmodeとして分離されています。`append`固有の挙動を期待する場合は、現在の実装仕様に注意してください。

---

# index ファイル

`index.collapse`によって`index.md`の扱いを変更できます。

```ts
index: {
  collapse: true,
}
```

例えば、

```text
notes/flutter/index.md
```

IDが`hello-world`の場合:

| 設定 | URL |
| --- | --- |
| `flat` | `/n/hello-world` |
| `preserve` + collapse | `/n/notes/flutter/hello-world` |
| `preserve` + collapseなし | `/n/notes/flutter/index/hello-world` |

`flat`ではfilesystem structure自体を使用しないため、collapseの影響を受けません。

---

# 上級者向け: Custom Resolver

組み込みstrategyで表現できないURL設計では、`resolveId`と`resolvePath`を利用できます。

Permalink Pluginの通常設定で十分な場合は、custom resolverを使う必要はありません。

## `resolveId`

記事から独自IDを生成します。

```ts
permalink({
  resolveId(content) {
    return `post-${content.slug}`;
  },

  path: {
    mode: "flat",
    prefix: "/articles",
  },
});
```

概念的には、

```text
Content
   ↓
resolveId(content)
   ↓
ID
   ↓
built-in path resolver
   ↓
canonical URL
```

となります。

`resolveId`の戻り値も組み込みIDと同じvalidationを通ります。

そのため、不正なIDを返してvalidationを迂回することはできません。

### 例: frontmatterを組み合わせる

例えばプロジェクト固有のfrontmatterからIDを作る場合:

```md
---
category: flutter
serial: 42
---
```

```ts
permalink({
  resolveId(content) {
    const category = content.frontmatter.category;
    const serial = content.frontmatter.serial;

    if (typeof category !== "string") {
      throw new Error("category is required");
    }

    if (typeof serial !== "number") {
      throw new Error("serial is required");
    }

    return `${category}-${serial}`;
  },

  path: {
    mode: "flat",
    prefix: "/articles",
  },
});
```

結果:

```text
/articles/flutter-42
```

Custom resolver内で扱うfrontmatterのvalidationはresolver側の責務です。

---

# 上級者向け: `resolvePath`

`resolvePath`を使うと、IDをURLのどこへ配置するかを完全に制御できます。

```ts
permalink({
  frontmatter: "id",

  id: {
    strategy: "frontmatter-or-hash",
  },

  resolvePath({ content, id }) {
    return `/articles/${id}`;
  },
});
```

結果:

```text
/articles/hello-world
```

`resolvePath`はサイト内の絶対パスを返してください。

```text
/articles/hello     OK
/articles/hello/    OK
articles/hello      NG
https://example.com NG
```

戻り値はPluginの通常のURL normalization / validation / collision detectionを通ります。

---

# `resolveId` と `resolvePath` を組み合わせる

両方を指定すると、ID決定とURL構築を完全にカスタマイズできます。

例えば年別URLを作る場合:

```md
---
published: 2026-09-28
article_id: riebeckite-permalink
---
```

```ts
permalink({
  resolveId(content) {
    const value = content.frontmatter.article_id;

    if (typeof value !== "string") {
      throw new Error("article_id is required");
    }

    return value;
  },

  resolvePath({ content, id }) {
    const published = content.frontmatter.published;

    if (typeof published !== "string") {
      throw new Error("published is required");
    }

    const year = published.slice(0, 4);

    return `/articles/${year}/${id}`;
  },
});
```

結果:

```text
/articles/2026/riebeckite-permalink
```

この場合もRiebeckite内部では最終的に解決されたURLだけが正準URLとして扱われます。

---

# Custom Resolverの使い分け

基本的には次の順序で検討してください。

```text
built-in strategyで足りる
        ↓
通常optionsを使用

IDだけ特殊
        ↓
resolveId

URL構造だけ特殊
        ↓
resolvePath

両方特殊
        ↓
resolveId + resolvePath
```

例えば、

```text
/n/{id}
```

を作るだけならcustom resolverは不要です。

```ts
permalink({
  id: {
    strategy: "frontmatter-or-hash",
  },
  path: {
    mode: "flat",
    prefix: "/n",
  },
});
```

こちらの方が設定意図が明確です。

---

# Custom Resolverでも維持される保証

Custom resolverを使用しても、Permalink Pluginの以下の処理は維持されます。

- ID validation
- URL normalization
- URL validation
- ID collision detection
- canonical URL collision detection
- redirect collision detection
- trailing slash handling
- Coreへのcanonical public location登録

つまりcustom resolverはPluginの安全機構を迂回するAPIではありません。

---

# Manual permalinkとの優先順位

frontmatterにmanual permalinkが存在する場合は、通常のID解決とpath構築より優先されます。

例えば:

```md
---
id: abc
permalink: /about
---
```

では、

```text
ID候補
abc

Canonical URL
/about
```

となります。

`resolvePath`で別のURLを返す設定があっても、manual permalink overrideが優先されます。

特殊ページだけURLを固定したい場合に利用できます。

---

# Statelessな設計

Permalink Pluginは永続的なID registryを持ちません。

以下は作成しません。

```text
.riebeckite/content-ids.json
state.json
SQLite database
KV database
```

必要な情報は、

```text
Plugin configuration
+
source content
```

からビルド時に決定されます。

そのためCloudflare Workers、CI、別PCなどでも同じ入力から同じURLを生成できます。

`hash` strategyではpathがidentity生成の入力になるため、rename/moveによってURLが変化します。

rename/move後もURLを維持したい記事にはfrontmatter IDを利用してください。

---

# Rename / Move時の挙動

URLの安定性はID strategyとpath modeの組み合わせによって変わります。

| ID | Path mode | Rename | Move |
| --- | --- | --- | --- |
| frontmatter | flat | 維持 | 維持 |
| frontmatter | preserve | 状況により変更 | 変更 |
| frontmatter | append | 状況により変更 | 変更 |
| hash | flat | 変更 | 変更 |
| hash | preserve | 変更 | 変更 |
| hash | append | 変更 | 変更 |

永続的なURLが必要なら、

```ts
permalink({
  frontmatter: "id",
  id: {
    strategy: "frontmatter",
  },
  path: {
    mode: "flat",
  },
});
```

が最も明示的です。

既存Vaultへの変更を最小化したい場合は、

```ts
id: {
  strategy: "frontmatter-or-hash",
}
```

が便利です。

---

# 検証

## ID

IDは単一のURL path segmentとして扱われます。

以下はエラーになります。

- 空文字列
- `/`を含む
- `#`を含む
- `?`を含む
- 空白を含む
- 正しくdecodeできないpercent encoding

Custom `resolveId`の結果も同じ検証を受けます。

## Permalink

Permalinkとredirectはサイト内の絶対pathである必要があります。

以下は許可されません。

- relative path
- query string
- fragment
- `\`
- 不正な `//`
- 外部URL

Custom `resolvePath`の結果も同じ検証を受けます。

---

# Collision Detection

Permalink Pluginはビルド時に衝突を検出します。

対象:

- ID ↔ ID
- canonical URL ↔ canonical URL
- canonical URL ↔ redirect
- redirect ↔ redirect

例えば:

```text
a.md
→ /about

b.md
→ /about
```

はビルドエラーです。

また、

```text
a.md canonical
→ /about

b.md redirect
→ /about
```

もエラーです。

自動的にsuffixを付けて回避することはありません。

これにより、ビルド順序によってURLが変化することを防ぎます。

---

# Inspect

解決結果はRiebeckiteのinspect機能から確認できます。

```sh
riebeckite inspect content --list
```

Permalink Pluginが有効な場合、記事ごとのID、ID source、permalinkを確認できます。

例えば:

```text
PATH                 ID            ID SOURCE     PERMALINK
notes/a.md           K7m3Qp8d...   derived       /n/K7m3Qp8d...
notes/about.md       about         frontmatter   /about
```

実際の表示形式はCLIバージョンによって異なる場合があります。

---

# 主なエクスポート

## Functions

- `permalink(options?)`
- `permalinkPlugin(options?)`

どちらもPermalink Pluginを生成します。

## Types

- `PermalinkOptions`
- `PermalinkIdStrategy`
- `PermalinkPathMode`
- `RedirectStatus`

Custom resolverを書く場合は、公開されている型を利用して設定を型安全に記述できます。

---

# 設定例

## 既存Obsidian Vault向け

frontmatter変更を必須にせず、URLからfilesystem構造を隠します。

```ts
permalink({
  frontmatter: "id",
  id: {
    strategy: "frontmatter-or-hash",
    length: 12,
  },
  path: {
    mode: "flat",
    prefix: "/n",
  },
});
```

## 完全に明示的な永続URL

```ts
permalink({
  frontmatter: "id",
  id: {
    strategy: "frontmatter",
  },
  path: {
    mode: "flat",
    prefix: "/n",
  },
});
```

すべての記事にfrontmatter IDが必要になります。

## ディレクトリ構造を残す

```ts
permalink({
  id: {
    strategy: "frontmatter-or-hash",
  },
  path: {
    mode: "preserve",
    prefix: "",
  },
});
```

## 独自URL設計

```ts
permalink({
  resolveId(content) {
    // project-specific ID
    return "...";
  },

  resolvePath({ content, id }) {
    // project-specific URL
    return `/articles/${id}`;
  },
});
```

---

# 関連資料

- [プラグインシステム](../../../docs/ja/reference/plugin-api.md)
- [コンテンツシステム](../../../docs/ja/framework/content-system.md)

## ????

- [?????????](../../../docs/ja/reference/plugin-api.md)
