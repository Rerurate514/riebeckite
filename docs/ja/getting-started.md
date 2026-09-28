# Getting Started

## 1. workspace を準備する

```sh
pnpm install
pnpm exec riebeckite check
pnpm exec riebeckite doctor
```

CLI は application directory から実行します。`check` は config/plugin capability の有効性、`doctor` は広い health を確認します。どちらも deployment build を生成しません。

## 2. configuration を置く

必須の `site` を指定し、content directory/source、publication policy、必要な plugins、theme を順に追加します。初めから全機能を有効にせず、必要な behavior だけを選んでください。詳しくは [Configuration](configuration.md)。

## 3. content を確認する

```sh
pnpm exec riebeckite inspect config
pnpm exec riebeckite inspect content --list
pnpm exec riebeckite inspect graph
```

Inspector は read-only です。設定や content が壊れている場合に state を生成して解決することはありません。

## 4. 開発・build する

```sh
pnpm exec riebeckite dev
pnpm exec riebeckite build
```

incremental reuse を明示的に避ける場合は `build --full` を使います。機能は plugin、見た目は theme、route/island は application に追加します。まず [Architecture](architecture.md) で配置先を確認してください。
