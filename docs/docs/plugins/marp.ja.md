# Marp

Marp 形式の Markdown スライドを扱うための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-marp
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

Markdownから作ったMarpスライドをRiebeckiteのコンテンツとして扱いたい場合に利用します。発表資料と通常の記事を同じリポジトリで管理する用途に向いています。

### ソース

````markdown
```marp title="Intro deck"
# First slide

- a bullet

---

# Second slide
```
````

### 実行例

```marp title="Intro deck"
# First slide

- a bullet

---

# Second slide
```

## 有効化の条件

Obsidian の Marp 系プラグインはプラグイン単位で有効化し、ノート全体をデッキとして扱います。Riebeckite は文書単位で、frontmatter の `marp: true` を合図にします。Marp CLI や VS Code 拡張と同じ合図です。Obsidian でスライド表示していたノートでも、`marp: true` がなければデッキにはなりません。この 1 行を足せば、区切りの `---`、`theme` や `paginate` などのディレクティブを含め、保存済みのデッキ内容をそのまま描画します。出力は Marp の意味論に従いますが、プラグイン単位の自動有効化までは再現しないため、内容の互換性はあってもそのまま置き換えられるわけではありません。

ノート内に `marp` のコードフェンスを書くと、そのブロックだけをインラインデッキとして描画します。コードブロックの `title` を指定するとキャプションになります。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.ja.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.ja.md) を参照してください。

