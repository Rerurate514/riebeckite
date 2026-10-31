---
date: 2026-10-31
title: 派生データ
sidebar:
  label: 派生データ
---

# 派生データ

Derived View は、ビルド中にプラグイン間で共有できる、名前付き・型付きの非同期計算です。Markdown の入力でも Content Graph のノードでもありません。

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

各 View には安定した `id`、必須の `version`、任意の `input` / `output` スキーマ、非同期の `compute(input, context)` を定義します。スキーマは `parse(value)` を持つ任意のオブジェクトです。Core が検証ライブラリに依存せず、既存のライブラリを使えます。入力には `Date` を含められます。その他は決定的な JSON 相当の値、配列、プレーンオブジェクトに限ります。永続キャッシュされる結果は引き続き JSON に限られます。

View はプラグインの `derivedViews` 配列に登録します。`context.derived.resolve(view, input)` は定義または ID から View を解決します。ID の重複はプラグイン解決時に失敗します。再帰呼び出しは循環経路を含めて失敗します。同じ View、バージョン、入力への同時要求は一つの計算を共有し、エラーはすべての呼び出し元へ伝播します。失敗結果を成功値として保持しません。

View 内から別の View を呼ぶ場合は `context.resolve()` を使います。子 View の依存関係とバージョンは、キャッシュヒット時も含めて親 View へ伝播します。子 View のバージョンが変わると、キャッシュされた親 View は無効になります。

## 依存関係とキャッシュ

View は既存の PluginCache を Core 専用の名前空間で利用します。結果が JSON であり、すべての依存関係を追跡できる場合だけ保存します。キャッシュには View のバージョン、入力 fingerprint、結果、追跡済み依存関係の fingerprint を保存します。壊れた、または読めないエントリは Cache Miss です。

入力以外の依存関係は、結果を返す前に追跡します。

```ts
context.track({
  type: "content",
  id: "notes/release",
  fingerprint: sourceFingerprint,
});
```

`content` と `external` は runtime snapshot を利用できるときに照合します。`planGeneratedOutputs` 中は、`file`・`frontmatter`・条件を明示した `query`・`graph` も、その出力計画の build snapshot と照合します。計画段階以外では、現在の snapshot がない依存関係は安全に Cache Miss になります。frontmatter には `property` を、query には結果集合を決めるすべてのプロパティを指定してください。ファイルの追加・削除・内容変更、discoverable な query メンバーの変化、graph edge の変化はキャッシュ値を無効にします。条件を明示しない query はキャッシュされません。時計、snapshot を持たないネットワーク、環境変数、乱数など、fingerprint を証明できない入力には `unknown` を使います。`unknown` を含む結果は保存されません。

Content Query では、実際に読んだエントリだけでなく公開結果集合全体を fingerprint 化してください。追加・削除・フィルタやソートに使う Frontmatter・公開状態の変更も含めます。

## 公開データと出力

Derived View は自動ではシリアライズされません。Worker リクエストからも解決できますが、リクエスト時の解決では永続キャッシュを使わないため、小さい処理にとどめてください。Generated Output の計画では `derived` コンテキストから解決できます。値を公開するプラグインは、`manifest.discoverableEntries` または `manifest.routableEntries` から自分で選別する必要があります。公開境界が明示的でない限り、draft、scheduled、unlisted をシリアライズしてはいけません。

Generated Output には、View のトレース外にある入力のために通常の `OutputDependency` を宣言できます。Derived View の追跡は値キャッシュ、Output Dependency は静的出力の無効化を担います。この分離により、incremental output planning と開発時 Route Manifest の高速経路は変わりません。

Generated Output が View の値を使う場合は、依存関係のトレースを保持して出力へ渡します。

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

Core は、追跡された content・file・external・完全なプロパティ集合を持つ query・graph の依存関係を、既存の出力依存関係へ変換してから出力計画に保存します。完全なプロパティ集合を持たない query は `unknown` となり、安全側で再生成を要求します。View が追跡していない入力、たとえばシリアライズ結果を変えうる View 入力や site 設定がある場合は、明示的な `dependencies` を併用してください。

同梱の `hover-preview` プラグインは、共有プレビュー索引を Derived View で解決します。明示的な global 出力依存関係はそのまま残すため、増分無効化とシリアライズ結果は変わりません。

開発時の Inspector レポートには、登録済み View ごとのバージョン、直近の依存関係、キャッシュ状態、再計算理由、実行時間、失敗またはキャンセル状態、`derivedViewIds` で宣言した生成出力のパスが含まれます。このレポートの読み取りで View を解決したり、BuildState を変更したりすることはありません。

## トラブルシューティング

- **"already registered"**: 有効なプラグイン集合内でグローバルに一意かつ安定した ID を使います。
- **"cycle detected"**: View 呼び出しが有向非巡回グラフになるよう計算を分けます。
- **毎回 Cache Miss になる**: Core が再照合できる fingerprint で依存関係を追跡し、JSON 互換の結果を返します。
- **外部データが古い**: external-dependency 契約で解決し、その snapshot fingerprint を追跡します。通常の依存関係として手動で扱わないでください。
- **リクエスト固有のデータが必要**: Worker handler で解決します。リクエスト時はキャッシュされないため、View は小さい処理にとどめます。
