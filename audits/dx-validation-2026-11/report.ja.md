# Riebeckite DX Phase 2 実証記録

## 結論

Scaffold の型検査失敗は公開 package の `dist/*.d.ts` を生成せずに実行していた
build 前提漏れだった。`check:scaffold` の前に既存の依存順 package build を実行する
ようにして、Windows の clean worktree から検証を完走した。

Riebeckite は JSX、CSS、HonoX route、unified/remark/rehype、ブラウザ JavaScript を
そのまま利用する。一方で、content の公開境界、生成 page、plugin lifecycle、
client entry は目的固有の概念であり、通常の Web API だけでは置き換えられない。
この分離は公開 API を削る根拠にはならない。

Quartz 5 は `QuartzComponent`、Preact JSX、CSS、`afterDOMLoaded` script と
unified plugin を採用している。component/plugin の配布には package manifest、
`dist`、`@quartz-community/types`、Quartz の pipeline 種別という固有知識が必要である。

## 固定した対象

| 対象 | 値 |
| --- | --- |
| Riebeckite | `0baca565ea77b678b479fe59815f4962b4242c0e` を基点にした worktree |
| Node / pnpm / TypeScript | v24.22.1 / 11.5.3 / 5.9.3 |
| Quartz | 5.1.0, `7cfb0796165c848be5438117e9806802123bf676` |
| Quartz 公式資料 | `https://quartz.jzhao.xyz/advanced/creating-components` と `https://quartz.jzhao.xyz/advanced/making-plugins`（2026-11-18取得） |

Quartz は `C:\Users\rerur\AppData\Local\Temp\opencode\quartz5-dx-validation` に
隔離して clone した。Riebeckite の production source、実サイト、既存 test fixture は
変更していない。

## Scaffold 修正

`package.json` の `check:scaffold` を次へ変更した。

```json
"check:scaffold": "pnpm build:packages && node scripts/check_scaffold.mjs"
```

`checkGeneratedConfigTypes()` は workspace package の `exports.types` が指す
declaration を読む。clean checkout ではこれらが未生成で、`plugin-navigation/client`、
`ui/overlay`、`og-image` などが解決不能だった。`build:packages` は既存の依存グラフを
使って 117 package を6層でビルドするため、alias、`any`、`skipLibCheck` の変更を追加せず
に必要な公開成果物を生成できる。

代償は `check:scaffold` が package build 分だけ長くなることである。検査が clean state
で型検査まで到達することを優先した。

## API と知識の分類

| 領域 | A: 通常のWeb知識 | B: framework固有知識 | C: 通常APIだけでは解けない定型処理 |
| --- | --- | --- | --- |
| Page/UI | JSX、CSS、HonoX route、DOM | Riebeckite virtual module/provider、Quartz component props/layout | content page と layout slot の接続 |
| Markdown | unified、remark、rehype | plugin 登録位置 | content metadata・公開状態の一貫した処理 |
| Client | browser event、CSS、JavaScript | Riebeckite client entry/Island、Quartz `nav`/`render` event と cleanup | SPA遷移時の初期化・cleanup |
| Plugin | npm package、TypeScript、exports | Riebeckite `definePlugin`、Quartz transformer/filter/emitter/page type/manifest | capability、順序、page衝突、配布済みartifactの検証 |

## 実行結果

| 検証 | 状態 | 結果 |
| --- | --- | --- |
| `pnpm check:scaffold` | PASS | 117 package build 後、Biome と全preset生成・型検査が成功 |
| `pnpm test:checks` | PASS | 15/15 |
| `pnpm check:packages` | PASS | 117 public package |
| `pnpm check:dependencies` | PASS | 成功 |
| `pnpm check:docs` | PASS | 1262 Markdown、85 plugin、28 theme README |
| `pnpm test:browser` | PASS | 18/18。検索dialog、focus、SPA client navigation を実ブラウザで確認 |
| `pnpm test:plugin-dx` | PASS | fixture install後に21/21 |
| `pnpm test:plugin-dx:external` | PASS | packed tarball の隔離install、config、型検査 |
| `pnpm test:e2e:external` | PASS | packed tarball site のproduction build、browser hydration、incremental MDX |
| `pnpm typecheck` | FAIL | `packages/integrations/honox/test/honox_islands.test.ts` に既存のVite hook型4エラー |
| Quartz `npm test` | PASS | 429 pass、2 skip |
| Quartz `node quartz/bootstrap-cli.mjs build` | PASS | 2 Markdown input、68 files、`public/index.html` と `public/projects/alpha.html` |
| Quartz `npm run quartz -- build` | FAIL | Windows PowerShell が POSIX形式の `./quartz/bootstrap-cli.mjs` をコマンドとして実行できない |

`test:plugin-dx` の最初の失敗は fixture 専用 workspace が未installだったためである。
CIも先に `pnpm --dir tests/plugin-dx install --frozen-lockfile` を実行する。install後は
未宣言依存ではなく、21件すべて成功した。

## Task A-D と Plugin A-E の判定

本実行でブラウザ、packed external consumer、plugin author fixture を再実行した範囲は
PASS とする。ただし、同一要件で新規に書いた Riebeckite/Quartz の Task A-D、
Plugin A-E の全実装、両者の同一条件バンドル比較、Quartz plugin の browser E2E は
実施していない。これらは **UNVERIFIED** であり、既存 source や公式資料だけから
優劣を結論しない。

## 改善の優先順位

1. Scaffold の build 前提を維持する。今回の修正で型検査の偽陰性を除去した。
2. `pnpm typecheck` のVite hook API追従を別途修正する。今回のScaffold修正とは無関係。
3. Quartz の比較を続けるなら、A-D と Plugin A-E を先に固定した小さな同一仕様として
   隔離directoryに実装し、build artifact と browser結果を保存する。単なるAPI読解や
   LOC比較を成功根拠にしない。

## 既存文書との不一致

`docs/audits/final-release-audit-2026-11-08/report.ja.md` は clean checkout の
`check:scaffold` が public declaration 未生成で失敗すると記録しているが、
`docs/docs/framework/development/setup.ja.md` は同コマンドを単独で実行できる前提で
説明していた。今回のscript修正後は実装が後者の説明に一致する。
