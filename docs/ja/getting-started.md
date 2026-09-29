# Getting Started

## 1. workspace を準備する

新しい Site は先に生成してから install・検証します。

```sh
npx create-riebeckite my-site
cd my-site
npm install
npx riebeckite check
npx riebeckite doctor
```

`create-riebeckite` は config、HonoX の application shell、route、stylesheet、初期 content を含む自己完結の Site を生成します。生成対象のファイルが既にあるディレクトリには `--force` なしでは書き込みません。構成は `--preset <name>` で選択でき、既定は `starter`（7 言語対応）です。`npx create-riebeckite --list-presets` で `empty`・`minimal` から `full`・`max`・`ultra` までの全 preset を確認できます。

CLI は application directory から実行します。`check` は config/plugin capability の有効性、`doctor` は広い health を確認します。どちらも deployment build を生成しません。

## 2. configuration を置く

必須の `site` を指定し、content directory/source、publication policy、必要な plugins、theme を順に追加します。初めから全機能を有効にせず、必要な behavior だけを選んでください。詳しくは [Configuration](configuration.md)。

## 3. content を確認する

```sh
npx riebeckite inspect config
npx riebeckite inspect content --list
npx riebeckite inspect graph
```

Inspector は read-only です。設定や content が壊れている場合に state を生成して解決することはありません。

## 4. 開発・build する

```sh
npx riebeckite dev
npx riebeckite build
```

incremental reuse を明示的に避ける場合は `build --full` を使います。機能は plugin、見た目は theme、route/island は application に追加します。まず [Architecture](architecture.md) で配置先を確認してください。

## さらに読む

[Content system](content-system.md)、[Plugin system](plugin-system.md)、[Theme system](theme-system.md) を読み、デプロイ固有の振る舞いについては [HonoX integration](honox-integration.md) を参照してください。
