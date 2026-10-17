# CI検証契約

## 階層

Tier 1はすべてのPRで実行する。対象はフォーマットと静的契約、ドキュメント整合性、パッケージ・依存関係メタデータ、選択ロジックの契約テスト、依存順のパッケージBuild、型検査、全WorkspaceのUnit Testである。BuildジョブはUbuntu用Artifactを1日保持する。利用側はcommit、lockfile digest、Nodeの完全なバージョン、OS、architecture、パッケージバージョン、全`dist`ファイルのdigestを検証してから利用する。

Tier 2は変更パスから選択する。選択の失敗、空の比較、不明なパス、lockfile、TypeScript設定、scripts、GitHub Actions、その他の共通設定は、必ずTier 2全体を選択する。Package BuildはOS間で共有せず、共有作業ディレクトリを複数Jobが更新することもない。

| 変更 | Tier 2契約 |
| --- | --- |
| `packages/core/**`、`packages/cli/**`、integration | 外部Consumer、Fast Path、Fingerprint、Preset Fast Path、Fault Recovery Smoke |
| pluginとtheme | Plugin DX、外部Consumer、Fast Path、Preset Fast Path |
| `packages/create-riebeckite/**` | Scaffold Golden、外部Consumer、Fast Path、Preset Fast Path |
| `apps/web/**` | Browser、Production Asset Integrity |
| ドキュメントのみ | Tier 2なし。Tier 1のドキュメント契約は必須 |
| 共通設定、不明、cache/build設定 | Tier 2の全契約 |

Tier 3はscheduleまたは手動実行とする。Nightly E2EはUbuntuとWindowsで13 checkpointすべてのFault Recovery Matrixを実行する。PRのSmoke Setは`content-build-state-committed`、`entry-committed`、`gc-entry-delete`であり、State commit、Entry commit、GC復旧を対象にする。Full MatrixはWindowsのJunctionとSymlinkを含むリリース品質の復旧契約として維持する。週次Benchmarkは3サンプル、中央値・範囲・metricsを出力し、Artifactを保持する。任意のRepository baselineとの差分は表示するが、ノイズのある単発計測で失敗にはしない。

## 運用上の注意

既存の`check`、`typecheck`、`test` Status名は維持する。条件付きTier 2 Jobは、その契約が選択されなかった場合に意図的にskipされる。F9でBranch Protectionを照会した結果、設定されていなかった。Repository設定の変更はこの変更の対象外である。

External Site Testは各scenarioごとに独立した一時Consumerをpack/installする。この分離したpack/install境界自体が検証対象のため、tarballを共有しない。共有Build Artifactは、その公開境界を弱めず従来の重複Workspace Buildを削減する。
