# Tasklist

実装対象を優先度順に並べたバックログ。各項目は ID・作業・状態・規模・優先理由・完了条件を持つ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| ID | 作業 | 状態 | 規模 | 優先理由 | 完了条件 |
|---|---|---|---|---|---|
| ARCH1 | Build Dependency / Cache Contract v2 を設計し、存在しない将来入力や集合依存を安全に表現できるようにする | 再監査で対象外（l10n は全件再生成を維持。依存収集の事前 phase が実在したら再開） | Large | 現在の dependency model は content / file / location 等の依存を扱える一方、l10n の「現在存在する翻訳集合」のような集合依存を表現できず、persistent per-content cache 全体を bypass している。incremental build と cache correctness の基盤となるため最優先 | 現行 dependency tracking / build state / persistent cache / l10n の実装を再監査し、Entry・File・Location・集合依存・Config・Plugin固有入力など必要な dependency kind を最小限の型付き contract として定義する。翻訳追加・削除を含む l10n の依存変化を正しく invalidation でき、l10n 有効時にも安全に persistent cache を利用できることを cold build equivalence test で保証する。既存の ad-hoc dependency 表現や不要になった bypass を削除し、build state version / migration 方針も整理する |
| ARCH5 | Generated Output / Asset Ownership Contract を型レベルで整理する | 未着手 | Medium〜Large | generated output、content-derived asset、attachment、static asset、内部 `.riebeckite` 領域について所有境界は既に改善されているが、API利用側が正しいemit経路を選択する必要がある。破壊的変更で誤用不能なcontractへ簡素化できる可能性がある | 現在の `output.emit` / `emitAsset` / Vite public / attachment pipeline / generated source / reserved path のproducerとconsumerを監査する。実際に誤用余地や重複validationがある場合のみ、PluginGeneratedOutput・ContentAsset等の責務をAPIで分離し、予約領域・衝突・上書きを一つのownership contractで検証する。既存URL互換を維持する必要がない箇所はより単純なnamespaceへ整理し、output collision / publication boundary / asset resolution testを更新する |
| ARCH6 | Config Schema v2 を設計し、Core / Site / Build / Content / Plugin責務を整理する | 未着手 | Large | 機能追加に伴いnavigation、content、build、plugins、deployment等の設定が成長している。破壊的変更可能なタイミングなら、利用者が内部アーキテクチャを知らなくても設定できる構造へ整理できる | 現在の全public config fieldと利用箇所、default、validation、scaffold、Docsを棚卸しする。単なるrenameではなく、責務の混在・重複・不要field・Plugin optionとの二重管理が実在する箇所だけ再構成する。Core/Site/Content/Build等の境界を明確化し、starter/showcase/external content repositoryを新schemaへ移行する。config validation、CLI、scaffold、Docs、全official presetを更新し、旧schema互換コードを残すかはmajor-version方針に従って明示的に決定する |
| ARCH7 | vNext Architecture の最終簡素化監査を行い、旧contract・compatibility layer・特殊ケースを削除する | 未着手 | Medium〜Large | ARCH1〜ARCH6を個別に実施すると旧APIや一時adapterが残り、結果としてvNextの方が複雑になる可能性がある。破壊的変更の目的は機能追加ではなく総複雑性の削減である | ARCH1〜ARCH6完了後の最新mainをゼロベースで監査し、旧dependency表現、旧route resolver、旧publication collection、不要hook、compatibility adapter、deprecated config、重複validation、到達不能コードを特定して削除する。削除前後で公開機能・publication boundary・Fresh Vault・incremental/cold equivalence・scaffold・全official Pluginのcontractを検証し、vNextでコード量・特殊ケース・公開概念のいずれかが実際に減ったことを報告する |
| ARCH9 | Plugin PageType route に content language context を提供する | 未着手 | Medium | l10n 有効時の content route は `htmlLanguage` に entry の language を設定するが、Plugin が生成する PageType route は entry を持たないため言語 context が無く、language-aware selection（ARCH8 で共通化）が未フィルタへフォールバックする | PageType route がどの言語に属するかを宣言・解決できる最小 contract を検討し、route が current language context を設定できるようにする。Navigation に URL prefix からの言語推測は追加しない。PageType route の language context contract と、context が無い場合のフォールバック挙動を test で固定する |

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
- ARCH1〜ARCH6は互いの責務を侵食しない。隣接タスクで扱うべき問題を、その場の都合で先取りして巨大な再設計にしない。
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
