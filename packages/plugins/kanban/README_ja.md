# @riebeckite/plugin-kanban

Obsidian の Kanban ボードを、ビルド時に静的 HTML へ変換するプラグインです。クライアント側の JavaScript は不要です。

[English](./README.md)

## 使い方

`kanban()` をプラグインに追加します。

```ts
import { defineConfig } from "@riebeckite/core";
import { kanban } from "@riebeckite/plugin-kanban";

export default defineConfig({
  // ...
  plugins: [kanban()],
});
```

## ボードの書き方

入力は次の 2 通りです。

- ` ```kanban ` のフェンスコードブロックの本文
- frontmatter に `kanban-plugin` を持つノートの本文（`autoDetect`、既定で有効）

どちらも本文の書き方は同じです。`## `（`columnMarker` で変更可）で始まる行が列を区切り、その後に続くリスト項目がカードになります。カードは `- [ ]`（未完了）、`- [x]`（完了）、`- テキスト`（チェックボックスなし）をそのまま扱います。

````md
## Backlog

- [ ] リリースノートの下書き
- [ ] [[index]] へのリンクを張る
- [x] **メタデータ**を確認する

## Done

- [x] フィクスチャを公開する
````

ノート全体をボードにする場合は、本文に同じ内容を書き、frontmatter に `kanban-plugin` を追加します。

```md
---
title: Roadmap
kanban-plugin: board
---

## Planned

- [ ] プラグインを公開する
```

カードのテキストでは `[[ウィキリンク]]`（マニフェストから実際の href に解決）、`#タグ`、`**太字**` を使えます。

## 出力

```html
<div class="rb-kanban" data-kanban data-kanban-plugin data-kanban-source="note">
  <div class="rb-kanban__board" data-kanban-board>
    <div class="rb-kanban__column" data-column="Backlog">
      <header class="rb-kanban__column-title">Backlog</header>
      <ul class="rb-kanban__cards">
        <li class="rb-kanban__card" data-checked="false">
          <span class="rb-kanban__checkbox" data-checked="false" aria-hidden="true"></span>
          <span class="rb-kanban__card-text">リリースノートの下書き</span>
        </li>
      </ul>
    </div>
  </div>
</div>
```

`data-kanban-source` は、フェンスブロックなら `"block"`、自動検出したノートなら `"note"` です。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `className` | `string` | `"rb-kanban"` | ルートの CSS クラス。各要素のクラス名はこれを基に組み立てる |
| `language` | `string` | `"kanban"` | 対象のフェンス言語 |
| `columnMarker` | `string` | `"##"` | 列の始まりを示す接頭辞 |
| `autoDetect` | `boolean` | `true` | `kanban-plugin` を持つノートをボードとして描画する |
| `fallback` | `boolean` | `true` | 解釈できなかった行を `<details>` に残す |

## フォールバックと診断

列でもリスト項目でもない行は、`fallback` を切らない限り `details.rb-kanban__fallback` にそのまま残ります。取りこぼしはありません。

列が 1 つもないなど解析に問題がある場合は、`@riebeckite/plugin-kanban` を発行元とするメッセージを文書に付与します。

## エクスポート

- `kanban(options?)` — プラグインファクトリ
- `kanbanPlugin` — `kanban` の別名
- `resolveKanbanOptions(options?)` — 既定値を適用する
- `remarkKanban(options?)` — プラグインが使う Remark 変換
- `parseKanban(source, options)` と `renderKanban(result, options, resolveLink, source)`
- `stripFrontmatter(markdown)` と `isKanbanNote(frontmatter)`
- `createKanbanLinkResolver(manifest)` と `createKanbanPlaceholder(source)`
- 型: `KanbanOptions`、`ResolvedKanbanOptions`、`KanbanCard`、`KanbanColumn`、`KanbanParseResult`、`KanbanLinkResolver`、`RemarkKanbanOptions`

## 関連資料

- [プラグインガイド](../../../docs/docs/reference/plugin-api.ja.md)

