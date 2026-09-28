---
title: Dataview Demo
description: Declarative dataview blocks rendered at build time.
publish: true
---

# Dataview Demo

## List

```dataview
LIST status
FROM #project
WHERE contains(file.tags, "#project") and status != "archived"
SORT file.name asc
```

## Table

```dataview
TABLE file.name AS "Name", status, priority
FROM #project
WHERE priority <= 2
SORT priority desc
```

## Tasks

```dataview
TASK
FROM #project
```

## Calendar

```dataview
CALENDAR date
FROM #project
```

## Unsupported DataviewJS

```dataviewjs
dv.list(dv.pages("#project").file.link)
```
