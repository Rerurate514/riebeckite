---
title: Root
sidebar:
  hidden: true
---

# Root

Riebeckiteが他のパスを解決する基準となるディレクトリで、Application rootやcontent rootがあります。安定したrootを基準に解決することで、パスをマシン間で持ち運べます。

## Application rootとContent root
Riebeckiteは2つのrootディレクトリを定義します：

| Root | 意味 |
| --- | --- |
| Application root | サイトをBuildするディレクトリ；Vite/project rootのデフォルト |
| Content root | コンテンツを読み取るディレクトリ；configの`content.directory`で設定 |

Application rootはconfigの相対パス、環境変数、integration設定を解決するベースとして使用されます。Content rootは[[content-source|Content Source]]がMarkdownファイルをスキャンする対象です。configの相対パスはApplication rootを基準に解決するため、同じconfigは別のマシンでも動作します。

## honox integrationでのroot解決
`@riebeckite/honox`integrationは`resolveHonoxApplication`を通じてrootを解決し、`appRoot`と`configRoot`を決定します。デフォルトでは`appRoot`はVite root、`configRoot`は`appRoot`がデフォルトです。configパスは`configRoot`を相対にImportされます；`content.directory`は`appRoot`を相対に解決されます。

```ts
// Example: content.directory resolved relative to appRoot
content: {
  directory: "./content",
}
```

その後は元の内容が続きます。

## rootの種類

| root | 意味 |
| --- | --- |
| Application root | サイトをBuildするディレクトリ |
| Content root | コンテンツを読み取るディレクトリ |

## パスの持ち運び

configの相対パスはapplication rootを基準に解決するため、同じconfigが別のマシンでも動きます。content rootはContent Sourceが走査する対象です。
