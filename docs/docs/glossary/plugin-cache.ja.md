---
title: Plugin cache
sidebar:
  hidden: true
---

# Plugin cache

各Pluginは`context.cache`を通じてビルド時だけ使えるPlugin固有のcacheを持ちます。保存できるのはJSONに変換できる値だけで、名前空間はPluginごとに分かれます。

## 目的とスコープ

Plugin cacheはPluginごとに隔離され、ビルド中だけ有効です。永続データベースやCloudflare Workersのストレージではありません。

```ts
context.cache.set("key", value)
const value = await context.cache.get("key")
```

## Cacheの無効化

壊れたcacheは安全に無視され、再生成されます。書き込みは途中の状態を残しません。互換性が変わったときは`cacheVersion`で切り替えます。

```mermaid
flowchart TD
  Work["Plugin work"]
  Cache{"Valid cache?
  Cache -->|Yes| Reuse["Reuse"]
  Cache -->|No| Regenerate["Regenerate"]
```

## 設定

cacheの動作はPlugin定義の`cacheVersion`で制御します。処理済みコンテンツのcacheは、依存モード`none` / `tracked` / `global` / `unsafe`で制御します。

## 関連用語

- [[plugin|Plugin]]
- [[plugin-dependency|Plugin dependency]]
- [[lifecycle-hook|Lifecycle hook]]
- [[glossary/diagnostics|Diagnostics]]
- [[cache-invalidation|Cache Invalidation]]
- [[cache-version|Cache Version]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
- [Build Dependency Contract](../framework/build-dependency.ja.md)
