# 記事とサイトのリポジトリ分離

**記事（Markdown / Obsidian Vault）とサイト（コード・設定・テーマ）を別々の場所・別々のリポジトリで管理したい**ときに、どう設定して、どう運用するかを順を追って説明します。ここでは「動くようにする」ことを優先し、なぜそうなるのかという仕組みや、CI 認証・assets・submodule の細部は [詳細編](./content-and-site-repos-in-depth.md) に分けています。

## このガイドが向いている人

- ノートを Obsidian で書き、サイトのコードとは別に管理したい
- 記事は private、サイトだけ public にしたい
- 1 つの Vault を複数のサイトから使い回したい
- 記事の更新とサイトの更新を切り離してデプロイしたい

逆に、小さい個人ブログを 1 つのリポジトリで完結させたいだけなら、無理に分ける必要はありません。パターン A（1 リポジトリ）で十分です。

## 考え方: 記事は「サイトの外」で OK

`riebeckite.config.ts` の `content.directory` は、サイト側のルート（appRoot）**からの相対パス**で外部のフォルダを指せます。記事はサイトの中に置く必要はありません。

```ts
// site/riebeckite.config.ts
export default defineConfig({
  content: {
    directory: "../vault", // サイトの 1 つ上の vault フォルダを指す
  },
  // ...
});
```

相対パスの基準は常にサイトのルートです。そのため、サイトの `app/` の中からコマンドを実行しても、CI の作業ディレクトリから実行しても、読む Vault は同じになります。基準の厳密な定義（appRoot / configRoot / contentRoot）は [Configuration](./configuration.md) の「Filesystem root と外部 Vault」を参照してください。

この仕組みを使うと、次のような分け方ができます。

| 分けたいもの | 置き場所の例 |
| --- | --- |
| 記事の本文（`.md`） | Vault 内の任意のフォルダ |
| 添付ファイル・画像 | Vault 内の `attachments/` など |
| サイトのコード・設定 | `site/` |
| 公開したくないノート | Vault 内の `private/` など（`exclude` で除外） |

## パターンを選ぶ

まず、記事とサイトをどの単位で分けるかを決めます。

| パターン | 構成 | 記事の公開範囲 | 向いているケース |
| --- | --- | --- | --- |
| A. 1 リポジトリ | サイトも記事も同じ Git リポジトリ（`content/` を直使い） | リポジトリ全体が同じ公開範囲 | 個人ブログを 1 リポジトリで完結させたい |
| B. 同リポジトリ内で分離 | `site/` と `vault/` を 1 リポジトリに並べる | リポジトリ全体が同じ公開範囲 | 履歴は共有しつつ、場所と公開設定だけ分けたい |
| C. 別リポジトリ | 記事 = private・サイト = public の別リポジトリ | 記事とサイトで別々にできる | 記事を非公開にしたい／更新を分けたい |

選び方の目安は次のとおりです。

- **記事を公開したくない**なら C。private リポジトリなら、`publish: true` を付け忘れても内容そのものが公開されることはありません。
- **記事もサイトも公開してよい**なら A または B。管理するリポジトリが 1 つで済みます。
- **記事の更新をサイトのデプロイと切り離したい**なら C。記事 push でデプロイも起動したい場合は repository dispatch を追加します。追加 checkout だけでは、すでに始まったデプロイにファイルを渡すだけです。
- **1 つの Vault を複数のサイトで使いたい**なら C（または Vault を独立した場所に置く構成）。Vault を 1 か所に保ち、サイト側は読み取り専用で参照します。

以下は C の手順です。A・B は設定の考え方が同じで、**手順 5（デプロイで記事リポジトリを取得する）だけが不要**になります。

## 手順: 別リポジトリにする場合（パターン C）

### 0. 用語をそろえる

- **Vault**: 記事（`.md`）と添付ファイルを入れるフォルダ。Obsidian で開く単位。
- **`publish: true`**: このノートを公開する、という印。explicit 方式では、この印があるノートだけがサイトに出ます。
- **`exclude`**: サイトが読み込まないパターン。記事リポジトリに入っていても、ここに該当すればビルド対象から外れます。

### 1. 記事リポジトリ（Vault）を用意する

好きな場所にフォルダを作り、Git リポジトリにします。Obsidian を使うなら、このフォルダを Vault として開きます。

```sh
mkdir notes
cd notes
git init
```

最初のノートを置きます。非公開にしたいノートには `publish: true` を付けません。

```md
---
title: はじめまして
publish: true
---

最初のノートです。
```

OS が作る一時ファイルや Obsidian のワークスペース状態を追跡したくない場合は、`.gitignore` を用意します。`.obsidian/` 自体を commit しても構いません（サイト側では後述の `exclude` で読み込みから外します）。

```gitignore
.DS_Store
Thumbs.db
.obsidian/workspace.json
.obsidian/workspace-mobile.json
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

共通の GitHub Actions デプロイ用ファイルを含めてサイトを生成します。preset は生成する site だけを変えるため、すべての preset でこの方法を使えます。

```sh
npx create-riebeckite my-site --github-actions \
  --content-repository <you>/notes \
  --site-repository <you>/my-site
cd my-site
npm install
```

生成したデプロイ workflow は Vault を site 内の `content/` に checkout します。`--content-repository` を指定したため、`content-updated` の dispatch receiver と `github/notify-site.yml` も生成されます。`create-riebeckite` は `--preset` で雛形を選べます。最初は既定の `starter` で問題ありません。

```text
workspace/
├─ notes/     ← 手順 1 の記事（Vault）
└─ my-site/   ← 手順 2 のサイト
```

この「兄弟に並べる」配置は手元では便利ですが、CI は site checkout 内の `content/` を使います。

### 3. content.directory を Vault に向ける

`my-site/riebeckite.config.ts` の `content` を次のようにします。

```ts
// my-site/riebeckite.config.ts
export default defineConfig({
  // ...
  content: {
    directory: "content",
    exclude: [".obsidian/**", "Templates/**", "private/**"],
  },
  // ...
});
```

- `directory: "content"` はデプロイ workflow の checkout 先と一致します。
- `exclude` には公開したくないものを置きます。Obsidian の設定（`.obsidian/**`）、テンプレート（`Templates/**`）、非公開ノート用フォルダ（`private/**`）が典型です。

`exclude` は「読み込ませない」対策で、`publish: true` は「公開する」対策です。両方を使って二重に守るのが基本です（→ [公開のルール](#公開のルール)）。

### 4. 読み込みを確認する

設定したら、表示を確かめる前に CLI で読み込みを確認します。

```sh
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite inspect config
npm exec riebeckite inspect content --list
```

- `check` は設定と Plugin の契約を検証します。
- `doctor` は読めない、または不正な content source を報告します。
- `inspect config` の `Directory` に、解決済みの**絶対パス**が出ます。ここが意図した Vault を指しているか確認してください。
- `inspect content --list` に、読み込まれたノートの `PATH` が並びます。想定より多い／少ないときに、`exclude` の効き方をここで確認できます。

パスがずれている場合、大半は `directory` の相対パスが原因です。記事が表示されないときは、explicit 方式なので `publish: true` が付いているかも確認してください。

### 5. checkout・起動・Secret を設定する

生成された deploy workflow は site を checkout した後、指定した記事リポジトリを `content/` に checkout します。site push、手動実行、`content-updated` repository dispatch で動きます。別リポジトリからの起動は、同時に生成される通知 workflow が担います。記事 checkout だけでは、別リポジトリの push を検知しません。

生成された `github/notify-site.yml` を記事リポジトリの `.github/workflows/notify-site.yml` にコピーします。`main` への push が site に `content-updated` を送ります。`SITE_DISPATCH_TOKEN` は記事リポジトリ側だけに登録します。site リポジトリだけに対象を絞った fine-grained PAT には **Contents: read and write** が必要です。classic PAT の `repo` scope、または **Contents: write** の GitHub App installation token も使えます。

```yaml
repository_dispatch:
  types: [content-updated]
```

private または internal の記事リポジトリでは、site リポジトリ側の Secret に `RIEBECKITE_CONTENT_READ_TOKEN` を登録します。対象を記事リポジトリだけに絞り **Contents: read** を与えた fine-grained PAT または GitHub App token を使います。記事リポジトリが public なら checkout 用 Secret は不要です。site の `GITHUB_TOKEN` は別の private/internal リポジトリを読めません。`ref` を固定しない checkout のため、dispatch ごとに記事の既定 branch の最新を読みます。

| デプロイ方法 | 記事 push でデプロイ | 設定 |
| --- | --- | --- |
| 同じリポジトリ | される | `content/` をそのまま使い、site の `push` で workflow を起動する。 |
| 別リポジトリ + dispatch | される | 外部 checkout と、上記の記事通知 workflow を設定する。 |
| 別リポジトリ + schedule | 遅延する | site workflow に `schedule` を追加する。dispatch token は不要。 |
| 手動実行 | されない | Actions タブで `workflow_dispatch` を実行する。 |
| Git submodule | されない | site 側の submodule 参照を更新して push する。 |

**submodule を選ぶ場合**

```sh
git submodule add git@github.com:<you>/notes.git content
```

`content` が記事リポジトリへのリンクになります。workflow の `actions/checkout@v4` に `submodules: recursive` を足すと、CI でも依存リポジトリが取得されます。記事を更新したら、サイト側で submodule の参照 commit を更新して push する必要があります（2 段階の操作）。

どちらの方法も、`riebeckite build` はサイトのディレクトリで実行します。workflow に `npm ci` → `npm exec riebeckite check` → `npm exec riebeckite build` が並んでいるのはそのためです。

### 6. 日常の運用

設定できたら、あとは記事を書いて push するだけです。

**記事を更新する（repository dispatch の場合）**

```sh
cd notes
# Obsidian で編集
git add .
git commit -m "記事を追加"
git push
```

記事 workflow が site workflow を dispatch し、記事の既定 branch の最新を checkout して再ビルド・再デプロイします。dispatch Secret が無い場合は値を出さずに失敗します。権限不足、記事を読めない、build、Cloudflare の失敗も、それぞれの step で確認できます。site 側の変更は別のリポジトリで、通常どおり `my-site` を編集して push します。

**記事を更新する（submodule を選ぶ場合）**

```sh
cd my-site
cd content && git pull && cd ..
git add content
git commit -m "記事を更新"
git push
```

**手元で確認する**

```sh
cd my-site
npm run dev      # ローカルプレビュー
npm run check    # 設定の検証
npm run doctor   # 読み込みの問題を診断
```

## 公開のルール

記事とサイトを分けるときは、公開の境界をどこに引くかを明確にします。

### 公開の判定方式

`content.filters.publishStrategy` で、どのノートを公開するかを決めます。既定は `explicit` です。

| 方式 | 公開される条件 | 向いているケース |
| --- | --- | --- |
| `explicit`（既定・推奨） | `publish: true` の付いたノートだけ | 公開する記事を明示的に選びたい |
| `selective` | `private: true` も `draft: true` も付いていないノート | ほぼ全部を公開し、例外だけ伏せたい |

private の Vault で `explicit` を使うのがもっとも安全です。「公開し忘れ」は起きても、「うっかり公開」は起きにくくなります。

### 守るべきこと

- **非公開ノートには `publish: true` を付けない**。加えて `content.exclude` で非公開フォルダごと除外します。
- **`.obsidian/` は `exclude` に入れる**。Obsidian の設定やワークスペース状態がサイトに混ざるのを防ぎます。
- **テンプレート用フォルダ（`Templates/**` など）も除外**。ノートの雛形を記事として公開しないようにします。
- **添付ファイルは自動では配信されない**。Vault 内の `![[attachments/x.png]]` のようなファイルは、URL が描画されるだけで自動コピーされません。公開するものだけをコピーする prebuild 手順をサイト側に追加してください（参照実装: [`apps/web/scripts/build_images.ts`](../../apps/web/scripts/build_images.ts) を `prebuild` から呼ぶ）。詳しい仕組みは [詳細編](./content-and-site-repos-in-depth.md) の assets の節を参照してください。

## よくある質問

**Q. 記事をサイト内の `content/` に置いたまま、一部のノートだけ非公開にできる？**

できます。`content.directory` を既定の `content` のままにし、非公開ノートから `publish: true` を外し、必要なら `exclude` にフォルダを足します。リポジトリ分離は「Vault を物理的に別に置く」ための手段で、公開・非公開の制御自体は `publishStrategy` と `exclude` が担います。

**Q. Vault を別の場所へ移したら記事が出なくなった。**

`content.directory` は相対パスなので、移動後は基準（サイトのルート）からの位置が変わります。`inspect config` で解決済みの `Directory` を確認し、`../notes` の階層数を合わせ直してください。絶対パスも使えますが、開発端末と CI でずれやすいため、通常は相対パスを推奨します。

**Q. 記事は表示されるのに画像だけ 404 になる。**

添付ファイルは自動コピーされません。prebuild のコピー手順がビルド前に走り、`public/assets/attachments/` を対象にしているかを確認してください。

**Q. CI でだけ「Vault が見つからない」と言われる。**

CI は追加 checkout か submodule を取っていないと Vault を持ちません。手順 5 の設定と、`directory` の相対パスが CI 上の並び（例: `notes`）と合っているかを確認してください。

**Q. Windows でも同じ設定でいい？**

はい。`exclude` のパターンは `/` 区切りで書きます。実際のパス区切りには依存しません。

## トラブルシューティング

| 症状 | 対処 |
| --- | --- |
| 記事が表示されない | `publish: true` の有無、`exclude` のパターン、`inspect content --list` で確認 |
| `Directory` が意図した Vault を指していない | `inspect config` で確認し、`directory` の相対パスを見直す |
| CI のビルドで Vault が見つからない | 追加 checkout か submodule の取得設定を入れる |
| デプロイ後に画像が 404 | prebuild のコピー手順がビルド前に実行され、`public/assets/attachments/` を対象にしているか確認 |
| 手元では読めるのに CI ではパスが違う | CI の作業ディレクトリと、`directory` の基準（サイトのルート）を確認。`../notes` と `notes` の違いでずれやすい |
| submodule の記事が更新されない | サイト側で `content` の参照 commit を更新して push する |

より踏み込んだ原因調査は [詳細編](./content-and-site-repos-in-depth.md) のトラブルシューティングを参照してください。

## 関連資料

- [リポジトリ分離の詳細編](./content-and-site-repos-in-depth.md) — このガイドの詳細編（root 解決・CI 認証・assets・トラブル対応）
- [Configuration](./configuration.md) — root の解決規則の詳細
- [利用ガイド](./guide.md) — 外部 Vault の設定例と assets の扱い
- [Cloudflare デプロイテンプレート](../../templates/cloudflare/README_ja.md) — デプロイ workflow の詳細
