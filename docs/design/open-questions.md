# Open Questions — 追加プラグイン設計（ORC がユーザー確認待ち）

設計書 §0 ルール 7 に従い、推測で埋めずここに集約する。決定後は `contracts.md` に反映する。

## Q1（最重要）任意ファイル出力の方式 — P1/P5/P6/P7 の前提
現状プラグインは `dist/` に任意ファイルを書けない（`emit` 不在・recon §2）。
- (A) Core に build-time emit フック（`emit(path, content)` + 重複/決定性/公開漏洩ガード）を新設し、CLI が `dist/` へ flush する。
- (B) apps/web のビルドスクリプト／CLI サブコマンド側で生成する（プラグインは manifest 経由でデータ提供）。
- (C) endpoints で動的配信（静的ホスティングでは不可）。
→ 推奨: **(A)**。ただし Core 変更が大きく、全プラグインの後方互換に影響するため要承認。

## Q2 endpoints の method / POST・streaming — P7 の前提
`mountRiebeckiteEndpoints` は `endpoint.method` を無視し GET 固定。実装は `app.get()` のみ。
- (A) HonoX integration を `method` 対応にし、POST/streaming を許可する。
- (B) P7（MCP）は今回スコープ外／ストレッチ扱いで後回し。
→ 推奨: まず **(B)**（P7 延期）、MCP を本気でやるなら (A)。

## Q3 単体テストランナーの追加 — §5.3 の前提
リポジトリに vitest/jest 等が無く、唯一のテストは E2E ハーネス。
- (A) vitest を新規 devDependency として追加し `test:unit` を新設する（規約変更）。
- (B) `node:test` + `node --test` で `test:unit` を新設する（依存追加なし）。
- (C) 単体テストは作らず E2E と純関数の golden を node スクリプトで代替する。
→ 推奨: **(B)**（依存を増やさず決定的）。ただし要承認。

## Q4 P0 の範囲（差分ビルド/キャッシュ）
既存 `PluginCache`（KV, `cacheVersion` 名前空間, `.riebeckite` 配下）は実在。設計の `memo(key, deps, compute)` は無い。
- (A) 依存宣言型 `memo` + ページ単位キャッシュ + `--no-cache` を Core に新設（大改修）。
- (B) 既存 `PluginCache` を拡張し、依存ハッシュをプラグイン側で管理（小改修）。
- (C) P0 を延期し、まず P1〜P7 の非ブロッキング部分を実装。
→ 推奨: P0 は最後（(A) を段階的に）。まず Q1/Q3 を確定。

## Q5 重い依存の追加 — P4 の前提
`lighthouse` / `axe-core` / `jsdom or happy-dom` / 既存 puppeteer は重量級。
- (A) 追加する（CI/実行時間・インストールサイズ増）。
- (B) 静的検査のみ `axe-core` + 自前ルール（jsdom 無し、正規表現/軽量 DOM で）で実装し、Lighthouse は任意・無効時スキップ。
→ 推奨: **(B)**。

## Q6 MCP / Cloudflare Workers の扱い — P7
`apps/web/wrangler.jsonc` はあるが、静的 SSG が主。MCP は POST/streaming/レート制限/認証が必要。
→ P7 を (A) 実装するか、(B) ストレッチとして当面見送るか。

## Q7 プラグインによる新規ページ生成 — P1（`/daily/*`, `/weekly/*`）
SSG は `manifest.entries` の permalink ごとに 1 HTML を出すだけで、プラグインがページを追加する機構がない。
- (A) manifest に合成 entry を追加できるようにする（Core 拡張）。
- (B) apps/web に `/daily` 等の route を追加し、プラグインはデータ（`/daily/index.json` 相当）を提供する（シェル/route は Site の責務という §Site contract に整合）。
→ 推奨: **(B)**（Site contract と整合、Core 変更最小）。

## Q8 公開制御の適用範囲
`content.exclude` / `publishStrategy: "explicit"` を、合成ページ・feed・llms・MCP 出力の**すべて**に適用する（デフォルト拒否）ことを確認したい。特に daily のマーク無し内容・非公開ノートの旧パスがロック/レジストリにも入らないこと。
→ 推奨: 既定どおり「明示的に公開されたものだけ出力」。承認のみ。
