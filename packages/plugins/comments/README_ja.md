# @riebeckite/plugin-comments

<!-- Generated from docs/docs/plugins/comments.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

公開ノートにコメントスレッドを表示するプラグインです。コメントのバックエンドは差し替え可能なプロバイダーが担います。組み込みの Giscus プロバイダーは [Giscus](https://giscus.app) で GitHub Discussions のスレッドを埋め込みます。読者は GitHub でサインインしてコメントし、保存・モデレーション・通知は GitHub が担います。[Reactions](../reactions/README_ja.md) と組み合わせると、Zenn/Qiita風に軽いリアクションと本格コメントを分けられます。

[English](./README.md)

## できること

- Site が `CommentsSection` または `ArticleCommentsSection` を配置した場所に、プロバイダーのスレッドを埋め込みます
- プラグイン自体はコメントのバックエンドに依存せず、プロバイダーがブラウザ側の初期化関数と設定を提供します
- Giscus では各ページと GitHub Discussion を URL で対応づけるため、ノートに追加の frontmatter は不要です。投稿・サインイン・スパム対策・モデレーションは GitHub Discussions に任せます

## クイックスタート

```sh
npm install @riebeckite/plugin-comments
```

```ts
import { defineConfig } from "@riebeckite/core";
import { comments, giscus } from "@riebeckite/plugin-comments";

export default defineConfig({
  plugins: [
    comments({
      provider: giscus({
        repo: "owner/repo",
        repoId: "R_kgDO...",
        category: "Comments",
        categoryId: "DIC_kwDO...",
      }),
    }),
  ],
});
```

## プロバイダー

`comments()` はセクションの描画とクライアントエントリの登録だけを行い、何を埋め込むか、どのブラウザモジュールが初期化するかはプロバイダーが決めます。

```ts
export type CommentsProvider = {
  name: string;
  client: { moduleSpecifier: string; exportName: string };
  publicConfig: JsonValue;
  validateOptions?: () => readonly ConfigValidationIssue[];
};
```

`client.moduleSpecifier` と `client.exportName` は初期化関数を公開するブラウザモジュールを指し、`publicConfig` はそのまま渡されます。初期化関数は設定を受け取り、`data-rr-comments-mounted` を持たないすべての `[data-rr-comments-thread]` 要素を埋めます。属性はマークアップを追加する前に設定します。これによりプラグイン本体はプロバイダーに依存しません。

```ts
import type {
  CommentsInitializer,
  CommentsProvider,
} from "@riebeckite/plugin-comments";

export function utterances(repo: string): CommentsProvider {
  return {
    name: "utterances",
    client: {
      moduleSpecifier: "example-comments/client",
      exportName: "initUtterances",
    },
    publicConfig: { repo, theme: "preferred-color-scheme" },
  };
}

export const initUtterances: CommentsInitializer<{ repo: string; theme: string }> = (
  config,
) => {
  for (const thread of document.querySelectorAll<HTMLElement>(
    "[data-rr-comments-thread]",
  )) {
    if (thread.hasAttribute("data-rr-comments-mounted")) continue;
    thread.setAttribute("data-rr-comments-mounted", "true");
    const script = document.createElement("script");
    script.src = "https://utteranc.es/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.repo = config.repo;
    script.dataset.theme = config.theme;
    thread.append(script);
  }
};
```

プロバイダーのクライアントモジュールは Site のビルドから解決できる必要があります。たとえば、プロバイダーを公開するのと同じパッケージに含めます。

`giscus()` は組み込みのプロバイダーです。Discussions を有効にした公開 GitHub リポジトリが必要です。

1. リポジトリ設定で Discussions を有効にします
2. リポジトリに [giscus アプリ](https://github.com/apps/giscus)をインストールします
3. コメント用の Discussion カテゴリを作ります。Announcements カテゴリにすると新しいスレッドはメンテナーのみが作成でき、読者はコメントだけを行えます
4. [giscus.app](https://giscus.app) でリポジトリを指定し、生成された `data-repo-id` と `data-category-id` を控えます

## オプション

`comments()`:

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `provider` | `CommentsProvider` | 必須 | スレッドを埋め込み初期化するプロバイダー。 |
| `className` | `string` | `"rr-comments"` | 表示するセクションのルート CSS クラス。 |

`giscus()`:

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `repo` | `string` | 必須 | `owner/name` 形式のリポジトリ。 |
| `repoId` | `string` | 必須 | giscus.app で取得するリポジトリ ID。 |
| `category` | `string` | 必須 | Discussion カテゴリ名。 |
| `categoryId` | `string` | 必須 | giscus.app で取得するカテゴリ ID。 |
| `mapping` | `"pathname" \| "url" \| "title" \| "og:title"` | `"pathname"` | ページと Discussion の対応づけ方。 |
| `strict` | `boolean` | `false` | 対応づけの値を完全一致で照合します。 |
| `reactionsEnabled` | `boolean` | `true` | Discussion の GitHub リアクションを表示します。 |
| `inputPosition` | `"top" \| "bottom"` | `"bottom"` | コメント入力欄の位置。 |
| `theme` | `string` | `"preferred_color_scheme"` | Giscus のテーマ名または URL。 |
| `lang` | `string` | `"en"` | Giscus の UI 言語。 |

## 表示

JSX の配置はサイトが所有します。記事の下に `ArticleCommentsSection` を置きます。

```tsx
import { ArticleCommentsSection } from "@riebeckite/plugin-comments";

<ArticleCommentsSection />;
```

`ArticleCommentsSection` はサイト設定からプラグインのオプションを解決し、空のセクションを描画します。プロバイダーのスレッドはブラウザで読み込まれます。プラグインが設定されていない場合は何も描画しません。`className` を渡すと、その配置だけ設定値を上書きできます。

セクションはクライアント側でのみ表示されるため、ビルド後の HTML にコメントは含まれず、読者には JavaScript が必要です。サーバーが Content-Security-Policy ヘッダーを返す場合は、`script-src` と `frame-src` の両方で `https://giscus.app` を許可してください。

Giscus の `theme` はビルド時の値で固定です。`preferred_color_scheme` は OS の設定に従い、サイトのカラーモード切り替えには連動しません。サイトに合わせる場合はテーマ名を明示してください。

## 関連

- [Reactions](../reactions/README_ja.md) — 軽い絵文字リアクション
- [Webmention](../webmention/README_ja.md) — サイトをまたいだメンション
- [プラグインカタログ](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/plugins/README.ja.md)
