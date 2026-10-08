# Riebeckite をアップグレードする

既存の Site を新しい Riebeckite へ更新するときの手順です。

1. 利用中の Package を確認する
2. Site が利用する Riebeckite Package をまとめて更新する
3. 検証と Build を実行する
4. 対象 Version の Release Note と Migration Guide を確認する

```sh
npm ls @riebeckite/core @riebeckite/cli @riebeckite/honox
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite build
```

`check` は Config と Plugin Contract を検証します。`doctor` は環境、Project
の検出、Config、Plugin、Content Source、Build State を診断します。`build` は
Site を生成できるか確認します。

## 互換性に関する方針

現在の Riebeckite は、非推奨 API に対する runtime warning や互換 layer を標準では
提供していません。破壊的変更は Version、変更履歴、必要に応じて Migration Guide で
案内します。この方針は、将来の Release で非推奨期間を設けることを妨げるものでは
ありません。

1.0 前では、minor release に破壊的変更が含まれることがあります。1.0 以降は
Semantic Versioning に従います。minor または major version をまたいで更新するときは、
Release Note を確認してください。

## 更新に失敗したとき

失敗した Command の診断から確認します。Package Version を確認し、Migration Guide に
従って対象の Config または Plugin Contract を更新してから、`check`、`doctor`、`build` を
再実行してください。更新前の状態を Version Control に残しておくと、差分の確認や安全な
切り戻しができます。