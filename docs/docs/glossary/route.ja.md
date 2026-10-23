---
date: 2026-10-14
title: ルート（Route）
sidebar:
  hidden: true
---

# ルート（Route）

インテグレーションがページへ解決するURLパスで、ページの公開パスから作られ、フレームワーク（HonoX）が描画します。

## ルート解決

インテグレーションは次の順序でルートを解決します。

1. **プラグインページ**：そのパスにプラグインのページ種別があるか確認する
2. **コンテンツ**：マニフェストから `publicLocation` を使ってコンテンツを解決する
3. **リダイレクト**：permalinkを指す追加URLを確認する
4. **404**：見つからなければnot-foundを返す

```ts
import { resolveRiebeckiteRoute } from "@riebeckite/honox";

const result = resolveRiebeckiteRoute(content, requestPath);
```

この解決順序により、プラグインが提供するページが優先され、次にコンテンツページ、その後リダイレクト、一致しないパスは404になります。`resolveRiebeckiteRoute` 関数が解決パイプライン全体を処理し、ページ本文とheadタグを含む解決済みのルート結果を返します。

## 関連用語

- [[page|Page]]
- [[page-type|Page Type]]
- [[public-path|Public Path]]
- [[routable|Routable]]

## さらに詳しく

- [../framework/honox-integration.ja.md]
