# Framework Development

このページは、Riebeckite 本体を開発する人向けです。Core、CLI、HonoX integration、公式 Plugin、公式 Theme、template、参照アプリを変更する場合に使います。サイトを公開したいだけの人は、この monorepo を clone せず [Getting Started](../getting-started/README.md) から始めてください。

## clone と install

```bash
git clone https://github.com/rerurate/riebeckite.git
cd riebeckite
pnpm install
pnpm build
```

## よく使うコマンド

```bash
pnpm dev
pnpm build
pnpm check
pnpm check:docs
pnpm check:scaffold
pnpm test
```

可能な限り対象を絞って実行します。

- `pnpm check:docs`: Markdown link と docs 構造を検証
- `pnpm check:scaffold`: 生成 scaffold を検証
- `pnpm typecheck`: package の型検査
- `pnpm --filter <package> test`: package 単位のテスト

## リポジトリ構成

| Path | 役割 |
| --- | --- |
| `packages/core` | config、content、pipeline、plugin、theme、diagnostics、observability の公開 API |
| `packages/cli` | `riebeckite` コマンド |
| `packages/integrations/honox` | HonoX integration と scaffold generator |
| `packages/create-riebeckite` | サイト生成用の公開 entrypoint |
| `packages/plugins/*` | 公式 Plugin |
| `packages/themes/*` | 公式 Theme |
| `apps/web` | 公式ドキュメントアプリ兼、framework 開発用の参照アプリ |
| `docs/` | 公式ドキュメントアプリが読む documentation source |
| `templates/cloudflare` | deployment template |

## 境界

- Core に app、Plugin package 内部、framework 固有の逆向き依存を入れない
- 外部 Plugin / Theme は公開 export だけを使い、`src/**` を import しない
- 一般ユーザー向け docs で monorepo setup を要求しない
- scaffold は単体で動く site として保つ

関連: [Architecture](./architecture.md)、[Testing](./testing.md)、[CLI](../reference/cli.md)、[HonoX Integration](./honox-integration.md)
