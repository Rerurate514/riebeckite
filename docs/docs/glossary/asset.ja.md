---
title: Asset
sidebar:
  hidden: true
---

# Asset

Pluginのassetはstylesheetなどの静的ファイルです。`assets`配列で宣言し、Integrationのstylesheetパイプラインを通してブラウザに届きます。`apps/web`へ直接コピーされることはありません。

## アセット宣言

```ts
assets: [{
  pluginName: "example",
  kind: "style",
  moduleSpecifier: "@riebeckite/plugin-example/style.css",
}]
```

## パイプライン

Pluginが持つCSSは集められてブラウザに届きます。ブラウザから`/node_modules`を直接参照しないでください。

## 関連用語

- [[plugin|Plugin]]
- [[client-entry|Client entry]]
- [[glossary/theme|Theme]]
- [[design-token|Design Token]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Plugin Pipeline](../framework/plugin-system/pipeline.ja.md)
