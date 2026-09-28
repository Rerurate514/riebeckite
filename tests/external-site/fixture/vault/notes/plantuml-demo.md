---
title: PlantUML Demo
description: A note that renders a PlantUML diagram as an image URL.
publish: true
---

# PlantUML Demo

The block below is turned into an image pointing at the configured PlantUML
server. No network access is required to build the site.

```plantuml
@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi
@enduml
%% caption: RIEBECKITE_EXTERNAL_PLANTUML_MARKER
```
