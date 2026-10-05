# Responsive Image

画像を画面サイズに応じて扱いやすくするための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-responsive-image
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

大きな画像を多く含むサイトで、閲覧環境に合わせた画像配信を行いたい場合に利用します。記事側では通常どおり画像を参照し、Pluginに画像処理を任せる構成にできます。

### ソース

```markdown
![[riebeckite-logo-horizontal.png]]
```

### 実行例

![[riebeckite-logo-horizontal.png]]

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/responsive-image/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

