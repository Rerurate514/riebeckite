# Inspector

Inspector は既に resolve された state について質問するための機能です。

```sh
riebeckite inspect config
riebeckite inspect plugins
riebeckite inspect content --list
riebeckite inspect graph
riebeckite inspect build
```

`inspect content --list` は各 entry の解決済み canonical permalink を表示します。public location plugin が identity metadata を記録している場合は、ID と ID source も表示します。

`inspect build` は incremental state の status を表示します。state が invalid の場合は、その理由（malformed JSON、未対応の state version、認識できない構造）も表示します。

## read-only の保証

Inspect は事実を表示するだけで mutation しません。build の起動、incremental state/plugin cache の書込み、asset emission、表示だけの artifact render、Vite/HonoX build、configuration auto-fix を行ってはいけません。まだ build がなく情報が存在しない場合は、その状態を明確に報告します。

## いつどのツールを使うか

- resolve 済みの config や enabled plugin、content、relationship、build state を理解するには **Inspector** を使います。
- config と plugin resolution を検証するには **check** を使います。
- environment を含む health を診断するには **doctor** を使います。
- build output や state を意図的に作成・更新するには **build** を使います。

この分離により、CI の診断 command が cache や deployment output を意図せず変更しません。詳細は [CLI](../reference/cli.md) と [Diagnostics](diagnostics.md) を参照してください。
