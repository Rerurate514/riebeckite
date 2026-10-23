# @riebeckite/plugin-permalink

<!-- Generated from docs/docs/plugins/permalink.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Riebeckite のコンテンツに、安定した公開 URL（permalink）を与えるプラグインです。

公開 URL をファイルの配置に直接結び付けず、frontmatter の ID、ファイルパスから決定論的に導いた ID、独自の resolver などから URL を組み立てられます。

旧 URL から canonical URL へのリダイレクトも、同じ設定で登録できます。

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

次のコンテンツがあるとします。

```md
---
id: hello-world
---

# Hello
```

`path.mode: "flat"` と `path.prefix: "/n"` を指定すると、公開 URL は次のようになります。

```text
/n/hello-world
```

frontmatter に ID がないコンテンツにも、既定の `frontmatter-or-hash` ならファイルパスから決定論的な ID が付きます。

そのため、既存の Obsidian Vault の全ファイルに `id` を追加する必要はありません。

---

## URL が決まるまで

`permalink()` は、ビルド時に `resolveContentLocations` フックを使って各コンテンツの公開位置を解決します。

処理の流れは次のとおりです。

```text
コンテンツ
   │
   ├─ frontmatter
   ├─ slug
   └─ ソースパス
          │
          ▼
@riebeckite/plugin-permalink
          │
          ├─ ID を解決
          ├─ パスを解決
          ├─ 正規化
          ├─ 検証
          └─ リダイレクト
          │
          ▼
ContentPublicLocation
          │
          ├─ permalink
          ├─ redirects
          └─ metadata
```

Core は、解決された `permalink` を canonical URL として扱います。

同じ URL が、Wikilink、バックリンク、検索、コンテンツグラフなどから共通して参照されます。SEO の canonical、サイトマップ、RSS / Atom / JSON Feed も同じ URL を使います。

このプラグインを使わなくても、Core の resolver `resolveDefaultContentLocation` がすべての URL を解決します。`index` は `/`、それ以外は `/{slug}` です。これはフォールバックではなく、Core の正式な方針です。

---

## frontmatter で指定する

### ID を指定する

既定では `id` フィールドを読みます。

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

`frontmatter` が指すのは、トップレベルの frontmatter フィールドです。

### permalink を直接指定する

特定のコンテンツだけ、公開 URL を直接指定できます。

```md
---
id: about-page
permalink: /about
---
```

この場合、ID からの通常のパス生成より `/about` が優先されます。

`id` と公開 URL は別の概念であり、次のように扱います。

```text
ID
about-page

Canonical URL
/about
```

フィールド名も変更できます。

```ts
permalink({
  override: {
    frontmatter: "url",
  },
});
```

### 旧 URL からのリダイレクトを指定する

旧 URL も frontmatter で指定できます。

```md
---
id: hello-world
redirect_from:
  - /posts/hello
  - /blog/2024/hello-world
---
```

canonical URL が

```text
/n/hello-world
```

の場合、旧 URL は次のようにリダイレクトされます。

```text
/posts/hello
        ↓ 308
/n/hello-world

/blog/2024/hello-world
        ↓ 308
/n/hello-world
```

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
| `id.strategy` | `"frontmatter" \| "hash" \| "frontmatter-or-hash"` | `"frontmatter-or-hash"` | ID の解決方法 |
| `id.length` | `number` | `12` | パス由来ハッシュ ID の長さ（6〜43） |
| `path.mode` | `"flat" \| "preserve" \| "append"` | `"flat"` | 解決した ID を公開 URL のどこに置くか |
| `path.prefix` | `string` | `"/n"` | URL の接頭辞。`"/"` または空文字なら接頭辞なし |
| `path.trailingSlash` | `boolean` | `false` | canonical URL の末尾に `/` を付けるか |
| `index.collapse` | `boolean` | `true` | `index` セグメントを畳むか |
| `override.frontmatter` | `string` | `"permalink"` | URL を直接上書きする frontmatter フィールド |
| `redirects.frontmatter` | `string` | `"redirect_from"` | 旧 URL を指定する frontmatter フィールド |
| `redirects.status` | `301 \| 302 \| 307 \| 308` | `308` | リダイレクトの HTTP ステータス |
| `resolveId` | `(content) => string` | なし | ID の解決を完全にカスタマイズする |
| `resolvePath` | `({ content, id }) => string` | なし | 公開パスの生成を完全にカスタマイズする |

---

## ID の解決方法（`id.strategy`）

### `frontmatter`

`frontmatter` フィールドの値を ID にします。

```ts
permalink({
  frontmatter: "id",
  id: {
    strategy: "frontmatter",
  },
});
```

すべてのコンテンツがこのフィールドを持つ必要があります。ID がないコンテンツがあると、ビルドはエラーになります。

URL の同一性を明示的に管理したい場合に向いています。

```md
---
id: article-123
---
```

ソースファイルを名前変更したり移動したりしても、`flat` モードなら ID と公開 URL は変わりません。

---

### `hash`

frontmatter の ID を使わず、ソースファイルのパスから ID を導出します。

```ts
permalink({
  id: {
    strategy: "hash",
    length: 12,
  },
});
```

入力となるパスは、次の正規化を経て SHA-256 でハッシュ化されます。

- `\` → `/`
- 先頭の `/` を除去
- Unicode NFC で正規化

ハッシュは base64url として表現し、先頭の `id.length` 文字を ID に使います。

```text
notes/flutter/riverpod.md
        │
        ▼
正規化したパス
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

同じパスなら、OS やビルド環境が違っても同じ ID になります。

ただし、パスが入力になるため、名前変更や移動をすると ID も変わります。

---

### `frontmatter-or-hash`

これが既定の strategy です。

```ts
permalink({
  frontmatter: "id",
  id: {
    strategy: "frontmatter-or-hash",
  },
});
```

解決の順序は次のとおりです。

```text
frontmatter に ID がある
        ↓
その ID を使う

frontmatter に ID がない
        ↓
パスから ID を導出する
```

既存の Obsidian Vault を変更せずに使いながら、重要なコンテンツだけに明示的な永続 ID を与えたい場合に向いています。

---

## ID の出所を確認する

解決された ID がどこから来たかは、メタデータで確認できます。

| `metadata.idSource` | 意味 |
| --- | --- |
| `frontmatter` | frontmatter のフィールドから取得 |
| `derived` | ソースパスのハッシュから導出 |
| `custom` | `resolveId` が返した値 |

手動の `permalink` による上書きは URL を変えますが、同一性は失われません。frontmatter に ID があれば、その ID は引き続き記録されます（`metadata.idSource` は `frontmatter`）。メタデータが付かないのは、明示的な ID が存在しない場合だけです。上書きによって `/{id}` という URL が暗黙に生成されることはありません。

---

## URL への配置方法（`path.mode`）

ID の解決と URL の組み立ては、別々に設定できます。

次の例で考えます。

```text
ソース:
notes/flutter/hello.md

ID:
hello-world
```

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

ファイルシステムのディレクトリ構造は URL に現れません。

ファイルの場所を URL から隠したい場合に適しています。

---

### `preserve`

ソースのディレクトリ構造を残したまま、ID を URL に配置します。

```ts
path: {
  mode: "preserve",
  prefix: "/n",
}
```

例は次のとおりです。

```text
notes/flutter/hello.md

↓

/n/notes/flutter/hello-world
```

---

### `append`

`append` も指定できます。

```ts
path: {
  mode: "append",
}
```

現在の実装では、`append` は `preserve` と同じパスを返します。

将来、別の意味を持たせられるようにモードとして分けています。現行バージョンで `append` に `preserve` と異なる挙動を期待しないでください。

---

## index ファイルの扱い

`index.collapse` で `index.md` の扱いを変えられます。

```ts
index: {
  collapse: true,
}
```

例として、

```text
notes/flutter/index.md
```

ID が `hello-world` の場合、URL は次のようになります。

| 設定 | URL |
| --- | --- |
| `flat` | `/n/hello-world` |
| `preserve` + collapse | `/n/notes/flutter/hello-world` |
| `preserve` + `collapse` なし | `/n/notes/flutter/index/hello-world` |

`flat` はファイルシステムの構造を使わないため、`collapse` の影響を受けません。

---

## 上級: 独自の resolver を書く

組み込みの strategy では表せない URL 設計には、`resolveId` と `resolvePath` を使えます。

通常のオプションで足りるなら、カスタム resolver は不要です。プロジェクト固有の ID や URL の設計に使います。

### `resolveId`

`resolveId` を使うと、コンテンツの ID を自分で計算できます。

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

概念的な流れは次のとおりです。

```text
コンテンツ
   ↓
resolveId(content)
   ↓
ID
   ↓
組み込みのパス resolver
   ↓
canonical URL
```

`resolveId` の戻り値も、組み込みの ID と同じ検証を通ります。

つまり、カスタム resolver はプラグインの通常の検証を迂回できません。

#### 例: 独自の frontmatter から ID を作る

プロジェクト固有の frontmatter から ID を作る例です。

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

カスタム resolver が読むプロジェクト固有の frontmatter の検証は、resolver の責任です。

---

## 上級: `resolvePath` で URL を組み立てる

`resolvePath` を使えば、解決した ID を URL のどこに置くかを完全に制御できます。

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

`resolvePath` は、サイト内の絶対パスを返してください。

```text
/articles/hello     有効
/articles/hello/    有効
articles/hello      無効
https://example.com 無効
```

戻り値は、プラグインの通常の URL 正規化、検証、衝突検出を通ります。

---

## `resolveId` と `resolvePath` を組み合わせる

2つを指定すれば、ID の解決と URL の構造の両方を自分で決められます。

たとえば、年ごとの URL を作る例です。

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

この場合も、Riebeckite が canonical URL として扱うのは、最終的に解決された URL だけです。

---

## 組み込みオプションとカスタム resolver の使い分け

基本的には、次の順に検討してください。

```text
組み込みの strategy で足りる
        ↓
通常のオプションを使う

ID だけ特殊
        ↓
resolveId を使う

URL 構造だけ特殊
        ↓
resolvePath を使う

両方とも特殊
        ↓
resolveId + resolvePath を使う
```

たとえば、

```text
/n/{id}
```

を作るだけなら、カスタム resolver は要りません。

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

こちらのほうが設定の意図が明確で、宣言的なまま保てます。

---

## カスタム resolver を使っても保証されること

カスタム resolver を使っても、次の処理は変わりません。

- ID の検証
- URL の正規化
- URL の検証
- ID の衝突検出
- canonical URL の衝突検出
- リダイレクトの衝突検出
- 末尾スラッシュの扱い
- Core への canonical な公開位置の登録

カスタム resolver が変えるのは ID やパスの作り方だけで、出来上がった公開位置の検証と登録の方法は変わりません。つまり、カスタム resolver はプラグインの安全機構を迂回する API ではありません。

---

## 手動の permalink が優先される

frontmatter に手動の permalink があれば、通常の ID 解決とパス生成より優先されます。

たとえば、次のとおりです。

```md
---
id: abc
permalink: /about
---
```

とした場合、次のように扱われます。

```text
ID の候補
abc

Canonical URL
/about
```

`resolvePath` が別の URL を返す設定でも、手動の permalink による上書きが優先されます。

全体では共通の URL 戦略を使いつつ、一部の特別なページだけ URL を固定したい場合に使えます。

---

## 状態を持たずにビルドする

このプラグインは、永続的な ID のレジストリを持ちません。

次のものは作成せず、必要としません。

```text
.riebeckite/content-ids.json
state.json
SQLite database
KV database
```

公開位置は、ビルド時に次の入力だけから決まります。

```text
プラグインの設定
+
ソースコンテンツ
```

そのため、ローカルビルド、CI、Cloudflare Workers、別の PC でも、追加の状態を持たずに同じ入力から同じ URL を生成できます。

`hash` strategy ではソースパスが同一性の入力になるため、名前変更や移動をすると URL が変わります。

名前変更や移動の後も URL を維持したいコンテンツには、frontmatter の ID を使ってください。

---

## 名前変更や移動で URL はどう変わるか

URL の安定性は、ID の strategy とパスモードの組み合わせで決まります。

| ID | パスモード | 名前変更 | 移動 |
| --- | --- | --- | --- |
| frontmatter | flat | 維持 | 維持 |
| frontmatter | preserve | 変わる場合がある | 変わる |
| frontmatter | append | 変わる場合がある | 変わる |
| hash | flat | 変わる | 変わる |
| hash | preserve | 変わる | 変わる |
| hash | append | 変わる | 変わる |

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

既存の Vault への変更を最小限にしたい場合は、

```ts
id: {
  strategy: "frontmatter-or-hash",
}
```

が便利です。

---

## 検証される値

### ID の条件

ID は、URL の1つのパスセグメントでなければなりません。

次の値はエラーになります。

- 空文字列
- `/` を含む
- `#` を含む
- `?` を含む
- 空白を含む
- 正しくデコードできないパーセントエンコード

`resolveId` が返した値も同じ検証を受けます。

### permalink とリダイレクトの条件

permalink とリダイレクトは、サイト内の絶対パスである必要があります。

次の値は許可されません。

- 相対パス
- クエリ文字列
- フラグメント
- `\`
- 不正な `//`
- 外部 URL

`resolvePath` が返した値も同じ検証を受けます。

---

## 衝突の検出

このプラグインは、ビルド時に公開位置の衝突を検出します。

検出する組み合わせは次のとおりです。

- ID ↔ ID
- canonical URL ↔ canonical URL
- canonical URL ↔ リダイレクト
- リダイレクト ↔ リダイレクト

たとえば、次の2つが同じ URL になると、ビルドはエラーになります。

```text
a.md
→ /about

b.md
→ /about
```

次のように、canonical URL とリダイレクトがぶつかる場合もエラーです。

```text
a.md canonical
→ /about

b.md redirect
→ /about
```

衝突を避けるために接尾辞を自動で付けることはありません。

これにより、ビルドやコンテンツの順序によって公開 URL が変わることを防ぎます。

---

## 解決結果を確認する

解決結果は、Riebeckite の inspect 機能で確認できます。

```sh
riebeckite inspect content --list
```

Permalink Plugin が有効なら、コンテンツごとの ID、ID の出典、permalink を確認できます。

出力例は次のとおりです。

```text
PATH                 ID            ID SOURCE     PERMALINK
notes/a.md           K7m3Qp8d...   derived       /n/K7m3Qp8d...
notes/about.md       about         frontmatter   /about
```

実際の表示形式は CLI のバージョンによって異なる場合があります。

---

## エクスポートされる関数と型

### 関数

- `permalink(options?)`
- `permalinkPlugin(options?)`

どちらも Permalink Plugin を生成します。

### 型

- `PermalinkOptions`
- `PermalinkIdStrategy`
- `PermalinkPathMode`
- `RedirectStatus`

カスタム resolver を書くときは、公開されている型を使えば、設定を型安全に書けます。

---

## 設定例

### 既存の Obsidian Vault 向け

Vault 全体に frontmatter を追加することなく、URL からファイルシステムの構造を隠します。

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

### 永続 URL を明示的に管理する

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

すべてのコンテンツに frontmatter の ID が必要になります。

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

### 独自の URL 設計を使う

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

- [プラグイン API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
- [コンテンツシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/framework/content-system.ja.md)
