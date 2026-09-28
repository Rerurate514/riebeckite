# CLI Reference

CLI は current working directory から application root を解決します。application directory で実行してください。

```text
riebeckite dev
riebeckite check
riebeckite doctor
riebeckite build [--full]
riebeckite profile [--full]
riebeckite inspect [config | plugins | content [--list] | graph | build]
```

| command | 意味 | build state を書くか |
| --- | --- | --- |
| `dev` | integration の development workflow を起動 | integration に依存 |
| `check` | config/plugin/capability の妥当性を検証 | 書かない |
| `doctor` | environment/config/plugin/content/state の health を診断 | 書かない |
| `build` | build を実行。`--full` は incremental reuse を避ける | 成功時のみ |
| `profile` | trace に基づく性能報告 | build に依存 |
| `inspect` | resolve 済みの事実を表示 | 書かない |

`check` が示すのは有効性であり、output が build/deploy 済みであることではありません。Doctor は可能な独立診断を継続し、失敗時は non-zero で終了します。Inspector は build、state/cache/assets の書込み、Vite/HonoX build、artifact render、auto-fix を絶対に起動しない read-only command です。

```sh
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect plugins
pnpm exec riebeckite build
```
