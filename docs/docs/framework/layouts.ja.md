---
title: Layouts
---

# Layouts

`@riebeckite/layouts` は組み合わせ可能な構造レイアウトプリミティブです。Grid の配置、レスポンシブなレール表示、Sticky offset、レールごとのスクロール、Header のグループ化、Drawer の外枠、レスポンシブ用プリミティブを担当します。Theme は視覚トークンを提供し、Navigation と TOC の内容は各プラグインが描画します。

## Shell の合成

```tsx
import {
  ContentContainer,
  Drawer,
  DrawerTrigger,
  HeaderActions,
  HeaderBrand,
  ShellAside,
  ShellBody,
  ShellMain,
  ShellSidebar,
  SiteHeader,
  SiteShell,
} from "@riebeckite/layouts";

<SiteShell>
  <SiteHeader sticky>
    <HeaderBrand>{brand}</HeaderBrand>
    <HeaderActions wrap>
      {desktopNavigation}
      {search}
      <DrawerTrigger controls="site-menu" label="Menu" icon="menu" />
    </HeaderActions>
  </SiteHeader>
  <ShellBody>
    <ShellSidebar at="md">{navigation}</ShellSidebar>
    <ShellMain id="main-content" tabindex={-1}>
      <ContentContainer>{children}</ContentContainer>
    </ShellMain>
    <ShellAside at="lg">{toc}</ShellAside>
  </ShellBody>
  <Drawer id="site-menu" label="Navigation">
    {mobileNavigation}
  </Drawer>
</SiteShell>
```

Header は `ContentContainer` とは独立して viewport 幅まで広がります。`HeaderBrand` は左側に置かれ、`HeaderActions` は残りの幅で Navigation、Search、操作要素を右側に配置します。`HeaderActions wrap` を使うと、狭い Header で溢れずに折り返します。

`ShellSidebar` と `ShellAside` は `at` でレールになる幅を決めます。既定値は Sidebar が `md`、Aside が `lg` です。レールは共通の Sticky offset を使い、独立してスクロールします。

## Drawer

Drawer は panel と1つ以上の trigger に分かれています。trigger は任意の場所に置けるため、panel を Sidebar のレールに置いたまま Header から開けます。

```tsx
<ShellSidebar at="md">
  <Drawer id="docs-menu" label="Documentation" desktop="inline">
    <DocsSidebar />
  </Drawer>
</ShellSidebar>
<DrawerTrigger controls="docs-menu" label="Menu" icon="menu" />
```

`desktop="inline"` を指定すると、`at` の幅に達した時点で panel が通常フローのコンテンツになります。1つの Navigation インスタンスでモバイルの Drawer とデスクトップのレールを兼ねられます。既定の `desktop="hidden"` は、ブレークポイントに達すると Drawer を消します。

`DrawerTrigger` は `icon="menu"` を指定するとアイコンのみのメニューボタンを描画します。panel の中身はサイトが自由に合成します。Layouts は Navigation、Search、TOC の内部実装を知りません。

フォーカス管理、Escape、背景クリック、SPA 遷移時の後始末、JavaScript なしの `:target` フォールバックには client entry を一度読み込みます。

```ts
import "@riebeckite/layouts/client";
```

JavaScript がない場合、trigger はフラグメントリンクとして動くため、`#docs-menu` で panel を `:target` により表示できます。JavaScript がある場合はフォーカスを閉じ込めた dialog になり、閉じると元の要素へフォーカスを戻します。

## レスポンシブプリミティブ

- `ShowAt min` は指定幅より下で非表示にし、`ShowAt max` は指定幅以上で非表示にします。
- `Stack` は共通の gap スケールを持つ縦方向の flex コンテナです。
- `Cluster` は折り返す横方向の flex コンテナです。
- `ResponsiveGrid` は `repeat(auto-fit, minmax(min(<min>, 100%), 1fr))` を使うため、viewport ではなく自分のコンテナ幅に合わせて変化します。
- `ContentContainer size="page"` はページ最大幅を使います。

`ShowAt` と Shell のレールは viewport の media query を使います。Grid、Stack、Cluster は与えられた幅に応答するため、ネストした狭いコンテナでも破綻しません。media query は CSS Custom Properties を読めないため、レイアウトのブレークポイントはカスタムプロパティとして公開していません。

## ブレークポイント

| Name | Value | 主な用途 |
| --- | --- | --- |
| `sm` | `30rem` | 小型スマートフォンから小型タブレット |
| `md` | `48rem` | Sidebar レールが Drawer を置き換える |
| `lg` | `64rem` | Aside レール |
| `xl` | `88rem` | 広い読書レイアウト |

数値は `@riebeckite/layouts/style.css` だけに置きます。TypeScript は名前だけを受け取り、数値は扱いません。

## 責務

Layouts は構造的な配置、レールの表示、Drawer の挙動、汎用の flex/grid プリミティブを担当します。Navigation、TOC、Search、Color mode、l10n は各プラグインに残ります。サイトはそれらを合成し、各ブレークポイントでの配置を決めます。サイト固有 CSS はブランド表現を担当し、Header の左右配置、レール切り替え、Drawer の仕組みを再実装しません。

すべてのコンポーネントは `class` と `className` を受け取ります。`ShellMain` は `id` と `tabindex` も受け取ります。SPA ナビゲーションでは `id="main-content"` を使います。
