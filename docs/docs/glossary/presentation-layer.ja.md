---
date: 2026-10-14
title: 表示層（Presentation Layer）
sidebar:
  hidden: true
---

# 表示層（Presentation Layer）

表示層はテーマの責務で、色、フォント、余白、レイアウト、記事のスタイルを指します。コンテンツの意味、ルート、マニフェスト、プラグインの動作、クライアントスクリプトは含みません。

## テーマができること
- トークンを上書きまたは追加する
- スタイルシートの規則を定義する
- テーマ固有のデータ属性を宣言する
- カラーモード、タイポグラフィ、レイアウトのプリセットを提供する
- `stylesheets` で上書きする（カスケードで最後に読み込まれます）

## テーマとカラーモードの相互作用
テーマは `data-rb-mode` 属性とセマンティックトークンを通じてカラーモードと相互作用します。`colorMode` が `"system"` のときは `data-rb-mode` 属性が省略され、`@media (prefers-color-scheme: dark)` クエリでOSの設定を検出します。テーマは個々のコンポーネントに色をハードコードせず、各カラーモードで適切に解決されるセマンティックトークン（例：`--rb-color-ink`）を使ってください。

## テーマができないこと
コンポーネントの置き換え、JSXの注入、ルートの追加、プラグインの追加・削除、クライアントスクリプトの実行、DOMの変換、アイランドの登録、ファイルシステムへのアクセス、`ContentManager` へのアクセス。

## 関連用語

- [[glossary/theme|Theme]]
- [[glossary/color-mode|Color Mode]]
- [[article-layout|Article Layout]]
- [[user-css|stylesheets]]

## さらに詳しく

- [Theme System](../framework/theme-system.ja.md)
