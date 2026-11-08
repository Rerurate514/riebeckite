# Verification Matrix

| 区分 | コマンドまたは方法 | 判定 | 証跡 |
| --- | --- | --- | --- |
| 依存固定 | `corepack pnpm install --frozen-lockfile` | PASS | pnpm 11.5.3、118 projects、lockfile 更新なし |
| formatting | `pnpm check` | PASS | 1,773 files、修正なし |
| 型検査 | `pnpm typecheck` | PASS | 3 projects、型エラーなし |
| package build | `pnpm build:packages` | PASS | 116 public packages |
| scaffold | build 後の `pnpm check:scaffold` | PASS | 8 presets の config typecheck |
| public artifacts | `pnpm test:e2e:external` | PASS | tarball install、external starter build/typecheck、generated output 検査 |
| fingerprint | `pnpm test:e2e:fingerprint` | PASS | 116 tarballs、cold/no-change build、content reuse |
| fast path | `pnpm test:e2e:fast-path` | PASS | 17 cases、改竄・削除・full build recovery を含む |
| all preset fast path | `pnpm test:e2e:preset-fast-path` | UNVERIFIED | empty/minimal/starter は通過。showcase 実行中に 30 分上限 |
| full recursive tests | `pnpm test` | UNVERIFIED | integration tests 実行中に 30 分上限。並列実行時の結果は競合のため無効 |
| check packages | `pnpm check:packages` | PASS | 116 public packages |
| dependency graph | `pnpm check:dependencies && pnpm check:cycles` | PASS | import/export および graph acyclic |
| source health | `pnpm check:source-health` | PASS_WITH_ADVISORIES | 130 advisory、blocking failure なし |
| docs | `pnpm check:docs` | PASS | 1,188 docs、plugin 84、theme README 28 |
| security workflow | `pnpm test:security` | PASS | 2 tests + scanner |
| npm audit | `pnpm audit --json` | PASS | 898 dependencies、全 severity 0 |
| browser SVG boundary | `pnpm --filter @riebeckite/plugin-mermaid test` | PASS | 17 tests。Chromium regression が `foreignObject` label を保持し、script/root onload/javascript URL を除去、実行なしを確認 |
| release/CI scripts | release/changelog/CI targeted tests | PASS | release 33、changelog 10、CI selection 9/browser 12/artifact 11 |

`PASS_WITH_ADVISORIES` はコマンドの終了成功を示すが、検出事項が無いことを意味しない。
