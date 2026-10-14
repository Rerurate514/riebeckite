---
title: Deterministic Build
sidebar:
  hidden: true
---

# Deterministic Build

A build that produces the same output given the same inputs, ensured by consistent fingerprints, pipeline versioning, and configuration snapshots.

## Ensuring determinism

Consistent content fingerprints (source, frontmatter, pipeline, plugin cacheVersion).
Pipeline fingerprint includes plugin configurations and content-filter settings.
Configuration snapshots are recorded in build state and external dependencies.

## Fallback

If determinism cannot be confirmed (e.g., unsafe plugins, global dependencies), a full build path is taken. A missing or incompatible cache or state entry also causes a full build path.

## キャッシュと状態

決定的なビルドでは、persistent content cache と incremental build state が一貫していることが重要です。キャッシュヒットが継続する限り同じ出力が生成され、state の fingerprint が一致しない場合は full build path が取られます。

### fingerpringp の再計算

pipeline fingerprint は plugin の設定と content filter の設定を含み、設定が変わると全体の fingerprint が変わるためキャッシュが bypass され、再ビルドがtrigger されます。

### 例

```sh
# 設定変更があると cache が bypass されます
riebeckite build

# 設定変更なしで同じ入力の場合、deterministic な出力が生成されます
riebeckite build
```

## Related terms

- [[fingerprint|Fingerprint]]
- [[build|Build]]
- [[check|Check]]

## Learn more

- [Build System](../framework/build-system.md)
