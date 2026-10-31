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

`content` と `external` は runtime snapshot を利用できるときに照合します。`planGeneratedOutputs` 中は、`file`・`frontmatter`・条件を明示した `query`・`graph` も、その出力計画の build snapshot と照合します。計画段階以外では、現在の snapshot がない依存関係は安全に Cache Miss になります。frontmatter には `property` を、query には結果集合を決めるすべてのプロパティを指定してください。ファイルの追加・削除・内容変更、unlisted や private を含む全 manifest エントリの query メンバー変化、graph edge の変化はキャッシュ値を無効にします。条件を明示しない query はキャッシュされません。時計、snapshot を持たないネットワーク、環境変数、乱数など、fingerprint を証明できない入力には `unknown` を使います。`unknown` を含む結果は保存されません。

Content Query では、実際に読んだエントリだけでなく公開結果集合全体を fingerprint 化してください。追加・削除・フィルタやソートに使う Frontmatter・公開状態の変更も含めます。query が受け付けるプロパティ名は `content-query` 出力依存関係と同じで、`file.name`・`file.path`・`file.slug`・`file.folder`・`file.title`・`file.link`・`file.permalink`・`file.tags`・`file.size`・`file.ctime`・`file.mtime`・`file.links`・`file.backlinks`・`file.content`、または frontmatter のパスです。`file.content` はレンダリング後の本文を fingerprint 化するため、本文検索を含む述語も安全にキャッシュできます。ソートに使うプロパティも必ず宣言してください。Core は公開状態にかかわらず全 manifest エントリを fingerprint 化するため、routable な計画から見える unlisted エントリの追加・削除・編集も値を無効にします。JavaScript の状態、設定、または宣言していないプロパティに依存する述語は追跡できません。query を過少に宣言せず `unknown` を使ってください。

External 依存関係は既存の `resolveExternalDependencies` フックを使います。View は snapshot を ID で追跡し、現在の snapshot の fingerprint が一致する間だけ結果を再利用します。fingerprint の変化、snapshot の欠損、`unavailable` の解決、external ID の重複は Cache Miss になります。snapshot の値そのものは派生キャッシュへ保存しません。

## 公開データと出力

Derived View は自動ではシリアライズされません。Worker リクエストからも解決できますが、リクエスト時の解決では永続キャッシュを使わないため、小さい処理にとどめてください。Generated Output の計画では `derived` コンテキストから解決できます。値を公開するプラグインは、`manifest.discoverableEntries` または `manifest.routableEntries` から自分で選別する必要があります。公開境界が明示的でない限り、draft、scheduled、unlisted をシリアライズしてはいけません。

Generated Output には、View のトレース外にある入力のために通常の `OutputDependency` を宣言できます。Derived View の追跡は値キャッシュ、Output Dependency は静的出力の無効化を担います。Core は解決した View ID ごとにバージョン付きの `derived-view` 出力依存関係を付与するため、プリミティブな Content 依存が変わらなくても、定義や子 View のバージョン変化で所有出力が再生成されます。この分離により、incremental output planning と開発時 Route Manifest の高速経路は変わりません。

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

開発時の Inspector レポートには、登録済み View ごとのバージョン、直近の依存関係、キャッシュ状態、再計算理由、実行時間、失敗またはキャンセル状態、`derivedViewIds` で宣言した生成出力のパスが含まれます。Inspector の Derived タブはこの読み取り専用データを、検索、状態フィルタ、依存関係と出力の詳細、未実行とキャッシュなし実行の区別付きで表示します。このレポートの読み取りで View を解決したり、BuildState を変更したりすることはありません。

HonoX の SSG も同じ生成出力を消費します。View を使う出力は通常の生成出力と同じく full・incremental・no-change ビルドに参加し、出力ツリーは clean ビルドと一致します。テストではタイトル変更と公開状態の遷移に追従する派生 SSG 出力、および Inspector のブラウザテストで Derived タブを検証します。

## プラットフォームと性能

依存関係の snapshot はパスを正規化するため、ファイル依存と Content 依存は Windows と Linux で同じように動作します。CI は Core、HonoX、CLI、型検査を両プラットフォームで実行します。

Cache Hit では追跡済み依存関係の再照合だけを行い、`compute` を省略します。値キャッシュはビルド時の PluginCache に保存され、再起動をまたいで共有されます。Cache Miss では入力 fingerprint、`compute`、1 回のキャッシュ書き込みが加わります。`benchmarks/` のベンチマークは 1000 エントリの Vault とエントリごとの Content 依存 1 件を測定します。変更を比較するときは同じ条件を使ってください。Generated Output の計画時にはファイル fingerprint のために Content Source を一度走査するため、任意ファイルを必要としない View では Content・Frontmatter・Query 依存を優先してください。

## トラブルシューティング

- **"already registered"**: 有効なプラグイン集合内でグローバルに一意かつ安定した ID を使います。
- **"cycle detected"**: View 呼び出しが有向非巡回グラフになるよう計算を分けます。
- **毎回 Cache Miss になる**: Core が再照合できる fingerprint で依存関係を追跡し、JSON 互換の結果を返します。
- **外部データが古い**: external-dependency 契約で解決し、その snapshot fingerprint を追跡します。通常の依存関係として手動で扱わないでください。
- **リクエスト固有のデータが必要**: Worker handler で解決します。リクエスト時はキャッシュされないため、View は小さい処理にとどめます。
