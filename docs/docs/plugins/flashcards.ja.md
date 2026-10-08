# Flashcards

`flashcards` コードブロックを学習用のカードデッキに変えるプラグインです。質問を表示して答えをめくり、前後の移動とシャッフルができます。ビルド時には静的なリストを先に出力するため、JavaScript がなくても内容を読めます。

[English](./flashcards.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { flashcardsPlugin } from "@riebeckite/plugin-flashcards";

export default defineConfig({
  // ...
  plugins: [flashcardsPlugin()],
});
```

このプラグインは `style.css` とクライアントエントリを追加します。script タグの出力はサイトのレイアウト側が行い、プラグインは宣言だけを担います。

## ブロックの書き方

ブロックには 1 枚以上のカードを書きます。カードは `質問 :: 答え` の組です。カード同士は空行または `---` の行で区切り、答えは複数行にまたがってもかまいません。

````md
```flashcards
Which language is this plugin written in? :: TypeScript

What does the client render? :: An interactive deck
---
Describe the fallback. :: A static ordered list.
It stays readable without JavaScript.
```
````

カードが 1 枚もない、`::` のないカードがある、どちらかの側が空である、といった場合は `invalid-flashcards` の診断を出し、コードブロックのまま残します。

## 出力

ビルド時に、ブロックは次の要素に置き換わります。

```html
<div class="rb-flashcards" data-flashcards data-flashcards-count="2">
  <script type="application/json" data-flashcards-payload>
    {"cards":[{"front":"...","back":"..."}]}
  </script>
  <ol class="rb-flashcards__list" data-flashcards-fallback>
    <li class="rb-flashcards__item">
      <span class="rb-flashcards__front">...</span>
      <span class="rb-flashcards__back">...</span>
    </li>
  </ol>
</div>
```

payload は実行されない JSON で、`<` `>` `&` はエスケープ済みです。カードの文言にこれらの文字が含まれていても script 要素を閉じることはできません。順序付きリストは JavaScript がない場合の代替表示です。

## クライアントの動作

`initFlashcards()` は各 `[data-flashcards]` 要素の payload を読み、代替リストの上に操作できるデッキを組み立てます。対応している操作は次のとおりです。

- 答えの表示・非表示
- 前後のカードへの移動（端で折り返す）
- シャッフル
- カード位置の表示
- キーボード操作: `Space` で答えを表示、`ArrowLeft` / `ArrowRight` で移動

成功するとルートに `data-flashcards="ready"` が付き、静的なリストは非表示になります。payload がない、または壊れている場合は代替表示をそのまま残します。ビルドからクライアントへオプションは渡しません。シャッフルの初期状態は `data-flashcards-shuffle` 属性で伝えます。

## オプション

| 項目 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `className` | `string` | `"rb-flashcards"` | デッキのルート CSS クラス |
| `language` | `string` | `"flashcards"` | 対象にするフェンス言語 |
| `shuffle` | `boolean` | `false` | 最初からシャッフルした順で表示する |
| `fallback` | `boolean` | `true` | 静的な順序付きリストを出力する |

## 主なエクスポート

- `flashcards(options?)` / `flashcardsPlugin(options?)`: プラグインを作成する
- `initFlashcards(root?)`: クライアント側を初期化する
- `parseFlashcards(source)`: ブロックをカードに分解する
- `splitFlashcardGroups(source)`: ブロックをカードのまとまりに分割する
- `remarkFlashcards(options?)`: remark 変換を単体で使う
- `renderFlashcards(cards, options)` / `renderFlashcardsPayload(cards)` /
  `renderFlashcardsFallback(cards, className?)`: ビルド時の描画ヘルパー
- `resolveFlashcardsOptions(options?)`、`createFlashcardsRuntime(options?)`
- 型: `FlashcardsOptions`、`FlashcardsCard`、`FlashcardsPayload`、`ResolvedFlashcardsOptions`

## 関連資料

- [プラグインシステム](../reference/plugin-api.ja.md)
