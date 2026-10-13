---
title: Plugin cache
sidebar:
  hidden: true
---

# Plugin cache

各プラグインは `context.cache` を通じてビルド時専用のプラグイン固有キャッシュを持ち、JSON シリアライザブルな値だけを保存しプラグイン名空間にスコープを限定します。

## 目的とスコープ

plugin cache は各プラグイン毎に隔離され、ビルド期間のみ有効です。永続データベースや Cloudflare Workers ストレージではありません。

```ts
context.cache.set("key", value)
const value = await context.cache.get("key")
```

## キャッシュ無効化

破損した cache は安全な miss として扱います。書き込みは atomic です。`cacheVersion` で互換性変更時に切り替えます。

```mermaid
flowchart TD
  Work["Plugin work"]
  Cache{"Valid cache?
  Cache -->|Yes| Reuse["Reuse"]
  Cache -->|No| Regenerate["Regenerate"]
```

## 設定

cache の動作はプラグイン定義の `cacheVersion` で制御します。処理済みコンテンツキャッシュは依存モード `none`/`tracked`/`global`/`unsafe` で制御されます。

## 関連用語

- [[plugin|Plugin]]
- [[plugin-dependency|Plugin dependency]]
- [[lifecycle-hook|Lifecycle hook]]
- [[glossary/diagnostics|Diagnostics]]
- [[cache-invalidation|キャッシュ無効化]]
- [[cache-version|Cache バージョン]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
- [Build Dependency Contract](../framework/build-dependency.ja.md)
