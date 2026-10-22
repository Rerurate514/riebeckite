---
title: ローカル Plugin の開発
---
# ローカル Plugin の開発

`riebeckite plugin dev` は、ローカルの Plugin パッケージを一時的な Riebeckite Site で実行します。実際の PluginRuntime、HonoX、Vite を使うため、Site と同じ Markdown パイプライン、CSS、Client Entry を確認できます。

[English](./local-plugin-development.md)

## 使う場面

Plugin の変換処理、スタイル、Client の挙動を変更し、ブラウザーで結果を確認したいときに使います。`theme preview` との違いは次のとおりです。

- `plugin dev` はローカルの Path から 1 つの Plugin を読み込み、その Client Entry を実行します。
- `theme preview` は固定の Content Fixture で Theme を確認します。`plugin dev` は Plugin 用の一時 Site を生成します。

## Preview を開始する

Plugin パッケージ内、または Path を指定して実行します。

```sh
riebeckite plugin dev ./extensions/my-plugin
riebeckite plugin dev ../my-plugin --port 4321 --no-open
```

| Option | 意味 |
| --- | --- |
| `<path>` | Plugin のディレクトリ、またはその `package.json` |
| `--port <port>` | Dev Server の Port |
| `--no-open` | ブラウザーを自動で開かない |

Plugin のディレクトリには有効な `package.json` が必要です。Entry Point は `exports["."]` の `source`、`import`、`module`、`default`、`main`、慣例的な `index.ts` の順で解決します。`./client` や `./style.css` などの Export Subpath は、対応するローカルファイルが存在する場合に結び付けます。

Preview の前に、Plugin 側のプロジェクトで依存関係を install してください。コマンドが依存パッケージを自動で install することはありません。

## Fixture Site

System の一時ディレクトリに最小構成の HonoX Site を作成し、ローカル Plugin を link してから Fixture の Path を表示します。Fixture には見出しとタブ付き Code Block を含む決定的な Markdown を書き込みます。設定済みの Vault、`riebeckite.config.ts`、Build Output は読み書きしません。

生成する Site では既定の Theme と、Markdown、Color Mode、Table of Contents の標準 Plugin を使い、その後にローカル Plugin を加えます。プロジェクトの設定をコピーせず、通常の Site に近い構成で確認できます。

## 編集中の更新

| 変更 | 結果 |
| --- | --- |
| Plugin の CSS | Vite HMR が開いているページを更新する |
| Plugin の Client Entry | Preview を再読み込みし、新しい Client Code を実行する |
| Fixture の Markdown | 描画結果を更新する |
| Plugin の Entry Point | Dev Server を再起動する |

変更を反映できない場合は、成功したように見せず Terminal にエラーを表示します。コンパイルや初期化に失敗した場合は 0 以外の Status で終了します。

## エラーと後片付け

Path が見つからない場合、`package.json` が不正な場合、Entry Point に対応していない場合、Plugin の初期化に失敗した場合は、Preview が使える状態になる前にエラーを表示します。Ctrl+C、通常終了、起動失敗のいずれでも一時 Site を削除します。Process を強制終了した場合は、起動時に表示された Fixture Path を手動で削除してください。

## Security

`plugin dev` は信頼できるローカル開発向けのコマンドです。指定した Path の Plugin Entry と Client Code を実行します。信頼できる Plugin だけを実行し、Preview Server を信頼できない利用者へ公開しないでください。

## トラブルシューティング

- `Could not find a plugin`: Path を確認してください。相対 Path は Current Directory から解決します。
- `Could not find package.json`: Package の Root、またはその `package.json` を指定してください。
- `Could not find the plugin entry point`: `exports["."]`、`main`、または `index.ts` を追加してください。
- Vite がコンパイルエラーを表示する: Plugin の依存関係を install し、Terminal の出力を確認してください。
- Port が使用中: 別の `--port` を指定してください。
