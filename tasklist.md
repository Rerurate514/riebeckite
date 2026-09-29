| 順番 | ID | 作業 | 状態 | 規模 | 理由 |
|---:|---|---|---|---|---|
| 1 | A | 安定 Content ID を Core に導入する（最小限） | 決定済み | 要調査 | 任意の frontmatter id/uid を Core が正規化し、permalink/alias/graph と紐付ける汎用 stable identity。analytics 専用 hack はしない |
| 2 | B | plugin-analytics を全面改修する（既存外部プロバイダ注入と置き換え） | 決定済み | 要調査 | 後方互換不要。plausible/umami/GA/custom のタグ注入は新設計に統合・削除 |
| 3 | C | 単体テストランナーは導入しない | 決定済み | Small | 依存を増やさず E2E ハーネス＋golden で代替。需要が出れば recon Q3 の方針で再検討 |
| 4 | D | client config 伝達用の汎用機構を Core に導入する | 決定済み | 要調査 | 汎用性優先。client entry へ options を渡せる一般化された client-config 機構を設計（analytics 専用にしない） |
| 5 | E | Analytics Worker は独立デプロイにする（templates/analytics-cloudflare + createWorker API） | 決定済み | 要調査 | Core への emit API は追加しない。将来コメント/フォーム/MCP で需要が出れば Generic Generated Output API として別途設計 |
| 6 | P1 | Generic Analytics 再設計: event model / AnalyticsProvider / Query model / client page_view | 未着手 | Large | 将来プラグイン設計の土台。Cloudflare 非依存を維持 |
| 7 | P2 | @riebeckite/analytics-cloudflare: createWorker API + D1/KV Storage Adapter | 未着手 | Large | ユーザーが明示的に storage を選ぶ。静的配信は不変 |
| 8 | P3 | Analytics の diagnostics・テスト・docs・外部 E2E・全検証 | 未着手 | Large | check/doctor/inspect 連携、Static Assets-only 回帰確認 |
| 9 | — | ページ遷移時にノートタイトルが消える問題を修正する | 未着手 | 要調査 | ページ遷移後もノートのタイトルを正しく表示する |
| 10 | — | モバイル表示全般の対応を改善する | 未着手 | 要調査 | 小さな画面でも操作・閲覧しやすくする |
| 11 | — | モバイル表示時にトップ余白が大きすぎる問題を修正する | 未着手 | Small | 画面上部の無駄な余白を減らす |
