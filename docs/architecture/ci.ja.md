---
date: 2026-10-18
---

# CI 検証ルール

## 検証の階層

Tier 1 はすべてのプルリクエストで実行します。対象は、フォーマットと静的チェック、ドキュメントの整合性、パッケージと依存関係のメタデータ、選択ロジックの検証テスト、依存順のパッケージビルド、型検査、全ワークスペースのユニットテストです。ビルドジョブは Ubuntu 用のアーティファクトを1日保持します。アーティファクトを利用する側は、形式バージョン、commit、lockfile の digest、`.node-version` で固定した Node の完全なバージョン、OS、アーキテクチャ、パッケージバージョン、すべての `dist` ファイルの digest を検証してから使います。

Tier 2 は変更されたパスから選択します。選択に失敗した場合、比較結果が空の場合、または不明なパス、lockfile、TypeScript 設定、scripts、GitHub Actions、その他の共通設定を変更した場合は、Tier 2 のすべてを選択します。パッケージビルドは OS 間で共有せず、複数のジョブが同じ作業ディレクトリを更新することもありません。

| 変更 | Tier 2 の検証項目 |
| --- | --- |
| `packages/core/**`、`packages/cli/**`、インテグレーション | 外部コンシューマ、Fast Path、Fingerprint、Preset Fast Path、Fault Recovery Smoke |
| プラグインとテーマ | プラグイン DX、外部コンシューマ、Fast Path、Preset Fast Path |
| `packages/create-riebeckite/**` | Scaffold Golden、外部コンシューマ、Fast Path、Preset Fast Path |
| `apps/web/**` | ブラウザー、Production Asset Integrity |
| ドキュメントのみ | Tier 2 なし。Tier 1 のドキュメント検証は必須 |
| 共通設定、不明なパス、キャッシュ/ビルド設定 | Tier 2 の検証項目をすべて実行 |

Tier 3 はスケジュール実行または手動実行です。Nightly E2E は、Ubuntu と Windows で13個のチェックポイントすべてについて Fault Recovery Matrix を実行します。PR のスモークセットは `content-build-state-committed`、`entry-committed`、`gc-entry-delete` の3つで、State commit、Entry commit、GC 復旧を対象にします。フルマトリクスは、Windows の Junction と Symlink を含むリリース品質の復旧検証として維持します。週次ベンチマークは3サンプルを使い、中央値、範囲、メトリクスを出力してアーティファクトを保持します。任意のリポジトリ baseline との差分は表示しますが、ノイズのある単発計測で失敗させることはありません。

## 運用上の注意

既存の `check`、`typecheck`、`test` というステータス名は維持します。条件付きの Tier 2 ジョブは、その検証が選択されなかった場合に意図的にスキップされます。F9 でブランチ保護を照会した結果、設定されていませんでした。リポジトリ設定の変更はこの変更の対象外です。

External Site Test は、シナリオごとに独立した一時的な外部コンシューマを pack して install します。この分離された pack/install の境界自体が検証対象なので、tarball は共有しません。共有ビルドアーティファクトは、その公開境界を弱めることなく、従来重複していたワークスペースビルドを削減します。
