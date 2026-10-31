---
date: 2026-10-31
title: 派生データ
sidebar:
  label: 派生データ
---

# 派生データ

Derived View は、ビルド中にプラグイン間で共有できる、名前付き・型付きの非同期計算です。Markdown の入力ではなく、Content Graph にノードも追加しません。

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

## 契約

各 View には、安定した `id`、必須の `version`、任意の `input` / `output` スキーマ、非同期の `compute(input, context)` を定義します。スキーマは `parse(value)` を持つ任意のオブジェクトです。Core は特定の検証ライブラリに依存しないため、アプリケーションは既存の検証ライブラリを使えます。入力には `Date` を含められますが、それ以外は決定的な JSON 相当の値、配列、プレーンオブジェクトに限ります。永続キャッシュに保存する結果は、引き続き JSON に限られます。

View はプラグインの `derivedViews` 配列に登録します。`context.derived.resolve(view, input)` は、定義または ID から View を解決します。ID が重複していると、プラグインの解決時に失敗します。再帰呼び出しは、循環経路の全体を示して失敗します。同じ View、バージョン、入力への同時要求は1つの計算を共有し、エラーはすべての呼び出し元へ伝播します。失敗した結果を成功値として保持することはありません。

View の中から別の View を呼ぶ場合は `context.resolve()` を使います。子 View の依存関係とバージョンは、キャッシュヒット時も含めて親 View へ伝播します。子 View のバージョンが変わると、キャッシュされた親 View は無効になります。

## 依存関係とキャッシュ

View は、既存の PluginCache を Core 専用の名前空間で利用します。結果が JSON で、すべての依存関係を追跡できる場合だけ保存します。キャッシュには、View のバージョン、入力 fingerprint、結果、追跡済み依存関係の fingerprint を保存します。壊れたエントリや読めないエントリはキャッシュミスとして扱います。

入力以外の依存関係は `context.track()` で追跡します。

```ts
context.track({ type: "content", id: "notes/release" });
```

fingerprint はすべて Core が計算するため、呼び出し側が指定することはありません。`content`・`external`・`file`・`frontmatter` は runtime snapshot と照合します。`planGeneratedOutputs` の実行中は、`file`・`frontmatter`・`query` もその出力計画の build snapshot と照合します。計画段階以外では、現在の snapshot がない依存関係は安全にキャッシュミスになります。

`content` の id は content index で解決し、元の Markdown を fingerprint 化します。そのため、本文の編集、リネーム、alias の付け替えで無効になります。frontmatter には `property` を指定します。時計、snapshot を持たないネットワーク、環境変数、乱数など、fingerprint を証明できない入力には `unknown` を使います。`unknown` を含む結果は保存されません。

Content Query は既存の Content Query エンジンを使い、依存関係を自身で記録します。

```ts
const entries = context.query("releases", {
  pool: "discoverable",
  filter: { tags: { any: ["release"] } },
  sort: { field: "date", order: "desc" },
});
```

どのフィルタ・ソート項目が使われるかは、定義から決まります。Core がクエリを実行し、結果集合全体を fingerprint 化します。そのため、フィルタ項目、ソート項目、メンバーの追加・削除、公開状態の遷移、frontmatter、レンダリング後の本文、links、backlinks が、プロパティ宣言なしで網羅されます。`pool` の既定値は `discoverable` です。unlisted を含みうる出力では `routable` を指定します。結果集合を fingerprint 化できない場合、その値はキャッシュされません。

動的な `where` 述語は、定義から導出できません。指定すると、結果は `unknown` として追跡されます。値は保存されず、その生成出力は常に再生成されます。フィルタはクエリ定義で表現してください。

External 依存関係には、既存の `resolveExternalDependencies` フックを使います。View は snapshot を ID で追跡し、現在の snapshot の fingerprint が一致する間だけ結果を再利用します。fingerprint の変化、snapshot の欠損、`unavailable` の解決、external ID の重複が起きると、キャッシュミスになります。snapshot の値そのものは派生キャッシュへ保存しません。

## 公開データと出力

Derived View は自動ではシリアライズされません。Worker リクエストからも解決できますが、リクエスト時の解決では永続キャッシュを使わないため、小さい処理にとどめてください。Generated Output の計画では、`derived` コンテキストから View を解決できます。値を公開するプラグインは、`manifest.discoverableEntries` または `manifest.routableEntries` から自分で選別する必要があります。公開境界が明示的でない限り、draft、scheduled、unlisted をシリアライズしてはいけません。

Generated Output には、View のトレース外にある入力のために通常の `OutputDependency` を宣言できます。Derived View の追跡は値キャッシュを、Output Dependency は静的出力の無効化を担います。Core は、解決した View ID ごとにバージョン付きの `derived-view` 出力依存関係を付与します。そのため、プリミティブな Content 依存が変わらなくても、定義や子 View のバージョン変化で所有出力が再生成されます。重複した View ID は重複排除され、未登録の View を参照した出力計画は、バージョンなしの依存関係を出さずに失敗します。この分離により、incremental output planning と開発時 Route Manifest の高速経路は変わりません。

Generated Output が View の値を使う場合は、依存関係のトレースを保持したまま出力へ渡します。

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

Core は、追跡された依存関係を出力計画へ保存する前に変換します。Query 依存は fingerprint 付きの `derived-query` 出力依存関係になるため、クエリ結果が変われば所有出力は再生成されます。fingerprint 化できない query は `unknown` になります。シリアライズ結果を変えうる View 入力や site 設定など、View が追跡していない入力がある場合は、明示的な `dependencies` を併用してください。

同梱の `hover-preview` プラグインは、共有プレビュー索引を Derived View で解決します。明示的な global 出力依存関係はそのまま残すため、増分無効化とシリアライズ結果は変わりません。

開発時の Inspector レポートには、登録済み View ごとの状態が含まれます。内訳は、バージョン、直近の依存関係、キャッシュ状態、再計算理由、実行時間、失敗またはキャンセル状態、`derivedViewIds` で宣言した生成出力のパスです。Inspector の Derived タブは、この読み取り専用データを表示します。検索、状態フィルタ、依存関係と出力の詳細、未実行とキャッシュなし実行の区別を備えています。このレポートを読んでも、View が解決されたり BuildState が変更されたりすることはありません。Inspector のデータ Endpoint は loopback のみで待ち受け、セッションごとのトークンを要求します。loopback 以外の bind、Host、Origin、接続元、転送ヘッダーを経由した要求は拒否します。Inspector のデータが本番成果物へ出力されることはありません。

HonoX の SSG も同じ生成出力を消費します。View を使う出力は、通常の生成出力と同じく full・incremental・no-change ビルドに参加し、出力ツリーはクリーンビルドと一致します。テストでは、タイトル変更と公開状態の遷移に追従する派生 SSG 出力を検証します。Inspector のブラウザテストでは Derived タブを検証します。

## プラットフォームと性能

依存関係の snapshot はパスを正規化するため、ファイル依存と Content 依存は Windows と Linux で同じように動作します。CI は Core、HonoX、CLI、型検査を両プラットフォームで実行します。

キャッシュヒット時は、追跡済み依存関係の再照合だけを行い、`compute` を省略します。値キャッシュはビルド時の PluginCache に保存され、再起動をまたいで共有されます。キャッシュミス時は、入力 fingerprint、`compute`、1回のキャッシュ書き込みが加わります。`benchmarks/` のベンチマークは、1,000 エントリの Vault とエントリごとの Content 依存 1 件を測定します。変更を比較するときは同じ条件を使ってください。生成出力の計画時には、ファイル fingerprint のために Content Source を一度走査します。そのため、任意ファイルを必要としない View では、Content・Frontmatter・Query 依存を優先してください。

## トラブルシューティング

- **"already registered"**: 有効なプラグイン集合内でグローバルに一意かつ安定した ID を使います。
- **"cycle detected"**: View の呼び出しが有向非巡回グラフになるように計算を分けます。
- **毎回キャッシュミスになる**: Core が再照合できる fingerprint で依存関係を追跡し、JSON 互換の結果を返します。
- **外部データが古い**: external-dependency 契約で解決し、その snapshot fingerprint を追跡します。通常の依存関係として手動で扱わないでください。
- **リクエスト固有のデータが必要**: Worker handler で解決します。リクエスト時はキャッシュされないため、View は小さい処理にとどめます。
