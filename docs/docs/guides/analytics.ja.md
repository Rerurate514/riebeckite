---
date: 2026-10-08
title: アクセス解析
---
# アクセス解析

Riebeckiteでは、記事ごとのページビューを収集できます。アクセス解析は、サイト側で計測する仕組みと、Cloudflare上でデータを受け取って保存する仕組みに分かれています。

| パッケージ | 役割 |
| --- | --- |
| `@riebeckite/plugin-analytics` | サイト側でページビューを送信する |
| `@riebeckite/analytics-cloudflare` | イベントを受け取り、Cloudflare 上で保存・集計する |

```mermaid id="af8k2m"
flowchart LR
    Browser["ブラウザ"]
    Site["Riebeckiteサイト<br/>静的サイト"]
    Worker["Analytics Worker<br/>Cloudflare"]
    Storage["D1 / KV"]

    Browser --> Site
    Browser -->|"page_view"| Worker
    Worker --> Storage
```

**Riebeckite のサイト自体は、これまでどおり静的サイトのまま**です。Analytics Worker はサイトとは別にデプロイします。サイトの `wrangler.jsonc` や `main` を、Analytics Worker 用に置き換える必要はありません。

## このページの構成

- [セットアップ](./analytics/setup.ja.md)
- [Cloudflare Worker](./analytics/worker.ja.md)

## 診断

`@riebeckite/plugin-diagnostics` を利用している場合、アクセス解析プラグインが有効な状態で、安定したコンテンツ ID を持たない公開ノートを検出できます。この場合は `analytics-untracked` という `info` の診断が報告されます。

```text id="j6n2dx"
公開記事
   ↓
安定したコンテンツIDがない
   ↓
analytics-untracked
```

計測漏れは、`riebeckite doctor` と開発用 Inspector で確認できます。

```sh id="vl1o09"
pnpm exec riebeckite doctor
```

診断はコンテンツを自動変更しません。詳しくは[診断](../framework/diagnostics.ja.md)を参照してください。

## 導入の流れ

初めてアクセス解析を導入する場合は、次の順番で進めると分かりやすくなります。

```mermaid id="zhsgd5"
flowchart TD
    ID["1. 計測するコンテンツに<br/>安定したIDを付ける"]
    Worker["2. Analytics Workerを作る"]
    Storage["3. D1またはKVを選ぶ"]
    Migration["4. マイグレーションを適用"]
    Deploy["5. Workerをデプロイ"]
    Plugin["6. アクセス解析プラグインを追加"]
    URL["7. collectorUrlを設定"]
    Check["8. check / doctorで確認"]

    ID --> Worker
    Worker --> Storage
    Storage --> Migration
    Migration --> Deploy
    Deploy --> Plugin
    Plugin --> URL
    URL --> Check
```

本番環境でページビューの集計やランキングを利用する場合は D1が必要です。KV の利用は、`capture` だけを必要とする用途に限定してください。

## まとめ

Riebeckite のアクセス解析は、静的サイトと解析用のバックエンドを分離しています。

```text id="rnbq84"
静的なRiebeckiteサイト
  ↓
@riebeckite/plugin-analytics
  ↓
page_view
  ↓
独立したAnalytics Worker
  ↓
D1 / KV
```

サイトは静的なまま維持され、アクセス解析のストレージや Cloudflare 固有の処理は、サイトや Core へ入りません。役割は次のように分かれています。

```text id="d4ph7x"
コンテンツの識別
  → 安定したコンテンツID

公開メタデータ
  → path / lang

ストレージ
  → D1 / KV

濫用の抑制
  → CORS / レート制限
```

特に、CORS とレート制限はイベントの正当性を保証する認証機能ではありません。収集したページビューは、信頼できない計測データとして扱ってください。

### 関連資料

- [コンテンツシステム](../framework/content-system/identity.ja.md#安定したコンテンツ id)：安定したコンテンツ ID
- [診断](../framework/diagnostics.ja.md)：構造化された指摘と `check` / `doctor`
- [リファレンス](../reference/README.ja.md)：公開パッケージと API
- [HonoX との統合](../framework/honox-integration.ja.md)：静的サイトのビルド
- [デプロイ](./deployment/README.ja.md)：サイトのデプロイ
