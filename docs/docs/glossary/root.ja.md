---
title: Root
sidebar:
  hidden: true
---

# Root

Riebeckiteが他のパスを解決する基準となるディレクトリで、Application rootやcontent rootがあります。安定したrootを基準に解決することで、パスをマシン間で持ち運べます。

## rootの種類

| root | 意味 |
| --- | --- |
| Application root | サイトをBuildするディレクトリ |
| Content root | コンテンツを読み取るディレクトリ |

## パスの持ち運び

configの相対パスはapplication rootを基準に解決するため、同じconfigが別のマシンでも動きます。content rootはContent Sourceが走査する対象です。
