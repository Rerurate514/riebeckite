# @riebeckite/plugin-og-image

<!-- Generated from docs/docs/plugins/og-image.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

公開・限定公開コンテンツ向けに、1200×630 の静的 PNG Open Graph 画像を生成します。

[English](./README.md)

## 使い方

```ts
import { ogImage } from "@riebeckite/plugin-og-image";

export default defineConfig({
  plugins: [ogImage({ preset: "card" })],
});
```

`card`、`minimal`、`editorial` のプリセットを使えます。レンダラーは Sharp と SVG テキストを使い、適切なシステムフォントが利用できる環境では日本語も描画します。

## 優先順位と出力

frontmatter で `ogImage` または `image` を明示した場合、その値は変更しません。指定がない場合は、プラグインがフィンガープリント付きの `/_og/*.png` パスを設定し、遅延生成出力として登録します。画像を生成できるのはルーティング可能な公開・限定公開コンテンツだけであり、下書きや公開時刻前のコンテンツがこのパスから公開されることはありません。

既存の SEO プロバイダーは `frontmatter.ogImage`、`image`、サイト既定値の順に参照するため、SEO プロバイダーを追加したり、Open Graph タグを重複出力したりしません。

## キャッシュ

レンダラーは SSG の出力プランが PNG を変更ありと判定した後にだけ実行します。キャッシュ済みで変更のない出力は Sharp を実行せず再利用されます。出力フィンガープリントにはページ識別子、外観・表示設定、レンダラーバージョンが含まれます。

## カスタムレイアウト

SVG 本体を返す関数を渡せます。関数を変更したら更新するバージョン値として、`layoutFingerprint` も指定してください。

```ts
ogImage({
  layoutFingerprint: "brand-layout-v2",
  layout: ({ page, palette }) =>
    `<rect width="1200" height="630" fill="${palette.background}"/><text x="80" y="240" fill="${palette.foreground}" font-size="72">${page.title}</text>`,
});
```
