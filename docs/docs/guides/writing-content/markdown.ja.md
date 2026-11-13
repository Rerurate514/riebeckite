---
date: 2026-10-08
title: Markdown
sidebar.label: Markdown
sidebar.order: 20
---
# Markdown

## Markdown の基本

本文は通常の Markdown で書きます。

### 見出し

```md
# 大見出し

## 中見出し

### 小見出し
```

`#` の数によって見出しの階層が変わります。

### 段落

普通に文章を書けば段落になります。

```md
最初の段落です。

空行を入れると、次の段落になります。
```

### 箇条書き

```md
- Flutter
- TypeScript
- HonoX
```

番号付きのリストも書けます。

```md
1. 記事を書く
2. ブラウザで確認する
3. 公開する
```

### 強調

```md
**太字**

*斜体*
```

### コード

文章中のコードはバッククォートで囲みます。

```md
`publish: true` を追加します。
```

複数行のコードはコードブロックにできます。

````md
```ts
const message = "Hello";
console.log(message);
```
````

## リンクを書く

外部サイトへのリンクは通常の Markdown リンクを使います。

```md
[Example](https://example.com)
```

サイト内の記事へリンクする場合も Markdown リンクを利用できます。

```md
[プロフィール](/about)
```

## Wikiリンク

Obsidian 形式の [[glossary/wikilink|WikiLink]] に対応した[[glossary/plugin|プラグイン]]を利用している構成では、

```md
[[about]]
```

のようなリンクも利用できます。

表示する文字を変更する場合は、

```md
[[about|プロフィール]]
```

と書けます。

```text
[[about]]
      ↓
対応するコンテンツを解決
      ↓
公開先のURL
```

Riebeckite では、最終的なサイト内リンクを解決済みのコンテンツ情報に基づいて扱います。

そのため、プラグインや多言語設定などによって公開 URL が変わる場合でも、対応する仕組みを使ってリンクを解決できます。

## ファイル名と URL

標準的な構成では、コンテンツの[[logical-path|論理パス]]が[[glossary/public-location|公開先]]を決める基準になります。

たとえば基本的な構成では、

| ファイル | 公開先の例 |
| --- | --- |
| `content/index.md` | `/` |
| `content/about.md` | `/about` |
| `content/posts/first.md` | `/posts/first` |

のようになります。

そのため、ファイル名には、

```text
about.md
getting-started.md
first-post.md
```

のような分かりやすい名前を付けると管理しやすくなります。

英小文字・数字・ハイフンを使った名前にしておくのも扱いやすい方法です。

ただし、Riebeckite では、

```text
ファイルパス
      ↓
コンテンツ
      ↓
Public Location
      ↓
公開URL
```

として公開先が解決されます。

そのため、

**ファイルの物理パスが常にそのまま URL になるわけではありません**。

プラグインや設定によって Public Location が変更されることがあります。

詳しい仕組みは [コンテンツシステム](../../framework/content-system.ja.md) を参照してください。

## 画像を使う

Markdown では次のように画像を書けます。

```md
![画像の説明](/images/photo.jpg)
```

`[]` の中には、画像が表示できない場合でも内容が分かる説明を書いてください。

たとえば、

```md
![Riebeckite のロゴ](/images/riebeckite-logo.png)
```

のようにします。

## 画像ファイルについて

Markdown に画像へのリンクを書いただけでは、画像ファイルが自動的に存在するようにはなりません。

```text
Markdown
   ↓
画像URL
   ↓
公開サイトに画像が存在
   ↓
ブラウザーで表示
```

利用しているサイト構成に合わせて、画像が公開出力に含まれるようにしてください。

Obsidian Vault の添付ファイルを利用する場合は [Obsidian のノートをサイトにするガイド](../obsidian.ja.md) も参照してください。
