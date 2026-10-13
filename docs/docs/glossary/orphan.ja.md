---
title: 孤立したコンテンツ
sidebar:
  hidden: true
---

# 孤立したコンテンツ

 公開されたページや他のコンテンツによって参照されていないコンテンツやアセットです。orphan は削除されたコンテンツがまだ存在していることを示している、あるいは cleanup するべきコンテンツであることを示す可能性がある。

## 検知

 どのコンテンツからもリンクされておらず、manifest にもリストされていないコンテンツ。
 content の frontmatter や content で参照されていないアセット。

## 処理

 orphan はビルド失敗を起こさないが、 stale content を示す可能性がある。
  broader project health の診断には `check` または `doctor` を使用する。
 必要なくなった orphaned content やアセットを削除する。

## 関連用語

- [[unused-asset|未使用アセット]]
- [[glossary/content|Content]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Diagnostics](../framework/diagnostics.ja.md)
