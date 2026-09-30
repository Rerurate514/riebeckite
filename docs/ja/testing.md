# テスト

Riebeckite のテストは Node.js 組み込みのテストランナー（`node:test`）と、TypeScript 実行用の `tsx` で動きます。追加のテストフレームワークは不要です。手で確認するのが大変な出力は golden file としてコミットし、その変化がレビューで見えるようにしています。

実サイトを使った end-to-end の確認は別系統で、`tests/external-site` に置いてあります（`pnpm test:e2e:external`）。このドキュメントが扱うのは各パッケージの unit test です。

## テストの実行

|コマンド|内容|
|---|---|
|`pnpm test`|`test` script を持つ全パッケージでテストを実行（`pnpm -r test`）|
|`pnpm --filter @riebeckite/plugin-toc test`|1 つのパッケージだけテストを実行|
|`pnpm test:update`|全 golden file を現在の出力で書き換える|
|`pnpm test:e2e:external`|external-site の統合テストを実行|

1 つのパッケージの golden file だけを更新したい場合は、テスト実行前に `UPDATE_GOLDEN=1` を設定します。PowerShell では次のようにします。

```powershell
$env:UPDATE_GOLDEN=1; pnpm --filter @riebeckite/plugin-toc test
```

## テストの置き場所

各パッケージはテストを `test/*.test.ts` に置き、`test` script（`node --import tsx --test "test/*.test.ts"`）を自分で持ちます。テスト用ディレクトリとテストファイルは type check とビルドの対象から外れ、公開する `files` にも含まれないため、利用者側に配布されたり影響を与えたりしません。

共有のテスト用ユーティリティはリポジトリ root の `tests/` にあります。ここは workspace のパッケージではないので、テストからは相対パスで import します。

## テストの書き方

対象パッケージの公開 API を import し、その出力を検証します。Plugin のロジックの多くは純粋関数なので、build pipeline 全体を組み立てなくてもテストできます。

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { renderBreadcrumbNav } from "../src/render.ts";

test("renders nothing for a single root item", () => {
  assert.equal(renderBreadcrumbNav([]), "");
});
```

コンテンツを扱う振る舞いは、in-memory の `ContentSource` と `resolveConfig` を用意し、`ContentManager` を通して確認するのが基本です。

```ts
const source = {
  async scan() {
    return [{ path: "notes/index.md" }];
  },
  async read(entry) {
    return `# ${entry.path}`;
  },
};
const config = resolveConfig({ content: { directory: "." } });
const manager = new ContentManager(source, [], { config });
const manifest = await manager.getManifest();
```

## Golden file

大きい出力や構造化された出力には `tests/helpers/golden.ts` の 2 つの helper を使います。

- `assertGolden(actual, goldenUrl)` はテキスト（HTML、Markdown、シリアライズした JSON など）向けです。
- `assertGoldenJson(value, goldenUrl)` はオブジェクト向けで、比較前に `JSON.stringify(value, null, 2)` で整形します。

期待値のファイルは `import.meta.url` から組み立てた `URL` で渡し、`test/__golden__/` の下に置きます。

```ts
import { assertGolden } from "../../../../tests/helpers/golden.ts";

test("renders the table of contents", () => {
  assertGolden(renderToc(entries), new URL("./__golden__/toc.html", import.meta.url));
});
```

既定の正規化では CRLF/CR を LF に変換し、末尾の改行を 1 つにまとめます。これにより golden file がプラットフォームやエディタに依存せず安定します。バイト単位で厳密に比較したい場合は `{ normalize: false }` を渡します。

golden file が無い場合も内容が一致しない場合もテストは失敗します。新しい出力が正しいと確認できたら `pnpm test:update` で再生成し、差分をレビューしてください。golden file をコミットするのは意図的なもので、記録した出力の変化が pull request で読めるようにするためです。

Node 組み込みの snapshot assertion（`--test-update-snapshots`）は使っていません。Node 22.3 以降が必要な一方、Riebeckite は Node 20.19 以降も対象にしているためです。

## パッケージにテストを追加する

1. パッケージの `devDependencies` に `tsx` を、`scripts` に `test`（`node --import tsx --test "test/*.test.ts"`）を追加します。
2. Plugin の場合は、`scripts/package_metadata.mjs` の `hasTests` にディレクトリ名を追加します。
3. 依存関係を変えたら `pnpm install` を実行し、`pnpm check:packages` で期待するメタデータと一致するか確認します。

`scripts/check_packages.mjs` は各パッケージのメタデータを `scripts/package_metadata.mjs` と比較します。`test` script の欠落や `hasTests` への追加漏れは失敗として報告されます。

## 何をテストするか

決定的で純粋な振る舞いを優先します。

- option の解決、検証、デフォルト値の扱い。
- permalink の解決、TOC の構築、メタデータ抽出といったコンテンツ処理。
- レンダリングした HTML と生成した JSON（golden file として記録）。
- 境界ケース: 空の入力、frontmatter の欠落、slug の重複、不正な属性。

ネットワーク、実時刻、絶対パスに依存するテストは避けます。時刻や乱数が必要な場合は、実値で検証せず注入できるようにします。
