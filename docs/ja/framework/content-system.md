# Content System

Content System は、Markdown やアセットを「サイトで扱えるコンテンツ」に変換するための中核です。ファイルを読むだけでなく、論理パス、メタデータ、公開先、コンテンツグラフ、Plugin による処理結果をそろえて、ページ生成と runtime から同じ情報を参照できるようにします。

全体像は次の流れです。

```text
Markdown / assets
       ↓
ContentSource
       ↓
ContentManager
       ├─ Manifest
       ├─ コンテンツグラフ
       └─ 公開先
       ↓
Plugin による処理
       ↓
ページ生成
```

`ContentSource` は API 名です。人間向けに言えば「コンテンツの読み込み元」です。`ContentManager` は読み込んだコンテンツを管理し、Plugin や HonoX 側が使う index を作ります。

## ContentSource

`ContentSource` は、Markdown とアセットをどこから読むかを抽象化します。典型的には `content.directory` が指すディレクトリです。外部 Vault や別リポジトリの content でも、最終的には同じ `ContentSource` として扱われます。

重要なのは、ファイルシステム上のパスと、Riebeckite 内部の論理パスを分けることです。

- ファイルシステム上のパス: 実際のファイルの場所
- 論理パス: content root から見たコンテンツの識別子
- 公開先: サイト上でアクセスされる URL

この分離により、content repository を別にしても、サイト側の処理は同じ規則で動きます。

## ContentManager

`ContentManager` は `ContentSource` から読み込んだエントリを管理します。主な役割は次の通りです。

- Markdown の frontmatter と本文を読み込む
- `publish: true` などの公開判定を適用する
- slug、permalink、content ID を整理する
- Plugin hook にコンテンツを渡す
- Manifest とコンテンツグラフを作る
- runtime で使う問い合わせ API のための index を用意する

Plugin は `onContentLoaded`、`onPostParsed`、`onPostProcessed`、`onManifestCreated` などの hook で、この処理に参加します。

## slug、permalink、content ID

似た名前ですが、役割は違います。

| 名前 | 役割 |
| --- | --- |
| slug | URL の基本になる短い名前 |
| permalink | 明示的に指定された公開 URL |
| content ID | コンテンツを安定して識別する ID |

`resolveDefaultContentLocation` は、`index` を `/` に、それ以外を `/{slug}` に対応させます。Plugin は `resolveContentLocations` で `ContentPublicLocation` を追加または変更できます。

## 公開先と ContentPublicLocation

`ContentPublicLocation` は、1つのコンテンツがサイト上のどこで公開されるかを表します。通常は1記事につき1つですが、Plugin によって別名 URL や redirect 用の場所が追加されることがあります。

公開先は、ページ生成だけでなく、リンク解決、sitemap、検索 index、言語切り替えにも影響します。そのため、単なる文字列ではなく、明示的な構造として扱います。

## Manifest

Manifest は、ビルド時に確定したコンテンツ一覧です。各エントリには、論理パス、メタデータ、公開先、処理結果、差分判定に使う情報が含まれます。

Manifest は次の目的で使われます。

- HonoX 側でページを生成する
- runtime で記事一覧や関連情報を読む
- incremental build で再利用できる状態を判断する
- `inspect content` で現在の解決結果を確認する

## コンテンツグラフ

コンテンツグラフは、ページ同士の関係を表します。WikiLink、Markdown link、backlinks、taxonomy、series、related posts などは、この関係を利用します。

Plugin は `extendContentGraph` でグラフに情報を追加できます。グラフは単なる表示機能ではなく、検索、関連表示、ローカルグラフ、garden explorer の基盤です。

## Content queries

runtime や Plugin は、生成済みの index に対して問い合わせできます。

- `queryContentEntries`
- `queryContentPage`
- `groupContentEntries`

これらはファイルを直接読み直すための API ではありません。ビルド時に解決されたコンテンツ状態を、安全に参照するための API です。

## Content collections

`buildContentCollections` は、記事一覧やタグ別一覧のような collection を作ります。`pageSize` を指定すると pagination も扱えます。

collection は、公開済みエントリを並べ替え、グループ化し、ページ単位に分けるための仕組みです。Plugin やアプリ側は、これを使って一覧ページを作れます。

## アセット

画像や添付ファイルは、Markdown 本文とは別に扱われます。Riebeckite は content root からの論理パスを保ちながら、公開先のアセット URL へ写像します。添付ファイルの URL 形は Plugin や設定に依存しますが、content root の外側にある非公開ファイルを不用意に公開しないことが重要です。

## 正しさのルール

Content System で守るべき境界は次の通りです。

- `content.directory` はサイトの app root を基準に解決する
- Plugin はファイルシステムの場所ではなく、論理パスと公開先を前提に扱う
- 公開判定は `publishStrategy` と frontmatter に従う
- Plugin が公開先を追加する場合は `ContentPublicLocation` として明示する
- runtime はビルド済みの index を読む。任意のファイルを直接読む前提にしない
- content repository を別にしても、site repository の build が最終的な公開状態を決める

## 関連ページ

- [Configuration](../reference/configuration.md)
- [Plugin API](../reference/plugin-api.md)
- [Content Repositories](../guides/content-repositories.md)
- [Separate Content Repository](../guides/deployment/separate-content-repository.md)



