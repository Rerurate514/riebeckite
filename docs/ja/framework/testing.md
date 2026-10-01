# テスト

Riebeckite では、変更によって既存の動作が壊れていないことを自動テストで確認します。

基本のテスト環境は、

- Node.js 組み込みの `node:test`
- TypeScript を直接実行する `tsx`

です。

Jest や Vitest などの追加のテストフレームワークは使用しません。

また、HTML や JSON のように手作業では確認しづらい大きな出力には **Golden File** を使用します。期待する出力そのものをファイルとして保存することで、変更内容を Pull Request の差分として確認できます。

# テストの種類

Riebeckite には大きく2種類のテストがあります。

```mermaid
flowchart TD
    Test["Riebeckite Tests"]

    Test --> Unit["Package Tests<br/>Unit / Integration"]
    Test --> E2E["External Site E2E"]

    Unit --> Package["各 package の test/*.test.ts"]
    E2E --> External["tests/external-site"]
```

このページで主に扱うのは、**各 Package に置くテスト**です。

実際の外部 Site を生成して検証する End-to-End Test は、

```text
tests/external-site
```

にあります。

```sh
pnpm test:e2e:external
```

で実行できます。

External Site E2E を動かす再利用可能な Engine は、

```text
@riebeckite/test/e2e
```

にあります。

一方、

- Riebeckite repository 固有の Fixture
- テスト対象 Package の一覧
- Repository 固有の Assertion

は `tests/external-site` に置きます。

# テストを実行する

よく使うコマンドは次のとおりです。

| コマンド | 内容 |
| --- | --- |
| `pnpm test` | `test` Script を持つすべての Package をテスト |
| `pnpm --filter <package> test` | 特定の Package だけテスト |
| `pnpm test:update` | すべての Golden File を現在の出力で更新 |
| `pnpm test:e2e:external` | External Site E2E を実行 |

通常は、変更した範囲に近いテストから実行してください。

たとえば TOC Plugin だけを変更した場合は、

```sh
pnpm --filter @riebeckite/plugin-toc test
```

とします。

その後、必要に応じて Repository 全体の、

```sh
pnpm test
```

を実行します。

# Golden File を部分的に更新する

1つの Package の Golden File だけを更新したい場合は、`UPDATE_GOLDEN=1` を設定してテストします。

PowerShell では、

```powershell
$env:UPDATE_GOLDEN=1; pnpm --filter @riebeckite/plugin-toc test
```

です。

Golden File の更新は単にテストを通すために行うものではありません。

**新しい出力が正しいことを確認してから更新してください。**

# テストの置き場所

各 Package のテストは、

```text
test/*.test.ts
```

に置きます。

たとえば、

```text
packages/plugins/example/
├─ src/
├─ test/
│  ├─ example.test.ts
│  └─ __golden__/
│     └─ example.html
├─ package.json
└─ index.ts
```

のような構成です。

Package 自身が `test` Script を持ちます。

```json
{
  "scripts": {
    "test": "node --import tsx --test \"test/*.test.ts\""
  }
}
```

`test/` とテストファイルは、

- Type Check
- Package Build
- 公開 Package の `files`

から除外されます。

そのため、Riebeckite の利用者へテストコードが配布されたり、利用側の Build に影響したりしません。

# 共有テストユーティリティ

複数 Package から利用するテスト用機能は、

```text
@riebeckite/test
```

にあります。

必要な Package の `devDependencies` に追加し、

```ts
import {
  assertGolden,
} from "@riebeckite/test";
```

のように Public API から利用します。

テスト専用の共通処理を各 Plugin にコピーしないでください。

# 基本的なテストの書き方

基本は、対象 Package の処理へ入力を渡して、その結果を検証します。

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { renderBreadcrumbNav } from "../src/render.ts";

test("renders nothing for a single root item", () => {
  assert.equal(
    renderBreadcrumbNav([]),
    "",
  );
});
```

Riebeckite の Plugin Logic には純粋関数として切り出せる処理が多いため、すべてのテストで Build Pipeline 全体を起動する必要はありません。

```mermaid
flowchart LR
    Input["Input"]
    Function["対象の処理"]
    Output["Output"]
    Assert["Assertion"]

    Input --> Function
    Function --> Output
    Output --> Assert
```

小さい処理は、可能な限りこの形で直接テストします。

# Content を扱うテスト

Content System の動作を確認したい場合は、実際の Filesystem を用意するより、In-memory の `ContentSource` を利用するのが基本です。

```ts
const source = {
  async scan() {
    return [
      {
        path: "notes/index.md",
      },
    ];
  },

  async read(entry) {
    return `# ${entry.path}`;
  },
};

const config = resolveConfig({
  content: {
    directory: ".",
  },
});

const manager = new ContentManager(
  source,
  [],
  { config },
);

const manifest =
  await manager.getManifest();
```

これによって、

```mermaid
flowchart LR
    Source["In-memory<br/>ContentSource"]
    Manager["ContentManager"]
    Manifest["Manifest"]
    Assert["Assertion"]

    Source --> Manager
    Manager --> Manifest
    Manifest --> Assert
```

という小さい範囲で Content System を検証できます。

実際の Site や Vite Build が必要な問題でなければ、テストのためだけに Application 全体を組み立てないでください。

# Golden File

HTML や大きな JSON のように、個別の Assertion を大量に書くより出力全体を確認した方が分かりやすい場合は Golden File を使用します。

`@riebeckite/test` には2つの Helper があります。

| Helper | 用途 |
| --- | --- |
| `assertGolden(actual, goldenUrl)` | HTML、Markdown、Text、Serialized JSON |
| `assertGoldenJson(value, goldenUrl)` | Object / JSON |

`assertGoldenJson()` は比較前に、

```ts
JSON.stringify(value, null, 2)
```

で整形します。

# Golden File の配置

期待値は、

```text
test/__golden__/
```

に置きます。

たとえば、

```text
test/
├─ toc.test.ts
└─ __golden__/
   └─ toc.html
```

です。

テストからは `import.meta.url` を基準に URL を渡します。

```ts
import { test } from "node:test";
import {
  assertGolden,
} from "@riebeckite/test";

test("renders the table of contents", () => {
  assertGolden(
    renderToc(entries),
    new URL(
      "./__golden__/toc.html",
      import.meta.url,
    ),
  );
});
```

絶対 Path や Current Working Directory に依存させないことが重要です。

# Golden File の比較

既定では出力を少し正規化してから比較します。

具体的には、

```text
CRLF / CR
    ↓
LF

末尾の複数改行
    ↓
1つの改行
```

へ統一します。

これによって Windows / Linux や Editor の設定による不要な差分を防ぎます。

バイト単位で厳密な比較が必要な場合は、

```ts
assertGolden(
  actual,
  goldenUrl,
  {
    normalize: false,
  },
);
```

とします。

# Golden File が一致しない場合

Golden File が、

- 存在しない
- 現在の出力と一致しない

場合、テストは失敗します。

出力の変更が意図したものであることを確認したら、

```sh
pnpm test:update
```

で Golden File を更新します。

```mermaid
flowchart TD
    Test["Test"]
    Match{"Goldenと一致？"}

    Test --> Match

    Match -->|Yes| Pass["Pass"]
    Match -->|No| Review["差分を確認"]

    Review --> Correct{"新しい出力が正しい？"}

    Correct -->|No| Fix["実装を修正"]
    Correct -->|Yes| Update["Goldenを更新"]

    Fix --> Test
    Update --> Test
```

Golden File をコミットするのは意図的です。

出力の変更を、

```diff
- 以前の出力
+ 新しい出力
```

として Pull Request 上でレビューできるようにするためです。

**Golden File の更新そのものを修正として扱わず、なぜ出力が変わったのかを必ず確認してください。**

# Node の Snapshot を使わない理由

Riebeckite では Node.js 組み込みの Snapshot Assertion、

```text
--test-update-snapshots
```

は使用していません。

これは Node.js 22.3 以降を必要とします。

Riebeckite は Node.js 20.19 以降も対象としているため、独自の Golden File Helper を使用します。

# Package にテストを追加する

まだテストを持っていない Package に追加する場合は、次の順番で設定します。

## 1. `tsx` を追加する

Package の `devDependencies` に `tsx` を追加します。

## 2. `test` Script を追加する

```json
{
  "scripts": {
    "test": "node --import tsx --test \"test/*.test.ts\""
  }
}
```

## 3. 必要なら `@riebeckite/test` を追加する

Golden Helper などを使う場合は、

```text
@riebeckite/test
```

を `devDependencies` に追加します。

## 4. Plugin Metadata を更新する

Plugin Package の場合は、

```text
scripts/package_metadata.mjs
```

の `hasTests` に Package Directory 名を追加します。

## 5. Package Metadata を検証する

Dependency を変更したら、

```sh
pnpm install
pnpm check:packages
```

を実行します。

`scripts/check_packages.mjs` は Package の Metadata と `scripts/package_metadata.mjs` の定義を比較します。

たとえば、

- `test` Script が必要なのに存在しない
- `hasTests` に追加されていない
- 期待する Metadata と一致しない

といった問題を検出します。

# 何をテストするか

テストでは、**決定的で再現可能な振る舞い**を優先します。

特に次のような処理はテストに向いています。

- Option の解決
- Validation
- Default Value
- Permalink の解決
- TOC の構築
- Metadata の抽出
- HTML Rendering
- JSON Generation
- 空の入力
- Frontmatter の欠落
- Slug の重複
- 不正な Attribute

たとえば純粋関数なら、

```text
同じ入力
   ↓
同じ処理
   ↓
常に同じ出力
```

になるため、安定したテストを書きやすくなります。

# 避けるべきテスト

次のような外部状態へ直接依存するテストは、可能な限り避けます。

```text
Network
Current Time
Random Value
Machine-specific Absolute Path
Current Working Directory
```

たとえば、

```ts
const now = new Date();
```

を処理の内部で直接取得すると、テストする時刻によって結果が変化します。

代わりに必要な値を注入できるようにします。

```ts
function createEntry(now: Date) {
  // ...
}
```

テストでは固定値を渡せます。

```ts
const now =
  new Date("2026-01-01T00:00:00Z");

const entry =
  createEntry(now);
```

乱数なども同様です。

重要なのは、テスト側で実際の時刻や乱数を予測することではなく、**決定に必要な値を外から渡せる設計にすること**です。

# どの範囲までテストするか

変更した処理に最も近い、小さい範囲からテストします。

```mermaid
flowchart TD
    Change["変更"]

    Change --> Pure["純粋関数で確認できる？"]
    Pure -->|Yes| Unit["Unit Test"]
    Pure -->|No| Content["ContentManagerが必要？"]

    Content -->|Yes| Manager["In-memory ContentSource"]
    Content -->|No| Package["Package Integration Test"]

    Package --> Site{"実Siteが必要？"}
    Site -->|Yes| E2E["External Site E2E"]
```

単純な Renderer の修正を確認するために External Site E2E を使う必要はありません。

逆に、

- Package の配布形式
- External Consumer からの Import
- 実際の Site Build
- Integration をまたぐ問題

などは Unit Test だけでは十分ではないため、External Site E2E で確認します。

# 基本方針

Riebeckite のテストでは、

**変更した振る舞いを確認できる最小の範囲で、決定的なテストを書く**

ことを基本にします。

```mermaid
flowchart LR
    Logic["Pure Logic"]
    Unit["Unit Test"]
    Content["Content Behavior"]
    Manager["ContentManager Test"]
    Package["Package Integration"]
    E2E["External Site E2E"]

    Logic --> Unit
    Content --> Manager
    Package --> E2E
```

大きな Build を毎回再現するのではなく、純粋関数や In-memory `ContentSource` で確認できる処理は小さくテストします。

一方、Package 境界や実際の External Consumer に関係する問題は E2E で確認します。

Golden File は、複雑な出力を「テストを通すための Snapshot」ではなく、**レビュー可能な期待出力**として扱ってください。
