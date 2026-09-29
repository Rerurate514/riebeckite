# 記事とサイトのリポジトリ分離

**記事（Markdown / Obsidian Vault）とサイト（コード・設定・テーマ）を別々の場所で管理したい**ときに、どう設定して、どう運用するかを流れに沿って説明します。

## 考え方: 記事は「サイトの外」で OK

`riebeckite.config.ts` の `content.directory` は、サイト（appRoot）**からの相対パス**で外部のフォルダを指せます。記事はサイトの外に置いて構いません。

```ts
// site/riebeckite.config.ts
export default defineConfig({
  content: {
    directory: "../vault", // サイトの 1 つ上の vault フォルダを指す
  },
  // ...
});
```

この相対パスは常にサイトの場所基準で解決されるため、どこからコマンドを実行しても同じ Vault を読みます。詳しい解決規則は [Configuration](./configuration.md) の「Filesystem root と外部 Vault」を参照してください。

## パターンを選ぶ

| パターン | 構成 | 選ぶ基準 |
| --- | --- | --- |
| A. 1 リポジトリ | サイトも記事も同じ Git リポジトリ（`content/` 直使い） | 個人ブログを 1 リポジトリで完結させたい |
| B. 同リポジトリ内で分離 | `site/` と `vault/` を 1 リポジトリに並べる | 履歴は共有で、場所と公開範囲だけ分けたい |
| C. 別リポジトリ（推奨） | 記事 = private・サイト = public の別リポジトリ | 記事を非公開にしたい／更新を分けたい |

記事を公開したくないなら C が基本です。以下は C の手順です。A・B は設定の考え方は同じで、「別リポジトリの扱い（手順 5）」だけが不要になります。

## 手順: 別リポジトリにする場合（パターン C）

### 1. 記事リポジトリ（Vault）を用意する

好きな場所にフォルダを作り、Git リポジトリにします。Obsidian を使うなら、このフォルダを Vault として開きます。

```sh
mkdir notes
cd notes
git init
```

最初のノートを置きます。`publish: true` は「公開する」印なので、非公開にしたいノートには付けません。

```md
---
title: はじめまして
publish: true
---

最初のノートです。
```

GitHub の **private リポジトリ**へ push すれば、記事は公開されません。

```sh
git add .
git commit -m "最初のノート"
# GitHub で private リポジトリを作成してから:
git remote add origin git@github.com:<you>/notes.git
git push -u origin main
```

### 2. サイトを生成する

記事リポジトリの **兄弟の場所** にサイトを生成します。

```sh
npx create-riebeckite my-site
cd my-site
npm install
```

```text
workspace/
├─ notes/     ← 手順 1 の記事（Vault）
└─ my-site/   ← 手順 2 のサイト
```

> パッケージがまだ npm に公開されていない場合は、clone したリポジトリ内で `pnpm exec riebeckite init ../my-site` としてください（[セットアップガイド](./setup.md)）。

### 3. content.directory を Vault に向ける

`my-site/riebeckite.config.ts` の `content` を次のようにします。

```ts
// my-site/riebeckite.config.ts
export default defineConfig({
  // ...
  content: {
    directory: "../notes",
    exclude: [".obsidian/**", "Templates/**", "private/**"],
  },
  // ...
});
```

- `directory: "../notes"` で、サイトの外にある Vault を参照します。
- `exclude` には公開したくないものを置きます。Obsidian の設定（`.obsidian/**`）、テンプレート（`Templates/**`）、非公開ノート用フォルダ（`private/**`）が典型です。

### 4. 読み込みを確認する

```sh
npx riebeckite check
npx riebeckite doctor
npx riebeckite inspect config
npx riebeckite inspect content --list
```

- パスがずれている場合、大半は `directory` の相対パスが原因です。`inspect config` で解決済みディレクトリを確認してください。
- 記事が表示されないときは、explicit 方式なので `publish: true` が付いているかも確認してください。

### 5. デプロイで両方のリポジトリを使う

デフォルトのデプロイ workflow は**サイトのリポジトリしか取得しません**。記事が別リポジトリのままだと、CI のビルド時に Vault が見つからず失敗します。次のどちらかを選んでください。

**方法 1: workflow 内でもう 1 つ checkout する（おすすめ）**

```yaml
- name: Check out the site
  uses: actions/checkout@v4

- name: Check out the notes
  uses: actions/checkout@v4
  with:
    repository: <you>/notes
    path: notes
```

記事の push だけでデプロイに反映されるので、記事の更新が主なら手軽です。layout が手元とずれるので、`directory` を `notes`（手元と CI で同じ並び）にそろえてください。

**方法 2: Git submodule**

```sh
git submodule add git@github.com:<you>/notes.git content
```

workflow の `actions/checkout@v4` に `submodules: recursive` を足します。記事を更新したら、サイト側で submodule の参照 commit を更新して push する必要がある点に注意してください。

## 公開のルール

- **非公開ノートは `publish: true` を付けない**。加えて `content.exclude` で非公開フォルダごと除外します。
- **添付ファイルは自動では配信されない**。Vault 内の `![[attachments/x.png]]` のようなファイルは、URL が描画されるだけで自動コピーされません。公開するものだけをコピーする prebuild 手順をサイト側に追加してください（参照実装: [`apps/web/scripts/build_images.ts`](../../apps/web/scripts/build_images.ts) を `prebuild` から呼ぶ）。

## トラブルシューティング

| 症状 | 対処 |
| --- | --- |
| 記事が表示されない | `publish: true` の有無、`exclude` のパターン、`inspect content --list` で確認 |
| CI のビルドで Vault が見つからない | 追加 checkout か submodule の取得設定を入れる |
| デプロイ後に画像が 404 | prebuild のコピー手順がビルド前に実行され、`public/assets/attachments/` を対象にしているか確認 |

## 関連資料

- [リポジトリ分離の詳細編](./content-and-site-repos-in-depth.md) — このガイドの詳細編（root 解決・CI 認証・assets・トラブル対応）
- [Configuration](./configuration.md) — root の解決規則の詳細
- [利用ガイド](./guide.md) — 外部 Vault の設定例と assets の扱い
- [Cloudflare デプロイテンプレート](../../templates/cloudflare/README_ja.md) — デプロイ workflow の詳細