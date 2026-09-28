# Configuration

`defineConfig` で configuration を宣言し、content/plugin より先に integration が resolve します。必須 top-level field は `site` です。任意で `content`、`markdown`、`theme`、`plugins` を指定します。

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My site", url: "https://example.com" },
  content: { directory: "content", exclude: ["drafts/**"], filters: { publishStrategy: "published" } },
  markdown: { syntaxHighlight: { theme: "github-dark" } },
  theme: { colorMode: "system", articleLayout: "article" },
  plugins: [],
});
```

`content.directory` は標準 filesystem source の場所、`content.source` は別の ContentSource です。競合する reader を二重に設定しません。`exclude` は content 化前に除外し、`filters.publishStrategy` は publication policy を指定します。対応する helper は `isExcluded` と `isPublished` です。

## Filesystem root

`configRoot` は `riebeckite.config.*` を置く directory、`appRoot` は HonoX/Vite application の directory です。config module は `configRoot` 基準で import し、相対 `content.directory` は `appRoot` 基準で解決します。integration はこれらの root と、解決済みの絶対 `contentRoot` を一緒に決定します。`contentRoot` は project/application root の外部にも置けるため、Obsidian Vault を site application と分離したまま利用できます。

```ts
content: { directory: "../my-obsidian-vault" }
```

filesystem content と attachment plugin は current working directory ではなく、この解決済み Vault root を基準に扱います。通常の standalone site では両者とも Vite root です。config を意図的に別の場所に置く場合だけ `configRoot` を指定してください。

PluginInput は conditional config の `false`、`null`、`undefined` を許容します。resolve は無効 input を除外し、enabled plugin を stable order で並べ、capability を検証します。Theme は raw config または宣言済み theme を指定できます。HonoX/Vite 固有設定を Core config に持ち込まないでください。

validation error は `ConfigValidationError` として可視化します。隠して起動を続けず、変更後に `riebeckite check` を実行してください。
