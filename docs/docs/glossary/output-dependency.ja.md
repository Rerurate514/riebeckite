---
title: 出力依存性
sidebar:
  hidden: true
---

# 出力依存性

出力依存性は、コンテンツの変更によってどのエミットされたファイルが影響を受け、再生成が必要かを決定する。

## 依存タイプ

`content { slug}` — そのコンテンツが変更された。
`tag { tag }` — そのタグを持つコンテンツが変更された。
`folder { folder }` — そのフォルダにあるコンテンツが変更された。
`global` — 任意のコンテンツが変更された。
`unknown` — 常に全出力再生成をトリガーする。

## 宣言

plugin page の `pageTypes[].outputDependencies`、root `outputDependencies`、あるいは `context.output.emit(..., { dependencies })` で宣言する。
可能な限り狭い依存を使用し、スコープが述べられない場合のみ `unknown` を使用する。

## 関連用語

- [[glossary/build-dependency|Build 依存性]]
- [[fingerprint|フィンガープリント]]
- [[output-inventory|出力インベントリ]]
- [[glossary/cache|Cache]]

## さらに詳しく

- [Output Dependency](../framework/build-dependency.ja.md)
