---
date: 2026-11-01
title: 外部サイトの E2E
sidebar:
  label: 外部サイトの E2E
  order: 40
---
# 外部サイトの E2E

`@riebeckite/test/e2e` は、パッケージを tarball にまとめ、空の利用者プロジェクトへインストールし、生成されたサイトを検証するエンジンです。モノレポの構成には依存せず、リポジトリのルート、パッケージ一覧、フィクスチャ、アサーションはすべて呼び出し側が渡します。

Riebeckite 本体では `tests/external-site` がこのエンジンを使い、リポジトリ固有のフィクスチャと検証を置いています。

## 使い方

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
      // 生成されたサイトを検証する
    },
  },
});
```

一時ディレクトリは検証の最後に削除されます。`keepEnv` に指定した環境変数が設定されている場合は、後から確認できるように残ります。

## 下位の API

`@riebeckite/test/e2e` は、組み立てに使う手順もエクスポートします。

- `run` / `runAsync` — コマンドを起動する
- `packPackages` — パッケージの tarball を作る
- `stageIsolatedSite` — 利用者プロジェクトを組み立てる
- インストールと成果物の検証

一般化できない処理（tarball からのスターター生成など）は `afterSiteChecks` で行います。

## 関連

- [テスト](../testing.ja.md)
- [Golden File](./golden-files.ja.md)
