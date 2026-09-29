# 記事とサイトのリポジトリ分離（詳細編）

[記事とサイトのリポジトリ分離](./content-and-site-repos.md) は、別リポジトリ運用を「流れ」に沿って説明したドキュメントです。このページはその「詳細編」で、「どうしてこの設定になるのか」と「踏み込みたいケース（assets のコピー、CI の認証、submodule の運用）」を補足します。

はじめての人はまず [content-and-site-repos](./content-and-site-repos.md) を読み、このページは「仕組みを理解したい」「運用で困った」ときに使ってください。

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

### 1-1. Application 側でコンテンツを読む場合

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

## 2. 3 つのパターン

| パターン | 構成 | 選ぶ基準 | デプロイの考慮 |
| --- | --- | --- | --- |
| A. 1 リポジトリ | サイトも記事も同じ Git リポジトリ（`content/` 直使い） | 個人ブログを 1 リポジトリで完結 | 追加設定なし |
| B. 同リポジトリ内で分離 | `site/` と `vault/` を 1 リポジトリに並べる | 履歴は共有、場所と公開範囲だけ分けたい | `content.directory: "../vault"` を site 側で設定 |
| C. 別リポジトリ（推奨） | 記事 = private・サイト = public | 記事を非公開にしたい／更新を分けたい | CI で記事リポジトリの取得設定が必要 |

### 2-1. パターン B の配置

```text
notes-repo/
├─ site/                ← ここが appRoot（riebeckite.config.ts がある）
│  └─ riebeckite.config.ts
└─ vault/               ← directory: "../vault" で参照
```

## 3. パターン C の詳細手順

基本の流れは [content-and-site-repos](./content-and-site-repos.md) にあります。ここでは省略されがちな詳細を補足します。

### 3-1. Vault を private リポジトリに

- `git init` 後、最初の push 前に GitHub で **private** リポジトリを作成します。
- `.obsidian/` は Vault を Obsidian で開くと自動生成される設定フォルダです。`content.exclude` に `.obsidian/**` を入れておけば、たとえ push していても site 側の読み込みから除外できます。
- 非公開ノートは `publish: true` を付けないことが基本です。加えて、非公開用のフォルダ（例: `private/**`）を `content.exclude` に入れて、**そもそも読み込ませない**二重の対策にします。

### 3-2. CI で記事リポジトリを取得する 2 つの方法

デフォルトのデプロイ workflow（`templates/cloudflare/.github/workflows/deploy.yml`）は **サイトのリポジトリしか取得しません**。

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

- `repository` に記事リポジトリ（private）を指定すると、同リポジトリの CI では自動的に認証されます。
- `path: notes` にすると、workflow の working directory 上で `notes/` として取得されます。手元で `../notes` を使っていた場合、CI では `directory` を `notes`（あるいは `notes/` を基準にした相対）にそろえます。手元と CI で解決結果が同じになるよう、配置の形を合わせてください。
- 記事の push だけでデプロイに反映されます。記事の更新が主な運用なら手軽です。

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

記事の更新が主なら方法 1 が、履歴を site 側に固定したいなら方法 2 が向いています。

### 3-3. CI で private リポジトリを取得するときの認証

- **同一 GitHub リポジトリの CI** から `repository:` 指定で取得する場合、`actions/checkout` は `github.token` を自動利用でき、追加設定は不要です。
- **同じ GitHub アカウント配下でも別組織・別 host**（GitLab など）など、`github.token` で解決できない場合は、PAT（personal access token）や deploy key を secret に登録し、`token:` で渡す必要があります。
- private Vault を READ できる最小権限の PAT を用意し、`GITHUB_TOKEN` ではなく専用の secret 名で扱うと安全です。

## 4. 公開のルールと assets の扱い

explicit 方式（デフォルトの `publishStrategy: "explicit"`）では、`publish: true` の付いたノートだけが公開されます。

### 4-1. 添付ファイルは自動コピーされない

`![[attachments/x.png]]` のようなファイルは、URL が描画されるだけで**自動的にはコピーされません**。公開するものだけを差分コピーする prebuild 手順をサイト側に追加してください。参照実装は [`apps/web/scripts/build_images.ts`](../../apps/web/scripts/build_images.ts) です（`prebuild` スクリプト（`tsx scripts/build_images.ts`）から呼び、`public/assets/attachments/` へコピーします）。

生成する URL は次の安定した形式です。

```text
/assets/attachments/<Vault からの相対 logical path>
```

- `attachment()` は解決済み Vault root から埋め込みファイルのサイズを読み、root 外の path を拒否します。
- `media()` は同じ logical path に対して対応する音声・動画を描画します。
- Vault 全体をコピーして公開する近道は使わないでください。非公開ノート、未参照 attachment、`.obsidian` metadata が漏れるおそれがあります。publish filter と asset copy の policy は、publish boundary check が導入されるまで site application 側の責務です。

## 5. トラブルシューティング（詳細）

| 症状 | 対処 |
| --- | --- |
| 記事が表示されない | `publish: true` の有無、`content.exclude` のパターン、`inspect content --list` で確認 |
| `doctor` がソースの問題を報告 | `inspect config` で解決済み directory を確認。`directory` の相対パスが基準（appRoot）に合っているか見る |
| CI のビルドで Vault が見つからない | workflow に追加 checkout か `submodules: recursive` が入っているか確認 |
| `gitlab` など `github.token` で解決できない private リポジトリ | 専用の secret（PAT など）を `token:` で渡しているか確認 |
| submodule の記事が更新されない | site 側で `cd content && git pull` → `git add content` → commit → push が必要 |
| デプロイ後に画像が 404 | prebuild のコピー手順がビルド前に実行され、`public/assets/attachments/` を対象にしているか確認 |
| 手元では読めるのに CI ではパスが違う | CI の working directory と `directory` の相対基準（appRoot）を確認。`../notes` と `notes` の違いでずれやすい |

## 関連資料

- [記事とサイトのリポジトリ分離](./content-and-site-repos.md) — 流れに沿った入門
- [Configuration](./configuration.md) — root の解決規則と外部 Vault の詳細
- [利用ガイド](./guide.md) — 外部 Vault の設定例と assets の扱い
- [Cloudflare デプロイテンプレート](../../templates/cloudflare/README_ja.md) — デプロイ workflow の詳細
- E2E フィクスチャ [`tests/external-site/fixture/site`](../../tests/external-site/fixture/site) — Vault を site の外に置いた構成の実例