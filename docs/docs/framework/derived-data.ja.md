---
date: 2026-10-31
title: 派生データ
sidebar:
  label: 派生データ
---

# 派生データ

Derived View は、ビルド中にプラグイン間で共有できる、名前付き・型付きの非同期計算です。Markdown の入力ではなく、[[glossary/content-graph|Content Graph]] にノードも追加しません。Derived View が生み出す値が、Core がキャッシュしてビルドをまたいで再利用する派生データです。

## どんなときに使うか

| やりたいこと | 使うもの |
| --- | --- |
| 1つのプラグインが1回だけ計算する（キャッシュ不要） | `setup` に直接書く |
| 値をプラグイン間で共有する | Derived View |
| ビルドをまたいで再利用し、内容が変わったら無効化する | Derived View |
| リクエストごとにデータを返す | Worker ハンドラーで解決する（キャッシュなし） |

ほかに使う人がいない一度きりの処理を Derived View にする必要はありません。レジストリ、キャッシュ、依存関係の追跡には、それぞれコストがかかります。

## クイックスタート

```ts
import { defineDerivedView, definePlugin } from "@riebeckite/core";

const recentCount = defineDerivedView<{ count: number }, number>({
  id: "example.recent-count",
  version: "1",
  compute: ({ count }) => count,
});

export const example = definePlugin({
  name: "example",
  derivedViews: [recentCount],
  async setup(context) {
    const count = await context.derived.resolve(recentCount, { count: 3 });
  },
});
```

View はプラグインの `derivedViews` 配列に登録します。解決には `context.derived.resolve(view, input)` を使い、定義でも ID でも指定できます。

## 用語

| 名前 | 内容 |
| --- | --- |
| Derived View | 自分で定義する計算 |
| derived dependency | View が計算中に追跡した入力 |
| `derivedDependencies` | View から生成出力へ渡すトレース |
| `derivedViewIds` | その出力が依存する View の ID |
| `derived-view` / `derived-query` | 無効化に使う出力依存関係の種類 |

## 契約

- `id` — グローバルに一意で安定した値。重複するとプラグインの解決時に失敗します。
- `version` — 必須。キャッシュエントリと出力依存関係に保存されます。変更すると、その View のキャッシュ済みの結果がすべて無効になります。
- `input` / `output` — 任意のスキーマ。`parse(value)` を持つオブジェクトなら何でも使え、Core は特定の検証ライブラリに依存しません。たとえば Zod のスキーマをそのまま渡せます。
- `compute(input, context)` — 非同期でもかまいません。
- 入力には `Date` を含められます。それ以外は決定的な JSON 相当の値、配列、プレーンオブジェクトに限ります。
- 結果は JSON に限ります。[[glossary/persistent-cache|永続キャッシュ]]に保存される可能性があるためです。

### 別の View を呼ぶ

`compute` の中では `context.resolve()` を使います。子 View の依存関係とバージョンは、キャッシュヒット時も含めて親へ伝播します。子 View のバージョンが変わると、親のキャッシュも無効になります。

### 同時呼び出し

同じ View、バージョン、入力への同時要求は1つの計算を共有します。エラーはすべての呼び出し元へ伝わり、成功値として保持されることはありません。再帰呼び出しは循環経路の全体を示して失敗します。

## 依存関係

Core が結果をキャッシュできるのは、すべての入力をもう一度確認できる場合だけです。入力は `context.track()` か `context.query()` で宣言します。

### `context.track()`

```ts
context.track({ type: "content", id: "notes/release" });
```

| 種類 | 追跡するもの |
| --- | --- |
| `content` | 1つのコンテンツエントリ。[[glossary/content-index|content index]] で解決し、元の Markdown から fingerprint を作るため、本文の編集、リネーム、alias の付け替えで無効になります。 |
| `frontmatter` | 1つの frontmatter プロパティ。`property` を指定します。 |
| `file` | 1つのビルドファイル。 |
| `external` | 外部 snapshot。下で説明します。 |
| `unknown` | Core が証明できないもの。保存されません。 |

fingerprint はすべて Core が計算するため、自分で指定する必要はありません。`content`、`external`、`file`、`frontmatter` は runtime snapshot と照合します。`planGeneratedOutputs` の実行中は、`file`、`frontmatter`、`query` もその出力計画の build snapshot と照合します。計画段階以外ではこれらの snapshot がないため再照合できず、キャッシュミスになります。

時刻、snapshot を持たないネットワーク、環境変数、乱数など、fingerprint を証明できない入力には `unknown` を使います。

### `context.query()`

```ts
const entries = context.query("releases", {
  pool: "discoverable",
  filter: { tags: { any: ["release"] } },
  sort: { field: "date", order: "desc" },
});
```

どのフィルタ・ソート項目が使われるかは、定義から決まります。Core がクエリを実行し、結果集合全体を fingerprint 化するため、メンバーの増減、[[glossary/visibility|公開状態]]の遷移、frontmatter、レンダリング後の本文、リンク、[[glossary/backlink|backlinks]] まで、追加の宣言なしで対象になります。`pool` の既定値は `discoverable` です。unlisted を含みうる出力では `routable` を指定します。

動的な `where` 述語は定義から導出できません。指定すると結果は `unknown` として追跡され、値は保存されず、その[[glossary/generated-output|生成出力]]は毎回再生成されます。フィルタはクエリ定義で表現してください。

### 外部依存関係

既存の `resolveExternalDependencies` フックを使います。View は snapshot を ID で追跡し、現在の snapshot の fingerprint が一致する間だけ結果を再利用します。fingerprint の変化、snapshot の欠損、`unavailable` の解決、external ID の重複はキャッシュミスになります。snapshot の値そのものは派生キャッシュに保存されません。

## キャッシュされる条件

値キャッシュは、ビルド時の [[glossary/plugin-cache|PluginCache]] に Core 専用の名前空間で保存されます。エントリには、View のバージョン、入力 fingerprint、結果、追跡済み依存関係の fingerprint が入ります。壊れたエントリや読めないエントリはキャッシュミスとして扱います。

ヒットした場合は、追跡済み依存関係の再照合だけを行い、`compute` を省略します。ミスした場合は、入力 fingerprint の計算、`compute`、1回のキャッシュ書き込みが加わります。保存されるのは、結果が JSON で、すべての依存関係を追跡できた場合だけです。

:::note[毎回キャッシュミスになる理由]{type=info}
追跡していない入力、JSON でない結果、`unknown` 依存のいずれかがあると保存されません。値自体は正しく返りますが、毎回計算し直します。
:::

## 値を公開する

Derived View は自動ではシリアライズされません。生成出力の計画では、`derived` コンテキストから View を解決できます。

```ts
async planGeneratedOutputs({ derived }) {
  const result = await derived.resolveWithDependencies(recentCount, { count: 3 });
  return [{
    path: "data/recent.json",
    content: JSON.stringify(result.value),
    derivedDependencies: result.dependencies,
    derivedViewIds: result.viewIds,
  }];
}
```

`resolveWithDependencies` は `{ value, dependencies, viewIds }` を返します。トレースはそのまま出力へ渡し、手で組み立て直さないでください。

:::callout[注意]{type=warning}
Derived View は公開状態で絞り込みません。`manifest.discoverableEntries` または `manifest.routableEntries` から自分で選別してください。明示的な非公開境界がない限り、[[glossary/draft|draft]]、scheduled、[[glossary/unlisted|unlisted]] をシリアライズしてはいけません。
:::

### 出力依存関係

Derived View の追跡は値キャッシュを、出力依存関係は静的出力の無効化を担います。この2つは別の仕組みです。

- Core は、解決した View ID ごとにバージョン付きの `derived-view` 出力依存関係を付与します。定義や子 View のバージョンが変われば、プリミティブな Content 依存が変わらなくても、その出力は再生成されます。
- 追跡した Query 依存は fingerprint 付きの `derived-query` 出力依存関係になります。クエリ結果が変われば出力は再生成されます。fingerprint 化できない Query は `unknown` になります。
- `derivedViewIds` 内の重複 ID は重複排除されます。未登録の View を参照した出力計画は、バージョンなしの依存関係を出さずに失敗します。

View が追跡していない入力（View の入力や site 設定など、シリアライズ結果を変えうるもの）がある場合は、通常の `dependencies` も併せて指定してください。

同梱の [[plugins/hover-preview|hover-preview]] プラグインは、共有プレビュー索引を Derived View で解決し、明示的な global 出力依存関係をそのまま残しています。

## デバッグ

開発時は、[[framework/inspector|Inspector]] のレポートで、登録済み View ごとのバージョン、直近の依存関係、キャッシュ状態、再計算理由、実行時間、失敗またはキャンセル状態、`derivedViewIds` で宣言した出力パスを確認できます。Derived タブでは検索、状態フィルタ、依存関係の詳細を表示し、一度も実行されていない View と、キャッシュされずに実行された View を区別します。レポートを読んでも View が解決されたり、[[glossary/build-state|ビルド状態]]が変更されたりすることはありません。Inspector のデータが本番成果物へ出力されることもありません。Endpoint の待ち受けとセキュリティについては [[framework/inspector|Inspector]] を参照してください。

同じビルドのスナップショットは[[build-system/provenance|データ来歴]]にも渡され、各 View のバージョン、依存関係、キャッシュ状態が、ソースや出力と一緒に保存されます。ビルド単位の記録は `riebeckite inspect provenance` で確認できます。

## 本番ビルド

[[honox-integration|HonoX]] の [[glossary/ssg|SSG]] も同じ生成出力を消費します。View を使う出力は、通常の生成出力と同じく full、[[glossary/incremental-build|incremental]]、no-change ビルドに参加し、出力ツリーはクリーンビルドと一致します。

Worker のリクエスト時に解決する場合、永続キャッシュは使われません。リクエスト時の View は小さく保ってください。

## API リファレンス

```ts
import {
  createDerivedViewRegistry,
  defineDerivedView,
  derivedDependenciesToOutputDependencies,
  type DerivedViewRegistry,
} from "@riebeckite/core";
```

| API | 用途 |
| --- | --- |
| `defineDerivedView<TInput, TResult>({ id, version, input?, output?, compute })` | View を宣言する。 |
| `context.derived` | プラグインコンテキストで使うレジストリ。`resolve` と `resolveWithDependencies` は以下と同じ。ライフサイクルフックと生成出力の計画では必須で、その他のフックでは任意。 |
| `registry.resolve(view, input, { signal? })` | 定義または ID で解決し、値を返す。 |
| `registry.resolveWithDependencies(view, input)` | 出力計画用に `{ value, dependencies, viewIds }` を返す。 |
| `createDerivedViewRegistry(options?)` | レジストリを作る。PluginCache、クエリ対象、依存関係の fingerprint を渡す。 |
| `registry.register(view)` | View を登録する。ID が重複すると例外になる。 |
| `registry.versionOf(id)` | 登録済みのバージョン、または `undefined` を返す。 |
| `registry.inspect()` | View を再実行せず、直近の実行記録を返す。 |
| `registry.status()` | View ごとに `{ id, version, pending }` を返す。 |
| `registry.dispose()` | 進行中の処理を中断し、待機中の利用者を解放する。 |
| `derivedDependenciesToOutputDependencies(deps)` | 追跡した依存関係を出力依存関係へ変換する。 |

## トラブルシューティング

- **"already registered"** — 有効なプラグイン集合内で、グローバルに一意で安定した ID を使います。
- **"cycle detected"** — View の呼び出しが有向非巡回グラフになるように計算を分けます。
- **毎回キャッシュミスになる** — Core が再照合できる [[glossary/fingerprint|fingerprint]] で依存関係を追跡し、JSON 互換の結果を返し、`unknown` を避けます。
- **外部データが古い** — external-dependency 契約で解決し、その snapshot fingerprint を追跡します。通常の依存関係として手動で扱わないでください。
- **リクエスト固有のデータが必要** — Worker ハンドラーで解決します。リクエスト時はキャッシュされないため、View は小さく保ってください。

## 性能

ヒット時は追跡済み依存関係の再照合だけを行い、`compute` を省略します。値キャッシュは再起動をまたいで共有されます。

生成出力の計画時には、ファイルの fingerprint 化のために [[glossary/content-source|Content Source]] を一度走査します。任意のファイルが必要でない View では、`content`、`frontmatter`、`query` 依存を優先してください。`benchmarks/` のベンチマークは、1,000 エントリの Vault とエントリごとの Content 依存 1 件を測定します。変更を比較するときは同じ条件を使ってください。

依存関係の snapshot はパスを正規化するため、ファイル依存と Content 依存は Windows と Linux で同じように動作します。CI は Core、HonoX、CLI、型検査を両プラットフォームで実行します。
