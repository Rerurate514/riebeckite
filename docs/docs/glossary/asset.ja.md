---
title: Asset
sidebar:
  hidden: true
---

# Asset

プラグインのアセットは stylesheet など static resources で、 `assets` 配列で宣言され、integration の stylesheet pipeline を通じてブラウザに届けられます; 直接 `apps/web` にコピーされません。

## アセット宣言

```ts
assets: [{
  pluginName: "example",
  kind: "style",
  moduleSpecifier: "@riebeckite/plugin-example/style.css",
}]
```

## pipeline

プラグインからの CSS は収集され、browser に届けられます。browser から直接 `/node_modules` を参照 never してください。

## 関連用語

- [[plugin|Plugin]]
- [[client-entry|Client entry]]
- [[glossary/theme|Theme]]
- [[design-token|Design Token]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Plugin Pipeline](../framework/plugin-system/pipeline.ja.md)
