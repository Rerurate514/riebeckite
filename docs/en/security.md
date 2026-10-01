# Security model

Riebeckite is a static-site-oriented framework for a trusted site owner, a trusted local content repository, and trusted installed Themes and Plugins. It preserves Obsidian-compatible Markdown features, including raw HTML.

This page describes the security contract that Plugin authors and site owners should rely on.

## Trust boundaries

| Surface | Trust level | Contract |
| --- | --- | --- |
| Site configuration, Theme code, and installed Plugin code | Trusted site-owner controlled code | May produce HTML, CSS, JavaScript, endpoints, assets, client entries, and generated files. Review Plugins like application code before installing them. |
| Local Markdown content and frontmatter | Trusted content | Markdown may contain raw HTML. Riebeckite parses and emits that HTML; it does not sanitize tags, attributes, URL schemes, inline event handlers, iframes, SVG, or scripts. |
| Plugin-generated article HTML, slots, and standalone page bodies | Trusted generated HTML | Core and HonoX render these strings into the document. Plugins must escape untrusted text and validate context-specific URLs before creating HTML. |
| External URLs and embed providers | Context-specific external input | Each Plugin owns the policy for its URL context: links, images, iframes, API endpoints, webhook sources, and diagram servers are not interchangeable. |
| Plugin endpoint requests | Untrusted browser/network input | HonoX mounts declared endpoints and snapshots request data. Endpoint handlers must validate method-specific bodies, content type, size, query values, auth, CORS, and rate limits where needed. |
| Browser-side data | Untrusted unless it came from trusted serialized config | Treat query strings, location, postMessage data, form input, and remote responses as untrusted in client code. |

## Markdown and HTML pipeline

The Core pipeline intentionally enables raw HTML:

- Markdown is converted with `remark-rehype` using `allowDangerousHtml: true`.
- Raw HTML is parsed by `rehype-raw`.
- HTML is serialized with `rehype-stringify` using `allowDangerousHtml: true`.

This is not a sanitizer. It is a compatibility and authoring feature for trusted vaults. If a site builds content from untrusted users, sanitize or reject that content before it enters Riebeckite.

`escapeHtml`, `escapeHtmlAttribute`, and `escapeScriptJson` are escaping utilities for Plugin-generated strings. They do not make arbitrary HTML safe, and they do not validate URL schemes.

## Plugin responsibilities

Plugins that generate HTML must:

- escape text and attribute values derived from external or browser input;
- use `escapeScriptJson` for JSON embedded in `<script>`;
- validate URLs for the exact context where they are used;
- avoid putting secrets in `publicConfig`, client entries, generated HTML, or logs;
- validate endpoint request bodies and fail closed;
- document any external network or browser-loaded provider they introduce.

`inspectGeneratedHtml` is a final-page inspection hook for diagnostics. It is not a security scanner and should not be treated as a sanitizer.

## Current built-in policies

- Rich embeds accept only `https:` provider URLs. Known providers are converted to controlled iframe URLs, and generic iframes require an explicit host allow-list.
- Webmention source fetching accepts only HTTP(S), rejects credentials, limits redirects and body size, and rejects private hosts by default.
- Analytics collector URLs must be site-relative or HTTP(S), and the Cloudflare worker integration validates JSON shape and body size.
- Autocard metadata links and images are escaped and restricted to relative, `http:`, or `https:` URLs.
- Diagram and media Plugins may cause the browser to load configured external providers. Treat those provider URLs as trusted configuration.

## Vulnerability reporting

Please report vulnerabilities through GitHub Security Advisories or by opening a private report with enough detail to reproduce the issue. Do not include secrets, private content, or production tokens in reports.
