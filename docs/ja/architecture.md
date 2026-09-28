# Architecture

## package の責務

Riebeckite は依存方向を固定した pnpm workspace です。`packages/core` は config、content orchestration、manifest、graph、pipeline、plugin runtime、observability、theme contract といった持ち運べる基盤を所有します。Core は HonoX/Vite、特定 plugin、application UI を知りません。

| 場所 | 所有するもの |
| --- | --- |
| `packages/plugins/*` | 再利用可能な Markdown/HTML/metadata/assets/browser 拡張 |
| `packages/integrations/*` | framework・bundler・platform の接続 |
| `packages/themes/*` | theme config と CSS による presentation |
| `apps/web` | 実際の routes、islands、application components、Workers 接続 |
| `packages/cli` | Node 上の command と build tooling |

```text
Application -> Integration -> Core
Plugin --------------------> Core contracts
Theme ---------------------> Core theme contract
CLI -----------------------> Core / Integration
```

Core から outer layer への逆依存は作りません。もっとも内側で責務を完結できる package に配置します。

## content の流れ

`ContentSource` は scan/read、content identity、mtime・size・ETag・hash などの source metadata を所有します。`ContentManager` は public location の解決、parse、pipeline、plugin hooks、manifest、content graph を所有します。public URL は解決済み location（Core の default resolver `resolveDefaultContentLocation` → `resolveContentLocations` plugin hooks、`ContentManager.getContentLocations()`）から取得し、consumer は解決済み `permalink` を読みます。slug や filesystem path から URL を逆算しません。ContentManager に filesystem scan を再実装せず、source contract を利用してください。

```text
ContentSource -> ContentManager -> public location 解決
                                      |-> parse/process -> manifest / graph -> application
                                      `-> plugin hooks
```

Plugin は公開された contract から処理を拡張します。Theme は stable CSS hook、semantic token、`data-*` attribute、CSS cascade だけで見た目を変え、component や route を所有しません。

## build-time と runtime

`.riebeckite/build/content-state.json`、plugin cache、CLI、Doctor、Inspector、profile trace は Node/build-time の state です。Cloudflare Workers request runtime はこれらを読み書きせず、生成済み application と安定した content data のみを使います。失敗した build は以前の有効な state を置き換えません。

関連: [Content system](content-system.md)、[Plugin system](plugin-system.md)、[Theme system](theme-system.md)。
