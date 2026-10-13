---
title: Cache Version
sidebar:
  hidden: true
---

# Cache Version

The schema version of the persistent content cache that controls compatibility and migration between cache schema versions.

## Schema versions

CONTENT_CACHE_SCHEMA_VERSION (currently 4) increments when the cache structure changes.
CONTENT_CACHE_COMPATIBILITY_VERSION (currently 3) changes when behavior or contracts change.
Entries with a mismatched schema version are treated as misses and reprocessed.

## Migration

Delete `.riebeckite/cache` to force cold processing when the schema version does not match.
The build log reports `schema-miss` when a cache entry has an incompatible schema version.

## Related terms

- [[glossary/cache|Cache]]
- [[persistent-cache|Persistent Cache]]
- [[fingerprint|Fingerprint]]

## Learn more

- [Build System](../framework/build-system.md)
