# @riebeckite/plugin-mdx

<!-- Generated from docs/docs/plugins/mdx.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Riebeckiteに信頼済みMDXコンテンツを追加します。MDXページではMarkdown、JSX、JavaScript式、ESM import/export、ローカルのHono JSXコンポーネントを利用できます。

[English](./README.md)

## インストール

```sh
npm install @riebeckite/plugin-mdx
```

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import mdx from "@riebeckite/plugin-mdx";

export default defineConfig({
  plugins: [mdx({ trusted: true })],
});
```

`trusted: true`は必須です。MDXはサーバー描画と静的生成中に著者のJavaScriptを実行するため、信頼できるコンテンツだけで有効にしてください。指定しない場合、設定時にエラーになります。

## MDXを書く

設定したcontentディレクトリに`.mdx`ファイルを配置します。frontmatterと公開メタデータはMarkdownファイルと同じように扱われます。

```mdx
---
title: Release notes
publish: true
---

export const version = "1.0";
import { Badge } from "./badge";

# Version {version}

<Badge>Stable</Badge>
```

MDXモジュールと相対importはViteが解決します。JSXは開発時のSSRと本番SSGでHono JSXランタイムにより描画されます。

## コンポーネント

すべてのMDXページで使うコンポーネントは`components`で渡します。

```ts
plugins: [
  mdx({
    trusted: true,
    components: { Callout },
  }),
]
```

ページやページ群だけで使うコンポーネントには、ローカルの相対importを使用してください。

## Markdownとの共存

Markdownの既存動作は変わりません。同じslugになる`.md`と`.mdx`は作成しないでください。Riebeckiteはどちらかを任意に選ばず、衝突として報告します。
