---
title: Draft
sidebar:
  hidden: true
---

# Draft

公開の判定によって公開サイトから外されるコンテンツです。処理自体は続けられますが、公開されるまでroutableとdiscoverableのビューから除外されます。

## 設定

```yaml
---
published: false
---
```

## それでも起きること

draftも解析と内部リンクの対象になるため、プレビューや相互参照ができます。publishされるまで公開の出力は作りません。
