# HonoX Integration

`@riebeckite/integrations-honox` は portable な Core と HonoX/Vite を接続します。application root/config の解決、Vite dev/build、SSG extension mapping、plugin/theme style entry の生成、HonoX application build workflow を所有します。

public API は `riebeckite`、`loadRiebeckiteConfig`、`resolveHonoxApplication`、`buildHonoxApplication`、`resolveHonoxApplicationRoot`、`startHonoxDevServer`、`riebeckiteSsgExtensionMap` です。

Vite plugin は任意の `configRoot`、`appRoot`、`configFile`、monorepo 開発専用の `workspaceRoot` を受け取ります。`appRoot` の既定値は Vite root、`configRoot` の既定値は `appRoot` です。config は `configRoot` 基準で import し、`content.directory` は `appRoot` 基準で解決します。`resolveHonoxApplication` はこれらの root と resolve 済み config をまとめて返すため、CLI と Vite は同じ model を使います。`workspaceRoot` は monorepo で source package alias を使うためだけの指定です。npm で install した consumer は指定不要で、自身の `node_modules` から解決します。plugin は `app/.riebeckite/` に plugin/theme import entry を生成し、client module を設定します。このディレクトリは integration output であり、application source として直接編集しません。

記事 routing は、manifest に既に解決済みの public location（`byPermalink`、次に `redirects`）に対して request を解決します。filesystem path、directory layout、slug から URL を逆算しません。slug は content の内部 lookup key であり、public URL は解決済みの `permalink` です。

HonoX/Vite/Cloudflare/route API はこの integration か `apps/web` に閉じます。Plugin は asset、client entry、endpoint、renderer を公開できますが、Core は HonoX routing を所有しません。実際の route composition と island は application の責務です。
