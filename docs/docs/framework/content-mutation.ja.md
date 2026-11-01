---
date: 2026-11-01
title: コンテンツ変更システム
sidebar:
  label: コンテンツ変更
---
# コンテンツ変更システム

コンテンツ変更システムは、コンテンツファイルを書き込む唯一の正規経路です。
明示的な操作リストを検証済みの計画に変換し、ジャーナルとバックアップを伴って
書き込み、中断した処理を復旧できます。担当するのは**変更を安全に書き込む方法**です。
**何を変更するか**は[[content-migration|コンテンツ移行システム]]が担当します。

コンテンツ変更は Markdown やフロントマターから意図を推測しません。呼び出し側が
作成、更新、削除、移動、フロントマター変更を明示し、変更が安全だと証明できた場合だけ
書き込みます。証明できない場合は競合として報告します。

## 構成

```mermaid
flowchart TD
    Caller["CLI またはコンテンツ移行"]
    Plan["ContentMutationOperation[]"]
    Planner["FileSystemContentMutation.plan"]
    Preconditions["Fingerprint、リンク書き換え、競合"]
    Lock["変更ロック"]
    Journal["ジャーナルとバックアップ"]
    Apply["ファイルごとのアトミック書き込み"]
    Result["ContentMutationResult"]

    Caller --> Plan --> Planner --> Preconditions
    Preconditions -->|"競合なし"| Lock --> Journal --> Apply --> Result
    Preconditions -->|"競合あり"| Result
```

責務は層ごとに分かれています。

| 層 | パッケージ | 責務 |
| --- | --- | --- |
| 操作と計画の型 | `@riebeckite/core` | `ContentMutationOperation`、`ContentMutationPlan`、問題と結果の型 |
| リンク再設定 | `@riebeckite/core` | `planContentLinkUpdates` が影響を受ける Markdown リンクを書き換える |
| ファイル実行 | `@riebeckite/node` | `FileSystemContentMutation` が計画、適用、復旧、巻き戻し、計画の保存と読み込みを行う |
| CLI | `@riebeckite/cli` | `riebeckite content` がシェル引数を操作へ変換する |

Core はファイルシステムに触れません。コンテンツファイルを書き込むのは Node の
実行層だけです。

## はじめかた

まず計画します。`--apply` を付けなければ、変更内容を表示するだけで何も書き込みません。

```sh
riebeckite content create notes/hello.md --body "Hello"
riebeckite content move notes/hello.md notes/welcome.md
```

書き込みは明示的に指定します。

```sh
riebeckite content create notes/hello.md --body "Hello" --apply
```

リンクが曖昧になる計画は、書き込み前に失敗します。

```sh
riebeckite content create other/note.md
# Conflict: source.md: The link target is ambiguous ...
# The plan cannot be applied.
```

レビューしてから適用したい場合は、計画を保存します。

```sh
riebeckite content plan move notes/hello.md notes/welcome.md --out move-hello.json
riebeckite content apply move-hello.json --apply
```

保存した計画は `.riebeckite/mutations/plans` に置かれます。`--out` に指定できるのは
このディレクトリ内の名前で、任意のファイルシステムパスではありません。

## 設定

コンテンツ変更に `riebeckite.config.ts` の設定項目はありません。解決済みの
コンテンツルートと内部状態だけを使います。

| パス | 内容 |
| --- | --- |
| `.riebeckite/mutations/lock` | 書き込みや復旧の実行中だけ存在する排他ロック |
| `.riebeckite/mutations/<planId>/journal.json` | トランザクション状態とファイルごとのフィンガープリント |
| `.riebeckite/mutations/<planId>/backups/` | 変更前のファイル内容。パスを Base64URL で名付ける |
| `.riebeckite/mutations/plans/` | `content plan --out` で保存した計画 |

`.riebeckite` はビルド時の状態で、このリポジトリでは Git の対象外です。
ジャーナルとバックアップにはファイル本文が入るため、非公開のデータとして扱ってください。

## API リファレンス

### 操作

`ContentMutationOperation` は判別可能なユニオンです。

```ts
type ContentMutationOperation =
  | { kind: "create" | "asset-create"; path: string; content: string | Uint8Array }
  | { kind: "update" | "asset-update"; path: string; content: string | Uint8Array }
  | { kind: "delete" | "asset-delete"; path: string }
  | { kind: "move" | "rename" | "asset-move"; from: string; to: string }
  | {
      kind: "frontmatter";
      path: string;
      set?: Readonly<Record<string, unknown>>;
      remove?: readonly string[];
    }
  | { kind: "batch"; operations: readonly ContentMutationOperation[] };
```

`create` と `update` はテキストまたはバイト列を受け取ります。`asset-*` は
バイナリであることを明示する別名で、検証内容は同じです。`frontmatter` は
Markdown のパスだけを受け付け、`"meta.added"` のようなネストしたキーも指定できます。
`batch` は計画前に平坦化されるため、ネストしても記述順に実行されます。

`flattenContentMutationOperations(operations)` は batch を取り除いた実効的な操作
リストを返します。

### 計画と結果の型

```ts
type ContentMutationPlan = {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly operations: readonly ContentMutationOperation[];
  readonly changes: readonly ContentMutationFileChange[];
  readonly preconditions: readonly ContentMutationPrecondition[];
  readonly warnings: readonly ContentMutationIssue[];
  readonly conflicts: readonly ContentMutationIssue[];
};

type ContentMutationResult = {
  readonly planId: string;
  readonly applied: boolean;
  readonly journalPath?: string;
  readonly appliedPaths: readonly string[];
  readonly conflicts: readonly ContentMutationIssue[];
};
```

`ContentMutationFileChange` は `beforeFingerprint`、`afterFingerprint`、最終的な
バイト列を保持します。`preconditions` は
`{ path, fingerprint: beforeFingerprint }` の集合です。問題は `severity`、
`code`、`message`、任意の `path` を持ちます。

`recover` と `rollback` はそれぞれ `ContentMutationRecoveryResult` と
`ContentMutationRollbackResult` を返します。どちらも `conflicts` を報告し、
rollback は巻き戻し済みの場合に `skipped` も報告します。

### `FileSystemContentMutation`

```ts
import { FileSystemContentMutation } from "@riebeckite/node";

const mutation = new FileSystemContentMutation(contentRoot);
const plan = await mutation.plan([
  { kind: "frontmatter", path: "notes/hello.md", set: { draft: false } },
]);
if (plan.conflicts.length === 0) {
  const result = await mutation.apply(plan);
}
```

| メソッド | 動作 |
| --- | --- |
| `plan(operations)` | コンテンツツリーを読み、操作をメモリ上で適用し、影響するリンクを書き換えて計画を返す。コンテンツファイルは書き込まない。 |
| `apply(plan)` | 計画を再検証し、ロックを取得し、ジャーナルとバックアップを書いてから各ファイルをアトミックに適用する。 |
| `recover(journalPath)` | 中断したジャーナルを巻き戻す。中断後にファイルが変わっていれば競合を報告する。 |
| `rollback(journalPath)` | 完了した変更を、現在の全ファイルが適用後のフィンガープリントと一致する場合だけ復元する。 |
| `savePlan(plan, path?)` | シリアライズした計画を `.riebeckite/mutations/plans` に保存する。 |
| `loadPlan(path)` | 保存した計画を読み込んで検証する。 |

コンストラクタの第 2 引数には `beforeWrite`、`beforeRecoveryRestore`、
`afterRecoveryCapture` のコールバックを渡せます。テストや障害注入用で、通常の
利用では不要です。

## 例

### ノートを移動してリンクを更新する

```ts
const plan = await mutation.plan([
  { kind: "move", from: "notes/old.md", to: "notes/new.md" },
]);
const result = await mutation.apply(plan);
```

移動すると、旧パスを指していたすべての Markdown ファイルの WikiLink と
Markdown リンクが再設定されます。書き換えたファイルにも同じフィンガープリント
検査が適用されるため、同時編集は黙って上書きされず競合になります。

### 名前変更とフロントマター変更をまとめる

```ts
const plan = await mutation.plan([
  {
    kind: "batch",
    operations: [
      { kind: "frontmatter", path: "notes/a.md", set: { category: "guide" } },
      { kind: "rename", from: "notes/a.md", to: "guides/a.md" },
    ],
  },
]);
```

書き込み前に最終的なバイト列を計算します。ジャーナルには、リンク更新を含む
影響対象のパスごとに 1 件の変更を記録します。

### レビューしてから適用する

```ts
const saved = await mutation.savePlan(plan);
const loaded = await mutation.loadPlan(saved);
const result = await mutation.apply(loaded);
```

`apply` は操作を再計画し、正規化した結果を比較します。`savePlan` の後に
コンテンツツリーが変わっていれば、`stale-plan` の競合になります。

## 統合

- [[content-migration|コンテンツ移行]]は、同梱される唯一の移行操作の生成元です。
  ファイルを直接書き換えず、変更計画を作り、変更後のマニフェストを検証してから、
  書き込みと巻き戻しをコンテンツ変更へ委譲します。
- [[content-system|コンテンツシステム]]とリンクインデックスが、どのリンク先が
  一意に解決できるかを定義します。変更は 2 つ目の Markdown パーサーを作らず、
  同じ解決規則を再利用します。
- [[reference/cli|CLI]] は `content` を raw コマンドとして公開します。独自に引数を
  解析したあと、プログラムから呼ぶ場合と同じ実行層を使います。
- [[build-system|ビルドシステム]]は次のビルドで生成されたファイルを読みます。
  変更はビルド状態の更新も出力の生成も行いません。

## エラー処理

`plan` は利用者レベルの競合では例外を投げません。エラーを `conflicts` に入れ、
他の問題の収集を続けます。`apply` は計画が古い場合、前提条件が変わった場合、
または計画に競合が含まれる場合に `applied: false` を返します。

主な競合コードは次のとおりです。

| コード | 意味 |
| --- | --- |
| `invalid-operation` | 存在しないファイル、既存の移動先、未対応の種類を指定した |
| `unsafe-path` | 絶対パス、親ディレクトリ参照、予約名、非正規化、シンボリックリンク、ディレクトリ以外のパス |
| `case-collision` | 大文字小文字だけが異なるパスが 2 つある |
| `invalid-markdown-encoding` | Markdown が正しい UTF-8 ではない |
| `link-target-ambiguous` | 変更後のリンク先が複数に解決される |
| `link-target-missing` / `link-broken` | 書き換えたリンクが解決できない |
| `link-target-changed` / `link-rewrite-conflict` | リンク先が移動した、または決定的に書き換えられない |
| `concurrent-modification` | ファイルが計画時のフィンガープリントと一致しない |
| `stale-plan` | 保存した計画が、同じ操作の再計画結果と一致しない |
| `unsupported-plan` | 保存した計画のスキーマバージョンが不明 |

警告は書き込みを止めません。`frontmatter-formatting` は、YAML の許容範囲で
キーの順序や書式が変わる可能性を警告します。

`apply` が失敗すると、ジャーナルに `state: "failed"` を書いて例外を投げます。
失敗前に書き込まれたファイルは、`recover` が復元するまで残ります。失敗時の
自動巻き戻しはなく、復旧は明示的な操作です。

## セキュリティと信頼境界

- すべてのパスは相対的な論理コンテンツパスです。絶対パス、`..`、空のセグメント、
  末尾のドットや空白、Windows の予約デバイス名、コンテンツルートの外へ出るパスは
  拒否されます。
- 既存の親ディレクトリは `lstat` で検査します。途中にシンボリックリンクや
  ディレクトリ以外があれば `unsafe-path` の競合になります。コンテンツツリーの
  走査でもシンボリックリンクは除外します。
- 計画は読み取り専用です。ロック、ジャーナル、バックアップ、計画を書くのは、
  明示的な apply、save、recover、rollback だけです。
- `.riebeckite/mutations/lock` が書き込みを直列化します。所有プロセスが消えた
  ロックは回収し、5 秒以上前の壊れたロックも古いものとして扱います。
- 書き込みはファイル単位でアトミックです。複数ファイルにまたがるファイルシステム
  トランザクションではないため、クラッシュすると復旧まで一部だけ適用された状態が
  残ることがあります。
- コンテンツはデータです。Markdown、フロントマター、ファイル内容を JavaScript として
  評価することはありません。
- ジャーナルとバックアップにはファイル本文が入ります。ローカル専用で、公開も
  コミットもしてはいけません。
- 変更が書き込むのはコンテンツディレクトリの中だけです。デプロイ、公開状態の更新、
  Git 履歴の変更は行いません。

## 制約

- マージや三者間の競合解決はありません。前提条件が変われば常に競合なので、
  操作を計画し直してください。
- 巻き戻しには完了済みのジャーナルと、変更されていない現在のファイルが必要です。
  ジャーナル外の編集を戻す一般的な undo ではありません。
- 中断した適用は、次の適用の前に復旧する必要があります。
- ジャーナルとバックアップのディレクトリは自動削除されません。復旧に不要になった
  計画ディレクトリは手動で削除してください。
- リンク書き換えの対象は、コンテンツモデルが扱う Markdown と WikiLink のリンク先
  です。任意のテキスト、コードブロック、外部 URL は書き換えません。
- ロックはローカルファイルシステム向けです。ネットワークボリュームを共有する
  複数マシン向けの分散ロックではありません。
- コンテンツ変更は、公開準備、移行状態、レンダリング結果を検証しません。それらは
  ビルド、移行、公開の各システムが担当します。

## トラブルシューティング

- **「Another content mutation is already applying or requires recovery」**:
  以前のプロセスが異常終了しています。失敗した実行が示したジャーナルに対して
  `riebeckite content recover <journal> --apply` を実行してください。ロックは、
  所有プロセスがないことを確認してから削除します。
- **「The file no longer matches the planned fingerprint」**: 編集後に計画し直して
  ください。新しく編集した内容へ古い計画を適用しないでください。
- **「The saved plan no longer matches a fresh validation」**: 計画を再生成して
  ください。保存した計画はスナップショットであり、リベースできるパッチではありません。
- **「Content path traverses a symbolic link」**: シンボリックリンクを実ディレクトリに
  置き換えるか、別のパスを選んでください。変更は意図的にリンクを辿りません。
- **「The link target is ambiguous」**: リンク元のノートでリンクを一意にするか、
  他の対象と衝突しないパスへ変更してください。
- **フロントマターのキー順が変わった**: YAML のシリアライズはバイト単位の保持では
  ありません。警告は想定どおりなので、コミット前に差分を確認してください。
