---
title: Route
sidebar:
  hidden: true
---

# Route

Integrationがページを解決するURLパスで、ページのpublic pathからProducedされ、HonoXのフレームワークによって描画されます。

## Route解決

Integrationは以下の順序でルートを解決します。

1. **Plugin page**: パスに対してPluginがpage typeを提供しているか確認
2. **Content**: manifestから`publicLocation`を使用してコンテンツを解決
3. **Redirect**: パーマリンクを指す追加URLを確認
4. **404**: not-foundを返却

```ts
import { resolveRiebeckiteRoute } from "@riebeckite/honox";

const result = resolveRiebeckiteRoute(content, requestPath);
```

## 関連用語

- [[page|Page]]
- [[page-type|Page Type]]
- [[public-path|Public Path]]
- [[routable|Routable]]

## さらに詳しく

- [../framework/honox-integration.ja.md]