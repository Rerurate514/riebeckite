# Riebeckite

> [English](./README.md)

Riebeckite は、Markdown と Obsidian 形式のノートを Web サイトとして公開するための拡張可能なコンテンツフレームワークです。コンテンツの読み込み、解釈、拡張、表示、ビルドを分けて扱うため、サイト固有の要件が増えても Markdown 処理を一つの巨大な実装にまとめずに済みます。

このリポジトリは pnpm のモノレポです。参照アプリケーションには HonoX、Vite、Cloudflare Workers を使います。一方、Core はそれらのフレームワーク固有の処理から独立したコンテンツ処理を持ちます。

## Riebeckite でできること

- Markdown とアセットを走査し、コンテンツの一覧と関係グラフを作る
- Markdown・HTML の変換、アセット、ブラウザ側の動作、エンドポイント、SEO、診断をプラグインで追加する
- 意味のある CSS トークン、安定したフック、配色モード、文字組みをテーマとして差し替える
- HonoX/Vite と接続し、開発、静的ビルド、デプロイ向けのアプリケーションを構成する
- 差分ビルド、プラグインキャッシュ、診断、Doctor、Inspector、ログ、トレース、プロファイルを使う

Obsidian Markdown、WikiLink と埋め込み、添付ファイル、Mermaid、Excalidraw、メディア、コードブロック、タブ、目次、被リンク、検索、ローカルグラフ、ノート探索、SEO、フィード、サイトマップなどのプラグインを用意しています。

## 処理の流れ

```text
Markdown とアセット
        │
        ▼
ContentSource ── ファイルを走査・読み込み、ソース情報を作る
        │
        ▼
ContentManager ── コンテンツを解釈し、処理を調整する
        ├── Manifest
        ├── Content Graph
        └── Pipeline
                     │
                     ▼
                  Plugins
                     │
                     ▼
        HonoX / Vite integration
                     │
                     ▼
       Application / Cloudflare Workers
```

Core は移植可能な処理の調整を担い、Plugin は再利用できる機能を追加します。Integration は Core を外部フレームワークへ接続し、Theme は表示を担当します。ルートとサイト固有のコンポーネントは Application に置きます。依存関係の規則は [アーキテクチャ](./docs/ja/architecture.md) を参照してください。

## 最初に実行するコマンド

リポジトリのルートで依存関係を入れ、参照アプリケーションの設定を確認します。

```bash
pnpm install
pnpm exec riebeckite check
pnpm exec riebeckite doctor
```

同梱のアプリケーションを開発・ビルドする場合は、次を実行します。

```bash
pnpm dev
pnpm build
```

CLI はルートディレクトリで実行します。主なコマンドは次のとおりです。

```bash
pnpm exec riebeckite check          # 設定とプラグインの解決を検証する
pnpm exec riebeckite doctor         # 状態を変更せずに健全性を診断する
pnpm exec riebeckite inspect        # フレームワークが解釈した状態を確認する
pnpm exec riebeckite dev            # 開発サーバーを起動する
pnpm exec riebeckite build          # 差分ビルドを実行する
pnpm exec riebeckite build --full   # 差分の再利用なしでビルドする
pnpm exec riebeckite profile        # トレースに基づく性能レポートを作る
```

`check`、`doctor`、`inspect` は目的が異なります。設定の検証、健全性診断、状態の確認を混同せず、自動化する前に [CLI リファレンス](./docs/ja/cli.md) を確認してください。

## Obsidian Vault をサイトの外に置く

サイトアプリケーションと Obsidian Vault は、同じディレクトリに置く必要がありません。Vault を Obsidian デスクトップアプリでも使う場合や、サイトと別のリポジトリで管理する場合は、次の構成を推奨します。

```text
workspace/
├─ site/                         # package.json、vite.config.ts、app/
│  └─ riebeckite.config.ts
└─ vault/                        # site/ の外にある Obsidian Vault
   ├─ index.md
   ├─ notes/
   │  └─ project.md
   ├─ attachments/
   │  └─ proposal.pdf
   └─ media/
      └─ recording.mp3
```

### 1. 設定から Vault を指定する

`content.directory` はシェルの current working directory ではなく、HonoX/Vite の `appRoot` 基準で解決されます。`riebeckite.config.ts` と `vite.config.ts` が `site/` にあるなら、兄弟の Vault は次のように指定します。

```ts
// site/riebeckite.config.ts
import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  site: { title: "My notes" },
  content: {
    directory: "../vault",
    exclude: [".obsidian/**", "Templates/**"],
  },
  plugins: [obsidianMarkdown(), media(), attachment()],
});
```

絶対パスも指定できます。ただし、サイトと Vault をまとめて移動できる相対パスの方が通常は扱いやすくなります。`process.cwd()` を使ってパスを組み立てないでください。CLI はネストしたディレクトリ、CI、エディタのタスクなど、さまざまな場所から起動されます。`riebeckite check`、`doctor`、`inspect`、`build` はすべて同じ解決済みの絶対 Vault root を使います。

### 2. アプリケーション側の ContentManager も解決済みパスを使う

Integration は自身のビルド時に `content.directory` を解決します。一方、route や island のためにアプリケーション自身が `ContentManager` を作る場合は、構築前に同じパスを一度だけ解決してください。

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

```ts
// site/app/content.ts
import { ContentManager } from "@riebeckite/core";
import { config } from "./config";

export const content = new ContentManager(
  config.content.directory,
  config.content.exclude,
  { config, plugins: config.plugins },
);
```

ここで `directory` はすでに絶対パスです。別の基準ディレクトリで二重に `resolve` しないでください。`content.source` を設定する場合は filesystem の走査を置き換えるため、同じ Vault に対して二つ目の reader として併用しません。

### 3. Vite の application root は site のままにする

`appRoot` は Vault ではなく site を指すようにします。Vault はコンテンツデータであり、route、client entry、生成される plugin style、出力先は Vite application が所有します。

```ts
// site/vite.config.ts
import { fileURLToPath } from "node:url";
import { riebeckite } from "@riebeckite/honox";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [riebeckite({ appRoot })],
});
```

`riebeckite.config.ts` を意図的に Vite application の外へ置く場合だけ `configRoot` を設定します。これは config のあるディレクトリを表す値であり、相対 `content.directory` の基準を変えるものではありません。

### 4. バイナリ添付ファイルは公開対象を明示してコピーする

`obsidianMarkdown()` は `[[attachments/proposal.pdf]]` や `![[media/recording.mp3]]` を `/assets/attachments/<Vault 内の論理パス>` 以下の URL に変換します。`attachment()` は埋め込みファイルのサイズを解決済み Vault root から読み、`media()` は音声・動画の埋め込みを描画します。ただし、これらの Plugin は Vault 内のバイナリを Vite の public 出力へ自動コピーしません。

サイト側の prebuild で、公開する添付ファイルだけを Vault から `site/public/assets/attachments/` へコピーしてください。このとき Vault からの相対パスを維持します。参照実装は [`apps/web/scripts/build_images.ts`](./apps/web/scripts/build_images.ts) です。参照されているアセットだけを収集し、差分コピーし、不要になった public ファイルを削除します。Vault 全体を無条件に公開してはいけません。非公開ファイルや Obsidian の metadata を deployment artifact に含めないようにしてください。

### 5. ネストしたディレクトリから検証する

次のように実行すると、current working directory に依存していないことを確認できます。

```bash
cd site/app
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect content --list
pnpm exec riebeckite build
```

filesystem path が誤っている場合は、`doctor` の content inspection が失敗を報告します。Markdown link を調べる前に、`riebeckite inspect config` で解決済みの content directory を、`riebeckite inspect content --list` で期待する論理パスを確認してください。

## リポジトリ構成

| パス | 役割 |
| --- | --- |
| [`packages/core`](./packages/core) | コンテンツ、Pipeline、Plugin・Theme API、診断、観測機能 |
| [`packages/cli`](./packages/cli) | Node.js 向け CLI とビルド時ツール |
| [`packages/integrations/honox`](./packages/integrations/honox) | HonoX と Vite の統合 |
| [`packages/plugins`](./packages/plugins) | コンテンツ、表示、公開を拡張するプラグイン |
| [`packages/themes`](./packages/themes) | 組み込み CSS テーマとトークン実装 |
| [`apps/web`](./apps/web) | 参照用の HonoX アプリケーション |
| [`docs/en`](./docs/en/README.md) | 英語ドキュメント |
| [`docs/ja`](./docs/ja/README.md) | 日本語ドキュメント |

## ドキュメントの読み方

[日本語ドキュメント一覧](./docs/ja/README.md) から必要な章を開けます。初めて扱う場合は、次の順で読むと全体をつかみやすくなります。

1. [Getting Started](./docs/ja/getting-started.md): ワークスペースの準備と最小設定
2. [Configuration](./docs/ja/configuration.md): `riebeckite.config.ts` の設定項目
3. [Content System](./docs/ja/content-system.md): ソース、manifest、グラフの扱い
4. [Plugin System](./docs/ja/plugin-system.md) または [Theme System](./docs/ja/theme-system.md): 機能や見た目を拡張する前に読む章

個別の Plugin と Theme の説明は、それぞれのパッケージにある README を参照してください。英語版は [README.md](./README.md) と [英語ドキュメント一覧](./docs/en/README.md) から読めます。

## 開発時のコマンド

ルートに定義されているスクリプトは次のとおりです。

```bash
pnpm lint       # Biome で lint を実行
pnpm format     # Biome で整形
pnpm check      # Biome の check と修正を実行
pnpm build      # CLI と参照 Web アプリケーションをビルド
```

Core、Plugin、Integration、Theme を変更する前に、[リポジトリ開発ガイド](./docs/ja/development.md) と該当する設計資料を読んでください。Core にフレームワーク固有、または個別パッケージ固有の逆向き依存を追加しないことが重要です。
