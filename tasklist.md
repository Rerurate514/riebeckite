# Tasklist

実装対象を優先度順に並べたバックログ。各項目は ID・作業・状態・規模・優先理由・完了条件を持つ。エージェントが着手するときは、下の「実装メモ（agents 用）」を参照し、着手したら「状態」を `実施中` に更新する。

## 実装対象（優先度順）

| ID | 作業 | 状態 | 規模 | 優先理由 | 完了条件 |
|---|---|---|---|---|---|
| LINK1 | 重複する basename / alias / attachment 名の wikilink 解決を entry の反復順に依存しない決定的な結果にし、曖昧な target を diagnostic で報告する | 未着手 | Medium | `ContentIndexBuilder.addIndexEntry` は lowercased key を最初に書いた entry のみ保持するため、同名の note / alias / attachment が複数あると解決先が entry の反復順で決まる。`getManifest()`（preparation なし。dev の on-demand 解決と programmatic consumer が使う）は filesystem の readdir 順、`build({incremental:true})` は `fingerprintContentEntries` が path で sort するため、同じ Vault でも `riebeckite dev` と `riebeckite build` で `[[dup]]` / `[[shared]]`（alias）/ `![[photo.png]]` が別ファイルに解決されうる。再現済み（scan X,Y → `/x/dup`・`/x/note`・`/img/x/photo.png`、Y,X → `/y/dup`・`/y/note`・`/img/y/photo.png`）。誤ったリンク・画像が silent に公開され、site_integrity にも ambiguous-target の diagnostic が無い。correctness と Obsidian 互換の双方に影響する | 重複 basename / alias / attachment 名の解決規則を明文化し、entry の反復順や dev / build の経路に依存しない決定的な結果にする（完全 path 指定の優先など）。`getManifest()` と `build()` が同一 Vault で同一結果を返し、完全 path 指定 `[[x/dup]]` は従来どおり解決し、曖昧な bare name / alias を持つ公開 note に対して warning diagnostic が出ることを regression test で保証する。private / draft の target へは従来どおり解決しない（publication boundary 維持） |
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
