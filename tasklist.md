# Tasklist

実装対象を優先度順に並べたバックログ。各項目は ID・作業・状態・規模・優先理由・完了条件を持つ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| ID | 作業 | 状態 | 規模 | 優先理由 | 完了条件 |
|---|---|---|---|---|---|
| CACHE2 | l10n 有効時の Persistent Per-Content Cache 全面 bypass を再監査し、安全にキャッシュ可能な単位へ縮小できるか検証する | 未着手 | Large | Persistent Cache と Incremental SSG の基盤が整った一方、l10n 有効時は安全側に全面 bypass しており、実サイト構成でキャッシュ効果を失う可能性がある | 最新実装で bypass 条件と l10n の実依存を特定する。content・locale・translation group・route/location 等の依存を既存 dependency 契約で表現できるか検証し、安全に縮小可能なら実装と cold/incremental 同値テストを追加する。不可能または効果が小さい場合は根拠と計測値を残して対象外へ移す |
| HMR1 | Content HMR と dependency graph / incremental invalidation の変更伝播を E2E で監査する | 未着手 | Medium | HMR・Persistent Cache・Incremental SSG は個別に整備済みだが、依存コンテンツをまたぐ変更伝播が一貫していることを横断的に保証したい | note edit、embed 元変更、asset replacement、rename、delete、visibility変更について、直接変更されたコンテンツだけでなく依存先まで必要十分に invalidation / HMR 通知されることを確認する。publication boundary を越えて private content が公開側へ漏れないことも確認し、不整合があれば修正と回帰テストを追加する |
| CI1 | Persistent Cache / Incremental SSG の CI キャッシュ再利用を再監査する | 未着手 | Medium | ローカル incremental build の高速化に対して、CI が同じ state を十分再利用できていない可能性がある | GitHub Actions と現在の cache/state 保存先を調査し、CI で再利用可能か計測する。安全に保存可能な state が未保存で実測上の効果がある場合のみ cache 対象を追加する。cold build と cache hit build の成果物同値性を保証する |
| PAGE1 | Plugin Page Type の route collision と優先順位契約を監査する | 未着手 | Medium | Page System の拡張に伴い、複数 Page Type が同一 route を生成した場合の暗黙選択を早期に検出できる方が Plugin 開発時の診断性が高い | 同一 route を複数 Page Type が生成するケースを再現し、現在の resolver 契約を確認する。曖昧な衝突が静かに解決される場合は diagnostic を追加し、明示された priority による意図的な競合は誤警告しないテストを追加する |
| META1 | content metadata と HTML metadata の生成契約を監査する | 未着手 | Medium | `frontmatter.title`、description、canonical、OGP 等が複数 Plugin / route にまたがるため、表示タイトルと metadata の drift を防ぎたい | `<title>`、description、canonical、Open Graph、Twitter metadata の入力元と fallback を整理し、通常記事・Page Type・l10n・custom permalink で一貫性を検証する。実在する不整合のみ修正し、契約テストを追加する |
| DEV1 | custom HonoX dev server entry 使用時の content asset 配信を監査する | 未着手 | Small | 標準構成外でも Plugin / Core の asset 契約が壊れないことを確認し、custom entry でのみ発生する 404 の可能性を切り分けたい | custom `honox.devServer.entry` 構成で content image / attachment / static asset の dev 配信を再現する。標準契約上サポート対象なら修正とテストを追加し、対象外なら制約を docs に明記する |
| DX1 | `doctor` / `inspect` / build diagnostics の説明能力を再監査する | 未着手 | Medium | correctness 系の修正が進んだため、問題発生時に内部状態を CLI から説明できるようにすると保守性が上がる | `doctor` と `inspect` が build 対象・除外理由・cache/invalidation 状態をどこまで説明できるか調査する。実際のデバッグで不足する情報だけを追加し、通常出力を過剰に増やさない |
| GRAPH1 | 大規模 Vault における Graph 描画の性能境界を計測する | 未着手 | Medium | 500 nodes guard は導入済みだが、実用上の上限と layout / interaction のボトルネックは未計測 | 500 / 1000 / 2000 nodes 程度で初期描画・layout・zoom/pan・drag の性能を計測する。明確な問題が確認された場合のみ最適化し、Canvas/WebGL 等への置換は計測根拠なしでは行わない |

規模の目安: Small = 半日以内 / Medium = 1〜2 日 / Large = 複数日・複数パッケージ。

## 再監査で対象外とした項目

実装対象から除外した項目と理由。再度バックログへ戻す場合は、下記の前提が崩れた根拠を示すこと。

- OC1: 本番は cloudflare-workers アダプタで影響しない。テスト用途は `apps/web` が `@hono/node-server` を明示宣言しており通過する。上流 `@hono/vite-build` の依存宣言漏れであり Riebeckite 側の実装対象外。
- OC3: `public` 削除時は常にフル再生成して生成物を正しく復元する。測定された性能問題はなく、shadow-state を persistent cache に足すのは投機的複雑化。
- I18N2: サイト全体の単一言語 `description` 契約であり taxonomy 固有の不具合ではない。taxonomy だけ locale 化すると責務境界が不自然になる。
- I18N3: `/themes` は固定のテーマギャラリー（デモ）で、l10n コンテンツ契約の違反ではない。
- CACHE1: `processedContentCache.version` の手動更新が正式な invalidation 契約として機能し、テストと docs で裏付けられている。外部ヘルパーソースの自動解析は投機的。
- TEST1: React シムは 3 テストファイルの局所回避に留まり増殖していない。テスト基盤を Vitest へ移す理由が無く、広がった時点で再検討する。

## 実装メモ（agents 用）

共通ルール:

- 着手時は「状態」を `実施中` に更新する。
- 実装前に最新 `main` の実コード・テスト・設定を確認し、過去の監査結果だけを根拠に修正しない。
- 問題を再現できない、既に解決済み、または現在の契約として妥当な場合はコードを変更しない。
- 性能改善は変更前後を計測し、実測上の改善が確認できる場合のみ採用する。
- 新しい抽象化・永続 state・独自 cache を、将来必要になるかもしれないという理由だけで追加しない。
- 既存の Core / Plugin / HonoX の責務境界を優先し、局所的な workaround で契約を迂回しない。
- 修正時は対象となる regression / contract test を追加する。
- 完了時は実装内容を 1 行で「完了済み」表へ移し、ID は引き継ぐ。
- 各項目の完了条件は実装対象表の「完了条件」列を参照する。
