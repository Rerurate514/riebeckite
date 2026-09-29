# Build System

## build が行うこと

明示的な build は config と plugin を resolve し、content を読み、pipeline と hooks を実行して manifest/content graph を作り、asset・client entry を出力します。その後 HonoX integration が生成 entry を含めて application を build します。

incremental state は application 単位の `.riebeckite/build/content-state.json` に置く最適化であり、正しさの根拠になる source ではありません。state がない・互換性がない・安全に再利用できない場合は初回/full path を選びます。`--full` は意図的に再利用を避けます。state の保存は成功後だけなので、失敗しても直前の有効な state を残します。

## 変更検出と cache

ContentSource metadata の mtime、size、ETag、hash は変更の根拠ですが、mtime だけを正しさの根拠にしてはいけません。Plugin Cache は state と別の plugin-scoped・JSON serializable・再生成可能な build-time cache です。どちらも Workers runtime の可変依存にしません。

state は各 entry の fingerprint と依存関係（リンク先 note の permalink、参照する asset の metadata など）を記録します。依存先が変われば依存元 entry を無効化し、さらにその依存元にも伝播します。entry の追加・削除は link 解決を広く変えうるため、全 note の再生成にフォールバックします。`.riebeckite` は build-time state であり content ではないため、scan 対象にしません。

## コマンドとライフサイクル

```sh
pnpm build                 # 設定されたプロジェクトの build
pnpm exec riebeckite build # content/application build
pnpm exec riebeckite build --full
pnpm exec riebeckite profile --full
```

validation には `check`、health 診断には `doctor` を使いますが、どちらも build の代わりにはなりません。`inspect` は既存 state の閲覧用で、state を生成するためには使わないでください。詳細は [CLI](cli.md)、[Inspector](inspector.md)、[Content system](content-system.md) を参照してください。

## 変更しても安全な進め方

生成 output を追加するときは、その持ち主と cleanup の振る舞いを明示してください。validation や inspect の最中に黙って書き込むことはしません。cache key には関連する version/input をすべて含めます。安全性が確かでない output を再利用せず、full-build fallback を選びます。失敗は観測可能にし、置き換え先が有効と確認できるまでは以前の成功 state を削除しません。
