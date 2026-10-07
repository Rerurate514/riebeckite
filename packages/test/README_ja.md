# @riebeckite/test

Riebeckite パッケージ共通のテストユーティリティと、汎用の external-consumer E2E engine です。

[English](./README.md)

## 概要

`@riebeckite/test` には 2 つのエントリポイントがあります。

- `@riebeckite/test` — パッケージの単体テスト向けの依存ゼロ helper。
- `@riebeckite/test/e2e` — ビルド済みサイトを公開 tarball に対して end-to-end で検証する再利用可能な engine。Riebeckite モノレポを一切知りません。リポジトリルート、パッケージ一覧、fixture、コンテンツのアサーションはすべて呼び出し側が渡します。

## インストール

```sh
pnpm add -D @riebeckite/test
```

## 単体テストの helper

`assertGolden` と `assertGoldenJson` は、手で書くには大きすぎる出力を committed な golden ファイルとして記録します。Node 標準の snapshot 機能は Node 22.3+ が必要ですが、Riebeckite は Node 20.19+ をサポートするため、この helper が対応範囲をカバーします。

```ts
import { assertGolden, assertGoldenJson } from "@riebeckite/test";

assertGolden(renderHtml(), new URL("./__golden__/page.html", import.meta.url));
assertGoldenJson(manifest, new URL("./__golden__/manifest.json", import.meta.url));
```

既定では CRLF/CR を LF に変換し、末尾の改行を 1 つにまとめるため、golden ファイルはプラットフォームやエディタをまたいで安定します。バイト単位で一致させたい場合は `{ normalize: false }`、失敗時に文脈を足したい場合は `{ message }` を渡してください。

golden ファイルが無い、または一致しない場合はテストが失敗します。リポジトリルートで `pnpm test:update`（単一パッケージなら `UPDATE_GOLDEN=1`）を実行して記録を更新し、差分を確認してください。

詳しいワークフローは [Testing](../../docs/docs/framework/testing.ja.md) を参照してください。

## External-site engine

`@riebeckite/test/e2e` は、複数のワークスペースパッケージを tarball にまとめ、空の consumer プロジェクト（fixture サイト付き）にインストールし、結果に対してアサーションを実行します。モノレポ固有の情報はハードコードしません。

```ts
import path from "node:path";

import { runExternalSiteE2E } from "@riebeckite/test/e2e";

await runExternalSiteE2E({
  repoRoot,
  packages: [{ directory: "packages/core", name: "@riebeckite/core" }],
  fixture: { site: fixtureSite, vault: fixtureVault },
  dependencyCheckScript: path.join(repoRoot, "scripts/check_dependencies.mjs"),
  scope: "@riebeckite",
  cliName: "riebeckite",
  resolveCliEntry: (siteDir) =>
    path.join(siteDir, "node_modules", "@riebeckite", "cli", "bin", "riebeckite.mjs"),
  cliCommands: [{ args: ["build"] }],
  keepEnv: "RIEBECKITE_E2E_KEEP",
  assertions: {
    buildOutput: (siteDir, vaultDir) => {
      // ビルド済みサイトに対するアサーション
    },
  },
});
```

engine は、それが組み立てられている下位ステップも公開します。コマンド実行の `run` / `runAsync`、tarball 作成の `packPackages`、consumer プロジェクトを組み立てる `stageIsolatedSite`、インストールと成果物のアサーションなどです。リポジトリ側で独自のフローを構成できます。一般化できない処理（たとえば packed tarball から starter サイトを生成するなど）は `afterSiteChecks` コールバックで実行します。

## 関連資料

- [Testing](../../docs/docs/framework/testing.ja.md)

