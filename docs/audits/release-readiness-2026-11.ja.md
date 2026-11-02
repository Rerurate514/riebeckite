---
date: 2026-11-02
title: Riebeckite リリース準備監査 2026-11（日本語要約）
private: true
---
# Riebeckite リリース準備監査 2026-11（日本語要約）

詳細は英語版の [release-readiness-2026-11.md](./release-readiness-2026-11.md) を参照してください。修正後の個別検証は「H. 修正後の再監査」にあります。

## 判定

**CONDITIONAL**（初回監査は NOT READY）。

P1 のコード欠陥 9 件のうち 8 件は修正・検証済みです。残る P1 は npm 0.0.35 と HEAD の差（RR-008）で、本作業では publish が禁止されているため未解消です。追加で発見した HonoX 0.1.56 の registry テスト crash（RR-026）と、HonoX バージョン分裂による外部サイトの `No context found`（RR-028）は、0.1.62 への統一で解消しました。視覚回帰、5,000 ノート SSG、Linux 実機が未検証または失敗のままです。

## 解消した P1

1. `build:packages` の循環依存（RR-001）。`createDevelopmentTrace` を Core へ移し、Inspector から HonoX への devDependency を削除。`check:cycles` を CI に追加。
2. 未公開 Inspector による外部 E2E の 404（RR-002）。external-site の pack 対象に Inspector と diagnostics を追加し、tarball からの install / build が成功。
3. `pnpm typecheck` の 3 件の型エラー（RR-003）。テストの型を CLI の値型に合わせ、コールバックを async 化。
4. CLI `doctor` の診断二重計上（RR-004）。manifest 取得失敗時に asset inspection を実行しないよう修正。212 テスト中 211 pass / 1 skip。
5. Hover Preview の unlisted 露出（RR-005）。`routableEntries` から `discoverableEntries` へ変更。unlisted の直接 URL は維持。
6. セキュリティ文書の raw HTML 記述（RR-006）。実装の `rehype-sanitize` に合わせて EN/JA を修正。
7. CLI の `lz-string` 解決失敗（RR-007）。Excalidraw の `createRequire` を cwd / プラグイン実エントリへフォールバックさせ、`inspect config` と web build を確認。
8. create-riebeckite の `{{schedule}}` テストと scaffold 列挙（RR-010）。80/80 pass。
9. 1,000 ノートの clean / incremental 不一致（RR-009）。検索索引の同一タイトル順を `permalink` で安定化。cold / no-change とも `equivalence=true`、`differences=[]`。

## 主な検証結果

- `pnpm build:packages`: PASS（114/114）
- `pnpm typecheck`: PASS
- `pnpm check`: PASS（exit 0、13 warnings / 3 infos）
- `pnpm check:cycles`: PASS（依存 / runtime とも循環 0）
- `pnpm check:docs`: PASS（1,204 markdown、83 plugin docs、28 theme READMEs）
- `pnpm test:e2e:external`: PASS（tarball から新規 install / build。HonoX 0.1.62 統一後）
- 1,000 ノート full SSG: PASS（cold 102.3s / no-change 31.1s、equivalence true）

## 未解決 / 未検証

- RR-008: npm 0.0.35 が HEAD より古く、Inspector は未公開。次バージョンの公開が必要。
- HonoX 0.1.56 の `test:registry` crash は、visited set を持つ 0.1.62 への更新で解消（194/194 pass）。
- `pnpm -r test` は create-riebeckite の 2 契約が Windows `0xC0000005` で異常終了。単独では 80/80。
- `pnpm test:visual` は 36 画像差分で失敗。ベースライン未更新。
- 5,000 ノート SSG、Linux 実機、実 npm registry、Cloudflare / GitHub Pages への実デプロイは未検証。
- `content --help`、moderate 依存 2 件、Actions の SHA 固定など P2 / P3 は未修正。

## リリースゲート

リリース前に必須:

1. 次バージョンと Inspector の公開順を確定して publish する。
2. 視覚回帰 36 差分を評価し、ベースライン更新か CSS 修正を決める。
3. Linux 実機で build / test / external install を通す。

本作業では commit / push / deploy / npm publish を行っていません。変更は作業ツリーにあります。
