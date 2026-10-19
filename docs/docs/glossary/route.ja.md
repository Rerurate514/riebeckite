---
title: Route
sidebar:
  hidden: true
---

# Route

Integrationがページを解決するURLパスで、ページのpublic pathから生成され、HonoXのフレームワークによって描画されます。

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

## Route解決の順序
integrationは以下の順序でルートを解決します、これは`@riebeckite/honox`で定義されています：

1. **Plugin page**: パスに対してPluginがpage typeを提供しているか確認
2. **Content**: manifestから`publicLocation`を使用してコンテンツを解決
3. **Redirect**: パーマリンクを指す追加URLを確認
4. **404**: マッチするものがない場合はnot-foundを返却

この解決順序によって、plugin-providedページが最優先され、次にcontentページ、その後リダイレクト、一致するパスがない場合は404フォールバックが行われます。`resolveRiebeckiteRoute`関数はフル解決パイプラインを処理し、ページボディとhead tagsを含む解決されたroute結果を返します。

## 関連用語

- [[page|Page]]
- [[page-type|Page Type]]
- [[public-path|Public Path]]
- [[routable|Routable]]

## さらに詳しく

- [../framework/honox-integration.ja.md]