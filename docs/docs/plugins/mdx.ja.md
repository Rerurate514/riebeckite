---
date: 2026-11-11
title: MDX
---
# MDX

Riebeckiteに信頼済みMDXコンテンツを追加します。MDXページではMarkdown、JSX、JavaScript式、ESM import/export、ローカルのHono JSXコンポーネントを利用できます。

[English](./mdx.md)

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

検索、抜粋、見出しはMDXソースの静的なテキスト投影から生成されます。投影はMDXを構文木として解析し、見出し・段落・リスト・リンクなどのMarkdown構造を保ち、frontmatter、import/export宣言、JavaScript式、JSX属性を除外します。JSXの子要素にある静的なMarkdownは保持します。これらの派生出力ではコンポーネントを実行しないため、コンポーネントが描画時に生成するテキストは含まれません。不正なMDXは部分的な投影を返さず、ビルドを失敗させます。

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

## �v���r���[

�p�b�P�[�W�̃v���r���[��Markdown�݂̂�`�悵�܂��BMDX�y�[�W�́AVite��MDX�Ƃ���import����������T�C�g�̊J���T�[�o�[�Ńv���r���[���Ă��������B