---
date: 2026-10-08
title: セキュリティモデル
sidebar:
  label: Security
  order: 80
---
# セキュリティモデル

Riebeckite は、**自分で管理しているコンテンツを公開する静的サイト**を主な用途としています。

そのため、次のものは基本的に信頼できるものとして扱います。

- 自分で用意した Markdown や画像などのコンテンツ
- 自分で設定した `riebeckite.config.ts`
- 自分でインストールした Theme や Plugin

一方、外部サイトから取得したデータや、ブラウザから送られてくる入力は信頼できるとは限りません。

このページでは、Riebeckite がどこまで安全性を保証し、どこから利用者や Plugin 側で確認する必要があるかを説明します。

## 基本的な考え方

Riebeckite では、データを大きく次のように扱います。

| 種類 | 扱い |
| --- | --- |
| サイト設定 | 信頼する |
| インストールした Theme / Plugin | 信頼する |
| ローカルの Markdown / frontmatter | 信頼する。本文の raw HTML は Core の許可リストで除去される |
| 外部サイトから取得したデータ | 内容を確認して扱う |
| ブラウザやネットワークからの入力 | 信頼せず検証する |

つまり、Riebeckite は**不特定多数のユーザーが自由に HTML を投稿するサービス向けのフレームワークではありません**。

自分の Obsidian Vault や Markdown リポジトリなど、管理しているコンテンツを公開する用途を想定しています。

## Markdown内のHTML

Riebeckite では、Markdown に HTML を直接書けます。

たとえば次のような記述もそのまま利用できます。

```html
<details>
  <summary>詳細を見る</summary>
  <p>内容</p>
</details>
```

これは Obsidian との互換性や、Markdown だけでは表現できない内容を記述できるようにするためです。

### Markdown パイプライン

Core のパイプラインは raw HTML を受け取り、その後にサニタイズします。

- Markdown は `remark-rehype` で変換し、`allowDangerousHtml: true` を指定します。
- raw HTML は `rehype-raw` で解析します。
- `rehype-sanitize` が `packages/core/src/markdown_sanitize_schema.ts` の許可リストでツリーを絞り込みます。
- インライン style は安全な最小限の書式に限定し、`object` はローカルの PDF だけに制限します。
- HTML は `rehype-stringify` でシリアライズし、`allowDangerousHtml: true` を指定します。

許可リストには、Obsidian のノートでよく使う `details`、`summary`、figure、メディア要素、SVG の一部、KaTeX のマークアップが含まれます。許可リスト外のタグや属性は escape されるのではなく削除されます。Markdown 内の `<script>`、`onclick` 属性、`javascript:` URL は生成ページに残りません。

そのため、**信頼できない人が作成した Markdown でも HTML がそのまま実行されることはありません**。ただし、サニタイザーは内容の正確さやリンク先の妥当性を審査するものではありません。外部から受け取った Markdown を公開する場合は、内容とリンク先を確認してください。

## ThemeとPlugin

インストールした Theme や Plugin は、Riebeckite の中でプログラムとして動作します。

Plugin は、たとえば次のようなことができます。

- HTML を生成する
- JavaScript をブラウザで実行する
- 外部サイトへアクセスする
- 独自ページを追加する
- endpoint を追加する
- ファイルを生成する

そのため、Plugin は一般的な npm package と同じように、**信頼できるものだけをインストールしてください**。

Plugin が生成する HTML は Markdown のサニタイザー通過後に追加されるため、Core による自動的な無害化の対象外です。Plugin は自分が受け取った値を自分で escape してください。Riebeckite が Plugin の処理内容を自動的に安全化することはありません。

`inspectGeneratedHtml` は診断用の最終ページ検査フックです。セキュリティスキャナーではなく、サニタイザーとして扱わないでください。

## 外部サイトのデータ

一部の Plugin は外部サービスを利用します。

たとえば、

- Web ページの情報取得
- iframe による埋め込み
- 外部画像
- Diagram 生成サービス
- Webmention

などです。

外部から取得したデータは、ローカル Markdown とは異なり、信頼できるとは限りません。

そのため Riebeckite の公式 Plugin では、それぞれの用途に応じて URL やレスポンスを検証します。

たとえば Rich Embed では、安全でない URL を拒否し、任意のサイトを iframe として表示する場合には許可するホストを明示する必要があります。

## Pluginを作る場合

Plugin で外部データやユーザー入力を扱う場合は、その値をそのまま HTML へ埋め込まないでください。

特に次の点に注意してください。

- 外部から取得した文字列を HTML へ入れる場合は escape する
- URL は用途に応じて安全なものか確認する
- `<script>` にデータを埋め込む場合は `escapeScriptJson` を利用する
- secret や token を HTML やブラウザ側の設定へ含めない
- endpoint で受け取ったデータは利用前に検証する

Riebeckite Core には、HTML を生成するときに利用できる次の helper があります。

```ts
escapeHtml(...)
escapeHtmlAttribute(...)
escapeScriptJson(...)
```

これらは文字列を適切に escape するためのものです。

任意の HTML を安全な HTML へ変換したり、URL そのものが安全かどうかを判定したりするものではありません。

## エンドポイント

Plugin は独自の endpoint を提供できます。

ブラウザやネットワークから endpoint へ送られてくるデータは、信頼できない入力として扱ってください。

必要に応じて、

- request body
- query parameter
- Content-Type
- データサイズ
- 認証
- CORS
- レート制限

などを確認してください。

Riebeckite は endpoint を登録して request を Plugin へ渡しますが、そのデータが Plugin の用途に適しているかどうかは Plugin 側で判断します。

HonoX は request body を 1 MiB まで読み取り、それを超える場合は endpoint を呼び出さずに `413 Payload Too Large` を返します。これは無制限のバッファリングを防ぐためのもので、Plugin 側のサイズ検証・認証・レート制限を置き換えるものではありません。

## 組み込みPluginの対策

Riebeckite の公式 Plugin でも、外部データを扱うものには用途に応じた制限があります。

たとえば、

- Rich Embed は `https:` のプロバイダー URL だけを受け付け、既知のプロバイダーを sandbox 付きの iframe URL へ変換します。汎用 iframe はホストの明示的な許可リストが必要です。
- Webmention の取得元は HTTP(S) だけを受け付け、認証情報を拒否し、リダイレクトと本文サイズを制限し、DNS 解決後にプライベートホストを拒否します。DNS 解決に失敗した場合は取得を拒否し、検証済みのアドレスを接続に固定します。DNS モジュールを持たないランタイムでは、ホスト名とリテラル IP の検査のみが適用されます。受信 endpoint にはクライアント単位のベストエフォートなレート制限があり、既定のインメモリプロバイダーは最大 1,000 件のメンションを保持します。
- Analytics の収集 URL はサイト相対または HTTPS に限られ、平文 HTTP は localhost だけで許可されます。Cloudflare Worker 連携は JSON の形と本文サイズを検証します。
- Autocard のメタデータリンクと画像はエスケープされ、相対 URL、`http:`、`https:` に制限されます。
- Diagram とメディアの Plugin は、設定された外部プロバイダーをブラウザに読み込ませることがあります。その URL は信頼できる設定として扱ってください。

といった対策を行っています。

外部サービスを利用する Plugin では、そのサービス自体も信頼できるものを設定してください。

## Riebeckiteが自動的に行わないこと

Riebeckite は、すべての入力を自動的に安全な HTML へ変換する仕組みではありません。

特に、

- Markdown 内の raw HTML
- Plugin が生成した HTML
- インストールした Plugin の JavaScript

などは、自動的には無害化されません。

これは、自分で管理している Markdown や Obsidian Vault をできるだけそのまま公開できるようにするための設計です。

**自分で管理しているコンテンツを公開する場合は、そのまま利用できます。外部から受け取ったコンテンツを公開する場合は、事前に検証してください**。

## 脆弱性を見つけた場合

Riebeckite にセキュリティ上の問題を見つけた場合は、公開 Issue ではなく、GitHub の Security 機能を利用して報告してください。

報告には問題を再現するために必要な情報を含めてください。

パスワード、アクセストークン、非公開コンテンツなどの機密情報は含めないでください。
