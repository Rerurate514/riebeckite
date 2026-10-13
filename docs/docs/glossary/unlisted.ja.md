---
title: Unlisted
sidebar:
  hidden: true
---

# Unlisted

URL では提供しつつ、一覧や feed には載せない公開状態です。routable だが discoverable ではないため、共有用のリンクや下書きに近いページに向きます。

## 設定

```yaml
---
visibility: unlisted
---
```

## 効果

ページは routable のままで出力も作りますが、discoverable のビューから外れるため、一覧や feed には載りません。
