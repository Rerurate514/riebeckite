# CLI Reference

CLI は current working directory から application root を解決します。application directory で実行してください。

```text
riebeckite init [directory] [--preset <name>] [--force] [--list-presets]
riebeckite dev
riebeckite check
riebeckite doctor
riebeckite build [--full]
riebeckite profile [--full]
riebeckite inspect [config | plugins | content [--list] | graph | build]
```

## command の契約

| command | 意味 | build state を書くか |
| --- | --- | --- |
| `init` | preset テンプレートから Site を生成 | 書かない |
| `dev` | integration の development workflow を起動 | integration に依存 |
| `check` | config/plugin/capability の妥当性を検証 | 書かない |
| `doctor` | environment/config/plugin/content/state の health を診断 | 書かない |
| `build` | build を実行。`--full` は incremental reuse を避ける | 成功時のみ |
| `profile` | trace に基づく性能報告 | build に依存 |
| `inspect` | resolve 済みの事実を表示 | 書かない |

`check` が示すのは有効性であり、output が build/deploy 済みであることではありません。Doctor は可能な独立診断を継続し、失敗時は non-zero で終了します。Inspector は build、state/cache/assets の書込み、Vite/HonoX build、artifact render、auto-fix を絶対に起動しない read-only command です。

plugin の option validation は `check` の一部として実行されます。各 plugin の `validateOptions`（analytics プラグインは provider と collector URL を検証します）が configuration validity に寄与するため、不正な plugin 設定は build 前に `check` で失敗します。

`init` は config、Vite/HonoX の application shell、route、stylesheet、初期 content を含む自己完結の Site を対象ディレクトリ（既定は current directory）に生成します。生成対象のファイルが既にあるディレクトリには `--force` なしでは書き込みません。構成は `--preset <name>` で選択します（既定は `starter`）。利用可能な preset と説明は `--list-presets` で確認できます。生成後は依存関係を install し、`check` と `build` を実行してください。`create-riebeckite` パッケージは `npx create-riebeckite` から同じ generator を実行し、同じ `--preset` / `--list-presets` フラグに対応します。

command の失敗は error 名、message、存在する場合は error の `code`・file path・remediation の `hint` とともに表示されます。ネストした cause は `Caused by:` 行として表示されます。

```sh
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect plugins
pnpm exec riebeckite build
```

## 通常の workflow

項目ごとに content を確認したい場合は `inspect content --list`、リンクやグラフ拡張の調査では `inspect graph` を使ってください。解釈は [Diagnostics](../framework/diagnostics.md)、state の意味は [Build system](../framework/build-system.md) を参照してください。
