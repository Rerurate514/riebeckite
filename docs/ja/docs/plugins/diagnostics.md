# Diagnostics

ビルド、Plugin、サイト全体のコンテンツ整合性を確認するための診断情報を提供する Plugin です。

公開サイトを構築するときに解決された情報を利用して、次のような問題を検出します。

- 存在しないページへのサイト内リンク
- 解決できない Wikiリンク
- 存在しない画像や添付ファイルへの参照
- 公開パスの重複
- リダイレクト先の欠落、衝突、循環

検査には、Riebeckite が実際のサイト生成に使用する公開パスやリダイレクト、Plugin が提供するページ・アセット・生成ファイルの情報を使用します。そのため、permalink、alias、rename、l10n、公開・除外設定、Page System などを適用した後の状態を基準に判定します。

外部 URL の疎通確認、SEO、Lighthouse、自動修復は行いません。`http:`、`https:`、`mailto:`、`tel:`、`data:` などの外部参照は検査対象外です。また、サイト内リンクの存在確認ではクエリ文字列とフラグメントを除いて判定します。

## 実装上の判定基準

サイト全体のコンテンツ整合性は、解決済みの manifest を基準に検査します。`ContentPublicLocation`、公開エントリ、公開リダイレクト、Page Type の公開パス、Plugin のアセット、生成出力を参照することで、実際に公開されるサイトと同じ前提でリンク先の存在を判定します。

## 導入

```bash
npm install @riebeckite/plugin-diagnostics
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

Pluginやコンテンツ処理の問題を調査するときに、診断情報を得るために利用します。開発時や「どの処理で問題が起きたか」を切り分けたい場合に向いています。

ビルド後に manifest へ `broken-wikilink` や `orphan-note`、`missing-frontmatter` などの診断コードが出ます。`riebeckite-diagnostics` CLI を使ってレポートとして確認することもできます。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/diagnostics/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

