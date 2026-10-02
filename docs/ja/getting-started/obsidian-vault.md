# Obsidian Vault を使う

すでに Obsidian Vault を持っている場合、Riebeckite はその Vault をサイトのコンテンツとして読むことができます。まずはローカルで 1 つのノートを公開し、リンクと画像を確認してから `dist/` をビルドします。

## 始める前に

必要なものは次の3つです。

- Node.js
- 既存の Obsidian Vault
- 公開してよいノート 1 つ

Riebeckite は Obsidian のワークスペース設定を必要としません。`.obsidian/` は自動的に無視されるため、Vault から削除する必要はありません。

## 1. Riebeckite サイトを作る

Vault の隣にサイトを作ります。

```sh
npx create-riebeckite my-site --preset starter
cd my-site
```

`starter` preset には、WikiLink、埋め込み、Callout、タグを扱う Obsidian Markdown plugin が最初から入っています。

## 2. Vault を接続する

`riebeckite.config.ts` を開き、`content.directory` を Vault に向けます。

```ts
content: {
  directory: "../my-vault",
},
```

`../my-vault` は、`my-site` から見た Vault への相対パスに置き換えてください。

## 3. 公開するノートを選ぶ

Riebeckite は、既定では明示的に指定したノートだけを公開します。

公開したいノートに、次の frontmatter を追加します。

```yaml
---
title: Hello
publish: true
tags:
  - example
aliases:
  - Hello note
---
```

意味は次のとおりです。

- `publish: true` のノートは公開ページとして生成されます。
- `publish: false` のノートはビルド結果に含まれません。
- `publish` がないノートは、既定の `starter` 構成では下書きとして扱われます。

公開ノートから下書きノートへリンクすると、下書きページ自体は生成されません。ただし公開前に、公開ページ内に出したくないリンクが残っていないか確認してください。

## 4. Riebeckite を起動する

依存関係を入れ、check を実行します。

```sh
npm install
npm exec riebeckite check
```

続いてローカルプレビューを起動します。

```sh
npm exec riebeckite dev
```

ターミナルに表示されたローカル URL を開いてください。

## 5. WikiLink と画像を確認する

以下は、Fresh `starter` サイトと小さなテスト Vault で実際に確認した例です。

WikiLink:

```md
[[hello]]
[[hello|custom hello label]]
[[hello#Details|hello details]]
[[Hello note]]
```

Vault 内の画像は、Obsidian の埋め込み構文で参照できます。

```md
![[sample.png]]
```

Riebeckite は Vault から画像を解決し、公開ノートから参照されている画像を build 時に `dist/` へコピーします。この基本ケースでは、Riebeckite 用に画像を別フォルダへ移動する必要はありません。

公開ノートの埋め込みも使えます。

```md
![[embedded]]
```

## 6. サイトをビルドする

ローカル表示に問題がなければ、静的サイトをビルドします。

```sh
npm exec riebeckite build
```

出力先は `dist/` です。

## Obsidian の何が使えるか

| Obsidian の機能 | Riebeckite での扱い |
| --- | --- |
| Markdown | 標準の Markdown として対応 |
| WikiLinks | starter の Obsidian Markdown plugin で対応 |
| WikiLink aliases | `[[note|label]]` に対応 |
| Heading links | `[[note#Heading]]` に対応 |
| Images | `![[sample.png]]` のような公開ノートから参照される画像に対応 |
| Note embeds | 公開 Markdown ノートの埋め込みに対応 |
| Callouts | `> [!NOTE]` に対応 |
| Tags | Obsidian Markdown plugin でタグ化。tag ページは starter の taxonomy plugin が提供 |
| Frontmatter | 対応 |
| Obsidian aliases | `aliases:` を WikiLink 解決に利用 |
| `publish` | 対応。`publish: true` が公開、下書きはビルドされない |
| Canvas | `@riebeckite/plugin-canvas` が必要 |
| Excalidraw | `@riebeckite/plugin-excalidraw` が必要 |
| Bases | `@riebeckite/plugin-bases` が必要 |
| Mermaid | 図として描画するには `@riebeckite/plugin-mermaid` が必要。未導入ならコードブロックとして扱われる |
| `.obsidian/` | Riebeckite には不要。自動的に無視される |

## Vault を別リポジトリで管理する

最短ルートは、ローカルの Vault フォルダを `content.directory` に指定する方法です。Vault とサイトを別々の GitHub リポジトリで管理したい場合は、Separate content repository の構成を使います。

GitHub Actions の設定は [Content Repositories](../guides/content-repositories.md) を参照してください。

## 次のステップ

- 必要なノートだけに `publish: true` を付ける
- config を変更したら `npm exec riebeckite check` を実行する
- 公開前に `npm exec riebeckite build` を実行する
- 機能を追加したくなったら [最初の Plugin を追加する](./first-plugin.md) を読む
