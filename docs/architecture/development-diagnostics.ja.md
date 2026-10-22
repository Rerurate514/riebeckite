---
title: 開発診断アーキテクチャ
---
# 開発診断アーキテクチャ

## 対象範囲

Riebeckite Doctor と Development Inspector は `@riebeckite/diagnostics` を共有します。
このパッケージはシリアライズ可能なレポートモデルを持ち、Core がすでに提供している観測結果を安定した順序の診断へ変換します。コンテンツ解析、Plugin 実行、Output Plan、設定解決、UI は持ちません。

## 再利用する観測結果

| 関心事 | 既存の情報源 | 診断での利用 |
| --- | --- | --- |
| Content Integrity と WikiLink | `ContentManager.inspect()` | Link 解析を再実装せず、既存の診断を利用します。 |
| Plugin の順序と設定 | 解決済み設定と `resolvePlugins()` | 解決結果または解決エラーを報告します。 |
| Output の所有権 | `buildOutputPlan()` と `compareOutputPlan()` | SSG と同じ出力分類を使います。 |
| 増分依存関係 | `ContentManager.getOutputChangeSet()` | 影響のある出力、未変更の出力、削除された出力を、追跡済みの依存関係とともに表示します。 |
| Theme | 解決済み Theme 設定 | 解決済み Style を報告し、読み込み失敗は設定診断として扱います。 |
| 開発サーバー | 既存の HonoX / Vite 統合 | serve 時だけの Vite middleware と client virtual module を追加します。 |

## 責務境界

`@riebeckite/diagnostics` は Core に依存します。CLI はレポートを表示し、必要なら修正を適用します。HonoX 統合は Vite の serve 時だけレポートと Inspector UI を提供します。Inspector は Shadow DOM を使うため、Site、Theme、Plugin の CSS に影響しません。

本番用 client module は Inspector module を import しません。Inspector middleware は Vite の `apply: "serve"` を使うため、endpoint と client code は本番成果物に含まれません。

## 観測できない情報

Markdown / HTML pipeline では要素からソースへの対応情報を保持していません。Inspector には Overview、Diagnostics、Dependencies、Plugins、Output のタブがあります。診断は `/__riebeckite/inspector/report`、Output Plan と依存関係は `/__riebeckite/inspector/output` から提供します。どちらの endpoint も loopback からのみ利用でき、`no-store` を返し、HonoX の catch-all 開発 middleware より前に登録されます。client は先に診断を取得し、その後で Output Plan を読み込みます。同じ read-only の `ContentManager` を再利用するため、Content Index は温かいままです。Dependencies と Output タブはその `ContentManager` で現在の Content と Output Change Set を読み取ります。build state の書き込みや site の build は行わず、Output Plan と build 済みファイルの比較も行いません。現在の URL パスと解決済み Plugin は表示しますが、要素の元ファイル・行・Component・CSS 所有者は推測しません。要素単位の検査には renderer 境界での開発専用 source-map 観測点が必要です。

Launcher は serve 時だけ利用できます。編集可能なコントロール以外で Ctrl+Alt+R を押すと開閉でき、Escape を押すと閉じて Launcher にフォーカスが戻ります。
