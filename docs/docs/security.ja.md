---
date: 2026-10-08
title: セキュリティモデル
sidebar.label: セキュリティ
sidebar.order: 100
---
# セキュリティモデル

Riebeckite は、**自分で管理しているコンテンツを公開する静的サイト**を主な用途としています。Obsidian互換のMarkdown機能、すなわちraw HTMLを保持します。

このページでは、Plugin作者とサイトオーナーが頼りにできるセキュリティコンタクトを説明します。

## Trust boundaries

| Surface | Trust level | Contract |
| --- | --- | --- |
| サイト設定、Themeコード、およびインストールしたPluginコード | サイトオーナーが信頼するコード | HTML、CSS、JavaScript、エンドポイント、アセット、クライアントエントリ、および生成されたファイルを生成する可能性があります。インストールするPluginをアプリケーションコードとしてレビューしてください。 |
| ローカルMarkdownコンテンツとfrontmatter | 信頼されたコンテンツ | raw HTMLはCoreの許可リストでパースされ、フィルタリングされます。スクリプト、イベントハンドラ、許可されないタグと属性、および安全でないURLスキームは削除されます。 |
| Plugin生成記HTMLとスタンドアロンページボディ | 信頼された生成HTML | CoreとHonoXはこれらの文字列をMarkdownサニタイズの後にドキュメントにレンダリングします。Pluginは不適格なテキストをエスケープし、HTMLを作成する前にコンテキスト固有のURLを検証する必要があります。 |
| 外部URLと埋め込みプロバイダ | コンテキスト固外部入力 | 各Pluginは自らのURLコンテキストポリシーを所有します。リンク、画像、iframes、APIエンドポイント、ウェブフックソース、および図面サーバーは互換性がありません。 |
| Pluginエンドポイントリクエスト | 信頼されないブラウザ/ネットワーク入力 | HonoXは宣言されたエンドポイントをマウントし、request bodyを最大1MiBまでバッファリングし、より大きいリクエストに対して`413`を返します。エンドポイントハンドラは、method-specific bodies、content type、query値、auth、CORS、およびレートリミットを検証する必要があります。 |
| ブラウザ側データ | 信頼されないUnless trusted serialized configから来た場合 | クエリ文字列、location、postMessageデータ、フォーム入力、およびremote responsesはクライアントコードで信頼されないとして扱ってください。 |

## Markdown and HTML pipeline

Core pipeline accepts raw HTML and then sanitizes it:

- Markdown is converted with `remark-rehype` using `allowDangerousHtml: true`.
- Raw HTML is parsed by `rehype-raw`.
- The tree is filtered by `rehype-sanitize` with the allowlist in `packages/core/src/markdown_sanitize_schema.ts`.
- Inline styles are reduced to a small safe subset, and `object` elements are limited to local PDF files.
- HTML is serialized with `rehype-stringify` using `allowDangerousHtml: true`.

The allowlist keeps the HTML that Obsidian notes commonly use, including `details`, `summary`, figures, media elements, a subset of SVG, and KaTeX markup. Tags and attributes outside the allowlist are removed rather than escaped. A `<script>` element, an `onclick` attribute, and a `javascript:` URL in Markdown do not reach the generated page.

For example, this note stays intact:

```html
<details>
  <summary>Show details</summary>
  <p>Content</p>
</details>
```

Riebeckite enables this for Obsidian compatibility and to allow content that Markdown alone cannot express. The sanitizer is a defense against accidental or malicious HTML in note bodies; it is not a review of the content itself. Do not publish Markdown written by people you do not trust without reviewing what it says and where it links.

`escapeHtml`, `escapeHtmlAttribute`, and `escapeScriptJson` are escaping utilities for Plugin-generated strings. They do not make arbitrary HTML safe, and they do not validate URL schemes.

```ts
escapeHtml(...)
escapeHtmlAttribute(...)
escapeScriptJson(...)
```

## Plugin responsibilities

Plugins that generate HTML must:

- escape text and attribute values derived from external or browser input;
- use `escapeScriptJson` for JSON embedded in `<script>`;
- validate URLs for the exact context where they are used;
- avoid putting secrets in `publicConfig`, client entries, generated HTML, or logs;
- validate endpoint request bodies and fail closed;
- document any external network or browser-loaded provider they introduce.

`inspectGeneratedHtml` is a final-page inspection hook for diagnostics. It is not a security scanner and should not be treated as a sanitizer.

## Plugin endpoints

Plugins can expose their own endpoints. Treat everything a browser or network sends to an endpoint as untrusted input, and validate the request body, query parameters, `Content-Type`, size, authentication, CORS, and rate limits where needed. Riebeckite mounts the endpoint and passes the request to the Plugin; it does not decide whether the data is appropriate for the Plugin's purpose.

HonoX reads the request body through a 1 MiB cap and returns `413 Payload Too Large` before calling the endpoint when the cap is exceeded. This protects the process from unbounded buffering, but it does not replace the Plugin's own size check, authentication, or rate limiting.

## What Riebeckite does not do automatically

Markdown raw HTML is sanitized before it is emitted. Two boundaries remain outside that protection:

- Plugin-generated HTML runs after the Markdown sanitizer and is trusted as application code. A Plugin must escape its own inputs.
- Installed Plugin and Theme JavaScript is trusted code and is never sandboxed by Core.

Content received from other people still needs review for accuracy, links, and policy, even though its HTML is filtered.

## Current built-in policies

- Rich embeds accept only `https:` provider URLs. Known providers are converted to sandboxed iframe URLs, and generic iframes require an explicit host allow-list.
- Webmention source fetching accepts only HTTP(S), rejects credentials, limits redirects and body size, rejects private hosts after DNS resolution, fails closed when DNS resolution fails, and pins the validated address for the connection; on runtimes without a DNS module, hostname and literal-IP checks still apply. The receive endpoint applies a best-effort per-client rate limit, and the default memory provider keeps at most 1,000 mentions.
- Analytics collector URLs must be site-relative or HTTPS; plain HTTP is accepted only for localhost. The Cloudflare worker integration validates JSON shape and body size.
- Autocard metadata links and images are escaped and restricted to relative, `http:`, or `https:` URLs.
- Diagram and media Plugins may cause the browser to load configured external providers. Treat those provider URLs as trusted configuration.

## Vulnerability reporting

Please report vulnerabilities through GitHub Security Advisories or by opening a private report with enough detail to reproduce the issue. Do not include secrets, private content, or production tokens in reports.