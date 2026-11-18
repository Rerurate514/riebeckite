---
date: 2026-10-08
title: セキュリティモデル
sidebar.label: セキュリティ
sidebar.order: 100
---
# セキュリティモデル

Riebeckite は、**自分で管理しているコンテンツを公開する静的サイト**を主な用途としています。Obsidian互換のMarkdown機能を、raw HTMLを含めて保持します。

このページでは、Plugin作者とサイトオーナーが前提にできるセキュリティ上の取り決めを説明します。

## 信頼境界

| 境界 | 信頼レベル | 取り決め |
| --- | --- | --- |
| サイト設定、Themeコード、およびインストールしたPluginコード | サイトオーナーが信頼するコード | HTML、CSS、JavaScript、エンドポイント、アセット、クライアントエントリ、および生成されたファイルを生成する可能性があります。インストールするPluginをアプリケーションコードとしてレビューしてください。 |
| ローカルMarkdownコンテンツとfrontmatter | 信頼されたコンテンツ | raw HTMLはCoreの許可リストでパースされ、フィルタリングされます。スクリプト、イベントハンドラ、許可されないタグと属性、および安全でないURLスキームは削除されます。 |
| Pluginが生成した記事HTMLとスタンドアロンページボディ | 信頼された生成HTML | CoreとHonoXはこれらの文字列をMarkdownサニタイズの後にドキュメントにレンダリングします。Pluginは信頼できないテキストをエスケープし、HTMLを作成する前にコンテキスト固有のURLを検証する必要があります。 |
| 外部URLと埋め込みプロバイダ | コンテキスト固有の外部入力 | 各Pluginは自らのURLコンテキストポリシーを所有します。リンク、画像、iframes、APIエンドポイント、ウェブフックソース、および図面サーバーは互いに置き換えられません。 |
| Pluginエンドポイントリクエスト | 信頼されないブラウザ/ネットワーク入力 | HonoXは宣言されたエンドポイントをマウントし、request bodyを最大1MiBまでバッファリングし、より大きいリクエストに対して`413`を返します。エンドポイントハンドラは、method-specific bodies、content type、query値、auth、CORS、およびレートリミットを検証する必要があります。 |
| ブラウザ側データ | 信頼できる設定から渡された値を除き、信頼しない | クエリ文字列、location、postMessageデータ、フォーム入力、およびremote responsesはクライアントコードで信頼されないとして扱ってください。 |

## MarkdownとHTMLのパイプライン

Coreのパイプラインはraw HTMLを受け取り、その後にサニタイズします。

- Markdownは`remark-rehype`で変換し、`allowDangerousHtml: true`を指定します。
- raw HTMLは`rehype-raw`で解析します。
- `rehype-sanitize`が`packages/core/src/markdown_sanitize_schema.ts`の許可リストでツリーを絞り込みます。
- インラインstyleは安全な最小限の書式に限定し、`object`はローカルのPDFだけに制限します。
- HTMLは`rehype-stringify`でシリアライズし、`allowDangerousHtml: true`を指定します。

許可リストには、Obsidianのノートでよく使う`details`、`summary`、figure、メディア要素、SVGの一部、KaTeXのマークアップが含まれます。許可リスト外のタグや属性はエスケープされるのではなく削除されます。Markdown内の`<script>`要素、`onclick`属性、`javascript:` URLは生成ページに到達しません。

たとえば、次のノートはそのまま残ります。

```html
<details>
  <summary>Show details</summary>
  <p>Content</p>
</details>
```

Riebeckiteがこれを有効にしているのは、Obsidianとの互換性のためと、Markdownだけでは表現できない内容を記述できるようにするためです。サニタイザーはノート本文に含まれる偶発的または悪意のあるHTMLに対する防御であり、内容そのものを審査するものではありません。信頼できない人が書いたMarkdownは、その内容とリンク先を確認せずに公開しないでください。

`escapeHtml`、`escapeHtmlAttribute`、`escapeScriptJson`は、Pluginが生成する文字列のためのエスケープ用ユーティリティです。任意のHTMLを安全にするものではなく、URLスキームを検証するものでもありません。

```ts
escapeHtml(...)
escapeHtmlAttribute(...)
escapeScriptJson(...)
```

## Pluginの責務

HTMLを生成するPluginは、次のことを行う必要があります。

- 外部またはブラウザからの入力に由来するテキストと属性値をエスケープする
- `<script>`に埋め込むJSONには`escapeScriptJson`を使う
- URLは、それが使われる正確なコンテキストに合わせて検証する
- `publicConfig`、クライアントエントリ、生成HTML、ログに秘密情報を置かない
- エンドポイントのrequest bodyを検証し、検証に失敗した場合は拒否する
- 導入する外部ネットワークまたはブラウザ読み込みのプロバイダを文書化する

`inspectGeneratedHtml`は診断用の最終ページ検査フックです。セキュリティスキャナーではなく、サニタイザーとして扱わないでください。

## Pluginのエンドポイント

Pluginは独自のエンドポイントを提供できます。ブラウザやネットワークからエンドポイントへ送られてくるものはすべて信頼できない入力として扱い、必要に応じてrequest body、queryパラメータ、`Content-Type`、サイズ、認証、CORS、レート制限を検証してください。RiebeckiteはエンドポイントをマウントしてrequestをPluginへ渡しますが、そのデータがPluginの用途に適しているかどうかは判断しません。

HonoXはrequest bodyを1 MiBの上限まで読み取り、上限を超えた場合はエンドポイントを呼び出す前に`413 Payload Too Large`を返します。これは無制限のバッファリングからプロセスを守るためのもので、Plugin側のサイズ検証・認証・レート制限を置き換えるものではありません。

## Riebeckiteが自動的に行わないこと

Markdownのraw HTMLは出力前にサニタイズされます。保護の対象外となる境界は2つあります。

- Pluginが生成したHTMLはMarkdownサニタイザーの後に実行され、アプリケーションコードとして信頼されます。Plugin自身が入力をエスケープする必要があります。
- インストールしたPluginとThemeのJavaScriptは信頼されたコードであり、Coreによってサンドボックス化されません。

他の人から受け取ったコンテンツは、そのHTMLがフィルタリングされていても、正確さ、リンク、ポリシーの面で引き続き確認が必要です。

## 現在の組み込みポリシー

- Rich Embedは`https:`のプロバイダーURLだけを受け付けます。既知のプロバイダーはsandbox付きのiframe URLへ変換され、汎用iframeはホストの明示的な許可リストを必要とします。
- Webmentionの取得元はHTTP(S)だけを受け付け、認証情報を拒否し、リダイレクトと本文サイズを制限し、DNS解決後にプライベートホストを拒否し、DNS解決に失敗した場合は拒否します。また、検証済みのアドレスを接続に固定します。DNSモジュールを持たないランタイムでは、ホスト名とリテラルIPの検査が引き続き適用されます。受信エンドポイントにはクライアント単位のベストエフォートなレート制限があり、既定のメモリプロバイダーは最大1,000件のメンションを保持します。
- Analyticsの収集URLはサイト相対またはHTTPSでなければならず、平文HTTPはlocalhostだけで許可されます。Cloudflare Worker連携はJSONの形と本文サイズを検証します。
- Autocardのメタデータリンクと画像はエスケープされ、相対URL、`http:`、`https:`に制限されます。
- DiagramとメディアのPluginは、設定された外部プロバイダーをブラウザに読み込ませることがあります。そのプロバイダーのURLは信頼できる設定として扱ってください。

## 脆弱性の報告

脆弱性はGitHub Security Advisoriesを通じて、または問題を再現するのに十分な詳細を含む非公開の報告として報告してください。報告に秘密情報、非公開コンテンツ、本番用トークンを含めないでください。
