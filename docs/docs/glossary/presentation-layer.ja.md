---
title: Presentation Layer
sidebar:
  hidden: true
---

# Presentation Layer

Presentation LayerはThemeの担当範囲で、色、フォント、余白、レイアウト、記事のスタイルを指します。コンテンツの意味、route、manifest、Pluginの動作、クライアントスクリプトは含みません。

## Themeができること
- Tokenを上書きまたは追加する、スタイルシートの規則を定義する、Theme固有のdata属性を宣言する、Color Mode、Typography、レイアウトのプリセットを提供する、`userCss`で上書きする（カスケードで最後に読み込まれます）

## ThemeとColor Modeの相互作用
Themeは`data-theme`属性とSemantic Tokenを通じてColor Modeと相互作用します。`colorMode`が`"system"`の場合、`data-theme`属性は省略され、`@media (prefers-color-scheme: dark)`クエリでOSの設定が検出されます。Themeは個々のコンポーネントに色をハードコードしないでください：代わりに、各Color Modeで適切に解決する意味的なトークン（例：`--rb-color-ink`）を使用してください。

## Themeができないこと
- コンポーネントを置き換える、JSXへ注入する、routeを追加する、Pluginを追加または削除する、クライアントスクリプトを実行する、DOMの変換、islandの登録、ファイルシステムへのアクセス、ContentManagerへのアクセス

## 関連用語

- [[glossary/theme|Theme]]
- [[glossary/color-mode|Color Mode]]
- [[article-layout|Article Layout]]
- [[user-css|userCss]]

## さらに詳しく

- [Theme System](../framework/theme-system.ja.md)
