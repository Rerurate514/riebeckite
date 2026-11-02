---
date: 2026-10-06
title: Security model
sidebar:
  label: Security
  order: 80
---
# Security model

Riebeckite is a static-site-oriented framework for a trusted site owner, a trusted local content repository, and trusted installed Themes and Plugins. It preserves Obsidian-compatible Markdown features, including raw HTML.

This page describes the security contract that Plugin authors and site owners should rely on.

## Trust boundaries

| Surface | Trust level | Contract |
| --- | --- | --- |
| Site configuration, Theme code, and installed Plugin code | Trusted site-owner controlled code | May produce HTML, CSS, JavaScript, endpoints, assets, client entries, and generated files. Review Plugins like application code before installing them. |
| Local Markdown content and frontmatter | Trusted content | Raw HTML is parsed and filtered by the Core sanitizer allowlist. Scripts, event handlers, disallowed tags and attributes, and unsafe URL schemes are removed. |
| Plugin-generated article HTML and standalone page bodies | Trusted generated HTML | Core and HonoX render these strings into the document after Markdown sanitization. Plugins must escape untrusted text and validate context-specific URLs before creating HTML. |
| External URLs and embed providers | Context-specific external input | Each Plugin owns the policy for its URL context: links, images, iframes, API endpoints, webhook sources, and diagram servers are not interchangeable. |
| Plugin endpoint requests | Untrusted browser/network input | HonoX mounts declared endpoints and snapshots request data. Endpoint handlers must validate method-specific bodies, content type, size, query values, auth, CORS, and rate limits where needed. |
| Browser-side data | Untrusted unless it came from trusted serialized config | Treat query strings, location, postMessage data, form input, and remote responses as untrusted in client code. |

## Markdown and HTML pipeline

The Core pipeline accepts raw HTML and then sanitizes it:

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

## What Riebeckite does not do automatically

Markdown raw HTML is sanitized before it is emitted. Two boundaries remain outside that protection:

- Plugin-generated HTML runs after the Markdown sanitizer and is trusted as application code. A Plugin must escape its own inputs.
- Installed Plugin and Theme JavaScript is trusted code and is never sandboxed by Core.

Content received from other people still needs review for accuracy, links, and policy, even though its HTML is filtered.

## Current built-in policies

- Rich embeds accept only `https:` provider URLs. Known providers are converted to controlled iframe URLs, and generic iframes require an explicit host allow-list.
- Webmention source fetching accepts only HTTP(S), rejects credentials, limits redirects and body size, and rejects private hosts by default.
- Analytics collector URLs must be site-relative or HTTP(S), and the Cloudflare worker integration validates JSON shape and body size.
- Autocard metadata links and images are escaped and restricted to relative, `http:`, or `https:` URLs.
- Diagram and media Plugins may cause the browser to load configured external providers. Treat those provider URLs as trusted configuration.

## Vulnerability reporting

Please report vulnerabilities through GitHub Security Advisories or by opening a private report with enough detail to reproduce the issue. Do not include secrets, private content, or production tokens in reports.
