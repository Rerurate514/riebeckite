# @riebeckite/ui

宣言的な Riebeckite Plugin UI のための共通 Context 契約です。

[English](./README.md)

`SiteProvider` は解決済み設定、manifest、公開コンテンツ view、リクエスト path を保持します。`ArticleProvider` は描画対象の post と任意の公開 entry を保持します。Plugin component はこの Context から標準データを解決し、個別の props が渡された場合はそちらを優先します。

```tsx
import { SiteProvider } from "@riebeckite/ui";
```

composition と公開境界の要件は [HonoX UI ドキュメント](../../docs/docs/framework/honox-integration/ui.ja.md)を参照してください。
