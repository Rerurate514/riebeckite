# @riebeckite/diagnostics

Riebeckite のツールで共有する、シリアライズ可能な開発診断パッケージです。

[English](./README.md)

`collectDevelopmentDiagnostics` は Core の inspection と output planning を再利用し、CLI Doctor と開発用 Inspector のために決定的なレポートを作成します。読み取り専用で、診断のために Build は実行しません。

`includeOutput: false` を渡すと Output Plan を含めずに診断を収集でき、`diagnoseOutputPlan` で Output Plan を Output 診断に変換できます。開発用 Inspector はこの2つを使い、重い Output レポートより先に診断を返します。
