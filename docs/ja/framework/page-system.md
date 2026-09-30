# Page System

Page System は、Plugin が application route を所有せずに独立した画面を提供するための仕組みです。通常の `RiebeckitePlugin` にある capability であり、別種の Plugin ではありません。

## 責務

| 層 | 責務 |
| --- | --- |
| Core | Page Type の contract、検証、path 列挙、解決、競合検出 |
| Plugin | Page Type ID、公開 path、framework 非依存の HTML body |
| HonoX integration | 共通 route resolver と SSG parameter helper |
| Site application | catch-all route、document frame、metadata、安全な HTML 描画 |
| Theme | token と stable hook による見た目。Page Type ID を知る必要はない |

`PluginPageContext.manifest` は public manifest です。そのため Page Type が参照できるのは、公開サイトに出せる entry だけです。

## 描画パイプライン

Page Type 導入前は、独立した Plugin 機能ごとに専用 route が必要でした。

```text
request -> Plugin 固有の application route -> Plugin component -> document frame
```

導入後は、Plugin が共通 route に参加します。

```text
build: Plugin Page Type -> public path -> SSG parameter
request: catch-all route -> resolveRiebeckiteRoute
                           -> plugin page | content | redirect
plugin page -> Site の document frame -> Theme CSS / Plugin client entry
```

route と frame は Site が所有します。Plugin は body fragment と、必要なら `title`、`description`、`headTags` を返します。document への反映方法は Site が決めます。

## Page Type を作る

独立画面には `pageTypes` を使います。Canvas、Bases、Excalidraw のように記事本文へ埋め込む機能には `renderers` を使います。これらは独立ページを必要としません。

```ts
import { definePlugin } from "@riebeckite/core";

export function reportPlugin() {
  return definePlugin({
    name: "report",
    pageTypes: [{
      id: "example.report",
      paths: ["/report"],
      resolve: ({ pathname, manifest }) => pathname === "/report"
        ? {
            type: "example.report",
            pathname,
            title: "Report",
            body: `<p>${manifest.publicEntries.length} published entries</p>`,
          }
        : null,
    }],
  });
}
```

ID は全 Plugin で一意です。複数の Page Type が一致した場合は最大の `priority` を選び、同順位は明示的にエラーにします。静的ページはすべて `paths` に書き、動的ページの SSG path は public manifest から導出してください。

## HonoX Site への接続

Plugin page を使う HonoX Site には共通 catch-all route が必要です。scaffold で生成する Site にはあらかじめ含まれています。

```tsx
import {
  pluginPageSsgParams,
  resolveRiebeckiteRoute,
} from "@riebeckite/honox/server";

export const ssgParams = async () => [
  ...(await contentRouteSsgParams(content)),
  ...(await pluginPageSsgParams(content)),
];

const route = await resolveRiebeckiteRoute(content, c.req.path);
if (route?.kind === "page") {
  c.set("headTags", route.page.headTags ?? []);
  return c.render(<div dangerouslySetInnerHTML={{ __html: route.page.body }} />);
}
```

HTML をどこまで許可するかは application boundary で決めます。Plugin は自ら生成責任を負える HTML だけを返し、application は信頼できない request input を page body として扱いません。フィールドと実行時検証の詳細は [Plugin API](../reference/plugin-api.md#page-type) を参照してください。
