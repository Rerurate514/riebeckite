# @riebeckite/honox-inspector

HonoX と Vite で構築した Riebeckite サイト向けの、開発時専用インスペクターです。

[English](./README.md)

インスペクターは Vite の開発サーバーから診断、出力プラン、依存グラフ、プラグイン実行、アセット、再生成の情報を配信します。開発サーバーでのみ適用され、本番ビルドには影響しません。

`riebeckiteDevelopmentInspector` をインポートし、開発時の Vite プラグインに追加してください。
