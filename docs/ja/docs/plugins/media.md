# Media

音声や動画などのメディアを公開コンテンツ内で扱うための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-media
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

画像だけでなく動画や音声などを含む記事を公開するときに利用します。たとえば解説記事とデモ動画を同じページにまとめる用途です。

`![[music.mp3]]` のような埋め込みは、ビルド時に HTML5 のプレーヤー要素へ置き換わります。表示には該当する音声・動画ファイルの配置が必要です。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/media/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

