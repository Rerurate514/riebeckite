---
date: 2026-11-25
title: UI ラベル
---
# UI ラベル

UI ラベルは、プラグインがコンテンツの周囲に表示する短い文字列です。ボタンの文言、見出し、プレースホルダー、`aria-label`、状態メッセージが含まれます。このページは、プラグイン作者がラベルを追加・変更するときのためのものです。既存の UI を翻訳したいだけのサイト作者は、[ローカライズの設定](../guides/localization/setup.ja.md#ui-の文言)から始めてください。

## ラベルの定義

プラグインはラベルを描画するコードの隣の `labels.ts` で宣言します。`defineUiLabels` は名前空間と、言語ごとの辞書を受け取ります。`en` がキーの集合を決め、必須です。`ja` などのほかの言語は同じプラグインパッケージに含めます。

```ts
// packages/plugins/search/src/labels.ts
import { defineUiLabels } from "@riebeckite/ui";

export const searchLabels = defineUiLabels("search", {
  en: {
    search: "Search",
    searchPlaceholder: "Search notes or use tag:, lang:, path:...",
    result: "{count} result",
    results: "{count} results",
  },
  ja: {
    search: "検索",
    searchPlaceholder: "ノートを検索 (tag:, lang:, path: ...)",
    result: "{count} 件",
    results: "{count} 件",
  },
});
```

名前空間は `@riebeckite/plugin-` を除いたパッケージ名です。たとえば `search`、`local-graph`、`image-compare` です。サイトの上書きと `ui.labels` 設定はこの名前空間をそのまま使うため、公開後は変えないでください。キーは識別子であり、英語の文ではありません。キーを変えるとサイトの上書きが壊れますが、値を変えても壊れません。`defineUiLabels` は定義を名前空間でプロセス全体に登録します。この登録によりインスペクターの **UI ラベル** タブに表示されます。同じ名前空間の定義は、後から登録したものが前のものを置き換えます。

## コンポーネントで読む

定義を `useUiLabels` に渡します。返り値は `en` の辞書から型付けされるため、キーの不足や綴りの誤りは型検査で分かります。

```tsx
import { useUiLabels } from "@riebeckite/ui";
import { searchLabels } from "../src/labels.js";

export function SearchBar() {
  const labels = useUiLabels(searchLabels);
  return <input placeholder={labels.searchPlaceholder} />;
}
```

`useUiLabels` はサイトのコンテキストを読み、次の順で解決します。

1. プラグインの `en` の辞書。
2. 有効な言語に対応するプラグインの辞書。
3. `ui.labels[namespace][language][key]` のサイトの上書き。

有効な言語は、`ui.locale` があればその値、なければ描画中のコンテンツの言語です。言語コードは大文字と小文字を区別せず、アンダースコアとハイフンは同じに扱います。`ja-JP` や `ja_JP` のような完全なタグは、完全一致する辞書がなければ主要サブタグ（`ja`）に一致します。空文字列と文字列以外の値は使いません。英語の辞書に定義のないキーは、解決後の値でも型でも無視されます。

## コンポーネント以外で読む

サーバーのコードと文字列を組み立てるレンダラーでは、`UiLabelContext` を渡して `resolveUiLabels` を使います。Core はプラグインのページ解決と Markdown / HTML パイプラインの拡張に `context.uiLabels` を提供します。`ui.locale` を優先し、次に出力の言語を選び、サイトの上書きを含みます。

```ts
import type { UiLabelContext } from "@riebeckite/core";
import { resolveUiLabels } from "@riebeckite/ui";
import { seriesLabels } from "./labels.js";

export function renderSeries(index: SeriesIndex, uiLabels?: UiLabelContext): string {
  const labels = resolveUiLabels(seriesLabels, uiLabels);
  return `<nav aria-label="${labels.seriesNavigation}">...</nav>`;
}
```

単体のレンダラーは任意の `UiLabelContext` を受け取ります。渡さなければ英語を解決します。フレームワークのエントリポイントは、ロケールの文字列と `ui.labels` を別々に渡す代わりに、受け取ったコンテキストをそのまま渡してください。

クライアントエントリでは `@riebeckite/ui/labels` の `resolveClientUiLabels` を使います。ページの言語と、フレームワークがクライアントへ渡すサイトの `ui.locale` / `ui.labels` を読むため、ブラウザでも上書きが反映されます。サブパスから読み込むと、JSX のコンポーネントエントリがバンドルに入りません。

```ts
import { resolveClientUiLabels } from "@riebeckite/ui/labels";
import { codeEnhanceLabels } from "./labels.js";

const labels = resolveClientUiLabels(codeEnhanceLabels);
```

言語を渡さない場合は `document.documentElement.lang` を使います。サーバーですでに翻訳した文字列をクライアントスクリプトで使う場合は、data 属性か JSON の埋め込みに書いて、初期化時に読みます。クライアントエントリからサーバーの設定を読み込まないでください。

## コンポーネントの型を付ける

ラベルを props で受け取るコンポーネントは、定義の型と `ResolvedUiLabels` を使えます。

```ts
import type { ResolvedUiLabels } from "@riebeckite/ui";
import { diffLabels } from "../../src/labels.js";

type DiffLabels = ResolvedUiLabels<typeof diffLabels>;

export function DiffHistory(props: { labels?: DiffLabels }) {
  // ...
}
```

複数のコンポーネントが共有する補助関数でも同じ形を使えます。複数のファイルが必要とする場合は、`labels.ts` から型を公開してください。

## 型

| 型 | 意味 |
| --- | --- |
| `UiLabelDictionary` | 1 つの言語の辞書。`Readonly<Record<string, string>>` |
| `UiLabelDictionaries` | 言語ごとの辞書。`Readonly<Record<string, UiLabelDictionary>>` |
| `UiLabelsDefinition<D>` | 名前空間と辞書。`defineUiLabels` の返り値 |
| `ResolvedUiLabels<T>` | 定義の `en` のキーに対応する、平坦なラベルのオブジェクト |
| `UiLabelContext` | 有効な言語とサイトの上書き。`@riebeckite/core` から公開 |

`defineUiLabels` と型は `@riebeckite/ui` から公開しています。`resolveUiLabels` は `@riebeckite/ui/labels` からも読み込め、クライアントエントリから安全に使えます。

## 作成時の規則

- プラグインが描画するすべての利用者向けの文字列を対象にしてください。表示される文字だけでなく、`aria-label`、`title`、プレースホルダーも含みます。
- `{count}`、`{index}`、`{total}`、`{language}`、`{type}` などのテンプレートはすべての翻訳に残してください。置き換えは解決後に行います。
- 英語の値は移行前に描画していた文字列と同じにしてください。変えると利用者に見える差分になります。
- 日本語は別のロケールディレクトリではなく同じ `labels.ts` に書いてください。どちらでも辞書はプラグインと一緒に配布されます。
- 既存のプラグインオプションを重複させないでください。ラベルのオプションがすでにある場合は、オプションを優先し、共有ラベルは既定値として使います。
- ラベルのコンテキストを取得できないレンダラーでは英語を解決し、任意の `UiLabelContext` を受け取るようにしてください。プラグイン固有のロケールや上書きの設定項目を増やさないでください。
- `en` と `ja` の両方について、テンプレートの値を含めて解決する小さなテストを追加してください。プラグインのほかの場所で英語の文字列を直書きして検査しないでください。

## 上書き

サイト作者はプラグインを変更せずにラベルを上書きできます。

```ts
export default defineConfig({
  ui: {
    labels: {
      search: {
        ja: { searchPlaceholder: "ノートを検索" },
      },
    },
  },
});
```

上書きには変更するキーだけを書きます。値が空文字列の上書きは無視され、ラベルは辞書の値のままです。名前空間ごとのキーの一覧は[ローカライズの設定](../guides/localization/setup.ja.md#ui-の文言)にあります。

開発中は、インスペクターの **UI ラベル** タブに、読み込まれた名前空間ごとの要求ロケールと一致ロケール、解決済みのすべての値、そして英語・プラグインの辞書・サイトの上書きのどれが使われたかが表示されます。読み込まれたどの定義でも使われない `ui.labels` のキーは、未使用の上書きとして表示されます。

## 関連

- [ローカライズの設定](../guides/localization/setup.ja.md)
- [設定リファレンス](./configuration-reference.ja.md)
- [プラグイン API](./plugin-api.ja.md)
