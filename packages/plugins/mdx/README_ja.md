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

静的な相対importは増分ビルドで追跡されます。import先のローカルファイルを変更すると、そのMDXページが再ビルドされます。`.mdx`ファイルの追加・削除時には開発サーバーを再読み込みします。

検索、抜粋、読了時間、見出しはMDXソースの静的なテキスト投影から生成されます。投影はMDXを構文木として解析し、見出し・段落・リスト・リンクなどのMarkdown構造を保ち、frontmatter、import/export宣言、JavaScript式、JSX属性を除外します。JSXの子要素にある静的なMarkdownは保持します。これらの派生出力ではコンポーネントを実行しないため、コンポーネントが描画時に生成するテキストは含まれません。不正なMDXは部分的な投影を返さず、ビルドを失敗させます。

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

[Plugin APIのコンポーネントレジストリ](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api/ui-and-assets.ja.md#markdown-コンポーネント)に登録したプラグインコンポーネントは、すべてのMDXページでも利用できます。Markdownフェンスと同じpropsをJSXとして渡します。

```mdx
<CodeCopy text="npm install" label="Copy command" copiedLabel="Copied" />
```

MDXは別実装のレジストリではなく、Markdownと同じレジストリを受け取ります。`mdx({ components })`で同じ名前のコンポーネントを渡した場合、そのMDXページではプラグインコンポーネントより優先されます。対話的なプラグインコンポーネントは、そのページが描画したときだけ読み込まれてハイドレートされます。

## Markdownとの共存

Markdownの既存動作は変わりません。同じslugになる`.md`と`.mdx`は作成しないでください。Riebeckiteはどちらかを任意に選ばず、衝突として報告します。

## プレビュー

パッケージのプレビューはMarkdownのみを描画します。MDXページは、ViteでMDXとそのimportを解決するサイトの開発サーバーでプレビューしてください。
