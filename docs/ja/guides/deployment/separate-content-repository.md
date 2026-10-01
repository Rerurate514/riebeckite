# 記事とサイトのリポジトリ分離（詳細編）

[記事とサイトのリポジトリ分離](../content-repositories.md) は、別リポジトリ運用を「流れ」に沿って説明したドキュメントです。このページはその「詳細編」で、「どうしてこの設定になるのか」と「踏み込みたいケース（root の解決、assets のコピー、CI の認証、submodule の運用）」を補足します。

はじめての人はまず [Content Repositories](../content-repositories.md) を読み、このページは「仕組みを理解したい」「運用で困った」ときに使ってください。

## 1. なぜ「サイトの外」で動くのか

`riebeckite.config.ts` の `content.directory` の解決基準は次のとおりです。

| 名前 | 役割 | 既定値・解決基準 |
| --- | --- | --- |
| `appRoot` | HonoX/Vite application。`app/`、`public/`、route、生成 style、build output を所有 | Vite の `root` |
| `configRoot` | `riebeckite.config.ts` がある directory | `appRoot` |
| `contentRoot` | 設定された content directory または Obsidian Vault の絶対 filesystem root | `path.resolve(appRoot, content.directory)` |

重要なのは、相対 `content.directory` の基準は**常に `appRoot`** であり、`configRoot` や working directory を変えても変わらない点です。integration は content や Plugin を実行する前に三つの root を解決し、CLI も同じ結果を使います。そのため、ネストした directory、CI の working directory、エディタの task から実行しても、読む Vault は変わりません。

```ts
// site/riebeckite.config.ts
export default defineConfig({
  content: {
    directory: "../vault", // appRoot からの相対
  },
});
```

`process.cwd()` から値を組み立てたり、`appRoot` を Vault に向けたりしないでください。Vault は source data であり、Vite の application root は site のままにします。

### 1-1. root がどう決まるか

解決の順序を追うと、つまずきどころが見えます。

1. **CLI** は実行した working directory から親へ順に `riebeckite.config.ts` / `.js` / `.mjs` を探します。最初に見つかったファイルの directory が `configRoot` になります。見つからなければ `Could not find riebeckite.config.*` で失敗します。
2. **appRoot** は、`configRoot` の下から `vite.config.ts` / `.js` / `.mjs` を探索して決まります（`node_modules`、`.git`、`tests` は除外）。見つからなければエラー、複数見つかってもエラーです。
3. **contentRoot** は `path.resolve(appRoot, content.directory)` で解決されます。絶対パスの `directory` を書いた場合も、ここで同じ値になります。

`riebeckite.config.ts` を Vite application の外に意図的に置く場合は、`riebeckiteVite()` の `configRoot` と `appRoot` を明示します。どちらを渡しても、相対 `content.directory` の基準は `appRoot` のままです。

つまり「どこから実行しても同じ Vault を読む」は、**config が site の内側（またはその祖先）にあって、appRoot が一意に決まる**かぎりで成り立ちます。無関係な directory から実行すると config 自体が見つからず、`vite.config.*` が複数ある monorepo では `Found multiple Vite applications` になります。どちらも「どの site の設定か」を絞れていないことが原因です。

### 1-2. Application 側でコンテンツを読む場合

route や island のために Application が `ContentManager` を作る場合は、生の相対設定値ではなく、同じ絶対パスを使う必要があります。

```ts
// site/app/config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfigModule } from "@riebeckite/core";
import * as rawConfigModule from "../riebeckite.config";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const rawConfig = resolveConfigModule(rawConfigModule);

export const config = {
  ...rawConfig,
  content: {
    ...rawConfig.content,
    directory: path.resolve(appRoot, rawConfig.content.directory),
  },
};
```

この後の `ContentManager` には `config.content.directory` を渡します。この値はすでに絶対パスなので、別の基準で二度目の `resolve` をすると誤りやすくなります。

### 1-3. やってはいけないこと

- `process.cwd()` を基準に `content.directory` を組み立てる。実行場所で結果が変わります。
- `appRoot`（Vite の root）を Vault に向ける。site の `app/`・`public/`・build output の場所が変わってしまいます。
- 相対 `directory` を `configRoot` 基準だと思い込む。基準は常に `appRoot` です。

## 2. 3 つのパターン

| パターン | 構成 | 選ぶ基準 | デプロイの考慮 |
| --- | --- | --- | --- |
| A. 1 リポジトリ | サイトも記事も同じ Git リポジトリ（`content/` 直使い） | 個人ブログを 1 リポジトリで完結 | 追加設定なし |
| B. 同リポジトリ内で分離 | `site/` と `vault/` を 1 リポジトリに並べる | 履歴は共有、場所と公開範囲だけ分けたい | `content.directory: "../vault"` を site 側で設定 |
| C. 別リポジトリ（推奨） | 記事 = private・サイト = public | 記事を非公開にしたい／更新を分けたい | CI で記事リポジトリの取得設定が必要 |

### 2-1. パターン A の配置

```text
blog/
├─ riebeckite.config.ts     ← appRoot（directory: "content"）
├─ app/
├─ public/
└─ content/                 ← 記事をここに置く
   └─ index.md
```

もっとも単純で、`create-riebeckite` の初期状態そのものです。記事の公開範囲はリポジトリと同じになります。

### 2-2. パターン B の配置

```text
notes-repo/
├─ site/                ← ここが appRoot（riebeckite.config.ts がある）
│  └─ riebeckite.config.ts
└─ vault/               ← directory: "../vault" で参照
```

1 つのリポジトリ・1 つの履歴のまま、場所だけを分けます。公開範囲は A と同じくリポジトリ単位です。`content.directory` を `../vault` にする点だけが A との違いです。

### 2-3. 1 つの Vault を複数サイトで共有する

C の発展形として、Vault を独立した場所に置き、複数の site から参照する構成が取れます。

```text
workspace/
├─ notes/           ← 共有 Vault（独立した private リポジトリ）
├─ blog/            ← site 1（directory: "../notes"）
└─ docs/            ← site 2（directory: "../notes"）
```

Vault は読み取り専用の source として扱い、site ごとに `exclude`・`publishStrategy`・Plugin を変えます。どの site も Vault を書き換えないので、同じノートを別の見せ方で公開できます。デプロイは site ごとに独立させ、CI には 3-2 の追加 checkout をそれぞれ設定します。

### 2-4. 選び方の判断フロー

1. 記事を非公開にしたい、または更新を分けたい → **C**。
2. 記事もサイトも同じ公開範囲でよい → 次へ。
3. 場所と設定だけ分けたい → **B**。1 リポジトリで完結させたい → **A**。
4. 1 つの Vault を複数サイトで使う → **C + 共有 Vault**（2-3）。

## 3. パターン C の詳細手順

基本の流れは [Content Repositories](../content-repositories.md) にあります。ここでは省略されがちな詳細を補足します。

### 3-1. Vault を private リポジトリに

- `git init` 後、最初の push 前に GitHub で **private** リポジトリを作成します。
- `.obsidian/` は Vault を Obsidian で開くと自動生成される設定フォルダです。`content.exclude` に `.obsidian/**` を入れておけば、たとえ push していても site 側の読み込みから除外できます。追跡したくない場合は `.gitignore` で `.obsidian/workspace*.json` だけを外す、という折衷も取れます。
- 非公開ノートは `publish: true` を付けないことが基本です。加えて、非公開用のフォルダ（例: `private/**`）を `content.exclude` に入れて、**そもそも読み込ませない**二重の対策にします。
- `publishStrategy` は既定の `explicit` のままで構いません。`selective` は「ほぼ全部公開・例外だけ伏せる」発想なので、private Vault には `explicit` のほうが事故に強いです。

### 3-2. content の取得とデプロイ起動は別の設定

デフォルトのデプロイ workflow（`templates/cloudflare/.github/workflows/deploy.yml`）は **サイトのリポジトリしか取得しません**。

**方法 1: 追加 checkout と repository dispatch（自動デプロイにおすすめ）**

```yaml
- name: Check out the site
  uses: actions/checkout@v4

- name: Check out the notes
  uses: actions/checkout@v4
  with:
    repository: <you>/notes
    token: ${{ secrets.RIEBECKITE_CONTENT_READ_TOKEN || github.token }}
    path: content
```

- `path: content` にし、`content.directory` を `"content"` にします。
- この checkout は site workflow が始まった後にファイルを読めるようにするだけです。記事 `main` の push で起動するには、site workflow に `repository_dispatch: types: [content-updated]` を追加し、記事リポジトリには通知 workflow を置きます。
- 記事更新で既定 branch の最新を出すなら `ref` は固定しません。checkout はその時点の先頭を読み、既定の `fetch-depth: 1` で十分です。

**方法 2: Git submodule**

```sh
cd my-site
git submodule add git@github.com:<you>/notes.git content
```

- `content` は記事リポジトリへのリンクになります。`riebeckite.config.ts` の `directory` は `content` に合わせます。
- workflow の `actions/checkout@v4` に `submodules: recursive` を足すと、CI で依存リポジトリも取得されます。
- ただし、submodule の参照先 commit は**サイト側のリポジトリに記録される**ため、記事を更新しても site 側の `content` の参照を進めて commit・push しないと変わりません。記事更新のたびに 2 段階の操作が必要になります。

```sh
cd content && git pull
cd ..
git add content
git commit -m "記事を更新"
```

リモートの最新に追従するだけなら `git submodule update --remote` も使えますが、結局 site 側の commit は必要です。

**方法の比較**

| 観点 | 方法 1（追加 checkout） | 方法 2（submodule） |
| --- | --- | --- |
| 記事 push で自動デプロイ | repository dispatch を設定すればされる | されない（参照更新が必要） |
| 局所性 | `path: content` と `directory: "content"` | `directory: "content"` で固定 |
| 履歴の固定 | branch 先頭に追従 | commit 単位で固定できる |
| 手元の操作 | 通常の clone で済むことが多い | `submodule update` が要る |
| 向いている運用 | 記事の更新が主 | 記事の版を site 側で固定したい |

記事の更新が主なら方法 1 が、履歴を site 側に固定したいなら方法 2 が向いています。

### 3-3. CI で private リポジトリを取得するときの認証

- `github.token` は現在のリポジトリに限定されます。別の **public** GitHub リポジトリは読めますが、別の private/internal リポジトリは読めません。
- private/internal Vault では、site リポジトリ側に `RIEBECKITE_CONTENT_READ_TOKEN` を登録します。Vault だけを対象に **Contents: read** を与えた fine-grained PAT、または同等の read-only GitHub App installation token を使います。
- 記事からの通知には、記事リポジトリ側だけに `SITE_DISPATCH_TOKEN` を登録します。site リポジトリだけを対象に **Contents: read and write** を与えた fine-grained PAT を使います。classic PAT は `repo` scope、GitHub App token は **Contents: write** が必要です。
- submodule を SSH URL（`git@github.com:...`）で追加した場合、CI では SSH key が必要になります。HTTPS URL にして `token:` を渡すほうが設定は単純です。

```yaml
- name: Check out the notes
  uses: actions/checkout@v4
  with:
    repository: <you>/notes
    token: ${{ secrets.NOTES_READ_TOKEN }}
    path: notes
```

### 3-4. 手元と CI のレイアウトをそろえる

相対 `directory` は appRoot 基準なので、手元と CI で並びが違うと結果がずれます。

| 環境 | 並び | `directory` |
| --- | --- | --- |
| 手元（兄弟） | `workspace/notes` と `workspace/my-site` | `"../notes"` |
| CI（追加 checkout） | `my-site/notes` | `"notes"` |
| submodule | `my-site/content` | `"content"` |

手元では `../notes`、CI では `notes` のように変えると、どちらも同じ Vault を指します。片方に寄せたいなら、手元でも `my-site` の下に Vault を置くか、CI 側で `path: ../notes` 相当の並びを作ります。

## 4. 公開のルールと assets

### 4-1. 公開の判定

`content.filters.publishStrategy` は 2 つの値を取ります。

| 値 | 公開される条件 | 実装上の意味 |
| --- | --- | --- |
| `explicit`（既定） | frontmatter の `publish` が `true` | 明示的に opt-in したノートだけ |
| `selective` | `private` も `draft` も `true` でない | opt-out したノート以外は公開 |

判定は `isPublished` / `isPublishable` に集約され、ノートの表示、diagnostics、prebuild の asset 収集が同じ規則を使います。「プレビューでは見えたのに本番では出ない」といった食い違いを避けるため、公開判定を site 側で独自実装しないでください。

### 4-2. `exclude` の書き方

`exclude` は contentRoot からの相対パス（`/` 区切りに正規化済み）に対して glob でマッチします。パターンは**パス全体にアンカー**される点に注意してください。

| パターン | マッチする | マッチしない |
| --- | --- | --- |
| `.obsidian/**` | `.obsidian/app.json` | `notes/.obsidian/app.json` |
| `**/.obsidian/**` | 上の両方 | — |
| `Templates/**` | `Templates/daily.md` | `notes/Templates/daily.md` |
| `**/Templates/**` | 上の両方 | — |
| `private/**` | `private/secret.md` | `notes/private/secret.md` |

`*` は 1 セグメント内、`**` は複数セグメントをまたぎます。サブフォルダにも同じ名前のフォルダを作りうるなら、`**/` を付けたほうが確実です。既定の scaffold が `**/templates/**`・`**/private/**` としているのはこのためです。

`exclude` は読み込み前のフィルタなので、除外したノートはリンク解決やグラフにも現れません。非公開にしたいノートは「`publish: true` を付けない」に加えて、可能ならフォルダごと `exclude` に入れてください。

### 4-3. 添付ファイルは自動コピーされない

`![[attachments/x.png]]` のようなファイルは、URL が描画されるだけで**自動的にはコピーされません**。公開するものだけを差分コピーする prebuild 手順をサイト側に追加してください。参照実装は [`apps/web/scripts/build_images.ts`](../../../../apps/web/scripts/build_images.ts) です（`prebuild` スクリプト（`tsx scripts/build_images.ts`）から呼び、`public/assets/attachments/` へコピーします）。

この実装の動きは次のとおりです。

1. contentRoot 配下を走査し、画像（`IMAGE_EXTENSIONS`）と添付（`isAttachmentPath`）の一覧を作る。
2. `ContentManager` で content を build し、公開ノートのリンクと描画済み HTML の `src` / `href` から**参照されている** asset だけを集める。
3. 参照されているものだけを `public/assets/attachments/<Vault からの相対パス>`（画像は `public/<相対パス>`）へコピーする。サイズと mtime が同じならコピーを省略する。
4. 公開側にあって content 側に無い添付（孤児）は削除する。

つまり「Vault にあるからコピー」ではなく「**公開ノートから参照されているからコピー**」です。Vault 全体をコピーして公開する近道は使わないでください。非公開ノート、未参照 attachment、`.obsidian` metadata が漏れるおそれがあります。publish filter と asset copy の policy は、publish boundary check が導入されるまで site application 側の責務です。境界の検証を自前で行う例として、E2E フィクスチャの [`publish-boundary-check.mjs`](../../../../tests/external-site/fixture/site/publish-boundary-check.mjs) も参照してください。

### 4-4. 生成される URL

生成する URL は次の安定した形式です。

```text
/assets/attachments/<Vault からの相対 logical path>
```

- `attachment()` は解決済み Vault root から埋め込みファイルのサイズを読み、root 外の path を拒否します。
- `media()` は同じ logical path に対して対応する音声・動画を描画します。

`public/` に物理配置される場所と、URL の見え方をそろえておくと、ビルド後に 404 が出にくくなります。

## 5. 検証手順

root と公開境界は、build の前に CLI で確認できます。ネストした directory から実行し、working directory に依存していないことも確かめます。

```sh
cd site/app
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect config
pnpm exec riebeckite inspect content --list
pnpm exec riebeckite inspect graph
pnpm exec riebeckite build
```

結果は次の順で確認します。

1. `check` は config と Plugin contract を検証します。
2. `doctor` は読めない、または不正な filesystem content source を報告します。
3. `inspect config` の `Directory` は解決済みの絶対パス、`Publishing` は `publishStrategy`、`Exclude` はパターン数です。まずここで Vault の向き先を確定させます。
4. WikiLink や embed を調べる前に、`inspect content --list` で期待する logical path が読み込まれているか確認します。
5. `inspect graph` で、除外したはずのノートがノードとして現れていないか確認します。
6. `build` で integration と route rendering を検証します。

## 6. トラブルシューティング（詳細）

| 症状 | 対処 |
| --- | --- |
| 記事が表示されない | `publish: true` の有無、`content.exclude` のパターン、`inspect content --list` で確認 |
| `doctor` がソースの問題を報告 | `inspect config` で解決済み directory を確認。`directory` の相対パスが基準（appRoot）に合っているか見る |
| `Could not find riebeckite.config.*` | site の外から実行していないか確認。CLI は config を祖先にたどって探す |
| `Found multiple Vite applications` | `vite.config.*` が複数ある。対象 site を絞るか、`riebeckiteVite()` に `appRoot` / `configRoot` を渡す |
| CI のビルドで Vault が見つからない | workflow に追加 checkout か `submodules: recursive` が入っているか確認 |
| `gitlab` など `github.token` で解決できない private リポジトリ | 専用の secret（PAT など）を `token:` で渡しているか確認 |
| submodule が CI で取得されない | `actions/checkout@v4` に `submodules: recursive` があるか、SSH URL なら鍵を渡しているか確認 |
| submodule の記事が更新されない | site 側で `cd content && git pull` → `git add content` → commit → push が必要 |
| デプロイ後に画像が 404 | prebuild のコピー手順がビルド前に実行され、`public/assets/attachments/` を対象にしているか確認 |
| 画像が Vault にあるのにコピーされない | 参照元ノートが公開されているか（`publish: true`）、参照が `link.kind` として拾われているかを確認 |
| 手元では読めるのに CI ではパスが違う | CI の working directory と `directory` の相対基準（appRoot）を確認。`../notes` と `notes` の違いでずれやすい |
| 除外したはずのフォルダが読み込まれる | パターンがアンカーされる点を確認し、必要なら `**/` を付ける（4-2） |

## 関連資料

- [記事とサイトのリポジトリ分離](../content-repositories.md) — 流れに沿った入門
- [Configuration](../../reference/configuration.md) — root の解決規則と外部 Vault の詳細
- [利用ガイド](../README.md) — 外部 Vault の設定例と assets の扱い
- [Cloudflare デプロイテンプレート](../../../../templates/cloudflare/README_ja.md) — デプロイ workflow の詳細
- E2E フィクスチャ [`tests/external-site/fixture/site`](../../../../tests/external-site/fixture/site) — Vault を site の外に置いた構成の実例
