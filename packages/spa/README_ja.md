# @riebeckite/spa

Riebeckite Site 向けの opt-in browser navigation runtime です。

[English](./README.md)

## インストール

Site の Riebeckite 設定で `spa` を有効にすると、`@riebeckite/honox` がこの
package を読み込みます。HonoX integration を使う Application では、直接 import
する必要はありません。

```sh
pnpm add @riebeckite/spa
```

## 使い方

`riebeckite.config.ts` で navigation を有効にします。

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  spa: true,
});
```

navigation を無効にする場合は `spa: false` を指定するか、`spa` を省略します。
runtime をカスタマイズする場合は `true` の代わりに設定 object を渡します。

```ts
export default defineConfig({
  spa: { prefetch: "hover", viewTransitions: true },
});
```

server renderer は各 page に一つの
`<main id="main-content" tabindex="-1">` を出力する必要があります。runtime は
同一 origin の GET navigation が成功した後にこの root を置換します。Application
shell は残し、page が所有する head metadata を reconcile し、history と scroll
state を復元し、page root へ focus を移して assistive technology に新しい page を
通知します。

modifier key を使う link、別の target を持つ link、`download`、
`data-spa="false"` を指定した link は通常の browser 動作を維持します。transition
に失敗した場合は document navigation へ fallback します。

## Public API

- `spa(options)` — Riebeckite の SPA configuration value を作成します。
- `startSpaNavigation(options)` — custom browser integration 向けに navigation を
  開始し、cleanup function を返します。

runtime の設計と integration の制約は
[SPA navigation documentation](../../docs/docs/framework/spa-navigation.ja.md)
を参照してください。
