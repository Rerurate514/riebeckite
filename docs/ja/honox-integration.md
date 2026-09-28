# HonoX Integration

`@riebeckite/integrations-honox` は portable な Core と HonoX/Vite を接続します。application root/config の解決、Vite dev/build、SSG extension mapping、plugin/theme style entry の生成、HonoX application build workflow を所有します。

public API は `riebeckite`、`loadRiebeckiteConfig`、`buildHonoxApplication`、`resolveHonoxApplicationRoot`、`startHonoxDevServer`、`riebeckiteSsgExtensionMap` です。

Vite plugin は任意の `workspaceRoot`、`appRoot`、`configFile` を受け取ります。resolve 済み config を読み、`app/.riebeckite/` に plugin/theme import entry を生成し、workspace alias と client module を設定します。このディレクトリは integration output であり、application source として直接編集しません。

HonoX/Vite/Cloudflare/route API はこの integration か `apps/web` に閉じます。Plugin は asset、client entry、endpoint、renderer を公開できますが、Core は HonoX routing を所有しません。実際の route composition と island は application の責務です。
