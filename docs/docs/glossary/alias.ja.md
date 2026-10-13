---
title: Alias
sidebar:
  hidden: true
---

# Alias

ノートの別名で、manifestに追加の検索キーとして記録します。slugやpermalinkを変えずにWikiLinkを同じノートへ解決しますが、同じ名前を二重に使うと曖昧になります。

## aliasの設定

```yaml
---
aliases: [Getting Started, Quick Start]
---
```

## 解決と曖昧さ

各aliasは、このノートへ解決するキーとしてcontent indexに登録されます。2つのノートが同じaliasを主張するとキーが曖昧になり、それを使うリンクが報告されます。
