# @riebeckite/og-image

Riebeckite 向けの、1200×630 PNG Open Graph 画像レンダリングプリミティブです。

[English](./README.md)

`presetLayout("card")`、`presetLayout("minimal")`、
`presetLayout("editorial")` を `renderOgImage()` と組み合わせて使います。レンダラーは Hono JSX のレイアウトを Satori で SVG に変換し、Sharp で PNG にエンコードします。
