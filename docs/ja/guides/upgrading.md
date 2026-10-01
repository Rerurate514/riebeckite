# Riebeckiteをアップグレードする

既存サイトを新しいRiebeckiteへ更新するときは、このガイドを使ってください。

## 基本手順

1. 現在入っているpackage versionを確認します。

   ```sh
   npm ls @riebeckite/core @riebeckite/cli @riebeckite/honox
   ```

2. サイト内のRiebeckite packageをまとめて更新します。
3. サイトで普段使っている検証を実行します。

   ```sh
   npm exec riebeckite check
   npm exec riebeckite doctor
   npm exec riebeckite build
   ```

4. `doctor`がdeprecated usageを報告した場合は、表示されたconfig、Plugin API、Theme API、CLI option、scaffold生成物、package参照を、削除予定versionまでに更新します。

## deprecated warningの意味

Deprecatedは「今は動くが、今後の推奨contractではない」という意味です。Riebeckiteはdeprecated usageをwarningとして報告します。deprecated warningだけでbuildを突然失敗させるものではありません。

各warningには、原則として次の情報が含まれます。

- 何がdeprecatedなのか
- いつdeprecatedになったか
- replacementがある場合は何を使うか
- 利用者が行うmigration action
- 詳細ドキュメントへの参照
- 削除予定versionが決まっている場合はそのversion

アップグレード後は`npm exec riebeckite doctor`を実行してください。deprecated usageは`Deprecated usage` checkに表示されます。warningだけのdoctor結果は成功扱いです。errorは、invalid configuration、依存関係の欠落、inspectionを妨げるcontent問題、すでに削除されたAPIなどに使います。

## Deprecation Policy

- **Deprecated**: 当面はsupportされますが、将来変更されるcontractです。可能なタイミングでmigrationしてください。
- **Removed**: すでにsupportされていません。使い続けるとvalidation、build、runtime checkで失敗する可能性があります。
- **Breaking Change**: site、config、plugin、theme、deploymentの更新が必要になり得る変更です。
- **Migration**: 古いcontractから新しいcontractへ移るための手順です。

Riebeckiteは現在pre-1.0です。そのため、安定版1.xのSemVerと同じ互換期間を約束するものではありません。それでも、securityやcorrectness上の理由がない限り、deprecatedにした瞬間に同じreleaseで削除しません。可能な限り、まずwarningを出し、replacementまたはactionを文書化し、その後のreleaseで古いcontractを削除します。

## migration noteの読み方

まず`doctor`に表示されたwarningを確認してください。サイトが使っている古い要素を直接指すため、最も具体的です。そのうえで、warningに含まれるmigration documentationを読みます。直接のreplacementがない場合は、一対一の置き換えを探すのではなく、`Migration`に書かれたactionに従ってください。

現時点では、Riebeckiteに`riebeckite migrate`や自動書き換え機能はありません。migrationは手動で適用し、変更をcommitして、次回以降のupgradeをreviewしやすくしてください。
