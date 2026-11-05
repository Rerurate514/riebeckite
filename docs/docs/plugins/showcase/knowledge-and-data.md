---
showcase_progress: 4
showcase_priority: low
---
# Knowledge and data

## Citations — [`citations`](../citations.md)

Inline citations become numbered links, and the page gets a References section at the end.

### Source

````md
Riebeckite builds on Markdown[@gruber2004] and ships its own plugin model.[@riebeckite2026]

Several sources can be cited together.[@riebeckite2026; @gruber2004]
````

### Rendered

Riebeckite builds on Markdown[@gruber2004] and ships its own plugin model.[@riebeckite2026]

Several sources can be cited together.[@riebeckite2026; @gruber2004]

## Dataview — [`dataview`](../dataview.md)

### Source

````md
```dataview
TABLE file.name AS "Name", status
FROM #project
WHERE status = "active"
SORT file.name asc
LIMIT 10
```
````

### Rendered

```dataview
TABLE file.name AS "Name", status
FROM #project
WHERE status = "active"
SORT file.name asc
LIMIT 10
```

## Query — [`query`](../query.md)

### Source

````md
```query
sort:
  field: title
  order: asc
limit: 5
```
````

### Rendered

```query
sort:
  field: title
  order: asc
limit: 5
```

## Bases — [`bases`](../bases.md)

### Source

````md
```base
filters:
  and:
    - file.hasTag("featured")
properties:
  file.name:
    displayName: Title
views:
  - type: table
    name: Featured
    limit: 10
```
````

### Rendered

```base
filters:
  and:
    - file.hasTag("featured")
properties:
  file.name:
    displayName: Title
views:
  - type: table
    name: Featured
    limit: 10
```

## Meta Bind — [`meta-bind`](../meta-bind.md)

Inline inputs and views use page-local state. The initial values come from frontmatter.

### Source

````md
Progress: `INPUT[slider(minValue(0), maxValue(10), stepSize(1)):showcase_progress]`

Double progress: `VIEW[{showcase_progress} * 2]`

```meta-bind
INPUT[select(option(low), option(medium), option(high)):showcase_priority]
VIEW[{showcase_priority}]
```
````

### Rendered

Progress: `INPUT[slider(minValue(0), maxValue(10), stepSize(1)):showcase_progress]`

Double progress: `VIEW[{showcase_progress} * 2]`

```meta-bind
INPUT[select(option(low), option(medium), option(high)):showcase_priority]
VIEW[{showcase_priority}]
```

## Vault heatmap — [`vault-heatmap`](../vault-heatmap.md)

A `vault-heatmap` block aggregates `created` (or `date` / `published` when absent), `modified`, and `updated` dates from discoverable content into a calendar. Drafts, scheduled notes, and unlisted notes are excluded.

### Source

````md
```vault-heatmap
---
weeks: 26
title: Documentation activity
weekStart: monday
---
```
````

### Rendered

```vault-heatmap
---
weeks: 26
title: Documentation activity
weekStart: monday
---
```

## Kanban boards — [`kanban`](../kanban.md)

Put `##` column headings and task lists in the body to get a board.

### Source

````md
## Backlog

- [ ] Draft the release notes
- [ ] Link to [[README]]

## Done

- [x] Publish the fixture
````

### Rendered

```kanban
## Backlog

- [ ] Draft the release notes
- [ ] Link to [[README]]

## Done

- [x] Publish the fixture
```

## Flashcards — [`flashcards`](../flashcards.md)

A `flashcards` fence of `front :: back` pairs becomes a study deck. It still reads as a static list without JavaScript.

### Source

````md
```flashcards
What is Riebeckite? :: A tool that builds a static site from Markdown

What is the unit of publishing? :: A note
```
````

### Rendered

```flashcards
What is Riebeckite? :: A tool that builds a static site from Markdown

What is the unit of publishing? :: A note
```

## ExcaliBrain — [`excalibrain`](../excalibrain.md)

Shows each note's relationships across seven regions. The body of the `excalibrain` fence is ignored; the fence only marks where to draw, and the map is assembled from the page's own links.

### Source

````md
```excalibrain
```
````

### Rendered

```excalibrain
```

The map above is built from this page's WikiLinks. Because each Plugin page is linked with a Markdown relative link, only pages named by WikiLink appear under `child`. `parent` lists pages that WikiLink to this page, and `sibling` lists pages that those `parent` pages WikiLink to.
