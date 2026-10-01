# Configuration

Riebeckite の設定は `riebeckite.config.ts` に記述します。

基本的な Site では、`defineConfig()` を使って次のように設定します。

```ts id="vps2rj"
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: {
    title: "My site",
    baseUrl: "https://example.com",
  },

  content: {
    directory: "content",
    exclude: ["drafts/**"],
    filters: {
      publishStrategy: "explicit",
    },
  },

  markdown: {
    syntaxHighlight: {
      theme: "github-dark",
    },
  },

  theme: {
    colorMode: "system",
    articleLayout: "article",
  },

  plugins: [],
});
```

必須なのは `site` です。

そのほかは必要に応じて設定します。

| Field | 用途 |
| --- | --- |
| `site` | Site の基本情報 |
| `content` | コンテンツの場所と公開条件 |
| `markdown` | Markdown の処理設定 |
| `theme` | Theme の設定 |
| `plugins` | 使用する Plugin |

Config は Content や Plugin の処理が始まる前に Integration によって解決されます。

# Content の設定

通常は `content.directory` で Markdown などを読み込むディレクトリを指定します。

```ts id="dn44si"
content: {
  directory: "content",
}
```

標準的な Site なら、

```text id="w3ifap"
my-site/
├─ app/
├─ content/
├─ public/
├─ package.json
├─ vite.config.ts
└─ riebeckite.config.ts
```

のような構成になります。

## 除外するファイル

`exclude` を使うと、Content System に読み込ませないファイルを指定できます。

```ts id="4kv6vn"
content: {
  directory: "content",
  exclude: [
    "drafts/**",
    "Templates/**",
  ],
}
```

`exclude` に一致したファイルは、コンテンツとして処理される前に除外されます。

内部では `isExcluded` がこの判定を行います。

## 公開条件

どのコンテンツを公開するかは `publishStrategy` で設定できます。

```ts id="hp9zx8"
content: {
  filters: {
    publishStrategy: "explicit",
  },
}
```

公開判定には frontmatter も利用されます。

```yaml id="osj0d5"
---
publish: true
---
```

内部では `isPublished` が publication policy と frontmatter をもとに公開状態を判定します。

`exclude` と `publishStrategy` は似ていますが、役割が異なります。

```mermaid id="1t5jnq"
flowchart LR
    Files["Files"]
    Exclude{"exclude ?"}
    Content["Content"]
    Publish{"Published ?"}
    Public["Public Content"]
    Private["Not Published"]

    Files --> Exclude
    Exclude -->|Yes| Skip["読み込まない"]
    Exclude -->|No| Content
    Content --> Publish
    Publish -->|Yes| Public
    Publish -->|No| Private
```

`exclude` は **Content System に入れるか**、`publishStrategy` は **Site に公開するか**を決めます。

# ContentSource

通常は `content.directory` を使用しますが、独自の読み込み元を使用する場合は `content.source` を指定できます。

```text id="rbdlxj"
content.directory
    ↓
標準 filesystem ContentSource
```

または、

```text id="hrp9p5"
content.source
    ↓
独自 ContentSource
```

のどちらかです。

同じコンテンツに対して2つの reader を動かすための設定ではありません。

`content.source` を指定する場合は、標準 filesystem reader を置き換えるものとして扱います。

# 3つの Root

外部 Vault や monorepo 構成を扱う場合に重要なのが、

- `appRoot`
- `configRoot`
- `contentRoot`

の違いです。

```mermaid id="w3x2dv"
flowchart TD
    App["appRoot<br/>Site Application"]
    Config["configRoot<br/>Config の場所"]
    Content["contentRoot<br/>Content / Vault の場所"]

    App -->|"既定"| Config
    App -->|"content.directory を解決"| Content
```

| 名前 | 何を表す？ | 既定値 / 基準 |
| --- | --- | --- |
| `appRoot` | HonoX / Vite Site の root | Vite `root` |
| `configRoot` | `riebeckite.config.*` を探す場所 | `appRoot` |
| `contentRoot` | 実際にコンテンツを読む場所 | `path.resolve(appRoot, content.directory)` |

この3つは別の役割を持ちます。

# appRoot

`appRoot` は **Site Application の基準となるディレクトリ**です。

たとえば、

```text id="xkjg5v"
site/
├─ app/
├─ public/
├─ package.json
├─ vite.config.ts
└─ riebeckite.config.ts
```

なら通常、

```text id="2hwbbd"
appRoot = site/
```

です。

`appRoot` は、

- `app/`
- `public/`
- route
- generated styles
- Build 設定

など Site Application の基準になります。

# configRoot

`configRoot` は、

```text id="53pg8g"
riebeckite.config.ts
riebeckite.config.js
riebeckite.config.mjs
```

を探す基準です。

通常は `appRoot` と同じです。

```text id="7uqfyx"
appRoot
   └─ riebeckite.config.ts
```

特殊な repository 構成で config を別の場所へ置く場合のみ変更します。

重要なのは、**`configRoot` を変更しても `content.directory` の基準は変わらない**ことです。

# contentRoot

`contentRoot` は、実際に Markdown や asset を読み込む場所です。

相対 `content.directory` は常に `appRoot` を基準に解決されます。

```ts id="jgnfqm"
content: {
  directory: "../vault",
}
```

なら、

```text id="y6zaw5"
contentRoot
  = path.resolve(appRoot, "../vault")
```

となります。

```mermaid id="uupc5x"
flowchart LR
    App["appRoot<br/>workspace/site"]
    Directory["content.directory<br/>../vault"]
    Root["contentRoot<br/>workspace/vault"]

    App --> Directory
    Directory --> Root
```

`process.cwd()` を基準にするわけではありません。

そのため CLI を別の directory から実行しても、同じ Site Application を解決できれば同じ Vault を参照できます。

# 外部 Vault を使う

Obsidian Vault を Site と独立して管理したい場合は、Site の外へ置く構成を推奨します。

たとえば、

```text id="bgmthg"
workspace/
├─ site/
│  ├─ package.json
│  ├─ vite.config.ts
│  ├─ riebeckite.config.ts
│  ├─ app/
│  └─ public/
│
└─ vault/
   ├─ index.md
   ├─ notes/
   ├─ attachments/
   └─ media/
```

という構成です。

```mermaid id="63njzu"
flowchart LR
    Site["site/<br/>HonoX / Vite Application"]
    Config["riebeckite.config.ts"]
    Vault["vault/<br/>Obsidian Content"]

    Site --> Config
    Config -->|"content.directory = ../vault"| Vault
```

Site と Vault の役割が明確に分離されます。

```text id="wx10hc"
site/
  → Application

vault/
  → Source Content
```

Vault を Vite application root にする必要はありません。

# 外部 Vault の設定例

```ts id="p5vg19"
// site/riebeckite.config.ts

import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  site: {
    title: "My notes",
  },

  content: {
    directory: "../vault",
    exclude: [
      ".obsidian/**",
      "Templates/**",
    ],
  },

  plugins: [
    obsidianMarkdown(),
    media(),
    attachment(),
  ],
});
```

この場合、

```text id="9w7l08"
appRoot
  = workspace/site

content.directory
  = ../vault

contentRoot
  = workspace/vault
```

となります。

絶対パスを指定することもできます。

```ts id="vmohm9"
content: {
  directory: "C:/Users/example/Documents/vault",
}
```

ただし絶対パスは開発 PC や CI で場所が変わると使えなくなるため、通常は Site からの相対パスを推奨します。

# `process.cwd()` に依存しない

Content directory を次のように組み立てることは避けてください。

```ts id="i3cfla"
directory: path.resolve(
  process.cwd(),
  "../vault",
)
```

CLI をどこから実行したかによって結果が変化するためです。

また、

```text id="p2j2rb"
appRoot = Vault
```

とする必要もありません。

Vault は **source data**、`appRoot` は **Site Application** です。

```mermaid id="xzz84j"
flowchart LR
    Vault["Vault<br/>Source Data"]
    Site["Site<br/>Application"]
    Build["Riebeckite"]

    Vault --> Build
    Site --> Build

    Build --> Output["Generated Site"]
```

この境界を維持してください。

# Application から ContentManager を使う

通常、HonoX Integration が `contentRoot` を自動的に解決します。

しかし Site の route などで直接 `ContentManager` を作る場合は、Integration と同じ絶対 path を使用する必要があります。

たとえば、

```ts id="veou0j"
// site/app/config.ts

import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfigModule } from "@riebeckite/core";
import * as rawConfigModule from "../riebeckite.config";

const appRoot = fileURLToPath(
  new URL("../", import.meta.url),
);

const rawConfig = resolveConfigModule(
  rawConfigModule,
);

export const config = {
  ...rawConfig,

  content: {
    ...rawConfig.content,

    directory: path.resolve(
      appRoot,
      rawConfig.content.directory,
    ),
  },
};
```

この時点で、

```ts id="9pr6g1"
config.content.directory
```

は絶対パスです。

そのため、別の基準からもう一度 `path.resolve()` しないでください。

```mermaid id="54gq7n"
flowchart LR
    Relative["../vault"]
    Resolve["appRoot から一度だけ resolve"]
    Absolute["C:/.../vault"]
    Manager["ContentManager"]

    Relative --> Resolve
    Resolve --> Absolute
    Absolute --> Manager
```

# Attachment と Media

Obsidian の attachment や media も `contentRoot` を基準に扱います。

たとえば Vault に、

```text id="qv3qcs"
vault/
├─ notes/
│  └─ report.md
├─ attachments/
│  └─ report.pdf
└─ media/
   └─ interview.mp3
```

があるとします。

Markdown では、

```md id="csovb2"
![[attachments/report.pdf]]

![[media/interview.mp3]]
```

のように参照できます。

`obsidianMarkdown()` はこれらを Vault からの相対 logical path として扱います。

`attachment()` と `media()` が対応する embed を描画します。

公開 URL は安定した形式になります。

```text id="j9hboh"
/assets/attachments/<Vault からの相対 logical path>
```

たとえば、

```text id="pfr5c3"
attachments/report.pdf

↓

/assets/attachments/attachments/report.pdf
```

のように logical path を維持します。

# Asset URL と実ファイルは別

ここは特に重要です。

Plugin が、

```text id="b1t4hs"
/assets/attachments/attachments/report.pdf
```

という URL を生成したからといって、`report.pdf` が自動的に Vite の `public/` へコピーされるわけではありません。

```mermaid id="otcz8u"
flowchart LR
    Vault["Vault Asset"]
    Plugin["Plugin"]
    URL["Public URL"]

    Vault --> Plugin
    Plugin --> URL

    Vault -. "自動コピーされない" .-> Public["public/"]
```

Site Application は、公開する必要がある asset だけを、

```text id="8m59d5"
public/assets/attachments/
```

へコピーする必要があります。

その際も Vault からの相対 path を維持します。

参照 Application の `build_images.ts` は、実際に参照されている asset だけを差分コピーする実装例です。

# Vault 全体を公開しない

次のような実装は避けてください。

```text id="wp29zc"
vault/**
   ↓
public/**
```

Vault 全体をそのまま `public/` へコピーすると、

- 非公開の記事
- 未参照 attachment
- `.obsidian/` の metadata
- 公開するつもりのないファイル

まで公開される可能性があります。

```mermaid id="mrfz4d"
flowchart TD
    Vault["Vault"]

    Vault --> Published["公開対象Content"]
    Vault --> UsedAssets["参照されているAssets"]
    Vault --> Private["非公開Content"]
    Vault --> Metadata[".obsidian / Metadata"]

    Published --> Public["Public Site"]
    UsedAssets --> Public

    Private -. "公開しない" .-> Public
    Metadata -. "公開しない" .-> Public
```

**必要な asset だけを公開する**ことが重要です。

Publish filter と asset copy policy は、publish boundary check が導入されるまでは Site Application 側の責務です。

# Plugin の設定

Plugin は `plugins` に指定します。

```ts id="93f0rv"
plugins: [
  obsidianMarkdown(),
  media(),
  attachment(),
]
```

条件によって Plugin を切り替えることもできます。

`PluginInput` では、

```text id="r4h4s2"
false
null
undefined
```

を無効な Plugin input として扱えます。

たとえば、

```ts id="7tk1jx"
plugins: [
  enableAnalytics && analytics(),
]
```

のような conditional configuration が可能です。

Config resolve 時に無効な input は除外され、有効な Plugin は安定した順序で整理されます。

その後 capability の整合性が検証されます。

# Theme の設定

Theme は `theme` で設定します。

```ts id="pgj2be"
theme: {
  colorMode: "system",
  articleLayout: "article",
}
```

raw configuration または宣言済み Theme を利用できます。

Theme は presentation の設定です。

HonoX、Vite、Cloudflare など Integration 固有の設定を Core configuration へ入れないでください。

```mermaid id="m54zmx"
flowchart TD
    Config["Riebeckite Config"]

    Config --> Site["Site"]
    Config --> Content["Content"]
    Config --> Markdown["Markdown"]
    Config --> Theme["Theme"]
    Config --> Plugins["Plugins"]

    Framework["HonoX / Vite / Platform"]
    Framework --> Integration["Integration Config"]

    Integration -. "Core Configへ混ぜない" .-> Config
```

# Config の検証

Configuration に問題がある場合は `ConfigValidationError` として報告されます。

不正な Configuration を無視してそのまま起動するのではなく、早い段階で失敗させます。

Config を変更した後は、

```sh id="khhx15"
pnpm exec riebeckite check
```

を実行してください。

# 外部 Vault のトラブルシュート

外部 Vault や複雑な directory 構成を使っている場合は、次の順番で確認すると原因を切り分けやすくなります。

```mermaid id="5yfgda"
flowchart LR
    Check["1. check"]
    Doctor["2. doctor"]
    Config["3. inspect config"]
    Content["4. inspect content --list"]
    Build["5. build"]

    Check --> Doctor
    Doctor --> Config
    Config --> Content
    Content --> Build
```

## 1. Config を検証する

```sh id="7x4ypg"
pnpm exec riebeckite check
```

Config と Plugin contract が正しいか確認します。

## 2. Content Source を診断する

```sh id="t7e22k"
pnpm exec riebeckite doctor
```

filesystem content source が存在しない、読み込めないなどの問題を確認します。

## 3. 解決された Directory を確認する

```sh id="rgnpgo"
pnpm exec riebeckite inspect config
```

`content.directory` が期待する絶対 path に解決されているか確認します。

## 4. Content を確認する

```sh id="4ssq64"
pnpm exec riebeckite inspect content --list
```

WikiLink や embed を調査する前に、期待する logical path と content が認識されていることを確認します。

## 5. 実際に Build する

```sh id="9wnm73"
pnpm exec riebeckite build
```

最後に Integration、SSG、route rendering まで含めて確認します。

# Config を Site の外へ置く

通常、

```text id="4p7m8h"
appRoot
  = configRoot
```

ですが、意図的に `riebeckite.config.ts` を別の directory に置くこともできます。

その場合は `riebeckiteVite()` に `configRoot` を指定します。

ただし、

```text id="8y2qf9"
appRoot
  → Site Application

configRoot
  → Config

contentRoot
  → Content / Vault
```

という役割は変わりません。

特に `appRoot` を Vault 側へ変更しないでください。

相対 `content.directory` は、`configRoot` ではなく引き続き **`appRoot` を基準**に指定します。

# まとめ

Configuration で特に重要なのは、Site と Content の場所を混同しないことです。

```mermaid id="zzmq0d"
flowchart LR
    App["appRoot<br/>Siteはどこ？"]
    Config["configRoot<br/>Configはどこ？"]
    Content["contentRoot<br/>Contentはどこ？"]

    Config --> Resolve["Configuration Resolution"]
    App --> Resolve
    Resolve --> Content

    Content --> Manager["Content System"]
    Manager --> Build["Build"]
```

基本的には、

```text id="htn7yn"
appRoot
  = Site Application の場所

configRoot
  = Config の場所

contentRoot
  = Markdown / Vault の場所
```

と覚えておけば十分です。

通常の Site では3つの違いを意識する必要はほとんどありません。

外部 Vault、別 repository の Content、特殊な monorepo 構成を使う場合だけ、この境界を意識してください。

Config の変更後は `riebeckite check`、実際にどう解決されたか確認したい場合は `riebeckite inspect config` を使用してください。
