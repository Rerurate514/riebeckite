# Mermaid and Pele comparison

Measured locally on Node.js 24 with Pele 1.7.0 and Riebeckite's existing Mermaid plugin 0.0.30. The repository does not provide a renderer-specific benchmark harness, so this report records a focused API smoke measurement rather than extrapolating a site-build result.

| Case | Existing Mermaid | Pele |
| --- | --- | --- |
| Renderer | Mermaid 11 in Puppeteer Chromium | Pele 1.7.0 in Node.js |
| Browser process | Required for build rendering | None |
| SVG generation API | asynchronous browser evaluation | synchronous `render()` |
| Theme switch | regenerate for a Mermaid theme | CSS variables; no SVG regeneration |
| Built-in diagram coverage | Mermaid 11 | Mermaid 12.1.0 built-ins |
| External Mermaid plugins | potentially available in Chromium | unsupported |

## Method and result

The initial focused smoke run rendered a small flowchart twice with unique `idPrefix` values under Node.js 24. Pele returned valid SVG synchronously and produced unique IDs without a browser. Full cold/no-change/content-edit SSG timing, memory medians, and browser visual regression data are **not yet measured**, so no numeric performance claim is made here.

## Compatibility and recommendation

Pele is a strong candidate for the default static renderer: it removes Chromium and client JavaScript, has deterministic server output, responsive CSS-variable themes, and broad Mermaid 12.1.0 built-in coverage. Do not adopt it as the sole standard yet: its layout is intentionally different, arbitrary HTML labels and external Mermaid plugins are incompatible, and the required full preset/incremental/browser benchmark matrix has not been measured. Keep the existing plugin available and opt in to Pele where its compatibility profile is acceptable.
