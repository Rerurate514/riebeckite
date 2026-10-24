---
title: アセットパイプライン Phase 2–3 検証
---

# アセットパイプライン Phase 2–3 検証

## 結果

本レポートに記録した検証修正後の `feat/asset-pipeline` は、ローカル統合可能です。

## 根拠

- `pnpm test:e2e:external` により、公開用にパックした成果物で HonoX SSG を実行しました。Markdown と Obsidian の画像参照から空でない WebP / AVIF を出力し、レスポンシブなマークアップを生成し、出力内に private のマーカーやアセットがないことを確認しました。
- Core のテストで、変換済み出力の衝突と public / unlisted / draft / scheduled の公開境界を確認しました。変換・出力するのはルーティング可能な public と unlisted の参照だけです。
- 画像オプティマイザーのテストで、コールド、無変更、編集、設定変更、画像削除時の出力インベントリを確認しました。無変更ビルドはキャッシュ済みバイナリを再利用し、コールド時とバイト列・インベントリが一致します。
- `pnpm build:packages` は公開パッケージ 90 件すべて成功しました。Core テストは 337 件、image-optimizer テストは 4 件成功しました。
- 両リビジョンでパッケージをビルドした後の `pnpm typecheck` は、候補と `main` ベースラインのどちらでも `apps/web/scripts/build_images.ts` の既存 `TS2502` のみを報告しました。

## 境界と残存リスク

Core は Sharp をインポートせず、依存は image-optimizer プラグイン内に限定されます。
外部ビルドには既存の Vite、Lightning CSS、WaveDrom、バンドルサイズに関する非致命的な警告が残ります。共通の `TS2502` 型エラーも今回の変更範囲外です。
