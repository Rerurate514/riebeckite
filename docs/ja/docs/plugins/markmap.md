# Markmap

Markdown の階層構造をマインドマップとして表示する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-markmap
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

見出し構造を持つ Markdown をマインドマップとして見せたい記事で利用できます。

### ソース

```markdown
# Riebeckite
## Core
## Plugins
### Mermaid
### Search
## Themes
```

### 実行例

```markmap
# Riebeckite
## Core
## Plugins
### Mermaid
### Search
## Themes
```

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

