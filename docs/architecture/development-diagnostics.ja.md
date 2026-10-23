---
title: 開発診断アーキテクチャ
---
# 開発診断アーキテクチャ

## 対象範囲

Riebeckite Doctor と Development Inspector は `@riebeckite/diagnostics` を共有します。
このパッケージはシリアライズ可能なレポートモデルを持ち、Core がすでに提供している観測結果を、安定した順序の診断に変換します。コンテンツ解析、プラグイン実行、出力計画、設定解決、UI は持ちません。

## 再利用する観測結果

| 関心事 | 既存の情報源 | 診断での利用 |
| --- | --- | --- |
| コンテンツの整合性と WikiLink | `ContentManager.inspect()` | リンク解析を再実装せず、既存の診断を利用します。 |
| プラグインの順序と設定 | 解決済みの設定と `resolvePlugins()` | 解決結果または解決エラーを報告します。 |
| 出力の所有権 | `buildOutputPlan()` と `compareOutputPlan()` | SSG と同じ出力分類を使います。 |
| 増分依存関係 | `ContentManager.getOutputChangeSet()` | 影響のある出力、未変更の出力、削除された出力を、追跡済みの依存関係とともに表示します。 |
| テーマ | 解決済みのテーマ設定 | 解決されたスタイルを報告し、読み込みの失敗は設定の診断として扱います。 |
| 開発サーバー | 既存の HonoX / Vite 統合 | 配信時だけ有効な Vite ミドルウェアと、クライアント用の仮想モジュールを追加します。 |

## 責務境界

`@riebeckite/diagnostics` は Core に依存します。CLI はレポートを表示し、必要に応じて修正を適用します。HonoX 統合は、Vite が配信している間だけレポートと Inspector UI を提供します。Inspector は Shadow DOM を使うため、サイト、テーマ、プラグインの CSS に影響しません。

本番用のクライアントモジュールは Inspector モジュールをインポートしません。Inspector のミドルウェアは Vite の `apply: "serve"` を使うため、エンドポイントもクライアントコードも本番の出力には含まれません。

## 観測できない情報

Markdown / HTML のパイプラインでは、要素からソースへの対応情報を保持していません。Inspector には Overview、Diagnostics、Dependencies、Plugins、Output のタブがあります。診断は `/__riebeckite/inspector/report` から、出力計画と依存関係は `/__riebeckite/inspector/output` から提供します。どちらのエンドポイントもループバックからだけ利用でき、`no-store` を返し、HonoX のキャッチオール開発ミドルウェアより前に登録されます。クライアントはまず診断を取得し、その後で出力計画を読み込みます。同じ読み取り専用の `ContentManager` を再利用するため、コンテンツインデックスは温かいままです。Dependencies と Output タブは、その `ContentManager` で現在のコンテンツと出力の変更セットを読み取ります。ビルド状態の書き込みやサイトのビルドは行わず、出力計画とビルド済みファイルの比較も行いません。現在の URL パスと解決済みのプラグインは表示しますが、要素の元ファイル、行、コンポーネント、CSS の所有者は推測しません。要素単位の検査には、レンダラー境界での開発専用の source-map 観測点が必要です。

ランチャーは配信時にだけ利用できます。編集可能なコントロール以外で Ctrl+Alt+R を押すと開閉でき、Escape を押すと閉じてランチャーにフォーカスが戻ります。
