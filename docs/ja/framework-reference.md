# Framework Reference

## Core の public surface

portable API は `@riebeckite/core` から import します。root export は互換性の boundary です。private module の deep import は実装調査など明確な理由がある場合だけにしてください。

主な export は `defineConfig`、`resolveConfig`、`isExcluded`、`isPublished`、ContentSource/`ContentManager`、public location contract（`ContentLocationInput`、`ContentPublicLocation`、`resolveDefaultContentLocation`）、manifest/graph、`Pipeline`、plugin/dependency error、build-state/cache、diagnostics、observability、post/publish type、`defineTheme` を含む theme contract です。

## 拡張点

| 拡張 | 目的 |
| --- | --- |
| ContentSource | scan/read/metadata semantics を保った source I/O の差し替え |
| Plugin | pipeline、hooks、public location 解決（`resolveContentLocations`）、diagnostics、assets、client entries、endpoints、SEO、graph、renderers の追加 |
| Theme | config、style、CSS token、`data-*` attributes の提供 |
| Integration | Core と framework/bundler の接続。現在は HonoX/Vite |

Renderer は扱わない input に `null` を返します。Endpoint は reusable HTTP behavior を公開できますが、Core を HonoX router にするものではありません。

build/runtime boundary を越える public data は serializable に保ちます。既存 abstraction を迂回する export を増やす前に ownership を決めてください。config validation や plugin dependency failure は明示的な error として扱い、null protocol を新設しません。
