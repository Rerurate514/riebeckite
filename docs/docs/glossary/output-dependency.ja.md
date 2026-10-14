---
title: Output Dependency
sidebar:
  hidden: true
---

# Output Dependency

出力が何に依存するかの宣言で、output inventoryを前回の状態と比べたときにどの出力を再生成するかを決めます。contentの出力は`content`型の依存を持ち、Generated Outputは任意の型を持てます。

## 依存の宣言

各出力は依存の型と対象を持ちます。依存を宣言しない出力は`unknown`として扱われ、すべての出力の再生成を引き起こします。

## 依存宣言の詳細

### content依存(`content { slug }`)

content entryが特定の`slug`で識別されるとき、そのcontentが変わるとすべての`content`型依存を持つoutputが影響を受けます。slugはcontentのpermalinkから導かれるslugと一致します。これはspecificなページが変わったときに個別に無効化を可能にする、最も一般的な依存タイプです。

### tag依存(`tag { tag }`)

特定の`tag`を持つcontentが変わると、その`tag`依存を持つすべてのoutputが影響を受けます。個々のcontent slugを追跡せずに、particular tagを持つcontentの変更時に再生成をトリガーします。

### folder依存(`folder { folder }`)

specified`folder`内のcontentが変わると、その`folder`依存を持つすべてのoutputが影響を受けます。content slugのディレクトリ構造によってフォルダパスが決定されます（例：`blog/post.md`は`blog`フォルダに属します）。

### global依存(`global`)

どのcontentも変わると、`global`依存を持つすべてのoutputが影響を受けます。specificなslug、tag、またはfolderに絞り込めないoutputがcontent変更に依存するときに使用する、最も広範な依存タイプです。

### unknown依存(`unknown`)

宣言されていない依存を持つGenerated Outputは`unknown`として扱われ、常に全出力の再生成をトリガーします。inputのスコープが他のどの依存型でも表現できないときのフォールバックです。`unknown`はインクリメンタルSSGを犠牲にして正しさを優先し、全出力再生成を強制します。

## 比較

Buildはoutput inventoryを前回の成功した状態と比べ、影響する出力、変わっていない出力、削除された出力を求めます。依存の宣言がこの比較の精度を決めます。

## 関連用語

- [[glossary/build-dependency|Build Dependency]]
- [[fingerprint|Fingerprint]]
- [[output-inventory|Output Inventory]]
- [[glossary/cache|Cache]]

## さらに詳しく

- [Output Dependency](../framework/build-dependency.ja.md)
