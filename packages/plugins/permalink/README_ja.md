# @riebeckite/plugin-permalink

Riebeckite の記事に対して、公開 URL（permalink）を決定するプラグインです。

ファイル構造をそのまま URL に使う代わりに、frontmatter の ID、ファイルパスから導出した ID、独自の resolver などを使って公開 URL を構築できます。

旧 URL から canonical URL へのリダイレクトも同じ設定から登録できます。

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

Core は返された `permalink` を canonical URL として扱います。

その URL は、Wikilink、Backlinks、Search、Content Graph、SEO canonical、Sitemap、RSS / Atom / JSON Feed などから共通して参照されます。

Permalink Plugin を使用しない場合も、Core の resolver `resolveDefaultContentLocation` が `index` を `/`、それ以外を `/{slug}` に解決します。これはフォールバックではなく、Core の標準方針です。

---

## Frontmatter

### ID

既定では `id` を読み取ります。

```md
---
id: hello-world
---
```

フィールド名は変更できます。

```ts
permalink({
  frontmatter: "permalink-id",
});
```

```md
---
permalink-id: hello-world
---
```

`frontmatter` が指定するのはトップレベルのフィールドです。

### Permalink override

特定の記事だけ URL を直接指定できます。

```md
---
id: about-page
permalink: /about
---
```

この場合、通常の ID からのパス生成より `/about` が優先されます。

`id` と公開 URL は別の概念なので、

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

### Redirects

旧 URL も frontmatter から指定できます。

```md
---
id: hello-world
redirect_from:
  - /posts/hello
  - /blog/2024/hello-world
---
```

例えば canonical URL が、

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

設定は次のとおりです。

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

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `frontmatter` | `string` | `"id"` | ID として読むトップレベルの frontmatter フィールド |
| `id.strategy` | `"frontmatter" \| "hash" \| "frontmatter-or-hash"` | `"frontmatter-or-hash"` | ID の決定方法 |
| `id.length` | `number` | `12` | ハッシュ ID の文字数（6〜43） |
| `path.mode` | `"flat" \| "preserve" \| "append"` | `"flat"` | ID を公開 URL へ配置する方式 |
| `path.prefix` | `string` | `"/n"` | URL prefix。`"/"` または空文字なら prefix なし |
| `path.trailingSlash` | `boolean` | `false` | canonical URL 末尾へ `/` を付ける |
| `index.collapse` | `boolean` | `true` | `index` ファイルのパスを collapse する |
| `override.frontmatter` | `string` | `"permalink"` | URL を直接指定する frontmatter フィールド |
| `redirects.frontmatter` | `string` | `"redirect_from"` | 旧 URL を指定する frontmatter フィールド |
| `redirects.status` | `301 \| 302 \| 307 \| 308` | `308` | リダイレクトの HTTP ステータス |
| `resolveId` | `(content) => string` | — | ID の解決を完全にカスタマイズする |
| `resolvePath` | `({ content, id }) => string` | — | 公開パスの生成を完全にカスタマイズする |

---

## ID strategy

### `frontmatter`

frontmatter から ID を取得します。

```ts
permalink({
  frontmatter: "id",
  id: {
    strategy: "frontmatter",
  },
});
```

ID が存在しない記事はビルドエラーになります。

永続的な URL を明示的に管理したい場合に向いています。

```md
---
id: article-123
---
```

ファイルを rename/move しても、`flat` の mode なら ID および URL を維持できます。

---

### `hash`

frontmatter を使用せず、ファイルパスから ID を導出します。

```ts
permalink({
  id: {
    strategy: "hash",
    length: 12,
  },
});
```

入力 path は、

- `\` → `/`
- 先頭 `/` の除去
- Unicode NFC 正規化

を行った上で SHA-256 へ渡されます。

結果を base64url として表現し、その先頭 `id.length` 文字を ID として利用します。

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

同じ path なら OS や build 環境が異なっても同じ ID になります。

ただし、path が入力なので rename/move すると ID も変わります。

---

### `frontmatter-or-hash`

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
frontmatter ID あり
        ↓
frontmatter ID

frontmatter ID なし
        ↓
path-derived hash
```

この順序で解決します。

既存 Obsidian Vault を変更せず利用しながら、重要な記事だけ永続 ID を与えたい場合に向いています。

---

## ID メタデータ

解決された ID の由来はメタデータから確認できます。

| `metadata.idSource` | 意味 |
| --- | --- |
| `frontmatter` | frontmatter から取得 |
| `derived` | path hash から導出 |
| `custom` | `resolveId` から取得 |

手動の `permalink` override は URL を変更しますが、同一性は消しません。frontmatter の ID があれば引き続き記録され（`metadata.idSource` は `frontmatter`）、明示的な ID がない場合のみメタデータは付与されません。override から暗黙の `/{id}` URL を生成することはありません。

---

## URL path mode

ID の決定方法と、URL の構築方法は独立しています。

例えば、

```text
source:
notes/flutter/hello.md

ID:
hello-world
```

とします。

### `flat`

```ts
path: {
  mode: "flat",
  prefix: "/n",
}
```

結果は次のとおりです。

```text
/n/hello-world
```

ファイルシステムのディレクトリ構造を URL へ含めません。

読み取れない URL を作りたい場合に適しています。

---

### `preserve`

ディレクトリ構造を残しつつ ID を配置します。

```ts
path: {
  mode: "preserve",
  prefix: "/n",
}
```

例を示します。

```text
notes/flutter/hello.md

↓

/n/notes/flutter/hello-world
```

---

### `append`

`append` も選べます。

```ts
path: {
  mode: "append",
}
```

現在の実装では `append` は `preserve` と同じパスを返します。

将来的に別の意味を持たせる場合に備えて mode として分離されています。`append` 固有の挙動を期待する場合は、現在の実装仕様に注意してください。

---

## index ファイル

`index.collapse` によって `index.md` の扱いを変更できます。

```ts
index: {
  collapse: true,
}
```

例えば、

```text
notes/flutter/index.md
```

ID が `hello-world` の場合、URL は次のとおりです。

| 設定 | URL |
| --- | --- |
| `flat` | `/n/hello-world` |
| `preserve` + collapse | `/n/notes/flutter/hello-world` |
| `preserve` + `collapse` なし | `/n/notes/flutter/index/hello-world` |

`flat` ではファイルシステム構造自体を使わないため、`collapse` の影響を受けません。

---

## 上級者向け: カスタム resolver

組み込みの strategy では表現できない URL 設計なら、`resolveId` と `resolvePath` を利用できます。

Permalink Plugin の通常設定で十分な場合は、カスタム resolver を使う必要はありません。

### `resolveId`

記事から独自 ID を生成します。

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

`resolveId` の戻り値も組み込み ID と同じ検証を通ります。

不正な ID を返しても検証を通りません。

#### 例: frontmatter を組み合わせる

例えば、プロジェクト固有の frontmatter から ID を作る場合は次のとおりです。

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

結果は次のとおりです。

```text
/articles/flutter-42
```

カスタム resolver 内で扱う frontmatter の検証は resolver 側の責務です。

---

## 上級者向け: `resolvePath`

`resolvePath` を使うと、ID を URL のどこへ配置するかを完全に制御できます。

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

結果は次のとおりです。

```text
/articles/hello-world
```

`resolvePath` はサイト内の絶対パスを返してください。

```text
/articles/hello     OK
/articles/hello/    OK
articles/hello      NG
https://example.com NG
```

戻り値は Plugin の通常の URL 正規化・検証・衝突検出を通ります。

---

## `resolveId` と `resolvePath` を組み合わせる

両方を指定すると、ID 決定と URL 構築を完全にカスタマイズできます。

例えば年別 URL を作る場合は次のとおりです。

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

結果は次のとおりです。

```text
/articles/2026/riebeckite-permalink
```

この場合も Riebeckite 内部では最終的に解決された URL だけが canonical URL として扱われます。

---

## カスタム resolver の使い分け

基本的には次の順序で検討してください。

```text
built-in strategy で足りる
        ↓
通常オプションを使用

ID だけ特殊
        ↓
resolveId

URL 構造だけ特殊
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

を作るだけならカスタム resolver は不要です。

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

## カスタム resolver でも維持される保証

カスタム resolver を使用しても、Permalink Plugin の以下の処理は維持されます。

- ID の検証
- URL の正規化
- URL の検証
- ID の衝突検出
- canonical URL の衝突検出
- リダイレクトの衝突検出
- 末尾スラッシュの扱い
- Core への canonical な公開位置の登録

つまりカスタム resolver は Plugin の安全機構を迂回する API ではありません。

---

## 手動の permalink との優先順位

frontmatter に手動の permalink がある場合は、通常の ID 解決と path 構築より優先されます。

例えば、次のようになります。

```md
---
id: abc
permalink: /about
---
```

とすると、

```text
ID候補
abc

Canonical URL
/about
```

となります。

`resolvePath` で別の URL を返す設定があっても、手動の permalink override が優先されます。

特殊ページだけ URL を固定したい場合に利用できます。

---

## ステートレスな設計

Permalink Plugin は永続的な ID のレジストリを持ちません。

以下は作成しません。

```text
.riebeckite/content-ids.json
state.json
SQLite database
KV database
```

必要な情報は、

```text
Plugin 設定
+
ソースコンテンツ
```

からビルド時に決定されます。

そのため Cloudflare Workers、CI、別 PC などでも同じ入力から同じ URL を生成できます。

`hash` strategy では path が同一性を決める入力になるため、rename/move によって URL が変化します。

rename/move 後も URL を維持したい記事には frontmatter ID を利用してください。

---

## Rename / Move 時の挙動

URL の安定性は ID strategy と path mode の組み合わせによって変わります。

| ID | Path mode | Rename | Move |
| --- | --- | --- | --- |
| frontmatter | flat | 維持 | 維持 |
| frontmatter | preserve | 状況により変更 | 変更 |
| frontmatter | append | 状況により変更 | 変更 |
| hash | flat | 変更 | 変更 |
| hash | preserve | 変更 | 変更 |
| hash | append | 変更 | 変更 |

永続的な URL が必要なら、

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

既存 Vault への変更を最小化したい場合は、

```ts
id: {
  strategy: "frontmatter-or-hash",
}
```

が便利です。

---

## 検証

### ID

ID は URL の 1 つのパスセグメントとして扱われます。

以下はエラーになります。

- 空文字列
- `/` を含む
- `#` を含む
- `?` を含む
- 空白を含む
- 正しくデコードできないパーセントエンコード

Custom `resolveId` の結果も同じ検証を受けます。

### Permalink

Permalink とリダイレクトはサイト内の絶対 path である必要があります。

以下は許可されません。

- 相対パス
- クエリ文字列
- フラグメント
- `\`
- 不正な `//`
- 外部 URL

Custom `resolvePath` の結果も同じ検証を受けます。

---

## 衝突検出

Permalink Plugin はビルド時に衝突を検出します。

対象は次のとおりです。

- ID ↔ ID
- canonical URL ↔ canonical URL
- canonical URL ↔ リダイレクト
- リダイレクト ↔ リダイレクト

例えば、次のようになります。

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

自動的に接尾辞を付けて回避することはありません。

これにより、ビルド順序によって URL が変化することを防ぎます。

---

## Inspect

解決結果は Riebeckite の inspect 機能から確認できます。

```sh
riebeckite inspect content --list
```

Permalink Plugin が有効な場合、記事ごとの ID、ID の出典、permalink を確認できます。

例えば、次のようになります。

```text
PATH                 ID            ID SOURCE     PERMALINK
notes/a.md           K7m3Qp8d...   derived       /n/K7m3Qp8d...
notes/about.md       about         frontmatter   /about
```

実際の表示形式は CLI バージョンによって異なる場合があります。

---

## 主なエクスポート

### 関数

- `permalink(options?)`
- `permalinkPlugin(options?)`

どちらも Permalink Plugin を生成します。

### 型

- `PermalinkOptions`
- `PermalinkIdStrategy`
- `PermalinkPathMode`
- `RedirectStatus`

カスタム resolver を書く場合は、公開されている型を使って設定を型安全に書けます。

---

## 設定例

### 既存 Obsidian Vault 向け

frontmatter 変更を必須とせず、URL からファイルシステム構造を隠します。

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

### 完全に明示的な永続 URL

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

すべての記事に frontmatter ID が必要になります。

### ディレクトリ構造を残す

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

### 独自 URL 設計

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

## 関連資料

- [プラグインシステム](../../../docs/ja/docs/reference/plugin-api.md)
- [コンテンツシステム](../../../docs/ja/docs/framework/content-system.md)

