---
date: 2026-10-08
title: はじめてのプラグイン作成
---
# はじめてのプラグイン作成

プラグインは**機能**（Markdown や HTML の変換、ブラウザ側の動作、独立したページ、SEO、診断など）を追加する仕組みです。見た目だけを変えたいときは、テーマ（[はじめてのテーマ作成](../themes/writing-a-theme.ja.md)）を使います。プラグインの独立ページはサイト共通のルートで表示します。サイト固有の画面だけを App（`app/`）のルートに置いてください。

プラグインは信頼されたアプリケーションコードです。HTML、ページ本文、head タグ、クライアントエントリ、エンドポイント、生成ファイルを出力する場合、信頼できないテキストのエスケープと、その出力先に応じた URL の検証はプラグインの責任です。Riebeckite は Markdown 中の生の HTML をそのまま保持し、プラグインが生成した HTML のサニタイズは行いません。詳しくは [セキュリティモデル](../security.ja.md) を参照してください。

プラグインが UI を生成するときは、[アクセシビリティの取り決め](../accessibility.ja.md) に従ってください。意味のある HTML を選び、リンクとボタンには実際の要素を使い、キーボード操作とフォーカス管理を保ちます。ARIA の状態は、ARIA が必要な場合にだけ同期します。

## このページでたどる流れ

このページでは、空のフォルダから配布できるプラグインまでを一続きで扱います。

```text
最小のプラグインを作る（1〜2）
   ↓
Markdown / HTML を変換する（3、実践）
   ↓
出力をテストする（プラグインをテストする）
   ↓
配布用のパッケージにする（5）
   ↓
外部パッケージとして検証する（tests/plugin-dx / test:plugin-dx:external）
```

1つのサイトの中でだけ使うなら、パッケージ化の手前で止めてかまいません。配布する場合にだけ、パッケージ化と外部での検証まで進めます。各拡張ポイントの正確な取り決めは [Plugin API](../reference/plugin-api.ja.md) を参照してください。

## 1. 最小のプラグインを作る

プラグインは `@riebeckite/core` の `definePlugin` で作ります。パッケージにする必要はなく、サイトの中に直接置けます。

```ts
// extensions/local-plugin.ts
import { definePlugin } from "@riebeckite/core";

export function localPlugin() {
  return definePlugin({
    name: "local",
  });
}
```

`riebeckite.config.ts` の `plugins` 配列に登録します。

```ts
// riebeckite.config.ts
import { localPlugin } from "./extensions/local-plugin";

export default defineConfig({
  plugins: [localPlugin()],
  // ...
});
```

`name` だけのプラグインは、何もしない最小構成です。オプションを受け取りたいときは、factory に引数と型を追加します。

```ts
type LocalOptions = { enabled?: boolean };

export function localPlugin(options: LocalOptions = {}) {
  return definePlugin({ name: "local", options });
}
```

## 2. CSS を追加する

プラグイン固有のスタイルシートは `assets` で宣言します。CSS をサイトへ手でコピーしたり、ブラウザから `/node_modules` を直接参照させたりしないでください。

```ts
// extensions/local-plugin.ts
import { definePlugin } from "@riebeckite/core";

export function localPlugin() {
  return definePlugin({
    name: "local",
    assets: [
      {
        pluginName: "local",
        kind: "style",
        moduleSpecifier: "/extensions/plugin.css",
      },
    ],
  });
}
```

- `moduleSpecifier` には、ホスト側のバンドラーが解決できるものを指定します。サイト内のプラグインなら `/extensions/plugin.css` のようなパスです。
- 描画する最外要素には、`rr-<feature>` のような安定したルートフックを付けます。CSS の規約は [Plugin API](../reference/plugin-api.ja.md) を参照してください。

## 3. Markdown / HTML を変換する

Markdown の意味を変える変換は、プラグインの仕事です。簡単な remark プラグインなら配列で宣言できます。

```ts
// extensions/local-plugin.ts
import { definePlugin } from "@riebeckite/core";

function remarkLocal() {
  return (tree: unknown) => {
    // tree（Markdown AST）を加工する
    return tree;
  };
}

export function localPlugin() {
  return definePlugin({ name: "local", remarkPlugins: [remarkLocal] });
}
```

処理の流れ自体を細かく組み立てたいときは、`extendMarkdownPipeline` / `extendHtmlPipeline` を使います。依存関係、ライフサイクルフック、レンダラー、エンドポイントなどの拡張ポイントは [Plugin API](../reference/plugin-api.ja.md) を参照してください。

`remarkPlugins`、`rehypePlugins`、`extendMarkdownPipeline` は同じパイプラインに加わります。Riebeckite は `remark-parse`、`remark-directive`、`remark-gfm` などの基本となるプラグインを、作成するプラグインより先に実行します。そのため、`:::tip` のようなディレクティブ記法や GFM はすでに AST ノードとして渡されます。これらを自分でインストールしたり登録したりする必要はありません。

コンテンツの変換に参加するプラグインは、`processedContentCache` も宣言してください。宣言がなくても動作はしますが、そのサイトの処理済みコンテンツのキャッシュが無効になり、ビルドのたびに Markdown が再処理されます。ほかのプラグインのコンテンツに依存しない単独の変換なら `{ version: "1", dependencyMode: "none" }`、ほかのプラグインの出力に依存するなら `tracked` を指定します。正確に追跡できない場合に限り `unsafe` を使います。

## 実践: ディレクティブプラグインを最後まで作る

ここでは、次の Markdown を独自の Tip ブロックに変換するプラグインを作ります。

```md
:::tip[Heads up]
Save often.
:::
```

最終的には、次の HTML が生成されます。

```html
<aside class="rr-tip">
  <p class="rr-tip__title">Heads up</p>
  <p>Save often.</p>
</aside>
```

作業は4つの手順に分かれます。

1. Markdown を変換するプラグインを作る
2. 見た目を整える CSS を追加する
3. `riebeckite.config.ts` に登録する
4. 期待どおりの HTML が生成されるかテストする

### 手順 1: プラグインを作る

`extensions/tip-plugin.ts` を作成します。

まず、プラグインの入口から見ていきます。

```ts
import { definePlugin } from "@riebeckite/core";

export function tipPlugin() {
  return definePlugin({
    name: "tip",

    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkTip);
    },

    assets: [
      {
        pluginName: "tip",
        kind: "style",
        moduleSpecifier: "/extensions/plugin.css",
      },
    ],
  });
}
```

ここでやっていることは2つだけです。

- `remarkTip` という Markdown の変換を加える
- `/extensions/plugin.css` をスタイルシートとして読み込む

`:::tip` を実際に `<aside>` へ変えるのが `remarkTip` です。

#### `:::tip` を見つける

import と、ディレクティブを扱うための型を追加します。

```ts
import { definePlugin } from "@riebeckite/core";
import type { Parent, Root } from "mdast";
import { visit } from "unist-util-visit";

type ContainerDirective = {
  type: "containerDirective";
  name: string;
  children: Parent["children"];
  data?: Record<string, unknown>;
};
```

この例では、AST ノードの型には `mdast`、ツリーの走査には `unist-util-visit` を使います。どちらも通常の npm パッケージとして自分のパッケージに追加してください。`@riebeckite/core` からは import しません。

Riebeckite の Markdown パイプラインでは、`:::tip` のような記法がプラグインの実行前に解析済みです。`remark-directive` によって `containerDirective` ノードになります。

そのため、プラグインが Markdown の文字列を自分で解析する必要はありません。

`unist-util-visit` でそのノードを探します。

```ts
function remarkTip() {
  return (tree: Root) => {
    visit(tree, "containerDirective", (node) => {
      const directive = node as unknown as ContainerDirective;

      if (directive.name !== "tip") return;

      // ここで :::tip を変換する
    });
  };
}
```

`containerDirective` には `tip` 以外のディレクティブも含まれます。

そのため、

```ts
if (directive.name !== "tip") return;
```

と書き、`:::tip` だけを処理します。

#### `<aside>` に変換する

見つけた `:::tip` に対して、生成する HTML 要素を指定します。

```ts
directive.data = {
  ...directive.data,
  hName: "aside",
  hProperties: {
    className: ["rr-tip"],
  },
};
```

ここで、

```ts
hName: "aside"
```

が HTML 要素を、

```ts
className: ["rr-tip"]
```

がクラスを指定しています。

つまり、

```md
:::tip
Save often.
:::
```

は最終的に、

```html
<aside class="rr-tip">
  <p>Save often.</p>
</aside>
```

と出力されます。

#### `[Heads up]` をタイトルにする

次は、

```md
:::tip[Heads up]
Save often.
:::
```

の `[Heads up]` をタイトルにします。

`remark-directive` は、このラベルをディレクティブの最初の子ノードとして渡します。

そこで、最初の子がラベルかどうかを確認します。

```ts
const [first, ...rest] = directive.children;

const hasLabel =
  first?.type === "paragraph" &&
  (first as { data?: { directiveLabel?: boolean } }).data
    ?.directiveLabel === true;
```

ラベルがあれば、

- 最初の子 → タイトル
- それ以降 → 本文

と分けます。

```ts
const titleChildren = hasLabel
  ? (first as Parent).children
  : [];

const bodyChildren = hasLabel
  ? rest
  : directive.children;
```

続いて、タイトルを

```html
<p class="rr-tip__title">
```

という要素として追加します。

```ts
directive.children = [
  {
    type: "paragraph",
    data: {
      hName: "p",
      hProperties: {
        className: ["rr-tip__title"],
      },
    },
    children: titleChildren,
  },
  ...bodyChildren,
];
```

これで、

```md
:::tip[Heads up]
Save often.
:::
```

から、

```html
<aside class="rr-tip">
  <p class="rr-tip__title">Heads up</p>
  <p>Save often.</p>
</aside>
```

が得られます。

#### プラグイン全体

ここまでの内容をまとめると、`extensions/tip-plugin.ts` は次のようになります。

```ts
import { definePlugin } from "@riebeckite/core";
import type { Parent, Root } from "mdast";
import { visit } from "unist-util-visit";

type ContainerDirective = {
  type: "containerDirective";
  name: string;
  children: Parent["children"];
  data?: Record<string, unknown>;
};

function remarkTip() {
  return (tree: Root) => {
    visit(tree, "containerDirective", (node) => {
      const directive = node as unknown as ContainerDirective;

      if (directive.name !== "tip") return;

      const [first, ...rest] = directive.children;

      const hasLabel =
        first?.type === "paragraph" &&
        (first as { data?: { directiveLabel?: boolean } }).data
          ?.directiveLabel === true;

      const titleChildren = hasLabel
        ? (first as Parent).children
        : [];

      const bodyChildren = hasLabel
        ? rest
        : directive.children;

      directive.data = {
        ...directive.data,
        hName: "aside",
        hProperties: {
          className: ["rr-tip"],
        },
      };

      directive.children = [
        {
          type: "paragraph",
          data: {
            hName: "p",
            hProperties: {
              className: ["rr-tip__title"],
            },
          },
          children: titleChildren,
        },
        ...bodyChildren,
      ];
    });
  };
}

export function tipPlugin() {
  return definePlugin({
    name: "tip",

    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkTip);
    },

    assets: [
      {
        pluginName: "tip",
        kind: "style",
        moduleSpecifier: "/extensions/plugin.css",
      },
    ],

    processedContentCache: {
      version: "1",
      dependencyMode: "none",
    },
  });
}
```

> `extendMarkdownPipeline` は、Markdown の AST を直接操作できる低レベルな拡張ポイントです。この例では、ディレクティブから生成される HTML 構造そのものを変える必要があるため使っています。

### 手順 2: スタイルシートを追加する

次に、`extensions/plugin.css` を作成します。

```css
.rr-tip {
  border-left: 2px solid var(--rb-color-accent);
  padding: 0.75rem 1rem;
}

.rr-tip__title {
  margin-block: 0 0.25rem;
  font-weight: 600;
}
```

先ほど生成した要素にスタイルを当てます。

```html
<aside class="rr-tip">
```

と、

```html
<p class="rr-tip__title">
```

の2つです。

色は固定値ではなく、

```css
var(--rb-color-accent)
```

という Riebeckite のテーマトークンを使っています。

こうしておけば、利用するテーマが変わっても、そのテーマのアクセントカラーに追従できます。

これがテーマ拡張の取り決めの基本です。プラグインは最外要素に安定したルートフック（`rr-<feature>`。ここでは `rr-tip`）を付け、色や余白には `--rb-*` のセマンティックトークンを使います。`--rb-*` はライト、明示的なダーク、システムのダークのいずれでも解決されるため、通常は `prefers-color-scheme` や `[data-theme]` を自分で分岐する必要はありません。`.dark` クラスには依存しないでください。ダーク専用の分岐が本当に必要な場合の書き方を含む詳細は [Theme API](../reference/theme-api.ja.md) を参照してください。

### 手順 3: プラグインを登録する

作ったプラグインを `riebeckite.config.ts` に登録します。

```ts
import { defineConfig } from "@riebeckite/core";
import { tipPlugin } from "./extensions/tip-plugin";

export default defineConfig({
  plugins: [
    tipPlugin(),
  ],
});
```

これで、Markdown に

```md
:::tip[Heads up]
Save often.
:::
```

と書けば Tip が表示されます。

### 手順 4: 出力をテストする

最後に、期待どおりの HTML が生成されるかテストします。

このテストのためにサイト全体をビルドする必要はありません。`Pipeline` を直接実行すれば、Markdown の変換結果だけを確認できます。

`extensions/tip-plugin.test.ts` を作成します。

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { Pipeline } from "@riebeckite/core";
import { tipPlugin } from "./tip-plugin.ts";

test("renders :::tip as an aside with a title", async () => {
  const pipeline = new Pipeline(
    new Map(),
    new Map(),
    undefined,
    {
      plugins: [tipPlugin()],
    },
  );

  const { html } = await pipeline.execute(
    ":::tip[Heads up]\nSave often.\n:::",
  );

  assert.match(
    html,
    /<aside class="rr-tip">/,
  );

  assert.match(
    html,
    /<p class="rr-tip__title">Heads up<\/p>/,
  );

  assert.match(
    html,
    /Save often\./,
  );
});
```

このテストでは3つの点を確認しています。

```text
:::tip
   ↓
<aside class="rr-tip">

[Heads up]
   ↓
<p class="rr-tip__title">Heads up</p>

Save often.
   ↓
本文として出力される
```

これで、Markdown の変換、スタイルシートの追加、プラグインの登録、出力のテストまでを備えた、サイト内で動く小さなプラグインが完成しました。

### この例で押さえること

この例で使った AST 操作をすべて覚える必要はありません。

押さえておきたいのは、Riebeckite のプラグインでは

```ts
definePlugin({
  name: "...",

  extendMarkdownPipeline: (pipeline) => {
    pipeline.use(...);
  },

  assets: [...],
});
```

という形で、Markdown の変換やスタイルシートを1つのプラグインにまとめられることです。

`extendMarkdownPipeline` は remark と mdast を直接扱う低レベルな API です。独自の Markdown 構文や複雑な変換が必要なときに使います。

この例では、`processedContentCache` も宣言しています。宣言がなくても動作はしますが、サイトの処理済みコンテンツのキャッシュが無効になり、ビルドのたびに Markdown が再処理されます。現在のコンテンツだけに依存する単独の変換なら `dependencyMode: "none"`、ほかのプラグインの出力に依存するなら `tracked` を指定します。正確に追跡できない場合に限り `unsafe` を使います。`version` は変換の意味が変わったときに上げてください。プラグインの `options` と変換関数の内容もパイプラインのフィンガープリントに含まれるため、オプションの変更だけで `version` を上げる必要はありません。

## プラグインをテストする

プラグインのテストは、確かめたい範囲に応じて4つのレベルに分けられます。すべてを行う必要はありません。変更した挙動を確かめられる最小のレベルから始めてください。

```text
レベル 1  純粋なロジック         通常のテストランナーだけでよい（AST ヘルパー、文字列変換など）
レベル 2  Markdown / HTML         Pipeline にプラグインを渡して変換結果を検証する
レベル 3  コンテンツ / ライフサイクル  ContentManager とインメモリの ContentSource で manifest やフックを検証する
レベル 4  パッケージの公開境界    pack したパッケージを隔離プロジェクトへインストールして検証する
```

### レベル 1: 純粋なロジック

オプションの解決や文字列・AST のヘルパーなど、Riebeckite に依存しない処理は、`node:test` などの通常のテストランナーでそのままテストできます。このレベルでは Riebeckite のテスト基盤は要りません。

### レベル 2: Markdown / HTML の変換

`Pipeline` にプラグインを渡し、代表的な Markdown を `execute()` に通して、意味のある出力が得られるか検証します。実践の手順 4 で書いたテストがこれです。

```ts
const pipeline = new Pipeline(new Map(), new Map(), undefined, {
  plugins: [tipPlugin()],
});

const { html } = await pipeline.execute(
  ":::tip[Heads up]\nSave often.\n:::",
);
```

`Pipeline` の第1引数と第2引数は、コンテンツインデックスと permalink の解決に使う `Map` です。1つのファイルの変換を確かめるだけなら空の `Map` で足ります。第3引数（`getMarkdownBySlug`）は、埋め込みなど他のコンテンツを参照する場合にだけ必要です。

### レベル 3: コンテンツとライフサイクル

コンテンツの読み込み、フック、manifest、Page Type などを検証するには `ContentManager` を使います。実際のファイルシステムを用意する代わりに、小さなインメモリの `ContentSource` を渡します。

```ts
const source = {
  async scan() {
    return [{ path: "notes/index.md" }];
  },
  async read(entry) {
    return `# ${entry.path}`;
  },
};

const manager = new ContentManager(source, [], { config });
const manifest = await manager.getManifest();
```

より詳しいパターンは [テスト](../framework/testing.ja.md) を参照してください。

### レベル 4: パッケージの公開境界

配布するパッケージは、pack した tarball を monorepo の外にある隔離プロジェクトへインストールして検証します。これにより、公開エクスポートの不足、`@riebeckite/core/src/**` への誤った依存、`dependencies` の宣言漏れ、型定義の欠落などを検出できます。このリポジトリでは `tests/plugin-dx` が実例で、`pnpm test:plugin-dx` と `pnpm test:plugin-dx:external` で実行します。

## 4. 独立したページを追加する（必要な場合）

独立したページには `pageTypes` を使います。Page Type は HTML の body を返し、サイト共通の catch-all ルートがドキュメントの枠とテーマを適用します。ページでエントリを一覧するときは `manifest.discoverableEntries` を読んでください。`manifest.publicEntries`（`unlisted` を含む）と `manifest.entries`（`draft` や `scheduled` を含む）は、本当に必要な場面だけに取っておきます。詳しくは [Manifest のコレクションと公開境界](../reference/plugin-api.ja.md#マニフェストのコレクションと公開範囲) を参照してください。プラグイン固有の HonoX ルートは追加しません。Canvas、Bases、Excalidraw のような記事本文への埋め込みは、これまでどおり `renderers` で扱います。

```ts
pageTypes: [{
  id: "local.report",
  paths: ["/report"],
  resolve: ({ pathname }) => pathname === "/report"
    ? { type: "local.report", pathname, title: "Report", body: "<p>Ready</p>" }
    : null,
}],
```

scaffold が生成する HonoX ルートは、すでに `resolveRiebeckiteRoute` と `pluginPageSsgParams` を使っています。ID は全体で一意にし、動的ページの SSG パスは公開 manifest から導いてください。自分が所有しないパスでは `null` を返します。責務の分担と全体の接続は [Page System](../framework/page-system.ja.md) を参照してください。

## 5. 配布用のパッケージにする（任意）

サイト内のプラグインとして動くようになれば、パッケージにできます。雛形は `packages/plugins/backlinks` です。

```text
packages/plugins/backlinks/
├─ index.ts              ← definePlugin を呼ぶ factory、公開する部品の再エクスポート
├─ components/           ← コンポーネント（必要なら）
├─ src/                  ← 実装（型・ヘルパーなど）
├─ styles/style.css      ← プラグインの CSS
├─ package.json          ← "." / "./components" / "./style.css" を exports で公開
├─ README_ja.md
└─ README.md
```

外部に配布するプラグインは `@riebeckite/core` だけに依存し、自分のサブパスを `exports` で宣言します。`@riebeckite/core/src/**` を import したり、monorepo 内部のパスを参照したりしないでください。パッケージの構成と、ESM と型定義を同梱するビルドについては [リポジトリ外でプラグインを配布する](../reference/plugin-api.ja.md#リポジトリ外へプラグインを配布する) を参照してください。`createStyleAsset()` と `createClientEntry()` には、その `exports` のサブパスを明示して渡します。

このディレクティブプラグインを配布するなら、依存を宣言します。`@riebeckite/core` と `unist-util-visit` は `dependencies`、`mdast` の型（`@types/mdast`）は `devDependencies` です。`package.json` の全体像と、esbuild と `tsc` によるビルドスクリプトの例は [リポジトリ外でプラグインを配布する](../reference/plugin-api.ja.md#リポジトリ外へプラグインを配布する) にあります。

## 6. 検証する

```sh
npm exec riebeckite check              # 設定と Plugin の解決を検証
npm exec riebeckite doctor             # 健全性診断
npm exec riebeckite inspect plugins    # 解決済みの Plugin 一覧を確認
npm exec riebeckite build              # 生成物に反映されるか確認
```

`check`、`doctor`、`inspect` は読み取り専用です。プラグインが解決されないときは、まず `check` のメッセージで capability エラーや import エラーを確認してください。プラグインを作る前に、その要件を設定や App 側のコードで済ませられないかも検討してください。

## UI や出力を追加する方法

プラグインが UI を追加する方法はいくつかあります。用途に合う最小のものを選んでください。上から順に優れているという意味ではなく、組み合わせてもかまいません。

```text
UI や出力を追加したい
│
├─ Markdown / HTML 自体を変換する
│    └─ remark / rehype パイプライン
│
├─ 埋め込みコンテンツを描画する
│    └─ renderers
│
├─ 独立したページを追加する
│    └─ pageTypes
│
├─ 記事レイアウトに自動で表示する
│    └─ データヘルパー + JSX コンポーネント
│
├─ サイト作者に配置を任せる
│    └─ Hono JSX コンポーネントをエクスポート
│
└─ ブラウザ側で強化する
     └─ clientEntries（必要ならサイト所有の Island）
```

### 記事レイアウトに自動で配置する

出力の置き場所が決まっていて、プラグインを有効にすればすぐ表示したい場合は、データヘルパーと JSX コンポーネントを使います。プラグインは、型付きのモデルを返すデータヘルパーと、それを描画する JSX コンポーネントをエクスポートします。サイト側がヘルパーを呼び、自分のレイアウトにコンポーネントを置きます。

```ts
import { Backlinks, getBacklinks } from "@riebeckite/plugin-backlinks";

const backlinks = await getBacklinks({ view, slug: entry.slug });
// ...
return <Backlinks backlinks={backlinks} />;
```

ヘルパーは絞り込まれた `PublicContentView` を読むため、公開境界が許すコンテンツだけを表示できます。コンポーネントは表示するものがないとき `null` を返すので、サイト側は無条件に描画できます。ヘルパーとコンポーネントの取り決めは [UI コンポーネント](../reference/plugin-api.ja.md#uiコンポーネント) を参照してください。

### Hono JSX コンポーネントで手動配置する

UI の置き場所をサイト作者に任せたい場合は、通常の Hono JSX コンポーネントをエクスポートします。コンポーネントレジストリやプラグイン固有のコンポーネント API はありません。ほかのコンポーネントと同じように import して組み合わせます。

パッケージの `exports` に `./components` サブパスを宣言し、コンポーネントモジュールの default export を保ちます。必要なら同じコンポーネントをパッケージのルートから名前付きでも再エクスポートします。既存のプラグインはこの形に従っています。

```ts
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { TableOfContents } from "@riebeckite/plugin-toc";
import { SearchBar } from "@riebeckite/plugin-search";
import BacklinksDefault from "@riebeckite/plugin-backlinks/components";
```

`color-mode` はルートのみの形です。`ColorModeScript` と `ColorModeToggle` をパッケージのルートから公開し、`./components` サブパスを持ちません。名前は各パッケージの README に従ってください。

### コンポーネントと素の HTML のどちらにするか

判断の分かれ目は**誰が配置するか**です。JSX コンポーネントなら、サイト側が props、順序、位置を自分のコンポーネントツリーの中で選べます。プラグインがすでに HTML を生成している場合（HAST 変換など）は、代わりに小さな文字列レンダラーをエクスポートし、サイト側から呼んでもらうこともできます。どちらの場合も、プラグインが manifest のエントリへマークアップを注入することはありません。何をどこに描画するかはサイト側が決めます。

`backlinks` と `local-graph` はコンポーネントとデータヘルパーの両方をエクスポートします。リファレンスサイトは記事レイアウトでこれらを組み合わせています。よくあるパターンであり、必須ではありません。

### ブラウザ側の強化と Island

プラグインは `app/islands/` を所有しません。Riebeckite にもプラグイン用の Island レジストリはありません。ブラウザ側の動作が必要な場合は、サーバーで描画済みの DOM を強化する `clientEntries` の初期化関数を提供します。コンポーネントの状態が必要なら、サイト側がプラグインのコンポーネントを自分の HonoX Island で包みます。`garden-explorer` は Page Type とクライアントエントリを組み合わせた特殊な例であり、必須のパターンとして一般化しないでください。詳しくは [クライアントエントリ](../reference/plugin-api.ja.md#クライアントエントリ) を参照してください。

## 関連資料

- [[plugin-system|プラグイン作成の詳細]]：この入門の詳細編（拡張ポイント・capability・ライフサイクル・配布）
- [[plugin-api|Plugin API]]：すべての拡張ポイントの詳細
- [[testing|テスト]]：プラグインのテスト戦略と外部パッケージの検証
- [[theme-api|Theme API]]：テーマ拡張の取り決めとセマンティックトークン
- [[architecture|Architecture]]：Core / Plugin / Integration / Theme / App の責務
- [[reference/README|Framework Reference]]：`definePlugin` などの公開 API
