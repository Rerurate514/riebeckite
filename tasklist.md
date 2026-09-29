| 順番 | ID | 作業 | 状態 | 規模 | 理由 |
|---:|---|---|---|---|---|
| 1 | A | 安定 Content ID を Core に導入する（最小限） | 完了 | 要調査 | `resolveContentStableId` を Core に実装し、manifest entry の `contentId` と `byContentId` 索引として公開。analytics プラグインが参照 |
| 2 | B | plugin-analytics を全面改修する（既存外部プロバイダ注入と置き換え） | 完了 | 要調査 | provider/query/event の新設計に統一。plausible/umami/GA/custom の旧注入は除去済み |
| 3 | C | 単体テストランナーは導入しない | 完了 | Small | 依存を増やさず E2E ハーネス＋golden で代替。需要が出れば recon Q3 の方針で再検討 |
| 4 | D | client config 伝達用の汎用機構を Core に導入する | 完了 | 要調査 | `clientEntries` + `publicConfig` + `serializePublicClientConfig` を Core に実装。honox の `virtual:riebeckite/client` で配信 |
| 5 | E | Analytics Worker は独立デプロイにする（templates/analytics-cloudflare + createWorker API） | 完了 | 要調査 | `createWorker` API と d1/kv templates を実装、main に統合済み |
| 6 | P1 | Generic Analytics 再設計: event model / AnalyticsProvider / Query model / client page_view | 完了 | Large | event/provider/query/memory provider/init/options/client を実装済み。テストあり |
| 7 | P2 | @riebeckite/analytics-cloudflare: createWorker API + D1/KV Storage Adapter | 完了 | Large | D1/KV storage、migration、worker テストまで実装済み |
| 8 | P3 | Analytics の diagnostics・テスト・docs・外部 E2E・全検証 | 実施中 | Large | check/doctor/inspect 連携、docs（en/ja）、外部 E2E、Static Assets-only 回帰確認 |
| 9 | — | ページ遷移時にノートタイトルが消える問題を修正する | 実施中 | 要調査 | ページ遷移後もノートのタイトルを正しく表示する |
| 10 | — | モバイル表示全般の対応を改善する | 実施中 | 要調査 | 小さな画面でも操作・閲覧しやすくする |
| 11 | — | モバイル表示時にトップ余白が大きすぎる問題を修正する | 実施中 | Small | 画面上部の無駄な余白を減らす |