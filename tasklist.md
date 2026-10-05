# Tasklist

実装対象を優先度順に並べたバックログ。各項目は ID・作業・状態・規模・優先理由・完了条件を持つ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| ID | 作業 | 状態 | 規模 | 優先理由 | 完了条件 |
|---|---|---|---|---|---|

規模の目安: Small = 半日以内 / Medium = 1〜2 日 / Large = 複数日・複数パッケージ。

## 実装メモ（agents 用）

共通ルール:

- 着手時は「状態」を `実施中` に更新する。
- 実装前に最新 `main` の実コード・テスト・設定を確認し、過去の監査結果だけを根拠に修正しない。
- 問題を再現できない、既に解決済み、または現在の契約として妥当な場合はコードを変更しない。
- このバックログでは破壊的変更を許容する。ただし「破壊的変更可能」であること自体を変更理由にしない。
- 新しいcontractは、既存の特殊ケース・重複処理・誤用可能性のいずれかを実際に削減できる場合のみ導入する。
- 新旧APIを長期間併存させるcompatibility layerは原則追加しない。major versionで移行する方が単純なら旧contractを削除する。
- 公開APIを変更する前にproducer / consumer / official Plugin / scaffold / Docs / testを横断して影響範囲を特定する。
- 性能改善は変更前後を計測し、実測上の改善が確認できる場合のみ採用する。
- 新しい抽象化・永続 state・独自 cache を、将来必要になるかもしれないという理由だけで追加しない。
- 既存の Core / Plugin / HonoX の責務境界を優先する。ただし、その境界自体が複雑性の原因であることを実コードから証明できた場合は再設計してよい。
- publication boundary は常に保守する。private / draft / scheduled contentの情報をpublic outputへ漏らさない。
- incremental build / cacheを変更する場合は、incremental resultとclean cold buildの同値性をcontract testで保証する。
- routeを変更する場合はcustom permalink / l10n / redirect / Plugin PageType / collisionを横断検証する。
- Plugin APIを変更する場合は全official Pluginを移行し、少なくとも代表Pluginだけを移行して残りを旧APIに放置する状態を完成形としない。
- Configを変更する場合はscaffold / starter / showcase / Docs / validation / CLIを同じcontractへ揃える。
- 修正時は対象となる regression / contract test を追加する。
- 完了時は該当行をタスクリストから削除する（「完了済み」表は残さない）。
- 各項目の完了条件は実装対象表の「完了条件」列を参照する。
- 最終的な評価基準は「新機能の数」ではなく、公開概念・特殊ケース・重複処理・誤用可能性がどれだけ減ったかとする。
