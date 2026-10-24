# @riebeckite/plugin-icons

<!-- Generated from docs/docs/plugins/icons.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

[English](./README.md)

Obsidian の Iconize と Iconic で設定済みのアイコンを読み取り、静的サイトに
表示するプラグインです。アイコンはビルド時に一度だけ解決され、ナビゲーション、
フォルダページ、検索、記事タイトル、タグ一覧、プロパティパネルへ構造化データ
として渡されます。

## インストール

```bash
pnpm add @riebeckite/plugin-icons
```

## 使い方

```ts
import { icons } from "@riebeckite/plugin-icons";

export default {
  plugins: [icons()],
};
```

設定は不要です。Obsidian vault の
`.obsidian/plugins/obsidian-icon-folder/data.json` と
`.obsidian/plugins/iconic/data.json` を探します。コンテンツディレクトリが
vault のサブディレクトリにある場合は、vault からの相対パスも自動で推定します。

## アイコンの表示箇所

- ナビゲーション項目と、ページを持たないフォルダ項目
- 自動生成されるフォルダページと、そのページ・フォルダ一覧
- ノートにファイルアイコンがある場合の記事タイトル
- 検索結果
- 記事メタデータのタグと、タクソノミーのタグページ
- プロパティパネルのプロパティ名

Markdown のインラインアイコンは、見出し、段落、リスト、テーブル、引用内で
表示されます。コードブロック、インラインコード、リンク、URL、生の HTML、
エスケープしたコロンは変更しません。

## Iconize

次の設定とデータに対応します。

- vault 相対パスをキーにしたファイル・フォルダアイコン
- 順序、ファイル名またはフルパス一致、色、`everything` / `files` /
  `folders` の対象範囲を持つカスタムルール
- frontmatter のアイコンと色（フィールド名の変更を含む）
- 設定した識別子（既定は `:`）によるインラインアイコン
- `LiRocket` のような Lucide アイコン
- 設定したアイコンパックディレクトリ配下のフォルダ型カスタムパック
- アイコン単位の色、ルールの色、グローバルなアイコン色

パスに直接設定したアイコンはカスタムルールより優先されます。これは Iconize
と同じ挙動です。ルールは `order` の昇順で評価し、正規表現が不正な場合は部分
文字列一致にフォールバックします。値が絵文字そのものであれば絵文字として
表示します。

## Iconic

次の設定とデータに対応します。

- vault 相対パスをキーにしたファイル・フォルダアイコン
- `fileRules` と `folderRules`
- ルールのアイコンと色（9 種類の名前付きテーマ色を含む）
- `tagIcons` と `propertyIcons`
- 名前、ファイル名、拡張子、ツリー、パス、タグ、プロパティ、リンク、
  埋め込み、作成日時、更新日時を対象にした条件
- `is`、`contains`、`startsWith`、`endsWith`、`matches`、`hasValue`、
  `hasProperty`、真偽値・数値・配列の演算子、`!` による否定、
  `all` / `any` / `none` の条件グループ

Iconic のルールは配列順に評価し、有効な最初の一致を採用します。一致した
ルールは手動設定のファイルアイコンを上書きします。Obsidian と同じ挙動です。

## インラインアイコン

既定の構文は `:name:` です。

- `:rocket:`、`:smile:`、`:warning:`、`:book:` は絵文字になります。
- 絵文字名が見つからない場合は、同じ名前の Lucide アイコンを使います。
- `:LiRocket:` は Lucide アイコンを直接指定します。
- `:MyPackRocket:` のようにパック名を付けると、カスタムパックのアイコンを
  使います。
- 解決できない名前はそのままの文字列で残します。

アイコンは周囲のフォントサイズと色を継承します。色が未設定のときは
`currentColor` を使うため、ライトテーマとダークテーマの両方で追加の CSS は
不要です。アイコンは装飾として `aria-hidden="true"` を付け、スクリーン
リーダーが二重に読み上げないようにしています。

## 優先順位

複数のソースにアイコンがある場合、既定の順序は次のとおりです。

1. `overrides` オプション
2. ノートの frontmatter
3. Iconic
4. Iconize

順序は変更できます。ソース内部では上流の規則を維持します。Iconize は直接
設定をカスタムルールより優先し、Iconic は最初に一致したルールを手動設定より
優先します。

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `sources` | `("iconize" \| "iconic")[]` | 両方 | 読み取るアイコンソース。 |
| `inline` | `boolean` | `true` | Markdown のインラインアイコンを解決する。 |
| `frontmatter` | `boolean` | `true` | frontmatter のアイコンを読む。 |
| `colors` | `boolean` | `true` | 設定されたアイコンの色を適用する。 |
| `precedence` | `("config" \| "frontmatter" \| "iconic" \| "iconize")[]` | `["config", "frontmatter", "iconic", "iconize"]` | 1 つのアイコンを決めるときのソース順。 |
| `overrides` | `Record<string, string \| { icon: string; color?: string }>` | `{}` | vault パスまたは slug をキーにした明示的なアイコン。 |
| `vaultRoot` | `string` | 自動検出 | Obsidian vault のルート。 |
| `vaultPrefix` | `string` | 自動推定 | コンテンツディレクトリの vault 相対プレフィックス。 |
| `iconize` | `{ enabled?, dataFile?, iconPacks? }` | 自動 | Iconize の上書き設定。 |
| `iconic` | `{ enabled?, dataFile? }` | 自動 | Iconic の上書き設定。 |

vault とサイトが別リポジトリにある場合の例です。

```ts
icons({
  vaultRoot: "../notes",
  vaultPrefix: "content/",
  iconize: { dataFile: "../notes/.obsidian/plugins/obsidian-icon-folder/data.json" },
  iconic: { dataFile: "../notes/.obsidian/plugins/iconic/data.json" },
});
```

明示したデータファイルは vault ルート（vault ルートを指定しない場合は作業
ディレクトリ）の内側になければなりません。

## 対応アイコンパック

Lucide は `lucide-static` から必要なときだけ読み込み、実際に参照された
アイコンだけを出力します。フォルダ型の Iconize パックは、設定されたアイコン
パックディレクトリから読み込みます。Zip のみのパックには対応しません。その
場合はディレクトリへ展開してください。Iconize の `twemoji` は同梱していない
ため、ネイティブ絵文字で表示します。

## 未対応・制約

- Iconic の `clock`、`headings`、`bookmarks`、現在時刻に依存する日時条件は
  静的ビルドでは評価できません。一致しないものとして扱い、理由を診断に
  出力します。ファイルメタデータがある場合、`created` と `modified` の
  絶対日時比較は利用できます。
- Iconic の絵文字色は CSS フィルターで再現しません。絵文字はプラット
  フォーム標準の色で表示されます。
- Obsidian の UI アイコン（リボン、タブ、メニュー、ブックマーク）は対象外
  です。
- 非公開ノートのアイコンは公開 HTML に出力しません。
- 設定ファイルがない場合や壊れている場合は警告を出し、ビルドは継続します。

## セキュリティ

既知の Obsidian 設定ファイルと、設定されたアイコンパックディレクトリだけを
読みます。プラグインの JavaScript は実行せず、`.obsidian` を出力へコピーせず、
vault 全体を任意に走査しません。設定とパックのパスは vault ルート内に制限し、
シンボリックリンクを除外し、ファイルサイズに上限を設けています。

カスタム SVG と Lucide SVG は許可リスト方式のサニタイザを通し、スクリプト、
イベントハンドラ、スタイル、外部参照、危険な URL スキームを除去してから
HTML を出力します。アイコンの描画にクライアント側 JavaScript は使いません。
