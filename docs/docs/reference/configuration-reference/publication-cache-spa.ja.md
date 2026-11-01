---
date: 2026-10-08
title: 公開設定・キャッシュ・SPA
sidebar:
  label: 公開設定・キャッシュ・SPA
  order: 30
---
# 公開設定・キャッシュ・SPA

## publication

`publication` は単一の公開モデルに任意の承認を追加します。計画、成果物検証、永続状態の検査は常に実行され、承認は既定で無効です。

| 設定 | 型 | 既定値 | 用途 |
| --- | --- | --- | --- |
| `requireApproval` | `boolean` | `false` | すべての Riebeckite のデプロイ経路で現在の承認記録を必須にします。 |
| `approvalFile` | `string` | `"publication/approvals.json"` | コミットする承認記録のプロジェクト相対パス。 |

```ts
publication: {
  requireApproval: true,
  approvalFile: "publication/approvals.json",
}
```

永続スナップショットはローカル実行では `publication/state.json` に書かれ、CI では `publication-state` ブランチに保存されます。`publication/state.json` は Git にコミットしないでください。詳しくは [公開ワークフロー](../../guides/deployment/publication-workflow.ja.md) を参照してください。

## cache

`cache` では、ビルド結果のキャッシュを設定します。

キャッシュを利用すると、前回のビルド結果を再利用できるため、変更されていないコンテンツの処理を省略できます。

| 設定 | 型 | 既定値 | 用途 |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | キャッシュを使用するかどうか。 |
| `directory` | `string` | `<buildDirectory>/cache` | キャッシュを保存する場所。 |

```ts
cache: {
  enabled: true,
}
```

`enabled: false` にするとキャッシュを使用せず、毎回すべてを処理します。

`directory` を指定すると、キャッシュの保存先を変更できます。

キャッシュを無効化したり保存先を変更したりしても、最終的に生成されるサイトの内容は変わりません。変わるのは主にビルド時間です。

詳しくは [Build cache](../configuration/cache.ja.md#ビルドキャッシュ) を参照してください。

## spa

`spa` では、クライアントサイドのページ遷移を有効にします。`true` を指定すると既定値で有効になり、オブジェクトを指定すると動作を設定できます。省略するか `false` を指定すると、通常のブラウザ遷移のままになります。

| 設定 | 型 | 既定値 | 用途 |
| --- | --- | --- | --- |
| `prefetch` | `false` \| `"hover"` | `false` | リンクにポインターが乗ったとき、同一オリジンのページを先読みする。 |
| `scrollRestoration` | `boolean` | `true` | 履歴ごとのスクロール位置を保存し、復元する。 |
| `viewTransitions` | `boolean` | `false` | 利用可能で、モーションが許可されている場合に View Transitions API を使う。 |

```ts
spa: {
  prefetch: "hover",
  viewTransitions: true,
}
```

設定の検証では `spa` が boolean かオブジェクトかだけを確認します。オプションの値が不正な場合は、ランタイムの起動時にエラーになります。リンクの扱いと[[glossary/renderer|レンダラー]]の要件は [SPA ナビゲーション](../../guides/spa-navigation.ja.md) を参照してください。
