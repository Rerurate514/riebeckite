---
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

このページでは、Riebeckiteがどこまで安全性を保証し、どこから利用者やPlugin側で確認する必要があるかを説明します。

## 基本的な考え方

Riebeckiteでは、データを大きく次のように扱います。

| 種類 | 扱い |
| --- | --- |
| サイト設定 | 信頼する |
| インストールしたTheme / Plugin | 信頼する |
| ローカルのMarkdown / frontmatter | 信頼する |
| 外部サイトから取得したデータ | 内容を確認して扱う |
| ブラウザやネットワークからの入力 | 信頼せず検証する |

つまり、Riebeckiteは**不特定多数のユーザーが自由にHTMLを投稿するサービス向けのフレームワークではありません**。

自分のObsidian VaultやMarkdownリポジトリなど、管理しているコンテンツを公開する用途を想定しています。

## Markdown内のHTML

Riebeckiteでは、MarkdownにHTMLを直接書けます。

たとえば次のような記述もそのまま利用できます。

```html
<details>
  <summary>詳細を見る</summary>
  <p>内容</p>
</details>
```

これはObsidianとの互換性や、Markdownだけでは表現できない内容を記述できるようにするためです。

その代わり、RiebeckiteはMarkdown内のHTMLを自動的には無害化しません。

そのため、**信頼できない人が作成したMarkdownをそのまま公開しないでください。**

外部から受け取ったMarkdownを公開する場合は、Riebeckiteへ渡す前に内容を検証する必要があります。

## ThemeとPlugin

インストールしたThemeやPluginは、Riebeckiteの中でプログラムとして動作します。

Pluginは、たとえば次のようなことができます。

- HTMLを生成する
- JavaScriptをブラウザで実行する
- 外部サイトへアクセスする
- 独自ページを追加する
- endpointを追加する
- ファイルを生成する

そのため、Pluginは一般的なnpm packageと同じように、**信頼できるものだけをインストールしてください。**

RiebeckiteがPluginの処理内容を自動的に安全化することはありません。

## 外部サイトのデータ

一部のPluginは外部サービスを利用します。

たとえば、

- Webページの情報取得
- iframeによる埋め込み
- 外部画像
- Diagram生成サービス
- Webmention

などです。

外部から取得したデータは、ローカルMarkdownとは異なり、信頼できるとは限りません。

そのためRiebeckiteの公式Pluginでは、それぞれの用途に応じてURLやレスポンスを検証します。

たとえばRich Embedでは、安全でないURLを拒否し、任意のサイトをiframeとして表示する場合には許可するホストを明示する必要があります。

## Pluginを作る場合

Pluginで外部データやユーザー入力を扱う場合は、その値をそのままHTMLへ埋め込まないでください。

特に次の点に注意してください。

- 外部から取得した文字列をHTMLへ入れる場合はescapeする
- URLは用途に応じて安全なものか確認する
- `<script>` にデータを埋め込む場合は `escapeScriptJson` を利用する
- secretやtokenをHTMLやブラウザ側の設定へ含めない
- endpointで受け取ったデータは利用前に検証する

Riebeckite Coreには、HTMLを生成するときに利用できる次のhelperがあります。

```ts
escapeHtml(...)
escapeHtmlAttribute(...)
escapeScriptJson(...)
```

これらは文字列を適切にescapeするためのものです。

任意のHTMLを安全なHTMLへ変換したり、URLそのものが安全かどうかを判定したりするものではありません。

## Endpoint

Pluginは独自のendpointを提供できます。

ブラウザやネットワークからendpointへ送られてくるデータは、信頼できない入力として扱ってください。

必要に応じて、

- request body
- query parameter
- Content-Type
- データサイズ
- 認証
- CORS

などを確認してください。

Riebeckiteはendpointを登録してrequestをPluginへ渡しますが、そのデータがPluginの用途に適しているかどうかはPlugin側で判断します。

## 組み込みPluginの対策

Riebeckiteの公式Pluginでも、外部データを扱うものには用途に応じた制限があります。

たとえば、

- Rich Embedではiframeに利用できるURLを制限する
- Webmentionでは取得先やレスポンスサイズなどを制限する
- Analyticsでは送信先URLや受信するJSONを検証する
- Autocardではリンクや画像URLを検証してからHTMLへ出力する

といった対策を行っています。

外部サービスを利用するPluginでは、そのサービス自体も信頼できるものを設定してください。

## Riebeckiteが自動的に行わないこと

Riebeckiteは、すべての入力を自動的に安全なHTMLへ変換する仕組みではありません。

特に、

- Markdown内のraw HTML
- Pluginが生成したHTML
- インストールしたPluginのJavaScript

などは、自動的には無害化されません。

これは、自分で管理しているMarkdownやObsidian Vaultをできるだけそのまま公開できるようにするための設計です。

**自分で管理しているコンテンツを公開する場合は、そのまま利用できます。外部から受け取ったコンテンツを公開する場合は、事前に検証してください。**

## 脆弱性を見つけた場合

Riebeckiteにセキュリティ上の問題を見つけた場合は、公開Issueではなく、GitHubのSecurity機能を利用して報告してください。

報告には問題を再現するために必要な情報を含めてください。

パスワード、アクセストークン、非公開コンテンツなどの機密情報は含めないでください。
