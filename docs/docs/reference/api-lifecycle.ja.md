---
date: 2026-11-02
title: API ライフサイクル
---
# API ライフサイクル

API ライフサイクルのメタデータは、公開 API が安定・非推奨・削除のどの状態にあるかを記録します。IDE、CLI、診断、Development Inspector が、非推奨の理由、代替 API、移行ガイド、確定した削除バージョンを同じ情報から参照できます。

ライフサイクルのメタデータは API の動作を変えません。互換レイヤーを追加したり、API を削除したり、それだけでビルドを失敗させたりはしません。

## 状態とフィールド

ライフサイクル定義は次の3つの状態のいずれかを使います。

| 状態 | 意味 |
| --- | --- |
| `stable` | 公開 API はサポートされている |
| `deprecated` | 公開 API は置き換えが推奨されるが、まだ動作する |
| `removed` | 公開 API は利用できない |

非推奨の定義には次のフィールドがあります。

| フィールド | 必須 | 意味 |
| --- | --- | --- |
| `id` | はい | `<package>#<api>` 形式の安定した識別子。例: `@riebeckite/core#oldApi` |
| `kind` | はい | `function`、`class`、`type`、`interface`、`constant`、`config-key`、`plugin-option`、`plugin-hook`、`cli-command`、`cli-flag`、`integration` |
| `status` | はい | `stable`、`deprecated`、`removed` |
| `package` | いいえ | API を所有するパッケージ。省略時は `id` から導出される |
| `deprecatedSince` | はい | 非推奨になったバージョン |
| `reason` | はい | 非推奨の理由 |
| `replacement` | いいえ | 代わりに使う API の ID |
| `removalVersion` | いいえ | 削除が確定しているバージョン |
| `migrationGuide` | いいえ | 移行ガイドのパスまたは短い手順 |
| `summary` | いいえ | ツールが使う1行の説明 |
| `diagnosticCode` | いいえ | この API の診断コード。既定は `RB-API-001` |
| `configPath` | いいえ | 非推奨の設定キーのドットパス。使用検出に使う |
| `pluginOption` | いいえ | 非推奨のプラグインオプションの `{ plugin, option }`。使用検出に使う |

`removed` の定義には `removalVersion` と `reason` が必要です。`stable` の定義に `deprecatedSince` や `removalVersion` を設定してはいけません。

`removalVersion` は削除が実際に確定したときだけ設定します。削除の予定がなければ省略してください。ツールはバージョンを推測せず、削除バージョンが未確定であると報告します。

## ライフサイクルのメタデータを宣言する

単一の定義を検証するには `defineApiLifecycle` を使います。

```ts
import { defineApiLifecycle } from "@riebeckite/core";

export const legacyMode = defineApiLifecycle({
  id: "@riebeckite/plugin-example#legacyMode",
  kind: "plugin-option",
  status: "deprecated",
  package: "@riebeckite/plugin-example",
  deprecatedSince: "0.2.0",
  removalVersion: "0.4.0",
  replacement: "@riebeckite/plugin-example#mode",
  reason: "The legacy mode is no longer supported.",
  migrationGuide: "/reference/plugin-api/",
  pluginOption: { plugin: "example", option: "legacyMode" },
});
```

メタデータが不正な場合、`defineApiLifecycle` は `ApiLifecycleValidationError` を投げます。エラーには構造化された `issues` が含まれるため、テストやビルド時のスクリプトからすべての問題をまとめて報告できます。

プラグインは `apiLifecycle` フィールドでライフサイクル定義を公開します。

```ts
import { definePlugin } from "@riebeckite/core";

export function example() {
  return definePlugin({
    name: "example",
    apiLifecycle: [legacyMode],
  });
}
```

`resolveApiLifecycle(config)` は、組み込みのライフサイクル API と、有効な各プラグインの `apiLifecycle` フィールドからレジストリを構築します。プラグインの外で定義を所有する場合は、第2引数に追加の定義を渡します。

`createApiLifecycleRegistry(definitions)` は定義を直接受け取ります。不正な項目はスローせずにスキップし、検証の問題として報告するため、壊れたプラグインが設定の解決を止めることはありません。重複した ID は最初の定義を残し、`duplicate-id` として報告します。

レジストリは `entries`、`issues`、`get(id)`、`deprecated()` を公開します。項目とレジストリは凍結されます。

## JSDoc

非推奨の TypeScript API には、公開宣言で `@deprecated` を付けます。

```ts
/**
 * @deprecated Since 0.2.0. Use `newApi` instead.
 */
export function oldApi(): void {}
```

このタグにより、エディター上でも出力される宣言ファイルでも非推奨であることが分かります。実装、公開型、ライフサイクルのメタデータを一致させ、同じ API を一方では非推奨、もう一方では安定として扱わないでください。

## 診断

Riebeckite はライフサイクルの検出結果を既存の診断の仕組みで報告します。

| コード | 重要度 | 条件 |
| --- | --- | --- |
| `RB-API-001` | `warning` | 非推奨 API が設定で使われている |
| `RB-API-002` | `error` | ライフサイクルのメタデータが不正 |

`RB-API-001` には API の ID、パッケージ、非推奨になったバージョン、代替 API、削除バージョン（未確定の場合は `not confirmed`）、移行ガイド、理由、検出した箇所が含まれます。使用検出は明示的な `pluginOption` と `configPath` のメタデータに限られ、ソースコードから任意の参照を走査するものではありません。

非推奨 API は既定では `check` や `doctor` を失敗させません。CI で厳しくしたい場合は `doctor --fail-on warning` を使います。メタデータが不正な場合は、レジストリが API を正確に説明できないためエラーになります。

## CLI

`check` は非推奨 API の使用を、代替 API と移行の情報とともに報告します。非推奨の警告だけでは失敗しません。

`doctor` は同じ検出結果を共有レポートと JSON 出力に含めます。`--code RB-API-001` で選択できます。

`inspect api` はライフサイクル管理対象の API を一覧表示します。`--deprecated` は非推奨 API だけに絞り、`--json` は検査結果を JSON で出力します。

```sh
riebeckite inspect api --deprecated
```

## Development Inspector

Development Inspector の API タブは解決済みのレジストリを表示します。各項目には状態、種類、パッケージ、非推奨になったバージョン、代替 API、削除バージョン、移行ガイド、理由が並びます。非推奨の項目には、現在の設定で使われているかどうかも表示されます。タブは読み取り専用で、開発サーバーからのみ利用できます。

## 削除の方針

ライフサイクルのメタデータは変更を説明するものであり、削除を予定するものではありません。API の削除は別の判断です。

1.0 より前は、マイナーリリースに破壊的変更が含まれることがあります。非推奨期間の設定は任意で、非推奨 API を残すためだけの互換レイヤーは追加しません。代替 API がある場合は、ライフサイクルのメタデータと移行ガイドに記載してください。決定していない削除バージョンを約束しないでください。

ライフサイクルのレジストリ、リリースの変更エントリー、`CHANGELOG.md` は別々の記録です。将来のリリースワークフローからこれらを関連付けられますが、ライフサイクルのメタデータはリリースノートの代わりにはなりません。

## 関連項目

- [診断](../framework/diagnostics.ja.md)
- [Core API](./core-api.ja.md)
- [Plugin API](./plugin-api.ja.md)
- [アップグレード](../guides/upgrading.ja.md)
