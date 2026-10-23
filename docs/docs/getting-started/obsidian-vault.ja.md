---
date: 2026-10-08
title: Obsidian Vault を使う
---
# Obsidian Vault を使う

すでに Obsidian Vault がある場合は、Riebeckite からその Vault をサイトのコンテンツとして読むことができます。まずローカルで 1 つのノートを公開し、リンクと画像を確認してから、`dist/` をビルドします。

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

`starter` プリセットには、WikiLink、埋め込み、Callout、タグを扱う Obsidian Markdown プラグインが最初から入っています。

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

公開したいノートに、次のフロントマターを追加します。

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

公開ノートから未公開のノートへリンクすると、リンク先のページは生成されず、そのリンクも公開サイトで有効なリンクとしては公開されません（壊れたリンクと同じ表示になります）。`@riebeckite/plugin-diagnostics` の `riebeckite-diagnostics` を実行すると、これらの参照が `publish-boundary` 警告として表示されます。

## 4. Riebeckite を起動する

依存関係をインストールし、`check` を実行します。

```sh
npm install
npm exec riebeckite check
```

続いて、ローカルプレビューを起動します。

```sh
npm exec riebeckite dev
```

ターミナルに表示されたローカル URL を開いてください。

開発サーバーを起動したまま Obsidian でノートを保存すると、次にページを表示したときに内容が反映されます。公開設定の変更も同じように反映されます。

## 5. WikiLink と画像を確認する

以下は、新しい `starter` サイトと小さなテスト用 Vault で実際に確認した例です。

WikiLink は次のように書きます。

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

Riebeckite は Vault から画像を解決し、公開ノートから参照されている画像をビルド時に `dist/` へコピーします。この基本的なケースでは、Riebeckite 用に画像を別のフォルダへ移動する必要はありません。

公開ノートの埋め込みも使えます。

```md
![[embedded]]
```

## 6. サイトをビルドする

ローカルでの表示に問題がなければ、静的サイトをビルドします。

```sh
npm exec riebeckite build
```

出力先は `dist/` です。

## Obsidian の機能と対応状況

| Obsidian の機能 | Riebeckite での扱い |
| --- | --- |
| Markdown | 標準の Markdown として対応 |
| WikiLinks | starter の Obsidian Markdown プラグインで対応 |
| WikiLink のエイリアス | `[[note|label]]` に対応 |
| 見出しリンク | `[[note#Heading]]` に対応 |
| 画像 | `![[sample.png]]` のように、公開ノートから参照される画像に対応 |
| ノートの埋め込み | 公開 Markdown ノートの埋め込みに対応 |
| Callout | `> [!NOTE]` に対応 |
| タグ | Obsidian Markdown プラグインでタグ化。タグページは starter の taxonomy プラグインが提供 |
| フロントマター | 対応 |
| Obsidian のエイリアス | `aliases:` を WikiLink の解決に利用 |
| `publish` | 対応。`publish: true` が公開、下書きはビルドされない |
| Canvas | `@riebeckite/plugin-canvas` が必要 |
| Excalidraw | `@riebeckite/plugin-excalidraw` が必要 |
| Bases | `@riebeckite/plugin-bases` が必要 |
| Mermaid | 図として描画するには `@riebeckite/plugin-mermaid-pele` などのレンダラーが必要。導入していない場合はコードブロックとして扱われる |
| `.obsidian/` | Riebeckite には不要。自動的に無視される |

## Vault を別リポジトリで管理する

最短の方法は、ローカルの Vault フォルダを `content.directory` に指定することです。Vault とサイトを別々の GitHub リポジトリで管理したい場合は、コンテンツリポジトリを分離する構成を使います。

GitHub Actions の設定は[コンテンツリポジトリ](../guides/content-repositories.ja.md)を参照してください。

## 次のステップ

- 必要なノートだけに `publish: true` を付ける
- 設定を変更したら `npm exec riebeckite check` を実行する
- 公開前に `npm exec riebeckite build` を実行する
- 機能を追加したくなったら[最初のプラグインを追加する](./first-plugin.ja.md)を読む
