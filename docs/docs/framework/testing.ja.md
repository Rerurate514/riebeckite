---
date: 2026-10-08
title: テスト
---
# テスト

Riebeckite のテストは、Node.js 組み込みのテストランナー（`node:test`）と、TypeScript を直接実行する `tsx` で動かします。Jest や Vitest のような追加のテストフレームワークは使いません。

手作業での確認が難しい大きな出力には **Golden File** を使います。期待する出力そのものをファイルとして保存しておけば、変更の影響を Pull Request の差分として確認できます。

実際のサイトを生成して検証する End-to-End テストは別に用意していて、`tests/external-site` にあります。E2E を動かす再利用可能なエンジンは `@riebeckite/test/e2e` にあり、このリポジトリ固有の Fixture、テスト対象パッケージの一覧、アサーションは `tests/external-site` に置きます。

## このページの構成

- [実行](./testing/running.ja.md)
- [プラグイン](./testing/plugins.ja.md)
- [Golden File](./testing/golden-files.ja.md)
- [外部サイトの E2E](./testing/external-site.ja.md)
- [方針](./testing/policy.ja.md)


