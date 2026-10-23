---
date: 2026-10-20
title: Component Generator
---
# Component Generator

`riebeckite create component` は、型付きの Hono JSX コンポーネントを生成します。既定のターゲットはサイトです。

```sh
riebeckite create component note-card --with-tests --with-styles
riebeckite create component note-card --target plugin --plugin notes --with-styles
```

サイトターゲットは `app/components/<name>.tsx` を作成します。プラグインターゲットは `extensions/<plugin>/components/<name>.tsx` を作成し、プラグインのルートから既定のコンポーネントと props を再エクスポートします。対話形式のプラグインターゲットでは、エントリーポイントを持つローカルプラグインを一覧から選ぶため、先に `riebeckite create plugin` でプラグインを作成してください。レイアウトへの自動挿入は行わないため、サイトの作者が import して配置します。

任意のスタイルシートは `rr-<name>` 名前空間、公開 `--rb-*` セマンティックトークン、レスポンシブな余白、`:focus-visible` を使います。`--with-styles` を選んだ場合は、サイトにある CSS エントリーからスタイルシートを import してください。ジェネレーターがアプリケーションのレイアウトやグローバル CSS を自動で変更することはありません。

公開 Theme API ではテーマがコンポーネントを所有しないため、`--target theme` は案内を表示して停止します。サイトまたはプラグインのコンポーネントを作成し、テーマのルートから安定した `rr-*` フックをスタイルしてください。これによりテーマの責務境界とライト／ダークのトークンの挙動を維持できます。

props やマークアップを編集した後はサイトを型チェックし、テストを実行してください。プラグインのコンポーネントでは公開パッケージの API だけを import し、コンテンツデータが必要な場合はデータヘルパーを別にエクスポートします。[UI コンポーネントの共有](./recipes/components.ja.md) と [テーマの作成](../themes/writing-a-theme.ja.md) を参照してください。
