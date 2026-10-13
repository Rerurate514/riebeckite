---
title: Alias
sidebar:
  hidden: true
---

# Alias

ノートの別名で、manifest に追加の検索キーとして記録します。slug や permalink を変えずに WikiLink を同じノートへ解決しますが、同じ名前を二重に使うと曖昧になります。

## alias の設定

```yaml
---
aliases: [Getting Started, Quick Start]
---
```

## 解決と曖昧さ

各 alias は、このノートへ解決するキーとして content index に登録されます。2つのノートが同じ alias を主張するとキーが曖昧になり、それを使うリンクが報告されます。
