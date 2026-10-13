---
title: プレゼンテーション層
sidebar:
  hidden: true
---

# プレゼンテーション層

プレゼンテーション層はテーマの責任範囲 — 色、フォント、間隔、レイアウト、記事のスタイルです。コンテンツの意味論、ルート、マニフェスト、プラグインの動作、クライアントスクリプトは含まれません。

## テーマができること

トークンの上書きまたは追加
スタイルシート規則の定義
theme-specific data 属性の宣言
色調モード / タイポグラフィ / レイアウトプリセットの提供
`userCss` による上書き (カスケードで最後に読み込まれる)

## テーマができないこと

コンポーネントの置き換え
JSX への注入
ルートの追加
プラグインの追加または削除
クライアントスクリプトの実行
DOM 変換、アイランド登録、ファイルシステムアクセス、ContentManager アクセス

## 関連用語

- [[glossary/theme|Theme]]
- [[glossary/color-mode|色調モード]]
- [[article-layout|記事レイアウト]]
- [[user-css|userCss]]

## さらに詳しく

- [Theme System](../framework/theme-system.ja.md)
