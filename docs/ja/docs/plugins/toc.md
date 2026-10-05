# Table of Contents

記事の見出しから目次を生成・表示する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-toc
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

長い記事に複数の見出しを置くと、読者が現在位置を確認しながら各セクションへ移動できる目次を提供できます。

```markdown
# Plugin Guide
## Installation
## Configuration
## Usage
## Troubleshooting
```

このページのサイドバーにある「CONTENTS」に目次が並び、スクロールに合わせて現在の節が強調されます。節が2件未満のページでは表示されません。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/toc/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

