# Configuration

`defineConfig` で configuration を宣言し、content/plugin より先に integration が resolve します。必須 top-level field は `site` です。任意で `content`、`markdown`、`theme`、`plugins` を指定します。

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My site", baseUrl: "https://example.com" },
  content: { directory: "content", exclude: ["drafts/**"], filters: { publishStrategy: "explicit" } },
  markdown: { syntaxHighlight: { theme: "github-dark" } },
  theme: { colorMode: "system", articleLayout: "article" },
  plugins: [],
});
```

## Content selection

`content.directory` は標準 filesystem source の場所、`content.source` は別の ContentSource です。競合する reader を二重に設定しません。`exclude` は content 化前に除外し、`filters.publishStrategy` は publication policy を指定します。対応する helper は `isExcluded` と `isPublished` です。

## Filesystem root と外部 Vault

Riebeckite は site application と source material を分けて扱います。次の名前はそれぞれ別の directory を指すため、混同しないでください。

| 名前 | 役割 | 既定値・解決基準 |
| --- | --- | --- |
| `appRoot` | HonoX/Vite application。`app/`、`public/`、route、生成 style、build output の設定を所有する | Vite の `root` |
| `configRoot` | `riebeckite.config.ts`、`.js`、`.mjs` がある directory | `appRoot` |
| `contentRoot` | 設定された content directory または Obsidian Vault の絶対 filesystem root | `path.resolve(appRoot, content.directory)` |

`configRoot` は config module を import する場所を決めます。一方、相対 `content.directory` の基準は常に `appRoot` であり、`configRoot` を変えても変わりません。integration は content や Plugin を実行する前に三つの root を解決し、CLI も同じ結果を使います。そのため、ネストした directory、CI の working directory、エディタの task から実行しても、読む Vault は変わりません。

### 推奨するディレクトリ構成

Obsidian でも独立して使う Vault、複数の site application から共有する Vault、別の Git repository で管理する Vault は、site の外に置きます。

```text
workspace/
├─ site/
│  ├─ package.json
│  ├─ vite.config.ts
│  ├─ riebeckite.config.ts
│  ├─ app/
│  └─ public/
└─ vault/
   ├─ index.md
   ├─ notes/
   ├─ attachments/
   └─ media/
```

この構成では、site の設定で Vault を明示します。

```ts
// site/riebeckite.config.ts
import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  site: { title: "My notes" },
  content: {
    directory: "../vault",
    exclude: [".obsidian/**", "Templates/**"],
  },
  plugins: [obsidianMarkdown(), media(), attachment()],
});
```

絶対パスの `directory` も有効ですが、開発端末や CI 間で移動しやすい相対パスを通常は推奨します。`process.cwd()` から値を組み立てたり、`appRoot` を Vault に向けたりしないでください。Vault は source data であり、Vite の application root は site のままにします。

### Application 側でコンテンツを読む場合

HonoX integration は content root を自動で解決します。一方、route や island のために Application が `ContentManager` を作る場合は、生の相対設定値ではなく、同じ絶対パスを使う必要があります。

```ts
// site/app/config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfigModule } from "@riebeckite/core";
import * as rawConfigModule from "../riebeckite.config";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const rawConfig = resolveConfigModule(rawConfigModule);

export const config = {
  ...rawConfig,
  content: {
    ...rawConfig.content,
    directory: path.resolve(appRoot, rawConfig.content.directory),
  },
};
```

この後の `ContentManager` には `config.content.directory` を渡します。この値はすでに絶対パスなので、別の基準で二度目の `resolve` をすると誤りやすくなります。`content.source` を指定する場合は filesystem reader を置き換えるため、同じ Vault に対する二つ目の reader として併用しません。

### Attachment と media

`obsidianMarkdown()` は Vault 内のファイルを `contentRoot` からの相対 logical path として扱います。たとえば `![[attachments/report.pdf]]` は `attachment()` が、`![[media/interview.mp3]]` は `media()` が描画します。生成する URL は次の安定した形式です。

```text
/assets/attachments/<Vault からの相対 logical path>
```

`attachment()` は解決済み Vault root から埋め込みファイルのサイズを読み、root 外の path を拒否します。`media()` は同じ logical path に対して対応する音声・動画を描画します。ただし、URL を描画してもバイナリファイルは Vite の public directory へ自動コピーされません。site application は公開するアセットだけを `public/assets/attachments/` へコピーし、Vault からの相対 path を維持する必要があります。参照 application の [`build_images.ts`](../../../apps/web/scripts/build_images.ts) は、参照中アセットだけを差分コピーする実装です。

Vault 全体をコピーして公開する近道は使わないでください。非公開ノート、未参照 attachment、`.obsidian` metadata が漏れるおそれがあります。publish filter と asset copy の policy は、publish boundary check が導入されるまで site application 側の責務です。

### 検証とトラブルシュート

ネストした application directory から CLI を実行し、current working directory に依存していないことを確認します。

```sh
cd site/app
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect config
pnpm exec riebeckite inspect content --list
pnpm exec riebeckite build
```

結果は次の順で確認します。

1. `check` は config と Plugin contract を検証します。
2. `doctor` は読めない、または不正な filesystem content source を報告します。
3. `inspect config` で解決済み directory を確認します。
4. WikiLink や embed を調べる前に、`inspect content --list` で期待する logical path を確認します。
5. `build` で integration と route rendering を検証します。

`riebeckite.config.ts` を意図的に Vite application の外へ置く場合は、`riebeckiteVite()` に `configRoot` を渡します。`appRoot` は site root のままにし、相対 `content.directory` はその root 基準で指定してください。

## Plugins and themes

PluginInput は conditional config の `false`、`null`、`undefined` を許容します。resolve は無効 input を除外し、enabled plugin を stable order で並べ、capability を検証します。Theme は raw config または宣言済み theme を指定できます。HonoX/Vite 固有設定を Core config に持ち込まないでください。

validation error は `ConfigValidationError` として可視化します。隠して起動を続けず、変更後に `riebeckite check` を実行してください。
