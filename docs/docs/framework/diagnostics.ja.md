---
title: Diagnostics
---
# Diagnostics

Diagnostics は、Riebeckite の設定やコンテンツ、プラグイン、実行環境に問題がないかを検査し、開発者に報告するための仕組みです。

単にエラーメッセージを `console.log` へ出すのではなく、

- 何が問題なのか
- どこで問題が起きているのか
- どの程度重要なのか
- どう直せばよいのか

といった情報を、Riebeckite が扱える共通形式の診断情報（diagnostic）として表現します。

これにより、Core や各プラグインが見つけた問題を扱えます。開発診断パッケージはその結果をシリアライズ可能なレポートに変換し、`doctor` と Development Inspector で共有します。

## Diagnostics の流れ

プラグインは `addDiagnostics` を使って独自の診断を追加できます。

追加された診断は Core や integration によって集約され、主に `check` や `doctor` から利用されます。

診断を追加するときは、可能な限り次の情報を明確にしてください。

- 問題が発生する条件
- 問題のあるコンテンツや設定
- 問題の重要度（severity）
- 修正方法（remediation）

たとえば「設定が不正です」とだけ報告するのではなく、「どの設定が不正で、どのように変更すればよいか」まで分かる診断を推奨します。

## `check` と `doctor`

`check` と `doctor` は役割が少し異なります。

`check` は主に設定やプラグインの構成が正しいかを検査します。

`doctor` はそれに加えて、Riebeckite が正常に動作できる状態かをより広く検査します。

Doctor では、1つの検査に失敗しても、可能な限り他の独立した検査を続行します。そのため、複数の問題がある場合でも一度の実行でまとめて確認できます。

問題が見つかった場合、コマンドは non-zero exit code で終了します。

観測できない項目は推測せず、利用できないことを明示します。診断のためだけに full build は実行しません。

Development Inspector は Vite の開発サーバーからだけ利用でき、同じレポートを Shadow DOM のパネルに表示します。production の client module や endpoint には含まれません。パネルはまず Diagnostics を表示し、Dependencies と Output のタブは別の endpoint から読み込みます。そのため、大きな Output Plan が他のタブの表示を遅らせません。Element の source と Component の対応付けは runtime に mapping がないため、現時点では PARTIAL です。

## コンテンツ ID の検査

Riebeckite では、コンテンツを継続的に識別するための「安定コンテンツ ID」を設定できます。

通常はフロントマターの `id` を使用します。

```yaml
---
id: my-article
---
```

この ID は、たとえば analytics プラグインがページごとの閲覧数を記録するときなど、URLとは別にコンテンツそのものを識別したい場合に利用されます。

Diagnostics プラグインは、コンテンツ ID について次の問題を検査します。

| コード | 重要度 | 意味 |
| --- | --- | --- |
| `duplicate-content-id` | error | 複数の公開コンテンツが同じ ID を使用している |
| `invalid-content-id` | error | `id` がコンテンツ ID のルールを満たしていない |

たとえば、2つの記事が同じ ID を持っていると、analytics などで別の記事のデータが同じコンテンツとして扱われる可能性があります。

これらは analytics 専用の検査ではありません。コンテンツ ID を利用するすべての機能に共通する整合性チェックとして Diagnostics が担当します。

## サイト全体のコンテンツ整合性

Diagnostics プラグインは、公開サイト内のリンクや参照が正しく解決できるかも検査します。

たとえば、次のような問題を検出します。

- 存在しないページへのリンク
- 解決できない Wikiリンク
- 存在しない画像や添付ファイルへの参照
- 複数のコンテンツによる公開パスの重複
- 存在しない転送先へのリダイレクト
- 循環しているリダイレクト

これらは `content-integrity:*` の診断として報告されます。

### どの情報を使って検査するのか

整合性検査では、Riebeckite がすでに解決した公開コンテンツや公開パスの情報を使用します。

そのため、Diagnostics のためだけに Markdown をもう一度解析したり、コンテンツを最初から読み直したりすることはありません。

また、permalink、alias、rename、多言語化、公開・除外設定などによって最終的な公開先が変わっている場合も、Riebeckite が解決した結果を基準に検査します。

### HTML の品質検査との違い

Diagnostics が担当するのは、主にサイト全体の参照や構成の整合性です。

一方で、

- 画像に適切な `alt` があるか
- 見出し構造が適切か
- 生成された HTML に問題がないか

といった個々のページの HTML 品質は `@riebeckite/plugin-quality` が担当します。

## プラグインからページやアセットを公開する場合

プラグインが独自のページ、生成ファイル、アセットなどを公開する場合は、Riebeckite が提供する対応する仕組みを使って登録してください。

正しく登録された公開先は Diagnostics からも認識されます。

そのため、たとえばプラグインが `/explore` というページを正式に公開していれば、

```text
/explore
```

へのリンクが「存在しないページ」として誤って報告されることはありません。

## Diagnostics を実装するときのルール

Diagnostics を追加するときは、次の原則に従ってください。

- option validation ではファイルの読み込みや状態変更を行わない
- 安全な結果を判断できない場合は、推測して処理を続けず診断として報告する
- stack trace、token、不要な絶対パスをユーザー向けメッセージへ含めない
- メッセージ文字列ではなく、安定した diagnostic identifier を使って問題を識別する
- 可能な限り具体的な修正方法を示す
- diagnostic の生成中に auto-fix、build、cache 更新、state 更新を行わない

Diagnostics は問題を**発見して説明する仕組み**です。問題を自動的に修正したり、ビルド状態を変更したりする仕組みではありません。

現在の状態そのものを確認したい場合は [Inspector](./inspector.ja.md)、ログやトレースを確認したい場合は [Observability](./observability.ja.md) を参照してください。
