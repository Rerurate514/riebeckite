---
date: 2026-10-23
title: Diagram Plugin Infrastructure
sidebar:
  label: Diagram infrastructure
---

# Diagram Plugin Infrastructure

`@riebeckite/diagram` は Diagram Plugin 向けの共有実装層です。HAST 上の fenced code block の検出、caption の解決、diagnostic の報告、アクセシブルな figure の出力、browser renderer の起動を共通化します。

この Package は Plugin 作者向けです。単体でサイトの機能を追加するものではなく、[Core の Plugin 契約](./plugin-system.ja.md)を置き換えるものでもありません。

## 責務の境界

この Package は `@riebeckite/core` に依存しますが、HonoX、browser renderer、Puppeteer、diagram engine には依存しません。Diagram Plugin は、engine、設定、style、失敗時の方針を引き続き所有します。

`defineDiagramPlugin()` は、共通の Plugin 形状を Core へ接続します。

- Plugin 名、順序、option、option validation
- `processedContentCache`
- rehype transformer
- 任意の stylesheet と page scope の client entry

renderer engine を選んだり、Core の cache 方針をこの Package へ移したりはしません。

## Diagram Plugin を作る

標準的な Diagram Plugin の形に当てはまる場合は、`defineDiagramPlugin()` を使います。Core の `processedContentCache` 方針と、解決済み option を受け取る rehype factory を渡してください。

```ts
import { defineDiagramPlugin } from "@riebeckite/diagram";
import rehypeExampleDiagram from "./rehype.js";

export function exampleDiagram() {
  return defineDiagramPlugin({
    name: "example-diagram",
    processedContentCache: {
      version: "example-v1",
      dependencyMode: "none",
    },
    rehype: () => rehypeExampleDiagram,
    style: ".rb-example-diagram { display: block; }",
    client: {
      moduleSpecifier: "@riebeckite/plugin-example-diagram/client",
      exportName: "initExampleDiagram",
    },
  });
}
```

engine 固有の初期化は factory の外に置きます。たとえば build renderer では browser process や WASM resource が必要になる場合があり、browser renderer では library の dynamic import が必要になる場合があります。

## Fenced block を figure に変換する

`findDiagramBlocks()` は対象となる `pre > code` block を見つけ、元の node を置換するために必要な source、language、parent、index を返します。`resolveDiagramCaption()` はまず code block の title を読み、次に Plugin 固有の caption strategy を試します。`reportDiagramDiagnostic()` は不正な source を Content 処理の diagnostic 経路で報告します。

`buildDiagramFigure()` は共通の figure 契約を出力します。

- `data-diagram` は diagram の kind を識別します。
- `data-diagram-status` は `pending`、`rendered`、`error` のいずれかです。
- `data-diagram-id` は安定した figure ID です。kind と source から決められる場合は `deterministicDiagramId()` を使います。
- `data-diagram-content` は canvas、image、SVG container を示します。
- `data-diagram-caption` と `data-diagram-fallback` は任意の caption と source fallback を示します。

helper は caption を content の前に置き、アクセシブルなラベルを関連付けます。描画に失敗したときにも source を見せる場合は `fallback: true` を指定します。

```ts
const figure = buildDiagramFigure({
  kind: "example",
  className: "rb-example-diagram",
  id: deterministicDiagramId("example", block.source),
  source: block.source,
  caption: resolveDiagramCaption(block),
  label: "Example diagram",
  content: { kind: "canvas" },
  fallback: true,
  status: "pending",
});
```

この Package は HAST の構築・走査 helper も提供します。これらは diagram transformation にだけ使い、syntax の解析や意味的な validation は各 Plugin に残してください。

## Browser rendering と SPA navigation

page client initializer では `renderPendingDiagrams()` を使います。渡された root に処理を限定し、abort signal を尊重して、成功した figure を `rendered` に更新し、失敗時には fallback を開きます。renderer は cleanup function を返せます。initializer はそれらをまとめた cleanup を返します。

```ts
import { renderPendingDiagrams } from "@riebeckite/diagram/client";

export async function initExampleDiagram({ root, signal }) {
  return renderPendingDiagrams(
    "example",
    async (figure) => {
      const canvas = figure.querySelector("canvas[data-diagram-content]");
      if (!canvas) return;
      const instance = renderExample(canvas);
      return () => instance.destroy();
    },
    { root, signal },
  );
}
```

この helper は別の SPA lifecycle を作りません。page client entry の mount と disposal は Core の `ClientLifecycle` が所有します。周辺の transaction と cancellation は [SPAランタイムの内部実装](./spa-runtime.ja.md) を参照してください。

browser renderer が engine 固有の色を選ぶ必要がある場合、`detectDiagramTheme()` で現在の `light` / `dark` preference を取得できます。

## Build-time renderer resource

build 時に描画する engine では、`createRenderSession()` が render を直列化し、任意の lazy resource を管理します。renderer には abort signal が渡され、不正な入力、renderer error、timeout、cancellation を分類します。session を dispose すると resource も cleanup されます。

session は utility であり、engine の方針を強制しません。resource の起動、retry 回数、timeout、cleanup は renderer ごとの要件に合わせて決めてください。

## 導入状況

この Package は関心ごと単位で導入できます。共有 HAST helper は Diagram Plugin 群で使われていますが、共通 figure と browser-rendering の契約を使っているのは現在 Chart.js Plugin です。ほかの Diagram Plugin は移行されるまで、既存の markup や renderer lifecycle を維持できます。

Diagram Plugin を変更するときは、既存の Content Cache と incremental build の挙動を保ち、transformation と client cleanup のテストを追加してください。一般的な pipeline の構成は [Content processing と拡張ポイント](./plugin-system/pipeline.ja.md) を参照してください。
