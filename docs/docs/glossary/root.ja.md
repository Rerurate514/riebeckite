---
title: Root
sidebar:
  hidden: true
---

# Root

Riebeckite が他のパスを解決する基準となるディレクトリで、Application root や content root があります。安定した root を基準に解決することで、パスをマシン間で持ち運べます。

## root の種類

| root | 意味 |
| --- | --- |
| Application root | サイトを Build するディレクトリ |
| Content root | コンテンツを読み取るディレクトリ |

## パスの持ち運び

config の相対パスは application root を基準に解決するため、同じ config が別のマシンでも動きます。content root は Content Source が走査する対象です。
