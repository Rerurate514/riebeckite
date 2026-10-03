# CLI Reference

Riebeckite CLI は、Site の作成、開発、検証、診断、Build、公開などを行うためのコマンドです。

基本的には **Riebeckite Site の application directory で実行します。**

```sh id="vgst3p"
npm exec riebeckite <command>
```

CLI は current working directory から application root を解決します。

## コマンド一覧

```text id="7uw50m"
riebeckite init [directory] [--preset <name>] [--force] [--list-presets]

riebeckite dev
riebeckite check
riebeckite doctor
riebeckite build [--full]
riebeckite deploy [--dry-run]
riebeckite profile [--full]

riebeckite inspect config
riebeckite inspect plugins
riebeckite inspect content [--list]
riebeckite inspect graph
riebeckite inspect build
```

それぞれの役割は次のとおりです。

| Command | 何をする？ | Build State |
| --- | --- | --- |
| `init` | 新しい Site を作る | 変更しない |
| `dev` | 開発環境を起動する | Integration に依存 |
| `check` | 設定が正しいか検証する | 変更しない |
| `doctor` | Project 全体の問題を診断する | 変更しない |
| `build` | Site を Build する | 成功時のみ更新 |
| `deploy` | 生成物を Cloudflare Workers へ公開する | 変更しない |
| `profile` | Build の性能を調査する | Build に依存 |
| `inspect` | 現在の解決結果を見る | 変更しない |

## どのコマンドを使う？

目的から選ぶと分かりやすくなります。

```mermaid id="ctqx7e"
flowchart TD
    Q{"何をしたい？"}

    Q -->|"Siteを作りたい"| Init["init"]
    Q -->|"開発したい"| Dev["dev"]
    Q -->|"設定が正しいか確認したい"| Check["check"]
    Q -->|"問題の原因を調べたい"| Doctor["doctor"]
    Q -->|"Siteを生成したい"| Build["build"]
    Q -->|"公開したい"| Deploy["deploy"]
    Q -->|"Buildが遅い"| Profile["profile"]
    Q -->|"現在の状態を見たい"| Inspect["inspect"]
```

特に混同しやすいのが `check`、`doctor`、`inspect`、`build` です。

簡単に分けると、

```text id="1djofm"
check
  → 正しい？

doctor
  → 問題はない？

inspect
  → 今どうなっている？

build
  → 実際に生成する
```

と考えると分かりやすいです。

## `init`

新しい Riebeckite Site を作成します。

```sh id="18r7wl"
riebeckite init
```

別のディレクトリへ作成する場合は、

```sh id="81jmbp"
riebeckite init my-site
```

のように指定します。

生成される Site には、基本的な

- Riebeckite config
- Vite / HonoX application
- route
- stylesheet
- 初期 content

が含まれます。

生成された Site は Riebeckite monorepo に依存しない、自己完結した application です。

### Preset を選ぶ

```sh id="vt7gdb"
riebeckite init my-site --preset starter
```

`--preset` で Site の初期構成を選択できます。

既定値は `starter` です。

利用できる preset は、

```sh id="b0n6ph"
riebeckite init --list-presets
```

で確認できます。

### 既存ファイルがある場合

`init` は、生成対象となるファイルがすでに存在する場合、そのまま上書きしません。

意図的に上書きする場合は、

```sh id="l5kjod"
riebeckite init my-site --force
```

を使用します。

`--force` は既存ファイルへ影響するため、内容を確認してから使用してください。

### `create-riebeckite`

同じ Site generator は `create-riebeckite` からも利用できます。

```sh id="kyw0rx"
npx create-riebeckite
```

`--preset` や `--list-presets` も同様に利用できます。

対話式では、Content source に続いてデプロイ設定を尋ねられます。

| 選択肢 | 生成されるもの |
| --- | --- |
| `Cloudflare Workers` | Wrangler の依存と `wrangler.jsonc`。依存関係のインストール後に `Deploy now?` を確認 |
| `GitHub Actions` | `wrangler.jsonc` と `.github/workflows/deploy.yml` |
| `Not now` | デプロイ設定を追加しない |

`Cloudflare Workers` で `Deploy now?` に `Yes` と答えると、生成後に build と `riebeckite deploy` が続けて実行されます。`Later` の場合は生成だけを行い、次を実行して公開します。

```sh
npm run build
npm exec riebeckite deploy
```

Site を生成した後は依存関係を install し、

```sh id="gzg1my"
npm install
npm exec riebeckite check
npm exec riebeckite build
```

で正常に構成されていることを確認できます。

## `dev`

開発環境を起動します。

```sh id="ujiy7q"
npm exec riebeckite dev
```

Riebeckite Integration の development workflow を利用して Site を起動します。

実際の development server や Build State の扱いは、使用している Integration に依存します。

通常の HonoX Site では、開発中のページ確認にこのコマンドを使用します。

## `check`

Config、Plugin、Capability の設定が有効か検証します。

```sh id="5a2lrf"
npm exec riebeckite check
```

たとえば、

- config の形式が正しいか
- Plugin の設定が正しいか
- 必要な capability が成立しているか

などを確認します。

```mermaid id="8ewhbp"
flowchart LR
    Config["Config"]
    Plugins["Plugins"]
    Capability["Capabilities"]

    Config --> Check["check"]
    Plugins --> Check
    Capability --> Check

    Check --> Result{"Valid?"}
```

`check` が成功したからといって、Site がすでに Build / Deploy されていることを意味するわけではありません。

`check` が保証するのは **Configuration が有効であること**です。

### Plugin Option Validation

Plugin の option validation も `check` の一部として実行されます。

Plugin は `validateOptions` を使って、自身の設定を検証できます。

たとえば Analytics Plugin なら、

- provider
- collector URL

などの設定を検証できます。

不正な Plugin 設定は、実際の Build より前に `check` で検出できます。

## `doctor`

Project の状態を広く診断します。

```sh id="zruccx"
npm exec riebeckite doctor
```

`doctor` は、

- environment
- config
- Plugin
- content
- Build State

などを確認します。

```mermaid id="f8k3hz"
flowchart LR
    Environment["Environment"]
    Config["Config"]
    Plugin["Plugins"]
    Content["Content"]
    State["Build State"]

    Environment --> Doctor["doctor"]
    Config --> Doctor
    Plugin --> Doctor
    Content --> Doctor
    State --> Doctor

    Doctor --> Diagnostics["Diagnostics"]
```

1つの診断に失敗しても、安全に続行できる独立した診断は可能な限り継続します。

Health check が失敗した場合は non-zero status で終了します。

### Deprecated Usage

古い API や非推奨の設定が検出された場合は、

```text id="q0zh69"
Deprecated usage
```

として warning が表示されます。

これは移行を促すための情報であり、それだけで `doctor` が失敗扱いになるわけではありません。

## `build`

Site を Build します。

```sh id="iznhhd"
npm exec riebeckite build
```

通常は incremental state を利用して、再利用可能な処理を省略します。

```mermaid id="l50vlh"
flowchart TD
    Build["riebeckite build"]
    State{"再利用可能なState?"}

    Build --> State
    State -->|Yes| Incremental["Incremental Build"]
    State -->|No| Full["必要な処理を再実行"]

    Incremental --> Success{"成功？"}
    Full --> Success

    Success -->|Yes| Save["新しいStateを保存"]
    Success -->|No| Keep["以前の有効なStateを維持"]
```

Build State は **Build が成功した場合だけ**更新されます。

失敗した Build が以前の正常な state を壊すことはありません。

### Full Build

incremental state の再利用を避けたい場合は、

```sh id="wpr38p"
npm exec -- riebeckite build --full
```

を使用します。

Build の再現確認や incremental behavior の問題を切り分ける場合に利用できます。

詳しくは [Build System](../framework/build-system.md) を参照してください。

## `deploy`

Build 済みの生成物を Cloudflare Workers へ公開します。

```sh id="k4n8we"
npm exec riebeckite deploy
```

`deploy` は Wrangler を呼び出して `dist/` を公開します。初回は Wrangler の OAuth で Cloudflare にログインし、`wrangler.jsonc` が無い場合はプロジェクト名から生成します。公開 URL は `https://<worker-name>.<account>.workers.dev` です。`create-riebeckite` で `Cloudflare Workers` を選ぶと、Wrangler の依存と `wrangler.jsonc` を含む、このコマンドを実行できるサイトが生成されます。

`deploy` は Build を行いません。先に `npm exec riebeckite build` を実行してください。

Cloudflare へ接続せずに設定とアセットを検証する場合は、

```sh id="d9x2qb"
npm exec -- riebeckite deploy --dry-run
```

を使用します。`npm exec` は `--dry-run` を自身の option として解釈する場合があるため、`--` で区切ってください。

push ごとに自動で deploy したい場合は GitHub Actions を利用できます。詳しくは [Deployment](../guides/deployment/README.md) を参照してください。

## `profile`

Build のどこに時間がかかっているか調査します。

```sh id="5pvcmf"
npm exec riebeckite profile
```

Trace を収集し、Build phase や Plugin 処理などの performance report を表示します。

incremental reuse を避けて計測する場合は、

```sh id="mqr87f"
npm exec -- riebeckite profile --full
```

を使用します。

`profile` は性能調査のための command であり、Configuration validity を確認するための command ではありません。

## `inspect`

Riebeckite が現在認識している状態を確認します。

```sh id="enl4wg"
npm exec riebeckite inspect plugins
```

Inspector は **read-only** です。

実行しても、

- Build
- Build State の書き込み
- Plugin Cache の書き込み
- Asset emission
- Vite / HonoX Build
- Artifact render
- Config の自動修正

を行いません。

### Config

```sh id="c3x2ak"
npm exec riebeckite inspect config
```

解決済みの Configuration を確認します。

### Plugins

```sh id="wnn5fz"
npm exec riebeckite inspect plugins
```

現在有効な Plugin を確認します。

### Content

```sh id="qqht5s"
npm exec -- riebeckite inspect content --list
```

現在の Content entry と解決済みの canonical permalink などを確認します。

特定の記事がどの URL として認識されているか確認したい場合に便利です。

### Graph

```sh id="s8q7lx"
npm exec riebeckite inspect graph
```

Content Graph を確認します。

WikiLink、backlink、graph extension などを調査するときに利用できます。

### Build

```sh id="y2uc9f"
npm exec riebeckite inspect build
```

現在の incremental Build State を確認します。

State が存在しない場合や壊れている場合も、新しい state を生成せず、その状態と理由を表示します。

Inspector の詳しい設計については [Inspector](../framework/inspector.md) を参照してください。

## Error の表示

CLI command が失敗した場合は、可能な範囲で構造化されたエラー情報を表示します。

主に、

- Error 名
- Message
- Error code
- File path
- 修正方法の hint

などです。

原因となった error がネストしている場合は、

```text id="bf6q65"
Caused by:
```

として表示されます。

単に「失敗した」と表示するのではなく、**何が失敗し、どこを確認すればよいか**が分かることを目標としています。

## 通常の Workflow

新しく Site を作る場合は、次のような流れになります。

```mermaid id="gr7mks"
flowchart LR
    Init["init"]
    Install["npm install"]
    Check["check"]
    Dev["dev"]
    Build["build"]
    Deploy["deploy"]

    Init --> Install
    Install --> Check
    Check --> Dev
    Dev --> Build
    Build --> Deploy
```

`build` の後は `npm exec riebeckite deploy` で生成物を公開できます。

問題が発生した場合は、目的に応じて `doctor`、`inspect`、`profile` を使います。

```mermaid id="9g1nvs"
flowchart TD
    Problem{"問題がある"}

    Problem -->|"設定がおかしい？"| Check["check"]
    Problem -->|"原因が分からない"| Doctor["doctor"]
    Problem -->|"解決結果を確認したい"| Inspect["inspect"]
    Problem -->|"Buildが遅い"| Profile["profile"]
    Problem -->|"Incrementalを疑う"| Full["build --full"]
```

迷った場合は、

**作るなら `init`、開発するなら `dev`、検証するなら `check`、診断するなら `doctor`、見るだけなら `inspect`、生成するなら `build`、公開するなら `deploy`、速度を調べるなら `profile`**

と覚えておくと、各 command の役割を区別しやすくなります。

診断結果については [Diagnostics](../framework/diagnostics.md)、非推奨 API からの移行については [Upgrading](../guides/upgrading.md)、Build State については [Build System](../framework/build-system.md) を参照してください。
