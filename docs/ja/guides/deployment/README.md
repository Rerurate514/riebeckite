# Deployment Guides

Riebeckite は `npm exec riebeckite build` で `dist/` を作ります。このディレクトリを Cloudflare Workers の静的アセットとして配信します。

| 方法 | 向いている用途 |
| --- | --- |
| [Cloudflare Workers](./cloudflare-workers.md) | 手元から公開する、または設定を理解する |
| [GitHub Actions](./github-actions.md) | site repository への push で自動公開する |
| [Separate Content Repository](./separate-content-repository.md) | content と site を別リポジトリで運用する |

通常の静的サイトでは runtime の `main` は不要です。`.riebeckite/` や Plugin の cache はビルド時の状態であり、公開アセットではありません。
