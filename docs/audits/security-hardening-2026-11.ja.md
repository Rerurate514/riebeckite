# Security & Supply Chain Hardening Audit — 2026-11

## 結論

監査時点で確認した P0/P1 はありません。P2 の供給網リスクを 2 件修正しました。`@riebeckite/og-image` の実行時依存 `satori@0.25.0` は GHSA-wx4j-mvgx-mqwp の影響範囲にあり、`satori@0.33.5` と `fflate@0.7.5` へ更新しました。CI の 3 箇所で可変タグ `actions/cache@v4` を参照していたため、検証済みコミット `0057852bfaa89a56745cba8c7296529d2fc39830` に固定し、再発チェックを追加しました。

この文書の PASS は、この監査でコマンドを実行して期待した結果を確認したものだけです。外部サービス設定、公開環境、実利用 Vault は操作していません。

## 信頼境界と攻撃面

| 境界 | 権限・副作用 | 主な防御 | 状態 |
| --- | --- | --- | --- |
| Markdown、frontmatter、YAML/JSON | 静的 HTML、検索索引、記事メタデータを生成 | `rehype-raw` 後に `rehype-sanitize`、危険 URL・イベント属性・script を除去 | PASS |
| 外部取得コンテンツ | Plugin が HTTP を実行し、HTML/データを生成し得る | Plugin ごとの URL・サイズ・DNS 方針。Plugin 出力は信頼済みコード扱い | PARTIAL |
| Vault、assets、mutation、migration | 読取り、作成、更新、削除、バックアップ | 論理パス検証、`lstat`、symlink 除外、ジャーナル・ロック | PARTIAL |
| 公式/第三者 Plugin、Theme | Node と Browser の任意コード、フック、client entry | サンドボックスなし。インストール主体が信頼境界 | PASS（設計確認） |
| Vite/HonoX/Inspector/Bridge | ローカル HTTP、開発時のファイル・mutation 操作 | loopback、Host、Origin、token、1 MiB body 上限 | PARTIAL |
| Browser runtime | DOM、URL、検索、SPA navigation | Markdown sanitizer。Plugin/Theme HTML は対象外 | PARTIAL |
| GitHub Actions/公開 | CI 実行、artifact、npm/Cloudflare 公開 | 最小権限の workflow、artifact verification、SHA pin | PARTIAL |
| npm 配布物 | install、runtime dependency | pnpm lockfile integrity、package files、監査 | PASS |

## STRIDE 要約

| 脅威 | Riebeckite 固有の経路 | 評価 |
| --- | --- | --- |
| Spoofing | Inspector/Bridge の localhost token | PARTIAL。コード上の loopback、Host、Origin、constant-time token 比較を確認。外部バインドと reverse proxy は未検証。 |
| Tampering | Mutation plan/journal、SSG cache、CI cache/artifact | PARTIAL。plan fingerprint、symlink 除外、artifact verify は確認。ファイル操作中の競合は Node の portable な directory-handle API がないため完全な原子的保証はしていない。 |
| Repudiation | Publication state、migration journal | PASS。publication state と mutation journal に状態記録がある。 |
| Information disclosure | Vault traversal、Inspector、公開設定 | PARTIAL。既存の path/symlink テストは通過対象。実機の junction/reparse point と本番 secret 設定は未検証。 |
| Denial of service | endpoint/Bridge body、画像/SVG、外部 fetch | PARTIAL。HonoX と Bridge の 1 MiB 上限を確認。画像デコーダと外部 provider の負荷試験は未実施。 |
| Elevation of privilege | Plugin/Theme dynamic import、CI action、publish | PASS（明示的信頼境界）。Plugin/Theme は sandbox されず、Node 権限を持つ。今回の可変 CI action pin を除去。 |

## 検証済みの防御

- `packages/core/test/markdown_pipeline.test.ts` は script、event handler、iframe、`javascript:`、`data:text`、SVG `foreignObject`、style 属性の除去を検証する。
- `packages/node/test/content_migration_security.test.ts` は改ざん plan、path traversal、Vault 内 symlink、Vault 外 journal、競合 lock をダミー一時ディレクトリで検証する。
- `packages/core/src/plugin/plugin_cache.ts` の plugin namespace は `[A-Za-z0-9._-]` のみを許可し、不正名を SHA-256 に変換する。第三者 Plugin の任意コード実行を防ぐ機構ではない。
- `packages/dev-inspector/src/development_inspector_security.ts` は loopback socket/listener/Host、forwarded header 拒否、Origin、token を確認する。

## 脆弱性マトリクス

| ID | 深刻度 | 到達可能性 | 根本原因 | 修正 | 状態 |
| --- | --- | --- | --- | --- | --- |
| SC-01 | P2 | `@riebeckite/og-image` が悪意ある SVG を処理する場合 | `satori@0.25.0` が GHSA-wx4j-mvgx-mqwp の影響範囲 | `satori@0.33.5` へ更新 | PASS |
| SC-02 | P2 | CI が対象 job を実行するたび | `actions/cache@v4` が mutable tag | SHA pin と静的回帰テスト | PASS |
| FS-01 | P2候補 | Vault を同時に操作できるローカル攻撃者が必要 | `lstat` と後続 read/write/rename の間に一般的な TOCTOU 窓がある | portable な完全対策は未実装。権限分離した Vault と信頼済みローカル利用者を前提 | UNVERIFIED |
| HTML-01 | 設計上の信頼境界 | 悪意ある Plugin/Theme を導入した場合 | Plugin 生成 HTML と Node code は sandbox 外 | 互換性を壊す偽の sandbox は導入しない。文書化済み | PASS |

## Supply Chain 結果

`pnpm audit --json` を lockfile に対して実行した。

| 実行前 | 修正 | 実行後 |
| --- | --- | --- |
| moderate 1: `satori@0.25.0` / GHSA-wx4j-mvgx-mqwp | `satori@^0.33.5`、`fflate@<0.7.5: 0.7.5` override | critical/high/moderate/low/info すべて 0 |

lockfile は pnpm の integrity を保持する。OSV-Scanner、OpenSSF Scorecard、公開済み tarball 内容はこの環境で実行していないため UNVERIFIED。`pnpm install` が許可する build script は workspace policy の `allowBuilds` に列挙されている。

## CI/CD と公開

- `pull_request_target` は確認範囲の workflow にはない。
- `ci.yml` は `contents: read` を既定とし、publish job だけが publication state 更新のため `contents: write` を持つ。
- 全外部 `uses:` は full SHA を要求する `scripts/check_workflow_security.mjs` で検査する。ローカル action は許可する。
- npm Trusted Publishing、OIDC、Cloudflare token の権限、environment approval、branch protection はリポジトリ外設定であり UNVERIFIED。設定を無断変更していない。

## 回帰ハーネス

| 群 | 証拠 | 状態 |
| --- | --- | --- |
| Malicious Markdown/HTML corpus | `packages/core/test/markdown_pipeline.test.ts` | PASS |
| Filesystem boundary | `packages/node/test/content_migration_security.test.ts` | PASS |
| Plugin trust boundary | security model と plugin cache 検査 | PASS（設計確認） |
| Browser XSS | Markdown corpus。実ブラウザ exploit は未実行 | PARTIAL |
| Build artifact integrity | `scripts/ci/build_artifact.test.mjs` | UNVERIFIED（今回未実行） |
| Publication workflow | `scripts/check_workflow_security.test.mjs` と workflow scan | PASS |
| Dependency vulnerabilities | `pnpm audit --json` | PASS |

## 互換性・性能・残存リスク

OG image renderer の PNG regression test 5 件は `satori` 更新前後に通過した。CI action pin は action version を変更せず、取得参照だけを固定する。SHA 静的検査は `.github` 下の YAML を走査するだけで、通常ビルドの実行時性能には影響しない。

第三者 Plugin/Theme は Node/Browser の信頼済みコードであり、悪意ある package を安全化しない。公開サイトでの CSP、外部 embed provider、実 Vault の Windows junction、CI secret 値とクラウド権限はこの監査では保証しない。
