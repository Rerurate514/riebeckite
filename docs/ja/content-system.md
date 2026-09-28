# Content System

## 明確な二つの責務

`ContentSource` は source data を発見して読む boundary です。scan/read、identity、mtime・size・ETag・hash などの metadata を所有します。ローカル標準実装は `FileSystemContentSource` です。

`ContentManager` は data の意味を扱います。parse、Markdown/HTML pipeline、post processing、plugin orchestration、manifest 作成、content graph 構築を担当します。filesystem を直接扱う機能をここへ足して ContentSource を迂回しないでください。

```text
scan/read -> parse post -> process post -> manifest -> graph
               `------ plugin lifecycle/content hooks ------'
```

Plugin は config resolved、content loaded、post parsed/processed、manifest created、build start/end などの phase に定義済み hooks で参加します。source I/O、意味の解釈、rendering を分けることで、Core policy を変えずに remote source へ差し替えられます。

Manifest は application が使う生成済み content 表現、content graph は関係表現です。runtime manifest の参照は明示的 build ではありません。incremental state は explicit build 専用で、Worker runtime の可変依存にはできません。

canonical content identity を source/manifest/graph で保ち、metadata を過信せず、publication/exclusion policy を config に表し、recoverable error を黙って content から落とさず diagnostics にします。
