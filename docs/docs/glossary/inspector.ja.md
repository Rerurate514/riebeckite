---
title: Inspector
sidebar:
  hidden: true
---

# Inspector

 already-resolved state（ config、 plugins、 content、 graph、 build state など）を閲覧する read-only CLI コマンドです。

## read-only 保証

 Build を実行したり、cache/assets/state を書き込んだり、asset をエミットしたり、特別なアーティファクトを描画したり、configuration を自動修正したりしてはならない。
 リクエストされた情報が存在しない場合は、その条件を Plainly レポートする。

## コマンド

`riebeckite inspect config` — 解決された設定。
`riebeckite inspect plugins` — 有効なプラグイン。
`riebeckite inspect content --list` — 公開されたコンテンツと URL。
`riebeckite inspect graph` — コンテンツグラフの関係。
`riebeckite inspect build` — incremental build state。

## 関連用語

- [[check|Check]]
- [[doctor|Doctor]]
- [[build|ビルド]]

## さらに詳しく

- [Inspector](../framework/inspector.ja.md)
