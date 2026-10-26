# @riebeckite/node

[English](./README.md)

Riebeckite 向けの Node.js アダプターです。Node.js アプリケーションや
フレームワーク統合で使う、ファイルシステムベースのコンテンツソースを提供します。

## インストール

ディスク上のディレクトリから `ContentManager` を作成するアプリケーションでは、
このパッケージを追加します。

```sh
pnpm add @riebeckite/core @riebeckite/node
```

`@riebeckite/honox` は、既定のファイルシステムコンテンツソースとしてこの
アダプターをインストールして利用します。

## ファイルシステムコンテンツソースを使う

`ContentManager` は `ContentSource` を受け取ります。ローカルのコンテンツ
ディレクトリには `FileSystemContentSource` を作成して渡します。

```ts
import { ContentManager, defineConfig } from "@riebeckite/core";
import { FileSystemContentSource } from "@riebeckite/node";

const config = defineConfig({
  site: { title: "My notes" },
  content: {
    directory: "content",
    exclude: ["drafts/**"],
  },
});

const content = new ContentManager(
  new FileSystemContentSource(config.content.directory, config.content.exclude),
  [],
  { config, plugins: config.plugins },
);
```

ディレクトリはコンストラクター実行時ではなく、コンテンツを走査または取得する時点で
読み取られます。ディレクトリが存在しない場合は、対象のディレクトリ名を含むエラーになります。

## ファイルシステムでの動作

- ディレクトリを再帰的に走査し、安定したアルファベット順でパスを返します。
- 通常ファイルを作成日時・更新日時・サイズのメタデータとともに取得します。
- 読み取るのは通常ファイルだけです。シンボリックリンクはたどらず、結果にも含めません。
- 設定したコンテンツディレクトリの外側にあるファイルの読み取りを拒否します。
- `.riebeckite`、`.git`、`.github`、`.obsidian`、`node_modules`、`.DS_Store`、
  `Thumbs.db`、`desktop.ini` といった Riebeckite やワークスペースのメタデータは
  既定で無視します。
- 設定した除外パターンを適用します。`.md` を含まない除外パターンは対応する
  Markdown パスにも一致するため、`private` は `private.md` も除外します。
- Obsidian Templater の `templates_folder` 設定がある場合は、そのフォルダを
  コンテンツから除外します。

## 公開 API

### `FileSystemContentSource`

```ts
new FileSystemContentSource(
  contentDirectory: string,
  exclude?: readonly string[],
)
```

Core の `ContentSource` 契約を実装します。エントリーの取得には `scan()`、
エントリー内容の取得には `read(entry)` を使います。

`scanWithExclusions()` は除外情報も返します。

```ts
const { entries, exclusions } = await source.scanWithExclusions();
```

各除外情報には論理パス `path` と、一致した `pattern` が含まれます。これは検査用
ツール向けです。通常のアプリケーションでは `scan()` を使います。

### パスヘルパー

- `INTERNAL_CONTENT_IGNORE_PATTERNS` は組み込みの無視パターンです。
- `isIgnoredContentPath(path, exclude?)` は論理コンテンツパスが無視対象かを返します。
- `matchContentExcludePattern(path, exclude?)` は一致した設定上のパターンを返します。

これらのヘルパーは絶対ファイルシステムパスではなく、`/` 区切りの論理コンテンツパスを
対象にします。

## パッケージ境界

`@riebeckite/core` は移植可能な `ContentSource` 契約とコンテンツパイプラインを
定義します。このパッケージはその契約の Node.js ファイルシステム実装です。
ファイルシステム固有の API は `@riebeckite/core` ではなく `@riebeckite/node` から
インポートしてください。

## 関連資料

- [`@riebeckite/core`](../core/README_ja.md)
- [コンテンツシステム](../../docs/docs/framework/content-system.md)
- [設定リファレンス](../../docs/docs/reference/configuration.md)
