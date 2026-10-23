---
date: 2026-10-14
title: 出力依存関係（Output Dependency）
sidebar:
  hidden: true
---

# 出力依存関係（Output Dependency）

出力依存関係は、コンテンツの変更によってどの出力ファイルが影響を受け、再生成が必要になるかを決めます。

## 依存関係の種類

`content { slug }` — そのコンテンツが変わった。
`tag { tag }` — そのタグを持つコンテンツが変わった。
`folder { folder }` — そのフォルダ内のコンテンツが変わった。
`global` — いずれかのコンテンツが変わった。
`unknown` — 常に出力全体の再生成を引き起こす。

## 宣言

プラグインページでは `pageTypes[].outputDependencies`、ルートの `outputDependencies`、または `context.output.emit(..., { dependencies })` で宣言します。依存関係は可能な限り狭くし、`unknown` は範囲を特定できない場合にだけ使います。

## 宣言の詳細

### コンテンツ依存関係（`content { slug }`）

`slug` で識別されるコンテンツエントリが変わると、そのslugへの `content` 依存を持つすべての出力が影響を受けたものとして扱われます。slugはコンテンツのpermalinkから導かれるslugと一致します。最も一般的な依存関係の種類で、特定のページが変わったときに細かく無効化できます。

### タグ依存関係（`tag { tag }`）

指定した `tag` を持つコンテンツが変わると、そのタグへの `tag` 依存を持つすべての出力が影響を受けたものとして扱われます。個々のコンテンツslugを追跡しなくても、特定のタグを持つコンテンツが変更されたときに再生成できます。

### フォルダー依存関係（`folder { folder }`）

指定した `folder` 内のコンテンツが変わると、そのフォルダへの `folder` 依存を持つすべての出力が影響を受けたものとして扱われます。フォルダのパスはコンテンツslugのディレクトリ構造で決まります（例：`blog/post.md` は `blog` フォルダに属します）。

### グローバル依存関係（`global`）

いずれかのコンテンツが変わると、`global` 依存を持つすべての出力が影響を受けたものとして扱われます。最も広い依存関係の種類で、特定のslug、タグ、フォルダに絞り込めないコンテンツ変更に出力が依存する場合に使います。

### 不明な依存関係（`unknown`）

依存関係を宣言しない生成物は `unknown` となり、常に出力全体の再生成を引き起こします。入力範囲を他のどの依存関係の種類でも表せないときのフォールバックです。`unknown` は増分SSGを犠牲にして出力全体を描画し、ビルド性能と引き換えに正しさを確保します。

## 関連用語

- [[glossary/build-dependency|Build Dependency]]
- [[fingerprint|Fingerprint]]
- [[output-inventory|Output Inventory]]
- [[glossary/cache|Cache]]

## さらに詳しく

- [Output Dependency](../framework/build-dependency.ja.md)
