---
date: 2026-11-01
title: CLI拡張API
---
# CLI拡張API

Riebeckite はすべてのコマンドを単一のコマンドレジストリで解決し、実行します。組み込みコマンドとプラグインのコマンドは、同じ定義API、パーサー、実行コンテキスト、ヘルプ生成、JSONの取り決め、シェル補完を使います。旧来の中央ディスパッチャーと、対話用のコマンドパーサーは削除しました。

レジストリの型は `@riebeckite/core` にあり、Node.js に依存しません。プロセスの入出力、プロジェクトの読み込み、シグナルの処理は `@riebeckite/cli` が担当します。

## コマンドを定義する

`defineCliCommand` は `CliCommandDefinition` を返します。`id` はコマンドの完全なパスで、階層は空白で区切ります。

```ts
import {
  cliArgument,
  cliBoolean,
  cliEnum,
  cliString,
  defineCliCommand,
} from "@riebeckite/core";

export const readingTime = defineCliCommand({
  id: "reading-time",
  summary: "Estimate reading time for a path.",
  description: "Reads a content path and prints the estimated reading time.",
  arguments: [
    cliArgument("path", {
      description: "Content path.",
      required: true,
    }),
  ],
  options: [
    cliEnum("format", ["text", "json"], {
      description: "Output format.",
      default: "text",
    }),
    cliString("label", {
      description: "Label for the result.",
      default: "Reading time",
    }),
    cliBoolean("verbose", {
      description: "Print details.",
      short: "v",
    }),
  ],
  examples: [
    { command: "riebeckite reading-time notes/post.md" },
  ],
  requiresProject: true,
  supportsJson: true,
  async handler(context, input) {
    const project = await context.loadProject();
    const path = input.arguments.path;
    const result = { path, minutes: 1 };

    if (input.options.format === "json" || context.json) {
      context.output.json(result);
      return;
    }
    context.output.writeLine(
      `${input.options.label}: ${result.minutes} min${input.options.verbose ? ` (${project.projectRoot})` : ""}`,
    );
  },
});
```

`defineCliCommand` は記述時の補助関数です。オプションと引数の型をハンドラーまで保持します。ハンドラーは、コマンドの解決と検証が成功した後にだけ実行されます。

## コマンドの形

| フィールド | 役割 |
| --- | --- |
| `id` | `publish plan` や `acme greet` のような正規のコマンドパス。 |
| `summary` | コマンド一覧に出す1行の説明。 |
| `description` | ヘルプに出す詳しい説明。 |
| `arguments` | 順序を持つ位置引数。 |
| `options` | 名前付きのフラグと値。 |
| `examples` | ヘルプに出す実行例。 |
| `requiresProject` | ハンドラーの前に `riebeckite.config.ts` を読み込む。 |
| `raw` | 残りのトークンを解析せずハンドラーへ渡す。 |
| `aliases` | 別名のコマンドパス。 |
| `hidden` | コマンド一覧から隠す。 |
| `supportsJson` | `--json` を受け付け、`context.json` を公開する。 |
| `validate` | コマンド全体の相関検証。 |
| `handler` | コマンドの実装。 |

コマンド名は小文字のケバブケースです。階層化したコマンドは木構造になります。1つのコマンドがグループも兼ねられるため、`create` は対話を開始しつつ `create site` も持てます。

## 引数とオプション

| ビルダー | 値 |
| --- | --- |
| `cliBoolean(name, options)` | 真偽値のフラグ。`negatable` を指定すると `--no-name` も受け付ける。 |
| `cliString(name, options)` | 文字列の値。 |
| `cliStringWithDefault(name, value, options)` | 既定値付きの文字列。 |
| `cliNumber(name, options)` | 数値。`integer`、`min`、`max` で検証できる。 |
| `cliEnum(name, values, options)` | 固定リストから1つ選ぶ値。 |
| `cliArgument(name, options)` | 位置引数。 |
| `cliVariadicArgument(name, options)` | 1つ以上の位置引数。 |
| `cliExample(command, description?)` | ヘルプの実行例。 |

オプションは長い名前、短いフラグ、`--name=value`、繰り返し、必須値、非表示、既定値、`validate` コールバックに対応します。引数は必須、可変長、列挙、既定値、非表示、検証メタデータに対応します。

パーサーは `--`、シェルが分割済みの引用引数、短い真偽値フラグの連結、`--no-*` の否定を扱います。未知のオプション、値の欠落、繰り返し不可のオプションの重複、必須引数の欠落、余分な位置引数、不正な列挙値や数値はエラーにします。

## 実行コンテキスト

ハンドラーは `CliCommandContext` と `CliCommandInput` を受け取ります。

`context` が提供するものは次のとおりです。

- `cwd`、`projectRoot`、`project`、`config`
- `loadProject()` で読み込んだプロジェクト
- 人が読む進捗向けの `logger`
- `output.write`、`output.writeLine`、`output.error`、`output.json`
- 報告された診断
- `AbortSignal`
- 環境情報
- 現在のコマンドレジストリ
- リソース解放のための `onCleanup()`

CLI はコマンドが必要とするときだけプロジェクトを読み込みます。ヘルプの表示、補完の生成、引数の検証だけを行うコマンドは、Vite、HonoX、プラグインランタイム、プロジェクト設定を初期化しません。

`output.json` は標準出力へ書きます。JSONモードでは、ログと警告を標準エラーへ流し、標準出力を有効なJSONのまま保ちます。クリーンアップは登録と逆順に実行され、ハンドラーが例外を投げた場合も実行されます。

## プラグインのコマンド

プラグインは既存の `definePlugin` オブジェクトに `cli` を追加してコマンドを宣言します。プラグインの探索機構を別に作ることはありません。

```ts
import { cliArgument, defineCliCommand, definePlugin } from "@riebeckite/core";

export const acme = definePlugin({
  name: "acme",
  cli: {
    namespace: "acme",
    commands: [
      defineCliCommand({
        id: "greet",
        summary: "Greet someone.",
        arguments: [
          cliArgument("name", { description: "Person to greet.", required: true }),
        ],
        supportsJson: true,
        handler(context, input) {
          const message = `Hello, ${input.arguments.name}!`;
          if (context.json) context.output.json({ message });
          else context.output.writeLine(message);
        },
      }),
    ],
  },
});
```

プラグインはこれまでどおり `riebeckite.config.ts` に追加します。コマンドを登録するのは、設定に書かれ、有効になっているプラグインだけです。無効なプラグインはコマンドを提供せず、ヘルプや補完のために読み込まれることもありません。

名前空間の既定値はプラグイン名です。コマンドIDの先頭に名前空間が付きます。名前空間 `acme` の `id: "greet"` は `acme greet` になります。レジストリは、コマンドIDの重複、別名の衝突、名前空間の衝突、組み込みコマンドのパスと衝突する名前空間を拒否します。

プラグインの登録失敗はほかのコマンドから切り離されます。1つのプラグインが壊れても、別のプラグインや組み込みコマンドは動作します。CLI はプラグイン名と理由を標準エラーへ報告します。

## ヘルプと補完

`riebeckite --help`、`riebeckite help <command>`、`riebeckite <command> --help`、`riebeckite completion <shell>` はレジストリのメタデータを読みます。コマンドのハンドラーは実行しません。

- ルートのヘルプと組み込みコマンドのヘルプは、プロジェクトを読み込みません。
- `help <plugin-command>` と `completion <shell> --project` は設定と有効なプラグインのコマンドを読み込みます。
- Bash、Zsh、PowerShell の補完には、コマンド、サブコマンド、オプション、列挙値、プラグインのコマンドが含まれます。
- 生成するスクリプトは、コマンド名と説明をシェルコードへ埋め込む前にエスケープします。

ヘルプは端末幅に合わせて折り返し、対応端末では ANSI 装飾を付けられます。CI や非TTYでは装飾なしの平文になります。

## JSONとエラー

`supportsJson: true` を宣言したコマンドは、`json` オプションを定義していなくても `--json` を受け付けます。ハンドラーは `context.json` を確認し、`context.output.json` で出力できます。

成功時の出力はコマンドごとに異なります。CLI はすべてのコマンドを1つのスキーマに押し込みません。失敗時は共通のエンベロープを使います。

```json
{
  "ok": false,
  "error": {
    "code": "CLI_USAGE",
    "message": "Unknown option: --wat.",
    "command": "acme greet",
    "exitCode": 2
  }
}
```

JSONモードのエラーエンベロープは標準エラーへ書き、標準出力には混ぜません。終了コードは次のとおりです。

| コード | 意味 |
| --- | --- |
| `0` | 成功 |
| `1` | コマンドの失敗 |
| `2` | CLIの利用法または検証のエラー |
| `130` | ユーザーによる中断 |

## セキュリティと信頼境界

信頼の境界は明示的な設定です。CLI は解決済みの `plugins` 配列に現れるプラグインのコマンドだけを登録します。既存のローダーが `enabled: false` の項目をすでに除外しています。CLI は、信頼できない Markdown、Frontmatter、コンテンツディレクトリ、任意のファイルを走査して実行可能なコマンドを探しません。

プラグインのコマンドIDと名前空間は、組み込みコマンドを隠してはいけません。ヘルプと補完は、メタデータを知るためだけにプラグインハンドラーを実行しません。プラグインの作者は、summary、description、examples、JSON出力に秘密情報を入れないでください。CLI がオプションの値を自動で表示することはありません。

## 性能

CLIのバンドルはコード分割を使います。エントリーチャンクにはコマンド定義とパーサーが入り、プロジェクトの読み込み、Vite、HonoX、各コマンドのハンドラーは別のチャンクに分かれます。Windows で計測したエントリーポイントは次のとおりです。

```text
riebeckite --help        約110 ms
riebeckite --version     約100 ms
riebeckite help build    約80 ms
riebeckite buidl          約90 ms（候補表示のみ、プロジェクト読み込みなし）
riebeckite acme greet     プラグイン探索後、プラグインコマンドを実行
```

組み込みコマンドの候補がある誤入力では、プロジェクトを読み込みません。候補のない未知のコマンドでは、プラグインのコマンドに到達できるよう探索を試みます。

## プラグイン作者向けの移行手順

これまでのプラグインはCLIコマンドを追加できず、組み込みコマンドを増やすたびにディスパッチャーを変更する必要がありました。外部コマンドを移行する手順は次のとおりです。

1. コマンドの実装を、関数をエクスポートするモジュールに保つ。
2. プラグイン定義に `cli` オブジェクトを追加する。
3. `defineCliCommand` と名前空間で各コマンドを定義する。
4. `process.argv` をハンドラー内で解析する代わりに、引数とオプションの宣言を定義へ移す。
5. 値は `input.arguments` と `input.options` から読む。プロジェクトのデータは、必要なときだけ `context.loadProject()` から読む。
6. `process.exitCode` を直接設定する代わりに、`false` を返すか、`CliCommandError` または `CliUsageError` を投げる。
7. JSONモードで標準出力を壊さないよう、`context.output` と `context.logger` を使う。
8. 実際の設定とプラグインのフィクスチャで `runCli` を実行するテストを追加する。無効なプラグイン、コマンドの重複、未知のオプション、失敗の各ケースを含める。

内部APIの `parseCommand`、`Command` ユニオン、中央ディスパッチャーは削除しました。互換用のシムはありません。これらをインポートしていたコードは、`defineCliCommand`、`createCliCommandRegistry`、`registerCliCommand`、`registerPluginCliExtension` へ移してください。

## 制約

- コマンドは信頼されたプロジェクトコードです。レジストリはハンドラーを
  サンドボックス化しません。
- コマンドを提供できるのは、解決済み設定で有効なプラグインだけです。Riebeckite
  はコンテンツ、Markdown、任意のディレクトリを走査して実行可能なコマンドを
  探しません。
- `content` のような `raw` コマンドは独自に引数を解析するため、内側のフラグは
  共通パーサーの検証や補完の対象になりません。
- 補完は定義メタデータから生成されます。ファイルシステムパスや provider の状態
  のような動的な値は補完できません。
- ヘルプと補完はハンドラーを実行しないため、参照する外部ツールがインストール
  されているかは検証できません。
- JSON エンベロープが対象にするのは失敗時です。成功時の出力はコマンドごとに
  異なり、CLI が共通スキーマへ正規化することはありません。

## トラブルシューティング

- **「Unknown command」**: `riebeckite help <command>` で正規のパスを確認して
  ください。プラグインのコマンドには有効なプラグインが必要で、補完では
  `--project` も必要です。
- **プラグインのコマンドが見つからない**: プラグインが解決済みの `plugins` 配列に
  あり、`enabled: false` でないことを確認してください。登録失敗は stderr に
  報告され、他のコマンドは停止しません。
- **「command ... conflicts」**: 組み込みのパスや他のプラグインと衝突しない
  名前空間とコマンド ID を選んでください。
- **stdout が正しい JSON にならない**: `context.output.json` と
  `context.logger` を使ってください。JSON モードではログと警告が stderr へ
  出力されます。
- **`--json` が拒否される**: `supportsJson: true` を宣言し、`json` オプションを
  定義するか、組み込みの受け付けを使ってください。
- **ハンドラーが実行されない**: 引数、オプション、コマンド単位の検証が先に
  走ります。使用法エラーはハンドラーを呼ぶ前に終了コード 2 で終わります。

## 関連ページ

- [CLI](./cli.ja.md)
- [Plugin API](./plugin-api.ja.md)
- [Plugin System](../framework/plugin-system.ja.md)
- [セキュリティ](../security.ja.md)
