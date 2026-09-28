# Build System

## build が行うこと

明示的な build は config と plugin を resolve し、content を読み、pipeline と hooks を実行して manifest/content graph を作り、asset・client entry を出力します。その後 HonoX integration が生成 entry を含めて application を build します。

incremental state は application 単位の `.riebeckite/build/content-state.json` に置く最適化であり、真実の source ではありません。state がない・互換性がない・安全に再利用できない場合は初回/full path を選びます。`--full` は意図的に再利用を避けます。state の保存は成功後だけなので、失敗しても直前の有効な state を残します。

## 変更検出と cache

ContentSource metadata の mtime、size、ETag、hash は変更の根拠ですが、mtime だけを正しさの根拠にしてはいけません。Plugin Cache は state と別の plugin-scoped・JSON serializable・再生成可能な build-time cache です。どちらも Workers runtime の可変依存にしません。

```sh
pnpm exec riebeckite build
pnpm exec riebeckite build --full
pnpm exec riebeckite profile --full
```

`check` は validation、`doctor` は health、`inspect` は既存 state の閲覧です。閲覧や validation で cache/state/assets を書き込まないでください。曖昧な cache key は再利用せず full fallback を選びます。
