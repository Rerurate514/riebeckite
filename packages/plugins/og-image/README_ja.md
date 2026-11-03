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

`card`、`minimal`、`editorial` のプリセットを使えます。レイアウトには Satori、PNG 化には Sharp を使います。Noto Sans JP（OFL-1.1）を同梱しているため、対応 OS ではシステムフォントの有無にかかわらず日本語を決定的に描画します。

## 優先順位と出力

frontmatter で `ogImage` または `image` を明示した場合、その値は変更しません。指定がない場合は、プラグインがフィンガープリント付きの `/_og/*.png` パスを設定し、遅延生成出力として登録します。画像を生成できるのはルーティング可能な公開・限定公開コンテンツだけであり、下書きや公開時刻前のコンテンツがこのパスから公開されることはありません。

既存の SEO プロバイダーは `frontmatter.ogImage`、`image`、サイト既定値の順に参照するため、SEO プロバイダーを追加したり、Open Graph タグを重複出力したりしません。

## キャッシュ

レンダラーは SSG の出力プランが PNG を変更ありと判定した後にだけ実行します。キャッシュ済みで変更のない出力は Sharp を実行せず再利用されます。出力フィンガープリントにはページ識別子、外観・表示設定、レンダラーバージョンが含まれます。

## TSX レイアウト

TSX ファイルのパスを指定してカスタムレイアウトを使えます。ビルド時にソースファイルをバンドルし、変更時は影響する画像だけをキャッシュ無効化します。

```ts
ogImage({
  layout: "./og-layout.tsx",
});
```

```tsx
import { defineOgLayout } from "@riebeckite/og-image";

export default defineOgLayout(({ page, palette, site }) => (
  <div
    style={{
      backgroundColor: palette.background,
      color: palette.foreground,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      justifyContent: "space-between",
      padding: 64,
      width: "100%",
    }}
  >
    <div>{site.title}</div>
    <div style={{ fontSize: 68, fontWeight: 700 }}>{page.title}</div>
  </div>
));
```

レイアウトは default export が必要です。サイトで設定した Hono JSX runtime と、Satori が対応する Flexbox CSS の範囲で記述します。SVG を返す関数も継続して使えますが、キャッシュ無効化のため `layoutFingerprint` が必要です。

## Development Inspector

開発中は **OG画像** タブに、使用中のプリセット、レイアウトのソース、出力プレフィックス、解決済みの配色を表示します。画像の出力は、静的ビルドで必要になるまで遅延したままです。
