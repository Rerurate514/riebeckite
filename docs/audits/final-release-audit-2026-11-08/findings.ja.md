# Findings

| ID | 深刻度 | 状態 | 内容 | 根拠と対応 |
| --- | --- | --- | --- | --- |
| F-01 | P1 | FIXED | workspace 型検査が UI loading subpath を型解決できない | `tsconfig.json` に `@riebeckite/ui/loading` を追加。`pnpm typecheck` PASS |
| F-02 | P1 | FIXED | 4 diagram plugin が renderer SVG を `innerHTML` へ投入 | 共通 `setDiagramSvg` を追加。script、active HTML 要素、イベント属性、外部参照、危険 CSS を除去し、`foreignObject` の安全な label は保持。Chromium test で `pwned=false` を確認 |
| F-03 | P1 | FIXED | pnpm version のリポジトリ固定がなく lockfile/CI と不整合 | root `packageManager` を 11.5.3 に固定。`corepack pnpm install --frozen-lockfile` PASS |
| F-04 | P2 | OPEN | scaffold check の単独クリーン実行が未 build artifacts に依存 | CI は artifacts を復元するため CI では成立。単独実行契約は未整理 |
| F-05 | P2 | OPEN | SSG output cache、plugin、変更判定、三層キャッシュの責務集中 | fast-path E2E は成立。挙動変更を伴う分割はリリース後に設計・characterization test と共に実施 |
| F-06 | P3 | OPEN | source-health の 130 advisory | 長大関数、長大ファイル、ディレクトリ循環。機能回帰の証拠なし |
| F-07 | P2 | UNVERIFIED | 全再帰テスト・全プリセット fast-path の完走 | いずれも 30 分上限で showcase 以降または integration tests 実行中に停止。PASS にしていない |
| F-08 | P1 | FIXED | 初回 SVG sanitizer が Mermaid label とローカル SVG 参照を消しうる | 独立レビューで検出。HTML parser へ変更して安全化済み `foreignObject` を保持、Mermaid は root と flowchart で text label を優先、SVG 内 `#` 参照だけを許可。browser regression test PASS |
| F-09 | P2 | OPEN | D2 の client SVG に data URI または外部 URL の icon がある場合、image の `href` を除去する | 外部参照を許可しない安全側の挙動。icon の視覚互換性は別途、許可可能な URI 仕様と browser characterization を定めて判断 |

## 非該当

- `pnpm audit --json`: critical/high/moderate/low/info はすべて 0。
- package tarball 由来の外部 site build/typecheck は直列実行で成功。先行する並列実行時の `dist` 欠落は生成物競合であり、再現しなかった。
