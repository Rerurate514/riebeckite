# @riebeckite/dev-inspector

Vite で構築した Riebeckite サイト向けの、開発時専用インスペクターです。

[English](./README.md)

Bridge APIのドキュメント: [BRIDGE_ja.md](./BRIDGE_ja.md)

インスペクターは Vite の開発サーバーから診断、出力プラン、依存グラフ、プラグイン実行、アセット、再生成の情報を配信します。開発サーバーでのみ適用され、本番ビルドには影響しません。

`riebeckiteDevelopmentInspector` をインポートし、開発時の Vite プラグインに追加してください。

独自の統合ではスナップショット取得関数を渡します: `riebeckiteDevelopmentInspector(getApplication, { getSnapshot })`。`getSnapshot(server)` は現在の `CompletedContentBuildSnapshot` または `undefined` を返します。HonoX 統合はこれを提供します。コンテンツの変更時には `invalidateDevelopmentInspector(server)` を呼んでください。HonoX では自動で呼ばれます。
