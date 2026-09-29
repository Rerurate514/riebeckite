# @riebeckite/plugin-rename

ノートのリネームや移動で発生するリンク切れを減らすプラグインです。検出したリネームを、Riebeckite が既に持つリダイレクト機構（`manifest.redirects`）に恒久的なリダイレクトとして登録します。

[English](./README.md)

## 基本的な使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { renamePlugin } from "@riebeckite/plugin-rename";

export default defineConfig({
  plugins: [
    renamePlugin({
      status: 308,
      onUnexpectedRemoval: "warning",
    }),
  ],
});
```

ノートが移動すると、プラグインは現在のルートと、前回のビルドで保存したルートロックを比較します。同一のノートだと判定できた場合は、旧パーマリンクから新パーマリンクへのリダイレクトを `manifest.redirects` に記録します。Core はこのリダイレクトをリダイレクトページやデプロイ用ファイルとしてそのまま利用します。

## 仕組み

```text
現在のエントリ（公開分のみ）
        │
        ▼
buildRouteLock ──► 現在の RouteLock
        │                    │
        │                    ▼
        └──────────► diffRoutes(前回, 今回)
                             │
              ┌──────────────┴───────────────┐
              ▼                              ▼
        リネームのリダイレクト            診断メッセージ
        （統合 + チェーン集約）          （曖昧 / 消失）
              │
              ▼
     manifest.redirects  ◄── 既存キーは上書きしない
              │
              ▼
     context.cache "routes.lock"
```

判定の優先順位は厳密で、あいまい一致は行いません。

1. **明示的な同一性** — エントリの frontmatter `id` がロック内のルートの `id` と一致する。
2. **内容ハッシュの完全一致** — `sha256(entry.html)` が新しいルートちょうど 1 件と一致する。
3. どちらも該当しない場合、そのルートは消失とみなす。

候補が複数ある場合、または 1 件もない場合はリダイレクトを作りません。曖昧一致では `rename-ambiguous` 診断を、対応の取れない消失では `onUnexpectedRemoval` に従った重要度の診断を出力します。

## 状態の保存

プラグインが直接ファイルを書き込むことはありません。ビルドをまたぐ状態はルートロックのみで、`context.cache` の `routes.lock` キーに保存します。キャッシュは `<content.dir>/../.riebeckite/cache` に作られて gitignore の対象なので、ロックはマシンローカルです。存在しない場合や壊れている場合は空のロックから再生成します。

ロックがマシンローカルであるため、新しいマシンでの初回ビルドには履歴がなく、ロックが存在する前に起きたリネームは検出できません。

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | リネーム検出を有効にする |
| `status` | `301 \| 302 \| 307 \| 308` | `308` | 新規リネームリダイレクトの HTTP ステータス |
| `onUnexpectedRemoval` | `"info" \| "warning" \| "error"` | `"warning"` | リネームの根拠なくルートが消えたときの重要度 |

## ルールと保証

- `isPublished` を満たすエントリだけを対象にします。非公開ノートはロックにもリダイレクトにも入りません。
- 既存の `manifest.redirects` のキーは上書きしません。Permalink の `redirect_from` が常に優先されます。
- 恒久的なリダイレクトのチェーンは推移的に集約します（`A → B` と `B → C` は `A → C` になる）。
- ロックは決定的です。ルートキーとリダイレクトをソートし、タイムスタンプや乱数を使いません。
- リダイレクトは毎ビルドで再適用されるため、CLI ビルドと SSG ビルドが同じリダイレクトを再現します。

## エクスポート

関数:

- `renamePlugin(options?)` / `rename(options?)`
- `diffRoutes(previous, current, options?)`
- `buildRouteLock(entries, isPublished)`
- `collapseRedirects(rules)`
- `applyRouteRedirects(manifest, rules)`
- `parseRouteLock(value)`、`emptyRouteLock()`、`hashContent(html)`

型:

- `RenameOptions`
- `RouteLock`、`RouteLockRoute`、`RouteLockRedirect`、`RedirectRule`
- `DiffRoutesOptions`、`DiffRoutesResult`、`RenameDiagnostic`

## 制限事項

- git によるリネーム検出は実装していません。ファイルシステムやリポジトリへのアクセスが必要であり、プラグインコードは意図的にそれを避けています。リネーム検出は frontmatter `id` と内容ハッシュの完全一致のみに依存します。
- `id` がなく、本文 HTML も変化したリネームは検出できず、予期しない消失として報告されます。

## 関連

- [Permalink プラグイン](../permalink/README_ja.md) — 安定した URL と `redirect_from`
- [プラグインガイド](../../../docs/ja/plugin-system.md)
