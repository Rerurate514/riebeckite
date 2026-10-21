---
title: Plugin Previews
---
# Plugin Previews

[Playground](/playground) では、対応する Markdown プラグインをサイトと同じ
Riebeckite のパイプラインで試せます。フィクスチャを選び、Markdown を編集し、公開された
プラグインオプション、テーマ、カラーモードを切り替えて結果を確認します。

[English](./plugin-previews.md)

## 対応プラグイン

| プラグイン | フィクスチャ | プレビューオプション |
| --- | --- | --- |
| Code Tabs | 基本のタブ、分離したグループ | `syncTabs` |
| Code Annotations | Diff | なし |

利用できるのはホストが登録したプラグインだけです。プレビューディスクリプターには ID、表示名、
ブラウザーでの可用性、フィクスチャ、オプションスキーマ、実際のプラグインファクトリーを定義します。
Playground とドキュメント内のプレビューは同じレジストリーを利用します。

## プレビューを定義する

フィクスチャとオプションは、ホスト側のプラグイン登録と並べて定義します。UI で扱え、サーバー側で
プラグイン生成前に検証できるよう、値は boolean、string、number、enum に限定します。

```ts
registry.register({
  id: "example",
  title: "Example",
  availability: "browser",
  fixtures: [{ id: "basic", title: "Basic", markdown: "# Example" }],
  options: {
    enabled: { type: "boolean", title: "Enabled", default: true },
  },
  create: (options) => examplePlugin(options),
});
```

プラグイン ID とフィクスチャ ID は重複しない値にします。レジストリーは不正なスキーマ、重複 ID、
未知のオプション、不正な型の値を拒否します。

## セキュリティと制限

公開エンドポイントが受け付けるのは、登録済みのプラグイン ID、そのプラグイン自身のフィクスチャ ID、
スキーマに適合するオプションだけです。リクエストごとに Markdown は最大 100 KiB、シリアライズした
オプションは最大 10 KiB です。実際のパイプラインで変換した後の HTML をサニタイズし、空の sandbox と
制限付き CSP を持つ iframe に表示します。

プレビュー内ではプラグインのクライアントエントリーを実行しません。任意のスクリプトの実行、親ページへの
アクセス、任意のネットワークリクエストを防ぐためです。サイトマニフェスト、ページコンテキスト、外部サービス、
またはクライアントライフサイクルを必要とするプラグインは、適切なプレビューディスクリプターと隔離方法を
用意するまで利用できません。
