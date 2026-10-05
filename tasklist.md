# Tasklist

実装対象を優先度順に並べたバックログ。各項目は ID・作業・状態・規模・優先理由・完了条件を持つ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| ID | 作業 | 状態 | 規模 | 優先理由 | 完了条件 |
|---|---|---|---|---|---|
| DX2 | content 処理中の失敗（frontmatter parse / markdown pipeline）が対象 content の logical path を error に含めるようにする | 未着手 | Small | `ContentManager` は content 単位で `vfile-matter` の `matter()` を実行するが parse 失敗を wrap しない。frontmatter が壊れた note があると build 全体が `YAMLParseError: Missing closing "quote at line 1, column 21` のように file path も slug も含まない error で落ちる（再現済み）。大規模 Vault ではどのファイルを直すべきか特定できず、failure path の診断性が不足する。CLI の `renderCliError` は `path` / `file` / `hint` property があれば表示するが、この error には無い | content 処理中の parse / pipeline 失敗に、失敗した content の logical path（該当すれば plugin 名も）を付与し、`riebeckite build` と `content.build()` の error から対象を特定できるようにする。malformed frontmatter の note を含む Vault で error に対象 path が含まれる regression test を追加する。正常 Vault の build 結果は変えない |
| DOC1 | `reference/cli.md`（en / ja）に `deploy domain` を追記する | 未着手 | Small | CLI は `deploy domain` を受け付ける（`packages/cli/src/cli.ts` の usage・`runDeployDomain`）が、`docs/en/docs/reference/cli.md` と `docs/ja/docs/reference/cli.md` の usage とコマンド表は `deploy [--dry-run \| setup]` のみで `domain` が欠落している。`getting-started/deployment.md` には `deploy domain` の記載があり、reference の方が実装から drift している | en / ja 両方の `reference/cli.md` の usage とコマンド表に `deploy domain` を、実装の `parseCommand` が受け付ける形式と一致する形で追加する |

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
