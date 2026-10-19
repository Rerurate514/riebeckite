---
title: Preset
sidebar:
  hidden: true
---

# Preset

よくある構成をまかなうため、configに適用する準備済みのoptionの組です。Presetはよく使うPlugin、Theme、設定をまとめ、わずかな設定で採用できるようにします。

## presetがまとめるもの

- blogやdocsなど用途別のPluginの組。
- 既定のTheme。
- よく使う設定。サイト側は必要な分だけ上書きします。

## presetの種類とソース
presetはインポート時に設定を返すプラグインとして定義されます。presetは一般的に`PluginInput`型の関数をエクスポートするnpmパッケージです。preset関数はユーザーの部分的なconfigを受け取り、マージされた設定を返します。

presetは順序よく適用されます：user configは最後に展開されるため、userオプションは常にpresetオプションを上書きします。つまりpresetは合理的な既定値を提供できますが、サイトオーナーはすべての設定について最終的な管理権を保持します。

## 使い方
presetはconfigに展開して使います。サイト自身のoptionを後から適用するため、最終的な設定はサイト側が決めます。

```ts
import { riibook } from "@riebeckite/preset-riibook";
export default defineConfig({
  plugins: [riibook()],
});
```

presetプラグインはconfigだけでなく、エンドポイント、コンテンツタイプ、UIコンポーネントなどを追加してサイトの機能を拡張することもできます。プラグインAPIが[_riebeckite/plugin-api.md_]を参照し、プラグインがサイトとどのように統合されるかの詳細を確認してください。
