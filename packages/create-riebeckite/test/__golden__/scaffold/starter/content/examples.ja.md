---
publish: true
---

# サンプル

Riebeckite の Markdown でできることをまとめた小さなページです。必要なセクションを自分のファイルにコピーできます。

## リンク

WikiLink でページをつなげます：[[guide]] は Getting started を開きます。通常の Markdown リンクも使えます — [Home](/) でホームに戻れます。

## コード

フェンス付きコードブロックは書式を保ったまま表示され、コード系プラグインでツールバーが付きます：

```ts
export function hello(): string {
  return "Hello from Riebeckite";
}
```


## フロントマター

ファイル先頭の `---` に挟まれた部分がページを制御します。`publish: true` を書き続けるとビルド対象に残ります：

```yaml
---
publish: true
title: Example
---
```

